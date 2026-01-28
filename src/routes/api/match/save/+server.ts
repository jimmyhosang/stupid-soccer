import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin, isGuestMode, getGuestUser } from '$lib/server/supabase';
import {
	calculatePlayerMatchXp,
	levelFromXp,
	calculateLevelUpStats,
	createLevelUpRecord,
	type MatchXpResult
} from '$lib/server/xp';
import type { Player } from '$lib/types/database';

// Coin rewards based on match outcome
const BASE_REWARDS = {
	win: 25,
	draw: 10,
	loss: 5
} as const;

const COINS_PER_GOAL = 5;

interface MatchSaveRequest {
	difficulty: 'easy' | 'medium' | 'hard';
	userScore: number;
	aiScore: number;
	squadSnapshot?: object;
	// New: per-player stats from the match
	playerStats?: {
		playerId: string;
		goals: number;
		assists: number;
	}[];
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check for guest mode first
	const guestUser = getGuestUser(cookies);

	// If guest mode and guest user found, handle without database
	if (isGuestMode && guestUser) {
		const body: MatchSaveRequest = await request.json();
		const { difficulty, userScore, aiScore } = body;

		// Validate input
		if (!['easy', 'medium', 'hard'].includes(difficulty)) {
			throw error(400, 'Invalid difficulty');
		}

		// Calculate coin reward (simulated for guest)
		const matchResult = userScore > aiScore ? 'win' : userScore === aiScore ? 'draw' : 'loss';
		const baseCoins = matchResult === 'win' ? BASE_REWARDS.win : matchResult === 'draw' ? BASE_REWARDS.draw : BASE_REWARDS.loss;
		const coinsEarned = baseCoins + (userScore * COINS_PER_GOAL);

		// Return simulated result without database operations
		return json({
			matchId: `guest-match-${Date.now()}`,
			coinsEarned,
			totalXpEarned: 50, // Simulated XP
			xpResults: [],
			levelUps: [],
			newCoinBalance: 1000 + coinsEarned, // Simulated balance
			guestMode: true
		});
	}

	// Regular auth flow
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

	// Parse request body
	const body: MatchSaveRequest = await request.json();
	const { difficulty, userScore, aiScore, squadSnapshot, playerStats } = body;

	// Validate input
	if (!['easy', 'medium', 'hard'].includes(difficulty)) {
		throw error(400, 'Invalid difficulty');
	}
	if (typeof userScore !== 'number' || typeof aiScore !== 'number') {
		throw error(400, 'Invalid scores');
	}
	if (userScore < 0 || aiScore < 0) {
		throw error(400, 'Scores cannot be negative');
	}

	// Determine match result
	const matchResult: 'win' | 'draw' | 'loss' =
		userScore > aiScore ? 'win' : userScore === aiScore ? 'draw' : 'loss';

	// Calculate coin reward
	let baseCoins: number;
	if (matchResult === 'win') {
		baseCoins = BASE_REWARDS.win;
	} else if (matchResult === 'draw') {
		baseCoins = BASE_REWARDS.draw;
	} else {
		baseCoins = BASE_REWARDS.loss;
	}

	// Add bonus for goals scored
	const goalBonus = userScore * COINS_PER_GOAL;
	const coinsEarned = baseCoins + goalBonus;

	// Get current profile
	const { data: profile, error: profileError } = await supabaseAdmin
		.from('profiles')
		.select('coins')
		.eq('id', user.id)
		.single();

	if (profileError || !profile) {
		throw error(500, 'Failed to fetch profile');
	}

	const newBalance = profile.coins + coinsEarned;

	// Update coins in profile atomically
	const { error: updateError } = await supabaseAdmin
		.from('profiles')
		.update({ coins: newBalance })
		.eq('id', user.id);

	if (updateError) {
		throw error(500, 'Failed to update coins');
	}

	// Get the user's active squad players for XP awards
	const { data: squadData, error: squadError } = await supabaseAdmin
		.from('squads')
		.select('player_id')
		.eq('user_id', user.id);

	if (squadError) {
		console.error('Failed to fetch squad:', squadError);
	}

	const squadPlayerIds = squadData?.map((s) => s.player_id) || [];

	// Fetch full player data for XP calculations
	let squadPlayers: Player[] = [];
	if (squadPlayerIds.length > 0) {
		const { data: players, error: playersError } = await supabaseAdmin
			.from('players')
			.select('*')
			.in('id', squadPlayerIds);

		if (playersError) {
			console.error('Failed to fetch players:', playersError);
		} else {
			squadPlayers = players || [];
		}
	}

	// Calculate XP for each squad player
	const xpResults: MatchXpResult[] = [];
	let totalXpEarned = 0;

	// Create a map of player stats from the match
	const playerStatsMap = new Map<string, { goals: number; assists: number }>();
	if (playerStats) {
		for (const stat of playerStats) {
			playerStatsMap.set(stat.playerId, { goals: stat.goals, assists: stat.assists });
		}
	} else {
		// Fallback: distribute goals/assists roughly among squad
		// This handles old clients that don't send per-player stats
		const goalsPerPlayer = Math.floor(userScore / Math.max(squadPlayers.length, 1));
		for (const player of squadPlayers) {
			playerStatsMap.set(player.id, { goals: goalsPerPlayer, assists: 0 });
		}
	}

