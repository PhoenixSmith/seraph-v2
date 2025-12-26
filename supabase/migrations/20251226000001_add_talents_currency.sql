-- ============================================================================
-- TALENTS CURRENCY MIGRATION
-- Adds talents column to profiles for avatar store purchases
-- ============================================================================

-- Add talents column to profiles (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'talents'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN talents INTEGER DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- UPDATE get_current_user TO RETURN TALENTS
-- Must DROP first because return type is changing
-- ============================================================================

DROP FUNCTION IF EXISTS get_current_user();

CREATE OR REPLACE FUNCTION get_current_user()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    avatar_config JSONB,
    total_xp INTEGER,
    talents INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_read_date DATE,
    current_tier TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.email,
        p.avatar_url,
        COALESCE(p.avatar_config, '{"face":"none","hat":"none","top":"none","bottom":"none","outfit":"none","misc":"none"}'::jsonb) AS avatar_config,
        COALESCE(p.total_xp, 0) AS total_xp,
        COALESCE(p.talents, 0) AS talents,
        COALESCE(p.current_streak, 0) AS current_streak,
        COALESCE(p.longest_streak, 0) AS longest_streak,
        p.last_read_date,
        COALESCE(p.current_tier, 'Bronze') AS current_tier
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO AWARD TALENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION award_talents(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.profiles
    SET talents = COALESCE(talents, 0) + p_amount
    WHERE id = p_user_id
    RETURNING talents INTO v_new_balance;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
