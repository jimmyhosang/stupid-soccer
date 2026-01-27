/**
 * XP Progression System
 * Based on Stupid Soccer PRD v3.0
 *
 * XP Sources:
 * - Match played: 10-30 XP (based on difficulty)
 * - Goal scored: 25 XP
 * - Assist: 15 XP
 * - Match won: 30 XP bonus
 * - Match drawn: 15 XP bonus
 * - Match lost: 5 XP bonus
 */

import type { Player, LevelUp } from '$lib/types/database';

// ============================================
// XP REWARDS
// ============================================

export const XP_REWARDS = {
	match_base: {
		easy: 10,
		medium: 20,
		hard: 30
	},
	goal: 25,
	assist: 15,
	win_bonus: 30,
	draw_bonus: 15,
	loss_bonus: 5
} as const;

// ============================================
// LEVEL THRESHOLDS
// ============================================

/**
 * XP required to reach a specific level
 * Curve: exponential growth to make high levels rare
 *
 * Level 1: 0 XP
 * Level 5: 1,250 XP
 * Level 10: 5,000 XP
 * Level 20: 25,000 XP
 * Level 50: 175,000 XP
 * Level 99: 500,000 XP
 */
export function xpForLevel(level: number): number {
	if (level <= 1) return 0;
	if (level <= 10) return Math.floor(50 * Math.pow(level, 2));
	if (level <= 50) return Math.floor(500 + 100 * Math.pow(level - 10, 2));
	return Math.floor(175000 + 6500 * (level - 50));
}

/**
 * Get level from total XP
 */
export function levelFromXp(xp: number): number {
	for (let level = 99; level >= 1; level--) {
		if (xp >= xpForLevel(level)) {
			return level;
		}
	}
	return 1;
}

/**
 * XP progress within current level (0-1)
 */
export function xpProgress(xp: number, level: number): number {
	const currentLevelXp = xpForLevel(level);
	const nextLevelXp = xpForLevel(level + 1);
	const progressXp = xp - currentLevelXp;
	const totalNeeded = nextLevelXp - currentLevelXp;
	return Math.min(1, Math.max(0, progressXp / totalNeeded));
}

/**
 * XP needed to reach next level
 */
export function xpToNextLevel(xp: number, level: number): number {
	const nextLevelXp = xpForLevel(level + 1);
	return Math.max(0, nextLevelXp - xp);
}

// ============================================
// XP CALCULATION
// ============================================

export interface MatchXpResult {
	playerId: string;
	xpEarned: number;
	levelBefore: number;
	levelAfter: number;
	leveledUp: boolean;
	statIncreases: StatIncreases | null;
}

export interface StatIncreases {
	pace: number;
	shooting: number;
	passing: number;
	defense: number;
	stamina: number;
}

/**
 * Calculate XP earned for a single player in a match
 */
export function calculatePlayerMatchXp(
	difficulty: 'easy' | 'medium' | 'hard',
	goals: number,
	assists: number,
	matchResult: 'win' | 'draw' | 'loss',
	growthRate: number = 1.0
): number {
	const baseXp = XP_REWARDS.match_base[difficulty];
	const goalXp = goals * XP_REWARDS.goal;
	const assistXp = assists * XP_REWARDS.assist;

	const resultBonus =
		matchResult === 'win'
			? XP_REWARDS.win_bonus
			: matchResult === 'draw'
				? XP_REWARDS.draw_bonus
				: XP_REWARDS.loss_bonus;

	const totalXp = baseXp + goalXp + assistXp + resultBonus;

	// Apply growth rate modifier (0.5-1.5x)
	return Math.floor(totalXp * growthRate);
}

/**
 * Process XP for all players in a match
 */
export function processMatchXp(
	players: Player[],
	difficulty: 'easy' | 'medium' | 'hard',
	playerGoals: Map<string, number>,
	playerAssists: Map<string, number>,
	matchResult: 'win' | 'draw' | 'loss'
): MatchXpResult[] {
	return players.map((player) => {
		const goals = playerGoals.get(player.id) || 0;
		const assists = playerAssists.get(player.id) || 0;

		const xpEarned = calculatePlayerMatchXp(difficulty, goals, assists, matchResult, player.growth_rate);

		const newXp = player.xp + xpEarned;
		const newLevel = levelFromXp(newXp);
		const leveledUp = newLevel > player.level;

		let statIncreases: StatIncreases | null = null;
		if (leveledUp) {
			statIncreases = calculateLevelUpStats(player, player.level, newLevel, goals, assists);
		}

		return {
			playerId: player.id,
			xpEarned,
			levelBefore: player.level,
			levelAfter: newLevel,
			leveledUp,
			statIncreases
		};
	});
}

// ============================================
// LEVEL UP STAT INCREASES
// ============================================

