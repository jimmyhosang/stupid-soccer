import type { PageServerLoad } from './$types';
import { isGuestMode, getGuestUser } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	// Check for guest mode
	const guestUser = getGuestUser(cookies);
	if (isGuestMode && guestUser) {
		return {
			profile: {
				id: guestUser.id,
				coins: 1000,
				username: guestUser.username
			},
			listedPlayers: [],
			myPlayers: [],
			pendingTrades: [],
			playerProvenance: {},
			isGuestMode: true
		};
	}

	const session = await locals.getSession();
	const userId = session?.user?.id;

	if (!userId) {
		return {
			profile: { id: '', coins: 0, username: 'Guest' },
			listedPlayers: [],
			myPlayers: [],
			pendingTrades: [],
			playerProvenance: {}
		};
	}

	// Fetch user's profile (for coins)
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('id, coins, username')
		.eq('id', userId)
		.single();

	// Fetch all listed players (excluding user's own)
	const { data: listedPlayers, error: listingsError } = await locals.supabase
		.from('players')
		.select(`
			*,
			owner:profiles!players_owner_id_fkey (
				username
			)
		`)
		.eq('is_listed', true)
		.neq('owner_id', userId)
		.order('created_at', { ascending: false });

	if (listingsError) {
		console.error('Failed to fetch listings:', listingsError);
	}

	// Fetch user's own players (for trading)
	const { data: myPlayers } = await locals.supabase
		.from('players')
		.select('*')
		.eq('owner_id', userId)
		.eq('is_listed', false);

	// Fetch user's pending trades
	const { data: pendingTrades } = await locals.supabase
		.from('trades')
		.select(`
			*,
			offered_player:players!trades_offered_player_id_fkey (*),
			requested_player:players!trades_requested_player_id_fkey (*)
		`)
		.eq('proposer_id', userId)
		.eq('status', 'pending');

	// Fetch provenance for all listed players
	const playerIds = (listedPlayers || []).map((p) => p.id);
	const { data: provenance } = await locals.supabase
		.from('player_provenance')
		.select(`
			*,
			from_profile:profiles!player_provenance_from_user_id_fkey (username),
			to_profile:profiles!player_provenance_to_user_id_fkey (username)
		`)
		.in('player_id', playerIds)
		.order('traded_at', { ascending: true });

	// Group provenance by player ID
	const provenanceByPlayer: Record<string, { date: string; from: string; type: string }[]> = {};
	for (const p of provenance || []) {
		if (!provenanceByPlayer[p.player_id]) {
			provenanceByPlayer[p.player_id] = [];
		}
		provenanceByPlayer[p.player_id].push({
			date: new Date(p.traded_at).toLocaleDateString(),
			from: p.trade_type === 'created' ? 'AI Scout' : (p.from_profile?.username || 'Unknown'),
			type: p.trade_type
		});
	}

	// Transform listed players to include seller name and list price
	const transformedListings = (listedPlayers || []).map((player) => ({
		...player,
		sellerName: player.owner?.username || 'Unknown',
		listPrice: player.list_price || 100
	}));

	return {
		profile: profile || { id: userId, coins: 0, username: 'Unknown' },
		listedPlayers: transformedListings,
		myPlayers: myPlayers || [],
		pendingTrades: pendingTrades || [],
		playerProvenance: provenanceByPlayer
	};
};
