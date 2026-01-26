<script lang="ts">
	import { createAuthState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';

	const auth = createAuthState();

	let email = $state('');
	let password = $state('');
	let username = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	// Google OAuth is only available if configured in Supabase dashboard
	// For local dev, this is typically not set up
	const googleOAuthEnabled = false; // Set to true when Google OAuth is configured

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		loading = true;

		try {
			await auth.signUpWithEmail(email, password, username);
			goto('/');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sign up';
		} finally {
			loading = false;
		}
	}

	async function handleGoogleSignIn() {
		error = null;
		try {
			await auth.signInWithGoogle();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to sign in with Google';
		}
	}
</script>

<svelte:head>
	<title>Sign Up - Stupid Soccer</title>
</svelte:head>

<main class="auth-page">
	<div class="auth-container">
		<div class="auth-header">
			<a href="/" class="auth-logo">STUPID SOCCER</a>
			<h1 class="auth-title">JOIN THE CHAOS</h1>
			<p class="auth-subtitle">Create your account and start building your squad</p>
		</div>

		<div class="auth-card">
			{#if error}
				<div class="auth-error">
					{error}
				</div>
			{/if}

			{#if googleOAuthEnabled}
				<!-- Google Sign In -->
				<button
					type="button"
					onclick={handleGoogleSignIn}
					class="auth-google-btn"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="currentColor"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="currentColor"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="currentColor"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Continue with Google
				</button>

				<div class="auth-divider">
					<span class="auth-divider-text">or sign up with email</span>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="auth-form">
				<div class="form-group">
					<label for="username" class="form-label">Username</label>
					<input
						type="text"
						id="username"
						bind:value={username}
						required
						minlength="3"
						maxlength="20"
						pattern="[a-zA-Z0-9_]+"
						class="form-input"
						placeholder="NoodleArms42"
					/>
					<p class="form-hint">3-20 characters, letters, numbers, underscores</p>
				</div>

				<div class="form-group">
					<label for="email" class="form-label">Email</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						class="form-input"
						placeholder="player@example.com"
					/>
				</div>

				<div class="form-group">
					<label for="password" class="form-label">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						minlength="8"
						class="form-input"
						placeholder="••••••••"
					/>
					<p class="form-hint">Minimum 8 characters</p>
				</div>

				<button type="submit" disabled={loading} class="auth-submit-btn">
					{loading ? 'Creating account...' : 'Create Account'}
				</button>
			</form>

			<p class="auth-switch">
				Already have an account?
				<a href="/login" class="auth-switch-link">Sign in</a>
			</p>
		</div>

		<p class="auth-terms">
			By signing up, you agree to our
			<a href="/terms" class="auth-terms-link">Terms</a>
			and
			<a href="/privacy" class="auth-terms-link">Privacy Policy</a>
		</p>
	</div>
</main>

<style>
	.auth-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.auth-container {
		width: 100%;
		max-width: 28rem;
	}

	.auth-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.auth-logo {
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: var(--color-primary);
		text-decoration: none;
	}

	.auth-title {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		margin-top: 1rem;
		color: var(--color-text-primary);
	}

	.auth-subtitle {
		color: var(--color-text-secondary);
		margin-top: 0.5rem;
	}

	.auth-card {
		background-color: var(--color-surface);
		border-radius: 0.75rem;
		padding: 2rem;
	}

	.auth-error {
		background-color: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.5);
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 1.5rem;
		color: #f87171;
		font-size: 0.875rem;
	}

	.auth-google-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		height: 3rem;
		background-color: transparent;
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		cursor: pointer;
		margin-bottom: 1.5rem;
		transition: background-color 0.2s;
	}

	.auth-google-btn:hover {
		background-color: var(--color-surface-hover);
	}

	.auth-divider {
		position: relative;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.auth-divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background-color: var(--color-border);
	}

	.auth-divider-text {
		position: relative;
		background-color: var(--color-surface);
		padding: 0 0.75rem;
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 1rem;
		background-color: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		color: var(--color-text-primary);
		font-size: 1rem;
	}

	.form-input::placeholder {
		color: var(--color-text-muted);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
	}

	.form-hint {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}

	.auth-submit-btn {
		width: 100%;
		height: 3rem;
		margin-top: 0.5rem;
		background-color: var(--color-primary);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-family: var(--font-pixel);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.auth-submit-btn:hover {
		background-color: var(--color-primary-hover);
	}

	.auth-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.auth-switch {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		margin-top: 1.5rem;
	}

	.auth-switch-link {
		color: var(--color-primary);
		text-decoration: none;
	}

	.auth-switch-link:hover {
		text-decoration: underline;
	}

	.auth-terms {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.75rem;
		margin-top: 1.5rem;
	}

	.auth-terms-link {
		text-decoration: underline;
		color: var(--color-text-muted);
	}
</style>
