import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

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
