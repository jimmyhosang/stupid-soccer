<script lang="ts">
	import { onMount } from 'svelte';

	interface LeaderboardEntry {
		rank: number;
		userId: string;
		username: string;
		wins: number;
		losses: number;
		draws: number;
		totalMatches: number;
		totalGoals: number;
		coinsEarned: number;
		winRate: number;
	}

	interface UserRank {
		rank: number;
		wins: number;
		totalMatches: number;
	}

	let leaderboard = $state<LeaderboardEntry[]>([]);
	let userRank = $state<UserRank | null>(null);
	let period = $state<'weekly' | 'monthly' | 'alltime'>('weekly');
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await loadLeaderboard();
	});

	async function loadLeaderboard() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/leaderboard?period=${period}`);
			if (!response.ok) {
				throw new Error('Failed to load leaderboard');
			}

			const data = await response.json();
			leaderboard = data.leaderboard;
			userRank = data.userRank;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	async function changePeriod(newPeriod: 'weekly' | 'monthly' | 'alltime') {
		if (period === newPeriod) return;
		period = newPeriod;
		await loadLeaderboard();
	}

	function getRankStyle(rank: number) {
		if (rank === 1) return 'text-amber-400';
		if (rank === 2) return 'text-slate-300';
		if (rank === 3) return 'text-amber-600';
		return 'text-text-muted';
	}

	function getRankIcon(rank: number) {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return '';
	}

	function getPeriodLabel(p: string) {
		switch (p) {
			case 'weekly': return 'This Week';
			case 'monthly': return 'This Month';
			case 'alltime': return 'All Time';
			default: return p;
		}
	}
</script>

<svelte:head>
	<title>Leaderboard - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="font-pixel text-2xl text-text-primary mb-2">
				<span class="text-secondary">LEADER</span>BOARD
			</h1>
			<p class="text-text-secondary">Top players ranked by wins</p>
		</div>

		<!-- Period Tabs -->
		<div class="flex justify-center gap-2 mb-8">
			{#each ['weekly', 'monthly', 'alltime'] as p}
				<button
					onclick={() => changePeriod(p as 'weekly' | 'monthly' | 'alltime')}
					class="px-6 py-3 rounded-lg font-pixel text-sm transition-all
						{period === p
							? 'bg-primary text-white'
							: 'bg-surface text-text-secondary hover:text-text-primary'}"
				>
					{getPeriodLabel(p).toUpperCase()}
				</button>
			{/each}
		</div>

		<!-- User's Rank Card -->
		{#if userRank}
			<div class="card p-6 mb-8 bg-primary/10 border-primary/30">
				<div class="flex items-center justify-between">
					<div>
						<span class="text-text-muted text-sm">YOUR RANK</span>
						<div class="font-pixel text-3xl text-primary">#{userRank.rank}</div>
					</div>
					<div class="text-right">
						<span class="text-text-muted text-sm">{getPeriodLabel(period)}</span>
						<div class="text-text-primary">
							<span class="font-pixel text-xl">{userRank.wins}</span>
							<span class="text-text-muted"> wins</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
			</div>
		{:else if error}
			<div class="card p-8 text-center">
				<p class="text-text-muted mb-4">{error}</p>
				<button onclick={loadLeaderboard} class="btn btn-secondary">Try Again</button>
			</div>
		{:else if leaderboard.length === 0}
			<div class="card p-8 text-center">
				<p class="text-text-muted mb-4">No matches played yet this period.</p>
				<p class="text-text-secondary text-sm mb-6">Be the first to claim the top spot!</p>
				<a href="/play" class="btn btn-primary">Play Now</a>
			</div>
		{:else}
			<!-- Leaderboard Table -->
			<div class="card overflow-hidden">
				<table class="w-full">
					<thead>
						<tr class="bg-surface border-b border-border">
							<th class="px-4 py-3 text-left text-xs font-pixel text-text-muted w-16">RANK</th>
							<th class="px-4 py-3 text-left text-xs font-pixel text-text-muted">PLAYER</th>
							<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-20">W</th>
							<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-20">D</th>
							<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-20">L</th>
							<th class="px-4 py-3 text-right text-xs font-pixel text-text-muted w-24">GOALS</th>
							<th class="px-4 py-3 text-right text-xs font-pixel text-text-muted w-24">WIN %</th>
						</tr>
					</thead>
					<tbody>
						{#each leaderboard as entry, i}
							<tr class="border-b border-border/50 hover:bg-surface/50 transition-colors {i < 3 ? 'bg-surface/30' : ''}">
								<td class="px-4 py-4">
									<span class="font-pixel text-lg {getRankStyle(entry.rank)}">
										{getRankIcon(entry.rank) || `#${entry.rank}`}
									</span>
								</td>
								<td class="px-4 py-4">
									<span class="text-text-primary font-medium">@{entry.username}</span>
								</td>
								<td class="px-4 py-4 text-center">
									<span class="text-secondary font-medium">{entry.wins}</span>
								</td>
								<td class="px-4 py-4 text-center">
									<span class="text-text-muted">{entry.draws}</span>
								</td>
								<td class="px-4 py-4 text-center">
									<span class="text-red-400">{entry.losses}</span>
								</td>
								<td class="px-4 py-4 text-right">
									<span class="text-accent">{entry.totalGoals}</span>
								</td>
								<td class="px-4 py-4 text-right">
									<span class="text-text-secondary">{entry.winRate}%</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Play CTA -->
			<div class="mt-8 text-center">
				<a href="/play" class="btn btn-primary inline-flex items-center gap-2">
					<span>Climb the Ranks</span>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
					</svg>
				</a>
			</div>
		{/if}
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

	table {
		border-collapse: collapse;
	}
</style>
