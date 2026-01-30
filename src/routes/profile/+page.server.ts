import type { PageServerLoad, Actions } from './$types';
import { isGuestMode, getGuestUser } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Check for guest mode
	const guestUser = getGuestUser(cookies);
	if (isGuestMode && guestUser) {
		return {
			profile: {
				id: guestUser.id,
				username: guestUser.username,
				coins: 1000,
				subscription_tier: 'free',
				ai_scout_uses_this_month: 0
			},
			stats: {
				playerCount: 0,
				wins: 0,
				losses: 0,
				matchesPlayed: 0
			},
			isGuestMode: true
		};
	}

	const session = await locals.getSession();
	const userId = session?.user?.id;

	if (!userId) {
		return {
			profile: {
				id: '',
				username: 'Guest',
				coins: 1000,
				subscription_tier: 'free',
				ai_scout_uses_this_month: 0
			},
			stats: {
				playerCount: 0,
				wins: 0,
				losses: 0,
				matchesPlayed: 0
			}
		};
	}

	// Fetch user's profile
	const { data: profile, error } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', userId)
		.single();

	if (error) {
		console.error('Failed to fetch profile:', error);
	}

	// Fetch player count
	const { count: playerCount } = await locals.supabase
		.from('players')
		.select('id', { count: 'exact', head: true })
		.eq('owner_id', userId);

	// Fetch match stats
	const { data: matches } = await locals.supabase
		.from('matches')
		.select('user_score, ai_score')
		.eq('user_id', userId);

	const wins = matches?.filter((m) => m.user_score > m.ai_score).length || 0;
	const losses = matches?.filter((m) => m.user_score < m.ai_score).length || 0;

	return {
		profile: profile || {
			id: userId,
			username: 'Unknown',
			coins: 0,
			subscription_tier: 'free',
			ai_scout_uses_this_month: 0
		},
		stats: {
			playerCount: playerCount || 0,
			wins,
			losses,
			matchesPlayed: matches?.length || 0
		}
	};
};

export const actions: Actions = {
	updateUsername: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session) {
			return { success: false, error: 'Not authenticated' };
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString().trim();

		if (!username || username.length < 3 || username.length > 20) {
			return { success: false, error: 'Username must be 3-20 characters' };
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ username })
			.eq('id', session.user.id);

		if (error) {
			if (error.code === '23505') {
				return { success: false, error: 'Username already taken' };
			}
			return { success: false, error: 'Failed to update username' };
		}

		return { success: true };
	}
};
