import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// ============================================================================
// QUERIES
// ============================================================================

// Get all groups the current user belongs to
export const listMyGroups = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      leaderId: v.id("users"),
      createdAt: v.number(),
      isLeader: v.boolean(),
      memberCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const groups = [];
    for (const membership of memberships) {
      const group = await ctx.db.get(membership.groupId);
      if (group) {
        const members = await ctx.db
          .query("groupMemberships")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        groups.push({
          ...group,
          isLeader: group.leaderId === userId,
          memberCount: members.length,
        });
      }
    }

    return groups;
  },
});

// Get single group details
export const getGroup = query({
  args: { groupId: v.id("groups") },
  returns: v.union(
    v.object({
      _id: v.id("groups"),
      _creationTime: v.number(),
      name: v.string(),
      leaderId: v.id("users"),
      createdAt: v.number(),
      leaderName: v.optional(v.string()),
      isLeader: v.boolean(),
      isMember: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const leader = await ctx.db.get(group.leaderId);

    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    return {
      ...group,
      leaderName: leader?.name,
      isLeader: group.leaderId === userId,
      isMember: membership !== null,
    };
  },
});

// Get members ranked by XP (leaderboard)
export const getGroupLeaderboard = query({
  args: { groupId: v.id("groups") },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      totalXp: v.number(),
      currentStreak: v.number(),
      rank: v.number(),
      isLeader: v.boolean(),
      isCurrentUser: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group) return [];

    // Verify user is a member
    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (!membership) return [];

    // Get all members
    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = [];
    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      if (user) {
        members.push({
          userId: user._id,
          name: user.name,
          image: user.image,
          totalXp: user.totalXp ?? 0,
          currentStreak: user.currentStreak ?? 0,
          isLeader: user._id === group.leaderId,
          isCurrentUser: user._id === userId,
        });
      }
    }

    // Sort by XP descending
    members.sort((a, b) => b.totalXp - a.totalXp);

    // Add rank
    return members.map((member, index) => ({
      ...member,
      rank: index + 1,
    }));
  },
});

// Get user's pending invitations
export const getPendingInvites = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("groupInvites"),
      groupId: v.id("groups"),
      groupName: v.string(),
      invitedByName: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const invites = await ctx.db
      .query("groupInvites")
      .withIndex("by_invited_user_and_status", (q) =>
        q.eq("invitedUserId", userId).eq("status", "pending")
      )
      .collect();

    const result = [];
    for (const invite of invites) {
      const group = await ctx.db.get(invite.groupId);
      const invitedBy = await ctx.db.get(invite.invitedByUserId);
      if (group) {
        result.push({
          _id: invite._id,
          groupId: invite.groupId,
          groupName: group.name,
          invitedByName: invitedBy?.name,
          createdAt: invite.createdAt,
        });
      }
    }

    return result;
  },
});

