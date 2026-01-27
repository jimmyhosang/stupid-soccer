<script lang="ts">
	import type { Player } from '$lib/types/database';
	import { xpProgress, formatXp, getLevelTier } from '$lib/xp';

	interface Props {
		player: Player;
		size?: 'sm' | 'md' | 'lg';
		showStats?: boolean;
		showXp?: boolean;
		onClick?: () => void;
	}

	let { player, size = 'md', showStats = false, showXp = true, onClick }: Props = $props();

	const sizeClasses = {
		sm: 'w-32 h-44',
		md: 'w-48 h-64',
		lg: 'w-64 h-80'
	};

	const rarityColors = {
		common: 'from-slate-600 to-slate-800 border-slate-500',
		rare: 'from-blue-600 to-blue-900 border-blue-400',
		legendary: 'from-amber-500 to-amber-800 border-amber-300'
	};

	const rarityGlow = {
		common: '',
		rare: 'shadow-blue-500/30',
		legendary: 'shadow-amber-500/50 animate-pulse-glow'
	};

	const overallRating = Math.round(
		(player.pace + player.shooting + player.passing + player.defense + player.stamina) / 5
	);

	// XP progress calculations
	const level = player.level || 1;
	const xp = player.xp || 0;
	const progress = xpProgress(xp, level);
	const progressPercent = Math.round(progress * 100);
	const levelTier = getLevelTier(level);
</script>

<button
	class="relative {sizeClasses[size]} rounded-xl bg-gradient-to-b {rarityColors[player.rarity]} border-2 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl {rarityGlow[player.rarity]} cursor-pointer"
	onclick={onClick}
>
	<!-- Level Badge -->
	{#if showXp}
		<div class="absolute top-2 left-2 flex flex-col items-center">
			<div class="font-pixel text-2xl text-white drop-shadow-lg">
				{overallRating}
			</div>
			<div class="px-1.5 py-0.5 rounded bg-primary/90 text-[10px] font-bold text-white mt-0.5">
				LVL {level}
			</div>
		</div>
	{:else}
		<!-- Overall Rating (original) -->
		<div class="absolute top-2 left-2 font-pixel text-2xl text-white drop-shadow-lg">
			{overallRating}
		</div>
	{/if}

	<!-- Rarity Badge -->
	<div class="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase
		{player.rarity === 'legendary' ? 'bg-amber-400 text-amber-900' :
		 player.rarity === 'rare' ? 'bg-blue-400 text-blue-900' :
		 'bg-slate-400 text-slate-900'}">
		{player.rarity}
	</div>

	<!-- Generation Badge (if bred) -->
	{#if player.generation > 1}
		<div class="absolute top-10 right-2 px-1.5 py-0.5 rounded bg-purple-500/90 text-[9px] font-bold text-white">
			GEN {player.generation}
		</div>
	{/if}

	<!-- Player Sprite Area -->
	<div class="flex items-center justify-center h-3/5 mt-8">
		<div class="w-20 h-24 bg-surface/50 rounded-lg flex items-center justify-center">
			<!-- Sprite would render here based on sprite_config -->
			<span class="text-4xl">⚽</span>
		</div>
	</div>

	<!-- Player Name & XP Bar -->
	<div class="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
		<p class="font-pixel text-xs text-center text-white truncate px-1">
			{player.name}
		</p>

		<!-- XP Progress Bar -->
		{#if showXp && level < 99}
			<div class="mt-1.5 px-1">
				<div class="h-1.5 bg-black/50 rounded-full overflow-hidden">
					<div
						class="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
						style="width: {progressPercent}%"
					></div>
				</div>
				<div class="flex justify-between text-[8px] mt-0.5">
					<span class="text-text-muted">{formatXp(xp)} XP</span>
					<span class="text-accent">{progressPercent}%</span>
				</div>
			</div>
		{:else if showXp && level >= 99}
			<div class="mt-1.5 px-1">
				<div class="text-[9px] text-center text-amber-400 font-bold">
					MAX LEVEL
				</div>
			</div>
		{/if}

		{#if showStats}
			<div class="grid grid-cols-5 gap-1 mt-2 text-[8px] text-center">
				<div>
					<div class="text-accent">{player.pace}</div>
					<div class="text-text-muted">PAC</div>
				</div>
				<div>
					<div class="text-accent">{player.shooting}</div>
					<div class="text-text-muted">SHO</div>
				</div>
				<div>
					<div class="text-accent">{player.passing}</div>
					<div class="text-text-muted">PAS</div>
				</div>
				<div>
					<div class="text-accent">{player.defense}</div>
					<div class="text-text-muted">DEF</div>
				</div>
				<div>
					<div class="text-accent">{player.stamina}</div>
					<div class="text-text-muted">STA</div>
				</div>
			</div>
		{/if}
	</div>
</button>
