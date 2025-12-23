import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extended users table with app-specific fields
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // Gamification fields
    totalXp: v.optional(v.number()),
    currentStreak: v.optional(v.number()),
    lastReadDate: v.optional(v.string()), // YYYY-MM-DD format
  })
    .index("by_email", ["email"])
    .index("by_name", ["name"]),

  // Groups table
  groups: defineTable({
    name: v.string(),
    leaderId: v.id("users"),
    createdAt: v.number(),
  }).index("by_leader", ["leaderId"]),

  // Group memberships table
  groupMemberships: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"]),

  // Group invites table
  groupInvites: defineTable({
    groupId: v.id("groups"),
    invitedUserId: v.id("users"),
    invitedByUserId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_invited_user_and_status", ["invitedUserId", "status"])
    .index("by_group_and_status", ["groupId", "status"])
    .index("by_group_and_invited_user", ["groupId", "invitedUserId"]),
});
