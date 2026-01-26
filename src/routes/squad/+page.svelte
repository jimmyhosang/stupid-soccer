<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import ListForTradeModal from '$lib/components/ListForTradeModal.svelte';
	import type { Player } from '$lib/types/database';
	import { supabase } from '$lib/stores/auth.svelte';

	// Get data from server load function
	let { data } = $props();

	// Reactive state from server data
	let myPlayers = $state<Player[]>(data.players);
	let coinBalance = $state(data.profile.coins);

	// Format coins for display
	function formatCoins(amount: number): string {
		return amount.toLocaleString();
	}

	let selectedPlayer = $state<Player | null>(null);
	let activeTab = $state<'squad' | 'bench'>('squad');
	let showListModal = $state(false);
	let playerToList = $state<Player | null>(null);

	const starters = $derived(myPlayers.filter((p) => p.is_starter));
	const bench = $derived(myPlayers.filter((p) => !p.is_starter));

	function selectPlayer(player: Player) {
		selectedPlayer = selectedPlayer?.id === player.id ? null : player;
	}

	async function toggleStarter(player: Player) {
		if (player.is_starter) {
			// Remove from starters - delete from squads table
			const { error } = await supabase
				.from('squads')
				.delete()
				.eq('player_id', player.id);

			if (error) {
				alert('Failed to remove from starters');
				console.error(error);
				return;
			}

			// Update local state
			const playerIndex = myPlayers.findIndex((p) => p.id === player.id);
			if (playerIndex !== -1) {
				myPlayers[playerIndex] = { ...myPlayers[playerIndex], is_starter: false };
			}
		} else {
			// Add to starters (max 3)
			if (starters.length >= 3) {
				alert('You can only have 3 starters! Remove one first.');
				return;
			}

			// Find next available position (1, 2, or 3)
			const usedPositions = new Set(data.squad.map((s: { position: number }) => s.position));
			let nextPosition = 1;
			while (usedPositions.has(nextPosition) && nextPosition <= 3) {
				nextPosition++;
			}

			const { error } = await supabase
				.from('squads')
				.insert({
					user_id: data.profile.id,
					player_id: player.id,
					position: nextPosition
				});

			if (error) {
				alert('Failed to add to starters');
				console.error(error);
				return;
			}

			// Update local state
			const playerIndex = myPlayers.findIndex((p) => p.id === player.id);
			if (playerIndex !== -1) {
				myPlayers[playerIndex] = { ...myPlayers[playerIndex], is_starter: true };
			}
		}
		selectedPlayer = null;
	}

	function calculateOverall(player: Player) {
		return Math.round((player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5);
	}

	function getTeamOverall() {
		if (starters.length === 0) return 0;
		return Math.round(starters.reduce((sum, p) => sum + calculateOverall(p), 0) / starters.length);
	}

	function openListModal(player: Player) {
		if (player.is_starter) {
			alert('Remove player from starters before listing for trade');
			return;
		}
		playerToList = player;
		showListModal = true;
	}

	async function handleListPlayer(player: Player, price: number) {
		// Update player in Supabase to list for trade
		const { error } = await supabase
			.from('players')
			.update({ is_listed: true, list_price: price })
			.eq('id', player.id);

		if (error) {
			alert('Failed to list player for trade');
			console.error(error);
			return;
		}

		// Update local state
		const playerIndex = myPlayers.findIndex((p) => p.id === player.id);
		if (playerIndex !== -1) {
			myPlayers[playerIndex] = { ...myPlayers[playerIndex], is_listed: true };
		}
		showListModal = false;
		playerToList = null;
		selectedPlayer = null;
		alert(`${player.name} listed for ${price} coins! Visit the Marketplace to see your listing.`);
	}
</script>

<svelte:head>
	<title>My Squad - Stupid Soccer</title>
</svelte:head>

<main class="squad-page">
	<div class="squad-container">
		<!-- Header -->
		<div class="squad-header">
			<div>
				<h1 class="squad-title">MY SQUAD</h1>
				<p class="squad-subtitle">Manage your players and build the ultimate team</p>
			</div>
			<div class="header-actions">
				<a href="/scout" class="btn btn-secondary">
					+ Scout New Player
				</a>
				<a href="/play" class="btn btn-primary">
					Play Match
				</a>
			</div>
		</div>

		<!-- Team Stats -->
		<div class="team-stats-card">
			<div class="team-stats-grid">
				<div class="stat-item">
					<span class="stat-label">TEAM OVERALL</span>
					<div class="stat-value stat-primary">{getTeamOverall()}</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">STARTERS</span>
					<div class="stat-value {starters.length === 3 ? 'stat-secondary' : 'stat-accent'}">{starters.length}/3</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">TOTAL PLAYERS</span>
					<div class="stat-value">{myPlayers.length}</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">COINS</span>
					<div class="stat-value stat-accent">{formatCoins(coinBalance)}</div>
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="tab-nav">
			<button
				onclick={() => activeTab = 'squad'}
				class="tab-btn {activeTab === 'squad' ? 'tab-active' : ''}"
			>
				STARTERS ({starters.length})
			</button>
			<button
				onclick={() => activeTab = 'bench'}
				class="tab-btn {activeTab === 'bench' ? 'tab-active' : ''}"
			>
				BENCH ({bench.length})
			</button>
		</div>

		<div class="content-grid">
			<!-- Players Grid -->
			<div class="lg:col-span-2">
				{#if activeTab === 'squad'}
					{#if starters.length === 0}
						<div class="card p-12 text-center">
							<p class="text-text-muted mb-4">No starters selected</p>
							<p class="text-text-secondary text-sm">Click on a player from your bench to add them as a starter</p>
						</div>
					{:else}
						<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
							{#each starters as player}
								<div class="relative">
									<div class="absolute -top-2 -right-2 z-10 bg-secondary text-white px-2 py-1 rounded font-pixel text-xs">
										STARTER
									</div>
									<PlayerCard
										{player}
										size="md"
										showStats={true}
										onClick={() => selectPlayer(player)}
									/>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					{#if bench.length === 0}
						<div class="card p-12 text-center">
							<p class="text-text-muted mb-4">Your bench is empty</p>
							<a href="/scout" class="btn btn-primary">Scout New Players</a>
						</div>
					{:else}
						<div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
							{#each bench as player}
								<PlayerCard
									{player}
									size="md"
									showStats={true}
									onClick={() => selectPlayer(player)}
								/>
							{/each}
						</div>
					{/if}
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
							<div>
								<span class="text-text-muted text-xs">OVERALL RATING</span>
								<div class="font-pixel text-2xl text-primary">{calculateOverall(selectedPlayer)}</div>
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

							<div>
								<span class="text-text-muted text-xs">CELEBRATION</span>
								<p class="text-text-secondary text-sm mt-1 italic">"{selectedPlayer.celebration}"</p>
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

							<!-- Actions -->
							<div class="pt-4 border-t border-border space-y-3">
								<button
									onclick={() => toggleStarter(selectedPlayer!)}
									class="w-full btn {selectedPlayer.is_starter ? 'btn-secondary' : 'btn-primary'}"
								>
									{selectedPlayer.is_starter ? 'Remove from Starters' : 'Add to Starters'}
								</button>
								<button
									onclick={() => openListModal(selectedPlayer!)}
									class="w-full btn btn-secondary"
									disabled={selectedPlayer.is_listed}
								>
									{selectedPlayer.is_listed ? 'Already Listed' : 'List for Trade'}
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="card p-8 text-center">
						<p class="text-text-muted">Click on a player to view details</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>

<!-- List for Trade Modal -->
<ListForTradeModal
	isOpen={showListModal}
	player={playerToList}
	onClose={() => { showListModal = false; playerToList = null; }}
	onSubmit={handleListPlayer}
/>

<style>
	.squad-page {
		min-height: 100vh;
		padding: 2rem 1rem;
	}

	.squad-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.squad-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (min-width: 768px) {
		.squad-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.squad-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
	}

	.squad-subtitle {
		color: var(--color-text-secondary);
		margin-top: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
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

	.btn-primary:hover {
		background-color: var(--color-primary-hover);
	}

	.btn-secondary {
		background-color: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background-color: var(--color-surface-hover);
	}

	.team-stats-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.team-stats-grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.stat-item {
		text-align: center;
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		display: block;
	}

	.stat-value {
		font-family: var(--font-pixel);
		font-size: 1.875rem;
		color: var(--color-text-primary);
	}

	.stat-primary {
		color: var(--color-primary);
	}

	.stat-secondary {
		color: var(--color-secondary);
	}

	.stat-accent {
		color: var(--color-accent);
	}

	.tab-nav {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.tab-btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		transition: all 0.2s;
		cursor: pointer;
		background-color: var(--color-surface);
		color: var(--color-text-secondary);
		border: none;
	}

	.tab-btn:hover {
		color: var(--color-text-primary);
	}

	.tab-active {
		background-color: var(--color-primary);
		color: white;
	}

	.content-grid {
		display: grid;
		gap: 2rem;
	}

	@media (min-width: 1024px) {
		.content-grid {
			grid-template-columns: 2fr 1fr;
		}
	}
</style>
