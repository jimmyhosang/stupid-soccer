<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import type { Player } from '$lib/types/database';

	let { data } = $props();

	const player = data.player as Player & { ownerName: string };
	const provenance = data.provenance;
	const isOwner = data.isOwner;
	const canTrade = data.canTrade;

	let copied = $state(false);
	let shareError = $state<string | null>(null);

	function calculateOverall(p: Player) {
		return Math.round((p.pace + p.shooting + p.passing + p.defense + p.stamina) / 5);
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => copied = false, 2000);
		} catch {
			shareError = 'Failed to copy link';
			setTimeout(() => shareError = null, 2000);
		}
	}

	async function shareToTwitter() {
		const text = `Check out ${player.name} on Stupid Soccer! ${player.backstory?.slice(0, 80)}...`;
		const url = encodeURIComponent(window.location.href);
		window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`, '_blank');
	}

	function getRarityColor(rarity: string) {
		switch (rarity) {
			case 'legendary': return 'text-amber-400';
			case 'rare': return 'text-blue-400';
			default: return 'text-slate-400';
		}
	}

	function getRarityBg(rarity: string) {
		switch (rarity) {
			case 'legendary': return 'bg-amber-400 text-amber-900';
			case 'rare': return 'bg-blue-400 text-blue-900';
			default: return 'bg-slate-400 text-slate-900';
		}
	}
</script>

<svelte:head>
	<title>{player.name} - Stupid Soccer</title>
	<meta name="description" content={player.backstory || `Check out ${player.name} on Stupid Soccer!`} />
	<meta property="og:title" content="{player.name} - Stupid Soccer" />
	<meta property="og:description" content={player.backstory || `A ${player.rarity} player with ${calculateOverall(player)} overall rating.`} />
	<meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<!-- Back link -->
		<a href="/marketplace" class="inline-flex items-center gap-2 text-text-muted hover:text-text-primary mb-6">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Marketplace
		</a>

		<div class="grid md:grid-cols-2 gap-8">
			<!-- Player Card -->
			<div class="flex flex-col items-center">
				<div class="relative">
					{#if player.rarity === 'legendary'}
						<div class="absolute inset-0 bg-amber-400/20 blur-xl rounded-full"></div>
					{:else if player.rarity === 'rare'}
						<div class="absolute inset-0 bg-blue-400/20 blur-xl rounded-full"></div>
					{/if}
					<PlayerCard {player} size="lg" showStats={true} />
				</div>

				<!-- Share buttons -->
				<div class="flex gap-3 mt-6">
					<button onclick={copyLink} class="btn btn-secondary flex items-center gap-2">
						{#if copied}
							<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							Copied!
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
							Copy Link
						{/if}
					</button>
					<button onclick={shareToTwitter} class="btn btn-secondary flex items-center gap-2">
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
						</svg>
						Share
					</button>
				</div>

				{#if shareError}
					<p class="text-red-400 text-sm mt-2">{shareError}</p>
				{/if}
			</div>

			<!-- Player Details -->
			<div class="space-y-6">
				<!-- Header -->
				<div>
					<div class="flex items-center gap-3 mb-2">
						<h1 class="font-pixel text-2xl text-text-primary">{player.name}</h1>
						<span class="px-2 py-1 rounded text-xs font-bold uppercase {getRarityBg(player.rarity)}">
							{player.rarity}
						</span>
					</div>
					<p class="text-text-muted">
						Owned by <span class="text-primary">@{player.ownerName}</span>
					</p>
				</div>

				<!-- Stats -->
				<div class="card p-6">
					<div class="flex justify-between items-center mb-4">
						<h2 class="font-pixel text-sm text-text-secondary">STATS</h2>
						<div class="text-right">
							<span class="text-text-muted text-xs">OVERALL</span>
							<div class="font-pixel text-2xl {getRarityColor(player.rarity)}">{calculateOverall(player)}</div>
						</div>
					</div>
					<div class="space-y-3">
						{#each [
							{ label: 'PACE', value: player.pace },
							{ label: 'SHOOTING', value: player.shooting },
							{ label: 'PASSING', value: player.passing },
							{ label: 'DEFENSE', value: player.defense },
							{ label: 'STAMINA', value: player.stamina }
						] as stat}
							<div class="flex justify-between items-center">
								<span class="text-text-muted text-xs">{stat.label}</span>
								<div class="flex items-center gap-2">
									<div class="w-32 h-2 bg-surface rounded-full overflow-hidden">
										<div class="h-full bg-primary" style="width: {stat.value}%"></div>
									</div>
									<span class="text-text-primary text-sm w-8 text-right">{stat.value}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Backstory -->
				<div class="card p-6">
					<h2 class="font-pixel text-sm text-text-secondary mb-3">BACKSTORY</h2>
					<p class="text-text-primary">{player.backstory}</p>
				</div>

				<!-- Personality & Celebration -->
				<div class="grid grid-cols-2 gap-4">
					<div class="card p-4">
						<h3 class="font-pixel text-xs text-text-muted mb-2">PERSONALITY</h3>
						<div class="flex flex-wrap gap-2">
							{#each player.personality as trait}
								<span class="px-2 py-1 bg-primary/20 text-primary rounded text-sm">{trait}</span>
							{/each}
						</div>
					</div>
					<div class="card p-4">
						<h3 class="font-pixel text-xs text-text-muted mb-2">CELEBRATION</h3>
						<p class="text-text-secondary text-sm italic">"{player.celebration}"</p>
					</div>
				</div>

				<!-- Provenance -->
				{#if provenance.length > 0}
					<div class="card p-6">
						<h2 class="font-pixel text-sm text-text-secondary mb-3">OWNERSHIP HISTORY</h2>
						<div class="space-y-3">
							{#each provenance as entry, i}
								<div class="flex items-center gap-3">
									<div class="w-2 h-2 rounded-full {entry.type === 'created' ? 'bg-secondary' : 'bg-primary'}"></div>
									<div class="flex-1">
										<span class="text-text-secondary text-sm">
											{entry.type === 'created' ? 'Created by' : 'Traded to'}
											<span class="text-text-primary font-medium">@{entry.to}</span>
											{#if entry.coins > 0}
												<span class="text-accent"> for {entry.coins} coins</span>
											{/if}
										</span>
									</div>
									<span class="text-text-muted text-xs">{entry.date}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex gap-4">
					{#if isOwner}
						<a href="/squad" class="flex-1 btn btn-primary text-center">
							Manage in Squad
						</a>
					{:else if canTrade}
						<a href="/marketplace" class="flex-1 btn btn-primary text-center">
							{#if player.is_listed}
								Buy for {player.list_price} coins
							{:else}
								Make Trade Offer
							{/if}
						</a>
					{:else if !data.currentUserId}
						<a href="/login?redirect=/player/{player.id}" class="flex-1 btn btn-primary text-center">
							Sign in to Trade
						</a>
					{:else}
						<span class="flex-1 btn btn-secondary text-center opacity-50 cursor-not-allowed">
							Not Available for Trade
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>
</main>

<style>
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
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border: none;
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
</style>
