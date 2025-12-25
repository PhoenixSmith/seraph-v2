# Convex to Supabase Migration Guide

This document provides a comprehensive guide for migrating the Seraph Bible Reader application from Convex to Supabase.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema Migration](#database-schema-migration)
3. [Authentication Migration](#authentication-migration)
4. [Backend Functions Migration](#backend-functions-migration)
5. [Frontend Code Changes](#frontend-code-changes)
6. [Environment Variables](#environment-variables)
7. [Step-by-Step Migration](#step-by-step-migration)

---

## Overview

### Current Convex Architecture

The application currently uses:
- **Convex Auth** with Google OAuth and Resend (magic link email)
- **Convex Database** with real-time subscriptions
- **Convex Functions** (queries, mutations, internal mutations)
- **Convex Scheduler** for background tasks

### Target Supabase Architecture

We'll migrate to:
- **Supabase Auth** with Google OAuth and Magic Link
- **Supabase PostgreSQL** with real-time subscriptions
- **Supabase RPC functions** and **Edge Functions**
- **Supabase pg_cron** for scheduled tasks

---

## Database Schema Migration

### Supabase SQL Schema

Run the following SQL in Supabase SQL Editor to create all tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    leader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_leader ON public.groups(leader_id);

-- ============================================================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE public.group_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
```

### Seed Data

```sql
-- Seed tier thresholds
INSERT INTO public.tier_thresholds (tier, min_xp, tier_order, color) VALUES
    ('Bronze', 0, 1, '#CD7F32'),
    ('Silver', 100, 2, '#C0C0C0'),
    ('Gold', 300, 3, '#FFD700'),
    ('Platinum', 600, 4, '#E5E4E2'),
    ('Diamond', 1000, 5, '#B9F2FF');

-- Note: Achievements should be seeded via an Edge Function or manually
-- See the seedAchievements function in Backend Functions section
```

---

## Authentication Migration

### Supabase Auth Setup

1. **Enable Providers in Supabase Dashboard:**
   - Go to Authentication > Providers
   - Enable **Email** (for magic link)
   - Enable **Google** OAuth

2. **Configure Google OAuth:**
   - Create OAuth credentials in Google Cloud Console
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   - Add Client ID and Secret to Supabase

3. **Configure Email (Magic Link):**
   - Go to Authentication > Email Templates
   - Customize the magic link email template
   - Configure SMTP if using custom email (or use Supabase's default)

---

## Backend Functions Migration

### Supabase RPC Functions

Create these PostgreSQL functions for complex queries:

```sql
-- ============================================================================
-- USER QUERIES
-- ============================================================================

-- Get current user with profile data
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
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
        p.total_xp,
        p.current_streak,
        p.longest_streak,
        p.last_read_date,
        p.current_tier
    FROM public.profiles p
    WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHAPTER COMPLETION FUNCTIONS
-- ============================================================================

-- Complete a chapter
CREATE OR REPLACE FUNCTION complete_chapter(
    p_book TEXT,
    p_chapter INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing RECORD;
    v_xp_per_chapter INTEGER := 10;
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if already completed
    SELECT * INTO v_existing
    FROM public.chapter_completions
    WHERE user_id = v_user_id AND book = p_book AND chapter = p_chapter;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_completed', true,
            'xp_awarded', 0
        );
    END IF;

    -- Record completion
    INSERT INTO public.chapter_completions (user_id, book, chapter, xp_awarded)
    VALUES (v_user_id, p_book, p_chapter, v_xp_per_chapter);

    -- Update user XP
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_chapter
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_chapter)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_chapter;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'already_completed', false,
        'xp_awarded', v_xp_per_chapter
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get completed chapters for a book
CREATE OR REPLACE FUNCTION get_completed_chapters_for_book(p_book TEXT)
RETURNS INTEGER[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT chapter
        FROM public.chapter_completions
        WHERE user_id = auth.uid() AND book = p_book
        ORDER BY chapter
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get book progress
CREATE OR REPLACE FUNCTION get_book_progress(p_book TEXT, p_total_chapters INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_completed
    FROM public.chapter_completions
    WHERE user_id = auth.uid() AND book = p_book;

    RETURN jsonb_build_object(
        'completed', v_completed,
        'total', p_total_chapters,
        'percentage', ROUND((v_completed::NUMERIC / p_total_chapters) * 100),
        'is_complete', v_completed >= p_total_chapters
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROGRESS / STREAK FUNCTIONS
-- ============================================================================

-- Record verse read (updates streak and XP)
CREATE OR REPLACE FUNCTION record_verse_read()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user RECORD;
    v_xp_per_verse INTEGER := 1;
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_new_streak INTEGER;
    v_streak_updated BOOLEAN := false;
    v_new_total_xp INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_user FROM public.profiles WHERE id = v_user_id;

    -- Calculate new streak
    IF v_user.last_read_date IS NULL THEN
        v_new_streak := 1;
        v_streak_updated := true;
    ELSIF v_user.last_read_date = v_today THEN
        v_new_streak := COALESCE(v_user.current_streak, 0);
        v_streak_updated := false;
    ELSIF v_user.last_read_date = v_yesterday THEN
        v_new_streak := COALESCE(v_user.current_streak, 0) + 1;
        v_streak_updated := true;
    ELSE
        v_new_streak := 1;
        v_streak_updated := true;
    END IF;

    -- Update user
    UPDATE public.profiles SET
        total_xp = COALESCE(total_xp, 0) + v_xp_per_verse,
        current_streak = v_new_streak,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
        last_read_date = v_today
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_verse)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_verse;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_verse,
        'total_xp', v_new_total_xp,
        'current_streak', v_new_streak,
        'streak_updated', v_streak_updated
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record quiz answer
CREATE OR REPLACE FUNCTION record_quiz_answer(p_correct BOOLEAN, p_book TEXT, p_chapter INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_xp_per_correct INTEGER := 5;
    v_new_total_xp INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT p_correct THEN
        SELECT total_xp INTO v_new_total_xp FROM public.profiles WHERE id = v_user_id;
        RETURN jsonb_build_object('xp_awarded', 0, 'total_xp', COALESCE(v_new_total_xp, 0));
    END IF;

    -- Update user XP
    UPDATE public.profiles
    SET total_xp = COALESCE(total_xp, 0) + v_xp_per_correct
    WHERE id = v_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Update rolling XP
    INSERT INTO public.rolling_xp (user_id, date, xp_earned)
    VALUES (v_user_id, v_today, v_xp_per_correct)
    ON CONFLICT (user_id, date)
    DO UPDATE SET xp_earned = rolling_xp.xp_earned + v_xp_per_correct;

    -- Recalculate tier
    PERFORM recalculate_user_tier(v_user_id);

    RETURN jsonb_build_object(
        'xp_awarded', v_xp_per_correct,
        'total_xp', v_new_total_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TIER FUNCTIONS
-- ============================================================================

-- Recalculate user tier based on rolling XP
CREATE OR REPLACE FUNCTION recalculate_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_rolling_xp INTEGER;
    v_tier TEXT;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    -- Calculate 14-day rolling XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_rolling_xp
    FROM public.rolling_xp
    WHERE user_id = p_user_id AND date >= v_cutoff_date;

    -- Find appropriate tier
    SELECT tier INTO v_tier
    FROM public.tier_thresholds
    WHERE min_xp <= v_rolling_xp
    ORDER BY tier_order DESC
    LIMIT 1;

    v_tier := COALESCE(v_tier, 'Bronze');

    -- Update user
    UPDATE public.profiles SET current_tier = v_tier WHERE id = p_user_id;

    RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user tier info
CREATE OR REPLACE FUNCTION get_current_user_tier()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_rolling_xp INTEGER;
    v_tier RECORD;
    v_next_tier RECORD;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate 14-day rolling XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_rolling_xp
    FROM public.rolling_xp
    WHERE user_id = v_user_id AND date >= v_cutoff_date;

    -- Find current tier
    SELECT * INTO v_tier
    FROM public.tier_thresholds
    WHERE min_xp <= v_rolling_xp
    ORDER BY tier_order DESC
    LIMIT 1;

    -- Find next tier
    SELECT * INTO v_next_tier
    FROM public.tier_thresholds
    WHERE tier_order = v_tier.tier_order + 1;

    RETURN jsonb_build_object(
        'tier', v_tier.tier,
        'color', v_tier.color,
        'rolling_xp', v_rolling_xp,
        'next_tier', v_next_tier.tier,
        'xp_to_next_tier', CASE WHEN v_next_tier IS NOT NULL THEN v_next_tier.min_xp - v_rolling_xp ELSE NULL END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get rolling XP history
CREATE OR REPLACE FUNCTION get_rolling_xp_history(p_days INTEGER DEFAULT 14)
RETURNS TABLE (date DATE, xp INTEGER) AS $$
DECLARE
    v_user_id UUID;
    v_cutoff_date DATE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    v_cutoff_date := CURRENT_DATE - (p_days || ' days')::INTERVAL;

    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(v_cutoff_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as d
    )
    SELECT
        ds.d as date,
        COALESCE(rx.xp_earned, 0)::INTEGER as xp
    FROM date_series ds
    LEFT JOIN public.rolling_xp rx ON rx.date = ds.d AND rx.user_id = v_user_id
    ORDER BY ds.d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get global leaderboard
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    rolling_xp BIGINT,
    tier TEXT,
    tier_color TEXT,
    rank BIGINT,
    is_current_user BOOLEAN
) AS $$
DECLARE
    v_current_user UUID;
    v_cutoff_date DATE := CURRENT_DATE - INTERVAL '14 days';
BEGIN
    v_current_user := auth.uid();

    RETURN QUERY
    WITH user_xp AS (
        SELECT
            rx.user_id,
            SUM(rx.xp_earned) as total_rolling_xp
        FROM public.rolling_xp rx
        WHERE rx.date >= v_cutoff_date
        GROUP BY rx.user_id
    ),
    ranked AS (
        SELECT
            p.id as user_id,
            p.name,
            p.avatar_url,
            COALESCE(ux.total_rolling_xp, 0) as rolling_xp,
            COALESCE(
                (SELECT t.tier FROM public.tier_thresholds t
                 WHERE t.min_xp <= COALESCE(ux.total_rolling_xp, 0)
                 ORDER BY t.tier_order DESC LIMIT 1),
                'Bronze'
            ) as tier,
            COALESCE(
                (SELECT t.color FROM public.tier_thresholds t
                 WHERE t.min_xp <= COALESCE(ux.total_rolling_xp, 0)
                 ORDER BY t.tier_order DESC LIMIT 1),
                '#CD7F32'
            ) as tier_color,
            ROW_NUMBER() OVER (ORDER BY COALESCE(ux.total_rolling_xp, 0) DESC) as rank,
            p.id = v_current_user as is_current_user
        FROM public.profiles p
        LEFT JOIN user_xp ux ON ux.user_id = p.id
    )
    SELECT * FROM ranked
    WHERE ranked.rolling_xp > 0
    ORDER BY ranked.rank
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GROUP FUNCTIONS
-- ============================================================================

-- List user's groups
CREATE OR REPLACE FUNCTION list_my_groups()
RETURNS TABLE (
    id UUID,
    name TEXT,
    leader_id UUID,
    created_at TIMESTAMPTZ,
    is_leader BOOLEAN,
    member_count BIGINT
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.leader_id,
        g.created_at,
        g.leader_id = v_user_id as is_leader,
        (SELECT COUNT(*) FROM public.group_memberships gm WHERE gm.group_id = g.id) as member_count
    FROM public.groups g
    INNER JOIN public.group_memberships gm ON gm.group_id = g.id
    WHERE gm.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group details
CREATE OR REPLACE FUNCTION get_group(p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_leader RECORD;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_leader FROM public.profiles WHERE id = v_group.leader_id;

    SELECT EXISTS(
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    RETURN jsonb_build_object(
        'id', v_group.id,
        'name', v_group.name,
        'leader_id', v_group.leader_id,
        'created_at', v_group.created_at,
        'leader_name', v_leader.name,
        'is_leader', v_group.leader_id = v_user_id,
        'is_member', v_is_member
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group leaderboard
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    current_streak INTEGER,
    rank BIGINT,
    is_leader BOOLEAN,
    is_current_user BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN;
    END IF;

    -- Verify user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.name,
        p.avatar_url,
        COALESCE(p.total_xp, 0) as total_xp,
        COALESCE(p.current_streak, 0) as current_streak,
        ROW_NUMBER() OVER (ORDER BY COALESCE(p.total_xp, 0) DESC) as rank,
        p.id = v_group.leader_id as is_leader,
        p.id = v_user_id as is_current_user
    FROM public.profiles p
    INNER JOIN public.group_memberships gm ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY COALESCE(p.total_xp, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create group
CREATE OR REPLACE FUNCTION create_group(p_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_group_id UUID;
    v_trimmed_name TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_trimmed_name := TRIM(p_name);
    IF LENGTH(v_trimmed_name) < 1 OR LENGTH(v_trimmed_name) > 50 THEN
        RAISE EXCEPTION 'Group name must be 1-50 characters';
    END IF;

    -- Create group
    INSERT INTO public.groups (name, leader_id)
    VALUES (v_trimmed_name, v_user_id)
    RETURNING id INTO v_group_id;

    -- Add creator as first member
    INSERT INTO public.group_memberships (group_id, user_id)
    VALUES (v_group_id, v_user_id);

    RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invite to group
CREATE OR REPLACE FUNCTION invite_to_group(p_group_id UUID, p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_invited_user RECORD;
    v_identifier TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Group not found');
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the group leader can invite members');
    END IF;

    v_identifier := TRIM(p_identifier);

    -- Try email first
    IF v_identifier LIKE '%@%' THEN
        SELECT * INTO v_invited_user FROM public.profiles WHERE email = v_identifier;
    END IF;

    -- Try name if not found
    IF v_invited_user IS NULL THEN
        SELECT * INTO v_invited_user FROM public.profiles WHERE name = v_identifier;
    END IF;

    IF v_invited_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    IF v_invited_user.id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You cannot invite yourself');
    END IF;

    -- Check if already a member
    IF EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = p_group_id AND user_id = v_invited_user.id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User is already a member');
    END IF;

    -- Check for existing pending invite
    IF EXISTS (SELECT 1 FROM public.group_invites WHERE group_id = p_group_id AND invited_user_id = v_invited_user.id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invite already sent');
    END IF;

    -- Create invite
    INSERT INTO public.group_invites (group_id, invited_user_id, invited_by_user_id)
    VALUES (p_group_id, v_invited_user.id, v_user_id)
    ON CONFLICT (group_id, invited_user_id)
    DO UPDATE SET status = 'pending', invited_by_user_id = v_user_id, created_at = NOW(), responded_at = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Invite sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to invite
CREATE OR REPLACE FUNCTION respond_to_invite(p_invite_id UUID, p_accept BOOLEAN)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_invite FROM public.group_invites WHERE id = p_invite_id;
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    IF v_invite.invited_user_id != v_user_id THEN
        RAISE EXCEPTION 'This invite is not for you';
    END IF;

    IF v_invite.status != 'pending' THEN
        RAISE EXCEPTION 'Invite already responded to';
    END IF;

    UPDATE public.group_invites SET
        status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
        responded_at = NOW()
    WHERE id = p_invite_id;

    IF p_accept THEN
        INSERT INTO public.group_memberships (group_id, user_id)
        VALUES (v_invite.group_id, v_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending invites for current user
CREATE OR REPLACE FUNCTION get_pending_invites()
RETURNS TABLE (
    id UUID,
    group_id UUID,
    group_name TEXT,
    invited_by_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        gi.id,
        gi.group_id,
        g.name as group_name,
        p.name as invited_by_name,
        gi.created_at
    FROM public.group_invites gi
    INNER JOIN public.groups g ON g.id = gi.group_id
    LEFT JOIN public.profiles p ON p.id = gi.invited_by_user_id
    WHERE gi.invited_user_id = v_user_id AND gi.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave group
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id = v_user_id THEN
        RAISE EXCEPTION 'Transfer leadership before leaving the group';
    END IF;

    DELETE FROM public.group_memberships WHERE group_id = p_group_id AND user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transfer leadership
CREATE OR REPLACE FUNCTION transfer_leadership(p_group_id UUID, p_new_leader_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can transfer leadership';
    END IF;

    IF p_new_leader_id = v_user_id THEN
        RAISE EXCEPTION 'You are already the leader';
    END IF;

    -- Verify new leader is a member
    IF NOT EXISTS (SELECT 1 FROM public.group_memberships WHERE group_id = p_group_id AND user_id = p_new_leader_id) THEN
        RAISE EXCEPTION 'New leader must be a group member';
    END IF;

    UPDATE public.groups SET leader_id = p_new_leader_id WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete group
CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can delete the group';
    END IF;

    -- Delete group (CASCADE will handle memberships and invites)
    DELETE FROM public.groups WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove member
CREATE OR REPLACE FUNCTION remove_member(p_group_id UUID, p_member_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the leader can remove members';
    END IF;

    IF p_member_id = v_user_id THEN
        RAISE EXCEPTION 'Cannot remove yourself. Transfer leadership first.';
    END IF;

    DELETE FROM public.group_memberships WHERE group_id = p_group_id AND user_id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel invite
CREATE OR REPLACE FUNCTION cancel_invite(p_invite_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_invite RECORD;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_invite FROM public.group_invites WHERE id = p_invite_id;
    IF v_invite IS NULL THEN
        RAISE EXCEPTION 'Invite not found';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = v_invite.group_id;
    IF v_group IS NULL OR v_group.leader_id != v_user_id THEN
        RAISE EXCEPTION 'Only the group leader can cancel invites';
    END IF;

    DELETE FROM public.group_invites WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get group pending invites (for leaders)
CREATE OR REPLACE FUNCTION get_group_pending_invites(p_group_id UUID)
RETURNS TABLE (
    id UUID,
    invited_user_name TEXT,
    invited_user_email TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL OR v_group.leader_id != v_user_id THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        gi.id,
        p.name as invited_user_name,
        p.email as invited_user_email,
        gi.created_at
    FROM public.group_invites gi
    LEFT JOIN public.profiles p ON p.id = gi.invited_user_id
    WHERE gi.group_id = p_group_id AND gi.status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ACHIEVEMENT FUNCTIONS
-- ============================================================================

-- Get all achievements with unlock status
CREATE OR REPLACE FUNCTION get_achievements_with_status()
RETURNS TABLE (
    id UUID,
    key TEXT,
    name TEXT,
    description TEXT,
    icon TEXT,
    category TEXT,
    xp_reward INTEGER,
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
        CASE WHEN ua.id IS NOT NULL THEN true ELSE false END as unlocked,
        ua.unlocked_at
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get achievement stats
CREATE OR REPLACE FUNCTION get_achievement_stats()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_total INTEGER;
    v_unlocked INTEGER;
BEGIN
    v_user_id := auth.uid();

    SELECT COUNT(*) INTO v_total FROM public.achievements;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('unlocked', 0, 'total', v_total, 'percentage', 0);
    END IF;

    SELECT COUNT(*) INTO v_unlocked
    FROM public.user_achievements
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'unlocked', v_unlocked,
        'total', v_total,
        'percentage', CASE WHEN v_total > 0 THEN ROUND((v_unlocked::NUMERIC / v_total) * 100) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTION (for scheduled jobs)
-- ============================================================================

-- Cleanup old rolling XP records (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_rolling_xp()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.rolling_xp WHERE date < CURRENT_DATE - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;
```

### Scheduled Jobs (pg_cron)

Enable pg_cron in Supabase and add:

```sql
-- Cleanup old rolling XP records daily
SELECT cron.schedule('cleanup-old-rolling-xp', '0 0 * * *', 'SELECT cleanup_old_rolling_xp()');
```

---

## Frontend Code Changes

### 1. Install Dependencies

Remove Convex and add Supabase:

```bash
npm uninstall convex @convex-dev/auth @auth/core
npm install @supabase/supabase-js @supabase/auth-helpers-react
```

### 2. Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 3. Update main.tsx

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { supabase } from './lib/supabase'
import App from './App'
import './index.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <App />
    </SessionContextProvider>
  </React.StrictMode>,
)
```

### 4. Create Custom Hooks

Create `src/hooks/useSupabase.ts`:

```typescript
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'

export function useAuth() {
  const session = useSession()
  const supabase = useSupabaseClient()

  return {
    isLoading: session === undefined,
    isAuthenticated: !!session,
    user: session?.user,
    signIn: supabase.auth.signInWithOtp,
    signInWithGoogle: () => supabase.auth.signInWithOAuth({ provider: 'google' }),
    signOut: () => supabase.auth.signOut()
  }
}

export function useQuery<T>(
  queryFn: () => Promise<T>,
  deps: any[] = []
): T | undefined {
  const [data, setData] = useState<T>()

  useEffect(() => {
    queryFn().then(setData).catch(console.error)
  }, deps)

  return data
}

export function useMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>
) {
  const [isLoading, setIsLoading] = useState(false)

  const mutate = async (args: TArgs) => {
    setIsLoading(true)
    try {
      return await mutationFn(args)
    } finally {
      setIsLoading(false)
    }
  }

  return { mutate, isLoading }
}
```

### 5. Create API Functions

Create `src/lib/api.ts`:

```typescript
import { supabase } from './supabase'

// Users
export async function getCurrentUser() {
  const { data } = await supabase.rpc('get_current_user')
  return data?.[0] ?? null
}

// Chapters
export async function completeChapter(book: string, chapter: number) {
  const { data, error } = await supabase.rpc('complete_chapter', {
    p_book: book,
    p_chapter: chapter
  })
  if (error) throw error
  return data
}

export async function getCompletedChaptersForBook(book: string) {
  const { data, error } = await supabase.rpc('get_completed_chapters_for_book', {
    p_book: book
  })
  if (error) throw error
  return data ?? []
}

// Progress
export async function recordVerseRead() {
  const { data, error } = await supabase.rpc('record_verse_read')
  if (error) throw error
  return data
}

export async function recordQuizAnswer(correct: boolean, book: string, chapter: number) {
  const { data, error } = await supabase.rpc('record_quiz_answer', {
    p_correct: correct,
    p_book: book,
    p_chapter: chapter
  })
  if (error) throw error
  return data
}

// Tiers
export async function getCurrentUserTier() {
  const { data, error } = await supabase.rpc('get_current_user_tier')
  if (error) throw error
  return data
}

export async function getRollingXpHistory(days = 14) {
  const { data, error } = await supabase.rpc('get_rolling_xp_history', {
    p_days: days
  })
  if (error) throw error
  return data ?? []
}

export async function getGlobalLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_global_leaderboard', {
    p_limit: limit
  })
  if (error) throw error
  return data ?? []
}

// Groups
export async function listMyGroups() {
  const { data, error } = await supabase.rpc('list_my_groups')
  if (error) throw error
  return data ?? []
}

export async function getGroup(groupId: string) {
  const { data, error } = await supabase.rpc('get_group', {
    p_group_id: groupId
  })
  if (error) throw error
  return data
}

export async function getGroupLeaderboard(groupId: string) {
  const { data, error } = await supabase.rpc('get_group_leaderboard', {
    p_group_id: groupId
  })
  if (error) throw error
  return data ?? []
}

export async function createGroup(name: string) {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name
  })
  if (error) throw error
  return data
}

export async function inviteToGroup(groupId: string, identifier: string) {
  const { data, error } = await supabase.rpc('invite_to_group', {
    p_group_id: groupId,
    p_identifier: identifier
  })
  if (error) throw error
  return data
}

export async function respondToInvite(inviteId: string, accept: boolean) {
  const { error } = await supabase.rpc('respond_to_invite', {
    p_invite_id: inviteId,
    p_accept: accept
  })
  if (error) throw error
}

export async function getPendingInvites() {
  const { data, error } = await supabase.rpc('get_pending_invites')
  if (error) throw error
  return data ?? []
}

export async function leaveGroup(groupId: string) {
  const { error } = await supabase.rpc('leave_group', {
    p_group_id: groupId
  })
  if (error) throw error
}

export async function transferLeadership(groupId: string, newLeaderId: string) {
  const { error } = await supabase.rpc('transfer_leadership', {
    p_group_id: groupId,
    p_new_leader_id: newLeaderId
  })
  if (error) throw error
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.rpc('delete_group', {
    p_group_id: groupId
  })
  if (error) throw error
}

export async function removeMember(groupId: string, memberId: string) {
  const { error } = await supabase.rpc('remove_member', {
    p_group_id: groupId,
    p_member_id: memberId
  })
  if (error) throw error
}

export async function cancelInvite(inviteId: string) {
  const { error } = await supabase.rpc('cancel_invite', {
    p_invite_id: inviteId
  })
  if (error) throw error
}

export async function getGroupPendingInvites(groupId: string) {
  const { data, error } = await supabase.rpc('get_group_pending_invites', {
    p_group_id: groupId
  })
  if (error) throw error
  return data ?? []
}

// Achievements
export async function getAchievementsWithStatus() {
  const { data, error } = await supabase.rpc('get_achievements_with_status')
  if (error) throw error
  return data ?? []
}

export async function getAchievementStats() {
  const { data, error } = await supabase.rpc('get_achievement_stats')
  if (error) throw error
  return data
}
```

### 6. Update Auth Component

Update `src/components/Auth.tsx` to use Supabase:

```typescript
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
// ... rest of component with supabase.auth.signInWithOtp and signInWithOAuth
```

---

## Environment Variables

### Remove Convex Variables

```env
# Remove these
VITE_CONVEX_URL=...
CONVEX_DEPLOYMENT=...
AUTH_RESEND_KEY=...
AUTH_RESEND_FROM=...
```

### Add Supabase Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Step-by-Step Migration

### Phase 1: Setup Supabase

1. Create a Supabase project at supabase.com
2. Run the SQL schema migration (Database Schema section)
3. Run the RPC functions (Backend Functions section)
4. Configure Auth providers (Google OAuth, Email Magic Link)
5. Seed initial data (tier thresholds, achievements)

### Phase 2: Update Frontend

1. Install Supabase dependencies
2. Create Supabase client (`src/lib/supabase.ts`)
3. Create API functions (`src/lib/api.ts`)
4. Update `main.tsx` with Supabase provider
5. Update Auth component
6. Update each component to use new API functions

### Phase 3: Component Updates

Each component needs these changes:

| Old Import | New Import |
|------------|-----------|
| `useQuery(api.xxx.yyy)` | `useQuery(() => api.yyy())` |
| `useMutation(api.xxx.yyy)` | `api.yyy()` directly |
| `useConvexAuth()` | `useAuth()` |
| `api.xxx` | Import from `src/lib/api.ts` |

### Phase 4: Testing & Cleanup

1. Test all features
2. Remove Convex files (`convex/` directory)
3. Remove Convex dependencies from `package.json`
4. Update CI/CD pipelines if needed

---

## Key Differences Summary

| Feature | Convex | Supabase |
|---------|--------|----------|
| Real-time | Built-in with `useQuery` | Supabase Realtime subscriptions |
| Auth | `@convex-dev/auth` | `@supabase/auth-helpers-react` |
| Database | Document-based | PostgreSQL |
| Functions | Convex functions | PostgreSQL RPC + Edge Functions |
| Scheduler | `ctx.scheduler.runAfter` | pg_cron |
| IDs | `Id<"table">` | UUID |
| Indexes | Defined in schema | SQL indexes |

---

## Notes

- **Real-time subscriptions**: For real-time updates, use Supabase's `supabase.channel()` API
- **Edge Functions**: For complex server-side logic that can't be RPC, use Supabase Edge Functions (Deno)
- **Data migration**: Export Convex data and import into Supabase if needed
- **Type generation**: Run `supabase gen types typescript` to generate TypeScript types
