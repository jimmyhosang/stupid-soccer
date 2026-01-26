import Phaser from 'phaser';
import { generateTeamSprites } from '../sprites/PlayerSprite';
import {
	resumeAudio,
	playKickSound,
	playGoalSound,
	playWhistleSound,
	playPassSound,
	playCrowdCheer
} from '../audio/SoundEffects';

const PITCH_COLOR = 0x1a472a;
const LINE_COLOR = 0xffffff;
const PLAYER_COLOR = 0x7c3aed; // Violet (player team)
const AI_COLOR = 0xef4444; // Red (AI team)
const BALL_COLOR = 0xffffff;

interface PlayerSprite extends Phaser.Physics.Arcade.Sprite {
	isAI: boolean;
	speed: number;
	targetX?: number;
	targetY?: number;
}

export class MainScene extends Phaser.Scene {
	private ball!: Phaser.Physics.Arcade.Sprite;
	private ballShadow!: Phaser.GameObjects.Ellipse;
	private playerTeam: PlayerSprite[] = [];
	private aiTeam: PlayerSprite[] = [];
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private spaceKey!: Phaser.Input.Keyboard.Key;
	private selectedPlayer: PlayerSprite | null = null;
	private playerScore = 0;
	private aiScore = 0;
	private scoreText!: Phaser.GameObjects.Text;
	private timerText!: Phaser.GameObjects.Text;
	private goalText!: Phaser.GameObjects.Text;
	private gameTime = 180; // 3 minutes in seconds
	private lastKicker: 'player' | 'ai' | null = null;
	private ballCarrier: PlayerSprite | null = null;
	private dribbleOffset = 20;
	private facingAngle = Math.PI; // Default facing left towards goal
	private passIndicator!: Phaser.GameObjects.Graphics;
	private selectionIndicator!: Phaser.GameObjects.Ellipse;
	private lastAutoSwitch = 0; // Cooldown for auto-switch
	private isPaused = false; // For goal celebration pause
	private isHalftime = false;
	private halftimeShown = false;

	// Stats tracking
	private stats = {
		playerShots: 0,
		aiShots: 0,
		playerPossessionFrames: 0,
		aiPossessionFrames: 0,
		playerPasses: 0,
		aiPasses: 0
	};

	// Overlay elements
	private overlayBg!: Phaser.GameObjects.Rectangle;
	private overlayTitle!: Phaser.GameObjects.Text;
	private overlayStats!: Phaser.GameObjects.Text;
	private overlayPrompt!: Phaser.GameObjects.Text;

	// Difficulty settings (set from registry)
	private aiSpeed = 100;
	private aiAggression = 0.3; // How likely AI is to attack
	private aiShootChance = 0.02; // Per-frame chance to shoot when in range

	// Acceleration settings
	private readonly ACCELERATION = 800;
	private readonly MAX_SPEED = 200;
	private readonly DRAG = 600;

	// Touch input state (read from registry)
	private touchInput = { left: false, right: false, up: false, down: false, kick: false, switch: false };
	private lastTouchKick = false;
	private lastTouchSwitch = false;

	constructor() {
		super({ key: 'MainScene' });
	}

	private setupDifficulty(difficulty: string) {
		switch (difficulty) {
			case 'easy':
				this.aiSpeed = 70;
				this.aiAggression = 0.2;
				this.aiShootChance = 0.01;
				break;
			case 'medium':
				this.aiSpeed = 100;
				this.aiAggression = 0.4;
				this.aiShootChance = 0.025;
				break;
			case 'hard':
				this.aiSpeed = 140;
				this.aiAggression = 0.6;
				this.aiShootChance = 0.04;
				break;
		}
	}

	create() {
		const { width, height } = this.scale;

		// Get difficulty from registry
		const difficulty = this.registry.get('difficulty') || 'medium';
		this.setupDifficulty(difficulty);

		// Draw pitch
		this.drawPitch(width, height);

		// Create pass indicator (drawn above pitch, below players)
		this.passIndicator = this.add.graphics();

		// Create selection indicator (green circle under selected player)
		this.selectionIndicator = this.add.ellipse(0, 0, 28, 12, 0x00ff00, 0.6);
		this.selectionIndicator.setDepth(1); // Below players

		// Create ball shadow first (so it's behind ball)
		this.ballShadow = this.add.ellipse(width / 2, height / 2 + 8, 20, 8, 0x000000, 0.3);
		this.ballShadow.setDepth(2);

		// Create ball
		this.createBall(width, height);

		// Create players
		this.createPlayers(width, height);

		// Setup input
		if (this.input.keyboard) {
			this.cursors = this.input.keyboard.createCursorKeys();
			this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

			// S to switch players manually
			this.input.keyboard.on('keydown-S', () => {
				const currentIndex = this.playerTeam.indexOf(this.selectedPlayer!);
				const nextIndex = (currentIndex + 1) % this.playerTeam.length;
				this.selectedPlayer = this.playerTeam[nextIndex];
				this.highlightSelectedPlayer();
			});
		}

		// Setup collisions
		this.setupCollisions();

		// Create UI
		this.createUI(width);

		// Game timer
		this.time.addEvent({
			delay: 1000,
			callback: this.updateTimer,
			callbackScope: this,
			loop: true
		});

		// Select first player
		this.selectedPlayer = this.playerTeam[0];
		this.highlightSelectedPlayer();

		// Resume audio on first input and play kickoff whistle
		if (this.input.keyboard) {
			this.input.keyboard.once('keydown', () => {
				resumeAudio();
				playWhistleSound('short');
			});
		}

		// Also resume audio on first touch (for mobile)
		this.input.once('pointerdown', () => {
			resumeAudio();
			playWhistleSound('short');
		});
	}

