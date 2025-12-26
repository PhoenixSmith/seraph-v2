-- ============================================================================
-- AVATAR STORE RPC FUNCTIONS
-- Functions for store browsing, purchasing, and item management
-- ============================================================================

-- ============================================================================
-- GET STORE ITEMS WITH USER STATUS
-- Returns all items with ownership and purchase eligibility
-- ============================================================================

CREATE OR REPLACE FUNCTION get_store_items()
RETURNS TABLE (
    id UUID,
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

    SELECT talents INTO v_user_talents
    FROM public.profiles
    WHERE id = v_user_id;

    RETURN QUERY
    SELECT
        ai.id,
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
                 AND uai.id IS NULL  -- not already owned
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

-- ============================================================================
-- PURCHASE AVATAR ITEM WITH TALENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION purchase_avatar_item(p_item_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_item RECORD;
    v_user_talents INTEGER;
    v_already_owned BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get item details
    SELECT * INTO v_item FROM public.avatar_items WHERE id = p_item_id;
    IF v_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    -- Check if can be purchased
    IF v_item.unlock_method NOT IN ('store', 'both') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This item cannot be purchased');
    END IF;

    IF v_item.talent_cost IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This item has no price');
    END IF;

    -- Check if already owned
    SELECT EXISTS(
        SELECT 1 FROM public.user_avatar_items
        WHERE user_id = v_user_id AND item_id = p_item_id
    ) INTO v_already_owned;

    IF v_already_owned THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already own this item');
    END IF;

    -- Check user has enough talents
    SELECT talents INTO v_user_talents FROM public.profiles WHERE id = v_user_id;
    IF COALESCE(v_user_talents, 0) < v_item.talent_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Not enough Talents',
            'required', v_item.talent_cost,
            'current', COALESCE(v_user_talents, 0)
        );
    END IF;

    -- Deduct talents
    UPDATE public.profiles
    SET talents = talents - v_item.talent_cost
    WHERE id = v_user_id;

    -- Grant item
    INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
    VALUES (v_user_id, p_item_id, 'purchase');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Item purchased!',
        'item_key', v_item.item_key,
        'item_name', v_item.name,
        'talents_spent', v_item.talent_cost,
        'talents_remaining', v_user_talents - v_item.talent_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLAIM ACHIEVEMENT-UNLOCKED ITEM
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_achievement_item(p_item_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_item RECORD;
    v_has_achievement BOOLEAN;
    v_already_owned BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_item FROM public.avatar_items WHERE id = p_item_id;
    IF v_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    IF v_item.achievement_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This item is not achievement-locked');
    END IF;

    -- Check if user has the achievement
    SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user_id AND achievement_id = v_item.achievement_id
    ) INTO v_has_achievement;

    IF NOT v_has_achievement THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have not unlocked the required achievement');
    END IF;

    -- Check if already owned
    SELECT EXISTS(
        SELECT 1 FROM public.user_avatar_items
        WHERE user_id = v_user_id AND item_id = p_item_id
    ) INTO v_already_owned;

    IF v_already_owned THEN
        RETURN jsonb_build_object('success', false, 'message', 'You already own this item');
    END IF;

    -- Grant item
    INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
    VALUES (v_user_id, p_item_id, 'achievement');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Item claimed!',
        'item_key', v_item.item_key,
        'item_name', v_item.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET USER'S UNLOCKED ITEMS (for avatar editor filtering)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_avatar_items()
RETURNS TABLE (
    item_key TEXT,
    category TEXT,
    name TEXT,
    rarity TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ai.item_key,
        ai.category,
        ai.name,
        ai.rarity
    FROM public.user_avatar_items uai
    JOIN public.avatar_items ai ON ai.id = uai.item_id
    WHERE uai.user_id = auth.uid()
    ORDER BY ai.category, ai.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIALIZE FREE ITEMS FOR NEW USER
-- Called automatically when a new profile is created
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_user_avatar_items(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_avatar_items (user_id, item_id, unlocked_via)
    SELECT p_user_id, id, 'free'
    FROM public.avatar_items
    WHERE unlock_method = 'free'
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-grant free items on profile creation
DROP TRIGGER IF EXISTS on_profile_created_grant_avatar_items ON public.profiles;

CREATE OR REPLACE FUNCTION handle_new_user_avatar_items()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_avatar_items(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_grant_avatar_items
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_avatar_items();
