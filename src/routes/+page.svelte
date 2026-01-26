<script lang="ts">
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import type { Player } from '$lib/types/database';

	// Demo players for landing page
	const demoPlayers: Player[] = [
		{
			id: '1',
			owner_id: null,
			name: 'Thunderfoot McSplash',
			generation_prompt: null,
			backstory: 'Once scored a goal so powerful it knocked out the goalkeeper, the net, and three spectators.',
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
			owner_id: null,
			name: 'Whiskers O\'Dribble',
			generation_prompt: null,
			backstory: 'Claims to have trained with actual cats. Nobody believes him but his footwork is suspicious.',
			personality: ['mysterious', 'agile'],
			celebration: 'Pretends to clean his face like a cat',
			sprite_config: { hair: 'curly', skin: 'light', face: 'smirk', accessories: ['whisker_paint'] },
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
			owner_id: null,
			name: 'Brick Wallson',
			generation_prompt: null,
			backstory: 'Was literally a brick wall in a past life. Defense is his love language.',
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
		}
	];

	let hoveredFeature = $state<string | null>(null);
</script>

<svelte:head>
	<title>Stupid Soccer - Every Player Has a Soul (And a Stupid Name)</title>
	<meta name="description" content="The anti-FIFA browser game. No loot boxes, no pay-to-win. Just skill, trading, and AI-generated chaos." />
</svelte:head>

