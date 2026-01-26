import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';

// GET: Fetch user's daily challenges
export const GET: RequestHandler = async ({ cookies }) => {
	const accessToken = cookies.get('sb-access-token');
	if (!accessToken) {
		throw error(401, 'Not authenticated');
	}

	const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
	if (authError || !user) {
		throw error(401, 'Invalid session');
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

	return json({ challenges: result });
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

	return json({
		success: true,
		coinsEarned: reward,
		newBalance
	});
};
