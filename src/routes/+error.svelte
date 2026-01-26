<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error {$page.status} - Stupid Soccer</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center px-4">
	<div class="text-center max-w-md">
		<div class="font-pixel text-8xl text-primary mb-6">
			{$page.status}
		</div>

		{#if $page.status === 404}
			<h1 class="font-pixel text-xl text-text-primary mb-4">
				PAGE NOT FOUND
			</h1>
			<p class="text-text-secondary mb-8">
				Looks like this player got traded to a different dimension. The page you're looking for doesn't exist.
			</p>
		{:else if $page.status === 500}
			<h1 class="font-pixel text-xl text-text-primary mb-4">
				SERVER ERROR
			</h1>
			<p class="text-text-secondary mb-8">
				Our goalkeeper fumbled this one. We're working on getting things back up.
			</p>
		{:else if $page.status === 403}
			<h1 class="font-pixel text-xl text-text-primary mb-4">
				ACCESS DENIED
			</h1>
			<p class="text-text-secondary mb-8">
				You don't have permission to access this area. Maybe try signing in?
			</p>
		{:else}
			<h1 class="font-pixel text-xl text-text-primary mb-4">
				SOMETHING WENT WRONG
			</h1>
			<p class="text-text-secondary mb-8">
				{$page.error?.message || 'An unexpected error occurred. Please try again.'}
			</p>
		{/if}

		<div class="flex flex-col sm:flex-row gap-4 justify-center">
			<a href="/" class="btn btn-primary">
				Back to Home
			</a>
			<button onclick={() => history.back()} class="btn btn-secondary">
				Go Back
			</button>
		</div>

		<p class="text-text-muted text-sm mt-8">
			Error Code: {$page.status}
		</p>
	</div>
</main>
