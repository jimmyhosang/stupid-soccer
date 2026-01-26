<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import type { Player } from '$lib/types/database';
	import { playRevealSound, playClickSound, resumeAudio } from '$lib/game/audio/SoundEffects';
	import { onMount } from 'svelte';

	let prompt = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let generatedPlayer = $state<Player | null>(null);
	let showReveal = $state(false);
	let savedMessage = $state<string | null>(null);

	const examplePrompts = [
		'A goalkeeper who used to be a professional mime and never speaks during matches',
		'A striker who believes they were a medieval knight in a past life',
		'A defensive midfielder who solves Rubik\'s cubes during halftime',
		'A winger who claims to have outrun a cheetah (the cheetah was sleeping)',
		'A center back who writes poetry about tackles',
		'A tiny midfielder with giant confidence who trash talks everyone',
		'A defender who communicates only in dance moves',
		'A forward who trained exclusively by playing FIFA and somehow got good'
	];

	function useExample() {
		playClickSound();
		prompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
	}

	async function generatePlayer() {
		if (!prompt.trim()) {
			error = 'Please enter a description for your player';
			return;
		}

		resumeAudio();
		playClickSound();
		loading = true;
		error = null;
		generatedPlayer = null;
		showReveal = false;

		try {
			const response = await fetch('/api/scout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: prompt.trim() })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Failed to generate player');
			}

			const data = await response.json();
			generatedPlayer = {
				...data.player,
				id: crypto.randomUUID(),
				owner_id: 'demo',
				is_listed: false,
				is_starter: false,
				created_at: new Date().toISOString()
			};

			// Trigger reveal animation
			setTimeout(() => {
				showReveal = true;
				playRevealSound();
			}, 100);

		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	function confirmSave() {
		// Player is already saved to Supabase when generated
		// This just shows confirmation
		if (!generatedPlayer) return;

		playClickSound();
		savedMessage = `${generatedPlayer.name} added to your collection!`;
		setTimeout(() => {
			savedMessage = null;
		}, 3000);
	}

	function generateAnother() {
		playClickSound();
		generatedPlayer = null;
		showReveal = false;
		prompt = '';
	}

	function getRarityGlow(rarity: string): string {
		switch (rarity) {
			case 'legendary': return 'shadow-[0_0_30px_rgba(245,158,11,0.5)]';
			case 'rare': return 'shadow-[0_0_20px_rgba(59,130,246,0.4)]';
			default: return '';
		}
	}
</script>

<svelte:head>
	<title>AI Scout - Stupid Soccer</title>
</svelte:head>

<main class="scout-page">
	<div class="scout-container">
		<div class="scout-header">
			<h1 class="scout-title">
				<span class="text-highlight">AI</span> SCOUT
			</h1>
			<p class="scout-subtitle">
				Describe your dream player and our AI will bring them to life with unique stats, a stupid name, and an absurd backstory.
			</p>
		</div>

		{#if !generatedPlayer}
			<!-- Input Form -->
			<div class="scout-card">
				<label for="prompt" class="form-label">
					DESCRIBE YOUR PLAYER
				</label>
				<textarea
					id="prompt"
					bind:value={prompt}
					placeholder="A chaotic striker who trained with circus performers and celebrates by juggling invisible oranges..."
					rows="4"
					maxlength="500"
					class="prompt-textarea"
					disabled={loading}
				></textarea>
				<div class="prompt-meta">
					<span class="char-count">{prompt.length}/500 characters</span>
					<button
						type="button"
						onclick={useExample}
						class="example-btn"
						disabled={loading}
					>
						🎲 Random example
					</button>
				</div>

				{#if error}
					<div class="error-message">
						{error}
					</div>
				{/if}

				<button
					type="button"
					onclick={generatePlayer}
					disabled={loading || !prompt.trim()}
					class="generate-btn"
				>
					{#if loading}
						<div class="spinner-wrap">
							<svg class="spinner" fill="none" viewBox="0 0 24 24">
								<circle class="spinner-bg" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="spinner-fg" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						</div>
						<span class="scout-loading-text">Scouting talent</span>
					{:else}
						🔍 Generate Player
					{/if}
				</button>

				<p class="scout-note">
					Free users: 1 scout per month • Manager Club: Unlimited
				</p>
			</div>

			<!-- How it works -->
			<div class="how-it-works">
				<div class="step-card step-primary">
					<div class="step-icon">💭</div>
					<h3 class="step-title step-title-primary">1. DESCRIBE</h3>
					<p class="step-desc">
						Tell us about your dream player's personality, background, or playing style
					</p>
				</div>
				<div class="step-card step-secondary">
					<div class="step-icon">🤖</div>
					<h3 class="step-title step-title-secondary">2. GENERATE</h3>
					<p class="step-desc">
						Our AI creates a unique player with stats, backstory, and a stupid name
					</p>
				</div>
				<div class="step-card step-accent">
					<div class="step-icon">⚽</div>
					<h3 class="step-title step-title-accent">3. PLAY</h3>
					<p class="step-desc">
						Add them to your squad and dominate the pitch
					</p>
				</div>
			</div>
		{:else}
			<!-- Generated Player Result with Reveal Animation -->
			<div class="reveal-container {showReveal ? 'revealed' : ''}">
				<!-- Rarity burst effect -->
				{#if generatedPlayer.rarity === 'legendary'}
					<div class="rarity-burst legendary"></div>
				{:else if generatedPlayer.rarity === 'rare'}
					<div class="rarity-burst rare"></div>
				{/if}

				<div class="flex flex-col lg:flex-row gap-12 items-start justify-center">
					<!-- Player Card with glow -->
					<div class="flex-shrink-0 player-card-reveal {getRarityGlow(generatedPlayer.rarity)}">
						<PlayerCard player={generatedPlayer} size="lg" showStats={true} />
					</div>

					<!-- Player Details -->
					<div class="card p-8 flex-1 max-w-md details-reveal">
						<div class="flex items-center gap-3 mb-4">
							<h2 class="font-pixel text-xl text-text-primary">{generatedPlayer.name}</h2>
							<span class="rarity-badge {generatedPlayer.rarity}">
								{generatedPlayer.rarity}
							</span>
						</div>

						<div class="space-y-4">
							<div>
								<h3 class="font-pixel text-xs text-text-muted mb-1">BACKSTORY</h3>
								<p class="text-text-secondary">{generatedPlayer.backstory}</p>
							</div>

							<div>
								<h3 class="font-pixel text-xs text-text-muted mb-1">PERSONALITY</h3>
								<div class="flex gap-2 flex-wrap">
									{#each generatedPlayer.personality as trait}
										<span class="px-2 py-1 bg-primary/20 text-primary rounded text-sm">{trait}</span>
									{/each}
								</div>
							</div>

							<div>
								<h3 class="font-pixel text-xs text-text-muted mb-1">CELEBRATION</h3>
								<p class="text-text-secondary italic">"{generatedPlayer.celebration}"</p>
							</div>

							<div>
								<h3 class="font-pixel text-xs text-text-muted mb-1">OVERALL RATING</h3>
								<div class="font-pixel text-3xl text-primary">
									{Math.round((generatedPlayer.pace + generatedPlayer.shooting + generatedPlayer.passing + generatedPlayer.defense + generatedPlayer.stamina) / 5)}
								</div>
							</div>

							<div class="text-xs text-text-muted border-t border-border pt-4">
								<span class="font-pixel">YOUR PROMPT:</span> {generatedPlayer.generation_prompt}
							</div>
						</div>

						{#if savedMessage}
							<div class="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm text-center">
								✓ {savedMessage}
							</div>
						{/if}

						<div class="flex gap-4 mt-6">
							<button onclick={confirmSave} class="flex-1 btn btn-primary" disabled={!!savedMessage}>
								{savedMessage ? '✓ Saved!' : '✓ Added to Collection'}
							</button>
							<button onclick={generateAnother} class="flex-1 btn btn-secondary">
								🔄 Generate Another
							</button>
						</div>

						<div class="flex justify-center mt-4">
							<a href="/squad" class="text-primary hover:underline text-sm">
								View My Squad →
							</a>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	/* Page layout */
	.scout-page {
		min-height: 100vh;
		padding: 3rem 1rem;
	}

	.scout-container {
		max-width: 56rem;
		margin: 0 auto;
	}

	.scout-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.scout-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	@media (min-width: 768px) {
		.scout-title {
			font-size: 1.875rem;
		}
	}

	.text-highlight {
		color: var(--color-primary);
	}

	.scout-subtitle {
		color: var(--color-text-secondary);
		max-width: 36rem;
		margin: 0 auto;
	}

	/* Form card */
	.scout-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 2rem;
		max-width: 42rem;
		margin: 0 auto;
	}

	.form-label {
		display: block;
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.5rem;
	}

	.prompt-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		background-color: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-size: 1rem;
		resize: none;
	}

	.prompt-textarea::placeholder {
		color: var(--color-text-muted);
	}

	.prompt-textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
	}

	.prompt-textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.prompt-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 0.5rem;
	}

	.char-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.example-btn {
		font-size: 0.75rem;
		color: var(--color-primary);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: none;
	}

	.example-btn:hover {
		text-decoration: underline;
	}

	.example-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		margin-top: 1rem;
		padding: 1rem;
		background-color: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.5);
		border-radius: 0.5rem;
		color: #f87171;
		font-size: 0.875rem;
	}

	.generate-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.generate-btn:hover:not(:disabled) {
		background-color: var(--color-primary-hover);
	}

	.generate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner-wrap {
		position: relative;
	}

	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		animation: spin 1s linear infinite;
	}

	.spinner-bg {
		opacity: 0.25;
	}

	.spinner-fg {
		opacity: 0.75;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.scout-note {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-top: 1rem;
	}

	/* How it works section */
	.how-it-works {
		margin-top: 4rem;
		display: grid;
		gap: 2rem;
		text-align: center;
	}

	@media (min-width: 768px) {
		.how-it-works {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.step-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		transition: border-color 0.2s;
	}

	.step-primary:hover {
		border-color: rgba(124, 58, 237, 0.5);
	}

	.step-secondary:hover {
		border-color: rgba(16, 185, 129, 0.5);
	}

	.step-accent:hover {
		border-color: rgba(251, 191, 36, 0.5);
	}

	.step-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.step-title {
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.step-title-primary {
		color: var(--color-primary);
	}

	.step-title-secondary {
		color: var(--color-secondary);
	}

	.step-title-accent {
		color: var(--color-accent);
	}

	.step-desc {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	/* Loading text animation */
	.scout-loading-text::after {
		content: '...';
		animation: dots 1.5s steps(4, end) infinite;
	}

	@keyframes dots {
		0%, 20% { content: ''; }
		40% { content: '.'; }
		60% { content: '..'; }
		80%, 100% { content: '...'; }
	}

	/* Reveal animations */
	.reveal-container {
		position: relative;
	}

	.player-card-reveal {
		opacity: 0;
		transform: scale(0.8) rotateY(180deg);
		transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.details-reveal {
		opacity: 0;
		transform: translateX(30px);
		transition: all 0.6s ease-out 0.4s;
	}

	.reveal-container.revealed .player-card-reveal {
		opacity: 1;
		transform: scale(1) rotateY(0deg);
	}

	.reveal-container.revealed .details-reveal {
		opacity: 1;
		transform: translateX(0);
	}

	/* Rarity burst effect */
	.rarity-burst {
		position: absolute;
		top: 50%;
		left: 30%;
		width: 300px;
		height: 300px;
		border-radius: 50%;
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
		pointer-events: none;
	}

	.rarity-burst.legendary {
		background: radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%);
		animation: burst 1s ease-out forwards;
	}

	.rarity-burst.rare {
		background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
		animation: burst 1s ease-out forwards;
	}

	@keyframes burst {
		0% {
			transform: translate(-50%, -50%) scale(0);
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(3);
			opacity: 0;
		}
	}

	/* Rarity badge */
	.rarity-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.rarity-badge.common {
		background: #475569;
		color: white;
	}

	.rarity-badge.rare {
		background: #3b82f6;
		color: white;
		animation: glow-blue 2s ease-in-out infinite;
	}

	.rarity-badge.legendary {
		background: linear-gradient(135deg, #f59e0b, #fbbf24);
		color: #451a03;
		animation: glow-gold 2s ease-in-out infinite;
	}

	@keyframes glow-blue {
		0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
		50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.8); }
	}

	@keyframes glow-gold {
		0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
		50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.8); }
	}
</style>
