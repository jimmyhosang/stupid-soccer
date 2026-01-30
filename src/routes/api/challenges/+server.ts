import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin, isGuestMode, getGuestUser } from '$lib/server/supabase';

// GET: Fetch user's daily challenges
export const GET: RequestHandler = async ({ cookies }) => {
	// Check for guest mode
	const guestUser = getGuestUser(cookies);
	if (isGuestMode && guestUser) {
		// Return mock challenges for guest mode
		return json({
			challenges: [
				{
					id: 'guest-1',
					challengeId: 'win-matches',
					title: 'Win 3 Matches',
					description: 'Win 3 matches against the AI',
					type: 'win_matches',
					targetCount: 3,
					progress: 0,
					isCompleted: false,
					isClaimed: false,
					coinReward: 50
				},
				{
					id: 'guest-2',
					challengeId: 'score-goals',
					title: 'Score 10 Goals',
					description: 'Score 10 goals in any matches',
					type: 'score_goals',
					targetCount: 10,
					progress: 0,
					isCompleted: false,
					isClaimed: false,
					coinReward: 30
				},
				{
					id: 'guest-3',
					challengeId: 'play-hard',
					title: 'Play on Hard',
					description: 'Win a match on Hard difficulty',
					type: 'play_difficulty',
					targetCount: 1,
					progress: 0,
					isCompleted: false,
					isClaimed: false,
					coinReward: 100
				}
			],
			streak: {
				current: 0,
				isActive: false,
				potentialBonus: 10,
				lastCompletionDate: null
			},
			isGuestMode: true
		});
	}

	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		// Return empty challenges for non-authenticated users
		return json({
			challenges: [],
			streak: { current: 0, isActive: false, potentialBonus: 10, lastCompletionDate: null }
		});
	}

	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		return json({
			challenges: [],
			streak: { current: 0, isActive: false, potentialBonus: 10, lastCompletionDate: null }
		});
	}

	// Assign daily challenges (will return existing if already assigned today)
	const { data: assignments, error: assignError } = await supabaseAdmin
		.rpc('assign_daily_challenges', { p_user_id: user.id });

	if (assignError) {
		console.error('Failed to assign challenges:', assignError);
		throw error(500, 'Failed to load challenges');
	}

	// Fetch full challenge details
	const challengeIds = (assignments || []).map((a: { challenge_id: string }) => a.challenge_id);

	const { data: challenges } = await supabaseAdmin
		.from('challenges')
		.select('*')
		.in('id', challengeIds);

	// Get streak info
	const { data: streakData } = await supabaseAdmin
		.rpc('get_user_streak', { p_user_id: user.id });

	const streakInfo = streakData?.[0] || {
		streak: 0,
		last_completion_date: null,
		streak_active: false,
		potential_bonus: 10
	};

	// Combine assignment data with challenge details
	const result = (assignments || []).map((assignment: {
		id: string;
		challenge_id: string;
		progress: number;
		is_completed: boolean;
		is_claimed: boolean;
	}) => {
		const challenge = (challenges || []).find((c: { id: string }) => c.id === assignment.challenge_id);
		return {
			id: assignment.id,
			challengeId: assignment.challenge_id,
			title: challenge?.title || 'Unknown',
			description: challenge?.description || '',
			type: challenge?.type || 'unknown',
			targetCount: challenge?.target_count || 1,
			progress: assignment.progress,
			isCompleted: assignment.is_completed,
			isClaimed: assignment.is_claimed,
			coinReward: challenge?.coin_reward || 0
		};
	});

	return json({
		challenges: result,
		streak: {
			current: streakInfo.streak,
			isActive: streakInfo.streak_active,
			potentialBonus: streakInfo.potential_bonus,
			lastCompletionDate: streakInfo.last_completion_date
		}
	});
};

// POST: Claim a challenge reward
export const POST: RequestHandler = async ({ request, cookies }) => {
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
	}

	const body = await request.json();
	const { assignmentId } = body;

	if (!assignmentId) {
		throw error(400, 'Missing assignmentId');
	}

	// Verify ownership
	const { data: assignment } = await supabaseAdmin
		.from('user_daily_challenges')
		.select('*')
		.eq('id', assignmentId)
		.eq('user_id', user.id)
		.single();

	if (!assignment) {
		throw error(404, 'Challenge not found');
	}

	if (!assignment.is_completed) {
		throw error(400, 'Challenge not completed');
	}

	if (assignment.is_claimed) {
		throw error(400, 'Reward already claimed');
	}

	// Get reward amount
	const { data: challenge } = await supabaseAdmin
		.from('challenges')
		.select('coin_reward')
		.eq('id', assignment.challenge_id)
		.single();

	const reward = challenge?.coin_reward || 0;

	// Mark as claimed
	await supabaseAdmin
		.from('user_daily_challenges')
		.update({ is_claimed: true })
		.eq('id', assignmentId);

	// Add coins to user
	const { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('coins')
		.eq('id', user.id)
		.single();

	const newBalance = (profile?.coins || 0) + reward;

	await supabaseAdmin
		.from('profiles')
		.update({ coins: newBalance })
		.eq('id', user.id);

	// Check and update streak (awards bonus if all 3 challenges completed)
	const { data: streakResult } = await supabaseAdmin
		.rpc('check_challenge_streak', { p_user_id: user.id });

	const streakInfo = streakResult?.[0] || { streak: 0, bonus_coins: 0, streak_updated: false };

	// Get final balance after streak bonus
	const { data: finalProfile } = await supabaseAdmin
		.from('profiles')
		.select('coins')
		.eq('id', user.id)
		.single();

	return json({
		success: true,
		coinsEarned: reward,
		newBalance: finalProfile?.coins || newBalance,
		streak: {
			current: streakInfo.streak,
			bonusAwarded: streakInfo.bonus_coins,
			streakUpdated: streakInfo.streak_updated
		}
	});
};
