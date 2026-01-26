<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { createAuthState } from '$lib/stores/auth.svelte';

	let { children } = $props();

	// Global auth context
	const auth = createAuthState();

	onMount(() => {
		auth.init();
	});
</script>

<div class="min-h-screen bg-background text-text-primary">
	{@render children()}
</div>
