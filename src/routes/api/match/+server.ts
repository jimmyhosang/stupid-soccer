import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';

// Coin rewards by difficulty and result
const COIN_REWARDS = {
	easy: { win: 50, draw: 20, loss: 10 },
	medium: { win: 100, draw: 40, loss: 15 },
	hard: { win: 200, draw: 75, loss: 25 }
} as const;

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Get auth token from cookies
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	// Verify the user
	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
	}

	// Parse request body
	const body = await request.json();
	const { difficulty, userScore, aiScore } = body;

	// Validate input
	if (!['easy', 'medium', 'hard'].includes(difficulty)) {
		throw error(400, 'Invalid difficulty');
	}
	if (typeof userScore !== 'number' || typeof aiScore !== 'number') {
		throw error(400, 'Invalid scores');
	}

	// Calculate reward
	const rewards = COIN_REWARDS[difficulty as keyof typeof COIN_REWARDS];
	let coinsEarned: number;
	let resultType: 'win' | 'draw' | 'loss';

	if (userScore > aiScore) {
		coinsEarned = rewards.win;
		resultType = 'win';
	} else if (userScore === aiScore) {
		coinsEarned = rewards.draw;
		resultType = 'draw';
	} else {
		coinsEarned = rewards.loss;
		resultType = 'loss';
	}

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

	// Update coins in profile
	const { error: updateError } = await supabaseAdmin
		.from('profiles')
		.update({ coins: newBalance })
		.eq('id', user.id);

	if (updateError) {
		throw error(500, 'Failed to update coins');
	}

	// Record the match
	const { error: matchError } = await supabaseAdmin
		.from('matches')
		.insert({
			user_id: user.id,
			difficulty,
			user_score: userScore,
			ai_score: aiScore,
			coins_earned: coinsEarned
		});

	if (matchError) {
		console.error('Failed to record match:', matchError);
		// Don't fail the request - coins were already awarded
	}

	// Update daily challenge progress
	try {
		// Update goals scored challenge
		if (userScore > 0) {
			await supabaseAdmin.rpc('update_challenge_progress', {
				p_user_id: user.id,
				p_challenge_type: 'score_goals',
				p_increment: userScore,
				p_difficulty: null
			});
		}

		// Update win challenges
		if (resultType === 'win') {
			await supabaseAdmin.rpc('update_challenge_progress', {
				p_user_id: user.id,
				p_challenge_type: 'win_matches',
				p_increment: 1,
				p_difficulty: null
			});

			// Update difficulty-specific win challenge
			await supabaseAdmin.rpc('update_challenge_progress', {
				p_user_id: user.id,
				p_challenge_type: 'play_difficulty',
				p_increment: 1,
				p_difficulty: difficulty
			});
		}
	} catch (challengeError) {
		console.error('Failed to update challenge progress:', challengeError);
		// Don't fail - challenges are optional
	}

	return json({
		success: true,
		coinsEarned,
		newBalance,
		resultType
	});
};
