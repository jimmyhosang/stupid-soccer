<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { getCoins, addCoins, calculateMatchReward, formatCoins, COIN_REWARDS } from '$lib/stores/coins';
	import { playCoinSound, resumeAudio } from '$lib/game/audio/SoundEffects';
	import { supabase } from '$lib/stores/auth.svelte';
	import TouchControls from '$lib/components/TouchControls.svelte';

	type GameModule = typeof import('$lib/game');
	type PhaserGame = import('phaser').Game;

	let gameContainer: HTMLDivElement | null = $state(null);
	let game: PhaserGame | null = null;
	let gameModule: GameModule | null = null;

	let playerScore = $state(0);
	let aiScore = $state(0);
	let gameTime = $state(180); // 3 minutes
	let gameStarted = $state(false);
	let gameEnded = $state(false);
	let difficulty = $state<'easy' | 'medium' | 'hard'>('easy');
	let shouldStartGame = $state(false);
	let currentCoins = $state(0);
	let coinsEarned = $state(0);
	let coinsAwarded = $state(false);
	let isMobile = $state(false);
	let isLoggedIn = $state(false);

	// Format time as M:SS
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	// Detect mobile/touch device
	function detectMobile(): boolean {
		if (!browser) return false;
		return (
			'ontouchstart' in window ||
			navigator.maxTouchPoints > 0 ||
			window.matchMedia('(max-width: 768px)').matches
		);
	}

	// Handle touch input from TouchControls component
	function handleTouchInput(state: { left: boolean; right: boolean; up: boolean; down: boolean; kick: boolean; switch: boolean }) {
		if (game) {
			game.registry.set('touchInput', state);
		}
	}

	const difficultySettings = {
		easy: { label: 'EASY', description: 'For beginners', winCoins: COIN_REWARDS.easy.win },
		medium: { label: 'MEDIUM', description: 'A fair challenge', winCoins: COIN_REWARDS.medium.win },
		hard: { label: 'HARD', description: 'Prepare to suffer', winCoins: COIN_REWARDS.hard.win }
	};

	// Award coins via API (for logged in users) or localStorage (anonymous)
	async function awardCoins(userScore: number, aiScore: number) {
		if (isLoggedIn) {
			// Use API to record match and award coins
			try {
				const response = await fetch('/api/match', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						difficulty,
						userScore,
						aiScore
					})
				});

				if (response.ok) {
					const data = await response.json();
					coinsEarned = data.coinsEarned;
					currentCoins = data.newBalance;
				} else {
					// Fallback to local if API fails
					const reward = calculateMatchReward(difficulty, userScore, aiScore);
					coinsEarned = reward.amount;
					currentCoins = addCoins(reward.amount);
				}
			} catch {
				// Fallback to local if API fails
				const reward = calculateMatchReward(difficulty, userScore, aiScore);
				coinsEarned = reward.amount;
				currentCoins = addCoins(reward.amount);
			}
		} else {
			// Anonymous user - use localStorage
			const reward = calculateMatchReward(difficulty, userScore, aiScore);
			coinsEarned = reward.amount;
			currentCoins = addCoins(reward.amount);
		}

		coinsAwarded = true;
		setTimeout(() => playCoinSound(), 300);
	}

	onMount(async () => {
		if (browser) {
			gameModule = await import('$lib/game');

			// Check if user is logged in and get their coins from Supabase
			if (supabase) {
				const { data: { session } } = await supabase.auth.getSession();
				if (session) {
					isLoggedIn = true;
					// Get coins from profile
					const { data: profile } = await supabase
						.from('profiles')
						.select('coins')
						.eq('id', session.user.id)
						.single();
					if (profile) {
						currentCoins = profile.coins;
					}
				} else {
					currentCoins = getCoins();
				}
			} else {
				currentCoins = getCoins();
			}

			isMobile = detectMobile();
		}
	});

	onDestroy(() => {
		if (game && gameModule) {
			gameModule.destroyGame(game);
		}
	});

	// Effect to start game once container is available
	$effect(() => {
		if (shouldStartGame && gameContainer && gameModule && !game) {
			game = gameModule.createGame({
				width: 800,
				height: 500,
				parent: gameContainer,
				difficulty: difficulty,
				onGoal: (scorer) => {
					if (scorer === 'player') playerScore++;
					else aiScore++;
				},
				onTimeUpdate: (time: number) => {
					gameTime = time;
				},
				onGameEnd: (result) => {
					gameEnded = true;
					playerScore = result.playerScore;
					aiScore = result.aiScore;

					// Award coins!
					if (!coinsAwarded) {
						resumeAudio();
						awardCoins(result.playerScore, result.aiScore);
					}
				}
			});
			shouldStartGame = false;
		}
	});

	async function startGame() {
		if (!gameModule) return;

		gameStarted = true;
		gameEnded = false;
		playerScore = 0;
		aiScore = 0;
		gameTime = 180; // Reset timer to 3 minutes
		coinsAwarded = false;
		coinsEarned = 0;

		// Wait for DOM to update, then trigger game creation
		await tick();
		shouldStartGame = true;
	}

	async function restartGame() {
		if (game && gameModule) {
			gameModule.destroyGame(game);
			game = null;
		}
		gameStarted = false;
		gameEnded = false;
		coinsAwarded = false;
		coinsEarned = 0;

		// Refresh balance from correct source
		if (isLoggedIn && supabase) {
			const { data: { session } } = await supabase.auth.getSession();
			if (session) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('coins')
					.eq('id', session.user.id)
					.single();
				if (profile) {
					currentCoins = profile.coins;
				}
			}
		} else {
			currentCoins = getCoins();
		}
	}

	function getResultMessage() {
		if (playerScore > aiScore) return 'YOU WIN!';
		if (playerScore < aiScore) return 'YOU LOSE!';
		return 'DRAW!';
	}

	function getResultType(): 'win' | 'draw' | 'loss' {
		if (playerScore > aiScore) return 'win';
		if (playerScore < aiScore) return 'loss';
		return 'draw';
	}
