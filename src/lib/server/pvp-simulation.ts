/**
 * PvP Match Simulation
 * Stat-based simulation for async PvP matches
 */

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

/**
 * Calculate team power from player stats
 */
export function calculateTeamPower(players: PlayerStats[]): number {
	if (players.length === 0) return 0;

	const totalStats = players.reduce(
		(sum, p) => sum + p.pace + p.shooting + p.passing + p.defense + p.stamina,
		0
	);

	// Average stats per player, normalized to 0-100 scale
	return totalStats / players.length;
}

/**
 * Seeded random number generator for deterministic simulations
 */
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

/**
 * Simulate a match between two squads
 * Returns scores for both teams
 */
export function simulateMatch(
	squad1: SquadSnapshot,
	squad2: SquadSnapshot,
	seed?: string
): { score1: number; score2: number } {
	const matchSeed = seed || `match-${Date.now()}-${Math.random()}`;
	const random = seededRandom(matchSeed);

	const power1 = squad1.totalPower || calculateTeamPower(squad1.players);
	const power2 = squad2.totalPower || calculateTeamPower(squad2.players);

	// Base scoring chances (higher power = more goals)
	const baseChance1 = power1 / 500; // ~0.7 for a 350 power team
	const baseChance2 = power2 / 500;

	// Simulate 10 "minutes" of play
	let score1 = 0;
	let score2 = 0;

	for (let minute = 0; minute < 10; minute++) {
		// Team 1 attack
		const attack1 = random();
		const randomness1 = 0.8 + random() * 0.4; // ±20% variance
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

	// Cap scores at 5 goals max
	return {
		score1: Math.min(score1, 5),
		score2: Math.min(score2, 5)
	};
}

/**
 * Calculate points from match result
 */
export function calculatePoints(myScore: number, opponentScore: number): number {
	if (myScore > opponentScore) return 3; // Win
	if (myScore === opponentScore) return 1; // Draw
	return 0; // Loss
}

/**
 * Generate a match seed for deterministic replay
 */
export function generateMatchSeed(
	leagueId: string,
	entry1Id: string,
	entry2Id: string,
	date: string
): string {
	return `${leagueId}-${entry1Id}-${entry2Id}-${date}`;
}
