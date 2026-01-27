<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { createAuthState } from '$lib/stores/auth.svelte';
	import Header from '$lib/components/Header.svelte';

	let { children } = $props();

	// Global auth context
	const auth = createAuthState();

	onMount(() => {
		auth.init();
	});

	// Pages where we don't show the header (landing, auth pages only)
	const noHeaderPages = ['/', '/login', '/signup', '/auth/callback'];
	const showHeader = $derived(!noHeaderPages.includes($page.url.pathname));
</script>

<div class="min-h-screen bg-background text-text-primary">
	{#if showHeader && !auth.loading}
		<Header
			isAuthenticated={auth.isAuthenticated}
			username={auth.profile?.username || ''}
			coins={auth.profile?.coins || 0}
		/>
	{/if}
	{@render children()}
</div>
