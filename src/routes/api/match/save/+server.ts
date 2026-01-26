import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';

// Coin rewards based on match outcome
const BASE_REWARDS = {
	win: 25,
	draw: 10,
	loss: 5
} as const;

const COINS_PER_GOAL = 5;

export const POST: RequestHandler = async ({ request, cookies }) => {
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

	// Parse request body
	const body = await request.json();
	const { difficulty, userScore, aiScore, squadSnapshot } = body;

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

	// Calculate coin reward
	let baseCoins: number;
	if (userScore > aiScore) {
		baseCoins = BASE_REWARDS.win;
	} else if (userScore === aiScore) {
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

	// Record the match
	const { data: match, error: matchError } = await supabaseAdmin
		.from('matches')
		.insert({
			user_id: user.id,
			difficulty,
			user_score: userScore,
			ai_score: aiScore,
			coins_earned: coinsEarned,
			squad_snapshot: squadSnapshot || null
		})
		.select('id')
		.single();

	if (matchError) {
		console.error('Failed to record match:', matchError);
		throw error(500, 'Failed to save match');
	}

	return json({
		matchId: match.id,
		coinsEarned
	});
};
