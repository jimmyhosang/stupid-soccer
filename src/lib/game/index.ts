import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

export interface GameConfig {
	width: number;
	height: number;
	parent: HTMLElement;
	difficulty?: 'easy' | 'medium' | 'hard';
	onGoal?: (scorer: 'player' | 'ai') => void;
	onTimeUpdate?: (time: number) => void;
	onGameEnd?: (result: {
		playerScore: number;
		aiScore: number;
		stats?: {
			playerShots: number;
			aiShots: number;
			playerPossessionFrames: number;
			aiPossessionFrames: number;
			playerPasses: number;
			aiPasses: number;
		};
		possession?: { player: number; ai: number };
	}) => void;
}

export function createGame(config: GameConfig): Phaser.Game {
	const gameConfig: Phaser.Types.Core.GameConfig = {
		type: Phaser.AUTO,
		width: config.width,
		height: config.height,
		parent: config.parent,
		backgroundColor: '#1a472a', // Grass green
		physics: {
			default: 'arcade',
			arcade: {
				gravity: { x: 0, y: 0 },
				debug: false
			}
		},
		input: {
			keyboard: true
		},
		scene: [MainScene],
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH
		}
	};

	const game = new Phaser.Game(gameConfig);

	// Store callbacks and settings in registry for scenes to access
	game.registry.set('onGoal', config.onGoal);
	game.registry.set('onTimeUpdate', config.onTimeUpdate);
	game.registry.set('onGameEnd', config.onGameEnd);
	game.registry.set('difficulty', config.difficulty || 'medium');

	return game;
}

export function destroyGame(game: Phaser.Game) {
	game.destroy(true);
}
