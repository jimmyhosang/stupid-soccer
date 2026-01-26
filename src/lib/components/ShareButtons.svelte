<script lang="ts">
	import type { Player } from '$lib/types/database';
	import ShareCard from './ShareCard.svelte';
	import {
		generateShareImage,
		downloadShareImage,
		shareToTwitter,
		copyShareLink,
		nativeShare
	} from '$lib/utils/shareImage';

	interface Props {
		player: Player;
		onClose?: () => void;
	}

	let { player, onClose }: Props = $props();

	let shareCardElement: HTMLDivElement | null = $state(null);
	let isGenerating = $state(false);
	let copySuccess = $state(false);
	let error = $state<string | null>(null);

	async function handleDownload() {
		if (!shareCardElement) return;

		isGenerating = true;
		error = null;

		try {
			await downloadShareImage(shareCardElement, player.name);
		} catch (e) {
			error = 'Failed to generate image';
			console.error(e);
		} finally {
			isGenerating = false;
		}
	}

	async function handleTwitterShare() {
		shareToTwitter(player);
	}

	async function handleCopyLink() {
		const success = await copyShareLink(player.id);
		if (success) {
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		}
	}

	async function handleNativeShare() {
		if (!shareCardElement) {
			shareToTwitter(player);
			return;
		}

		try {
			const blob = await generateShareImage(shareCardElement);
			const success = await nativeShare(player, blob);
			if (!success) {
				// Fallback to Twitter share
				shareToTwitter(player);
			}
		} catch {
			shareToTwitter(player);
		}
	}
</script>

<div class="share-modal-overlay" role="dialog" aria-modal="true">
	<div class="share-modal">
		<!-- Header -->
		<div class="modal-header">
			<h2 class="modal-title">Share Your Pull!</h2>
			{#if onClose}
				<button class="close-btn" onclick={onClose} aria-label="Close">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Share Card Preview (hidden, used for image generation) -->
		<div class="card-preview-container">
			<div bind:this={shareCardElement} class="card-preview">
				<ShareCard {player} />
			</div>
		</div>

		<!-- Visible Preview (scaled) -->
		<div class="preview-scaled">
			<ShareCard {player} />
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<!-- Share Buttons -->
		<div class="share-buttons">
			<button class="share-btn twitter" onclick={handleTwitterShare}>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
				</svg>
				Share on X
			</button>

			<button class="share-btn download" onclick={handleDownload} disabled={isGenerating}>
				{#if isGenerating}
					<span class="spinner"></span>
					Generating...
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Download Image
				{/if}
			</button>

			<button class="share-btn copy" onclick={handleCopyLink}>
				{#if copySuccess}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Copied!
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
					</svg>
					Copy Link
				{/if}
			</button>

			<!-- Native share for mobile -->
			<button class="share-btn native" onclick={handleNativeShare}>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
				</svg>
				Share...
			</button>
		</div>
	</div>
</div>

<style>
	.share-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.share-modal {
		background: var(--color-surface);
		border-radius: 1rem;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title {
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		color: var(--color-text-primary);
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.5rem;
	}

	.close-btn:hover {
		color: var(--color-text-primary);
	}

	/* Hidden container for full-size image generation */
	.card-preview-container {
		position: absolute;
		left: -9999px;
		top: -9999px;
	}

	.card-preview {
		width: 1200px;
		height: 630px;
	}

	/* Visible scaled preview */
	.preview-scaled {
		padding: 1rem;
		transform: scale(0.45);
		transform-origin: top center;
		height: 300px;
		overflow: hidden;
	}

	.error-message {
		color: #ef4444;
		text-align: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.share-buttons {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		padding: 1.5rem;
	}

	.share-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.share-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.share-btn.twitter {
		background: #000;
		color: white;
	}

	.share-btn.twitter:hover:not(:disabled) {
		background: #1a1a1a;
	}

	.share-btn.download {
		background: var(--color-primary);
		color: white;
	}

	.share-btn.download:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.share-btn.copy {
		background: var(--color-surface);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border);
	}

	.share-btn.copy:hover:not(:disabled) {
		background: var(--color-surface-hover);
	}

	.share-btn.native {
		background: var(--color-secondary);
		color: white;
	}

	.share-btn.native:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 480px) {
		.share-buttons {
			grid-template-columns: 1fr;
		}

		.preview-scaled {
			transform: scale(0.3);
			height: 200px;
		}
	}
</style>
