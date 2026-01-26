import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import type { Player, SpriteConfig } from '$lib/types/database';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { supabaseAdmin } from '$lib/server/supabase';

const anthropic = new Anthropic({
	apiKey: ANTHROPIC_API_KEY
});

// Available sprite options for the modular system
const SPRITE_OPTIONS = {
	hair: ['bald', 'short', 'mohawk', 'curly', 'long', 'afro', 'spiky', 'ponytail'],
	skin: ['light', 'tan', 'medium', 'dark', 'pale'],
	face: ['happy', 'determined', 'angry', 'smirk', 'confused', 'stern', 'goofy'],
	accessories: ['none', 'headband', 'glasses', 'bandana', 'beard', 'mustache', 'eyepatch', 'scar']
};

interface GeneratedPlayer {
	name: string;
	backstory: string;
	personality: string[];
	celebration: string;
	sprite_config: SpriteConfig;
	pace: number;
	shooting: number;
	passing: number;
	defense: number;
	stamina: number;
	rarity: 'common' | 'rare' | 'legendary';
}

const SYSTEM_PROMPT = `You are the AI Scout for Stupid Soccer, a chaotic anti-FIFA football game. Your job is to generate unique, hilarious player characters based on user prompts.

RULES:
1. Names must be STUPID and FUNNY - think "Thunderfoot McSplash", "Noodle Arms McGee", "Sir Trips-a-Lot"
2. Backstories should be absurd but brief (2-3 sentences max)
3. Personalities are single-word traits (max 3)
4. Celebrations are brief actions they do after scoring
5. Stats are 1-99, distributed based on the player's described role/personality
6. Rarity is based on how unique/special the concept is:
   - common: Basic concepts, generic descriptions
   - rare: Creative combinations, interesting backstories
   - legendary: Truly unique, hilarious, memorable concepts

SPRITE OPTIONS (you MUST choose from these exact values):
- hair: ${SPRITE_OPTIONS.hair.join(', ')}
- skin: ${SPRITE_OPTIONS.skin.join(', ')}
- face: ${SPRITE_OPTIONS.face.join(', ')}
- accessories: ${SPRITE_OPTIONS.accessories.join(', ')} (can have 0-2)

Respond with ONLY valid JSON matching this exact schema:
{
  "name": "string",
  "backstory": "string",
  "personality": ["string", "string"],
  "celebration": "string",
  "sprite_config": {
    "hair": "string",
    "skin": "string",
    "face": "string",
    "accessories": ["string"]
  },
  "pace": number,
  "shooting": number,
  "passing": number,
  "defense": number,
  "stamina": number,
  "rarity": "common" | "rare" | "legendary"
}`;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check if user is authenticated
	const session = await locals.getSession();
	if (!session) {
		throw error(401, 'Must be logged in to use AI Scout');
	}

	const userId = session.user.id;

	// Check AI Scout usage limits
	const { data: profile, error: profileError } = await supabaseAdmin
		.from('profiles')
		.select('ai_scout_uses_this_month, subscription_tier')
		.eq('id', userId)
		.single();

	if (profileError) {
		console.error('Failed to fetch profile:', profileError);
		throw error(500, 'Failed to check usage limits');
	}

	// Free users: 1 per month, Manager Club: unlimited
	const maxUses = profile.subscription_tier === 'manager_club' ? Infinity : 1;
	if (profile.ai_scout_uses_this_month >= maxUses) {
		throw error(429, 'AI Scout limit reached. Upgrade to Manager Club for unlimited scouts!');
	}

	const { prompt } = await request.json();

	if (!prompt || typeof prompt !== 'string') {
		throw error(400, 'Prompt is required');
	}

	if (prompt.length > 500) {
		throw error(400, 'Prompt must be 500 characters or less');
	}

	try {
		const message = await anthropic.messages.create({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 1024,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: `Generate a player based on this description: "${prompt}"`
				}
			]
		});

		// Extract the text content
		const textContent = message.content.find((c) => c.type === 'text');
		if (!textContent || textContent.type !== 'text') {
			throw error(500, 'No response from AI');
		}

		// Parse the JSON response
		let generatedPlayer: GeneratedPlayer;
		try {
			generatedPlayer = JSON.parse(textContent.text);
		} catch {
			console.error('Failed to parse AI response:', textContent.text);
			throw error(500, 'Failed to parse AI response');
		}

		// Validate and clamp stats
		const clampStat = (val: number) => Math.max(1, Math.min(99, Math.round(val)));

		const playerData = {
			owner_id: userId,
			name: generatedPlayer.name,
			generation_prompt: prompt,
			backstory: generatedPlayer.backstory,
			personality: generatedPlayer.personality.slice(0, 3),
			celebration: generatedPlayer.celebration,
			sprite_config: {
				hair: SPRITE_OPTIONS.hair.includes(generatedPlayer.sprite_config.hair)
					? generatedPlayer.sprite_config.hair
					: 'short',
				skin: SPRITE_OPTIONS.skin.includes(generatedPlayer.sprite_config.skin)
					? generatedPlayer.sprite_config.skin
					: 'medium',
				face: SPRITE_OPTIONS.face.includes(generatedPlayer.sprite_config.face)
					? generatedPlayer.sprite_config.face
					: 'happy',
				accessories: (generatedPlayer.sprite_config.accessories || [])
					.filter((a: string) => SPRITE_OPTIONS.accessories.includes(a))
					.slice(0, 2)
			},
			pace: clampStat(generatedPlayer.pace),
			shooting: clampStat(generatedPlayer.shooting),
			passing: clampStat(generatedPlayer.passing),
			defense: clampStat(generatedPlayer.defense),
			stamina: clampStat(generatedPlayer.stamina),
			rarity: ['common', 'rare', 'legendary'].includes(generatedPlayer.rarity)
				? generatedPlayer.rarity
				: 'common',
			is_listed: false,
			is_starter: false
		};

		// Save player to Supabase
		const { data: savedPlayer, error: saveError } = await supabaseAdmin
			.from('players')
			.insert(playerData)
			.select()
			.single();

		if (saveError) {
			console.error('Failed to save player:', saveError);
			throw error(500, 'Failed to save player');
		}

		// Add provenance record
		await supabaseAdmin.from('player_provenance').insert({
			player_id: savedPlayer.id,
			from_user_id: null,
			to_user_id: userId,
			trade_type: 'created',
			coins_exchanged: 0
		});

		// Increment AI Scout usage
		await supabaseAdmin
			.from('profiles')
			.update({ ai_scout_uses_this_month: profile.ai_scout_uses_this_month + 1 })
			.eq('id', userId);

		// Update daily challenge progress for AI Scout usage
		try {
			await supabaseAdmin.rpc('update_challenge_progress', {
				p_user_id: userId,
				p_challenge_type: 'use_scout',
				p_increment: 1,
				p_difficulty: null
			});
		} catch (challengeError) {
			console.error('Failed to update challenge progress:', challengeError);
			// Don't fail - challenges are optional
		}

		return json({ player: savedPlayer });
	} catch (err) {
		console.error('AI Scout error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to generate player');
	}
};
