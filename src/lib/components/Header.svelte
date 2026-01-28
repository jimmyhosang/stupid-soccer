<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		isAuthenticated?: boolean;
		username?: string;
		coins?: number;
		subscriptionTier?: 'free' | 'manager_club';
		isGuestMode?: boolean;
	}

	let { isAuthenticated = false, username = '', coins = 0, subscriptionTier = 'free', isGuestMode = false }: Props = $props();

	const isManagerClub = $derived(subscriptionTier === 'manager_club');
	const showAsLoggedIn = $derived(isAuthenticated || isGuestMode);

	let mobileMenuOpen = $state(false);

	const navLinks = [
		{ href: '/play', label: 'PLAY' },
		{ href: '/squad', label: 'SQUAD' },
		{ href: '/packs', label: 'PACKS' },
		{ href: '/scout', label: 'SCOUT' },
		{ href: '/marketplace', label: 'MARKET' },
		{ href: '/challenges', label: 'CHALLENGES' },
		{ href: '/leaderboard', label: 'RANKS' }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
</script>

<header class="bg-surface border-b border-border sticky top-0 z-50">
	<div class="max-w-6xl mx-auto px-4">
		<div class="flex items-center justify-between h-16">
			<!-- Logo -->
			<a href="/" class="font-pixel text-lg text-primary hover:text-primary-hover transition-colors">
				STUPID SOCCER
			</a>

			<!-- Desktop Navigation -->
			<nav class="hidden md:flex items-center gap-6">
				{#each navLinks as link}
					<a
						href={link.href}
						class="font-pixel text-xs transition-colors
							{$page.url.pathname === link.href
								? 'text-primary'
								: 'text-text-secondary hover:text-text-primary'}"
					>
						{link.label}
					</a>
				{/each}
			</nav>

			<!-- Right Side -->
			<div class="hidden md:flex items-center gap-4">
				{#if showAsLoggedIn}
					<div class="flex items-center gap-2 text-sm">
						<span class="text-accent font-pixel">{coins.toLocaleString()}</span>
						<span class="text-text-muted">coins</span>
					</div>
					<div class="h-4 w-px bg-border"></div>
					{#if isGuestMode}
						<span class="flex items-center gap-2 text-text-secondary text-sm">
							<span class="guest-badge" title="Playing as Guest">🎮</span>
							{username || 'Guest'}
						</span>
					{:else}
						<a href="/profile" class="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm">
							{#if isManagerClub}
								<span class="manager-badge" title="Manager Club Member">👑</span>
							{/if}
							@{username}
						</a>
					{/if}
				{:else}
					<a href="/login" class="text-text-secondary hover:text-text-primary text-sm">
						Sign In
					</a>
					<a href="/signup" class="btn btn-primary text-sm h-9 px-4">
						Sign Up
					</a>
				{/if}
			</div>

			<!-- Mobile Menu Button -->
			<button
				onclick={toggleMobileMenu}
				class="md:hidden text-text-secondary hover:text-text-primary"
				aria-label="Toggle menu"
			>
				{#if mobileMenuOpen}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if mobileMenuOpen}
			<nav class="md:hidden py-4 border-t border-border">
				<div class="flex flex-col gap-4">
					{#each navLinks as link}
						<a
							href={link.href}
							onclick={() => mobileMenuOpen = false}
							class="font-pixel text-sm py-2 transition-colors
								{$page.url.pathname === link.href
									? 'text-primary'
									: 'text-text-secondary hover:text-text-primary'}"
						>
							{link.label}
						</a>
					{/each}

					<div class="h-px bg-border my-2"></div>

					{#if showAsLoggedIn}
						<div class="flex items-center justify-between py-2">
							<span class="flex items-center gap-2 text-text-secondary text-sm">
								{#if isGuestMode}
									<span class="guest-badge" title="Playing as Guest">🎮</span>
									{username || 'Guest'}
								{:else}
									{#if isManagerClub}
										<span class="manager-badge" title="Manager Club Member">👑</span>
									{/if}
									@{username}
								{/if}
							</span>
							<span class="text-accent font-pixel text-sm">{coins.toLocaleString()} coins</span>
						</div>
						{#if !isGuestMode}
							<a href="/profile" class="btn btn-secondary w-full">
								Profile
							</a>
						{/if}
					{:else}
						<a href="/login" class="btn btn-secondary w-full">
							Sign In
						</a>
						<a href="/signup" class="btn btn-primary w-full">
							Sign Up
						</a>
					{/if}
				</div>
			</nav>
		{/if}
	</div>
</header>
