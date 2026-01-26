<script lang="ts">
	import type { Player } from '$lib/types/database';

	interface Props {
		isOpen: boolean;
		player: Player | null;
		onClose: () => void;
		onSubmit: (player: Player, price: number) => void;
	}

	let { isOpen, player, onClose, onSubmit }: Props = $props();

	let listPrice = $state(100);

	// Suggested price based on stats and rarity
	const suggestedPrice = $derived(() => {
		if (!player) return 100;
		const overall = Math.round((player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5);
		const rarityMultiplier = player.rarity === 'legendary' ? 3 : player.rarity === 'rare' ? 1.5 : 1;
		return Math.round(overall * 5 * rarityMultiplier);
	});

	function handleSubmit() {
		if (!player || listPrice < 10) return;
		onSubmit(player, listPrice);
		listPrice = 100;
	}

	function handleClose() {
		listPrice = 100;
		onClose();
	}

	function setSuggestedPrice() {
		listPrice = suggestedPrice();
	}

	function calculateOverall(p: Player) {
		return Math.round((p.pace + p.shooting + p.passing + p.defense + p.stamina) / 5);
	}
</script>

{#if isOpen && player}
	<div class="modal-overlay" onclick={handleClose}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="modal-header">
				<h2 class="font-pixel text-lg text-text-primary">LIST FOR TRADE</h2>
				<button onclick={handleClose} class="close-btn">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<!-- Player Preview -->
				<div class="player-preview">
					<div class="player-avatar {player.rarity}">
						{player.name.charAt(0)}
					</div>
					<div class="player-details">
						<h3 class="player-name">{player.name}</h3>
						<div class="player-meta">
							<span class="rarity-badge {player.rarity}">{player.rarity}</span>
							<span class="overall">{calculateOverall(player)} OVR</span>
						</div>
					</div>
				</div>

				<!-- Stats Summary -->
				<div class="stats-grid">
					<div class="stat">
						<span class="stat-label">PAC</span>
						<span class="stat-value">{player.pace}</span>
					</div>
					<div class="stat">
						<span class="stat-label">SHO</span>
						<span class="stat-value">{player.shooting}</span>
					</div>
					<div class="stat">
						<span class="stat-label">PAS</span>
						<span class="stat-value">{player.passing}</span>
					</div>
					<div class="stat">
						<span class="stat-label">DEF</span>
						<span class="stat-value">{player.defense}</span>
					</div>
					<div class="stat">
						<span class="stat-label">STA</span>
						<span class="stat-value">{player.stamina}</span>
					</div>
				</div>

				<!-- Price Input -->
				<div class="price-section">
					<label class="price-label">
						<span class="label-text">Set your asking price</span>
						<div class="price-input-wrapper">
							<input
								type="number"
								bind:value={listPrice}
								min="10"
								max="99999"
								class="price-input"
							/>
							<span class="price-suffix">coins</span>
						</div>
					</label>

					<button class="suggested-btn" onclick={setSuggestedPrice}>
						Use suggested price: <span class="suggested-value">{suggestedPrice()}</span>
					</button>
				</div>

				<!-- Warning -->
				<div class="warning-box">
					<svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<p>Once listed, this player will be unavailable for matches until sold or delisted.</p>
				</div>
			</div>

			<div class="modal-footer">
				<button onclick={handleClose} class="btn btn-secondary">Cancel</button>
				<button onclick={handleSubmit} class="btn btn-primary" disabled={listPrice < 10}>
					List for {listPrice} coins
				</button>
			</div>
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
		max-width: 28rem;
		overflow: hidden;
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
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid var(--color-border);
	}

	.player-preview {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-background);
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.player-avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-pixel);
		font-size: 1.5rem;
		color: white;
	}

	.player-avatar.common { background: #64748b; }
	.player-avatar.rare { background: #3b82f6; }
	.player-avatar.legendary { background: #f59e0b; }

	.player-details {
		flex: 1;
	}

	.player-name {
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 1.125rem;
		margin-bottom: 0.25rem;
	}

	.player-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.rarity-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.rarity-badge.common { background: #475569; color: white; }
	.rarity-badge.rare { background: #3b82f6; color: white; }
	.rarity-badge.legendary { background: #f59e0b; color: #451a03; }

	.overall {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		background: var(--color-background);
		border-radius: 0.5rem;
	}

	.stat-label {
		font-size: 0.625rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	.stat-value {
		font-family: var(--font-pixel);
		font-size: 1rem;
		color: var(--color-primary);
	}

	.price-section {
		margin-bottom: 1.5rem;
	}

	.price-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.label-text {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.price-input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.price-input {
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		color: var(--color-text-primary);
		font-family: var(--font-pixel);
		font-size: 1.25rem;
		width: 10rem;
	}

	.price-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.price-suffix {
		color: var(--color-text-muted);
	}

	.suggested-btn {
		background: var(--color-background);
		border: 1px dashed var(--color-border);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.suggested-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}

	.suggested-value {
		color: var(--color-accent);
		font-weight: 600;
	}

	.warning-box {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.3);
		border-radius: 0.5rem;
	}

	.warning-box p {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		line-height: 1.4;
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
