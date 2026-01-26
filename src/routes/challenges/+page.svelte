<script lang="ts">
	import { onMount } from 'svelte';
	import { playCoinSound } from '$lib/game/audio/SoundEffects';

	interface Challenge {
		id: string;
		challengeId: string;
		title: string;
		description: string;
		type: string;
		targetCount: number;
		progress: number;
		isCompleted: boolean;
		isClaimed: boolean;
		coinReward: number;
	}

	let challenges = $state<Challenge[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let claiming = $state<string | null>(null);

	onMount(async () => {
		await loadChallenges();
	});

	async function loadChallenges() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/challenges');
			if (!response.ok) {
				if (response.status === 401) {
					error = 'Please sign in to see your daily challenges';
				} else {
					throw new Error('Failed to load challenges');
				}
				return;
			}

			const data = await response.json();
			challenges = data.challenges;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	async function claimReward(challenge: Challenge) {
		if (claiming || !challenge.isCompleted || challenge.isClaimed) return;

		claiming = challenge.id;

		try {
			const response = await fetch('/api/challenges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assignmentId: challenge.id })
			});

			if (!response.ok) {
				throw new Error('Failed to claim reward');
			}

			const data = await response.json();

			// Update local state
			challenges = challenges.map(c =>
				c.id === challenge.id ? { ...c, isClaimed: true } : c
			);

			// Play coin sound
			playCoinSound();

		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to claim reward';
		} finally {
			claiming = null;
		}
	}

	function getProgressPercent(challenge: Challenge) {
		return Math.min(100, (challenge.progress / challenge.targetCount) * 100);
	}

	function getChallengeIcon(type: string) {
		switch (type) {
			case 'win_matches': return '🏆';
			case 'score_goals': return '⚽';
			case 'win_streak': return '🔥';
			case 'play_difficulty': return '💪';
			case 'use_scout': return '🔍';
			default: return '🎯';
		}
	}

	// Calculate time until reset (midnight UTC)
	function getTimeUntilReset() {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		tomorrow.setUTCHours(0, 0, 0, 0);
		const diff = tomorrow.getTime() - now.getTime();

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		return `${hours}h ${minutes}m`;
	}

	let timeUntilReset = $state(getTimeUntilReset());

	// Update countdown every minute
	onMount(() => {
		const interval = setInterval(() => {
			timeUntilReset = getTimeUntilReset();
		}, 60000);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Daily Challenges - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen py-8 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="font-pixel text-2xl text-text-primary mb-2">
				<span class="text-accent">DAILY</span> CHALLENGES
			</h1>
			<p class="text-text-secondary">Complete challenges to earn bonus coins!</p>
			<div class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-full">
				<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-text-muted text-sm">Resets in <span class="text-primary font-medium">{timeUntilReset}</span></span>
			</div>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
			</div>
		{:else if error}
			<div class="card p-8 text-center">
				<p class="text-text-muted mb-4">{error}</p>
				{#if error.includes('sign in')}
					<a href="/login?redirect=/challenges" class="btn btn-primary">Sign In</a>
				{:else}
					<button onclick={loadChallenges} class="btn btn-secondary">Try Again</button>
				{/if}
			</div>
		{:else if challenges.length === 0}
			<div class="card p-8 text-center">
				<p class="text-text-muted">No challenges available today.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each challenges as challenge}
					<div class="card p-6 {challenge.isCompleted ? 'border-secondary/50' : ''} transition-all">
						<div class="flex items-start gap-4">
							<!-- Icon -->
							<div class="text-3xl flex-shrink-0">
								{getChallengeIcon(challenge.type)}
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-pixel text-sm text-text-primary">{challenge.title}</h3>
									{#if challenge.isCompleted}
										<span class="px-2 py-0.5 bg-secondary/20 text-secondary text-xs rounded-full font-medium">
											COMPLETE
										</span>
									{/if}
								</div>
								<p class="text-text-secondary text-sm mb-3">{challenge.description}</p>

								<!-- Progress bar -->
								<div class="flex items-center gap-3">
									<div class="flex-1 h-2 bg-surface rounded-full overflow-hidden">
										<div
											class="h-full transition-all duration-500 {challenge.isCompleted ? 'bg-secondary' : 'bg-primary'}"
											style="width: {getProgressPercent(challenge)}%"
										></div>
									</div>
									<span class="text-text-muted text-xs font-mono w-16 text-right">
										{challenge.progress}/{challenge.targetCount}
									</span>
								</div>
							</div>

							<!-- Reward / Claim -->
							<div class="flex-shrink-0 text-right">
								{#if challenge.isClaimed}
									<div class="text-secondary">
										<svg class="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
										</svg>
										<span class="text-xs">Claimed</span>
									</div>
								{:else if challenge.isCompleted}
									<button
										onclick={() => claimReward(challenge)}
										disabled={claiming === challenge.id}
										class="btn btn-primary text-sm px-4 py-2 animate-pulse"
									>
										{#if claiming === challenge.id}
											<span class="animate-spin">⏳</span>
										{:else}
											Claim +{challenge.coinReward}
										{/if}
									</button>
								{:else}
									<div class="text-accent">
										<span class="font-pixel text-lg">+{challenge.coinReward}</span>
										<span class="text-xs text-text-muted block">coins</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Play CTA -->
			<div class="mt-8 text-center">
				<a href="/play" class="btn btn-primary inline-flex items-center gap-2">
					<span>Play Match</span>
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

	.btn-primary:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.7;
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
</style>
