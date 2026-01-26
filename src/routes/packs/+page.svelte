<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import type { Player } from '$lib/types/database';

	let { data } = $props();

	let loading = $state(false);
	let selectedPack = $state<string | null>(null);
	let revealedPlayers = $state<Player[]>([]);
	let showReveal = $state(false);
	let revealPackName = $state('');

	interface PackType {
		id: string;
		name: string;
		description: string;
		price: number;
		player_count: number;
		rarity_weights: { common: number; rare: number; legendary: number };
	}

	function getPackGradient(name: string): string {
		if (name.includes('Diamond')) return 'from-cyan-500 via-purple-500 to-pink-500';
		if (name.includes('Gold')) return 'from-yellow-400 via-amber-500 to-orange-500';
		if (name.includes('Silver')) return 'from-slate-300 via-slate-400 to-slate-500';
		return 'from-amber-600 via-amber-700 to-amber-800'; // Bronze
	}

	function getPackEmoji(name: string): string {
		if (name.includes('Diamond')) return '💎';
		if (name.includes('Gold')) return '🥇';
		if (name.includes('Silver')) return '🥈';
		return '🥉';
	}

	function canAfford(price: number): boolean {
		return data.profile.coins >= price;
	}
</script>

<svelte:head>
	<title>Packs - Stupid Soccer</title>
</svelte:head>