<main>
	<!-- Hero Section -->
	<section class="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden">
		<!-- Animated background -->
		<div class="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

		<!-- Floating player cards decoration -->
		<div class="absolute top-20 left-10 opacity-20 rotate-[-15deg] hidden lg:block animate-float">
			<PlayerCard player={demoPlayers[0]} size="sm" />
		</div>
		<div class="absolute bottom-20 right-10 opacity-20 rotate-[15deg] hidden lg:block animate-float" style="animation-delay: 1s;">
			<PlayerCard player={demoPlayers[1]} size="sm" />
		</div>

		<h1 class="font-pixel text-xl sm:text-2xl md:text-3xl leading-relaxed mb-6 text-text-primary z-10">
			THE FOOTBALL GAME WHERE<br />
			EVERY PLAYER HAS A SOUL<br />
			<span class="text-accent">(AND A STUPID NAME)</span>
		</h1>

		<p class="hero-subtitle">
			No loot boxes. No pay-to-win. Just skill, trading, and AI-generated chaos.
		</p>

		<div class="flex flex-col sm:flex-row gap-4 mb-8 z-10">
			<a href="/play" class="btn btn-primary text-lg px-8 py-4">
				PLAY FREE NOW
			</a>
			<a href="#how-it-works" class="btn btn-secondary text-lg px-8 py-4">
				HOW IT WORKS
			</a>
		</div>

		<p class="text-sm text-secondary z-10">
			🎮 50,000+ stupid players created • ⚽ 100,000+ matches played
		</p>

		<!-- Scroll indicator -->
		<div class="absolute bottom-8 animate-bounce">
			<svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
			</svg>
		</div>
	</section>

	<!-- Problem/Solution Section -->
	<section id="how-it-works" class="py-24 px-4 bg-surface">
		<div class="max-w-6xl mx-auto">
			<h2 class="font-pixel text-xl md:text-2xl text-center mb-16 text-text-primary">
				FIFA BURNED YOU. <span class="text-accent">WE WON'T.</span>
			</h2>

			<div class="grid md:grid-cols-2 gap-8">
				<!-- The Problem -->
				<div class="card p-8 border-red-500/30 bg-red-950/20">
					<h3 class="font-pixel text-lg text-red-400 mb-6">❌ Other Games</h3>
					<ul class="space-y-4 text-text-secondary">
						<li class="flex items-start gap-3">
							<span class="text-red-400">💸</span>
							<span>Spend $100s on loot boxes, get nothing</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-red-400">🤖</span>
							<span>Same boring generated players</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-red-400">🔒</span>
							<span>Players stuck in your account forever</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-red-400">📉</span>
							<span>Reset every year, lose everything</span>
						</li>
					</ul>
				</div>

				<!-- The Solution -->
				<div class="card p-8 border-secondary/30 bg-emerald-950/20">
					<h3 class="font-pixel text-lg text-secondary mb-6">✓ Stupid Soccer</h3>
					<ul class="space-y-4 text-text-secondary">
						<li class="flex items-start gap-3">
							<span class="text-secondary">🎁</span>
							<span>Free to play, earn everything through skill</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-secondary">🤖</span>
							<span>AI creates unique players with backstories</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-secondary">🔄</span>
							<span>Trade players with real people</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-secondary">♾️</span>
							<span>Your players are yours forever</span>
						</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- AI Scout Demo Section -->
	<section class="py-24 px-4">
		<div class="max-w-6xl mx-auto">
			<h2 class="section-title">
				MEET THE <span class="text-primary">AI SCOUT</span>
			</h2>
			<p class="section-subtitle">
				Describe your dream player and our AI creates them with unique stats, backstory, and personality.
			</p>

			<div class="grid lg:grid-cols-2 gap-12 items-center">
				<!-- Input Demo -->
				<div class="card p-8">
					<label class="block mb-2 font-pixel text-sm text-text-secondary">Your prompt:</label>
					<div class="bg-background rounded-lg p-4 mb-6 border border-border">
						<p class="text-text-primary italic">
							"A chaotic striker who trained with actual circus performers and celebrates goals by juggling invisible oranges"
						</p>
					</div>

					<div class="flex items-center gap-2 text-secondary mb-4">
						<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span class="font-pixel text-xs">AI SCOUT WORKING...</span>
					</div>

					<div class="space-y-2 text-sm text-text-muted">
						<p>✓ Analyzing personality traits...</p>
						<p>✓ Generating unique stats...</p>
						<p>✓ Writing backstory...</p>
						<p class="text-secondary">✓ Player created!</p>
					</div>
				</div>

				<!-- Output Demo -->
				<div class="flex justify-center">
					<div class="relative">
						<PlayerCard player={demoPlayers[0]} size="lg" showStats={true} />
						<div class="absolute -bottom-4 -right-4 bg-primary text-white px-3 py-1 rounded-full font-pixel text-xs">
							NEW!
						</div>
					</div>
				</div>
			</div>

			<div class="text-center mt-12">
				<p class="text-text-muted mb-4">Free players get 1 AI Scout use per month</p>
				<a href="/signup" class="btn btn-primary">
					TRY AI SCOUT FREE
				</a>
			</div>
		</div>
	</section>

	<!-- Feature Cards Section -->
	<section class="py-24 px-4 bg-surface">
		<div class="max-w-6xl mx-auto">
			<h2 class="font-pixel text-xl md:text-2xl text-center mb-16 text-text-primary">
				HOW IT WORKS
			</h2>

			<div class="grid md:grid-cols-3 gap-8">
				<!-- Scout -->
				<div
					class="card p-8 text-center transition-all duration-300 {hoveredFeature === 'scout' ? 'border-primary bg-primary/10 scale-105' : ''}"
					onmouseenter={() => hoveredFeature = 'scout'}
					onmouseleave={() => hoveredFeature = null}
					role="article"
				>
					<div class="text-5xl mb-4">🔍</div>
					<h3 class="font-pixel text-lg text-primary mb-4">1. SCOUT</h3>
					<p class="text-text-secondary">
						Use the AI Scout to generate unique players with personalities, backstories, and stupid names.
					</p>
				</div>

				<!-- Play -->
				<div
					class="card p-8 text-center transition-all duration-300 {hoveredFeature === 'play' ? 'border-secondary bg-secondary/10 scale-105' : ''}"
					onmouseenter={() => hoveredFeature = 'play'}
					onmouseleave={() => hoveredFeature = null}
					role="article"
				>
					<div class="text-5xl mb-4">⚽</div>
					<h3 class="font-pixel text-lg text-secondary mb-4">2. PLAY</h3>
					<p class="text-text-secondary">
						Battle AI opponents in 3v3 matches. Win to earn coins. Improve your squad.
					</p>
				</div>

				<!-- Trade -->
				<div
					class="card p-8 text-center transition-all duration-300 {hoveredFeature === 'trade' ? 'border-accent bg-accent/10 scale-105' : ''}"
					onmouseenter={() => hoveredFeature = 'trade'}
					onmouseleave={() => hoveredFeature = null}
					role="article"
				>
					<div class="text-5xl mb-4">🔄</div>
					<h3 class="font-pixel text-lg text-accent mb-4">3. TRADE</h3>
					<p class="text-text-secondary">
						Trade players with real people. Build your dream team. Watch their provenance grow.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Player Showcase -->
	<section class="py-24 px-4">
		<div class="max-w-6xl mx-auto">
			<h2 class="section-title">
				MEET THE SQUAD
			</h2>
			<p class="section-subtitle">
				Every player is one-of-a-kind. Here are some fan favorites.
			</p>

			<div class="flex flex-wrap justify-center gap-8">
				{#each demoPlayers as player}
					<div class="group">
						<PlayerCard {player} size="md" showStats={true} />
						<p class="text-center mt-4 text-text-muted text-sm max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity">
							"{player.backstory}"
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Social Proof Section -->
	<section class="testimonials-section">
		<div class="testimonials-container">
			<h2 class="testimonials-title">
				WHAT PLAYERS SAY
			</h2>

			<div class="testimonials-grid">
				<blockquote class="testimonial-card">
					<p class="testimonial-text">
						"Finally a football game that respects my time AND my wallet. My player 'Noodle Arms McGee' is an absolute legend."
					</p>
					<footer class="testimonial-author">
						— @FIFArefugee2024
					</footer>
				</blockquote>

				<blockquote class="testimonial-card">
					<p class="testimonial-text">
						"The backstories are hilarious. I traded for a goalkeeper who 'once saved a penalty with his face and doesn't remember the 90s anymore.'"
					</p>
					<footer class="testimonial-author">
						— @retrogamer_dave
					</footer>
				</blockquote>
			</div>

			<div class="stats-row">
				<div class="stat-item">
					<div class="stat-value stat-primary">50K+</div>
					<div class="stat-label">Players Created</div>
				</div>
				<div class="stat-item">
					<div class="stat-value stat-secondary">100K+</div>
					<div class="stat-label">Matches Played</div>
				</div>
				<div class="stat-item">
					<div class="stat-value stat-accent">10K+</div>
					<div class="stat-label">Trades Made</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="cta-section">
		<div class="cta-container">
			<h2 class="cta-title">
				READY TO BUILD YOUR<br />
				<span class="text-accent">STUPID SQUAD?</span>
			</h2>

			<p class="cta-description">
				Join thousands of players who've ditched pay-to-win games for something actually fun.
			</p>

			<a href="/signup" class="btn btn-primary text-lg px-12 py-4 mb-4 inline-block">
				START PLAYING FREE
			</a>

			<p class="cta-note">
				No credit card required. No hidden fees. Just football.
			</p>
		</div>
	</section>

	<!-- Footer -->
	<footer class="py-12 px-4 bg-surface border-t border-border">
		<div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
			<div class="font-pixel text-primary">STUPID SOCCER</div>

			<nav class="flex gap-6 text-text-muted text-sm">
				<a href="/about" class="hover:text-text-primary transition-colors">About</a>
				<a href="/privacy" class="hover:text-text-primary transition-colors">Privacy</a>
				<a href="/terms" class="hover:text-text-primary transition-colors">Terms</a>
				<a href="https://twitter.com/stupidsoccer" class="hover:text-text-primary transition-colors">Twitter</a>
			</nav>

			<p class="text-text-muted text-sm">
				© 2024 Stupid Soccer. Made with ⚽ and chaos.
			</p>
		</div>
	</footer>
</main>

<style>
	.hero-subtitle {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
		max-width: 42rem;
		margin-bottom: 2rem;
		position: relative;
		z-index: 10;
		white-space: normal;
		text-align: center;
	}

	@media (min-width: 768px) {
		.hero-subtitle {
			font-size: 1.25rem;
		}
	}

	.section-title {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		text-align: center;
		margin-bottom: 1rem;
		color: var(--color-text-primary);
	}

	@media (min-width: 768px) {
		.section-title {
			font-size: 1.5rem;
		}
	}

	.section-subtitle {
		text-align: center;
		color: var(--color-text-secondary);
		margin-bottom: 4rem;
		max-width: 42rem;
		margin-left: auto;
		margin-right: auto;
		white-space: normal;
	}

	.cta-section {
		padding: 6rem 1rem;
		background: linear-gradient(to bottom, var(--color-background), rgba(124, 58, 237, 0.2));
	}

	.cta-container {
		max-width: 56rem;
		margin: 0 auto;
		text-align: center;
	}

	.cta-title {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		margin-bottom: 1.5rem;
		color: var(--color-text-primary);
	}

	@media (min-width: 768px) {
		.cta-title {
			font-size: 1.5rem;
		}
	}

	.cta-description {
		color: var(--color-text-secondary);
		margin-bottom: 2rem;
		max-width: 36rem;
		margin-left: auto;
		margin-right: auto;
		white-space: normal;
	}

	.cta-note {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-top: 1rem;
	}

	/* Testimonials Section */
	.testimonials-section {
		padding: 6rem 1rem;
		background-color: var(--color-surface);
	}

	.testimonials-container {
		max-width: 56rem;
		margin: 0 auto;
		text-align: center;
	}

	.testimonials-title {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		margin-bottom: 3rem;
		color: var(--color-text-primary);
	}

	@media (min-width: 768px) {
		.testimonials-title {
			font-size: 1.5rem;
		}
	}

	.testimonials-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		margin-bottom: 3rem;
	}

	@media (min-width: 768px) {
		.testimonials-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.testimonial-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		text-align: left;
	}

	.testimonial-text {
		color: var(--color-text-secondary);
		font-style: italic;
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	.testimonial-author {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.stats-row {
		display: flex;
		justify-content: center;
		gap: 3rem;
		flex-wrap: wrap;
	}

	.stat-item {
		text-align: center;
	}

	.stat-value {
		font-family: var(--font-pixel);
		font-size: 1.875rem;
		margin-bottom: 0.25rem;
	}

	.stat-primary {
		color: var(--color-primary);
	}

	.stat-secondary {
		color: var(--color-secondary);
	}

	.stat-accent {
		color: var(--color-accent);
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
