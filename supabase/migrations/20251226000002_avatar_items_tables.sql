-- ============================================================================
-- AVATAR ITEMS TABLES
-- Creates catalog and user ownership tables for unlockable avatar items
-- ============================================================================

-- Avatar items catalog (master list of all items and their unlock conditions)
CREATE TABLE IF NOT EXISTS public.avatar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_key TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    unlock_method TEXT NOT NULL DEFAULT 'store',
    talent_cost INTEGER,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE SET NULL,
    rarity TEXT DEFAULT 'common',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_unlock_method CHECK (unlock_method IN ('free', 'store', 'achievement', 'both')),
    CONSTRAINT valid_rarity CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    CONSTRAINT valid_category CHECK (category IN ('face', 'hat', 'top', 'bottom', 'outfit', 'misc'))
);

-- User's unlocked items (what they own)
CREATE TABLE IF NOT EXISTS public.user_avatar_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.avatar_items(id) ON DELETE CASCADE,
    unlocked_via TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, item_id),
    CONSTRAINT valid_unlocked_via CHECK (unlocked_via IN ('free', 'purchase', 'achievement', 'grandfathered'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_avatar_items_category ON public.avatar_items(category);
CREATE INDEX IF NOT EXISTS idx_avatar_items_unlock_method ON public.avatar_items(unlock_method);
CREATE INDEX IF NOT EXISTS idx_user_avatar_items_user ON public.user_avatar_items(user_id);

-- Enable RLS
ALTER TABLE public.avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_items ENABLE ROW LEVEL SECURITY;

-- Avatar items viewable by everyone (it's a catalog)
DROP POLICY IF EXISTS "Avatar items viewable by everyone" ON public.avatar_items;
CREATE POLICY "Avatar items viewable by everyone" ON public.avatar_items
    FOR SELECT USING (true);

-- Users can view their own unlocked items
DROP POLICY IF EXISTS "Users can view own avatar items" ON public.user_avatar_items;
CREATE POLICY "Users can view own avatar items" ON public.user_avatar_items
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own items (controlled via RPC for validation)
DROP POLICY IF EXISTS "Users can unlock avatar items" ON public.user_avatar_items;
CREATE POLICY "Users can unlock avatar items" ON public.user_avatar_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
