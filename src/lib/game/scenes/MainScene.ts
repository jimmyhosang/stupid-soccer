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
	private kickKey!: Phaser.Input.Keyboard.Key;
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
	private dribbleAngle = Math.PI; // Separate angle for ball position (smoothed)
	private passIndicator!: Phaser.GameObjects.Graphics;
	private selectionIndicator!: Phaser.GameObjects.Ellipse;
	private lastAutoSwitch = 0; // Cooldown for auto-switch
	private isPaused = false; // For goal celebration pause
	private isHalftime = false;
	private halftimeShown = false;
	private lastKickTime = 0; // Cooldown for kicking
	private goalJustScored = false; // Prevent double goal detection
	private possessionStartTime = 0; // When player gained possession (for first touch delay)
	private kickTintActive = false; // Prevent possession tint from overriding kick feedback
	private kickerCooldown: PlayerSprite | null = null; // Player who just kicked (can't immediately repossess)

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

	// Goal celebration objects (cleaned up before resetPositions)
	private celebrationObjects: Phaser.GameObjects.GameObject[] = [];

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
			this.kickKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

			// A to switch players manually
			this.input.keyboard.on('keydown-A', () => {
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
		this.ball.setBounce(1.9); // Super bouncy! (twice as bouncy as before)
		this.ball.setDrag(150); // Less drag for faster movement
		this.ball.setMaxVelocity(400); // Faster max speed
		this.ball.setDepth(10); // Ball above shadow

		// Create pitch boundary walls (allows ball into goal areas but not off pitch)
		this.createPitchWalls(width, height);
	}

	private createPitchWalls(width: number, height: number) {
		const margin = 20;
		const goalHeight = 100;
		const goalY = (height - goalHeight) / 2;
		const wallThickness = 10;

		// Create static physics group for walls
		const walls = this.physics.add.staticGroup();

		// Top wall (full width)
		const topWall = this.add.rectangle(width / 2, margin - wallThickness / 2, width, wallThickness, 0x000000, 0);
		walls.add(topWall);

		// Bottom wall (full width)
		const bottomWall = this.add.rectangle(width / 2, height - margin + wallThickness / 2, width, wallThickness, 0x000000, 0);
		walls.add(bottomWall);

		// Left wall - TOP section (above goal)
		const leftTopWall = this.add.rectangle(margin - wallThickness / 2, goalY / 2, wallThickness, goalY, 0x000000, 0);
		walls.add(leftTopWall);

		// Left wall - BOTTOM section (below goal)
		const leftBottomWall = this.add.rectangle(margin - wallThickness / 2, goalY + goalHeight + (height - goalY - goalHeight) / 2, wallThickness, height - goalY - goalHeight, 0x000000, 0);
		walls.add(leftBottomWall);

		// Left BACK wall (behind goal)
		const leftBackWall = this.add.rectangle(-wallThickness / 2, height / 2, wallThickness, goalHeight, 0x000000, 0);
		walls.add(leftBackWall);

		// Right wall - TOP section (above goal)
		const rightTopWall = this.add.rectangle(width - margin + wallThickness / 2, goalY / 2, wallThickness, goalY, 0x000000, 0);
		walls.add(rightTopWall);

		// Right wall - BOTTOM section (below goal)
		const rightBottomWall = this.add.rectangle(width - margin + wallThickness / 2, goalY + goalHeight + (height - goalY - goalHeight) / 2, wallThickness, height - goalY - goalHeight, 0x000000, 0);
		walls.add(rightBottomWall);

		// Right BACK wall (behind goal)
		const rightBackWall = this.add.rectangle(width + wallThickness / 2, height / 2, wallThickness, goalHeight, 0x000000, 0);
		walls.add(rightBackWall);

		// Ball collides with walls and bounces
		this.physics.add.collider(this.ball, walls);
	}

	private createPlayers(width: number, height: number) {
		// Generate pixel art sprites for both teams (3 unique players each)
		generateTeamSprites(this, 'player', PLAYER_COLOR, 3);
		generateTeamSprites(this, 'ai', AI_COLOR, 3);

		// Player team positions (right side, defending right goal) - 3v3
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
			// Don't let the kicker immediately repossess
			if (player === this.kickerCooldown) return;

			if (!this.ballCarrier) {
				this.ballCarrier = player as PlayerSprite;
				this.lastKicker = 'player';
				this.possessionStartTime = this.time.now;

				// Initialize dribble angle based on ball direction or default to facing goal
				const ballVx = this.ball.body?.velocity.x || 0;
				const ballVy = this.ball.body?.velocity.y || 0;
				if (Math.abs(ballVx) > 50 || Math.abs(ballVy) > 50) {
					// Ball was moving - face the direction ball came from
					this.dribbleAngle = Math.atan2(ballVy, ballVx);
				} else {
					// Ball was slow - face the goal
					this.dribbleAngle = Math.PI;
				}

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
				this.possessionStartTime = this.time.now;
			} else if (this.ballCarrier.isAI === false) {
				// AI tackle - 20% chance, but not during player's first touch
				const isFirstTouch = this.time.now - this.possessionStartTime < 200;
				if (isFirstTouch) return; // Protected during first touch

				const dist = Phaser.Math.Distance.Between(
					(player as PlayerSprite).x,
					(player as PlayerSprite).y,
					this.ball.x,
					this.ball.y
				);
				if (dist < 20 && Math.random() < 0.2) {
					this.ballCarrier = player as PlayerSprite;
					this.lastKicker = 'ai';
					this.possessionStartTime = this.time.now;
				}
			}
		});

		// Player collisions
		this.physics.add.collider(this.playerTeam, this.playerTeam);
		this.physics.add.collider(this.aiTeam, this.aiTeam);
		this.physics.add.collider(this.playerTeam, this.aiTeam, (p1, p2) => {
			if (this.ballCarrier === p1 || this.ballCarrier === p2) {
				// Protected during first touch
				if (this.time.now - this.possessionStartTime < 200) return;

				// Lower base chance, affected by speed differential
				const carrier = this.ballCarrier;
				const tackler = carrier === p1 ? p2 : p1;
				const carrierSpeed = Math.sqrt(
					(carrier?.body?.velocity.x || 0) ** 2 +
					(carrier?.body?.velocity.y || 0) ** 2
				);
				const tacklerSprite = tackler as PlayerSprite;
				const tacklerSpeed = Math.sqrt(
					(tacklerSprite.body?.velocity.x || 0) ** 2 +
					(tacklerSprite.body?.velocity.y || 0) ** 2
				);

				// Higher chance if tackler is moving faster than carrier
				const speedRatio = tacklerSpeed / Math.max(carrierSpeed, 50);
				const tackleChance = 0.1 + speedRatio * 0.1; // 10-20% base

				if (Math.random() < tackleChance) {
					this.ballCarrier = null;
				}
			}
		});
	}

	private createUI(width: number) {
		const { height } = this.scale;

		// Score/timer UI is handled by Svelte component - keep internal references for tracking
		this.scoreText = this.add.text(0, 0, '0 - 0', {
			fontSize: '1px'
		}).setVisible(false);

		this.timerText = this.add.text(0, 0, '3:00', {
			fontSize: '1px'
		}).setVisible(false);

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
		if (this.ballCarrier !== this.selectedPlayer) return null;

		const ball = this.ball;
		let bestTarget: PlayerSprite | null = null;
		let bestScore = -Infinity;

		this.playerTeam.forEach((teammate) => {
			if (teammate === this.selectedPlayer) return;

			// Calculate distance FROM BALL to teammate
			const dist = Phaser.Math.Distance.Between(ball.x, ball.y, teammate.x, teammate.y);
			if (dist < 40 || dist > 400) return;

			// Angle from ball to teammate
			const angleToTeammate = Phaser.Math.Angle.Between(ball.x, ball.y, teammate.x, teammate.y);
			let angleDiff = Math.abs(angleToTeammate - this.facingAngle);
			if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

			// Consider teammates within 90 degrees of facing direction
			if (angleDiff > Math.PI / 2) return;

			// Bonus for teammates towards the goal (lower x)
			const forwardBonus = (this.selectedPlayer!.x - teammate.x) * 0.5;

			const angleScore = (Math.PI / 2 - angleDiff) * 200;
			const distScore = -dist * 0.3;
			const score = angleScore + distScore + Math.max(0, forwardBonus);

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

		const ball = this.ball;
		const target = this.getPassTarget();

		if (target) {
			// Draw line from BALL to pass target (this is where the pass goes)
			this.passIndicator.lineStyle(2, 0x00ff00, 0.5);
			this.passIndicator.lineBetween(ball.x, ball.y, target.x, target.y);

			// Draw circle around target
			this.passIndicator.lineStyle(2, 0x00ff00, 0.8);
			this.passIndicator.strokeCircle(target.x, target.y, 18);
		} else {
			// Draw kick direction indicator FROM THE BALL (not player)
			// This shows where the shot will go
			const indicatorLength = 60;
			const endX = ball.x + Math.cos(this.facingAngle) * indicatorLength;
			const endY = ball.y + Math.sin(this.facingAngle) * indicatorLength;

			// Yellow line = shooting direction
			this.passIndicator.lineStyle(3, 0xffff00, 0.6);
			this.passIndicator.lineBetween(ball.x, ball.y, endX, endY);

			// Draw small arrowhead
			const arrowSize = 8;
			const arrowAngle1 = this.facingAngle + Math.PI * 0.8;
			const arrowAngle2 = this.facingAngle - Math.PI * 0.8;
			this.passIndicator.lineBetween(
				endX, endY,
				endX + Math.cos(arrowAngle1) * arrowSize,
				endY + Math.sin(arrowAngle1) * arrowSize
			);
			this.passIndicator.lineBetween(
				endX, endY,
				endX + Math.cos(arrowAngle2) * arrowSize,
				endY + Math.sin(arrowAngle2) * arrowSize
			);
		}
	}

	private kickBall() {
		if (!this.selectedPlayer) return;

		// Kick cooldown (300ms)
		if (this.time.now - this.lastKickTime < 300) return;

		const player = this.selectedPlayer;
		const ball = this.ball;

		const hasBall = this.ballCarrier === player;
		const distance = Phaser.Math.Distance.Between(player.x, player.y, ball.x, ball.y);

		// First touch delay - can't kick immediately after receiving ball (150ms)
		if (hasBall && this.time.now - this.possessionStartTime < 150) return;

		// TACKLE: If AI has the ball and we're close, attempt to steal
		if (!hasBall && this.ballCarrier?.isAI && distance < 50) {
			this.lastKickTime = this.time.now;
			// 50% tackle success rate
			if (Math.random() < 0.5) {
				// Successful tackle!
				this.ballCarrier = player;
				this.lastKicker = 'player';
				// Reset dribble angle to face the AI goal
				this.dribbleAngle = Math.PI;
				// Visual feedback
				this.cameras.main.shake(100, 0.005);
				player.setTint(0x00ff00);
				this.time.delayedCall(150, () => player.clearTint());
			} else {
				// Failed tackle - ball knocked loose
				this.ballCarrier = null;
				const knockAngle = Math.random() * Math.PI * 2;
				ball.setVelocity(Math.cos(knockAngle) * 150, Math.sin(knockAngle) * 150);
			}
			return;
		}

		if (!hasBall && distance > 40) return;

		this.lastKickTime = this.time.now;

		// Store ball position BEFORE releasing possession
		const ballX = ball.x;
		const ballY = ball.y;

		this.ballCarrier = null;

		const target = this.getPassTarget();
		const baseKickPower = 280;

		// Calculate momentum bonus for shots
		// If running in same direction as kick, add power
		const playerVx = player.body?.velocity.x || 0;
		const playerVy = player.body?.velocity.y || 0;
		const playerSpeed = Math.sqrt(playerVx * playerVx + playerVy * playerVy);

		if (target) {
			// Pass to teammate - kick FROM the ball's current position TO the target
			const passAngle = Phaser.Math.Angle.Between(ballX, ballY, target.x, target.y);
			const variance = (Math.random() - 0.5) * 0.15; // +/- 4 degrees
			// Passes get slight momentum bonus
			const passPower = baseKickPower + playerSpeed * 0.1;
			ball.setVelocity(
				Math.cos(passAngle + variance) * passPower,
				Math.sin(passAngle + variance) * passPower
			);
			this.stats.playerPasses++;
			playPassSound();
		} else {
			// Shot - use facing angle (where player is AIMING)
			// Add momentum bonus if running in shot direction
			const kickDirX = Math.cos(this.facingAngle);
			const kickDirY = Math.sin(this.facingAngle);
			const momentumAlignment = (playerVx * kickDirX + playerVy * kickDirY) / Math.max(playerSpeed, 1);
			const momentumBonus = Math.max(0, momentumAlignment) * playerSpeed * 0.3;
			const shotPower = baseKickPower + momentumBonus;

			ball.setVelocity(kickDirX * shotPower, kickDirY * shotPower);
			// Check if shooting towards AI goal (left side)
			if (kickDirX < -0.3) {
				this.stats.playerShots++;
			}
			playKickSound();
		}
		this.lastKicker = 'player';

		// Kick feedback: brief flash and scale
		this.kickTintActive = true;
		this.tweens.add({
			targets: ball,
			scaleX: 1.3,
			scaleY: 1.3,
			duration: 80,
			yoyo: true,
			ease: 'Quad.out'
		});
		ball.setTint(0xffff00);
		this.time.delayedCall(150, () => {
			this.kickTintActive = false;
			ball.clearTint();
		});

		// Prevent kicker from immediately repossessing
		this.kickerCooldown = player;
		this.time.delayedCall(300, () => {
			this.kickerCooldown = null;
		});
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
		// Don't count down during pauses (goal celebrations, halftime)
		if (this.isPaused) return;

		this.gameTime--;

		// Notify Svelte UI of time update
		const onTimeUpdate = this.registry.get('onTimeUpdate');
		if (onTimeUpdate) {
			onTimeUpdate(this.gameTime);
		}

		if (this.gameTime <= 0) {
			this.showFulltime();
			return;
		}

		// Halftime at 90 seconds (1:30)
		if (this.gameTime === 90 && !this.halftimeShown) {
			this.showHalftime();
			return;
		}
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
			onGameEnd({
				playerScore: this.playerScore,
				aiScore: this.aiScore,
				stats: { ...this.stats },
				possession: this.calculatePossession()
			});
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
		// Prevent double goal detection
		if (this.goalJustScored) return;

		const { width, height } = this.scale;
		const ball = this.ball;
		const margin = 20;
		const goalHeight = 100;
		const goalY = (height - goalHeight) / 2;

		if (ball.x < margin && ball.y > goalY && ball.y < goalY + goalHeight) {
			this.goalJustScored = true;
			this.playerScore++;
			this.onGoalScored('player');
		}

		if (ball.x > width - margin && ball.y > goalY && ball.y < goalY + goalHeight) {
			this.goalJustScored = true;
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

		// Extra celebration overlay (banner bounce, scorer line, confetti)
		this.showGoalCelebration(scorer);

		// Pause then reset
		this.ballCarrier = null;
		this.time.delayedCall(1500, () => {
			this.isPaused = false;
			this.goalJustScored = false; // Allow goal detection again
			this.clearCelebration();
			this.resetPositions();
		});
	}

	private showGoalCelebration(scorer: 'player' | 'ai') {
		const { width, height } = this.scale;
		const teamColor = scorer === 'player' ? PLAYER_COLOR : AI_COLOR;

		// Scorer line under the banner. No player-name data exists in the game
		// (sprites are identified only by team + index), so use a team label
		// derived from the scoring side rather than inventing a name.
		const scorerLine =
			scorer === 'player' ? 'YOU SCORED!' : 'GOOOAL!';

		const scorerText = this.add.text(width / 2, height / 2 + 50, scorerLine, {
			fontFamily: '"Press Start 2P"',
			fontSize: '16px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4
		}).setOrigin(0.5).setDepth(100).setAlpha(0).setScale(0.6);
		this.celebrationObjects.push(scorerText);

		// Pop the scorer line in with a slight bounce, slightly after the banner
		this.tweens.add({
			targets: scorerText,
			alpha: 1,
			scale: 1,
			duration: 250,
			delay: 120,
			ease: 'Back.out'
		});

		// Confetti burst in the scoring team's color
		this.spawnConfetti(width / 2, height / 2, teamColor);
	}

	private spawnConfetti(originX: number, originY: number, color: number) {
		const pieceCount = 28;

		for (let i = 0; i < pieceCount; i++) {
			const size = Phaser.Math.Between(4, 8);
			const piece = this.add.rectangle(originX, originY, size, size, color);
			piece.setDepth(99);
			piece.setAngle(Phaser.Math.Between(0, 360));
			this.celebrationObjects.push(piece);

			// Burst outward in a random direction, fade and spin as it travels
			const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
			const distance = Phaser.Math.Between(120, 320);
			this.tweens.add({
				targets: piece,
				x: originX + Math.cos(angle) * distance,
				y: originY + Math.sin(angle) * distance,
				angle: piece.angle + Phaser.Math.Between(180, 540),
				alpha: 0,
				duration: Phaser.Math.Between(700, 1100),
				ease: 'Quad.out'
			});
		}
	}

	private clearCelebration() {
		this.celebrationObjects.forEach((obj) => {
			this.tweens.killTweensOf(obj);
			obj.destroy();
		});
		this.celebrationObjects = [];
	}

	private resetPositions() {
		const { width, height } = this.scale;

		this.ball.setPosition(width / 2, height / 2);
		this.ball.setVelocity(0, 0);

		// 3v3 formation positions
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
			let targetAngle: number;

			// Calculate carrier speed
			const vx = carrier.body?.velocity.x || 0;
			const vy = carrier.body?.velocity.y || 0;
			const speed = Math.sqrt(vx * vx + vy * vy);

			if (carrier === this.selectedPlayer) {
				// For selected player, use the dribble angle (based on movement)
				// but smoothly interpolate to avoid jarring jumps

				if (speed > 20) {
					// Moving - update dribble angle based on movement direction
					targetAngle = Math.atan2(vy, vx);
				} else {
					// Standing still - keep current dribble angle
					targetAngle = this.dribbleAngle;
				}

				// Smoothly interpolate dribble angle (prevents jarring ball position changes)
				let angleDiff = targetAngle - this.dribbleAngle;
				// Normalize angle difference to [-PI, PI]
				while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
				while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
				this.dribbleAngle += angleDiff * 0.2; // Smooth but responsive

			} else if (carrier.isAI) {
				if (speed > 10) {
					this.dribbleAngle = Math.atan2(vy, vx);
				}
			} else {
				// Teammate with ball
				if (speed > 10) {
					this.dribbleAngle = Math.atan2(vy, vx);
				}
			}

			// Dynamic dribble offset: closer when slow, farther when fast
			// Range from 15 (standing) to 25 (full speed)
			const dynamicOffset = 15 + (speed / this.MAX_SPEED) * 10;

			const offsetX = Math.cos(this.dribbleAngle) * dynamicOffset;
			const offsetY = Math.sin(this.dribbleAngle) * dynamicOffset;
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
						ball.setVelocity(Math.cos(passAngle) * 280, Math.sin(passAngle) * 280);
						this.lastKicker = 'ai';
						this.stats.aiPasses++;
						playPassSound();
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
					// Dynamic runs - alternate between wide and central
					const runX = Math.min(ball.x + 100 + Math.random() * 50, width * 0.75);
					// Add variance to Y position based on time
					const yVariance = Math.sin(this.time.now / 1000 + index * Math.PI) * height * 0.1;
					const baseY = index === 0 ? height * 0.3 : height * 0.7;
					const runY = Phaser.Math.Clamp(baseY + yVariance, height * 0.15, height * 0.85);
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
					// Bonus for teammates closer to AI goal (left side, lower x)
					const aheadBonus = teammate.x - player.x < 0 ? (player.x - teammate.x) : 0;
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
					this.stats.playerPasses++;
					playPassSound();
				} else {
					// Shoot towards AI goal (left side, x = 20)
					this.ballCarrier = null;
					const kickAngle = Phaser.Math.Angle.Between(player.x, player.y, 20, height / 2);
					this.ball.setVelocity(Math.cos(kickAngle) * 280, Math.sin(kickAngle) * 280);
					this.lastKicker = 'player';
					this.stats.playerShots++;
					playKickSound();
				}
				return;
			}

			// Goalkeeper (index 2) - stays deep to guard goal
			if (index === 2) {
				const defenseX = width * 0.82; // Stay very close to goal
				let targetY = height / 2;

				// Track ball vertically when defending
				if (!teamHasBall || ball.x > width * 0.6) {
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
					// Make attacking runs ahead of ball carrier (towards AI goal on left)
					targetX = Math.max(this.selectedPlayer.x - 100, width * 0.15);
					targetY = index === 0 ? height * 0.25 : height * 0.75;

					// If we're already in attacking third, spread wide
					if (this.selectedPlayer.x < width * 0.4) {
						targetX = width * 0.25;
						targetY = index === 0 ? height * 0.2 : height * 0.8;
					}
				} else {
					// Support play - move forward with ball
					targetX = Math.max(ball.x - 80, width * 0.2);
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
					// Chase loose ball
					const angle = Phaser.Math.Angle.Between(player.x, player.y, ball.x, ball.y);
					player.setVelocity(Math.cos(angle) * player.speed, Math.sin(angle) * player.speed);
				} else if (this.ballCarrier?.isAI && ball.x > width * 0.5) {
					// Defend - chase AI with ball in our half
					const angle = Phaser.Math.Angle.Between(player.x, player.y, ball.x, ball.y);
					player.setVelocity(Math.cos(angle) * player.speed * 0.8, Math.sin(angle) * player.speed * 0.8);
				} else {
					// Return to defensive positions
					const homeX = width * 0.65;
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

		// Ball possession indicator (tint ball based on who has it)
		// But don't override kick feedback tint
		if (!this.kickTintActive) {
			if (this.ballCarrier) {
				if (this.ballCarrier.isAI) {
					this.ball.setTint(0xffcccc); // Light red tint for AI
				} else {
					this.ball.setTint(0xccccff); // Light violet tint for player
				}
			} else {
				this.ball.clearTint(); // White ball when loose
			}
		}

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

			// Update SHOOTING direction based on input direction
			// This is INSTANT - player can aim while running or standing
			if (ax !== 0 || ay !== 0) {
				this.facingAngle = Math.atan2(ay, ax);
			}

			this.selectedPlayer.setAcceleration(ax, ay);

			// Check for kick - keyboard (S key)
			if (this.kickKey && Phaser.Input.Keyboard.JustDown(this.kickKey)) {
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

		// Check out of bounds (past goal line but not in goal)
		this.checkOutOfBounds();
	}

	private checkOutOfBounds() {
		const { width, height } = this.scale;
		const ball = this.ball;
		const margin = 20;
		const goalHeight = 100;
		const goalY = (height - goalHeight) / 2;

		// Ball past left end line but not in goal
		if (ball.x < margin - 5 && (ball.y < goalY || ball.y > goalY + goalHeight)) {
			// Goal kick for player team
			this.ballCarrier = null;
			ball.setPosition(margin + 50, ball.y < height / 2 ? height * 0.3 : height * 0.7);
			ball.setVelocity(0, 0);
		}

		// Ball past right end line but not in goal
		if (ball.x > width - margin + 5 && (ball.y < goalY || ball.y > goalY + goalHeight)) {
			// Goal kick for AI team
			this.ballCarrier = null;
			ball.setPosition(width - margin - 50, ball.y < height / 2 ? height * 0.3 : height * 0.7);
			ball.setVelocity(0, 0);
		}
	}
}