<main class="packs-page">
	<div class="packs-container">
		<!-- Header -->
		<div class="packs-header">
			<div>
				<h1 class="packs-title">CARD PACKS</h1>
				<p class="packs-subtitle">Open packs to discover new players for your squad</p>
			</div>
			<div class="header-right">
				<div class="coins-display">
					<span class="coins-label">YOUR COINS</span>
					<span class="coins-value">{data.profile.coins.toLocaleString()}</span>
				</div>
			</div>
		</div>

		<!-- Pack Grid -->
		<div class="packs-grid">
			{#each data.packTypes as pack (pack.id)}
				<div class="pack-card">
					<div class="pack-visual bg-gradient-to-br {getPackGradient(pack.name)}">
						<span class="pack-emoji">{getPackEmoji(pack.name)}</span>
						<div class="pack-count">{pack.player_count} Player{pack.player_count > 1 ? 's' : ''}</div>
					</div>

					<div class="pack-info">
						<h3 class="pack-name">{pack.name}</h3>
						<p class="pack-description">{pack.description}</p>

						<div class="pack-odds">
							<span class="odds-label">Odds:</span>
							<div class="odds-list">
								<span class="odds-common">{pack.rarity_weights.common}% Common</span>
								<span class="odds-rare">{pack.rarity_weights.rare}% Rare</span>
								<span class="odds-legendary">{pack.rarity_weights.legendary}% Legendary</span>
							</div>
						</div>

						<form
							method="POST"
							action="?/buyPack"
							use:enhance={() => {
								loading = true;
								selectedPack = pack.id;
								return async ({ result }) => {
									loading = false;
									selectedPack = null;
									if (result.type === 'success' && result.data?.success) {
										revealedPlayers = result.data.players || [];
										revealPackName = result.data.packName || pack.name;
										showReveal = true;
										await invalidateAll();
									} else if (result.type === 'success' && result.data?.error) {
										alert(result.data.error);
									} else if (result.type === 'failure') {
										alert(result.data?.error || 'Failed to open pack');
									}
								};
							}}
						>
							<input type="hidden" name="packTypeId" value={pack.id} />
							<button
								type="submit"
								class="buy-btn {canAfford(pack.price) ? 'buy-btn-enabled' : 'buy-btn-disabled'}"
								disabled={!canAfford(pack.price) || loading}
							>
								{#if loading && selectedPack === pack.id}
									Opening...
								{:else}
									Buy for {pack.price} coins
								{/if}
							</button>
						</form>
					</div>
				</div>
			{/each}
		</div>

		<!-- Recent Purchases -->
		{#if data.recentPurchases.length > 0}
			<div class="recent-section">
				<h2 class="recent-title">RECENT PACKS</h2>
				<p class="recent-subtitle">You've opened {data.totalPurchases} pack{data.totalPurchases !== 1 ? 's' : ''} total</p>
				<div class="recent-list">
					{#each data.recentPurchases as purchase}
						<div class="recent-item">
							<span class="recent-pack-name">{purchase.pack_type?.name || 'Unknown Pack'}</span>
							<span class="recent-date">{new Date(purchase.opened_at).toLocaleDateString()}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Quick Links -->
		<div class="quick-links">
			<a href="/squad" class="link-btn">View My Squad</a>
			<a href="/scout" class="link-btn">AI Scout</a>
			<a href="/marketplace" class="link-btn">Marketplace</a>
		</div>
	</div>
</main>

<!-- Pack Reveal Modal -->
{#if showReveal}
	<div class="modal-overlay" onclick={() => showReveal = false}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h2 class="reveal-title">{revealPackName} Opened!</h2>
			<p class="reveal-subtitle">You received {revealedPlayers.length} player{revealedPlayers.length !== 1 ? 's' : ''}:</p>

			<div class="reveal-players">
				{#each revealedPlayers as player}
					<div class="reveal-player">
						<PlayerCard {player} size="sm" showStats={false} />
						<div class="reveal-player-info">
							<span class="reveal-player-name">{player.name}</span>
							<span class="reveal-player-rarity rarity-{player.rarity}">{player.rarity.toUpperCase()}</span>
						</div>
					</div>
				{/each}
			</div>

			<button onclick={() => showReveal = false} class="close-btn">
				Awesome!
			</button>
		</div>
	</div>
{/if}

<style>
	.packs-page {
		min-height: 100vh;
		padding: 2rem 1rem;
	}

	.packs-container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.packs-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (min-width: 768px) {
		.packs-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.packs-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
	}

	.packs-subtitle {
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

	.packs-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	@media (min-width: 640px) {
		.packs-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.packs-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.pack-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		overflow: hidden;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.pack-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.pack-visual {
		height: 10rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.pack-emoji {
		font-size: 4rem;
	}

	.pack-count {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: bold;
	}

	.pack-info {
		padding: 1rem;
	}

	.pack-name {
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
	}

	.pack-description {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-bottom: 1rem;
		line-height: 1.4;
	}

	.pack-odds {
		margin-bottom: 1rem;
	}

	.odds-label {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		display: block;
		margin-bottom: 0.25rem;
	}

	.odds-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		font-size: 0.7rem;
	}

	.odds-common {
		color: #9ca3af;
	}

	.odds-rare {
		color: #60a5fa;
	}

	.odds-legendary {
		color: #fbbf24;
	}

	.buy-btn {
		width: 100%;
		padding: 0.75rem;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
	}

	.buy-btn-enabled {
		background-color: var(--color-primary);
		color: white;
	}

	.buy-btn-enabled:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.buy-btn-disabled {
		background-color: var(--color-surface);
		color: var(--color-text-muted);
		cursor: not-allowed;
	}

	.recent-section {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.recent-title {
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: var(--color-text-primary);
	}

	.recent-subtitle {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.recent-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background-color: var(--color-background);
		border-radius: 0.25rem;
	}

	.recent-pack-name {
		color: var(--color-text-primary);
		font-size: 0.875rem;
	}

	.recent-date {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.quick-links {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	.link-btn {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		text-decoration: none;
		transition: all 0.2s;
	}

	.link-btn:hover {
		background-color: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
	}

	.modal-content {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		padding: 2rem;
		max-width: 32rem;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		text-align: center;
	}

	.reveal-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-primary);
		margin-bottom: 0.5rem;
	}

	.reveal-subtitle {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
	}

	.reveal-players {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.reveal-player {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background-color: var(--color-background);
		border-radius: 0.5rem;
	}

	.reveal-player-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.reveal-player-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.reveal-player-rarity {
		font-size: 0.75rem;
		font-weight: bold;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		margin-top: 0.25rem;
	}

	.rarity-common {
		background-color: #4b5563;
		color: white;
	}

	.rarity-rare {
		background-color: #3b82f6;
		color: white;
	}

	.rarity-legendary {
		background-color: #f59e0b;
		color: white;
	}

	.close-btn {
		padding: 0.75rem 2rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background-color: var(--color-primary-hover);
	}
</style>
