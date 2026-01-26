<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import TradeOfferModal from '$lib/components/TradeOfferModal.svelte';
	import type { Player } from '$lib/types/database';
	import { supabase } from '$lib/stores/auth.svelte';

	// Get data from server load function
	let { data } = $props();

	// Reactive state from server data
	let listedPlayers = $state<(Player & { listPrice: number; sellerName: string })[]>(data.listedPlayers);
	let myPlayers = $state<Player[]>(data.myPlayers);
	let pendingTrades = $state(data.pendingTrades.map((t: any) => ({
		id: t.id,
		offeredPlayer: t.offered_player,
		targetPlayer: t.requested_player,
		status: t.status,
		coinsOffered: t.coins_offered
	})));
	let myCoins = $state(data.profile.coins);

	let selectedPlayer = $state<(Player & { listPrice: number; sellerName: string }) | null>(null);
	let searchQuery = $state('');
	let filterRarity = $state<'all' | 'common' | 'rare' | 'legendary'>('all');
	let sortBy = $state<'price-low' | 'price-high' | 'rating'>('price-low');
	let showTradeModal = $state(false);

	// Player provenance from server
	const playerProvenance: Record<string, { date: string; from: string; type: string }[]> = data.playerProvenance;

	const filteredPlayers = $derived(() => {
		let result = listedPlayers;

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					p.backstory?.toLowerCase().includes(query) ||
					p.personality.some((t) => t.toLowerCase().includes(query))
			);
		}

		// Filter by rarity
		if (filterRarity !== 'all') {
			result = result.filter((p) => p.rarity === filterRarity);
		}

		// Sort
		switch (sortBy) {
			case 'price-low':
				result = [...result].sort((a, b) => a.listPrice - b.listPrice);
				break;
			case 'price-high':
				result = [...result].sort((a, b) => b.listPrice - a.listPrice);
				break;
			case 'rating':
				result = [...result].sort((a, b) => {
					const ratingA = (a.pace + a.shooting + a.passing + a.defense + a.stamina) / 5;
					const ratingB = (b.pace + b.shooting + b.passing + b.defense + b.stamina) / 5;
					return ratingB - ratingA;
				});
				break;
		}

		return result;
	});

	function selectPlayer(player: (Player & { listPrice: number; sellerName: string })) {
		selectedPlayer = selectedPlayer?.id === player.id ? null : player;
	}

	async function buyPlayer(player: (Player & { listPrice: number; sellerName: string })) {
		if (myCoins < player.listPrice) {
			alert("You don't have enough coins!");
			return;
		}

		const buyerId = data.profile.id;
		const sellerId = player.owner_id;
		const price = player.listPrice;

		// Calculate 5% marketplace fee
		const fee = Math.floor(price * 0.05);
		const sellerReceives = price - fee;

		// Confirm purchase with fee breakdown
		const confirmed = confirm(
			`Buy ${player.name} for ${price} coins?\n\n` +
			`Seller receives: ${sellerReceives} coins\n` +
			`Marketplace fee (5%): ${fee} coins`
		);

		if (!confirmed) return;

		// Transfer player ownership
		const { error: transferError } = await supabase
			.from('players')
			.update({ owner_id: buyerId, is_listed: false, list_price: null })
			.eq('id', player.id);

		if (transferError) {
			alert('Failed to complete purchase');
			console.error(transferError);
			return;
		}

		// Deduct coins from buyer (full price)
		const { error: buyerError } = await supabase
			.from('profiles')
			.update({ coins: myCoins - price })
			.eq('id', buyerId);

		if (buyerError) {
			console.error('Failed to deduct coins:', buyerError);
		}

		// Add coins to seller (minus 5% fee)
		const { data: sellerProfile } = await supabase
			.from('profiles')
			.select('coins')
			.eq('id', sellerId)
			.single();

		if (sellerProfile) {
			await supabase
				.from('profiles')
				.update({ coins: sellerProfile.coins + sellerReceives })
				.eq('id', sellerId);
		}

		// Add provenance record (records full price paid)
		await supabase.from('player_provenance').insert({
			player_id: player.id,
			from_user_id: sellerId,
			to_user_id: buyerId,
			trade_type: 'traded',
			coins_exchanged: price
		});

		// Update local state
		myCoins -= price;
		listedPlayers = listedPlayers.filter((p) => p.id !== player.id);
		selectedPlayer = null;
		alert(`You bought ${player.name}! Check your squad.`);
	}

	function calculateOverall(player: Player) {
		return Math.round((player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5);
	}

	function openTradeModal() {
		if (!selectedPlayer) return;
		showTradeModal = true;
	}

	async function handleTradeSubmit(offeredPlayer: Player, coinsOffered: number) {
		if (!selectedPlayer) return;

		const proposerId = data.profile.id;
		const recipientId = selectedPlayer.owner_id;

		// Create trade in Supabase
		const { data: trade, error } = await supabase
			.from('trades')
			.insert({
				proposer_id: proposerId,
				recipient_id: recipientId,
				offered_player_id: offeredPlayer.id,
				requested_player_id: selectedPlayer.id,
				coins_offered: coinsOffered,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			alert('Failed to send trade offer');
			console.error(error);
			return;
		}

		// Update local state
		pendingTrades = [...pendingTrades, {
			id: trade.id,
			offeredPlayer,
			targetPlayer: selectedPlayer,
			status: 'pending',
			coinsOffered
		}];

		// Deduct coins if offered (held in escrow)
		if (coinsOffered > 0) {
			await supabase
				.from('profiles')
				.update({ coins: myCoins - coinsOffered })
				.eq('id', proposerId);
			myCoins -= coinsOffered;
		}

		showTradeModal = false;
		selectedPlayer = null;
		alert(`Trade offer sent! The owner will be notified.`);
	}
</script>

<svelte:head>
	<title>Marketplace - Stupid Soccer</title>
</svelte:head>

<main class="marketplace-page">
	<div class="marketplace-container">
		<!-- Header -->
		<div class="marketplace-header">
			<div>
				<h1 class="marketplace-title">MARKETPLACE</h1>
				<p class="marketplace-subtitle">Buy and trade players with the community</p>
			</div>
			<div class="header-right">
				<div class="coins-display">
					<span class="coins-label">YOUR COINS</span>
					<span class="coins-value">{myCoins.toLocaleString()}</span>
				</div>
				<a href="/squad" class="btn btn-secondary">
					My Squad
				</a>
			</div>
		</div>

		<!-- Filters -->
		<div class="filters-card">
			<div class="filters-row">
				<!-- Search -->
				<div class="search-wrapper">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search players..."
						class="search-input"
					/>
				</div>

				<!-- Rarity Filter -->
				<div class="rarity-filters">
					{#each ['all', 'common', 'rare', 'legendary'] as rarity}
						<button
							onclick={() => filterRarity = rarity as 'all' | 'common' | 'rare' | 'legendary'}
							class="filter-btn {filterRarity === rarity ? 'filter-active' : ''}"
						>
							{rarity.toUpperCase()}
						</button>
					{/each}
				</div>

				<!-- Sort -->
				<select
					bind:value={sortBy}
					class="sort-select"
				>
					<option value="price-low">Price: Low to High</option>
					<option value="price-high">Price: High to Low</option>
					<option value="rating">Rating: Best First</option>
				</select>
			</div>
		</div>

		<div class="grid lg:grid-cols-3 gap-8">
			<!-- Players Grid -->
			<div class="lg:col-span-2">
				{#if filteredPlayers().length === 0}
					<div class="card p-12 text-center">
						<p class="text-text-muted mb-4">No players found</p>
						<p class="text-text-secondary text-sm">Try adjusting your filters</p>
					</div>
				{:else}
					<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
						{#each filteredPlayers() as player}
							<div class="relative group">
								<PlayerCard
									{player}
									size="md"
									showStats={false}
									onClick={() => selectPlayer(player)}
								/>
								<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
									<div class="flex justify-between items-end">
										<div>
											<p class="text-text-muted text-xs">@{player.sellerName}</p>
										</div>
										<div class="text-right">
											<span class="font-pixel text-lg text-accent">{player.listPrice}</span>
											<span class="text-text-muted text-xs block">coins</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Player Details Sidebar -->
			<div class="lg:col-span-1">
				{#if selectedPlayer}
					<div class="card p-6 sticky top-8">
						<div class="flex justify-between items-start mb-4">
							<h2 class="font-pixel text-lg text-text-primary">{selectedPlayer.name}</h2>
							<button onclick={() => selectedPlayer = null} class="text-text-muted hover:text-text-primary">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						<div class="space-y-4">
							<div class="flex justify-between">
								<div>
									<span class="text-text-muted text-xs">OVERALL</span>
									<div class="font-pixel text-2xl text-primary">{calculateOverall(selectedPlayer)}</div>
								</div>
								<div class="text-right">
									<span class="text-text-muted text-xs">PRICE</span>
									<div class="font-pixel text-2xl text-accent">{selectedPlayer.listPrice}</div>
								</div>
							</div>

							<div>
								<span class="text-text-muted text-xs">SELLER</span>
								<p class="text-text-secondary">@{selectedPlayer.sellerName}</p>
							</div>

							<div>
								<span class="text-text-muted text-xs">RARITY</span>
								<div class="inline-block mt-1 px-2 py-1 rounded text-xs font-bold uppercase
									{selectedPlayer.rarity === 'legendary' ? 'bg-amber-400 text-amber-900' :
									 selectedPlayer.rarity === 'rare' ? 'bg-blue-400 text-blue-900' :
									 'bg-slate-400 text-slate-900'}">
									{selectedPlayer.rarity}
								</div>
							</div>

							<div>
								<span class="text-text-muted text-xs">BACKSTORY</span>
								<p class="text-text-secondary text-sm mt-1">{selectedPlayer.backstory}</p>
							</div>

							<div>
								<span class="text-text-muted text-xs">PERSONALITY</span>
								<div class="flex flex-wrap gap-2 mt-1">
									{#each selectedPlayer.personality as trait}
										<span class="px-2 py-1 bg-primary/20 text-primary rounded text-xs">{trait}</span>
									{/each}
								</div>
							</div>

							<!-- Stats -->
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted text-xs">PACE</span>
									<div class="flex items-center gap-2">
										<div class="w-24 h-2 bg-surface rounded-full overflow-hidden">
											<div class="h-full bg-primary" style="width: {selectedPlayer.pace}%"></div>
										</div>
										<span class="text-text-primary text-sm w-8">{selectedPlayer.pace}</span>
									</div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted text-xs">SHOOTING</span>
									<div class="flex items-center gap-2">
										<div class="w-24 h-2 bg-surface rounded-full overflow-hidden">
											<div class="h-full bg-primary" style="width: {selectedPlayer.shooting}%"></div>
										</div>
										<span class="text-text-primary text-sm w-8">{selectedPlayer.shooting}</span>
									</div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted text-xs">PASSING</span>
									<div class="flex items-center gap-2">
										<div class="w-24 h-2 bg-surface rounded-full overflow-hidden">
											<div class="h-full bg-primary" style="width: {selectedPlayer.passing}%"></div>
										</div>
										<span class="text-text-primary text-sm w-8">{selectedPlayer.passing}</span>
									</div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted text-xs">DEFENSE</span>
									<div class="flex items-center gap-2">
										<div class="w-24 h-2 bg-surface rounded-full overflow-hidden">
											<div class="h-full bg-primary" style="width: {selectedPlayer.defense}%"></div>
										</div>
										<span class="text-text-primary text-sm w-8">{selectedPlayer.defense}</span>
									</div>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted text-xs">STAMINA</span>
									<div class="flex items-center gap-2">
										<div class="w-24 h-2 bg-surface rounded-full overflow-hidden">
											<div class="h-full bg-primary" style="width: {selectedPlayer.stamina}%"></div>
										</div>
										<span class="text-text-primary text-sm w-8">{selectedPlayer.stamina}</span>
									</div>
								</div>
							</div>

							<!-- Provenance / History -->
							{#if playerProvenance[selectedPlayer.id]}
								<div class="pt-4 border-t border-border">
									<span class="text-text-muted text-xs">OWNERSHIP HISTORY</span>
									<div class="mt-2 space-y-2">
										{#each playerProvenance[selectedPlayer.id] as entry, i}
											<div class="flex items-center gap-2 text-sm">
												<div class="w-2 h-2 rounded-full {entry.type === 'created' ? 'bg-secondary' : 'bg-primary'}"></div>
												<span class="text-text-secondary flex-1">
													{entry.type === 'created' ? 'Created by' : 'Traded to'} <span class="text-text-primary font-medium">{entry.from}</span>
												</span>
												<span class="text-text-muted text-xs">{entry.date}</span>
											</div>
										{/each}
									</div>
									<p class="text-text-muted text-xs mt-2 italic">
										{playerProvenance[selectedPlayer.id].length === 1 ? 'Original owner!' : `${playerProvenance[selectedPlayer.id].length - 1} previous owner(s)`}
									</p>
								</div>
							{/if}

							<!-- Buy Button -->
							<div class="pt-4 border-t border-border">
								{#if myCoins >= selectedPlayer.listPrice}
									<button
										onclick={() => buyPlayer(selectedPlayer!)}
										class="w-full btn btn-primary"
									>
										Buy for {selectedPlayer.listPrice} coins
									</button>
								{:else}
									<button class="w-full btn btn-primary opacity-50 cursor-not-allowed" disabled>
										Not enough coins ({selectedPlayer.listPrice - myCoins} more needed)
									</button>
								{/if}
								<button onclick={openTradeModal} class="w-full btn btn-secondary mt-3">
									Offer Trade
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="card p-8 text-center">
						<p class="text-text-muted mb-4">Click on a player to view details</p>
						<p class="text-text-secondary text-sm">Browse the marketplace for your next star player</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Pending Trades Section -->
	{#if pendingTrades.length > 0}
		<div class="max-w-6xl mx-auto mt-8 px-4">
			<h2 class="font-pixel text-lg text-text-primary mb-4">YOUR PENDING TRADES</h2>
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each pendingTrades as trade}
					<div class="card p-4">
						<div class="flex items-center gap-4">
							<div class="text-center flex-1">
								<div class="text-xs text-text-muted mb-1">You offered</div>
								<div class="font-bold text-text-primary text-sm">{trade.offeredPlayer.name}</div>
							</div>
							<div class="text-primary text-xl">→</div>
							<div class="text-center flex-1">
								<div class="text-xs text-text-muted mb-1">For</div>
								<div class="font-bold text-text-primary text-sm">{trade.targetPlayer.name}</div>
							</div>
						</div>
						<div class="mt-3 text-center">
							<span class="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-bold uppercase">
								{trade.status}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</main>

<!-- Trade Offer Modal -->
{#if selectedPlayer}
	<TradeOfferModal
		isOpen={showTradeModal}
		targetPlayer={selectedPlayer}
		{myPlayers}
		onClose={() => showTradeModal = false}
		onSubmit={handleTradeSubmit}
	/>
{/if}

<style>
	.marketplace-page {
		min-height: 100vh;
		padding: 2rem 1rem;
	}

	.marketplace-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.marketplace-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (min-width: 768px) {
		.marketplace-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.marketplace-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
	}

	.marketplace-subtitle {
		color: var(--color-text-secondary);
		margin-top: 0.25rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.coins-display {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
	}

	.coins-label {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.coins-value {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		color: var(--color-accent);
		margin-left: 0.5rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: all 0.2s;
		cursor: pointer;
		text-decoration: none;
		border: none;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background-color: var(--color-surface-hover);
	}

	.filters-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 2rem;
	}

	.filters-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 768px) {
		.filters-row {
			flex-direction: row;
		}
	}

	.search-wrapper {
		flex: 1;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 1rem;
		background-color: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-size: 1rem;
	}

	.search-input::placeholder {
		color: var(--color-text-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
	}

	.rarity-filters {
		display: flex;
		gap: 0.5rem;
	}

	.filter-btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s;
		cursor: pointer;
		background-color: var(--color-surface);
		color: var(--color-text-secondary);
		border: none;
	}

	.filter-btn:hover {
		color: var(--color-text-primary);
	}

	.filter-active {
		background-color: var(--color-primary);
		color: white;
	}

	.sort-select {
		padding: 0.625rem 1rem;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-size: 1rem;
	}

	.sort-select:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
