import type { PageServerLoad } from './$types';
import { isGuestMode, getGuestUser } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Check for guest mode
	const guestUser = getGuestUser(cookies);
	if (isGuestMode && guestUser) {
		// Return mock data for guest mode - PvP not available for guests
		return {
			league: null,
			userEntry: null,
			standings: [],
			recentMatches: [],
			hasValidSquad: false,
			isGuestMode: true
		};
	}

	const session = await locals.getSession();
	const userId = session?.user?.id;

	if (!userId) {
		return {
			league: null,
			userEntry: null,
			standings: [],
			recentMatches: [],
			hasValidSquad: false
		};
	}

	// Get or create current league
	const { data: league, error: leagueError } = await locals.supabase.rpc(
		'get_or_create_current_league'
	);

	if (leagueError) {
		console.error('Failed to get league:', leagueError);
	}

	// Get user's entry for current league
	const { data: userEntry } = league
		? await locals.supabase
				.from('pvp_entries')
				.select('*')
				.eq('league_id', league.id)
				.eq('user_id', userId)
				.single()
		: { data: null };

	// Get league standings (top 50)
	const { data: standings } = league
		? await locals.supabase
				.from('pvp_entries')
				.select(
					`
					id,
					user_id,
					wins,
					losses,
					draws,
					points,
					rank,
					squad_snapshot,
					profiles!pvp_entries_user_id_fkey (
						username
					)
				`
				)
				.eq('league_id', league.id)
				.order('points', { ascending: false })
				.order('wins', { ascending: false })
				.limit(50)
		: { data: [] };

	// Get user's recent matches
	const { data: recentMatches } = userEntry
		? await locals.supabase
				.from('pvp_matches')
				.select(
					`
					id,
					player1_entry_id,
					player2_entry_id,
					player1_score,
					player2_score,
					simulated_at,
					player1:pvp_entries!pvp_matches_player1_entry_id_fkey (
						user_id,
						squad_snapshot,
						profiles!pvp_entries_user_id_fkey (
							username
						)
					),
					player2:pvp_entries!pvp_matches_player2_entry_id_fkey (
						user_id,
						squad_snapshot,
						profiles!pvp_entries_user_id_fkey (
							username
						)
					)
				`
				)
				.or(`player1_entry_id.eq.${userEntry.id},player2_entry_id.eq.${userEntry.id}`)
				.order('simulated_at', { ascending: false })
				.limit(10)
		: { data: [] };

	// Check if user has a valid squad (3 players)
	const { data: squadData } = await locals.supabase
		.from('squads')
		.select('player_id')
		.eq('user_id', userId);

	const hasValidSquad = squadData && squadData.length >= 3;

	return {
		league: league || null,
		userEntry: userEntry || null,
		standings: standings || [],
		recentMatches: recentMatches || [],
		hasValidSquad
	};
};
