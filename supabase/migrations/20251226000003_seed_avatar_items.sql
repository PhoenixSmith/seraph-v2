-- ============================================================================
-- SEED AVATAR ITEMS CATALOG
-- Populates avatar_items table with all accessories from UserAvatar.tsx
-- Matches AVATAR_ACCESSORIES constant exactly
-- ============================================================================

-- ============================================================================
-- FREE ITEMS (Everyone starts with these)
-- ============================================================================

INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order) VALUES
-- All "none" options are free (one per category, but we only need distinct ones)
('none_face', 'face', 'None', 'No face accessory', 'free', NULL, 'common', 0),
('none_hat', 'hat', 'None', 'No hat', 'free', NULL, 'common', 0),
('none_top', 'top', 'None', 'No top accessory', 'free', NULL, 'common', 0),
('none_bottom', 'bottom', 'None', 'No bottom accessory', 'free', NULL, 'common', 0),
('none_outfit', 'outfit', 'None', 'No full outfit', 'free', NULL, 'common', 0),
('none_misc', 'misc', 'None', 'No misc accessory', 'free', NULL, 'common', 0),

-- Free starter items (2-3 per category)
('happy', 'face', 'Happy', 'A cheerful smile to brighten your day', 'free', NULL, 'common', 1),
('hoodie', 'top', 'Hoodie', 'Classic comfortable hoodie', 'free', NULL, 'common', 1),
('jeans', 'bottom', 'Jeans', 'Classic blue jeans', 'free', NULL, 'common', 1)
ON CONFLICT (item_key) DO NOTHING;

-- ============================================================================
-- STORE PURCHASABLE ITEMS
-- ============================================================================

INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order) VALUES
-- Face (store)
('happy_2', 'face', 'Cute', 'An adorable expression for the sweetest readers', 'store', 50, 'common', 2),

-- Hat (store)
('pony_tail', 'hat', 'Pony Tail', 'Stylish ponytail for focused reading', 'store', 75, 'common', 1),
('top_hat', 'hat', 'Top Hat', 'Fancy top hat for distinguished readers', 'store', 150, 'rare', 2),

-- Top (store)
('white_hoodie', 'top', 'White Hoodie', 'Clean white hoodie for a fresh look', 'store', 75, 'common', 2),

-- Bottom (store)
('ripped_jeans', 'bottom', 'Ripped Jeans', 'Fashionably distressed denim', 'store', 60, 'common', 2),
('jean_skirt', 'bottom', 'Jean Skirt', 'Cute denim skirt', 'store', 60, 'common', 3),
('suspenders', 'bottom', 'Suspenders', 'Classic suspenders for a distinguished look', 'store', 100, 'rare', 4),

-- Misc (store)
('number_1', 'misc', '#1 Foam Finger', 'Show everyone you''re number one!', 'store', 125, 'rare', 1)
ON CONFLICT (item_key) DO NOTHING;

-- ============================================================================
-- ACHIEVEMENT-EXCLUSIVE ITEMS (Legendary/Epic rewards)
-- ============================================================================

INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order) VALUES
-- Aviators - Unlock by reaching 100-day streak (cool milestone)
('aviators', 'face', 'Aviators', 'Cool sunglasses for the coolest readers. Unlocked by reaching a 100-day reading streak!', 'achievement', NULL, 'epic', 3),

-- Crusader Helmet - Unlock by completing Joshua (conquest theme)
('crusader_helmet', 'hat', 'Crusader Helmet', 'Armor up for your reading crusade. Unlocked by completing the book of Joshua!', 'achievement', NULL, 'epic', 2),

-- Crown - Unlock by completing Psalms (150 chapters - biggest book)
('crown', 'hat', 'Crown', 'A crown fit for royalty. Unlocked by completing all 150 chapters of Psalms!', 'achievement', NULL, 'legendary', 3),

-- Crown of Thorns - Unlock by completing Revelation (end times theme)
('crown_of_thorns', 'hat', 'Crown of Thorns', 'The sacred crown. Unlocked by completing all 22 chapters of Revelation!', 'achievement', NULL, 'legendary', 4),

-- Fancy Dress - Unlock by completing Esther (queen story)
('fancy_dress', 'top', 'Fancy Dress', 'Elegant formal attire fit for royalty. Unlocked by completing the book of Esther!', 'achievement', NULL, 'epic', 3),

-- Sloth Snuggie - Unlock by 40-day streak (cozy comfort for dedicated readers)
('sloth_snuggie', 'outfit', 'Sloth Snuggie', 'The ultimate cozy outfit. Unlocked by completing a 40-day reading streak!', 'achievement', NULL, 'legendary', 1)
ON CONFLICT (item_key) DO NOTHING;

-- ============================================================================
-- LINK ACHIEVEMENT ITEMS TO THEIR ACHIEVEMENTS
-- ============================================================================

-- Crown -> Complete Psalms (book_psalms achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_psalms')
WHERE item_key = 'crown';

-- Crown of Thorns -> Complete Revelation (book_revelation achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_revelation')
WHERE item_key = 'crown_of_thorns';

-- Crusader Helmet -> Complete Joshua (book_joshua achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_joshua')
WHERE item_key = 'crusader_helmet';

-- Aviators -> 100-day streak (streak_100 achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'streak_100')
WHERE item_key = 'aviators';

-- Fancy Dress -> Complete Esther (book_esther achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_esther')
WHERE item_key = 'fancy_dress';

-- Sloth Snuggie -> 40-day streak (streak_40 achievement)
UPDATE public.avatar_items
SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'streak_40')
WHERE item_key = 'sloth_snuggie';
