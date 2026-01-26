<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);
	let isLoggedIn = $state(false);
	let currentTier = $state<'free' | 'manager_club'>('free');
	let cancelled = $state(false);

	onMount(async () => {
		// Check for cancelled param
		cancelled = $page.url.searchParams.get('cancelled') === 'true';

		// Check login status and current tier
		if (supabase) {
			const { data: { session } } = await supabase.auth.getSession();
			if (session) {
				isLoggedIn = true;
				const { data: profile } = await supabase
					.from('profiles')
					.select('subscription_tier')
					.eq('id', session.user.id)
					.single();
				if (profile) {
					currentTier = profile.subscription_tier as 'free' | 'manager_club';
				}
			}
		}
	});

	async function subscribe() {
		if (!isLoggedIn) {
			window.location.href = '/login?redirect=/subscribe';
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch('/api/checkout', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to create checkout session');
			}

			const data = await response.json();

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	async function manageSubscription() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/billing-portal', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to open billing portal');
			}

			const data = await response.json();

			if (data.url) {
				window.location.href = data.url;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Something went wrong';
		} finally {
			loading = false;
		}
	}

	const freeFeatures = [
		'Play unlimited matches',
		'1 AI Scout generation per month',
		'Basic marketplace access',
		'5 starter players'
	];

	const proFeatures = [
		'Everything in Free',
		'Unlimited AI Scout generations',
		'Priority marketplace listings',
		'Exclusive rare players',
		'Early access to new features',
		'Discord role & support'
	];
</script>

<svelte:head>
	<title>Manager Club - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen py-12 px-4">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-12">
			<h1 class="font-pixel text-2xl md:text-3xl text-text-primary mb-4">
				<span class="text-accent">MANAGER</span> CLUB
			</h1>
			<p class="text-text-secondary max-w-xl mx-auto">
				Unlock unlimited AI Scout generations and exclusive features to build the ultimate squad.
			</p>
		</div>

		{#if cancelled}
			<div class="mb-8 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 text-center">
				Checkout was cancelled. No worries - you can subscribe anytime!
			</div>
		{/if}

		{#if error}
			<div class="mb-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-center">
				{error}
			</div>
		{/if}

		<!-- Pricing Cards -->
		<div class="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
			<!-- Free Tier -->
			<div class="card p-8 {currentTier === 'free' ? 'border-primary/50' : ''}">
				{#if currentTier === 'free'}
					<div class="text-xs font-bold text-primary mb-2">CURRENT PLAN</div>
				{/if}
				<h2 class="font-pixel text-xl text-text-primary mb-2">FREE</h2>
				<div class="mb-6">
					<span class="font-pixel text-3xl text-text-primary">$0</span>
					<span class="text-text-muted">/month</span>
				</div>

				<ul class="space-y-3 mb-8">
					{#each freeFeatures as feature}
						<li class="flex items-start gap-3">
							<svg class="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
							<span class="text-text-secondary">{feature}</span>
						</li>
					{/each}
				</ul>

				{#if currentTier === 'free'}
					<button class="w-full btn btn-secondary opacity-50 cursor-not-allowed" disabled>
						Current Plan
					</button>
				{:else}
					<button onclick={manageSubscription} class="w-full btn btn-secondary" disabled={loading}>
						Downgrade
					</button>
				{/if}
			</div>

			<!-- Manager Club Tier -->
			<div class="card p-8 border-accent/50 relative overflow-hidden">
				<div class="absolute top-0 right-0 bg-accent text-black font-pixel text-xs px-3 py-1">
					POPULAR
				</div>

				{#if currentTier === 'manager_club'}
					<div class="text-xs font-bold text-accent mb-2">CURRENT PLAN</div>
				{/if}
				<h2 class="font-pixel text-xl text-accent mb-2">MANAGER CLUB</h2>
				<div class="mb-6">
					<span class="font-pixel text-3xl text-text-primary">$4.99</span>
					<span class="text-text-muted">/month</span>
				</div>

				<ul class="space-y-3 mb-8">
					{#each proFeatures as feature}
						<li class="flex items-start gap-3">
							<svg class="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
							<span class="text-text-secondary">{feature}</span>
						</li>
					{/each}
				</ul>

				{#if currentTier === 'manager_club'}
					<button onclick={manageSubscription} class="w-full btn btn-primary" disabled={loading}>
						{loading ? 'Loading...' : 'Manage Subscription'}
					</button>
				{:else}
					<button onclick={subscribe} class="w-full btn btn-accent" disabled={loading}>
						{#if loading}
							<span class="animate-spin mr-2">⏳</span>
						{/if}
						{isLoggedIn ? 'Subscribe Now' : 'Sign In to Subscribe'}
					</button>
				{/if}
			</div>
		</div>

		<!-- FAQ Section -->
		<div class="mt-16 max-w-2xl mx-auto">
			<h3 class="font-pixel text-lg text-text-primary text-center mb-8">FAQ</h3>

			<div class="space-y-4">
				<div class="card p-6">
					<h4 class="font-medium text-text-primary mb-2">Can I cancel anytime?</h4>
					<p class="text-text-secondary text-sm">Yes! You can cancel your subscription at any time. You'll keep access until the end of your billing period.</p>
				</div>

				<div class="card p-6">
					<h4 class="font-medium text-text-primary mb-2">What happens to my players if I cancel?</h4>
					<p class="text-text-secondary text-sm">All your players stay in your collection. You just won't be able to generate new ones with AI Scout until you resubscribe (or use your 1 free monthly generation).</p>
				</div>

				<div class="card p-6">
					<h4 class="font-medium text-text-primary mb-2">What payment methods do you accept?</h4>
					<p class="text-text-secondary text-sm">We accept all major credit cards through Stripe's secure payment system.</p>
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
		border: none;
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

	.btn-accent {
		background-color: var(--color-accent);
		color: black;
		font-weight: 600;
	}

	.btn-accent:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}
</style>
