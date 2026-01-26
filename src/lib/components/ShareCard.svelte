<script lang="ts">
	import type { Player } from '$lib/types/database';

	interface Props {
		player: Player;
	}

	let { player }: Props = $props();

	function getRarityColor(rarity: string) {
		switch (rarity) {
			case 'legendary':
				return 'from-amber-500 to-amber-700';
			case 'rare':
				return 'from-blue-500 to-blue-700';
			default:
				return 'from-slate-500 to-slate-700';
		}
	}

	function getRarityBg(rarity: string) {
		switch (rarity) {
			case 'legendary':
				return '#f59e0b';
			case 'rare':
				return '#3b82f6';
			default:
				return '#64748b';
		}
	}

	function calculateOverall(p: Player) {
		return Math.round((p.pace + p.shooting + p.passing + p.defense + p.stamina) / 5);
	}
</script>

<!-- Share card optimized for social media (1200x630px aspect ratio) -->
<div
	class="share-card"
	style="--rarity-color: {getRarityBg(player.rarity)}"
>
	<div class="card-inner bg-gradient-to-br {getRarityColor(player.rarity)}">
		<!-- Header with branding -->
		<div class="card-header">
			<div class="rarity-badge">{player.rarity.toUpperCase()}</div>
			<div class="branding">stupidsoccer.gg</div>
		</div>

		<!-- Main content -->
		<div class="card-content">
			<!-- Left: Player info -->
			<div class="player-info">
				<div class="player-sprite">
					<!-- Placeholder sprite representation -->
					<div class="sprite-circle">
						<span class="sprite-emoji">⚽</span>
					</div>
				</div>

				<h2 class="player-name">{player.name}</h2>

				<div class="overall-rating">
					<span class="rating-value">{calculateOverall(player)}</span>
					<span class="rating-label">OVR</span>
				</div>
			</div>

			<!-- Right: Stats -->
			<div class="stats-panel">
				<div class="stat-row">
					<span class="stat-label">PAC</span>
					<div class="stat-bar">
						<div class="stat-fill" style="width: {player.pace}%"></div>
					</div>
					<span class="stat-value">{player.pace}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">SHO</span>
					<div class="stat-bar">
						<div class="stat-fill" style="width: {player.shooting}%"></div>
					</div>
					<span class="stat-value">{player.shooting}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">PAS</span>
					<div class="stat-bar">
						<div class="stat-fill" style="width: {player.passing}%"></div>
					</div>
					<span class="stat-value">{player.passing}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">DEF</span>
					<div class="stat-bar">
						<div class="stat-fill" style="width: {player.defense}%"></div>
					</div>
					<span class="stat-value">{player.defense}</span>
				</div>
				<div class="stat-row">
					<span class="stat-label">STA</span>
					<div class="stat-bar">
						<div class="stat-fill" style="width: {player.stamina}%"></div>
					</div>
					<span class="stat-value">{player.stamina}</span>
				</div>
			</div>
		</div>

		<!-- Backstory snippet -->
		<div class="backstory">
			<p>"{player.backstory.slice(0, 120)}{player.backstory.length > 120 ? '...' : ''}"</p>
		</div>
	</div>
</div>

<style>
	.share-card {
		width: 1200px;
		height: 630px;
		font-family: system-ui, -apple-system, sans-serif;
		overflow: hidden;
	}

	.card-inner {
		width: 100%;
		height: 100%;
		padding: 40px;
		display: flex;
		flex-direction: column;
		color: white;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30px;
	}

	.rarity-badge {
		background: rgba(0, 0, 0, 0.3);
		padding: 8px 20px;
		border-radius: 20px;
		font-weight: bold;
		font-size: 14px;
		letter-spacing: 2px;
	}

	.branding {
		font-size: 18px;
		font-weight: bold;
		opacity: 0.9;
	}

	.card-content {
		display: flex;
		flex: 1;
		gap: 60px;
	}

	.player-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.player-sprite {
		margin-bottom: 20px;
	}

	.sprite-circle {
		width: 180px;
		height: 180px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 4px solid rgba(255, 255, 255, 0.4);
	}

	.sprite-emoji {
		font-size: 80px;
	}

	.player-name {
		font-size: 42px;
		font-weight: bold;
		text-align: center;
		margin-bottom: 15px;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
	}

	.overall-rating {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(0, 0, 0, 0.3);
		padding: 15px 30px;
		border-radius: 15px;
	}

	.rating-value {
		font-size: 56px;
		font-weight: bold;
		line-height: 1;
	}

	.rating-label {
		font-size: 16px;
		opacity: 0.8;
		letter-spacing: 2px;
	}

	.stats-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 20px;
		background: rgba(0, 0, 0, 0.2);
		padding: 30px;
		border-radius: 20px;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 15px;
	}

	.stat-label {
		width: 50px;
		font-weight: bold;
		font-size: 18px;
	}

	.stat-bar {
		flex: 1;
		height: 20px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 10px;
		overflow: hidden;
	}

	.stat-fill {
		height: 100%;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 10px;
		transition: width 0.3s ease;
	}

	.stat-value {
		width: 40px;
		text-align: right;
		font-weight: bold;
		font-size: 20px;
	}

	.backstory {
		margin-top: 30px;
		padding: 20px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 15px;
		text-align: center;
	}

	.backstory p {
		font-size: 18px;
		font-style: italic;
		opacity: 0.9;
		margin: 0;
	}
</style>
