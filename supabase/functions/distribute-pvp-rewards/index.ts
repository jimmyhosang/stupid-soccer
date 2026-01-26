// Supabase Edge Function: Distribute PvP Weekly Rewards
// This function runs at the end of each league week to distribute rewards

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Reward tiers
const REWARD_TIERS = [
	{ rank: 1, coins: 500 },
	{ rank: 2, coins: 300 },
	{ rank: 3, coins: 200 },
	{ rank: 10, coins: 100 }, // Top 10
	{ rank: 50, coins: 50 } // Top 50
] as const;

function getRewardForRank(rank: number): number {
	if (rank === 1) return 500;
	if (rank === 2) return 300;
	if (rank === 3) return 200;
	if (rank <= 10) return 100;
	if (rank <= 50) return 50;
	return 0;
}

interface PvpEntry {
	id: string;
	user_id: string;
	rank: number | null;
	points: number;
	wins: number;
}

Deno.serve(async (req: Request) => {
	try {
		// Verify the request is authorized
		const authHeader = req.headers.get('Authorization');
		if (!authHeader) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Create Supabase client with service role
		const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
		const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		// Find leagues that have ended and haven't been processed
		const now = new Date().toISOString();
		const { data: endedLeagues, error: leaguesError } = await supabase
			.from('pvp_leagues')
			.select('*')
			.lt('ends_at', now)
			.eq('is_active', true);

		if (leaguesError) {
			console.error('Failed to get ended leagues:', leaguesError);
			return new Response(JSON.stringify({ error: 'Failed to get leagues' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		if (!endedLeagues || endedLeagues.length === 0) {
			return new Response(
				JSON.stringify({
					success: true,
					message: 'No ended leagues to process'
				}),
				{ headers: { 'Content-Type': 'application/json' } }
			);
		}

		const results: {
			leagueId: string;
			seasonNumber: number;
			rewardsDistributed: { userId: string; rank: number; coins: number }[];
		}[] = [];

		for (const league of endedLeagues) {
			// Update final rankings
			await supabase.rpc('update_pvp_rankings', { p_league_id: league.id });

			// Get all entries ordered by rank
			const { data: entries, error: entriesError } = await supabase
				.from('pvp_entries')
				.select('id, user_id, rank, points, wins')
				.eq('league_id', league.id)
				.order('rank', { ascending: true });

			if (entriesError || !entries) {
				console.error('Failed to get entries for league:', league.id, entriesError);
				continue;
			}

			const rewardsDistributed: { userId: string; rank: number; coins: number }[] = [];

			// Distribute rewards
			for (const entry of entries as PvpEntry[]) {
				const rank = entry.rank || 999;
				const rewardCoins = getRewardForRank(rank);

				if (rewardCoins > 0) {
					// Get current coin balance
					const { data: profile } = await supabase
						.from('profiles')
						.select('coins')
						.eq('id', entry.user_id)
						.single();

					if (profile) {
						// Update coins
						const { error: updateError } = await supabase
							.from('profiles')
							.update({ coins: profile.coins + rewardCoins })
							.eq('id', entry.user_id);

						if (!updateError) {
							// Create notification for the user
							await supabase.rpc('create_pvp_reward_notification', {
								p_user_id: entry.user_id,
								p_league_id: league.id,
								p_season_number: league.season_number,
								p_final_rank: rank,
								p_coins_awarded: rewardCoins
							});

							rewardsDistributed.push({
								userId: entry.user_id,
								rank,
								coins: rewardCoins
							});
						}
					}
				}
			}

			// Mark league as inactive
			await supabase.from('pvp_leagues').update({ is_active: false }).eq('id', league.id);

			results.push({
				leagueId: league.id,
				seasonNumber: league.season_number,
				rewardsDistributed
			});
		}

		return new Response(
			JSON.stringify({
				success: true,
				processedLeagues: results.length,
				results
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (error) {
		console.error('Error in distribute-pvp-rewards:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error', details: String(error) }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
});
