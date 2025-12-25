-- ============================================================================
-- MEMBERS CAN INVITE MIGRATION
-- Allows group leaders to enable member invitations
-- ============================================================================

-- Add members_can_invite column to groups (default true - all members can invite)
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS members_can_invite BOOLEAN DEFAULT true;

-- ============================================================================
-- TOGGLE MEMBERS CAN INVITE
-- Only group leader can toggle this setting
-- ============================================================================

CREATE OR REPLACE FUNCTION toggle_members_can_invite(p_group_id UUID, p_enabled BOOLEAN)
RETURNS JSONB AS $$
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
        RETURN jsonb_build_object('success', false, 'message', 'Group not found');
    END IF;

    IF v_group.leader_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the leader can change this setting');
    END IF;

    UPDATE public.groups SET members_can_invite = p_enabled WHERE id = p_group_id;

    RETURN jsonb_build_object(
        'success', true,
        'members_can_invite', p_enabled,
        'message', CASE WHEN p_enabled THEN 'Members can now invite others' ELSE 'Only you can invite members now' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE GET_GROUP TO INCLUDE MEMBERS_CAN_INVITE
-- ============================================================================

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
        'description', v_group.description,
        'leader_id', v_group.leader_id,
        'created_at', v_group.created_at,
        'invite_code', CASE
            WHEN v_group.leader_id = v_user_id THEN v_group.invite_code
            WHEN v_is_member AND COALESCE(v_group.members_can_invite, false) THEN v_group.invite_code
            ELSE NULL
        END,
        'leader_name', v_leader.name,
        'is_leader', v_group.leader_id = v_user_id,
        'is_member', v_is_member,
        'open_for_challenges', COALESCE(v_group.open_for_challenges, false),
        'members_can_invite', COALESCE(v_group.members_can_invite, false)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE INVITE_TO_GROUP TO ALLOW MEMBER INVITES
-- ============================================================================

CREATE OR REPLACE FUNCTION invite_to_group(p_group_id UUID, p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_group RECORD;
    v_invited_user RECORD;
    v_identifier TEXT;
    v_is_member BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_group FROM public.groups WHERE id = p_group_id;
    IF v_group IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Group not found');
    END IF;

    -- Check if user is a member
    SELECT EXISTS(
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND user_id = v_user_id
    ) INTO v_is_member;

    -- Must be leader OR (member AND members_can_invite is enabled)
    IF v_group.leader_id != v_user_id THEN
        IF NOT v_is_member OR NOT COALESCE(v_group.members_can_invite, false) THEN
            RETURN jsonb_build_object('success', false, 'message', 'You do not have permission to invite members');
        END IF;
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

    -- Delete any old declined invites
    DELETE FROM public.group_invites
    WHERE group_id = p_group_id AND invited_user_id = v_invited_user.id AND status = 'declined';

    -- Create invite
    INSERT INTO public.group_invites (group_id, invited_user_id, invited_by_user_id)
    VALUES (p_group_id, v_invited_user.id, v_user_id);

    RETURN jsonb_build_object('success', true, 'message', 'Invite sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATE RLS POLICY FOR GROUP INVITES
-- Allow members to create invites when members_can_invite is enabled
-- ============================================================================

DROP POLICY IF EXISTS "Leaders can create invites" ON public.group_invites;
CREATE POLICY "Leaders and permitted members can create invites" ON public.group_invites
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups g
            WHERE g.id = group_id
            AND (
                g.leader_id = auth.uid()
                OR (
                    COALESCE(g.members_can_invite, false) = true
                    AND EXISTS (
                        SELECT 1 FROM public.group_memberships gm
                        WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
                    )
                )
            )
        )
    );
