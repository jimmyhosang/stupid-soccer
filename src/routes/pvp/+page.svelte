<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let joining = $state(false);
	let joinError = $state<string | null>(null);

	// Reactive values from data
	let league = $derived(data.league);
	let userEntry = $derived(data.userEntry);
	let standings = $derived(data.standings);
	let recentMatches = $derived(data.recentMatches);
	let hasValidSquad = $derived(data.hasValidSquad);

	async function joinLeague() {
		if (joining) return;
		joining = true;
		joinError = null;

		try {
			const response = await fetch('/api/pvp/join', { method: 'POST' });
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to join league');
			}

			// Reload page to get updated data
			window.location.reload();
		} catch (e) {
			joinError = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			joining = false;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function getTimeRemaining(endDate: string) {
		const end = new Date(endDate);
		const now = new Date();
		const diff = end.getTime() - now.getTime();

		if (diff <= 0) return 'Ended';

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (days > 0) return `${days}d ${hours}h remaining`;
		return `${hours}h remaining`;
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
		return `#${rank}`;
	}

	function getMatchResult(match: any, userEntryId: string) {
		const isPlayer1 = match.player1_entry_id === userEntryId;
		const myScore = isPlayer1 ? match.player1_score : match.player2_score;
		const theirScore = isPlayer1 ? match.player2_score : match.player1_score;
		const opponent = isPlayer1 ? match.player2 : match.player1;

		let result: 'win' | 'loss' | 'draw';
		if (myScore > theirScore) result = 'win';
		else if (myScore < theirScore) result = 'loss';
		else result = 'draw';

		return { myScore, theirScore, opponent, result };
	}
</script>

<svelte:head>
	<title>PvP Leagues - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="font-pixel text-2xl text-text-primary mb-2">
				<span class="text-secondary">PVP</span> LEAGUES
			</h1>
			<p class="text-text-secondary">Compete against other managers</p>
		</div>

		{#if league}
			<!-- League Info -->
			<div class="card p-6 mb-6 bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/30">
				<div class="flex items-center justify-between flex-wrap gap-4">
					<div>
						<span class="text-text-muted text-sm">CURRENT SEASON</span>
						<div class="font-pixel text-3xl text-secondary">Season {league.season_number}</div>
					</div>
					<div class="text-right">
						<span class="text-text-muted text-sm">ENDS</span>
						<div class="text-text-primary">{formatDate(league.ends_at)}</div>
						<div class="text-accent text-sm">{getTimeRemaining(league.ends_at)}</div>
					</div>
				</div>
			</div>

			{#if userEntry}
				<!-- User's Entry Card -->
				<div class="card p-6 mb-8 bg-primary/10 border-primary/30">
					<div class="flex items-center justify-between flex-wrap gap-4">
						<div>
							<span class="text-text-muted text-sm">YOUR RANK</span>
							<div class="font-pixel text-3xl text-primary">
								{userEntry.rank ? getRankIcon(userEntry.rank) : 'Unranked'}
							</div>
						</div>
						<div class="flex gap-6 text-center">
							<div>
								<div class="font-pixel text-2xl text-secondary">{userEntry.wins}</div>
								<div class="text-text-muted text-xs">WINS</div>
							</div>
							<div>
								<div class="font-pixel text-2xl text-text-primary">{userEntry.draws}</div>
								<div class="text-text-muted text-xs">DRAWS</div>
							</div>
							<div>
								<div class="font-pixel text-2xl text-red-400">{userEntry.losses}</div>
								<div class="text-text-muted text-xs">LOSSES</div>
							</div>
							<div>
								<div class="font-pixel text-2xl text-accent">{userEntry.points}</div>
								<div class="text-text-muted text-xs">POINTS</div>
							</div>
						</div>
					</div>

					<!-- Squad Power -->
					{#if userEntry.squad_snapshot?.totalPower}
						<div class="mt-4 pt-4 border-t border-border/50">
							<div class="flex items-center gap-2">
								<span class="text-text-muted text-sm">Squad Power:</span>
								<span class="font-pixel text-primary">
									{Math.round(userEntry.squad_snapshot.totalPower)}
								</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Recent Matches -->
				{#if recentMatches.length > 0}
					<div class="mb-8">
						<h2 class="font-pixel text-lg text-text-primary mb-4">Recent Matches</h2>
						<div class="space-y-3">
							{#each recentMatches as match}
								{@const { myScore, theirScore, opponent, result } = getMatchResult(
									match,
									userEntry.id
								)}
								<div
									class="card p-4 flex items-center justify-between
									{result === 'win'
										? 'border-secondary/30 bg-secondary/5'
										: result === 'loss'
											? 'border-red-400/30 bg-red-400/5'
											: 'border-border'}"
								>
									<div class="flex items-center gap-3">
										<span
											class="font-pixel text-sm px-2 py-1 rounded
											{result === 'win'
												? 'bg-secondary/20 text-secondary'
												: result === 'loss'
													? 'bg-red-400/20 text-red-400'
													: 'bg-text-muted/20 text-text-muted'}"
										>
											{result.toUpperCase()}
										</span>
										<span class="text-text-secondary">
											vs @{(opponent?.profiles as any)?.username || 'Unknown'}
										</span>
									</div>
									<div class="font-pixel text-lg">
										<span class="text-primary">{myScore}</span>
										<span class="text-text-muted mx-1">-</span>
										<span class="text-text-secondary">{theirScore}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="card p-6 mb-8 text-center">
						<p class="text-text-muted">No matches simulated yet.</p>
						<p class="text-text-secondary text-sm mt-2">
							Matches are simulated daily. Check back tomorrow!
						</p>
					</div>
				{/if}
			{:else}
				<!-- Join League CTA -->
				<div class="card p-8 mb-8 text-center">
					<h2 class="font-pixel text-xl text-text-primary mb-4">Join the Battle!</h2>
					<p class="text-text-secondary mb-6">
						Enter with your current squad and compete against other managers. Matches are simulated
						daily based on your players' stats.
					</p>

					{#if hasValidSquad}
						{#if joinError}
							<div class="text-red-400 text-sm mb-4">{joinError}</div>
						{/if}
						<button onclick={joinLeague} disabled={joining} class="btn btn-primary text-lg px-8">
							{#if joining}
								<span class="flex items-center gap-2">
									<span
										class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"
									></span>
									Joining...
								</span>
							{:else}
								Join Season {league.season_number}
							{/if}
						</button>
					{:else}
						<p class="text-amber-400 text-sm mb-4">You need 3 players in your squad to join PvP</p>
						<a href="/squad" class="btn btn-secondary">Build Your Squad</a>
					{/if}

					<!-- Rewards Info -->
					<div class="mt-8 pt-6 border-t border-border">
						<h3 class="font-pixel text-sm text-text-muted mb-4">WEEKLY REWARDS</h3>
						<div class="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
							<div class="text-center">
								<div class="text-amber-400 font-pixel">🥇 1st</div>
								<div class="text-accent">500 coins</div>
							</div>
							<div class="text-center">
								<div class="text-slate-300 font-pixel">🥈 2nd</div>
								<div class="text-accent">300 coins</div>
							</div>
							<div class="text-center">
								<div class="text-amber-600 font-pixel">🥉 3rd</div>
								<div class="text-accent">200 coins</div>
							</div>
							<div class="text-center">
								<div class="text-text-secondary font-pixel">Top 10</div>
								<div class="text-accent">100 coins</div>
							</div>
							<div class="text-center">
								<div class="text-text-muted font-pixel">Top 50</div>
								<div class="text-accent">50 coins</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- League Standings -->
			{#if standings.length > 0}
				<div>
					<h2 class="font-pixel text-lg text-text-primary mb-4">Season Standings</h2>
					<div class="card overflow-hidden">
						<table class="w-full">
							<thead>
								<tr class="bg-surface border-b border-border">
									<th class="px-4 py-3 text-left text-xs font-pixel text-text-muted w-16">RANK</th>
									<th class="px-4 py-3 text-left text-xs font-pixel text-text-muted">MANAGER</th>
									<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-16">W</th>
									<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-16">D</th>
									<th class="px-4 py-3 text-center text-xs font-pixel text-text-muted w-16">L</th>
									<th class="px-4 py-3 text-right text-xs font-pixel text-text-muted w-20">PTS</th>
								</tr>
							</thead>
							<tbody>
								{#each standings as entry, i}
									{@const rank = entry.rank || i + 1}
									<tr
										class="border-b border-border/50 hover:bg-surface/50 transition-colors
										{entry.user_id === data.userEntry?.user_id ? 'bg-primary/10' : i < 3 ? 'bg-surface/30' : ''}"
									>
										<td class="px-4 py-4">
											<span class="font-pixel text-lg {getRankStyle(rank)}">
												{getRankIcon(rank)}
											</span>
										</td>
										<td class="px-4 py-4">
											<span class="text-text-primary font-medium">
												@{(entry.profiles as any)?.username || 'Unknown'}
											</span>
											{#if entry.user_id === data.userEntry?.user_id}
												<span class="text-primary text-xs ml-2">(You)</span>
											{/if}
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
											<span class="font-pixel text-accent">{entry.points}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else if userEntry}
				<div class="card p-6 text-center">
					<p class="text-text-muted">You're the first to join this season!</p>
					<p class="text-text-secondary text-sm mt-2">Invite friends to compete against you.</p>
				</div>
			{/if}
		{:else}
			<!-- No League Available -->
			<div class="card p-8 text-center">
				<p class="text-text-muted mb-4">No active league at the moment.</p>
				<p class="text-text-secondary text-sm">Check back soon for the next season!</p>
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

	.btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-secondary {
		background-color: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover:not(:disabled) {
		background-color: var(--color-surface-hover);
	}

	table {
		border-collapse: collapse;
	}
</style>