	private drawPitch(width: number, height: number) {
		const graphics = this.add.graphics();

		// Pitch background
		graphics.fillStyle(PITCH_COLOR);
		graphics.fillRect(0, 0, width, height);

		// Pitch lines
		graphics.lineStyle(2, LINE_COLOR, 0.8);

		// Outer boundary
		const margin = 20;
		graphics.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

		// Center line
		graphics.lineBetween(width / 2, margin, width / 2, height - margin);

		// Center circle
		graphics.strokeCircle(width / 2, height / 2, 50);

		// Goals
		const goalWidth = 10;
		const goalHeight = 100;
		const goalY = (height - goalHeight) / 2;

		// Left goal (AI)
		graphics.fillStyle(AI_COLOR, 0.3);
		graphics.fillRect(margin - goalWidth, goalY, goalWidth, goalHeight);
		graphics.strokeRect(margin - goalWidth, goalY, goalWidth, goalHeight);

		// Right goal (Player)
		graphics.fillStyle(PLAYER_COLOR, 0.3);
		graphics.fillRect(width - margin, goalY, goalWidth, goalHeight);
		graphics.strokeRect(width - margin, goalY, goalWidth, goalHeight);

		// Penalty areas
		const penaltyWidth = 60;
		const penaltyHeight = 150;
		const penaltyY = (height - penaltyHeight) / 2;

		graphics.strokeRect(margin, penaltyY, penaltyWidth, penaltyHeight);
		graphics.strokeRect(width - margin - penaltyWidth, penaltyY, penaltyWidth, penaltyHeight);
	}

	private createBall(width: number, height: number) {
		// Bigger ball (12px radius = 24px diameter) for better visibility
		const ballGraphics = this.make.graphics({ x: 0, y: 0 });
		ballGraphics.fillStyle(BALL_COLOR);
		ballGraphics.fillCircle(12, 12, 12);
		// Add black outline for contrast
		ballGraphics.lineStyle(2, 0x000000, 0.5);
		ballGraphics.strokeCircle(12, 12, 11);
		ballGraphics.generateTexture('ball', 24, 24);
		ballGraphics.destroy();

		this.ball = this.physics.add.sprite(width / 2, height / 2, 'ball');
		this.ball.setCircle(12);
		this.ball.setBounce(0.8);
		this.ball.setDrag(150);
		this.ball.setMaxVelocity(400);
		this.ball.setCollideWorldBounds(true);
		this.ball.setDepth(10); // Ball above shadow
	}

	private createPlayers(width: number, height: number) {
		// Generate pixel art sprites for both teams (3 unique players each)
		generateTeamSprites(this, 'player', PLAYER_COLOR, 3);
		generateTeamSprites(this, 'ai', AI_COLOR, 3);

		// Player team positions (right side, defending right goal)
		const playerPositions = [
			{ x: width * 0.75, y: height * 0.3 },
			{ x: width * 0.75, y: height * 0.7 },
			{ x: width * 0.85, y: height * 0.5 }
		];

		// AI team positions (left side, defending left goal)
		const aiPositions = [
			{ x: width * 0.25, y: height * 0.3 },
			{ x: width * 0.25, y: height * 0.7 },
			{ x: width * 0.15, y: height * 0.5 }
		];

		// Create player team with unique sprites
		playerPositions.forEach((pos, index) => {
			const player = this.physics.add.sprite(pos.x, pos.y, `player_${index}`) as PlayerSprite;
			// Hitbox centered on lower body (feet area) - sprite is 24x32
			player.setSize(16, 16);
			player.setOffset(4, 14);
			player.setCollideWorldBounds(true);
			player.setDrag(this.DRAG);
			player.setMaxVelocity(this.MAX_SPEED);
			player.setDepth(5);
			player.isAI = false;
			player.speed = this.MAX_SPEED;
			this.playerTeam.push(player);
		});

		// Create AI team with unique sprites
		aiPositions.forEach((pos, index) => {
			const ai = this.physics.add.sprite(pos.x, pos.y, `ai_${index}`) as PlayerSprite;
			// Hitbox centered on lower body
			ai.setSize(16, 16);
			ai.setOffset(4, 14);
			ai.setCollideWorldBounds(true);
			ai.setDrag(400);
			ai.setMaxVelocity(this.aiSpeed);
			ai.setDepth(5);
			ai.isAI = true;
			ai.speed = this.aiSpeed;
			this.aiTeam.push(ai);
		});
	}

