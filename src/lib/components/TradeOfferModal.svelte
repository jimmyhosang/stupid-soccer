<script lang="ts">
	import type { Player } from '$lib/types/database';
	import PlayerCard from './PlayerCard.svelte';

	interface Props {
		isOpen: boolean;
		targetPlayer: Player & { sellerName?: string };
		myPlayers: Player[];
		onClose: () => void;
		onSubmit: (offeredPlayer: Player, coinsOffered: number) => void;
	}

	let { isOpen, targetPlayer, myPlayers, onClose, onSubmit }: Props = $props();

	let selectedOfferedPlayer = $state<Player | null>(null);
	let coinsOffered = $state(0);
	let step = $state<'select' | 'confirm'>('select');

	// Only show players not listed and not starters
	const availablePlayers = $derived(myPlayers.filter(p => !p.is_listed && !p.is_starter));

	function selectPlayer(player: Player) {
		selectedOfferedPlayer = player;
	}

	function goToConfirm() {
		if (!selectedOfferedPlayer) return;
		step = 'confirm';
	}

	function goBack() {
		step = 'select';
	}

	function submitOffer() {
		if (!selectedOfferedPlayer) return;
		onSubmit(selectedOfferedPlayer, coinsOffered);
		// Reset state
		selectedOfferedPlayer = null;
		coinsOffered = 0;
		step = 'select';
	}

	function handleClose() {
		selectedOfferedPlayer = null;
		coinsOffered = 0;
		step = 'select';
		onClose();
	}

	function calculateOverall(player: Player) {
		return Math.round((player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5);
	}
</script>

{#if isOpen}
	<div class="modal-overlay" onclick={handleClose}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="modal-header">
				<h2 class="font-pixel text-lg text-text-primary">
					{step === 'select' ? 'SELECT YOUR OFFER' : 'CONFIRM TRADE'}
				</h2>
				<button onclick={handleClose} class="close-btn">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if step === 'select'}
				<!-- Step 1: Select Player -->
				<div class="modal-body">
					<p class="text-text-secondary mb-4">
						Choose a player to offer for <span class="text-primary font-bold">{targetPlayer.name}</span>
					</p>

					{#if availablePlayers.length === 0}
						<div class="empty-state">
							<p class="text-text-muted">No available players to trade</p>
							<p class="text-text-secondary text-sm mt-2">All your players are either starters or already listed</p>
						</div>
					{:else}
						<div class="players-grid">
							{#each availablePlayers as player}
								<button
									class="player-option {selectedOfferedPlayer?.id === player.id ? 'selected' : ''}"
									onclick={() => selectPlayer(player)}
								>
									<div class="player-mini">
										<div class="player-avatar {player.rarity}">
											{player.name.charAt(0)}
										</div>
										<div class="player-info">
											<span class="player-name">{player.name}</span>
											<span class="player-rating">{calculateOverall(player)} OVR</span>
										</div>
									</div>
									{#if selectedOfferedPlayer?.id === player.id}
										<div class="check-mark">
											<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{/if}

					<!-- Coins Sweetener -->
					<div class="coins-section">
						<label class="coins-label">
							<span class="text-text-muted text-sm">Add coins to sweeten the deal (optional)</span>
							<div class="coins-input-wrapper">
								<input
									type="number"
									bind:value={coinsOffered}
									min="0"
									max="10000"
									class="coins-input"
									placeholder="0"
								/>
								<span class="coins-suffix">coins</span>
							</div>
						</label>
					</div>
				</div>

				<div class="modal-footer">
					<button onclick={handleClose} class="btn btn-secondary">Cancel</button>
					<button
						onclick={goToConfirm}
						class="btn btn-primary"
						disabled={!selectedOfferedPlayer}
					>
						Review Offer
					</button>
				</div>

			{:else}
				<!-- Step 2: Confirm -->
				<div class="modal-body">
					<div class="trade-preview">
						<div class="trade-side">
							<span class="trade-label">YOU OFFER</span>
							<div class="trade-card">
								<div class="player-avatar large {selectedOfferedPlayer?.rarity}">
									{selectedOfferedPlayer?.name.charAt(0)}
								</div>
								<span class="trade-player-name">{selectedOfferedPlayer?.name}</span>
								<span class="trade-player-rating">{calculateOverall(selectedOfferedPlayer!)} OVR</span>
							</div>
							{#if coinsOffered > 0}
								<div class="coins-badge">+ {coinsOffered} coins</div>
							{/if}
						</div>

						<div class="trade-arrow">
							<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
						</div>

						<div class="trade-side">
							<span class="trade-label">YOU GET</span>
							<div class="trade-card">
								<div class="player-avatar large {targetPlayer.rarity}">
									{targetPlayer.name.charAt(0)}
								</div>
								<span class="trade-player-name">{targetPlayer.name}</span>
								<span class="trade-player-rating">{calculateOverall(targetPlayer)} OVR</span>
							</div>
						</div>
					</div>

					<p class="trade-note">
						The owner will be notified of your offer. They can accept, reject, or counter-offer.
					</p>
				</div>

				<div class="modal-footer">
					<button onclick={goBack} class="btn btn-secondary">Back</button>
					<button onclick={submitOffer} class="btn btn-primary">
						Send Trade Offer
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 1rem;
		width: 100%;
		max-width: 32rem;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.close-btn {
		color: var(--color-text-muted);
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}

	.players-grid {
		display: grid;
		gap: 0.75rem;
		max-height: 240px;
		overflow-y: auto;
		margin-bottom: 1.5rem;
	}

	.player-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.player-option:hover {
		border-color: var(--color-primary);
	}

	.player-option.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-alpha, rgba(124, 58, 237, 0.1));
	}

	.player-mini {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.player-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: white;
	}

	.player-avatar.common { background: #64748b; }
	.player-avatar.rare { background: #3b82f6; }
	.player-avatar.legendary { background: #f59e0b; }

	.player-avatar.large {
		width: 4rem;
		height: 4rem;
		font-size: 1.5rem;
	}

	.player-info {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.player-name {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.player-rating {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.check-mark {
		color: var(--color-primary);
	}

	.coins-section {
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.coins-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.coins-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.coins-input {
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		color: var(--color-text-primary);
		width: 8rem;
	}

	.coins-suffix {
		color: var(--color-text-muted);
	}

	.trade-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 2rem 0;
	}

	.trade-side {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.trade-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	.trade-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		min-width: 120px;
	}

	.trade-player-name {
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 0.875rem;
		text-align: center;
	}

	.trade-player-rating {
		color: var(--color-primary);
		font-family: var(--font-pixel);
		font-size: 0.75rem;
	}

	.coins-badge {
		background: var(--color-accent);
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.trade-arrow {
		flex-shrink: 0;
	}

	.trade-note {
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		padding: 1rem;
		background: var(--color-background);
		border-radius: 0.5rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--color-primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-muted);
	}
</style>
