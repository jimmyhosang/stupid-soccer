import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	if (!session) {
		throw redirect(303, '/login?redirect=/squad');
	}

	const userId = session.user.id;

	// Fetch user's profile (for coins)
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, coins, username')
		.eq('id', userId)
		.single();

	// Fetch user's players
	const { data: players, error: playersError } = await locals.supabase
		.from('players')
		.select('*')
		.eq('owner_id', userId)
		.order('created_at', { ascending: false });

	if (playersError) {
		console.error('Failed to fetch players:', playersError);
	}

	// Fetch user's squad (to know who are starters)
	const { data: squad } = await locals.supabase
		.from('squads')
		.select('player_id, position')
		.eq('user_id', userId);

	// Mark starters based on squad data
	const squadPlayerIds = new Set(squad?.map((s) => s.player_id) || []);
	const playersWithStarters = (players || []).map((player) => ({
		...player,
		is_starter: squadPlayerIds.has(player.id)
	}));

	return {
		profile: profile || { id: userId, coins: 0, username: 'Unknown' },
		players: playersWithStarters,
		squad: squad || []
	};
};