// Get pending invites for a group (leader only)
export const getGroupPendingInvites = query({
  args: { groupId: v.id("groups") },
  returns: v.array(
    v.object({
      _id: v.id("groupInvites"),
      invitedUserName: v.optional(v.string()),
      invitedUserEmail: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group || group.leaderId !== userId) return [];

    const invites = await ctx.db
      .query("groupInvites")
      .withIndex("by_group_and_status", (q) =>
        q.eq("groupId", args.groupId).eq("status", "pending")
      )
      .collect();

    const result = [];
    for (const invite of invites) {
      const user = await ctx.db.get(invite.invitedUserId);
      result.push({
        _id: invite._id,
        invitedUserName: user?.name,
        invitedUserEmail: user?.email,
        createdAt: invite.createdAt,
      });
    }

    return result;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

// Create a new group
export const createGroup = mutation({
  args: { name: v.string() },
  returns: v.id("groups"),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const trimmedName = args.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      throw new Error("Group name must be 1-50 characters");
    }

    const groupId = await ctx.db.insert("groups", {
      name: trimmedName,
      leaderId: userId,
      createdAt: Date.now(),
    });

    // Add creator as first member
    await ctx.db.insert("groupMemberships", {
      groupId,
      userId,
      joinedAt: Date.now(),
    });

    return groupId;
  },
});

// Invite user by username or email
export const inviteToGroup = mutation({
  args: {
    groupId: v.id("groups"),
    identifier: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      return { success: false, message: "Group not found" };
    }

    if (group.leaderId !== userId) {
      return { success: false, message: "Only the group leader can invite members" };
    }

    const identifier = args.identifier.trim();
    let invitedUser = null;

    // Try email first
    if (identifier.includes("@")) {
      invitedUser = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", identifier))
        .unique();
    }

    // Try name if not found
    if (!invitedUser) {
      invitedUser = await ctx.db
        .query("users")
        .withIndex("by_name", (q) => q.eq("name", identifier))
        .unique();
    }

    if (!invitedUser) {
      return { success: false, message: "User not found" };
    }

    if (invitedUser._id === userId) {
      return { success: false, message: "You cannot invite yourself" };
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", invitedUser._id)
      )
      .unique();

    if (existingMembership) {
      return { success: false, message: "User is already a member" };
    }

    // Check for existing pending invite
    const existingInvite = await ctx.db
      .query("groupInvites")
      .withIndex("by_group_and_invited_user", (q) =>
        q.eq("groupId", args.groupId).eq("invitedUserId", invitedUser._id)
      )
      .unique();

    if (existingInvite && existingInvite.status === "pending") {
      return { success: false, message: "Invite already sent" };
    }

    // Create or update invite
    if (existingInvite) {
      await ctx.db.patch(existingInvite._id, {
        status: "pending",
        invitedByUserId: userId,
        createdAt: Date.now(),
        respondedAt: undefined,
      });
    } else {
      await ctx.db.insert("groupInvites", {
        groupId: args.groupId,
        invitedUserId: invitedUser._id,
        invitedByUserId: userId,
        status: "pending",
        createdAt: Date.now(),
      });
    }

    return { success: true, message: "Invite sent" };
  },
});

// Accept or decline invite
export const respondToInvite = mutation({
  args: {
    inviteId: v.id("groupInvites"),
    accept: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.invitedUserId !== userId) {
      throw new Error("This invite is not for you");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite already responded to");
    }

    await ctx.db.patch(args.inviteId, {
      status: args.accept ? "accepted" : "declined",
      respondedAt: Date.now(),
    });

    if (args.accept) {
      const group = await ctx.db.get(invite.groupId);
      if (group) {
        await ctx.db.insert("groupMemberships", {
          groupId: invite.groupId,
          userId,
          joinedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

// Leave a group
export const leaveGroup = mutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (group.leaderId === userId) {
      throw new Error("Transfer leadership before leaving the group");
    }

    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", userId)
      )
      .unique();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return null;
  },
});

// Transfer group ownership
export const transferLeadership = mutation({
  args: {
    groupId: v.id("groups"),
    newLeaderId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (group.leaderId !== userId) {
      throw new Error("Only the leader can transfer leadership");
    }

    if (args.newLeaderId === userId) {
      throw new Error("You are already the leader");
    }

    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.newLeaderId)
      )
      .unique();

    if (!membership) {
      throw new Error("New leader must be a group member");
    }

    await ctx.db.patch(args.groupId, {
      leaderId: args.newLeaderId,
    });

    return null;
  },
});

// Delete a group (leader only)
export const deleteGroup = mutation({
  args: { groupId: v.id("groups") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (group.leaderId !== userId) {
      throw new Error("Only the leader can delete the group");
    }

    // Delete all memberships
    const memberships = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    // Delete all invites
    const invites = await ctx.db
      .query("groupInvites")
      .withIndex("by_group_and_status", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    await ctx.db.delete(args.groupId);

    return null;
  },
});

// Cancel a pending invite (leader only)
export const cancelInvite = mutation({
  args: { inviteId: v.id("groupInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    const group = await ctx.db.get(invite.groupId);
    if (!group || group.leaderId !== userId) {
      throw new Error("Only the group leader can cancel invites");
    }

    await ctx.db.delete(args.inviteId);

    return null;
  },
});

// Remove a member from group (leader only)
export const removeMember = mutation({
  args: {
    groupId: v.id("groups"),
    memberId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (group.leaderId !== userId) {
      throw new Error("Only the leader can remove members");
    }

    if (args.memberId === userId) {
      throw new Error("Cannot remove yourself. Transfer leadership first.");
    }

    const membership = await ctx.db
      .query("groupMemberships")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.memberId)
      )
      .unique();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return null;
  },
});
