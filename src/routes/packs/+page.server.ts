import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isGuestMode, getGuestUser } from '$lib/server/supabase';

interface PackType {
	id: string;
	name: string;
	description: string;
	price: number;
	player_count: number;
	rarity_weights: { common: number; rare: number; legendary: number };
}

// Player name generators
const firstNames = [
	'Marco', 'Luis', 'João', 'Pierre', 'Hans', 'Yuki', 'Ahmed', 'Ivan', 'Carlos', 'Davi',
	'Kai', 'Leo', 'Max', 'Oscar', 'Hugo', 'Finn', 'Liam', 'Noah', 'Emil', 'Felix'
];
const lastNames = [
	'Silva', 'Garcia', 'Schmidt', 'Tanaka', 'Hassan', 'Petrov', 'Rodriguez', 'Kim', 'Chen', 'Santos',
	'Mueller', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'
];

function generateRandomName(): string {
	const first = firstNames[Math.floor(Math.random() * firstNames.length)];
	const last = lastNames[Math.floor(Math.random() * lastNames.length)];
	return `${first} ${last}`;
}

function selectRarity(weights: { common: number; rare: number; legendary: number }): 'common' | 'rare' | 'legendary' {
	const total = weights.common + weights.rare + weights.legendary;
	const roll = Math.random() * total;

	if (roll < weights.common) return 'common';
	if (roll < weights.common + weights.rare) return 'rare';
	return 'legendary';
}

function generateStats(rarity: 'common' | 'rare' | 'legendary'): { pace: number; shooting: number; passing: number; defense: number; stamina: number } {
	const baseRanges = {
		common: { min: 30, max: 55 },
		rare: { min: 50, max: 75 },
		legendary: { min: 70, max: 95 }
	};

	const range = baseRanges[rarity];

	return {
		pace: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
		shooting: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
		passing: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
		defense: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min,
		stamina: Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
	};
}

const personalities = [
	'Leader', 'Speedy', 'Technical', 'Physical', 'Creative', 'Reliable', 'Aggressive',
	'Calm', 'Versatile', 'Specialist', 'Hardworker', 'Talented', 'Clutch', 'Rookie'
];

const celebrations = [
	'Does a backflip', 'Points to the sky', 'Slides on knees', 'Does the robot',
	'Runs to the corner flag', 'Does a cartwheel', 'Blows kisses to crowd',
	'Shushes the opposition fans', 'Does a little dance', 'Poses for camera'
];

const hairStyles = ['spiky', 'mohawk', 'bald', 'long', 'short', 'afro'];
const skinTones = ['light', 'medium', 'dark', 'tan'];
const faceStyles = ['happy', 'serious', 'determined', 'calm'];

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Check for guest mode
	const guestUser = getGuestUser(cookies);
	if (isGuestMode && guestUser) {
		// Return mock pack types for guest mode
		return {
			profile: {
				id: guestUser.id,
				coins: 1000,
				username: guestUser.username
			},
			packTypes: [
				{
					id: 'starter',
					name: 'Starter Pack',
					description: 'A basic pack with 3 players',
					price: 100,
					player_count: 3,
					rarity_weights: { common: 80, rare: 18, legendary: 2 }
				},
				{
					id: 'premium',
					name: 'Premium Pack',
					description: 'Better odds with 5 players',
					price: 300,
					player_count: 5,
					rarity_weights: { common: 60, rare: 30, legendary: 10 }
				}
			],
			recentPurchases: [],
			totalPurchases: 0,
			isGuestMode: true
		};
	}

	const session = await locals.getSession();
	const userId = session?.user?.id;

	if (!userId) {
		return {
			profile: { id: '', coins: 0, username: 'Guest' },
			packTypes: [],
			recentPurchases: [],
			totalPurchases: 0
		};
	}

	// Fetch user's profile
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, coins, username')
		.eq('id', userId)
		.single();

	// Fetch available pack types
	const { data: packTypes } = await locals.supabase
		.from('pack_types')
		.select('*')
		.eq('is_active', true)
		.order('price', { ascending: true });

	// Fetch recent pack purchases
	const { data: recentPurchases, count: totalPurchases } = await locals.supabase
		.from('pack_purchases')
		.select('*, pack_type:pack_types(name)', { count: 'exact' })
		.eq('user_id', userId)
		.order('opened_at', { ascending: false })
		.limit(5);

	return {
		profile: profile || { id: userId, coins: 0, username: 'Unknown' },
		packTypes: (packTypes || []) as PackType[],
		recentPurchases: recentPurchases || [],
		totalPurchases: totalPurchases || 0
	};
};

export const actions: Actions = {
	buyPack: async ({ request, locals }) => {
		const session = await locals.getSession();
		if (!session) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const packTypeId = formData.get('packTypeId')?.toString();

		if (!packTypeId) {
			return fail(400, { error: 'Pack type is required' });
		}

		const userId = session.user.id;

		// Get pack type
		const { data: packType } = await locals.supabase
			.from('pack_types')
			.select('*')
			.eq('id', packTypeId)
			.single();

		if (!packType) {
			return fail(404, { error: 'Pack type not found' });
		}

		// Get user profile
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('coins')
			.eq('id', userId)
			.single();

		if (!profile || profile.coins < packType.price) {
			return fail(400, { error: 'Not enough coins' });
		}

		// Deduct coins
		const { error: coinsError } = await locals.supabase
			.from('profiles')
			.update({ coins: profile.coins - packType.price })
			.eq('id', userId);

		if (coinsError) {
			return fail(500, { error: 'Failed to process payment' });
		}

		// Generate players
		const weights = packType.rarity_weights as { common: number; rare: number; legendary: number };
		const players = [];

		for (let i = 0; i < packType.player_count; i++) {
			const rarity = selectRarity(weights);
			const stats = generateStats(rarity);
			const name = generateRandomName();
			const personality = [
				personalities[Math.floor(Math.random() * personalities.length)],
				personalities[Math.floor(Math.random() * personalities.length)]
			].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

			const player = {
				owner_id: userId,
				name,
				backstory: `A promising ${rarity} player discovered in a ${packType.name}.`,
				personality,
				celebration: celebrations[Math.floor(Math.random() * celebrations.length)],
				sprite_config: {
					hair: hairStyles[Math.floor(Math.random() * hairStyles.length)],
					skin: skinTones[Math.floor(Math.random() * skinTones.length)],
					face: faceStyles[Math.floor(Math.random() * faceStyles.length)],
					accessories: []
				},
				...stats,
				rarity
			};

			players.push(player);
		}

		// Insert players
		const { data: insertedPlayers, error: playersError } = await locals.supabase
			.from('players')
			.insert(players)
			.select();

		if (playersError) {
			// Refund coins if player creation failed
			await locals.supabase
				.from('profiles')
				.update({ coins: profile.coins })
				.eq('id', userId);
			return fail(500, { error: 'Failed to generate players' });
		}

		// Record provenance for each player
		for (const player of insertedPlayers || []) {
			await locals.supabase.from('player_provenance').insert({
				player_id: player.id,
				from_user_id: null,
				to_user_id: userId,
				trade_type: 'created',
				coins_exchanged: 0
			});
		}

		// Record pack purchase
		await locals.supabase.from('pack_purchases').insert({
			user_id: userId,
			pack_type_id: packTypeId,
			price_paid: packType.price
		});

		return {
			success: true,
			players: insertedPlayers,
			packName: packType.name
		};
	}
};