	private setupCollisions() {
		// Ball collisions with players - handles possession
		this.physics.add.overlap(this.ball, this.playerTeam, (ball, player) => {
			if (!this.ballCarrier) {
				this.ballCarrier = player as PlayerSprite;
				this.lastKicker = 'player';

				// Auto-switch to player who got the ball
				if (player !== this.selectedPlayer) {
					this.selectedPlayer = player as PlayerSprite;
					this.highlightSelectedPlayer();
				}
			}
		});

		this.physics.add.overlap(this.ball, this.aiTeam, (ball, player) => {
			if (!this.ballCarrier) {
				this.ballCarrier = player as PlayerSprite;
				this.lastKicker = 'ai';
			} else if (this.ballCarrier.isAI === false) {
				// AI tackle - 20% chance
				const dist = Phaser.Math.Distance.Between(
					(player as PlayerSprite).x,
					(player as PlayerSprite).y,
					this.ball.x,
					this.ball.y
				);
				if (dist < 20 && Math.random() < 0.2) {
					this.ballCarrier = player as PlayerSprite;
					this.lastKicker = 'ai';
				}
			}
		});

		// Player collisions
		this.physics.add.collider(this.playerTeam, this.playerTeam);
		this.physics.add.collider(this.aiTeam, this.aiTeam);
		this.physics.add.collider(this.playerTeam, this.aiTeam, (p1, p2) => {
			if (this.ballCarrier === p1 || this.ballCarrier === p2) {
				if (Math.random() < 0.3) {
					this.ballCarrier = null;
				}
			}
		});
	}

	private createUI(width: number) {
		const { height } = this.scale;

		this.scoreText = this.add.text(width / 2, 10, '0 - 0', {
			fontFamily: '"Press Start 2P"',
			fontSize: '16px',
			color: '#ffffff'
		}).setOrigin(0.5, 0);

		this.timerText = this.add.text(width / 2, 35, '3:00', {
			fontFamily: 'Inter',
			fontSize: '14px',
			color: '#94a3b8'
		}).setOrigin(0.5, 0);

		this.add.text(10, 10, 'Arrows: Move | Space: Pass/Shoot | S: Switch', {
			fontFamily: 'Inter',
			fontSize: '10px',
			color: '#64748b'
		});

		// Goal celebration text (hidden by default)
		this.goalText = this.add.text(width / 2, height / 2, 'GOAL!', {
			fontFamily: '"Press Start 2P"',
			fontSize: '48px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 6
		}).setOrigin(0.5).setAlpha(0).setDepth(100);

		// Halftime/Fulltime overlay (hidden by default)
		this.overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
		this.overlayBg.setDepth(200).setVisible(false);

		this.overlayTitle = this.add.text(width / 2, 80, '', {
			fontFamily: '"Press Start 2P"',
			fontSize: '32px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4
		}).setOrigin(0.5).setDepth(201).setVisible(false);

		this.overlayStats = this.add.text(width / 2, height / 2, '', {
			fontFamily: 'Inter',
			fontSize: '16px',
			color: '#ffffff',
			align: 'center',
			lineSpacing: 12
		}).setOrigin(0.5).setDepth(201).setVisible(false);

		this.overlayPrompt = this.add.text(width / 2, height - 60, '', {
			fontFamily: '"Press Start 2P"',
			fontSize: '12px',
			color: '#94a3b8'
		}).setOrigin(0.5).setDepth(201).setVisible(false);
	}

	private highlightSelectedPlayer() {
		// Clear all tints
		this.playerTeam.forEach((p) => p.clearTint());
		// Move selection indicator to selected player
		if (this.selectedPlayer) {
			this.selectionIndicator.setPosition(this.selectedPlayer.x, this.selectedPlayer.y + 14);
			this.selectionIndicator.setVisible(true);
		}
	}

	private updateSelectionIndicator() {
		// Keep indicator following selected player
		if (this.selectedPlayer) {
			this.selectionIndicator.setPosition(this.selectedPlayer.x, this.selectedPlayer.y + 14);
		}
	}

	private updateSpriteDirections() {
		// Flip all player sprites based on their movement direction
		[...this.playerTeam, ...this.aiTeam].forEach((player) => {
			const vx = player.body?.velocity.x || 0;
			if (Math.abs(vx) > 10) {
				// Flip sprite to face movement direction
				player.setFlipX(vx < 0);
			}
		});
	}

	private getPassTarget(): PlayerSprite | null {
		if (!this.selectedPlayer) return null;

		const player = this.selectedPlayer;
		let bestTarget: PlayerSprite | null = null;
		let bestScore = -Infinity;

		this.playerTeam.forEach((teammate) => {
			if (teammate === player) return;

			const dist = Phaser.Math.Distance.Between(player.x, player.y, teammate.x, teammate.y);
			if (dist < 40 || dist > 400) return;

			const angleToTeammate = Phaser.Math.Angle.Between(player.x, player.y, teammate.x, teammate.y);
			let angleDiff = Math.abs(angleToTeammate - this.facingAngle);
			if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

			// Consider teammates within 90 degrees of facing direction
			if (angleDiff > Math.PI / 2) return;

			const angleScore = (Math.PI / 2 - angleDiff) * 200;
			const distScore = -dist * 0.3;
			const score = angleScore + distScore;

			if (score > bestScore) {
				bestScore = score;
				bestTarget = teammate;
			}
		});

		return bestTarget;
	}

