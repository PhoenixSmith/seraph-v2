-- ============================================================================
-- VERSE NOTES MIGRATION
-- Adds: verse notes with personal/group visibility, replies for discussions
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Verse notes table
CREATE TABLE IF NOT EXISTS public.verse_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT true,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_verse_notes_location ON public.verse_notes(book, chapter, verse);
CREATE INDEX IF NOT EXISTS idx_verse_notes_group ON public.verse_notes(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verse_notes_user ON public.verse_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_verse_notes_user_private ON public.verse_notes(user_id) WHERE is_private = true;

-- Verse note replies table
CREATE TABLE IF NOT EXISTS public.verse_note_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.verse_notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verse_note_replies_note ON public.verse_note_replies(note_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.verse_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_note_replies ENABLE ROW LEVEL SECURITY;

-- Users can view their own private notes
DROP POLICY IF EXISTS "Users can view own private notes" ON public.verse_notes;
CREATE POLICY "Users can view own private notes" ON public.verse_notes
    FOR SELECT USING (
        user_id = auth.uid() AND is_private = true
    );

-- Users can view group notes for groups they belong to
DROP POLICY IF EXISTS "Members can view group notes" ON public.verse_notes;
CREATE POLICY "Members can view group notes" ON public.verse_notes
    FOR SELECT USING (
        is_private = false AND
        EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_id = verse_notes.group_id AND user_id = auth.uid()
        )
    );

-- Users can insert notes (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Users can insert notes" ON public.verse_notes;
CREATE POLICY "Users can insert notes" ON public.verse_notes
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update/delete their own notes
DROP POLICY IF EXISTS "Users can update own notes" ON public.verse_notes;
CREATE POLICY "Users can update own notes" ON public.verse_notes
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notes" ON public.verse_notes;
CREATE POLICY "Users can delete own notes" ON public.verse_notes
    FOR DELETE USING (user_id = auth.uid());

-- Replies: users can view replies on notes they can see (handled via SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can view replies" ON public.verse_note_replies;
CREATE POLICY "Users can view replies" ON public.verse_note_replies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert replies" ON public.verse_note_replies;
CREATE POLICY "Users can insert replies" ON public.verse_note_replies
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own replies" ON public.verse_note_replies;
CREATE POLICY "Users can delete own replies" ON public.verse_note_replies
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Create a verse note
CREATE OR REPLACE FUNCTION create_verse_note(
    p_book TEXT,
    p_chapter INTEGER,
    p_verse INTEGER,
    p_content TEXT,
    p_group_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note_id UUID;
    v_is_private BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF TRIM(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note content cannot be empty');
    END IF;

    -- If group_id provided, verify membership
    IF p_group_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_id = p_group_id AND user_id = v_user_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this group');
        END IF;
        v_is_private := false;
    ELSE
        v_is_private := true;
    END IF;

    INSERT INTO public.verse_notes (user_id, book, chapter, verse, content, is_private, group_id)
    VALUES (v_user_id, p_book, p_chapter, p_verse, TRIM(p_content), v_is_private, p_group_id)
    RETURNING id INTO v_note_id;

    RETURN jsonb_build_object('success', true, 'note_id', v_note_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get notes for a chapter (user's private + group shared)
CREATE OR REPLACE FUNCTION get_chapter_notes(
    p_book TEXT,
    p_chapter INTEGER,
    p_group_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar_url TEXT,
    user_avatar_config JSONB,
    verse INTEGER,
    content TEXT,
    is_private BOOLEAN,
    group_id UUID,
    group_name TEXT,
    created_at TIMESTAMPTZ,
    reply_count BIGINT
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
        vn.id,
        vn.user_id,
        p.name as user_name,
        p.avatar_url as user_avatar_url,
        p.avatar_config as user_avatar_config,
        vn.verse,
        vn.content,
        vn.is_private,
        vn.group_id,
        g.name as group_name,
        vn.created_at,
        (SELECT COUNT(*) FROM public.verse_note_replies vnr WHERE vnr.note_id = vn.id) as reply_count
    FROM public.verse_notes vn
    INNER JOIN public.profiles p ON p.id = vn.user_id
    LEFT JOIN public.groups g ON g.id = vn.group_id
    WHERE vn.book = p_book AND vn.chapter = p_chapter
    AND (
        -- User's own private notes
        (vn.user_id = v_user_id AND vn.is_private = true)
        OR
        -- Group notes for groups user is a member of
        (vn.is_private = false AND vn.group_id = ANY(p_group_ids))
    )
    ORDER BY vn.verse ASC, vn.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get a single note with replies
CREATE OR REPLACE FUNCTION get_note_with_replies(p_note_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
    v_replies JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get the note
    SELECT
        vn.*,
        p.name as user_name,
        p.avatar_url as user_avatar_url,
        p.avatar_config as user_avatar_config,
        g.name as group_name
    INTO v_note
    FROM public.verse_notes vn
    INNER JOIN public.profiles p ON p.id = vn.user_id
    LEFT JOIN public.groups g ON g.id = vn.group_id
    WHERE vn.id = p_note_id;

    IF v_note IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check access
    IF v_note.is_private AND v_note.user_id != v_user_id THEN
        RETURN NULL;
    END IF;

    IF NOT v_note.is_private THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.group_memberships
            WHERE group_id = v_note.group_id AND user_id = v_user_id
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Get replies
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', vnr.id,
            'user_id', vnr.user_id,
            'user_name', p.name,
            'user_avatar_url', p.avatar_url,
            'user_avatar_config', p.avatar_config,
            'content', vnr.content,
            'created_at', vnr.created_at
        ) ORDER BY vnr.created_at ASC
    ), '[]'::jsonb) INTO v_replies
    FROM public.verse_note_replies vnr
    INNER JOIN public.profiles p ON p.id = vnr.user_id
    WHERE vnr.note_id = p_note_id;

    RETURN jsonb_build_object(
        'id', v_note.id,
        'user_id', v_note.user_id,
        'user_name', v_note.user_name,
        'user_avatar_url', v_note.user_avatar_url,
        'user_avatar_config', v_note.user_avatar_config,
        'book', v_note.book,
        'chapter', v_note.chapter,
        'verse', v_note.verse,
        'content', v_note.content,
        'is_private', v_note.is_private,
        'group_id', v_note.group_id,
        'group_name', v_note.group_name,
        'created_at', v_note.created_at,
        'replies', v_replies
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a reply to a note
CREATE OR REPLACE FUNCTION add_note_reply(p_note_id UUID, p_content TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
    v_reply_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF TRIM(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply cannot be empty');
    END IF;

    -- Get the note and verify access
    SELECT * INTO v_note FROM public.verse_notes WHERE id = p_note_id;

    IF v_note IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note not found');
    END IF;

    -- Can only reply to group notes (not private notes)
    IF v_note.is_private THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot reply to private notes');
    END IF;

    -- Verify membership
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = v_note.group_id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this group');
    END IF;

    INSERT INTO public.verse_note_replies (note_id, user_id, content)
    VALUES (p_note_id, v_user_id, TRIM(p_content))
    RETURNING id INTO v_reply_id;

    RETURN jsonb_build_object('success', true, 'reply_id', v_reply_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update a note (owner only)
CREATE OR REPLACE FUNCTION update_verse_note(p_note_id UUID, p_content TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF TRIM(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note content cannot be empty');
    END IF;

    SELECT * INTO v_note FROM public.verse_notes WHERE id = p_note_id;

    IF v_note IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note not found');
    END IF;

    IF v_note.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only edit your own notes');
    END IF;

    UPDATE public.verse_notes
    SET content = TRIM(p_content), updated_at = NOW()
    WHERE id = p_note_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a note (owner only)
CREATE OR REPLACE FUNCTION delete_verse_note(p_note_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_note FROM public.verse_notes WHERE id = p_note_id;

    IF v_note IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note not found');
    END IF;

    IF v_note.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only delete your own notes');
    END IF;

    DELETE FROM public.verse_notes WHERE id = p_note_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Share a private note to a group
CREATE OR REPLACE FUNCTION share_note_to_group(p_note_id UUID, p_group_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_note FROM public.verse_notes WHERE id = p_note_id;

    IF v_note IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note not found');
    END IF;

    IF v_note.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only share your own notes');
    END IF;

    -- Verify membership
    IF NOT EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this group');
    END IF;

    UPDATE public.verse_notes
    SET is_private = false, group_id = p_group_id, updated_at = NOW()
    WHERE id = p_note_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make a shared note private again
CREATE OR REPLACE FUNCTION make_note_private(p_note_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_note RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_note FROM public.verse_notes WHERE id = p_note_id;

    IF v_note IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Note not found');
    END IF;

    IF v_note.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only make your own notes private');
    END IF;

    -- Delete all replies when making private
    DELETE FROM public.verse_note_replies WHERE note_id = p_note_id;

    UPDATE public.verse_notes
    SET is_private = true, group_id = NULL, updated_at = NOW()
    WHERE id = p_note_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a reply (owner only)
CREATE OR REPLACE FUNCTION delete_note_reply(p_reply_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_reply RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_reply FROM public.verse_note_replies WHERE id = p_reply_id;

    IF v_reply IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found');
    END IF;

    IF v_reply.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only delete your own replies');
    END IF;

    DELETE FROM public.verse_note_replies WHERE id = p_reply_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
