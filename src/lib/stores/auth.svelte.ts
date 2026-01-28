import { createClient, type Session, type User, type SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '$lib/types/database';
import { browser } from '$app/environment';

// Get env vars dynamically to handle missing values
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

// Guest mode - disable auth for free play
const disableAuth = import.meta.env.PUBLIC_DISABLE_AUTH === 'true';

// Generate or retrieve guest ID from localStorage
function getGuestId(): string {
	if (!browser) return 'guest-server';
	let guestId = localStorage.getItem('guest-user-id');
	if (!guestId) {
		guestId = `guest-${Math.random().toString(36).substring(2, 10)}`;
		localStorage.setItem('guest-user-id', guestId);
	}
	return guestId;
}

// Generate guest username
function getGuestUsername(): string {
	if (!browser) return 'Guest';
	let username = localStorage.getItem('guest-username');
	if (!username) {
		username = `Player${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
		localStorage.setItem('guest-username', username);
	}
	return username;
}

// Browser-side Supabase client (may be null if not configured)
export const supabase: SupabaseClient | null =
	supabaseUrl && supabaseAnonKey
		? createClient(supabaseUrl, supabaseAnonKey)
		: null;

// Helper to set auth cookies for server-side access
function setAuthCookies(session: Session | null) {
	if (!browser) return;

	if (session) {
		// Set cookies for server-side auth (expires in 7 days)
		const maxAge = 60 * 60 * 24 * 7;
		document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
		document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
	} else {
		// Clear cookies on logout
		document.cookie = 'sb-access-token=; path=/; max-age=0';
		document.cookie = 'sb-refresh-token=; path=/; max-age=0';
	}
}

// Auth state using Svelte 5 runes (must be used in component context)
export function createAuthState() {
	let user = $state<User | null>(null);
	let session = $state<Session | null>(null);
	let profile = $state<Profile | null>(null);
	let loading = $state(true);

	// Initialize auth state
	async function init() {
		loading = true;

		// Guest mode - create fake authenticated state
		if (disableAuth) {
			const guestId = getGuestId();
			const guestUsername = getGuestUsername();

			// Create a mock user object
			user = {
				id: guestId,
				email: `${guestId}@guest.local`,
				aud: 'authenticated',
				role: 'authenticated',
				created_at: new Date().toISOString()
			} as User;

			// Create a mock profile
			profile = {
				id: guestId,
				username: guestUsername,
				coins: 1000, // Start with coins for free play
				subscription_tier: 'free',
				subscription_expires_at: null,
				ai_scout_uses_this_month: 0,
				ai_scout_reset_at: new Date().toISOString(),
				stripe_customer_id: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			} as Profile;

			// Set guest cookie for server-side
			if (browser) {
				document.cookie = `guest-mode=true; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
				document.cookie = `guest-user-id=${guestId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
			}

			loading = false;
			return;
		}

		// If Supabase is not configured, just mark as not loading
		if (!supabase) {
			loading = false;
			return;
		}

		// Get initial session
		const {
			data: { session: initialSession }
		} = await supabase.auth.getSession();
		session = initialSession;
		user = initialSession?.user ?? null;

		// Set cookies for server-side auth
		setAuthCookies(initialSession);

		if (user) {
			await fetchProfile();
		}

		// Listen for auth changes
		supabase.auth.onAuthStateChange(async (event, newSession) => {
			session = newSession;
			user = newSession?.user ?? null;

			// Update cookies on auth state change
			setAuthCookies(newSession);

			if (event === 'SIGNED_IN' && user) {
				await fetchProfile();
			} else if (event === 'SIGNED_OUT') {
				profile = null;
			}
		});

		loading = false;
	}

	async function fetchProfile() {
		if (!user || !supabase) return;

		const { data, error } = await supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();

		if (!error && data) {
			profile = data as Profile;
		}
	}

	async function signInWithGoogle() {
		if (!supabase) throw new Error('Supabase not configured');
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`
			}
		});
		if (error) throw error;
	}

	async function signInWithEmail(email: string, password: string) {
		if (!supabase) throw new Error('Supabase not configured');
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		if (error) throw error;
	}

	async function signUpWithEmail(email: string, password: string, username: string) {
		if (!supabase) throw new Error('Supabase not configured');
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { username }
			}
		});
		if (error) throw error;
	}

	async function signOut() {
		if (!supabase) throw new Error('Supabase not configured');
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	}

	return {
		get user() {
			return user;
		},
		get session() {
			return session;
		},
		get profile() {
			return profile;
		},
		get loading() {
			return loading;
		},
		get isAuthenticated() {
			return !!user;
		},
		get isGuestMode() {
			return disableAuth;
		},
		init,
		signInWithGoogle,
		signInWithEmail,
		signUpWithEmail,
		signOut,
		fetchProfile
	};
}

// Export for use in other modules
export const isGuestModeEnabled = disableAuth;