	// Process XP for each player
	for (const player of squadPlayers) {
		const stats = playerStatsMap.get(player.id) || { goals: 0, assists: 0 };

		const xpEarned = calculatePlayerMatchXp(
			difficulty,
			stats.goals,
			stats.assists,
			matchResult,
			player.growth_rate || 1.0
		);

		const newXp = (player.xp || 0) + xpEarned;
		const oldLevel = player.level || 1;
		const newLevel = levelFromXp(newXp);
		const leveledUp = newLevel > oldLevel;

		let statIncreases = null;
		if (leveledUp) {
			statIncreases = calculateLevelUpStats(player, oldLevel, newLevel, stats.goals, stats.assists);
		}

		xpResults.push({
			playerId: player.id,
			xpEarned,
			levelBefore: oldLevel,
			levelAfter: newLevel,
			leveledUp,
			statIncreases
		});

		totalXpEarned += xpEarned;
	}

	// Record the match with XP total
	const { data: match, error: matchError } = await supabaseAdmin
		.from('matches')
		.insert({
			user_id: user.id,
			difficulty,
			user_score: userScore,
			ai_score: aiScore,
			coins_earned: coinsEarned,
			total_xp_earned: totalXpEarned,
			squad_snapshot: squadSnapshot || null
		})
		.select('id')
		.single();

	if (matchError) {
		console.error('Failed to record match:', matchError);
		throw error(500, 'Failed to save match');
	}

	// Update each player's XP, level, stats, and record performances
	const levelUps: { playerId: string; oldLevel: number; newLevel: number; statIncreases: object }[] = [];

	for (const result of xpResults) {
		const player = squadPlayers.find((p) => p.id === result.playerId);
		if (!player) continue;

		const stats = playerStatsMap.get(result.playerId) || { goals: 0, assists: 0 };

		// Build update object
		const updateData: Record<string, unknown> = {
			xp: (player.xp || 0) + result.xpEarned,
			level: result.levelAfter,
			total_matches: (player.total_matches || 0) + 1,
			total_goals: (player.total_goals || 0) + stats.goals,
			total_assists: (player.total_assists || 0) + stats.assists,
			total_wins: (player.total_wins || 0) + (matchResult === 'win' ? 1 : 0)
		};

		// Add stat increases if leveled up
		if (result.leveledUp && result.statIncreases) {
			updateData.pace = Math.min(
				(player.pace || 50) + result.statIncreases.pace,
				player.growth_ceiling || 99
			);
			updateData.shooting = Math.min(
				(player.shooting || 50) + result.statIncreases.shooting,
				player.growth_ceiling || 99
			);
			updateData.passing = Math.min(
				(player.passing || 50) + result.statIncreases.passing,
				player.growth_ceiling || 99
			);
			updateData.defense = Math.min(
				(player.defense || 50) + result.statIncreases.defense,
				player.growth_ceiling || 99
			);
			updateData.stamina = Math.min(
				(player.stamina || 50) + result.statIncreases.stamina,
				player.growth_ceiling || 99
			);

			levelUps.push({
				playerId: result.playerId,
				oldLevel: result.levelBefore,
				newLevel: result.levelAfter,
				statIncreases: result.statIncreases
			});
		}

		// Update player
		const { error: playerUpdateError } = await supabaseAdmin
			.from('players')
			.update(updateData)
			.eq('id', result.playerId);

		if (playerUpdateError) {
			console.error(`Failed to update player ${result.playerId}:`, playerUpdateError);
		}

		// Record match performance
		const { error: perfError } = await supabaseAdmin.from('match_performances').insert({
			match_id: match.id,
			player_id: result.playerId,
			user_id: user.id,
			goals: stats.goals,
			assists: stats.assists,
			xp_earned: result.xpEarned,
			level_before: result.levelBefore,
			level_after: result.levelAfter
		});

		if (perfError) {
			console.error(`Failed to record performance for ${result.playerId}:`, perfError);
		}

		// Record level-up if it happened
		if (result.leveledUp && result.statIncreases) {
			const levelUpRecord = createLevelUpRecord(
				result.playerId,
				user.id,
				result.levelBefore,
				result.levelAfter,
				result.statIncreases,
				match.id
			);

			const { error: levelUpError } = await supabaseAdmin.from('level_ups').insert(levelUpRecord);

			if (levelUpError) {
				console.error(`Failed to record level-up for ${result.playerId}:`, levelUpError);
			}
		}
	}

	return json({
		matchId: match.id,
		coinsEarned,
		totalXpEarned,
		xpResults: xpResults.map((r) => ({
			playerId: r.playerId,
			xpEarned: r.xpEarned,
			levelBefore: r.levelBefore,
			levelAfter: r.levelAfter,
			leveledUp: r.leveledUp
		})),
		levelUps,
		newCoinBalance: newBalance
	});
};
