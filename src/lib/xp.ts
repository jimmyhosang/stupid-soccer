/**
 * XP Progression System - Client-side utilities
 * Based on Stupid Soccer PRD v3.0
 */

// ============================================
// LEVEL THRESHOLDS
// ============================================

/**
 * XP required to reach a specific level
 * Curve: exponential growth to make high levels rare
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

/**
 * Get tier color class
 */
export function getLevelTierColor(level: number): string {
	if (level >= 90) return 'text-amber-400';
	if (level >= 70) return 'text-purple-400';
	if (level >= 50) return 'text-blue-400';
	if (level >= 30) return 'text-green-400';
	if (level >= 15) return 'text-cyan-400';
	if (level >= 5) return 'text-slate-300';
	return 'text-slate-400';
}