	private drawPassIndicator() {
		this.passIndicator.clear();

		if (!this.selectedPlayer || this.ballCarrier !== this.selectedPlayer) return;

		const player = this.selectedPlayer;
		const target = this.getPassTarget();

		if (target) {
			// Draw line to pass target
			this.passIndicator.lineStyle(2, 0x00ff00, 0.5);
			this.passIndicator.lineBetween(player.x, player.y, target.x, target.y);

			// Draw circle around target
			this.passIndicator.lineStyle(2, 0x00ff00, 0.8);
			this.passIndicator.strokeCircle(target.x, target.y, 18);
		} else {
			// Draw kick direction indicator
			const indicatorLength = 50;
			const endX = player.x + Math.cos(this.facingAngle) * indicatorLength;
			const endY = player.y + Math.sin(this.facingAngle) * indicatorLength;

			this.passIndicator.lineStyle(2, 0xffff00, 0.5);
			this.passIndicator.lineBetween(player.x, player.y, endX, endY);
		}
	}

	private kickBall() {
		if (!this.selectedPlayer) return;

		const player = this.selectedPlayer;
		const ball = this.ball;

		const hasBall = this.ballCarrier === player;
		const distance = Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y);

		if (!hasBall && distance > 40) return;

		this.ballCarrier = null;

		const target = this.getPassTarget();
		const kickPower = 300;

		if (target) {
			// Pass to teammate
			const passAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
			ball.setVelocity(Math.cos(passAngle) * kickPower, Math.sin(passAngle) * kickPower);
			this.stats.playerPasses++;
			playPassSound();
		} else {
			// Shot or clearance - count as shot if aiming towards goal
			ball.setVelocity(Math.cos(this.facingAngle) * kickPower, Math.sin(this.facingAngle) * kickPower);
			// Check if shooting towards AI goal (left side, x < 0.3 width)
			if (Math.cos(this.facingAngle) < -0.3) {
				this.stats.playerShots++;
			}
			playKickSound();
		}
		this.lastKicker = 'player';

