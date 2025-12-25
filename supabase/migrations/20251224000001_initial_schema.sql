-- ============================================================================
-- SERAPH BIBLE READER - SUPABASE MIGRATION
-- Run this entire file in the Supabase SQL Editor
-- ============================================================================

-- Use gen_random_uuid() which is built into PostgreSQL 13+

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT UNIQUE,
    email_verified_at TIMESTAMPTZ,
    avatar_url TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    -- Gamification fields
    total_xp INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_read_date DATE,
    current_tier TEXT DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_name ON public.profiles(name);

-- ============================================================================
-- CHAPTER COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE public.chapter_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    xp_awarded INTEGER NOT NULL DEFAULT 10,

    -- Prevent duplicate completions
    UNIQUE(user_id, book, chapter)
);

-- Indexes for efficient querying
CREATE INDEX idx_chapter_completions_user ON public.chapter_completions(user_id);
CREATE INDEX idx_chapter_completions_user_book ON public.chapter_completions(user_id, book);

-- ============================================================================
-- ROLLING XP TABLE (for tier calculations - 14 day window)
-- ============================================================================
CREATE TABLE public.rolling_xp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,

    UNIQUE(user_id, date)
);

CREATE INDEX idx_rolling_xp_user ON public.rolling_xp(user_id);
CREATE INDEX idx_rolling_xp_user_date ON public.rolling_xp(user_id, date);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TYPE achievement_category AS ENUM ('book_completion', 'streak', 'xp_milestone', 'special');

CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category achievement_category NOT NULL,
    requirement JSONB NOT NULL, -- { type: string, value: string | number }
    xp_reward INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_key ON public.achievements(key);
CREATE INDEX idx_achievements_category ON public.achievements(category);

-- ============================================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================================
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- ============================================================================
-- TIER THRESHOLDS TABLE
-- ============================================================================
CREATE TABLE public.tier_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier TEXT UNIQUE NOT NULL,
    min_xp INTEGER NOT NULL,
    tier_order INTEGER NOT NULL,
    color TEXT NOT NULL
);

CREATE INDEX idx_tier_thresholds_order ON public.tier_thresholds(tier_order);

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_leader ON public.groups(leader_id);

-- ============================================================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE public.group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON public.group_memberships(user_id);

-- ============================================================================
-- GROUP INVITES TABLE
-- ============================================================================
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE public.group_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status invite_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,

    UNIQUE(group_id, invited_user_id)
);

CREATE INDEX idx_group_invites_invited_user_status ON public.group_invites(invited_user_id, status);
CREATE INDEX idx_group_invites_group_status ON public.group_invites(group_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rolling_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Chapter Completions: Users can only access their own
CREATE POLICY "Users can view own completions" ON public.chapter_completions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" ON public.chapter_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rolling XP: Users can only access their own
CREATE POLICY "Users can view own rolling xp" ON public.rolling_xp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own rolling xp" ON public.rolling_xp
    FOR ALL USING (auth.uid() = user_id);

-- Achievements: Everyone can view
CREATE POLICY "Achievements viewable by everyone" ON public.achievements
    FOR SELECT USING (true);

-- User Achievements: Users can view their own
CREATE POLICY "Users can view own achievements" ON public.user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tier Thresholds: Everyone can view
CREATE POLICY "Tier thresholds viewable by everyone" ON public.tier_thresholds
    FOR SELECT USING (true);

-- Groups: Members can view their groups
CREATE POLICY "Group members can view groups" ON public.groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON public.groups
    FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update groups" ON public.groups
    FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete groups" ON public.groups
    FOR DELETE USING (auth.uid() = leader_id);

-- Group Memberships
CREATE POLICY "Members can view group memberships" ON public.group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_memberships gm
            WHERE gm.group_id = group_memberships.group_id AND gm.user_id = auth.uid()
        )
    );

CREATE POLICY "Can insert own membership" ON public.group_memberships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders can delete memberships" ON public.group_memberships
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = group_memberships.group_id AND leader_id = auth.uid()
        )
        OR auth.uid() = user_id
    );

-- Group Invites
CREATE POLICY "Users can view their invites" ON public.group_invites
    FOR SELECT USING (
        auth.uid() = invited_user_id
        OR EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = group_invites.group_id AND leader_id = auth.uid()
        )
    );

CREATE POLICY "Leaders can create invites" ON public.group_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = group_id AND leader_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their invites" ON public.group_invites
    FOR UPDATE USING (auth.uid() = invited_user_id);

CREATE POLICY "Leaders can delete invites" ON public.group_invites
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = group_invites.group_id AND leader_id = auth.uid()
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed tier thresholds
INSERT INTO public.tier_thresholds (tier, min_xp, tier_order, color) VALUES
    ('Bronze', 0, 1, '#CD7F32'),
    ('Silver', 100, 2, '#C0C0C0'),
    ('Gold', 300, 3, '#FFD700'),
    ('Platinum', 600, 4, '#E5E4E2'),
    ('Diamond', 1000, 5, '#B9F2FF');
