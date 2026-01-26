// Supabase Edge Function: Simulate PvP Matches
// This function runs daily to simulate matches between league participants

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PlayerStats {
	pace: number;
	shooting: number;
	passing: number;
	defense: number;
	stamina: number;
}

interface SquadSnapshot {
	players: PlayerStats[];
	totalPower: number;
}

interface PvpEntry {
	id: string;
	league_id: string;
	user_id: string;
	squad_snapshot: SquadSnapshot;
	wins: number;
	losses: number;
	draws: number;
	points: number;
}

// Calculate team power from player stats
function calculateTeamPower(players: PlayerStats[]): number {
	if (players.length === 0) return 0;
	const totalStats = players.reduce(
		(sum, p) => sum + p.pace + p.shooting + p.passing + p.defense + p.stamina,
		0
	);
	return totalStats / players.length;
}

// Seeded random for deterministic simulations
function seededRandom(seed: string): () => number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}

	return function () {
		hash = Math.sin(hash) * 10000;
		return hash - Math.floor(hash);
	};
}

// Simulate a match between two squads
function simulateMatch(
	squad1: SquadSnapshot,
	squad2: SquadSnapshot,
	seed: string
): { score1: number; score2: number } {
	const random = seededRandom(seed);

	const power1 = squad1.totalPower || calculateTeamPower(squad1.players);
	const power2 = squad2.totalPower || calculateTeamPower(squad2.players);

	// Base scoring chances (higher power = more goals)
	const baseChance1 = power1 / 500;
	const baseChance2 = power2 / 500;

	let score1 = 0;
	let score2 = 0;

	// Simulate 10 "minutes" of play
	for (let minute = 0; minute < 10; minute++) {
		// Team 1 attack
		const attack1 = random();
		const randomness1 = 0.8 + random() * 0.4;
		if (attack1 < baseChance1 * randomness1 * 0.3) {
			score1++;
		}

		// Team 2 attack
		const attack2 = random();
		const randomness2 = 0.8 + random() * 0.4;
		if (attack2 < baseChance2 * randomness2 * 0.3) {
			score2++;
		}
	}

	return {
		score1: Math.min(score1, 5),
		score2: Math.min(score2, 5)
	};
}

// Calculate points from match result
function calculatePoints(myScore: number, opponentScore: number): number {
	if (myScore > opponentScore) return 3;
	if (myScore === opponentScore) return 1;
	return 0;
}

// Generate a match seed
function generateMatchSeed(leagueId: string, entry1Id: string, entry2Id: string, date: string): string {
	return `${leagueId}-${entry1Id}-${entry2Id}-${date}`;
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
	const arr = [...array];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

Deno.serve(async (req: Request) => {
	try {
		// Verify the request is authorized (e.g., from cron or admin)
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

		// Get current active league
		const { data: league, error: leagueError } = await supabase.rpc(
			'get_or_create_current_league'
		);

		if (leagueError || !league) {
			console.error('Failed to get league:', leagueError);
			return new Response(JSON.stringify({ error: 'No active league' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get all entries for this league
		const { data: entries, error: entriesError } = await supabase
			.from('pvp_entries')
			.select('*')
			.eq('league_id', league.id);

		if (entriesError || !entries || entries.length < 2) {
			console.log('Not enough entries for matches:', entries?.length || 0);
			return new Response(
				JSON.stringify({
					success: true,
					message: 'Not enough entries for matches',
					entriesCount: entries?.length || 0
				}),
				{ headers: { 'Content-Type': 'application/json' } }
			);
		}

		const today = new Date().toISOString().split('T')[0];
		const matchResults: {
			player1Id: string;
			player2Id: string;
			score1: number;
			score2: number;
		}[] = [];

		// Shuffle entries and pair them up
		const shuffled = shuffleArray(entries as PvpEntry[]);
		const matchedEntries = new Set<string>();

		// Each entry plays 1-2 matches per day
		const maxMatchesPerEntry = 2;
		const matchCounts: Record<string, number> = {};

		for (const entry of shuffled) {
			matchCounts[entry.id] = 0;
		}

		// Create matches - round-robin style but limited
		for (let i = 0; i < shuffled.length; i++) {
			const entry1 = shuffled[i];

			if (matchCounts[entry1.id] >= maxMatchesPerEntry) continue;

			for (let j = i + 1; j < shuffled.length; j++) {
				const entry2 = shuffled[j];

				if (matchCounts[entry2.id] >= maxMatchesPerEntry) continue;

				// Check if this pair already played today
				const pairKey = [entry1.id, entry2.id].sort().join('-');
				if (matchedEntries.has(pairKey)) continue;

				// Check database for existing match today
				const { data: existingMatch } = await supabase
					.from('pvp_matches')
					.select('id')
					.eq('league_id', league.id)
					.or(
						`and(player1_entry_id.eq.${entry1.id},player2_entry_id.eq.${entry2.id}),and(player1_entry_id.eq.${entry2.id},player2_entry_id.eq.${entry1.id})`
					)
					.gte('simulated_at', `${today}T00:00:00Z`)
					.limit(1);

				if (existingMatch && existingMatch.length > 0) continue;

				// Simulate the match
				const matchSeed = generateMatchSeed(league.id, entry1.id, entry2.id, today);
				const { score1, score2 } = simulateMatch(
					entry1.squad_snapshot as SquadSnapshot,
					entry2.squad_snapshot as SquadSnapshot,
					matchSeed
				);

				// Record the match
				const { error: matchError } = await supabase.from('pvp_matches').insert({
					league_id: league.id,
					player1_entry_id: entry1.id,
					player2_entry_id: entry2.id,
					player1_score: score1,
					player2_score: score2,
					match_seed: matchSeed
				});

				if (matchError) {
					console.error('Failed to insert match:', matchError);
					continue;
				}

				// Update entry stats
				const points1 = calculatePoints(score1, score2);
				const points2 = calculatePoints(score2, score1);

				// Update entry 1
				await supabase
					.from('pvp_entries')
					.update({
						wins: entry1.wins + (score1 > score2 ? 1 : 0),
						losses: entry1.losses + (score1 < score2 ? 1 : 0),
						draws: entry1.draws + (score1 === score2 ? 1 : 0),
						points: entry1.points + points1
					})
					.eq('id', entry1.id);

				// Update entry 2
				await supabase
					.from('pvp_entries')
					.update({
						wins: entry2.wins + (score2 > score1 ? 1 : 0),
						losses: entry2.losses + (score2 < score1 ? 1 : 0),
						draws: entry2.draws + (score1 === score2 ? 1 : 0),
						points: entry2.points + points2
					})
					.eq('id', entry2.id);

				// Track matches
				matchedEntries.add(pairKey);
				matchCounts[entry1.id]++;
				matchCounts[entry2.id]++;

				matchResults.push({
					player1Id: entry1.user_id,
					player2Id: entry2.user_id,
					score1,
					score2
				});

				// Stop if entry1 has reached max matches
				if (matchCounts[entry1.id] >= maxMatchesPerEntry) break;
			}
		}

		// Update rankings
		await supabase.rpc('update_pvp_rankings', { p_league_id: league.id });

		return new Response(
			JSON.stringify({
				success: true,
				leagueId: league.id,
				seasonNumber: league.season_number,
				matchesSimulated: matchResults.length,
				matchResults
			}),
			{ headers: { 'Content-Type': 'application/json' } }
		);
	} catch (error) {
		console.error('Error in simulate-pvp-matches:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error', details: String(error) }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
});
