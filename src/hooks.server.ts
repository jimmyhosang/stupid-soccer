import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseUrl = env.PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

	// If Supabase is not configured, provide stub implementations
	if (!supabaseUrl || !supabaseAnonKey) {
		event.locals.supabase = null as any;
		event.locals.getSession = async () => null;
		return resolve(event);
	}

	// Get access token from cookies (set by client-side auth)
	const accessToken = event.cookies.get('sb-access-token');
	const refreshToken = event.cookies.get('sb-refresh-token');

	// Create a Supabase client for this request
	event.locals.supabase = createClient(supabaseUrl, supabaseAnonKey, {
		global: {
			headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// Get session from Supabase
	event.locals.getSession = async () => {
		if (!accessToken) return null;

		// If we have tokens, try to get the session
		const { data: { user }, error } = await event.locals.supabase.auth.getUser(accessToken);

		if (error || !user) {
			return null;
		}

		return {
			access_token: accessToken,
			refresh_token: refreshToken || '',
			user,
			expires_at: 0,
			expires_in: 0,
			token_type: 'bearer'
		};
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
