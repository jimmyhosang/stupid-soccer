import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const period = url.searchParams.get('period') || 'weekly';

	if (!['weekly', 'monthly', 'alltime'].includes(period)) {
		throw error(400, 'Invalid period. Use: weekly, monthly, or alltime');
	}

	// Get leaderboard data
	const viewName = `leaderboard_${period}`;
	const { data: leaderboard, error: leaderboardError } = await supabaseAdmin
		.from(viewName)
		.select('*')
		.limit(50);

	if (leaderboardError) {
		console.error('Failed to fetch leaderboard:', leaderboardError);
		throw error(500, 'Failed to fetch leaderboard');
	}

	// Check if user is logged in and get their rank
	let userRank = null;
	const accessToken = cookies.get('sb-access-token');

	if (accessToken) {
		const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

		if (user) {
			const { data: rankData } = await supabaseAdmin
				.rpc('get_user_rank', { p_user_id: user.id, p_period: period });

			if (rankData && rankData.length > 0) {
				userRank = {
					rank: rankData[0].rank,
					wins: rankData[0].wins,
					totalMatches: rankData[0].total_matches
				};
			}
		}
	}

	return json({
		period,
		leaderboard: (leaderboard || []).map((entry, index) => ({
			rank: index + 1,
			userId: entry.user_id,
			username: entry.username,
			wins: entry.wins,
			losses: entry.losses,
			draws: entry.draws,
			totalMatches: entry.total_matches,
			totalGoals: entry.total_goals,
			coinsEarned: entry.coins_earned,
			winRate: entry.win_rate
		})),
		userRank
	});
};
