import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL ?? '';
const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = privateEnv.SUPABASE_SERVICE_ROLE_KEY ?? '';

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

// Client for server-side operations with service role (bypasses RLS).
// Constructed lazily so build-time analysis (which imports this module before
// runtime env vars are available) does not instantiate the client with empty
// credentials. The client is created on first property access at runtime.
function createAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
let _supabaseAdmin: SupabaseAdminClient | null = null;
function getSupabaseAdmin(): SupabaseAdminClient {
	if (!_supabaseAdmin) {
		_supabaseAdmin = createAdminClient();
	}
	return _supabaseAdmin;
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
	get(_target, prop, receiver) {
		return Reflect.get(getSupabaseAdmin(), prop, receiver);
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
