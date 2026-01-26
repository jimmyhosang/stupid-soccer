/**
 * Coins store - manages player's coin balance
 * Uses localStorage until Supabase is connected
 */

const STORAGE_KEY = 'stupidsoccer_coins';
const STARTING_COINS = 1000;

/**
 * Coin rewards by difficulty and result
 */
export const COIN_REWARDS = {
	easy: { win: 50, draw: 20, loss: 10 },
	medium: { win: 100, draw: 40, loss: 15 },
	hard: { win: 200, draw: 75, loss: 25 }
} as const;

/**
 * Get current coin balance
 */
export function getCoins(): number {
	if (typeof window === 'undefined') return STARTING_COINS;

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === null) {
		// First time - give starting coins
		localStorage.setItem(STORAGE_KEY, String(STARTING_COINS));
		return STARTING_COINS;
	}
	return parseInt(stored, 10) || 0;
}

/**
 * Add coins to balance
 */
export function addCoins(amount: number): number {
	const current = getCoins();
	const newBalance = current + amount;
	localStorage.setItem(STORAGE_KEY, String(newBalance));
	return newBalance;
}

/**
 * Spend coins (returns false if insufficient balance)
 */
export function spendCoins(amount: number): boolean {
	const current = getCoins();
	if (current < amount) return false;

	localStorage.setItem(STORAGE_KEY, String(current - amount));
	return true;
}

/**
 * Set coins to specific amount (for testing/admin)
 */
export function setCoins(amount: number): void {
	localStorage.setItem(STORAGE_KEY, String(Math.max(0, amount)));
}

/**
 * Calculate reward for a match result
 */
export function calculateMatchReward(
	difficulty: 'easy' | 'medium' | 'hard',
	playerScore: number,
	aiScore: number
): { amount: number; type: 'win' | 'draw' | 'loss' } {
	const rewards = COIN_REWARDS[difficulty];

	if (playerScore > aiScore) {
		return { amount: rewards.win, type: 'win' };
	} else if (playerScore === aiScore) {
		return { amount: rewards.draw, type: 'draw' };
	} else {
		return { amount: rewards.loss, type: 'loss' };
	}
}

/**
 * Format coins for display (e.g., 1234 -> "1,234")
 */
export function formatCoins(amount: number): string {
	return amount.toLocaleString();
}
