import type { PageServerLoad } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const playerId = params.id;

	// Fetch the player
	const { data: player, error: playerError } = await supabaseAdmin
		.from('players')
		.select(`
			*,
			owner:profiles!players_owner_id_fkey (
				id,
				username
			)
		`)
		.eq('id', playerId)
		.single();

	if (playerError || !player) {
		throw error(404, 'Player not found');
	}

	// Fetch provenance
	const { data: provenance } = await supabaseAdmin
		.from('player_provenance')
		.select(`
			*,
			from_profile:profiles!player_provenance_from_user_id_fkey (username),
			to_profile:profiles!player_provenance_to_user_id_fkey (username)
		`)
		.eq('player_id', playerId)
		.order('traded_at', { ascending: true });

	const provenanceHistory = (provenance || []).map((p) => ({
		date: new Date(p.traded_at).toLocaleDateString(),
		from: p.trade_type === 'created' ? 'AI Scout' : (p.from_profile?.username || 'Unknown'),
		to: p.to_profile?.username || 'Unknown',
		type: p.trade_type,
		coins: p.coins_exchanged
	}));

	// Fetch level-up history
	const { data: levelUps } = await supabaseAdmin
		.from('level_ups')
		.select('*')
		.eq('player_id', playerId)
		.order('created_at', { ascending: false })
		.limit(20);

	// Check if current user is logged in
	const session = await locals.getSession?.();
	const currentUserId = session?.user?.id || null;
	const isOwner = currentUserId === player.owner_id;
	const canTrade = currentUserId && !isOwner && player.is_listed;

	return {
		player: {
			...player,
			ownerName: player.owner?.username || 'Unknown'
		},
		provenance: provenanceHistory,
		levelUps: levelUps || [],
		isOwner,
		canTrade,
		currentUserId
	};
};
