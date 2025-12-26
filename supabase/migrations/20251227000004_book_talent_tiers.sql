-- ============================================================================
-- SERAPH BIBLE READER - BOOK COMPLETION TALENT TIERS
-- Awards talents based on relative book length, ramped up with Tier 1 at 10
-- ============================================================================

-- ============================================================================
-- Talent rewards by tier:
--
-- Psalms (150 chapters):    250 talents - Legendary
-- Isaiah (66 chapters):     150 talents - Epic
-- Tier 4 (31-52 chapters):  100 talents - Genesis, Exodus, Job, Jeremiah...
-- Tier 3 (15-30 chapters):   50 talents - Gospels, Acts, Romans...
-- Tier 2 (5-14 chapters):    25 talents - Daniel, Esther, Hebrews...
-- Tier 1 (1-4 chapters):     10 talents - Obadiah, Philemon, Jude...
-- ============================================================================

UPDATE public.achievements
SET talent_reward = CASE
    -- Special cases for the big two
    WHEN requirement->>'book' = 'Psalms' THEN 250           -- 150 chapters - legendary
    WHEN requirement->>'book' = 'Isaiah' THEN 150           -- 66 chapters - epic
    -- Tier 4 (31-52 chapters): 100 talents
    WHEN (requirement->>'chapters')::INTEGER >= 31 THEN 100
    -- Tier 3 (15-30 chapters): 50 talents
    WHEN (requirement->>'chapters')::INTEGER >= 15 THEN 50
    -- Tier 2 (5-14 chapters): 25 talents
    WHEN (requirement->>'chapters')::INTEGER >= 5 THEN 25
    -- Tier 1 (1-4 chapters): 10 talents
    ELSE 10
END
WHERE category = 'book_completion';
