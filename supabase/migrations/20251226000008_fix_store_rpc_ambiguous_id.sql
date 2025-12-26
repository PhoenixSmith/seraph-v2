-- ============================================================================
-- FIX AMBIGUOUS ID COLUMN IN get_store_items()
-- Rename output column from 'id' to 'item_id' to avoid conflict
-- ============================================================================

-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS get_store_items();

CREATE OR REPLACE FUNCTION get_store_items()
RETURNS TABLE (
    item_id UUID,
    item_key TEXT,
    category TEXT,
    name TEXT,
    description TEXT,
    unlock_method TEXT,
    talent_cost INTEGER,
    achievement_id UUID,
    achievement_name TEXT,
    achievement_icon TEXT,
    achievement_description TEXT,
    rarity TEXT,
    sort_order INTEGER,
    is_owned BOOLEAN,
    can_purchase BOOLEAN,
    can_claim_achievement BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
    v_user_talents INTEGER;
BEGIN
    v_user_id := auth.uid();

    SELECT p.talents INTO v_user_talents
    FROM public.profiles p
    WHERE p.id = v_user_id;

    RETURN QUERY
    SELECT
        ai.id AS item_id,
        ai.item_key,
        ai.category,
        ai.name,
        ai.description,
        ai.unlock_method,
        ai.talent_cost,
        ai.achievement_id,
        a.name AS achievement_name,
        a.icon AS achievement_icon,
        a.description AS achievement_description,
        ai.rarity,
        ai.sort_order,
        CASE WHEN uai.id IS NOT NULL THEN true ELSE false END AS is_owned,
        CASE
            WHEN ai.unlock_method IN ('store', 'both')
                 AND ai.talent_cost IS NOT NULL
                 AND COALESCE(v_user_talents, 0) >= ai.talent_cost
            THEN true
            ELSE false
        END AS can_purchase,
        CASE
            WHEN ai.achievement_id IS NOT NULL
                 AND EXISTS (
                     SELECT 1 FROM public.user_achievements ua
                     WHERE ua.user_id = v_user_id AND ua.achievement_id = ai.achievement_id
                 )
                 AND uai.id IS NULL
            THEN true
            ELSE false
        END AS can_claim_achievement
    FROM public.avatar_items ai
    LEFT JOIN public.user_avatar_items uai
        ON uai.item_id = ai.id AND uai.user_id = v_user_id
    LEFT JOIN public.achievements a
        ON a.id = ai.achievement_id
    ORDER BY ai.category, ai.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
