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
	/** Goalkeeper gets a distinct, darker jersey shade */
	isKeeper?: boolean;
}

/**
 * Generates a pixel art football player sprite.
 *
 * Size: 24x32 pixels (taller than wide for proper proportions).
 * The character is drawn front-facing and left/right symmetric so that
 * MainScene's velocity-based `setFlipX` reads naturally in both directions.
 *
 * Layout (y, top -> bottom):
 *   0-13  head + hair
 *   14-25 torso / jersey (with shirt number) + arms
 *   24-28 shorts
 *   26-30 legs + socks
 *   30-31 boots
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
	const skinShade = darkenColor(skin, 0.18); // cheek/jaw shading
	const hair = HAIR_COLORS[config.hairColor];
	// Keepers wear a clearly darker, desaturated version of the team color.
	const shirt = config.isKeeper ? darkenColor(config.teamColor, 0.45) : config.teamColor;
	const shirtShade = darkenColor(shirt, 0.25);
	const shirtHi = lightenColor(shirt, 0.22);
	const shorts = 0xf5f5f5; // crisp white shorts (contrasting)
	const shortsShade = 0xcfcfcf;
	const sock = shirt; // socks match the jersey -> "same team" read
	const boot = 0x1a1a1a;

	graphics.clear();

	// === LEGS ===
	// Thighs/shins (skin) - two legs with a gap between them
	graphics.fillStyle(skin);
	graphics.fillRect(8, 26, 3, 4); // left leg
	graphics.fillRect(13, 26, 3, 4); // right leg

	// Socks (team color) over the lower leg
	graphics.fillStyle(sock);
	graphics.fillRect(8, 29, 3, 2); // left sock
	graphics.fillRect(13, 29, 3, 2); // right sock
	// Sock turnover highlight
	graphics.fillStyle(lightenColor(sock, 0.25));
	graphics.fillRect(8, 29, 3, 1);
	graphics.fillRect(13, 29, 3, 1);

	// Boots (black) - splayed slightly outward for a "standing" look
	graphics.fillStyle(boot);
	graphics.fillRect(6, 31, 5, 1); // left boot
	graphics.fillRect(13, 31, 5, 1); // right boot

	// === SHORTS ===
	graphics.fillStyle(shorts);
	graphics.fillRect(7, 24, 10, 4);
	// Leg split + side shadow for a bit of form
	graphics.fillStyle(shortsShade);
	graphics.fillRect(11, 26, 2, 2); // center gap shadow
	graphics.fillRect(7, 27, 10, 1); // hem shadow

	// === BODY / SHIRT ===
	graphics.fillStyle(shirt);
	// Torso
	graphics.fillRect(6, 16, 12, 9);
	// Wider shoulders
	graphics.fillRect(4, 16, 16, 3);
	// Side shading down the right edge (light comes from upper-left)
	graphics.fillStyle(shirtShade);
	graphics.fillRect(16, 16, 2, 9);
	graphics.fillRect(18, 16, 2, 3);
	// Shoulder highlight on the left
	graphics.fillStyle(shirtHi);
	graphics.fillRect(4, 16, 3, 2);

	// === ARMS (short sleeves: shirt color upper, skin lower) ===
	graphics.fillStyle(shirt);
	graphics.fillRect(3, 17, 3, 3); // left sleeve
	graphics.fillRect(18, 17, 3, 3); // right sleeve
	graphics.fillStyle(skin);
	graphics.fillRect(3, 20, 3, 4); // left forearm + hand
	graphics.fillRect(18, 20, 3, 4); // right forearm + hand

	// === HEAD ===
	graphics.fillStyle(skin);
	// Rounded face (corners trimmed by narrower top/bottom rows)
	graphics.fillRect(8, 4, 8, 10);
	graphics.fillRect(7, 6, 10, 6);
	// Jaw/cheek shading on the right side
	graphics.fillStyle(skinShade);
	graphics.fillRect(15, 7, 1, 5);
	graphics.fillRect(8, 13, 8, 1); // chin shadow

	// Neck
	graphics.fillStyle(skinShade);
	graphics.fillRect(10, 14, 4, 2);

	// === HAIR ===
	graphics.fillStyle(hair);
	drawHair(graphics, config.hairStyle);

	// === FACE DETAILS ===
	// Eyes (dark) with tiny white catch-light
	graphics.fillStyle(0x1a1a1a);
	graphics.fillRect(9, 8, 2, 2); // left eye
	graphics.fillRect(13, 8, 2, 2); // right eye
	graphics.fillStyle(0xffffff);
	graphics.fillRect(9, 8, 1, 1);
	graphics.fillRect(13, 8, 1, 1);
	// Mouth
	graphics.fillStyle(skinShade);
	graphics.fillRect(10, 11, 4, 1);

	// === SHIRT DETAILS ===
	// V-neck collar (lighter trim)
	graphics.fillStyle(shirtHi);
	graphics.fillRect(9, 16, 6, 1);
	graphics.fillStyle(shirtShade);
	graphics.fillRect(11, 16, 2, 2);

	// === SHIRT NUMBER ===
	// White number panel on the chest, then the digit drawn in shirt color
	// inside it so the figure stays readable at tiny sizes.
	const digit = Math.abs(config.number ?? 1) % 10;
	graphics.fillStyle(0xffffff);
	graphics.fillRect(9, 19, 5, 5); // number background panel
	drawDigit(graphics, digit, 10, 20, shirt);

	// Generate texture
	graphics.generateTexture(textureKey, width, height);
	graphics.destroy();
}

/**
 * Draw a single 3x5 pixel digit (0-9) using filled 1px rects.
 * Origin (x, y) is the top-left of the 3x5 glyph box. `color` is the ink.
 */
