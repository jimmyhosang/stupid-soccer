<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { supabase } from '$lib/stores/auth.svelte';

	let { data } = $props();

	let loading = $state(false);
	let editingUsername = $state(false);
	let newUsername = $state(data.profile.username);
	let errorMessage = $state('');

	const memberSince = $derived(() => {
		const date = new Date(data.profile.created_at);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	});

	const scoutStatus = $derived(() => {
		if (data.profile.subscription_tier === 'manager_club') {
			return 'UNLIMITED';
		}
		const remaining = 1 - (data.profile.ai_scout_uses_this_month || 0);
		return remaining > 0 ? `${remaining} LEFT` : 'USED';
	});

	async function signOut() {
		loading = true;
		try {
			if (supabase) {
				await supabase.auth.signOut();
			}
			// Clear cookies
			document.cookie = 'sb-access-token=; path=/; max-age=0';
			document.cookie = 'sb-refresh-token=; path=/; max-age=0';
			window.location.href = '/';
		} catch (error) {
			console.error('Sign out error:', error);
			window.location.href = '/';
		}
	}
</script>

<svelte:head>
	<title>Profile - Stupid Soccer</title>
</svelte:head>

<main class="profile-page">
	<div class="profile-container">
		<h1 class="profile-title">MY PROFILE</h1>

		<!-- Profile Card -->
		<div class="profile-card">
			<div class="profile-header">
				<div class="profile-info">
					<div class="profile-avatar">
						<span class="avatar-emoji">⚽</span>
					</div>
					<div>
						{#if editingUsername}
							<form
								method="POST"
								action="?/updateUsername"
								use:enhance={() => {
									loading = true;
									return async ({ result }) => {
										loading = false;
										if (result.type === 'success' && result.data?.success) {
											editingUsername = false;
											errorMessage = '';
											await invalidateAll();
										} else if (result.type === 'success' && result.data?.error) {
											errorMessage = result.data.error;
										}
									};
								}}
								class="username-edit"
							>
								<input
									type="text"
									name="username"
									bind:value={newUsername}
									class="username-input"
									maxlength="20"
									minlength="3"
								/>
								<button type="submit" class="btn btn-primary btn-sm" disabled={loading}>
									Save
								</button>
								<button
									type="button"
									onclick={() => {
										editingUsername = false;
										newUsername = data.profile.username;
										errorMessage = '';
									}}
									class="btn btn-secondary btn-sm"
								>
									Cancel
								</button>
							</form>
							{#if errorMessage}
								<p class="error-text">{errorMessage}</p>
							{/if}
						{:else}
							<div class="username-display">
								<h2 class="username">@{data.profile.username}</h2>
								<button onclick={() => (editingUsername = true)} class="edit-btn">
									<svg class="edit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
										/>
									</svg>
								</button>
							</div>
						{/if}
						<p class="member-since">Member since {memberSince()}</p>
					</div>
				</div>
			</div>

			<!-- Stats Grid -->
			<div class="stats-grid">
				<div class="stat-box">
					<span class="stat-label">COINS</span>
					<div class="stat-value stat-accent">{data.profile.coins.toLocaleString()}</div>
				</div>
				<div class="stat-box">
					<span class="stat-label">AI SCOUT</span>
					<div class="stat-value stat-primary">{scoutStatus()}</div>
				</div>
				<div class="stat-box">
					<span class="stat-label">PLAYERS</span>
					<div class="stat-value">{data.stats.playerCount}</div>
				</div>
				<div class="stat-box">
					<span class="stat-label">W/L</span>
					<div class="stat-value">{data.stats.wins}/{data.stats.losses}</div>
				</div>
			</div>
		</div>

		<!-- Subscription Status -->
		{#if data.profile.subscription_tier === 'manager_club'}
			<div class="subscription-card subscription-active">
				<span class="subscription-badge">⭐ MANAGER CLUB</span>
				<p class="subscription-text">Unlimited AI Scout uses</p>
			</div>
		{:else}
			<a href="/subscribe" class="subscription-card subscription-upgrade">
				<span class="subscription-badge">🆓 FREE TIER</span>
				<p class="subscription-text">Upgrade to Manager Club for unlimited AI Scout →</p>
			</a>
		{/if}

		<!-- Quick Links -->
		<div class="quick-links-card">
			<h3 class="quick-links-title">QUICK LINKS</h3>

			<div class="links-list">
				<a href="/squad" class="link-item">
					<div class="link-content">
						<span class="link-icon">👥</span>
						<span class="link-text">My Squad</span>
					</div>
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>

				<a href="/packs" class="link-item">
					<div class="link-content">
						<span class="link-icon">📦</span>
						<span class="link-text">Card Packs</span>
					</div>
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>

				<a href="/marketplace" class="link-item">
					<div class="link-content">
						<span class="link-icon">🔄</span>
						<span class="link-text">Marketplace</span>
					</div>
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>

				<a href="/scout" class="link-item">
					<div class="link-content">
						<span class="link-icon">🔍</span>
						<span class="link-text">AI Scout</span>
					</div>
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>

				<a href="/play" class="link-item">
					<div class="link-content">
						<span class="link-icon">🎮</span>
						<span class="link-text">Play Match</span>
					</div>
					<svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>
		</div>

		<!-- Sign Out -->
		<button onclick={signOut} class="signout-btn" disabled={loading}>
			{loading ? 'Signing out...' : 'Sign Out'}
		</button>
	</div>
</main>

<style>
	.profile-page {
		min-height: 100vh;
		padding: 2rem 1rem;
	}

	.profile-container {
		max-width: 42rem;
		margin: 0 auto;
	}

	.profile-title {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-text-primary);
		margin-bottom: 2rem;
	}

	.profile-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.profile-header {
		margin-bottom: 1.5rem;
	}

	.profile-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.profile-avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		background-color: rgba(124, 58, 237, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.avatar-emoji {
		font-size: 1.875rem;
	}

	.username-edit {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.username-input {
		padding: 0.5rem 0.75rem;
		background-color: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		color: var(--color-text-primary);
		font-size: 1.125rem;
		font-weight: 700;
	}

	.username-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.username {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.edit-btn {
		color: var(--color-text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}

	.edit-btn:hover {
		color: var(--color-text-primary);
	}

	.edit-icon {
		width: 1rem;
		height: 1rem;
	}

	.member-since {
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.error-text {
		color: #f87171;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.stat-box {
		background-color: var(--color-background);
		border-radius: 0.5rem;
		padding: 1rem;
		text-align: center;
	}

	.stat-label {
		color: var(--color-text-muted);
		font-size: 0.75rem;
		display: block;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		color: var(--color-text-primary);
	}

	.stat-accent {
		color: var(--color-accent);
	}

	.stat-primary {
		color: var(--color-primary);
	}

	.subscription-card {
		display: block;
		border-radius: 0.75rem;
		padding: 1rem 1.5rem;
		margin-bottom: 1.5rem;
		text-decoration: none;
	}

	.subscription-active {
		background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.1));
		border: 1px solid var(--color-primary);
	}

	.subscription-upgrade {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		transition: border-color 0.2s;
	}

	.subscription-upgrade:hover {
		border-color: var(--color-primary);
	}

	.subscription-badge {
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		color: var(--color-primary);
	}

	.subscription-text {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.quick-links-card {
		background-color: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.quick-links-title {
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.link-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background-color: var(--color-background);
		border-radius: 0.5rem;
		text-decoration: none;
		transition: background-color 0.2s;
	}

	.link-item:hover {
		background-color: var(--color-surface-hover);
	}

	.link-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.link-icon {
		font-size: 1.25rem;
	}

	.link-text {
		color: var(--color-text-primary);
	}

	.arrow-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-text-muted);
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

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
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

	.btn-secondary:hover {
		background-color: var(--color-surface-hover);
	}

	.signout-btn {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: all 0.2s;
		cursor: pointer;
		background-color: var(--color-surface);
		color: #f87171;
		border: 1px solid var(--color-border);
	}

	.signout-btn:hover:not(:disabled) {
		color: #fca5a5;
		background-color: var(--color-surface-hover);
	}

	.signout-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