</script>

<svelte:head>
	<title>Play - Stupid Soccer</title>
</svelte:head>

<main class="play-page">
	<div class="play-container {gameStarted ? 'game-active' : ''}">
		{#if !gameStarted}
			<!-- Pre-game screen -->
			<header class="play-header">
				<div class="coin-display">
					<span class="coin-icon">🪙</span>
					<span class="coin-amount">{formatCoins(currentCoins)}</span>
				</div>
				<h1 class="play-title">
					<span class="title-accent">3v3</span> MATCH
				</h1>
				<p class="play-subtitle">Battle the AI in a 3-minute match. Win to earn coins!</p>
			</header>

			<!-- Difficulty selection -->
			<div class="difficulty-card">
				<h2 class="section-title">SELECT DIFFICULTY</h2>

				<div class="difficulty-options">
					{#each Object.entries(difficultySettings) as [key, settings]}
						<button
							onclick={() => difficulty = key as 'easy' | 'medium' | 'hard'}
							class="difficulty-btn {difficulty === key ? 'selected' : ''}"
						>
							<div class="difficulty-info">
								<span class="difficulty-label {difficulty === key ? 'active' : ''}">{settings.label}</span>
								<span class="difficulty-desc">{settings.description}</span>
							</div>
							<div class="difficulty-reward">
								<span class="coins-value">+{settings.winCoins}</span>
								<span class="coins-label">if you win</span>
							</div>
						</button>
					{/each}
				</div>

				<button onclick={startGame} class="start-btn">START MATCH</button>
			</div>

			<!-- Controls info -->
			<div class="controls-card">
				<h3 class="section-title">CONTROLS</h3>
				{#if isMobile}
					<div class="controls-list">
						<div class="control-row">
							<span class="touch-icon">⬆️⬇️⬅️➡️</span>
							<span class="control-desc">D-Pad to move</span>
						</div>
						<div class="control-row">
							<span class="touch-icon">🟣</span>
							<span class="control-desc">KICK button</span>
						</div>
						<div class="control-row">
							<span class="touch-icon">S</span>
							<span class="control-desc">Switch player</span>
						</div>
					</div>
				{:else}
					<div class="controls-list">
						<div class="control-row">
							<kbd class="key">↑ ↓ ← →</kbd>
							<span class="control-desc">Move</span>
						</div>
						<div class="control-row">
							<kbd class="key">Space</kbd>
							<span class="control-desc">Kick</span>
						</div>
						<div class="control-row">
							<kbd class="key">S</kbd>
							<span class="control-desc">Switch player</span>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Game screen with controls sidebar -->
			<div class="game-layout">
				<div class="game-main">
					<div class="game-score">
						<div class="score-side">
							<span class="score-label">YOU</span>
							<span class="score-value player">{playerScore}</span>
						</div>
						<div class="score-center">
							<span class="score-divider">-</span>
							<span class="game-timer">{formatTime(gameTime)}</span>
						</div>
						<div class="score-side">
							<span class="score-label">AI</span>
							<span class="score-value ai">{aiScore}</span>
						</div>
					</div>

					<!-- Game container with touch controls overlay -->
					<div class="game-wrapper">
						<div bind:this={gameContainer as HTMLDivElement} class="game-canvas"></div>

						<!-- Mobile touch controls -->
						{#if isMobile && !gameEnded}
							<TouchControls onInput={handleTouchInput} />
						{/if}
					</div>
				</div>

				<!-- Controls sidebar (hidden on mobile) -->
				<div class="controls-sidebar" class:hide-mobile={isMobile}>
					<h4 class="sidebar-title">CONTROLS</h4>
					<div class="sidebar-controls">
						<div class="sidebar-control">
							<kbd class="sidebar-key">↑↓←→</kbd>
							<span class="sidebar-label">Move</span>
						</div>
						<div class="sidebar-control">
							<kbd class="sidebar-key">Space</kbd>
							<span class="sidebar-label">Kick</span>
						</div>
						<div class="sidebar-control">
							<kbd class="sidebar-key">S</kbd>
							<span class="sidebar-label">Switch</span>
						</div>
					</div>
				</div>
			</div>

			{#if gameEnded}
				<!-- Game over overlay -->
				<div class="game-over-overlay">
					<div class="game-over-card">
						<h2 class="result-title {getResultType()}">
							{getResultMessage()}
						</h2>
						<p class="final-score">Final Score: {playerScore} - {aiScore}</p>
						<div class="coins-earned {getResultType()}">
							<span class="earned-value">+{coinsEarned}</span>
							<span class="earned-label">coins earned</span>
						</div>
						<div class="new-balance">
							<span class="balance-label">New Balance:</span>
							<span class="balance-value">{formatCoins(currentCoins)}</span>
						</div>
						<div class="result-buttons">
							<button onclick={restartGame} class="btn-secondary">PLAY AGAIN</button>
							<a href="/squad" class="btn-primary">VIEW SQUAD</a>
						</div>
					</div>
				</div>
			{/if}

			<div class="back-link-container">
				<button onclick={restartGame} class="back-link">← Back to menu</button>
			</div>
		{/if}
	</div>
</main>

<style>
	.play-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background-color: var(--color-background);
	}

	.play-container {
		width: 100%;
		max-width: 500px;
	}

	.play-container.game-active {
		max-width: 950px;
	}

	.play-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.coin-display {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: var(--color-surface);
		border-radius: 2rem;
		margin-bottom: 1rem;
	}

	.coin-icon {
		font-size: 1.25rem;
	}

	.coin-amount {
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: var(--color-accent);
	}

	.play-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
		margin-bottom: 0.75rem;
	}

	.title-accent {
		color: var(--color-secondary);
	}

	.play-subtitle {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.difficulty-card,
	.controls-card {
		background-color: var(--color-surface);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-family: var(--font-pixel);
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-align: center;
		margin-bottom: 1rem;
	}

	.difficulty-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.difficulty-btn {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 1rem;
		border-radius: 8px;
		border: 2px solid var(--color-border);
		background-color: var(--color-surface);
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.difficulty-btn:hover {
		border-color: rgba(124, 58, 237, 0.5);
	}

	.difficulty-btn.selected {
		border-color: var(--color-primary);
		background-color: rgba(124, 58, 237, 0.2);
	}

	.difficulty-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.difficulty-label {
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		color: var(--color-text-primary);
	}

	.difficulty-label.active {
		color: var(--color-primary);
	}

	.difficulty-desc {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.difficulty-reward {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		margin-left: 1rem;
	}

	.coins-value {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--color-secondary);
	}

	.coins-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.start-btn {
		width: 100%;
		height: 48px;
		margin-top: 1.5rem;
		border-radius: 8px;
		background-color: var(--color-primary);
		color: white;
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.start-btn:hover {
		background-color: var(--color-primary-hover);
		transform: scale(1.02);
		box-shadow: var(--shadow-glow);
	}

	.controls-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.control-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.key {
		padding: 0.375rem 0.75rem;
		background-color: var(--color-background);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.control-desc {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.touch-icon {
		font-size: 1rem;
		min-width: 80px;
		text-align: center;
	}

	/* Game screen styles */
	.game-layout {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		justify-content: center;
	}

	.game-main {
		flex: 1;
		max-width: 800px;
	}

	.controls-sidebar {
		background-color: var(--color-surface);
		border-radius: 8px;
		padding: 1rem;
		min-width: 100px;
		flex-shrink: 0;
	}

	.sidebar-title {
		font-family: var(--font-pixel);
		font-size: 0.625rem;
		color: var(--color-text-secondary);
		text-align: center;
		margin-bottom: 0.75rem;
	}

	.sidebar-controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sidebar-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.sidebar-key {
		padding: 0.375rem 0.5rem;
		background-color: var(--color-background);
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.sidebar-label {
		font-size: 0.625rem;
		color: var(--color-text-secondary);
	}

	.game-score {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin-bottom: 1rem;
	}

	.score-side {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.score-label {
		font-size: 0.875rem;
		color: var(--color-text-muted);
	}

	.score-value {
		font-family: var(--font-pixel);
		font-size: 2rem;
	}

	.score-value.player {
		color: var(--color-primary);
	}

	.score-value.ai {
		color: #ef4444;
	}

	.score-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.score-divider {
		font-size: 1.5rem;
		color: var(--color-text-muted);
	}

	.game-timer {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.game-wrapper {
		position: relative;
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	}

	.game-canvas {
		width: 100%;
		max-width: 800px;
		height: 500px;
		margin: 0 auto;
		border-radius: 12px;
		overflow: hidden;
		border: 4px solid var(--color-border);
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
	}

	.hide-mobile {
		display: none;
	}

	/* Mobile responsive styles */
	@media (max-width: 768px) {
		.game-layout {
			flex-direction: column;
		}

		.game-wrapper {
			width: 100%;
			padding-bottom: 180px; /* Space for touch controls */
		}

		.game-canvas {
			height: auto;
			aspect-ratio: 8 / 5;
			max-height: 60vh;
		}

		.game-score {
			gap: 1rem;
		}

		.score-value {
			font-size: 1.5rem;
		}

		.controls-sidebar {
			display: none;
		}

		.play-container.game-active {
			max-width: 100%;
			padding: 0;
		}
	}

	.back-link-container {
		text-align: center;
		margin-top: 1rem;
	}

	.back-link {
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}

	/* Game over overlay */
	.game-over-overlay {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.game-over-card {
		background-color: var(--color-surface);
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		max-width: 400px;
		margin: 0 1rem;
	}

	.result-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
		color: var(--color-text-primary);
	}

	.result-title.win {
		color: var(--color-secondary);
	}

	.result-title.lose {
		color: #ef4444;
	}

	.final-score {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
	}

	.coins-earned {
		background-color: rgba(16, 185, 129, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.coins-earned.win {
		background-color: rgba(16, 185, 129, 0.2);
	}

	.coins-earned.draw {
		background-color: rgba(245, 158, 11, 0.2);
	}

	.coins-earned.loss {
		background-color: rgba(100, 116, 139, 0.2);
	}

	.earned-value {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-secondary);
		display: block;
	}

	.coins-earned.draw .earned-value {
		color: #f59e0b;
	}

	.coins-earned.loss .earned-value {
		color: var(--color-text-muted);
	}

	.earned-label {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.new-balance {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background-color: var(--color-background);
		border-radius: 6px;
	}

	.balance-label {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.balance-value {
		font-family: var(--font-pixel);
		font-size: 1.125rem;
		color: var(--color-accent);
	}

	.result-buttons {
		display: flex;
		gap: 1rem;
	}

	.btn-primary,
	.btn-secondary {
		flex: 1;
		height: 48px;
		border-radius: 8px;
		font-family: var(--font-pixel);
		font-size: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
	}

	.btn-primary {
		background-color: var(--color-primary);
		color: white;
		border: none;
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.btn-primary:hover {
		background-color: var(--color-primary-hover);
	}

	.btn-secondary:hover {
		background-color: var(--color-surface-hover);
	}
</style>
