-- ============================================================================
-- SYNC AVATAR ITEMS
-- Updates items to match src/config/avatarItems.ts
-- Only "happy" face is free now, everything else requires Talents or achievements
-- ============================================================================

-- Delete old "none_*" items - we'll recreate them
DELETE FROM public.avatar_items WHERE item_key LIKE 'none_%';

-- Insert none items for each category (always free)
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, rarity, sort_order)
VALUES
  ('none_face', 'face', 'None', 'No face accessory', 'free', 'common', 0),
  ('none_hat', 'hat', 'None', 'No hat', 'free', 'common', 0),
  ('none_top', 'top', 'None', 'No top accessory', 'free', 'common', 0),
  ('none_bottom', 'bottom', 'None', 'No bottom accessory', 'free', 'common', 0),
  ('none_outfit', 'outfit', 'None', 'No full outfit', 'free', 'common', 0),
  ('none_misc', 'misc', 'None', 'No misc accessory', 'free', 'common', 0)
ON CONFLICT (item_key) DO NOTHING;

-- ============================================================================
-- FACE ITEMS
-- ============================================================================

-- Happy - FREE (only free item besides "none")
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('happy', 'face', 'Happy', 'A cheerful smile to brighten your day', 'free', NULL, 'common', 1)
ON CONFLICT (item_key) DO UPDATE SET
  unlock_method = 'free',
  talent_cost = NULL,
  description = EXCLUDED.description;

-- Cute - STORE (was free, now costs Talents)
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('happy_2', 'face', 'Cute', 'An adorable expression for the sweetest readers', 'store', 50, 'common', 2)
ON CONFLICT (item_key) DO UPDATE SET
  unlock_method = 'store',
  talent_cost = 50;

-- Aviators - ACHIEVEMENT (unchanged)
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('aviators', 'face', 'Aviators', 'Cool sunglasses for the coolest readers. Reach a 100-day streak!', 'achievement', NULL, 'epic', 3)
ON CONFLICT (item_key) DO UPDATE SET
  unlock_method = 'achievement',
  talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'streak_100') WHERE item_key = 'aviators';

-- ============================================================================
-- HAT ITEMS
-- ============================================================================

-- Pony Tail - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('pony_tail', 'hat', 'Pony Tail', 'Stylish ponytail for focused reading', 'store', 75, 'common', 1)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 75;

-- Top Hat - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('top_hat', 'hat', 'Top Hat', 'Fancy top hat for distinguished readers', 'store', 150, 'rare', 2)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 150;

-- Crusader Helmet - NEW ACHIEVEMENT ITEM
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('crusader_helmet', 'hat', 'Crusader Helmet', 'Armor up for your reading crusade. Complete the book of Joshua!', 'achievement', NULL, 'epic', 3)
ON CONFLICT (item_key) DO UPDATE SET
  unlock_method = 'achievement',
  talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_joshua') WHERE item_key = 'crusader_helmet';

-- Crown - ACHIEVEMENT
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('crown', 'hat', 'Crown', 'A crown fit for royalty. Complete all 150 chapters of Psalms!', 'achievement', NULL, 'legendary', 4)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'achievement', talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_psalms') WHERE item_key = 'crown';

-- Crown of Thorns - ACHIEVEMENT
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('crown_of_thorns', 'hat', 'Crown of Thorns', 'The sacred crown. Complete the book of Revelation!', 'achievement', NULL, 'legendary', 5)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'achievement', talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_revelation') WHERE item_key = 'crown_of_thorns';

-- ============================================================================
-- TOP ITEMS (now all cost Talents except achievement items)
-- ============================================================================

-- Hoodie - STORE (was free)
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('hoodie', 'top', 'Hoodie', 'Classic comfortable hoodie', 'store', 40, 'common', 1)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 40;

-- White Hoodie - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('white_hoodie', 'top', 'White Hoodie', 'Clean white hoodie for a fresh look', 'store', 75, 'common', 2)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 75;

-- Fancy Dress - ACHIEVEMENT
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('fancy_dress', 'top', 'Fancy Dress', 'Elegant formal attire fit for royalty. Complete the book of Esther!', 'achievement', NULL, 'epic', 3)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'achievement', talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'book_esther') WHERE item_key = 'fancy_dress';

-- ============================================================================
-- BOTTOM ITEMS (now all cost Talents)
-- ============================================================================

-- Jeans - STORE (was free)
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('jeans', 'bottom', 'Jeans', 'Classic blue jeans', 'store', 40, 'common', 1)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 40;

-- Ripped Jeans - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('ripped_jeans', 'bottom', 'Ripped Jeans', 'Fashionably distressed denim', 'store', 60, 'common', 2)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 60;

-- Jean Skirt - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('jean_skirt', 'bottom', 'Jean Skirt', 'Cute denim skirt', 'store', 60, 'common', 3)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 60;

-- Suspenders - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('suspenders', 'bottom', 'Suspenders', 'Classic suspenders for a distinguished look', 'store', 100, 'rare', 4)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 100;

-- ============================================================================
-- OUTFIT ITEMS
-- ============================================================================

-- Sloth Snuggie - ACHIEVEMENT
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('sloth_snuggie', 'outfit', 'Sloth Snuggie', 'The ultimate cozy outfit. Complete a 40-day reading streak!', 'achievement', NULL, 'legendary', 1)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'achievement', talent_cost = NULL;

UPDATE public.avatar_items SET achievement_id = (SELECT id FROM public.achievements WHERE key = 'streak_40') WHERE item_key = 'sloth_snuggie';

-- ============================================================================
-- MISC ITEMS
-- ============================================================================

-- #1 Foam Finger - STORE
INSERT INTO public.avatar_items (item_key, category, name, description, unlock_method, talent_cost, rarity, sort_order)
VALUES ('number_1', 'misc', '#1 Foam Finger', 'Show everyone you''re number one!', 'store', 125, 'rare', 1)
ON CONFLICT (item_key) DO UPDATE SET unlock_method = 'store', talent_cost = 125;

-- ============================================================================
-- REFRESH USER UNLOCKS
-- Remove ownership of items that are no longer free (except grandfathered)
-- ============================================================================

-- Delete free unlocks for items that are no longer free (keep grandfathered and purchased)
DELETE FROM public.user_avatar_items
WHERE unlocked_via = 'free'
AND item_id IN (
  SELECT id FROM public.avatar_items
  WHERE unlock_method != 'free'
  AND item_key NOT LIKE 'none_%'
);

-- Re-grant free items to all users
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT p.id, ai.id, 'free'
FROM public.profiles p
CROSS JOIN public.avatar_items ai
WHERE ai.unlock_method = 'free'
ON CONFLICT (user_id, item_id) DO NOTHING;

-- Grant new crusader helmet to users who have book_joshua achievement
INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
SELECT ua.user_id, ai.id, 'achievement'
FROM public.user_achievements ua
JOIN public.avatar_items ai ON ai.achievement_id = ua.achievement_id
WHERE ai.item_key = 'crusader_helmet'
ON CONFLICT (user_id, item_id) DO NOTHING;
