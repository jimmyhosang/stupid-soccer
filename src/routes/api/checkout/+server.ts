import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const STRIPE_SECRET_KEY = privateEnv.STRIPE_SECRET_KEY ?? '';
const PUBLIC_APP_URL = publicEnv.PUBLIC_APP_URL ?? '';

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
	if (!_stripe) {
		_stripe = new Stripe(STRIPE_SECRET_KEY, {
			apiVersion: '2025-12-15.clover'
		});
	}
	return _stripe;
}

// Manager Club subscription price ID (set this in Stripe dashboard)
const MANAGER_CLUB_PRICE_ID = process.env.STRIPE_MANAGER_CLUB_PRICE_ID || 'price_manager_club';

export const POST: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
	}

	// Get or create Stripe customer
	const { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('stripe_customer_id, username')
		.eq('id', user.id)
		.single();

	let customerId = profile?.stripe_customer_id;

	if (!customerId) {
		// Create new Stripe customer
		const customer = await getStripe().customers.create({
			email: user.email,
			name: profile?.username || 'Player',
			metadata: {
				supabase_user_id: user.id
			}
		});

		customerId = customer.id;

		// Save customer ID to profile
		await supabaseAdmin
			.from('profiles')
			.update({ stripe_customer_id: customerId })
			.eq('id', user.id);
	}

	// Create checkout session
	const session = await getStripe().checkout.sessions.create({
		customer: customerId,
		payment_method_types: ['card'],
		line_items: [
			{
				price: MANAGER_CLUB_PRICE_ID,
				quantity: 1
			}
		],
		mode: 'subscription',
		success_url: `${PUBLIC_APP_URL}/profile?subscription=success`,
		cancel_url: `${PUBLIC_APP_URL}/subscribe?cancelled=true`,
		metadata: {
			supabase_user_id: user.id
		}
	});

	return json({ url: session.url });
};
