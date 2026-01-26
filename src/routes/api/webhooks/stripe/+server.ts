import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2025-12-15.clover'
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		throw error(400, 'Missing stripe-signature header');
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		throw error(400, 'Webhook signature verification failed');
	}

	// Handle the event
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session;
			const userId = session.metadata?.supabase_user_id;

			if (userId && session.subscription) {
				// Get subscription details
				const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

				// Update user's subscription tier
				await supabaseAdmin
					.from('profiles')
					.update({
						subscription_tier: 'manager_club',
						subscription_expires_at: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
					})
					.eq('id', userId);

				console.log(`User ${userId} subscribed to Manager Club`);
			}
			break;
		}

		case 'customer.subscription.updated': {
			const subscription = event.data.object as Stripe.Subscription;
			const customerId = subscription.customer as string;

			// Find user by Stripe customer ID
			const { data: profile } = await supabaseAdmin
				.from('profiles')
				.select('id')
				.eq('stripe_customer_id', customerId)
				.single();

			if (profile) {
				const isActive = subscription.status === 'active' || subscription.status === 'trialing';
				const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

				await supabaseAdmin
					.from('profiles')
					.update({
						subscription_tier: isActive ? 'manager_club' : 'free',
						subscription_expires_at: isActive
							? new Date(periodEnd * 1000).toISOString()
							: null
					})
					.eq('id', profile.id);

				console.log(`User ${profile.id} subscription updated: ${subscription.status}`);
			}
			break;
		}

		case 'customer.subscription.deleted': {
			const subscription = event.data.object as Stripe.Subscription;
			const customerId = subscription.customer as string;

			// Find user by Stripe customer ID
			const { data: profile } = await supabaseAdmin
				.from('profiles')
				.select('id')
				.eq('stripe_customer_id', customerId)
				.single();

			if (profile) {
				await supabaseAdmin
					.from('profiles')
					.update({
						subscription_tier: 'free',
						subscription_expires_at: null
					})
					.eq('id', profile.id);

				console.log(`User ${profile.id} subscription cancelled`);
			}
			break;
		}

		case 'invoice.payment_failed': {
			const invoice = event.data.object as Stripe.Invoice;
			const customerId = invoice.customer as string;

			// Find user by Stripe customer ID
			const { data: profile } = await supabaseAdmin
				.from('profiles')
				.select('id')
				.eq('stripe_customer_id', customerId)
				.single();

			if (profile) {
				console.log(`Payment failed for user ${profile.id}`);
				// Could send notification email here
			}
			break;
		}

		default:
			console.log(`Unhandled event type: ${event.type}`);
	}

	return json({ received: true });
};
