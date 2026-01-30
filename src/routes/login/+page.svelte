<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Redirect to play - no login needed for free-to-play mode
	onMount(() => {
		goto('/play');
	});
</script>

<svelte:head>
	<title>Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center">
	<p class="text-text-secondary">Redirecting to game...</p>
</main>