/**
 * Calculate stat increases on level up
 * Stats increase based on:
 * 1. Player performance (goals boost shooting, assists boost passing)
 * 2. Random distribution weighted by rarity
 * 3. Growth ceiling limits maximum stats
 */
export function calculateLevelUpStats(
	player: Player,
	oldLevel: number,
	newLevel: number,
	recentGoals: number = 0,
	recentAssists: number = 0
): StatIncreases {
	const levelsGained = newLevel - oldLevel;
	const totalPoints = levelsGained * getPointsPerLevel(player.rarity);

	// Distribute points based on performance and randomness
	const weights = {
		pace: 1 + Math.random() * 0.5,
		shooting: 1 + Math.random() * 0.5 + recentGoals * 0.3,
		passing: 1 + Math.random() * 0.5 + recentAssists * 0.3,
		defense: 1 + Math.random() * 0.5,
		stamina: 1 + Math.random() * 0.5
	};

	const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

	// Calculate raw increases
	const rawIncreases = {
		pace: Math.round((weights.pace / totalWeight) * totalPoints),
		shooting: Math.round((weights.shooting / totalWeight) * totalPoints),
		passing: Math.round((weights.passing / totalWeight) * totalPoints),
		defense: Math.round((weights.defense / totalWeight) * totalPoints),
		stamina: Math.round((weights.stamina / totalWeight) * totalPoints)
	};

	// Apply ceiling caps
	return {
		pace: Math.min(rawIncreases.pace, player.growth_ceiling - player.pace),
		shooting: Math.min(rawIncreases.shooting, player.growth_ceiling - player.shooting),
		passing: Math.min(rawIncreases.passing, player.growth_ceiling - player.passing),
		defense: Math.min(rawIncreases.defense, player.growth_ceiling - player.defense),
		stamina: Math.min(rawIncreases.stamina, player.growth_ceiling - player.stamina)
	};
}

/**
 * Points gained per level based on rarity
 */
function getPointsPerLevel(rarity: 'common' | 'rare' | 'legendary'): number {
	switch (rarity) {
		case 'legendary':
			return 3;
		case 'rare':
			return 2;
		default:
			return 1;
	}
}

// ============================================
// TRADE VALUE CALCULATION
// ============================================

/**
 * Calculate a player's trade value
 * Formula from PRD v3.0:
 * tradeValue = baseValue × levelMultiplier × rarityMultiplier × skillBonus × historyBonus × legacyBonus
 */
export function calculateTradeValue(player: Player): number {
	const BASE_VALUE = 100;

	// Level multiplier: 10% per level
	const levelMultiplier = 1 + player.level * 0.1;

	// Rarity multiplier
	const rarityMultiplier =
		player.rarity === 'legendary' ? 8 : player.rarity === 'rare' ? 2 : 1;

	// Skill bonus: average stat / 100
	const avgStat =
		(player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5;
	const skillBonus = avgStat / 100;

	// History bonus: 0.1% per match played (capped at 50%)
	const historyBonus = 1 + Math.min(player.total_matches * 0.001, 0.5);

	// Legacy bonus: 5% per generation above 1
	const legacyBonus = 1 + Math.max(player.generation - 1, 0) * 0.05;

	return Math.floor(
		BASE_VALUE * levelMultiplier * rarityMultiplier * skillBonus * historyBonus * legacyBonus
	);
}

// ============================================
// LEVEL UP RECORD HELPERS
// ============================================

/**
 * Create a level-up record for database insertion
 */
export function createLevelUpRecord(
	playerId: string,
	userId: string,
	oldLevel: number,
	newLevel: number,
	statIncreases: StatIncreases,
	matchId?: string
): Omit<LevelUp, 'id' | 'created_at'> {
	return {
		player_id: playerId,
		user_id: userId,
		old_level: oldLevel,
		new_level: newLevel,
		pace_increase: statIncreases.pace,
		shooting_increase: statIncreases.shooting,
		passing_increase: statIncreases.passing,
		defense_increase: statIncreases.defense,
		stamina_increase: statIncreases.stamina,
		triggered_by_match: matchId || null
	};
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format XP for display (e.g., 12345 -> "12,345")
 */
export function formatXp(xp: number): string {
	return xp.toLocaleString();
}

/**
 * Format level for display (e.g., 5 -> "Lvl 5")
 */
export function formatLevel(level: number): string {
	return `Lvl ${level}`;
}

/**
 * Get level tier name
 */
export function getLevelTier(level: number): string {
	if (level >= 90) return 'Legend';
	if (level >= 70) return 'Elite';
	if (level >= 50) return 'Pro';
	if (level >= 30) return 'Rising Star';
	if (level >= 15) return 'Prospect';
	if (level >= 5) return 'Rookie';
	return 'Newbie';
}
