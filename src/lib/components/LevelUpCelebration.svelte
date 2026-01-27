<script lang="ts">
	import { onMount } from 'svelte';
	import { getLevelTier, getLevelTierColor } from '$lib/xp';

	interface StatIncrease {
		pace: number;
		shooting: number;
		passing: number;
		defense: number;
		stamina: number;
	}

	interface Props {
		playerName: string;
		oldLevel: number;
		newLevel: number;
		statIncreases: StatIncrease;
		onClose: () => void;
	}

	let { playerName, oldLevel, newLevel, statIncreases, onClose }: Props = $props();

	let visible = $state(false);
	let showStats = $state(false);

	const newTier = getLevelTier(newLevel);
	const tierColor = getLevelTierColor(newLevel);

	// Count total stat increases
	const totalStatGain = Object.values(statIncreases).reduce((a, b) => a + b, 0);

	onMount(() => {
		// Animate in
		setTimeout(() => (visible = true), 50);
		setTimeout(() => (showStats = true), 600);

		// Auto-close after 5 seconds
		const timer = setTimeout(() => {
			visible = false;
			setTimeout(onClose, 300);
		}, 5000);

		return () => clearTimeout(timer);
	});

	function handleClose() {
		visible = false;
		setTimeout(onClose, 300);
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-300"
	class:opacity-0={!visible}
	class:opacity-100={visible}
	onclick={handleClose}
	onkeydown={(e) => e.key === 'Escape' && handleClose()}
	role="button"
	tabindex="0"
>
	<!-- Card -->
	<div
		class="relative w-80 bg-gradient-to-b from-surface to-background border-2 border-primary rounded-xl p-6 text-center transform transition-all duration-500"
		class:scale-0={!visible}
		class:scale-100={visible}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
		role="dialog"
		aria-modal="true"
		tabindex="0"
	>
		<!-- Confetti effect -->
		<div class="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
			{#each Array(20) as _, i}
				<div
					class="absolute w-2 h-2 animate-confetti"
					style="
						left: {Math.random() * 100}%;
						animation-delay: {Math.random() * 0.5}s;
						background: {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'][i % 5]};
					"
				></div>
			{/each}
		</div>

		<!-- Level Up Banner -->
		<div class="relative mb-4">
			<div class="text-xs uppercase tracking-widest text-text-muted mb-1">Level Up!</div>
			<div class="font-pixel text-4xl text-primary animate-bounce-once">
				{oldLevel} → {newLevel}
			</div>
		</div>

		<!-- Player Name -->
		<div class="mb-4">
			<div class="font-pixel text-lg text-white truncate">{playerName}</div>
			<div class="text-sm {tierColor} font-semibold">{newTier}</div>
		</div>

		<!-- Stat Increases -->
		{#if showStats}
			<div class="bg-black/30 rounded-lg p-4 mb-4 transition-opacity duration-500"
				class:opacity-0={!showStats}
				class:opacity-100={showStats}
			>
				<div class="text-xs text-text-muted uppercase mb-2">Stat Gains</div>
				<div class="grid grid-cols-5 gap-2 text-center">
					{#if statIncreases.pace > 0}
						<div class="animate-stat-pop" style="animation-delay: 0ms">
							<div class="text-lg text-green-400">+{statIncreases.pace}</div>
							<div class="text-[10px] text-text-muted">PAC</div>
						</div>
					{/if}
					{#if statIncreases.shooting > 0}
						<div class="animate-stat-pop" style="animation-delay: 100ms">
							<div class="text-lg text-green-400">+{statIncreases.shooting}</div>
							<div class="text-[10px] text-text-muted">SHO</div>
						</div>
					{/if}
					{#if statIncreases.passing > 0}
						<div class="animate-stat-pop" style="animation-delay: 200ms">
							<div class="text-lg text-green-400">+{statIncreases.passing}</div>
							<div class="text-[10px] text-text-muted">PAS</div>
						</div>
					{/if}
					{#if statIncreases.defense > 0}
						<div class="animate-stat-pop" style="animation-delay: 300ms">
							<div class="text-lg text-green-400">+{statIncreases.defense}</div>
							<div class="text-[10px] text-text-muted">DEF</div>
						</div>
					{/if}
					{#if statIncreases.stamina > 0}
						<div class="animate-stat-pop" style="animation-delay: 400ms">
							<div class="text-lg text-green-400">+{statIncreases.stamina}</div>
							<div class="text-[10px] text-text-muted">STA</div>
						</div>
					{/if}
				</div>
				{#if totalStatGain > 0}
					<div class="mt-3 text-sm text-accent">
						+{totalStatGain} total stat points
					</div>
				{/if}
			</div>
		{/if}

		<!-- Close Button -->
		<button
			class="btn btn-primary w-full"
			onclick={handleClose}
		>
			Awesome!
		</button>

		<!-- Tap to close hint -->
		<div class="text-[10px] text-text-muted mt-2">Tap anywhere to close</div>
	</div>
</div>

<style>
	@keyframes confetti {
		0% {
			transform: translateY(-10px) rotate(0deg);
			opacity: 1;
		}
		100% {
			transform: translateY(300px) rotate(720deg);
			opacity: 0;
		}
	}

	@keyframes bounce-once {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.2);
		}
	}

	@keyframes stat-pop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-confetti {
		animation: confetti 2s ease-out forwards;
	}

	.animate-bounce-once {
		animation: bounce-once 0.5s ease-out;
	}

	.animate-stat-pop {
		animation: stat-pop 0.3s ease-out forwards;
		opacity: 0;
	}
</style>
