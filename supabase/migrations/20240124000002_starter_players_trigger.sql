-- Stupid Soccer - Starter Players Trigger
-- Gives new users 5 random starter players upon signup

-- Function to generate a random starter player for a new user
CREATE OR REPLACE FUNCTION public.generate_starter_player(
  p_owner_id UUID,
  p_position INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_names TEXT[] := ARRAY[
    'Wobbly Walker', 'Kicks McGee', 'Trip Hazard', 'Dizzy Dave',
    'Stumbles O''Brien', 'Flopsy Jenkins', 'Boomer Bradley', 'Skippy Stone',
    'Bendy Boris', 'Twinkle Toes Tim', 'Clumsy Carl', 'Speedy Snail Sam',
    'Lazy Larry', 'Hyper Henry', 'Mumbles Murphy', 'Whisper Wilson'
  ];
  v_backstories TEXT[] := ARRAY[
    'Found playing football in a car park. Dreams of the big leagues.',
    'Local legend who once scored an own goal from the halfway line.',
    'Recruited from a company football team. The company was a bakery.',
    'Has never actually touched a football before signing up.',
    'Claims to have trained with professionals. The professionals were pigeons.',
    'Former accountant who calculated the optimal kick angle. Still misses.',
    'Only plays football because they thought it was called "footbowl".',
    'Joined the team for the free oranges at halftime.'
  ];
  v_personalities TEXT[][] := ARRAY[
    ARRAY['eager', 'clumsy'],
    ARRAY['lazy', 'lucky'],
    ARRAY['determined', 'slow'],
    ARRAY['cheerful', 'distracted'],
    ARRAY['confident', 'delusional'],
    ARRAY['quiet', 'sneaky'],
    ARRAY['loud', 'motivational'],
    ARRAY['grumpy', 'effective']
  ];
  v_celebrations TEXT[] := ARRAY[
    'Does a little dance, trips over the ball',
    'Runs to the corner flag, misses it',
    'Attempts a knee slide, goes too far',
    'Points to the crowd, there is no crowd',
    'Takes a selfie with imaginary phone',
    'Does push-ups but can only manage two',
    'Waves to mum in the stands',
    'Just stands there, confused'
  ];
  v_hair TEXT[] := ARRAY['bald', 'short', 'mohawk', 'curly', 'long', 'afro', 'spiky', 'ponytail'];
  v_skin TEXT[] := ARRAY['light', 'tan', 'medium', 'dark', 'pale'];
  v_face TEXT[] := ARRAY['happy', 'determined', 'angry', 'smirk', 'confused', 'stern', 'goofy'];
  v_accessories TEXT[] := ARRAY['none', 'headband', 'glasses', 'bandana', 'beard', 'mustache'];
  v_name TEXT;
  v_backstory TEXT;
  v_personality TEXT[];
  v_celebration TEXT;
  v_hair_style TEXT;
  v_skin_tone TEXT;
  v_face_style TEXT;
  v_accessory TEXT;
  v_pace INTEGER;
  v_shooting INTEGER;
  v_passing INTEGER;
  v_defense INTEGER;
  v_stamina INTEGER;
BEGIN
  -- Randomly select attributes
  v_name := v_names[1 + floor(random() * array_length(v_names, 1))];
  v_backstory := v_backstories[1 + floor(random() * array_length(v_backstories, 1))];
  v_personality := v_personalities[1 + floor(random() * array_length(v_personalities, 1))];
  v_celebration := v_celebrations[1 + floor(random() * array_length(v_celebrations, 1))];
  v_hair_style := v_hair[1 + floor(random() * array_length(v_hair, 1))];
  v_skin_tone := v_skin[1 + floor(random() * array_length(v_skin, 1))];
  v_face_style := v_face[1 + floor(random() * array_length(v_face, 1))];
  v_accessory := v_accessories[1 + floor(random() * array_length(v_accessories, 1))];

  -- Generate random common stats (30-70 range for starters)
  v_pace := 30 + floor(random() * 40);
  v_shooting := 30 + floor(random() * 40);
  v_passing := 30 + floor(random() * 40);
  v_defense := 30 + floor(random() * 40);
  v_stamina := 30 + floor(random() * 40);

  -- Create the player
  INSERT INTO public.players (
    owner_id, name, generation_prompt, backstory, personality, celebration,
    sprite_config, pace, shooting, passing, defense, stamina, rarity, is_listed, is_starter
  ) VALUES (
    p_owner_id,
    v_name || ' #' || (random() * 99)::integer,
    'Starter player',
    v_backstory,
    v_personality,
    v_celebration,
    jsonb_build_object(
      'hair', v_hair_style,
      'skin', v_skin_tone,
      'face', v_face_style,
      'accessories', CASE WHEN v_accessory = 'none' THEN '[]'::jsonb ELSE jsonb_build_array(v_accessory) END
    ),
    v_pace, v_shooting, v_passing, v_defense, v_stamina,
    'common',
    false,
    p_position <= 3  -- First 3 players are starters
  )
  RETURNING id INTO v_player_id;

  -- Add provenance record
  INSERT INTO public.player_provenance (player_id, from_user_id, to_user_id, trade_type, coins_exchanged)
  VALUES (v_player_id, NULL, p_owner_id, 'created', 0);

  -- If this is a starter (positions 1-3), add to squad
  IF p_position <= 3 THEN
    INSERT INTO public.squads (user_id, player_id, position)
    VALUES (p_owner_id, v_player_id, p_position);
  END IF;

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create all starter players for a new user
CREATE OR REPLACE FUNCTION public.create_starter_players()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 5 starter players for the new user
  -- First 3 will be in the starting squad, last 2 on bench
  PERFORM public.generate_starter_player(NEW.id, 1);
  PERFORM public.generate_starter_player(NEW.id, 2);
  PERFORM public.generate_starter_player(NEW.id, 3);
  PERFORM public.generate_starter_player(NEW.id, 4);
  PERFORM public.generate_starter_player(NEW.id, 5);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create starter players after profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_starter_players();
