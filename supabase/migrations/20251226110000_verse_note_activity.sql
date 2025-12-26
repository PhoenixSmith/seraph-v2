-- ============================================================================
-- VERSE NOTE ACTIVITY LOGGING
-- Logs note creation to group activity feed
-- ============================================================================

-- Update create_verse_note to log group activity
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

    -- Log activity for group notes
    IF p_group_id IS NOT NULL THEN
        INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
        VALUES (
            p_group_id,
            v_user_id,
            'note_created',
            jsonb_build_object(
                'book', p_book,
                'chapter', p_chapter,
                'verse', p_verse,
                'note_id', v_note_id,
                'preview', LEFT(TRIM(p_content), 100)
            )
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'note_id', v_note_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also log when sharing an existing note to a group
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

    -- Log activity
    INSERT INTO public.group_activities (group_id, user_id, activity_type, metadata)
    VALUES (
        p_group_id,
        v_user_id,
        'note_created',
        jsonb_build_object(
            'book', v_note.book,
            'chapter', v_note.chapter,
            'verse', v_note.verse,
            'note_id', p_note_id,
            'preview', LEFT(v_note.content, 100)
        )
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
