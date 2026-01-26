// Database types - will be generated from Supabase schema
// npx supabase gen types typescript --local > src/lib/types/database.ts

export interface Profile {
  id: string;
  username: string;
  coins: number;
  subscription_tier: 'free' | 'manager_club';
  subscription_expires_at: string | null;
  ai_scout_uses_this_month: number;
  ai_scout_reset_at: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  owner_id: string | null;
  name: string;
  generation_prompt: string | null;
  backstory: string | null;
  personality: string[];
  celebration: string | null;
  sprite_config: SpriteConfig;
  pace: number;
  shooting: number;
  passing: number;
  defense: number;
  stamina: number;
  rarity: 'common' | 'rare' | 'legendary';
  is_listed: boolean;
  list_price: number | null;
  is_starter: boolean;
  created_at: string;
}

export interface SpriteConfig {
  hair: string;
  skin: string;
  face: string;
  accessories: string[];
}

// Extended types for joins
export interface PlayerWithOwner extends Player {
  owner?: {
    username: string;
  } | null;
}

export interface PlayerProvenance {
  id: string;
  player_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  trade_type: 'created' | 'traded';
  coins_exchanged: number;
  traded_at: string;
}

export interface Trade {
  id: string;
  proposer_id: string;
  recipient_id: string;
  offered_player_id: string;
  requested_player_id: string;
  coins_offered: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface Squad {
  id: string;
  user_id: string;
  player_id: string;
  position: 1 | 2 | 3;
}

export interface Match {
  id: string;
  user_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  user_score: number;
  ai_score: number;
  coins_earned: number;
  squad_snapshot: object | null;
  played_at: string;
}

export interface PackType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  player_count: number;
  rarity_weights: {
    common: number;
    rare: number;
    legendary: number;
  };
  is_active: boolean;
  created_at: string;
}

export interface PackPurchase {
  id: string;
  user_id: string;
  pack_type_id: string;
  price_paid: number;
  opened_at: string;
}
