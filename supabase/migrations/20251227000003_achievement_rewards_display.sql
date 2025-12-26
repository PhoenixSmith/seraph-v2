-- ============================================================================
-- UPDATE: get_achievements_with_status to include talent_reward and linked items
-- ============================================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS get_achievements_with_status();

-- Create new function with updated return type
CREATE OR REPLACE FUNCTION get_achievements_with_status()
RETURNS TABLE (
    id UUID,
    key TEXT,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    xp_reward INTEGER,
    talent_reward INTEGER,
    linked_item_key TEXT,
    linked_item_name TEXT,
    linked_item_category TEXT,
    linked_item_rarity TEXT,
    unlocked BOOLEAN,
    unlocked_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    RETURN QUERY
    SELECT
        a.id,
        a.key,
        a.name,
        a.description,
        a.icon,
        a.category::TEXT,
        a.xp_reward,
        COALESCE(a.talent_reward, 0) as talent_reward,
        ai.item_key as linked_item_key,
        ai.name as linked_item_name,
        ai.category::TEXT as linked_item_category,
        ai.rarity::TEXT as linked_item_rarity,
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked,
        ua.unlocked_at
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id
    LEFT JOIN public.avatar_items ai ON ai.achievement_id = a.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
