import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { env } from '$env/dynamic/public';

// Check if guest mode is enabled
export const isGuestMode = env.PUBLIC_DISABLE_AUTH === 'true';

// Guest user helper - gets or creates a guest user from cookies
export function getGuestUser(cookies: { get: (name: string) => string | undefined }) {
	if (!isGuestMode) return null;

	const guestMode = cookies.get('guest-mode');
	const guestUserId = cookies.get('guest-user-id');

	if (guestMode === 'true' && guestUserId) {
		return {
			id: guestUserId,
			email: `${guestUserId}@guest.local`,
			isGuest: true
		};
	}

	return null;
}

// Client for server-side operations with service role (bypasses RLS)
export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

// Client for server-side operations respecting RLS
export const createServerClient = (accessToken?: string) => {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
};
