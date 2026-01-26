-- Stupid Soccer - Seed Data for Development
-- Run with: supabase db push

-- Create some starter players that will be available in the marketplace
-- These are "unclaimed" players (owner_id is NULL) that new users can discover

INSERT INTO public.players (
  owner_id, name, generation_prompt, backstory, personality, celebration,
  sprite_config, pace, shooting, passing, defense, stamina, rarity, is_listed, list_price
) VALUES
-- Legendary Players
(
  NULL,
  'Thunderfoot McSplash',
  'A chaotic striker who trained with circus performers',
  'Once scored a goal so powerful it knocked out the goalkeeper, the net, and three spectators. Banned from indoor football for "excessive celebration damage."',
  ARRAY['chaotic', 'loud'],
  'Does a backflip but always lands on his face',
  '{"hair": "mohawk", "skin": "tan", "face": "determined", "accessories": ["headband"]}'::jsonb,
  88, 92, 45, 23, 76,
  'legendary',
  true,
  500
),
(
  NULL,
  'Grandpa Goals',
  'A very old striker who has been playing since 1956',
  'Has been playing professional football since 1956. Nobody knows how he is still alive, let alone scoring. His secret? "Rage and prune juice."',
  ARRAY['wise', 'slow'],
  'Takes a nap on the pitch',
  '{"hair": "bald", "skin": "pale", "face": "happy", "accessories": ["glasses", "mustache"]}'::jsonb,
  15, 95, 89, 12, 25,
  'legendary',
  true,
  750
),

-- Rare Players
(
  NULL,
  'Whiskers O''Dribble',
  'A mysterious winger who claims to have trained with cats',
  'Claims to have trained with actual cats. Nobody believes him but his footwork is suspiciously feline.',
  ARRAY['mysterious', 'agile'],
  'Pretends to clean his face like a cat',
  '{"hair": "curly", "skin": "light", "face": "smirk", "accessories": []}'::jsonb,
  95, 67, 78, 34, 89,
  'rare',
  true,
  250
),
(
  NULL,
  'Brick Wallson',
  'An immovable defender',
  'Was literally a brick wall in a past life. Defense is his love language. Offense is a foreign concept he refuses to learn.',
  ARRAY['stoic', 'immovable'],
  'Stands completely still for 30 seconds',
  '{"hair": "bald", "skin": "dark", "face": "stern", "accessories": []}'::jsonb,
  34, 28, 56, 99, 94,
  'rare',
  true,
  280
),
(
  NULL,
  'The Invisible Man',
  'A midfielder nobody notices until it is too late',
  'So good at positioning that referees forget to card him. Opponents swear he was never on the pitch until he scores.',
  ARRAY['sneaky', 'quiet'],
  'Disappears behind the goal post',
  '{"hair": "short", "skin": "light", "face": "confused", "accessories": []}'::jsonb,
  72, 68, 91, 74, 88,
  'rare',
  true,
  220
),
(
  NULL,
  'Slippery Steve',
  'A goalkeeper covered in mystery oil',
  'Once saved a penalty by literally sliding across the entire goal. Referees check him for oil before every match. They never find anything.',
  ARRAY['slick', 'unpredictable'],
  'Slides on belly across the pitch',
  '{"hair": "mohawk", "skin": "tan", "face": "goofy", "accessories": []}'::jsonb,
  78, 22, 45, 88, 72,
  'rare',
  true,
  190
),

-- Common Players (free agent pool)
(
  NULL,
  'Budget Ben',
  'A cheap but reliable player who works at a grocery store',
  'Works at a grocery store on weekends. Brings oranges for halftime. Surprisingly dependable.',
  ARRAY['humble', 'reliable'],
  'Checks his bank account on his phone',
  '{"hair": "short", "skin": "medium", "face": "happy", "accessories": []}'::jsonb,
  55, 52, 58, 54, 60,
  'common',
  true,
  50
),
(
  NULL,
  'Noodle Arms McGee',
  'A floppy goalkeeper with unusually long arms',
  'Has the longest arms in football history. Nobody knows why. Scientists are baffled. Goalkeepers are jealous.',
  ARRAY['flexible', 'unpredictable'],
  'Waves arms like noodles in the wind',
  '{"hair": "short", "skin": "pale", "face": "goofy", "accessories": ["glasses"]}'::jsonb,
  45, 12, 67, 78, 82,
  'common',
  true,
  75
),
(
  NULL,
  'Captain Obvious',
  'A midfielder who states the obvious constantly',
  'Once announced "The ball is round" and the crowd went absolutely wild. His tactical insights include "we should score more goals."',
  ARRAY['literal', 'helpful'],
  'Points at the scoreboard and nods sagely',
  '{"hair": "short", "skin": "medium", "face": "happy", "accessories": ["bandana"]}'::jsonb,
  72, 65, 88, 55, 77,
  'common',
  true,
  65
),
(
  NULL,
  'Sir Trips-a-Lot',
  'A clumsy winger who falls over constantly',
  'Falls over at least once per minute. Has perfected the art of the accidental nutmeg while tumbling. Surprisingly effective.',
  ARRAY['clumsy', 'lucky'],
  'Falls over while celebrating, scores another goal',
  '{"hair": "spiky", "skin": "light", "face": "confused", "accessories": []}'::jsonb,
  82, 58, 45, 32, 69,
  'common',
  true,
  55
);

-- Note: More players will be added as users create them via AI Scout
