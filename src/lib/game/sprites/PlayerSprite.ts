import Phaser from 'phaser';

// Skin tone palette
export const SKIN_TONES = {
	light: 0xffe0bd,
	medium: 0xd4a574,
	tan: 0xc68642,
	brown: 0x8d5524,
	dark: 0x5c3317
};

// Hair colors
export const HAIR_COLORS = {
	black: 0x1a1a1a,
	brown: 0x4a3728,
	blonde: 0xd4a017,
	red: 0x8b2500,
	white: 0xe8e8e8
};

// Hair styles
export type HairStyle = 'bald' | 'short' | 'mohawk' | 'afro' | 'spiky';

export interface PlayerSpriteConfig {
	teamColor: number;
	skinTone: keyof typeof SKIN_TONES;
	hairStyle: HairStyle;
	hairColor: keyof typeof HAIR_COLORS;
	number?: number;
}

/**
 * Generates a pixel art football player sprite
 * Size: 24x32 pixels (taller than wide for proper proportions)
 */
export function generatePlayerSprite(
	scene: Phaser.Scene,
	textureKey: string,
	config: PlayerSpriteConfig
): void {
	const graphics = scene.make.graphics({ x: 0, y: 0 });
	const width = 24;
	const height = 32;

	const skin = SKIN_TONES[config.skinTone];
	const hair = HAIR_COLORS[config.hairColor];
	const shirt = config.teamColor;
	const shorts = darkenColor(config.teamColor, 0.3);

	// Clear
	graphics.clear();

	// === LEGS (bottom) ===
	// Left leg
	graphics.fillStyle(skin);
	graphics.fillRect(8, 26, 3, 6);  // Left leg
	graphics.fillRect(13, 26, 3, 6); // Right leg

	// Socks (team color)
	graphics.fillStyle(shirt);
	graphics.fillRect(8, 29, 3, 3);  // Left sock
	graphics.fillRect(13, 29, 3, 3); // Right sock

	// Boots (black)
	graphics.fillStyle(0x1a1a1a);
	graphics.fillRect(7, 31, 4, 1);  // Left boot
	graphics.fillRect(13, 31, 4, 1); // Right boot

	// === SHORTS ===
	graphics.fillStyle(shorts);
	graphics.fillRect(7, 22, 10, 5);

	// === BODY/SHIRT ===
	graphics.fillStyle(shirt);
	// Torso
	graphics.fillRect(6, 14, 12, 9);
	// Shoulders wider
	graphics.fillRect(4, 14, 16, 3);

	// Arms (skin)
	graphics.fillStyle(skin);
	graphics.fillRect(3, 17, 3, 5);  // Left arm
	graphics.fillRect(18, 17, 3, 5); // Right arm

	// Hands
	graphics.fillRect(3, 21, 3, 2);  // Left hand
	graphics.fillRect(18, 21, 3, 2); // Right hand

	// === HEAD ===
	graphics.fillStyle(skin);
	// Face (oval-ish)
	graphics.fillRect(8, 4, 8, 10);
	graphics.fillRect(7, 5, 10, 8);

	// === HAIR ===
	graphics.fillStyle(hair);
	drawHair(graphics, config.hairStyle);

	// === FACE DETAILS ===
	// Eyes (dark)
	graphics.fillStyle(0x1a1a1a);
	graphics.fillRect(9, 8, 2, 2);   // Left eye
	graphics.fillRect(13, 8, 2, 2);  // Right eye

	// Mouth
	graphics.fillRect(10, 11, 4, 1);

	// === SHIRT DETAILS ===
	// Collar (darker)
	graphics.fillStyle(darkenColor(shirt, 0.2));
	graphics.fillRect(9, 14, 6, 2);

	// Number on back (we'll show a simple stripe instead)
	graphics.fillStyle(0xffffff);
	graphics.fillRect(10, 16, 4, 3);

	// Generate texture
	graphics.generateTexture(textureKey, width, height);
	graphics.destroy();
}

function drawHair(graphics: Phaser.GameObjects.Graphics, style: HairStyle): void {
	switch (style) {
		case 'bald':
			// Just a slight shadow on top
			graphics.fillRect(8, 3, 8, 2);
			break;

		case 'short':
			// Simple short hair
			graphics.fillRect(7, 2, 10, 4);
			graphics.fillRect(8, 1, 8, 2);
			break;

		case 'mohawk':
			// Mohawk strip down the middle
			graphics.fillRect(10, 0, 4, 5);
			graphics.fillRect(11, 0, 2, 1); // Tip
			// Sides shaved (skin showing)
			break;

		case 'afro':
			// Big round afro
			graphics.fillRect(5, 0, 14, 6);
			graphics.fillRect(6, 0, 12, 7);
			graphics.fillRect(7, 1, 10, 5);
			break;

		case 'spiky':
			// Spiky hair
			graphics.fillRect(7, 2, 10, 3);
			graphics.fillRect(8, 0, 2, 3);
			graphics.fillRect(11, 0, 2, 4);
			graphics.fillRect(14, 0, 2, 3);
			break;
	}
}

function darkenColor(color: number, amount: number): number {
	const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
	const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
	const b = Math.max(0, (color & 0xff) * (1 - amount));
	return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

/**
 * Generate a random player config for variety
 */
export function randomPlayerConfig(teamColor: number): PlayerSpriteConfig {
	const skinTones = Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[];
	const hairColors = Object.keys(HAIR_COLORS) as (keyof typeof HAIR_COLORS)[];
	const hairStyles: HairStyle[] = ['bald', 'short', 'mohawk', 'afro', 'spiky'];

	return {
		teamColor,
		skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
		hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
		hairColor: hairColors[Math.floor(Math.random() * hairColors.length)]
	};
}

/**
 * Pre-generate team sprites with variety
 */
export function generateTeamSprites(
	scene: Phaser.Scene,
	teamPrefix: string,
	teamColor: number,
	count: number = 3
): void {
	for (let i = 0; i < count; i++) {
		const config = randomPlayerConfig(teamColor);
		generatePlayerSprite(scene, `${teamPrefix}_${i}`, config);
	}
}
