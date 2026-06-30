<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import ListForTradeModal from '$lib/components/ListForTradeModal.svelte';
	import type { Player } from '$lib/types/database';
	import { supabase } from '$lib/stores/auth.svelte';
	import { xpProgress, formatXp, getLevelTier, getLevelTierColor, xpToNextLevel } from '$lib/xp';

	// Get data from server load function
	let { data } = $props();

	// Player augmented with its lineup slot (1-3) when a starter; null otherwise
	type LineupPlayer = Player & { starter_position: number | null };

	// Reactive state from server data
	let myPlayers = $state<LineupPlayer[]>(data.players as LineupPlayer[]);
	let coinBalance = $state(data.profile.coins);

	// Which empty slot (1-3) the user is currently filling from the bench chooser
	let choosingSlot = $state<number | null>(null);

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

	// The three lineup slots (positions 1-3), each holding the occupying starter or null
	const lineupSlots = $derived(
		[1, 2, 3].map((pos) => starters.find((p) => p.starter_position === pos) ?? null)
	);

	function selectPlayer(player: Player) {
		selectedPlayer = selectedPlayer?.id === player.id ? null : player;
	}

	// Persist a starter into a specific lineup slot (1-3) and update local state.
	// Shared by the sidebar "Add to Starters" toggle and the empty-slot chooser.
	async function addStarterAtPosition(player: Player, position: number) {
		if (!supabase) {
			alert('Database connection not available');
			return;
		}

		const { error } = await supabase
			.from('squads')
			.insert({
				user_id: data.profile.id,
				player_id: player.id,
				position
			});

		if (error) {
			alert('Failed to add to starters');
			console.error(error);
			return;
		}

		// Update local state
		const playerIndex = myPlayers.findIndex((p) => p.id === player.id);
		if (playerIndex !== -1) {
			myPlayers[playerIndex] = {
				...myPlayers[playerIndex],
				is_starter: true,
				starter_position: position
			};
		}
	}

	// Remove a starter from the squad and update local state.
	async function removeStarter(player: Player) {
		if (!supabase) {
			alert('Database connection not available');
			return;
		}

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
			myPlayers[playerIndex] = {
				...myPlayers[playerIndex],
				is_starter: false,
				starter_position: null
			};
		}
	}

	// First lineup slot (1-3) not currently occupied, or null if the lineup is full.
	function nextFreePosition(): number | null {
		const used = new Set(starters.map((p) => p.starter_position));
		for (let pos = 1; pos <= 3; pos++) {
			if (!used.has(pos)) return pos;
		}
		return null;
	}

	async function toggleStarter(player: Player) {
		if (player.is_starter) {
			await removeStarter(player);
		} else {
			const position = nextFreePosition();
			if (position === null) {
				alert('You can only have 3 starters! Remove one first.');
				return;
			}
			await addStarterAtPosition(player, position);
		}
		selectedPlayer = null;
	}

	// Fill a specific empty lineup slot from the bench chooser.
	async function assignToSlot(player: Player, position: number) {
		await addStarterAtPosition(player, position);
		choosingSlot = null;
		selectedPlayer = null;
	}

	function calculateOverall(player: Player) {
		return Math.round((player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5);
	}

	function getTeamOverall() {
		if (starters.length === 0) return 0;
		return Math.round(starters.reduce((sum, p) => sum + calculateOverall(p), 0) / starters.length);
	}

	function getTeamTotalXp() {
		return myPlayers.reduce((sum, p) => sum + (p.xp || 0), 0);
	}

	function getTeamAverageLevel() {
		if (myPlayers.length === 0) return 1;
		return Math.round(myPlayers.reduce((sum, p) => sum + (p.level || 1), 0) / myPlayers.length);
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
		if (!supabase) {
			alert('Database connection not available');
			return;
		}
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
					<span class="stat-label">AVG LEVEL</span>
					<div class="stat-value stat-secondary">{getTeamAverageLevel()}</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">STARTERS</span>
					<div class="stat-value {starters.length === 3 ? 'stat-secondary' : 'stat-accent'}">{starters.length}/3</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">TOTAL XP</span>
					<div class="stat-value">{formatXp(getTeamTotalXp())}</div>
				</div>
				<div class="stat-item">
					<span class="stat-label">COINS</span>
					<div class="stat-value stat-accent">{formatCoins(coinBalance)}</div>
				</div>
			</div>
		</div>

		{#if myPlayers.length === 0}
			<!-- Empty squad: user owns no players at all -->
			<div class="card p-12 text-center">
				<div class="text-5xl mb-4">⚽</div>
				<h2 class="font-pixel text-lg text-text-primary mb-2">YOUR SQUAD IS EMPTY</h2>
				<p class="text-text-secondary mb-6 max-w-md mx-auto">
					You don't own any players yet. Head to the AI Scout to generate your first players and start building your 3v3 lineup.
				</p>
				<a href="/scout" class="btn btn-primary">+ Scout Your First Player</a>
			</div>
		{:else}
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
					<!-- 3v3 Lineup: three labelled starter slots, filled or empty -->
					<div class="lineup-region">
						<div class="lineup-header">
							<h2 class="lineup-title">YOUR LINEUP (3v3)</h2>
							<span class="lineup-count">{starters.length}/3</span>
						</div>
						<div class="lineup-slots">
							{#each lineupSlots as slotPlayer, i}
								{@const position = i + 1}
								<div class="lineup-slot">
									<div class="slot-label">STARTER {position}</div>
									{#if slotPlayer}
										<!-- Filled slot: render the player's card with a bench/remove affordance -->
										<div class="slot-filled">
											<PlayerCard
												player={slotPlayer}
												size="md"
												showStats={true}
												onClick={() => selectPlayer(slotPlayer)}
											/>
											<button
												type="button"
												class="slot-remove-btn"
												onclick={() => removeStarter(slotPlayer)}
											>
												Bench
											</button>
										</div>
									{:else if choosingSlot === position}
										<!-- Empty slot in "choose from bench" mode -->
										<div class="slot-empty slot-choosing">
											{#if bench.length === 0}
												<p class="slot-empty-text">No bench players available.</p>
												<a href="/scout" class="slot-add-btn">Scout players</a>
											{:else}
												<p class="slot-empty-text">Choose a player for slot {position}</p>
												<div class="slot-chooser-list">
													{#each bench as benchPlayer}
														<button
															type="button"
															class="slot-chooser-item"
															onclick={() => assignToSlot(benchPlayer, position)}
														>
															{benchPlayer.name}
														</button>
													{/each}
												</div>
											{/if}
											<button
												type="button"
												class="slot-cancel-btn"
												onclick={() => (choosingSlot = null)}
											>
												Cancel
											</button>
										</div>
									{:else}
										<!-- Empty slot placeholder with add affordance -->
										<button
											type="button"
											class="slot-empty slot-empty-add"
											onclick={() => (choosingSlot = position)}
										>
											<span class="slot-plus">+</span>
											<span class="slot-empty-text">Add starter</span>
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>
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
							<!-- Level & XP Progress -->
							<div class="bg-black/20 rounded-lg p-3">
								<div class="flex justify-between items-center mb-2">
									<div>
										<span class="text-text-muted text-xs">LEVEL</span>
										<div class="flex items-center gap-2">
											<span class="font-pixel text-2xl text-primary">{selectedPlayer.level || 1}</span>
											<span class="text-xs {getLevelTierColor(selectedPlayer.level || 1)}">{getLevelTier(selectedPlayer.level || 1)}</span>
										</div>
									</div>
									<div class="text-right">
										<span class="text-text-muted text-xs">TOTAL XP</span>
										<div class="font-pixel text-lg text-accent">{formatXp(selectedPlayer.xp || 0)}</div>
									</div>
								</div>
								{#if (selectedPlayer.level || 1) < 99}
									<div class="mt-2">
										<div class="h-2 bg-black/50 rounded-full overflow-hidden">
											<div
												class="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
												style="width: {Math.round(xpProgress(selectedPlayer.xp || 0, selectedPlayer.level || 1) * 100)}%"
											></div>
										</div>
										<div class="flex justify-between text-[10px] mt-1">
											<span class="text-text-muted">{Math.round(xpProgress(selectedPlayer.xp || 0, selectedPlayer.level || 1) * 100)}% to next level</span>
											<span class="text-accent">{formatXp(xpToNextLevel(selectedPlayer.xp || 0, selectedPlayer.level || 1))} XP needed</span>
										</div>
									</div>
								{:else}
									<div class="text-center text-amber-400 text-sm font-bold mt-2">MAX LEVEL</div>
								{/if}
							</div>

							<!-- Match Stats -->
							<div class="grid grid-cols-3 gap-2 text-center">
								<div class="bg-black/20 rounded p-2">
									<div class="text-lg font-pixel text-text-primary">{selectedPlayer.total_matches || 0}</div>
									<div class="text-[10px] text-text-muted">MATCHES</div>
								</div>
								<div class="bg-black/20 rounded p-2">
									<div class="text-lg font-pixel text-text-primary">{selectedPlayer.total_goals || 0}</div>
									<div class="text-[10px] text-text-muted">GOALS</div>
								</div>
								<div class="bg-black/20 rounded p-2">
									<div class="text-lg font-pixel text-text-primary">{selectedPlayer.total_wins || 0}</div>
									<div class="text-[10px] text-text-muted">WINS</div>
								</div>
							</div>

							<div class="flex gap-2">
								<div>
									<span class="text-text-muted text-xs">OVERALL</span>
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
								{#if selectedPlayer.generation > 1}
									<div>
										<span class="text-text-muted text-xs">GEN</span>
										<div class="inline-block mt-1 px-2 py-1 rounded text-xs font-bold bg-purple-500 text-white">
											{selectedPlayer.generation}
										</div>
									</div>
								{/if}
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
		{/if}
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

	/* ---- 3v3 Lineup region ---- */
	.lineup-region {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.lineup-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	.lineup-title {
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.lineup-count {
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		color: var(--color-accent);
	}

	.lineup-slots {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}

	@media (min-width: 640px) {
		.lineup-slots {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.lineup-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.slot-label {
		font-family: var(--font-pixel);
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
	}

	.slot-filled {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.slot-remove-btn {
		padding: 0.35rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--color-secondary);
		color: white;
		border: none;
		transition: opacity 0.2s;
	}

	.slot-remove-btn:hover {
		opacity: 0.85;
	}

	/* Empty-slot placeholder: dashed outline card matching md PlayerCard footprint (w-48 h-64) */
	.slot-empty {
		width: 12rem;
		height: 16rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 0.75rem;
		border: 2px dashed var(--color-border);
		background-color: rgba(0, 0, 0, 0.2);
		color: var(--color-text-muted);
		text-align: center;
	}

	.slot-empty-add {
		cursor: pointer;
		transition: all 0.2s;
	}

	.slot-empty-add:hover {
		border-color: var(--color-primary);
		color: var(--color-text-primary);
		background-color: rgba(0, 0, 0, 0.3);
	}

	.slot-plus {
		font-family: var(--font-pixel);
		font-size: 2.5rem;
		line-height: 1;
		color: var(--color-primary);
	}

	.slot-empty-text {
		font-size: 0.8rem;
	}

	.slot-choosing {
		justify-content: flex-start;
		overflow-y: auto;
	}

	.slot-chooser-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 100%;
		margin: 0.5rem 0;
	}

	.slot-chooser-item {
		padding: 0.4rem 0.5rem;
		border-radius: 0.4rem;
		font-size: 0.8rem;
		cursor: pointer;
		background-color: var(--color-surface-hover, rgba(255, 255, 255, 0.05));
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
		transition: background-color 0.2s;
	}

	.slot-chooser-item:hover {
		background-color: var(--color-primary);
		color: white;
	}

	.slot-add-btn,
	.slot-cancel-btn {
		padding: 0.35rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		cursor: pointer;
		text-decoration: none;
		border: 1px solid var(--color-border);
		background-color: var(--color-surface);
		color: var(--color-text-secondary);
	}

	.slot-cancel-btn:hover,
	.slot-add-btn:hover {
		color: var(--color-text-primary);
	}
</style>
