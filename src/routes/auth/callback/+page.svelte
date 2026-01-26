<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/stores/auth.svelte';

	onMount(async () => {
		// Handle the OAuth callback
		const { data, error } = await supabase.auth.getSession();

		if (error) {
			console.error('Auth callback error:', error);
			goto('/login?error=auth_failed');
			return;
		}

		if (data.session) {
			// Successfully authenticated
			goto('/');
		} else {
			// No session, redirect to login
			goto('/login');
		}
	});
</script>

<main class="min-h-screen flex items-center justify-center">
	<div class="text-center">
		<div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
		<p class="text-text-secondary">Completing sign in...</p>
	</div>
</main>