		// Kick feedback: brief flash and scale
		this.tweens.add({
			targets: ball,
			scaleX: 1.3,
			scaleY: 1.3,
			duration: 80,
			yoyo: true,
			ease: 'Quad.out'
		});
		ball.setTint(0xffff00);
		this.time.delayedCall(100, () => ball.clearTint());
	}

	private autoSwitchToNearest() {
		// Don't auto-switch if we have the ball or cooldown active
		if (this.ballCarrier && !this.ballCarrier.isAI) return;
		if (this.time.now - this.lastAutoSwitch < 500) return;

		// Find nearest player to ball
		let nearestPlayer: PlayerSprite | null = null;
		let nearestDist = Infinity;

		this.playerTeam.forEach((player) => {
			const dist = Phaser.Math.Distance.Between(player.x, player.y, this.ball.x, this.ball.y);
			if (dist < nearestDist) {
				nearestDist = dist;
				nearestPlayer = player;
			}
		});

		if (nearestPlayer && nearestPlayer !== this.selectedPlayer) {
			this.selectedPlayer = nearestPlayer;
			this.highlightSelectedPlayer();
			this.lastAutoSwitch = this.time.now;
		}
	}

	private updateTimer() {
		this.gameTime--;

		if (this.gameTime <= 0) {
			this.showFulltime();
			return;
		}

		// Halftime at 90 seconds (1:30)
		if (this.gameTime === 90 && !this.halftimeShown) {
			this.showHalftime();
			return;
		}

		const minutes = Math.floor(this.gameTime / 60);
		const seconds = this.gameTime % 60;
		this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
	}

	private calculatePossession(): { player: number; ai: number } {
		const total = this.stats.playerPossessionFrames + this.stats.aiPossessionFrames;
		if (total === 0) return { player: 50, ai: 50 };
		return {
			player: Math.round((this.stats.playerPossessionFrames / total) * 100),
			ai: Math.round((this.stats.aiPossessionFrames / total) * 100)
		};
	}

	private showHalftime() {
		this.isHalftime = true;
		this.halftimeShown = true;
		this.isPaused = true;

		// Whistle for halftime
		playWhistleSound('long');

		const possession = this.calculatePossession();

		this.overlayBg.setVisible(true);
		this.overlayTitle.setText('HALF TIME').setVisible(true);
		this.overlayStats.setText(
			`SCORE: ${this.playerScore} - ${this.aiScore}\n\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n\n` +
			`         YOU    AI\n` +
			`SHOTS     ${this.stats.playerShots.toString().padStart(2)}    ${this.stats.aiShots.toString().padStart(2)}\n` +
			`PASSES    ${this.stats.playerPasses.toString().padStart(2)}    ${this.stats.aiPasses.toString().padStart(2)}\n` +
			`POSSESS  ${possession.player}%   ${possession.ai}%`
		).setVisible(true);
		this.overlayPrompt.setText('PRESS SPACE TO CONTINUE').setVisible(true);

		// Add blinking effect to prompt
		this.tweens.add({
			targets: this.overlayPrompt,
			alpha: 0.3,
			duration: 500,
			yoyo: true,
			repeat: -1
		});

		// Listen for space to continue (keyboard)
		if (this.input.keyboard) {
			this.input.keyboard.once('keydown-SPACE', () => {
				this.hideOverlay();
				this.isHalftime = false;
				this.isPaused = false;
				this.resetPositions();
			});
		}

		// Also allow touch/click to continue
		this.input.once('pointerdown', () => {
			if (this.isHalftime) {
				this.hideOverlay();
				this.isHalftime = false;
				this.isPaused = false;
				this.resetPositions();
			}
		});
	}

	private showFulltime() {
		this.isPaused = true;

		// Triple whistle for fulltime
		playWhistleSound('long');
		setTimeout(() => playWhistleSound('short'), 400);
		setTimeout(() => playWhistleSound('short'), 700);

		const possession = this.calculatePossession();
		const result = this.playerScore > this.aiScore ? 'YOU WIN!' :
			this.playerScore < this.aiScore ? 'YOU LOSE' : 'DRAW';
		const resultColor = this.playerScore > this.aiScore ? '#22c55e' :
			this.playerScore < this.aiScore ? '#ef4444' : '#f59e0b';

		this.overlayBg.setVisible(true);
		this.overlayTitle.setText('FULL TIME').setVisible(true);
		this.overlayStats.setText(
			`${result}\n` +
			`FINAL SCORE: ${this.playerScore} - ${this.aiScore}\n\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n\n` +
			`         YOU    AI\n` +
			`SHOTS     ${this.stats.playerShots.toString().padStart(2)}    ${this.stats.aiShots.toString().padStart(2)}\n` +
			`PASSES    ${this.stats.playerPasses.toString().padStart(2)}    ${this.stats.aiPasses.toString().padStart(2)}\n` +
			`POSSESS  ${possession.player}%   ${possession.ai}%`
		).setVisible(true);
		this.overlayStats.setColor(resultColor);

		// Notify the UI
		const onGameEnd = this.registry.get('onGameEnd');
		if (onGameEnd) {
			onGameEnd({ playerScore: this.playerScore, aiScore: this.aiScore });
		}
	}

	private hideOverlay() {
		this.overlayBg.setVisible(false);
		this.overlayTitle.setVisible(false);
		this.overlayStats.setVisible(false).setColor('#ffffff');
		this.overlayPrompt.setVisible(false);
		this.tweens.killTweensOf(this.overlayPrompt);
		this.overlayPrompt.setAlpha(1);
	}

	private checkGoals() {
		const { width, height } = this.scale;
		const ball = this.ball;
		const margin = 20;
		const goalHeight = 100;
		const goalY = (height - goalHeight) / 2;

		if (ball.x < margin && ball.y > goalY && ball.y < goalY + goalHeight) {
			this.playerScore++;
			this.onGoalScored('player');
		}

		if (ball.x > width - margin && ball.y > goalY && ball.y < goalY + goalHeight) {
			this.aiScore++;
			this.onGoalScored('ai');
		}
	}

	private onGoalScored(scorer: 'player' | 'ai') {
		this.scoreText.setText(`${this.playerScore} - ${this.aiScore}`);
		this.isPaused = true;

		const onGoal = this.registry.get('onGoal');
		if (onGoal) onGoal(scorer);

		// Sound effects
		playGoalSound();
		playCrowdCheer();

		// Screen shake
		this.cameras.main.shake(300, 0.01);

		// Flash the ball
		this.tweens.add({
			targets: this.ball,
			alpha: 0,
			duration: 100,
			yoyo: true,
			repeat: 3
		});

		// Show GOAL text with animation
		this.goalText.setAlpha(1).setScale(0.5);
		this.goalText.setTint(scorer === 'player' ? 0x00ff00 : 0xff4444);
		this.tweens.add({
			targets: this.goalText,
			scale: 1.2,
			duration: 300,
			ease: 'Back.out',
			onComplete: () => {
				this.tweens.add({
					targets: this.goalText,
					alpha: 0,
					scale: 1.5,
					duration: 500,
					delay: 500
				});
			}
		});

		// Pause then reset
		this.ballCarrier = null;
		this.time.delayedCall(1500, () => {
			this.isPaused = false;
			this.resetPositions();
		});
	}

	private resetPositions() {
		const { width, height } = this.scale;

		this.ball.setPosition(width / 2, height / 2);
		this.ball.setVelocity(0, 0);

		const playerPositions = [
			{ x: width * 0.75, y: height * 0.3 },
			{ x: width * 0.75, y: height * 0.7 },
			{ x: width * 0.85, y: height * 0.5 }
		];
		const aiPositions = [
			{ x: width * 0.25, y: height * 0.3 },
			{ x: width * 0.25, y: height * 0.7 },
			{ x: width * 0.15, y: height * 0.5 }
		];

		this.playerTeam.forEach((p, i) => {
			p.setPosition(playerPositions[i].x, playerPositions[i].y);
			p.setVelocity(0, 0);
			p.setAcceleration(0, 0);
		});

		this.aiTeam.forEach((p, i) => {
			p.setPosition(aiPositions[i].x, aiPositions[i].y);
			p.setVelocity(0, 0);
		});
	}

	private endGame() {
		this.scene.pause();

		const onGameEnd = this.registry.get('onGameEnd');
		if (onGameEnd) {
			onGameEnd({ playerScore: this.playerScore, aiScore: this.aiScore });
		}
	}

	private updateBallPosition() {
		if (this.ballCarrier) {
			const carrier = this.ballCarrier;
			let offsetX: number;
			let offsetY: number;

			if (carrier === this.selectedPlayer) {
				offsetX = Math.cos(this.facingAngle) * this.dribbleOffset;
				offsetY = Math.sin(this.facingAngle) * this.dribbleOffset;
			} else if (carrier.isAI) {
				const vx = carrier.body?.velocity.x || 0;
				const vy = carrier.body?.velocity.y || 0;
				if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
					const angle = Math.atan2(vy, vx);
					offsetX = Math.cos(angle) * this.dribbleOffset;
					offsetY = Math.sin(angle) * this.dribbleOffset;
				} else {
					offsetX = this.dribbleOffset;
					offsetY = 0;
				}
			} else {
				const vx = carrier.body?.velocity.x || 0;
				const vy = carrier.body?.velocity.y || 0;
				if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
					const angle = Math.atan2(vy, vx);
					offsetX = Math.cos(angle) * this.dribbleOffset;
					offsetY = Math.sin(angle) * this.dribbleOffset;
				} else {
					offsetX = -this.dribbleOffset;
					offsetY = 0;
				}
			}

			this.ball.setPosition(carrier.x + offsetX, carrier.y + offsetY);
			this.ball.setVelocity(0, 0);
		}
	}

	private updateAI() {
		const ball = this.ball;
		const { width, height } = this.scale;
		const playerHasBall = this.ballCarrier && !this.ballCarrier.isAI;
		const goalY = height / 2;
		const goalX = width - 20; // Player's goal

		this.aiTeam.forEach((ai, index) => {
			const distToBall = Phaser.Math.Distance.Between(ai.x, ai.y, ball.x, ball.y);
			const distToGoal = Phaser.Math.Distance.Between(ai.x, ai.y, goalX, goalY);
			const hasBall = this.ballCarrier === ai;

			// Goalkeeper (index 2)
			if (index === 2) {
				const defenseX = width * 0.15;
				const targetY = Phaser.Math.Clamp(ball.y, height * 0.3, height * 0.7);

				if (Math.abs(ai.x - defenseX) > 20) {
					ai.setVelocityX((defenseX - ai.x) * 2);
				}
				ai.setVelocityY((targetY - ai.y) * 2);

				if (hasBall) {
					// Goalkeeper looks for a pass to teammate
					const teammate = this.aiTeam.find((t, i) => i !== 2);
					if (teammate) {
						this.ballCarrier = null;
						const passAngle = Phaser.Math.Angle.Between(ai.x, ai.y, teammate.x, teammate.y);
						ball.setVelocity(Math.cos(passAngle) * 250, Math.sin(passAngle) * 250);
						this.lastKicker = 'ai';
						playKickSound();
					}
				}
				return;
			}

			// Strikers (index 0, 1)
			if (hasBall) {
				// AI has the ball - decide: shoot or dribble?
				const canShoot = ai.x > width * 0.55 && distToGoal < 250;
				const shouldShoot = canShoot && (Math.random() < this.aiShootChance || ai.x > width * 0.75);

				if (shouldShoot) {
					// SHOOT! Aim for corners
					this.ballCarrier = null;
					const aimY = goalY + (Math.random() > 0.5 ? 35 : -35); // Aim for corner
					const kickAngle = Phaser.Math.Angle.Between(ai.x, ai.y, goalX, aimY);
					const power = 320 + this.aiSpeed * 0.5; // Harder on higher difficulty
					ball.setVelocity(Math.cos(kickAngle) * power, Math.sin(kickAngle) * power);
					this.lastKicker = 'ai';
					this.stats.aiShots++; // Track AI shot
					playKickSound();
				} else {
					// Dribble towards goal
					const targetX = goalX;
					const targetY = goalY;
					const angle = Phaser.Math.Angle.Between(ai.x, ai.y, targetX, targetY);
					ai.setVelocity(Math.cos(angle) * this.aiSpeed, Math.sin(angle) * this.aiSpeed);

					// Consider passing to teammate if blocked
					const otherStriker = this.aiTeam.find((t, i) => i !== index && i !== 2);
					if (otherStriker && Math.random() < 0.01 * this.aiAggression) {
						const isBlocked = this.playerTeam.some(p =>
							Phaser.Math.Distance.Between(ai.x, ai.y, p.x, p.y) < 50
						);
						if (isBlocked) {
							this.ballCarrier = null;
							const passAngle = Phaser.Math.Angle.Between(ai.x, ai.y, otherStriker.x, otherStriker.y);
							ball.setVelocity(Math.cos(passAngle) * 220, Math.sin(passAngle) * 220);
							this.lastKicker = 'ai';
							this.stats.aiPasses++; // Track AI pass
							playPassSound();
						}
					}
				}
				return;
			}

			// AI doesn't have ball - chase it or position
			if (!playerHasBall && (ball.x < width * 0.6 || distToBall < 150)) {
				// Chase loose ball aggressively
				const angle = Phaser.Math.Angle.Between(ai.x, ai.y, ball.x, ball.y);
				const chaseSpeed = this.aiSpeed * (0.6 + this.aiAggression * 0.4);
				ai.setVelocity(Math.cos(angle) * chaseSpeed, Math.sin(angle) * chaseSpeed);
			} else if (playerHasBall) {
				// Player has ball - press or mark
				if (Math.random() < this.aiAggression) {
					// Aggressive: chase ball carrier
					const angle = Phaser.Math.Angle.Between(ai.x, ai.y, ball.x, ball.y);
					ai.setVelocity(Math.cos(angle) * this.aiSpeed * 0.9, Math.sin(angle) * this.aiSpeed * 0.9);
				} else {
					// Defensive: return to position
					const homeX = width * 0.35;
					const homeY = index === 0 ? height * 0.35 : height * 0.65;
					const angle = Phaser.Math.Angle.Between(ai.x, ai.y, homeX, homeY);
					const dist = Phaser.Math.Distance.Between(ai.x, ai.y, homeX, homeY);

					if (dist > 30) {
						ai.setVelocity(Math.cos(angle) * this.aiSpeed * 0.5, Math.sin(angle) * this.aiSpeed * 0.5);
					} else {
						ai.setVelocity(0, 0);
					}
				}
			} else {
				// Make attacking runs when teammate has ball
				const teammateHasBall = this.ballCarrier && this.ballCarrier.isAI;
				if (teammateHasBall) {
					const runX = Math.min(ball.x + 100, width * 0.7);
					const runY = index === 0 ? height * 0.3 : height * 0.7;
					const angle = Phaser.Math.Angle.Between(ai.x, ai.y, runX, runY);
					ai.setVelocity(Math.cos(angle) * this.aiSpeed * 0.7, Math.sin(angle) * this.aiSpeed * 0.7);
				} else {
					// Return to home position
					const homeX = width * 0.3;
					const homeY = index === 0 ? height * 0.35 : height * 0.65;
					const angle = Phaser.Math.Angle.Between(ai.x, ai.y, homeX, homeY);
					const dist = Phaser.Math.Distance.Between(ai.x, ai.y, homeX, homeY);

					if (dist > 30) {
						ai.setVelocity(Math.cos(angle) * this.aiSpeed * 0.4, Math.sin(angle) * this.aiSpeed * 0.4);
					} else {
						ai.setVelocity(0, 0);
					}
				}
			}
		});
	}

	private updateTeammates() {
		const ball = this.ball;
		const { width, height } = this.scale;
		const teamHasBall = this.ballCarrier && !this.ballCarrier.isAI;
		const selectedPlayerHasBall = this.ballCarrier === this.selectedPlayer;

		this.playerTeam.forEach((player, index) => {
			if (player === this.selectedPlayer) return;

			const hasBall = this.ballCarrier === player;

			if (hasBall) {
				let bestTarget: PlayerSprite | null = null;
				let bestScore = -1;

				this.playerTeam.forEach((teammate) => {
					if (teammate === player) return;

					const dist = Phaser.Math.Distance.Between(player.x, player.y, teammate.x, teammate.y);
					const aheadBonus = player.x - teammate.x;
					const score = aheadBonus - dist * 0.3;

					if (dist > 50 && dist < 300 && score > bestScore) {
						bestScore = score;
						bestTarget = teammate;
					}
				});

				if (bestTarget !== null) {
					this.ballCarrier = null;
					const target = bestTarget as PlayerSprite;
					const passAngle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
					this.ball.setVelocity(Math.cos(passAngle) * 250, Math.sin(passAngle) * 250);
					this.lastKicker = 'player';
					playPassSound();
				} else {
					this.ballCarrier = null;
					const kickAngle = Phaser.Math.Angle.Between(player.x, player.y, 20, height / 2);
					this.ball.setVelocity(Math.cos(kickAngle) * 280, Math.sin(kickAngle) * 280);
					this.lastKicker = 'player';
					playKickSound();
				}
				return;
			}

			if (index === 2) {
				const defenseX = width * 0.75;
				let targetY = height / 2;

				if (!teamHasBall) {
					targetY = Phaser.Math.Clamp(ball.y, height * 0.3, height * 0.7);
				}

				const distToTarget = Phaser.Math.Distance.Between(player.x, player.y, defenseX, targetY);
				if (distToTarget > 15) {
					const angle = Phaser.Math.Angle.Between(player.x, player.y, defenseX, targetY);
					player.setVelocity(Math.cos(angle) * player.speed * 0.8, Math.sin(angle) * player.speed * 0.8);
				} else {
					player.setVelocity(0, 0);
				}
				return;
			}

			if (teamHasBall) {
				let targetX: number;
				let targetY: number;

				if (selectedPlayerHasBall && this.selectedPlayer) {
					targetX = Math.max(this.selectedPlayer.x - 120, width * 0.2);
					targetY = index === 0 ? height * 0.25 : height * 0.75;

					if (this.selectedPlayer.x < width * 0.4) {
						targetX = width * 0.2;
						targetY = index === 0 ? height * 0.35 : height * 0.65;
					}
				} else {
					targetX = Math.min(ball.x + 80, width * 0.6);
					targetY = index === 0 ? height * 0.3 : height * 0.7;
				}

				const distToTarget = Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY);
				if (distToTarget > 20) {
					const angle = Phaser.Math.Angle.Between(player.x, player.y, targetX, targetY);
					player.setVelocity(Math.cos(angle) * player.speed * 0.7, Math.sin(angle) * player.speed * 0.7);
				} else {
					player.setVelocity(0, 0);
				}
			} else {
				const distToBall = Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y);

				if (!this.ballCarrier && distToBall < 150) {
					const angle = Phaser.Math.Angle.Between(player.x, player.y, ball.x, ball.y);
					player.setVelocity(Math.cos(angle) * player.speed, Math.sin(angle) * player.speed);
				} else if (this.ballCarrier?.isAI && ball.x > width * 0.4) {
					const angle = Phaser.Math.Angle.Between(player.x, player.y, ball.x, ball.y);
					player.setVelocity(Math.cos(angle) * player.speed * 0.8, Math.sin(angle) * player.speed * 0.8);
				} else {
					const homeX = width * 0.6;
					const homeY = index === 0 ? height * 0.35 : height * 0.65;
					const distToHome = Phaser.Math.Distance.Between(player.x, player.y, homeX, homeY);

					if (distToHome > 25) {
						const angle = Phaser.Math.Angle.Between(player.x, player.y, homeX, homeY);
						player.setVelocity(Math.cos(angle) * player.speed * 0.5, Math.sin(angle) * player.speed * 0.5);
					} else {
						player.setVelocity(0, 0);
					}
				}
			}
		});
	}

	update() {
		// Update ball shadow position always
		this.ballShadow.setPosition(this.ball.x, this.ball.y + 10);

		// Skip game logic if paused (goal celebration)
		if (this.isPaused) return;

		// Read touch input from registry (set by Svelte component)
		const touchState = this.registry.get('touchInput');
		if (touchState) {
			this.touchInput = touchState;
		}

		// Track possession
		if (this.ballCarrier) {
			if (this.ballCarrier.isAI) {
				this.stats.aiPossessionFrames++;
			} else {
				this.stats.playerPossessionFrames++;
			}
		}

		// Player movement with acceleration (smooth) - keyboard OR touch
		if (this.selectedPlayer) {
			let ax = 0;
			let ay = 0;

			// Keyboard input
			if (this.cursors) {
				if (this.cursors.left.isDown) ax = -this.ACCELERATION;
				else if (this.cursors.right.isDown) ax = this.ACCELERATION;
				if (this.cursors.up.isDown) ay = -this.ACCELERATION;
				else if (this.cursors.down.isDown) ay = this.ACCELERATION;
			}

			// Touch input (override if active)
			if (this.touchInput.left) ax = -this.ACCELERATION;
			else if (this.touchInput.right) ax = this.ACCELERATION;
			if (this.touchInput.up) ay = -this.ACCELERATION;
			else if (this.touchInput.down) ay = this.ACCELERATION;

			// Update facing direction based on input (even while kicking)
			if (ax !== 0 || ay !== 0) {
				this.facingAngle = Math.atan2(ay, ax);
			}

			this.selectedPlayer.setAcceleration(ax, ay);

			// Check for kick - keyboard
			if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
				this.kickBall();
			}

			// Check for kick - touch (detect rising edge)
			if (this.touchInput.kick && !this.lastTouchKick) {
				this.kickBall();
			}
			this.lastTouchKick = this.touchInput.kick;

			// Check for switch - touch (detect rising edge)
			if (this.touchInput.switch && !this.lastTouchSwitch) {
				const currentIndex = this.playerTeam.indexOf(this.selectedPlayer);
				const nextIndex = (currentIndex + 1) % this.playerTeam.length;
				this.selectedPlayer = this.playerTeam[nextIndex];
				this.highlightSelectedPlayer();
			}
			this.lastTouchSwitch = this.touchInput.switch;
		}

		// Auto-switch to nearest player when defending
		this.autoSwitchToNearest();

		// Update selection indicator position
		this.updateSelectionIndicator();

		// Flip sprites based on movement direction
		this.updateSpriteDirections();

		// Draw pass indicator
		this.drawPassIndicator();

		// Update ball position (dribbling)
		this.updateBallPosition();

		// Teammate AI
		this.updateTeammates();

		// Opponent AI
		this.updateAI();

		// Check goals
		this.checkGoals();
	}
}