function drawDigit(
	graphics: Phaser.GameObjects.Graphics,
	digit: number,
	x: number,
	y: number,
	color: number
): void {
	// Each glyph is 5 rows of 3 bits (MSB = leftmost column).
	const FONT: Record<number, number[]> = {
		0: [0b111, 0b101, 0b101, 0b101, 0b111],
		1: [0b010, 0b110, 0b010, 0b010, 0b111],
		2: [0b111, 0b001, 0b111, 0b100, 0b111],
		3: [0b111, 0b001, 0b111, 0b001, 0b111],
		4: [0b101, 0b101, 0b111, 0b001, 0b001],
		5: [0b111, 0b100, 0b111, 0b001, 0b111],
		6: [0b111, 0b100, 0b111, 0b101, 0b111],
		7: [0b111, 0b001, 0b010, 0b010, 0b010],
		8: [0b111, 0b101, 0b111, 0b101, 0b111],
		9: [0b111, 0b101, 0b111, 0b001, 0b111]
	};
	const rows = FONT[digit] ?? FONT[0];
	graphics.fillStyle(color);
	for (let row = 0; row < rows.length; row++) {
		const bits = rows[row];
		for (let col = 0; col < 3; col++) {
			if (bits & (1 << (2 - col))) {
				graphics.fillRect(x + col, y + row, 1, 1);
			}
		}
	}
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

function lightenColor(color: number, amount: number): number {
	const r = ((color >> 16) & 0xff);
	const g = ((color >> 8) & 0xff);
	const b = (color & 0xff);
	const lr = Math.min(255, r + (255 - r) * amount);
	const lg = Math.min(255, g + (255 - g) * amount);
	const lb = Math.min(255, b + (255 - b) * amount);
	return (Math.floor(lr) << 16) | (Math.floor(lg) << 8) | Math.floor(lb);
}

/**
 * Generate a random player config for variety.
 *
 * The team color is always the jersey, so players stay clearly on the same
 * team; only the skin tone, hair, and shirt number vary between them.
 */
export function randomPlayerConfig(teamColor: number): PlayerSpriteConfig {
	const skinTones = Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[];
	const hairColors = Object.keys(HAIR_COLORS) as (keyof typeof HAIR_COLORS)[];
	const hairStyles: HairStyle[] = ['bald', 'short', 'mohawk', 'afro', 'spiky'];

	return {
		teamColor,
		skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
		hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
		hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
		number: Math.floor(Math.random() * 9) + 1
	};
}

/**
 * Pre-generate team sprites with variety.
 *
 * Each player shares the team jersey color but gets a distinct shirt number
 * (1..count) and varied skin/hair so the three aren't identical clones.
 * The last player (highest index) is treated as the goalkeeper and gets a
 * visibly darker jersey shade.
 */
export function generateTeamSprites(
	scene: Phaser.Scene,
	teamPrefix: string,
	teamColor: number,
	count: number = 3
): void {
	// Fixed per-slot variety keeps a team visually consistent across reloads
	// while still making the three players distinguishable from one another.
	const skinTones = Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[];
	const hairColors = Object.keys(HAIR_COLORS) as (keyof typeof HAIR_COLORS)[];
	const hairStyles: HairStyle[] = ['short', 'mohawk', 'spiky', 'afro', 'bald'];

	for (let i = 0; i < count; i++) {
		const config: PlayerSpriteConfig = {
			teamColor,
			skinTone: skinTones[i % skinTones.length],
			hairStyle: hairStyles[i % hairStyles.length],
			hairColor: hairColors[i % hairColors.length],
			number: i + 1,
			isKeeper: i === count - 1
		};
		generatePlayerSprite(scene, `${teamPrefix}_${i}`, config);
	}
}
