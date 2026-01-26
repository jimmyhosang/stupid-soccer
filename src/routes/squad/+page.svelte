<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import ListForTradeModal from '$lib/components/ListForTradeModal.svelte';
	import type { Player } from '$lib/types/database';
	import { onMount } from 'svelte';
	import { getCoins, formatCoins } from '$lib/stores/coins';

	// Demo players (will be merged with scouted players from localStorage)
	const demoPlayers: Player[] = [
		{
			id: '1',
			owner_id: 'demo',
			name: 'Thunderfoot McSplash',
			generation_prompt: 'A chaotic striker',
			backstory: 'Once scored a goal so powerful it knocked out the goalkeeper.',
			personality: ['chaotic', 'loud'],
			celebration: 'Does a backflip but always lands on his face',
			sprite_config: { hair: 'mohawk', skin: 'tan', face: 'determined', accessories: ['headband'] },
			pace: 88,
			shooting: 92,
			passing: 45,
			defense: 23,
			stamina: 76,
			rarity: 'legendary',
			is_listed: false,
			is_starter: true,
			created_at: new Date().toISOString()
		},
		{
			id: '2',
			owner_id: 'demo',
			name: "Whiskers O'Dribble",
			generation_prompt: 'A mysterious winger',
			backstory: 'Claims to have trained with actual cats.',
			personality: ['mysterious', 'agile'],
			celebration: 'Pretends to clean his face like a cat',
			sprite_config: { hair: 'curly', skin: 'light', face: 'smirk', accessories: [] },
			pace: 95,
			shooting: 67,
			passing: 78,
			defense: 34,
			stamina: 89,
			rarity: 'rare',
			is_listed: false,
			is_starter: true,
			created_at: new Date().toISOString()
		},
		{
			id: '3',
			owner_id: 'demo',
			name: 'Brick Wallson',
			generation_prompt: 'An immovable defender',
			backstory: 'Was literally a brick wall in a past life.',
			personality: ['stoic', 'immovable'],
			celebration: 'Stands completely still for 30 seconds',
			sprite_config: { hair: 'bald', skin: 'dark', face: 'stern', accessories: [] },
			pace: 34,
			shooting: 28,
			passing: 56,
			defense: 99,
			stamina: 94,
			rarity: 'rare',
			is_listed: false,
			is_starter: true,
			created_at: new Date().toISOString()
		},
		{
			id: '4',
			owner_id: 'demo',
			name: 'Noodle Arms McGee',
			generation_prompt: 'A floppy goalkeeper',
			backstory: 'Has the longest arms in football history. Nobody knows why.',
			personality: ['flexible', 'unpredictable'],
			celebration: 'Waves arms like noodles',
			sprite_config: { hair: 'short', skin: 'pale', face: 'goofy', accessories: ['glasses'] },
			pace: 45,
			shooting: 12,
			passing: 67,
			defense: 78,
			stamina: 82,
			rarity: 'common',
			is_listed: false,
			is_starter: false,
			created_at: new Date().toISOString()
		},
		{
			id: '5',
			owner_id: 'demo',
			name: 'Captain Obvious',
			generation_prompt: 'A midfielder who states the obvious',
			backstory: 'Once announced "The ball is round" and the crowd went wild.',
			personality: ['literal', 'helpful'],
			celebration: 'Points at the scoreboard',
			sprite_config: { hair: 'short', skin: 'medium', face: 'happy', accessories: ['bandana'] },
			pace: 72,
			shooting: 65,
			passing: 88,
			defense: 55,
			stamina: 77,
			rarity: 'common',
			is_listed: false,
			is_starter: false,
			created_at: new Date().toISOString()
		}
	];

	// Merge demo players with scouted players from localStorage
	let myPlayers = $state<Player[]>([...demoPlayers]);
	let coinBalance = $state(0);

	onMount(() => {
		// Load coin balance
		coinBalance = getCoins();

		// Load scouted players from localStorage
		const stored = localStorage.getItem('stupidsoccer_players');
		if (stored) {
			try {
				const scoutedPlayers: Player[] = JSON.parse(stored);
				// Add scouted players that aren't already in the list
				const existingIds = new Set(myPlayers.map(p => p.id));
				const newPlayers = scoutedPlayers.filter(p => !existingIds.has(p.id));
				myPlayers = [...myPlayers, ...newPlayers];
			} catch (e) {
				console.error('Failed to load scouted players:', e);
			}
		}
	});

	let selectedPlayer = $state<Player | null>(null);
	let activeTab = $state<'squad' | 'bench'>('squad');
	let showListModal = $state(false);
	let playerToList = $state<Player | null>(null);

	const starters = $derived(myPlayers.filter((p) => p.is_starter));
	const bench = $derived(myPlayers.filter((p) => !p.is_starter));

	function selectPlayer(player: Player) {
		selectedPlayer = selectedPlayer?.id === player.id ? null : player;
	}

	function toggleStarter(player: Player) {
		if (player.is_starter) {
			// Remove from starters
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

	function handleListPlayer(player: Player, price: number) {
		// Mark player as listed (demo - would be Supabase in production)
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

<main class="min-h-screen py-8 px-4">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
			<div>
				<h1 class="font-pixel text-2xl text-text-primary">MY SQUAD</h1>
				<p class="text-text-secondary mt-1">Manage your players and build the ultimate team</p>
			</div>
			<div class="flex gap-4">
				<a href="/scout" class="btn btn-secondary">
					+ Scout New Player
				</a>
				<a href="/play" class="btn btn-primary">
					Play Match
				</a>
			</div>
		</div>

		<!-- Team Stats -->
		<div class="card card-static p-6 mb-8">
			<div class="flex flex-wrap justify-between items-center gap-4">
				<div>
					<span class="text-text-muted text-sm">TEAM OVERALL</span>
					<div class="font-pixel text-3xl text-primary">{getTeamOverall()}</div>
				</div>
				<div>
					<span class="text-text-muted text-sm">STARTERS</span>
					<div class="font-pixel text-3xl {starters.length === 3 ? 'text-secondary' : 'text-accent'}">{starters.length}/3</div>
				</div>
				<div>
					<span class="text-text-muted text-sm">TOTAL PLAYERS</span>
					<div class="font-pixel text-3xl text-text-primary">{myPlayers.length}</div>
				</div>
				<div>
					<span class="text-text-muted text-sm">COINS</span>
					<div class="font-pixel text-3xl text-accent">{formatCoins(coinBalance)}</div>
				</div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="flex gap-2 mb-6">
			<button
				onclick={() => activeTab = 'squad'}
				class="px-6 py-3 rounded-lg font-pixel text-sm transition-all
					{activeTab === 'squad'
						? 'bg-primary text-white'
						: 'bg-surface text-text-secondary hover:text-text-primary'}"
			>
				STARTERS ({starters.length})
			</button>
			<button
				onclick={() => activeTab = 'bench'}
				class="px-6 py-3 rounded-lg font-pixel text-sm transition-all
					{activeTab === 'bench'
						? 'bg-primary text-white'
						: 'bg-surface text-text-secondary hover:text-text-primary'}"
			>
				BENCH ({bench.length})
			</button>
		</div>

		<div class="grid lg:grid-cols-3 gap-8">
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
								<button class="w-full btn btn-secondary">
									List for Trade
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
