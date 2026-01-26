import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import { calculateTeamPower } from '$lib/server/pvp-simulation';

interface PlayerStats {
	pace: number;
	shooting: number;
	passing: number;
	defense: number;
	stamina: number;
}

interface SquadPlayer {
	id: string;
	name: string;
	pace: number;
	shooting: number;
	passing: number;
	defense: number;
	stamina: number;
	rarity: string;
	sprite_config: object;
}

export const POST: RequestHandler = async ({ cookies }) => {
	// Get auth token from cookies
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	// Verify the user
	const {
		data: { user },
		error: authError
	} = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
	}

	// Get or create current league
	const { data: league, error: leagueError } = await supabaseAdmin.rpc(
		'get_or_create_current_league'
	);
	if (leagueError || !league) {
		console.error('Failed to get/create league:', leagueError);
		throw error(500, 'Failed to get current league');
	}

	// Check if user already joined this league
	const { data: existingEntry } = await supabaseAdmin
		.from('pvp_entries')
		.select('id')
		.eq('league_id', league.id)
		.eq('user_id', user.id)
		.single();

	if (existingEntry) {
		throw error(400, 'Already joined this league');
	}

	// Get user's current squad (3 starters)
	const { data: squadData, error: squadError } = await supabaseAdmin
		.from('squads')
		.select('player_id')
		.eq('user_id', user.id);

	if (squadError) {
		console.error('Failed to fetch squad:', squadError);
		throw error(500, 'Failed to fetch squad');
	}

	if (!squadData || squadData.length < 3) {
		throw error(400, 'You need 3 players in your squad to join PvP');
	}

	const playerIds = squadData.map((s) => s.player_id);

	// Get player details for snapshot
	const { data: players, error: playersError } = await supabaseAdmin
		.from('players')
		.select('id, name, pace, shooting, passing, defense, stamina, rarity, sprite_config')
		.in('id', playerIds);

	if (playersError || !players || players.length < 3) {
		console.error('Failed to fetch players:', playersError);
		throw error(500, 'Failed to fetch player data');
	}

	// Calculate team power
	const playerStats: PlayerStats[] = players.map((p) => ({
		pace: p.pace,
		shooting: p.shooting,
		passing: p.passing,
		defense: p.defense,
		stamina: p.stamina
	}));
	const totalPower = calculateTeamPower(playerStats);

	// Create squad snapshot
	const squadSnapshot = {
		players: players as SquadPlayer[],
		totalPower,
		snapshotAt: new Date().toISOString()
	};

	// Create entry
	const { data: entry, error: entryError } = await supabaseAdmin
		.from('pvp_entries')
		.insert({
			league_id: league.id,
			user_id: user.id,
			squad_snapshot: squadSnapshot
		})
		.select('id')
		.single();

	if (entryError) {
		console.error('Failed to create entry:', entryError);
		throw error(500, 'Failed to join league');
	}

	return json({
		success: true,
		entryId: entry.id,
		leagueId: league.id,
		seasonNumber: league.season_number,
		totalPower
	});
};
