import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_APP_URL } from '$env/static/public';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2025-12-15.clover'
});

export const POST: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
	}

	// Get Stripe customer ID
	const { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('stripe_customer_id')
		.eq('id', user.id)
		.single();

	if (!profile?.stripe_customer_id) {
		throw error(400, 'No subscription found');
	}

	// Create billing portal session
	const session = await stripe.billingPortal.sessions.create({
		customer: profile.stripe_customer_id,
		return_url: `${PUBLIC_APP_URL}/profile`
	});

	return json({ url: session.url });
};
