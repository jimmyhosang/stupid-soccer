<script lang="ts">
	// PvP League placeholder - to be implemented in US-017 through US-022
</script>

<svelte:head>
	<title>PvP Leagues - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen py-8 px-4">
	<div class="max-w-2xl mx-auto text-center">
		<!-- Header -->
		<h1 class="font-pixel text-2xl text-text-primary mb-4">
			<span class="text-primary">ASYNC</span> PVP LEAGUES
		</h1>
		<p class="text-text-secondary mb-8">
			Battle against other players' squads in weekly leagues!
		</p>

		<!-- Coming Soon Card -->
		<div class="card p-8">
			<div class="text-6xl mb-4">
				🏆
			</div>
			<h2 class="font-pixel text-lg text-accent mb-4">COMING SOON</h2>
			<p class="text-text-muted mb-6">
				Async PvP leagues are being built! Soon you'll be able to:
			</p>

			<ul class="text-left space-y-3 mb-8 max-w-md mx-auto">
				<li class="flex items-start gap-3">
					<span class="text-primary">►</span>
					<span class="text-text-secondary">Join weekly leagues with your squad</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-primary">►</span>
					<span class="text-text-secondary">Battle other players' AI-controlled teams</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-primary">►</span>
					<span class="text-text-secondary">Climb the rankings for coin rewards</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="text-primary">►</span>
					<span class="text-text-secondary">No real-time stress - play at your own pace!</span>
				</li>
			</ul>

			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/squad" class="btn btn-secondary">
					Prepare Your Squad
				</a>
				<a href="/play" class="btn btn-primary">
					Practice vs AI
				</a>
			</div>
		</div>

		<!-- Reward Tiers Preview -->
		<div class="mt-8 card p-6">
			<h3 class="font-pixel text-sm text-text-primary mb-4">WEEKLY REWARD TIERS</h3>
			<div class="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
				<div class="text-center">
					<div class="text-accent font-pixel">🥇 1ST</div>
					<div class="text-text-muted">500 coins</div>
				</div>
				<div class="text-center">
					<div class="text-text-secondary font-pixel">🥈 2ND</div>
					<div class="text-text-muted">300 coins</div>
				</div>
				<div class="text-center">
					<div class="text-text-secondary font-pixel">🥉 3RD</div>
					<div class="text-text-muted">200 coins</div>
				</div>
				<div class="text-center">
					<div class="text-text-muted font-pixel">TOP 10</div>
					<div class="text-text-muted">100 coins</div>
				</div>
				<div class="text-center">
					<div class="text-text-muted font-pixel">TOP 50</div>
					<div class="text-text-muted">50 coins</div>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	.card {
		background-color: var(--color-surface);
		border-radius: 0.75rem;
		border: 1px solid var(--color-border);
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
</style>
