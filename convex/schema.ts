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
    longestStreak: v.optional(v.number()),
    lastReadDate: v.optional(v.string()), // YYYY-MM-DD format
    // Tier (computed from rolling XP, cached for performance)
    currentTier: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("by_name", ["name"]),

  // Chapter completion tracking
  chapterCompletions: defineTable({
    userId: v.id("users"),
    book: v.string(),
    chapter: v.number(),
    completedAt: v.number(),
    xpAwarded: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_book", ["userId", "book"])
    .index("by_user_book_chapter", ["userId", "book", "chapter"]),

  // Rolling XP - tracks daily XP for tier calculations (14-day window)
  rollingXp: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    xpEarned: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "date"]),

  // Achievement definitions
  achievements: defineTable({
    key: v.string(), // unique identifier e.g. "complete_genesis"
    name: v.string(),
    description: v.string(),
    icon: v.string(), // emoji or icon name
    category: v.union(
      v.literal("book_completion"),
      v.literal("streak"),
      v.literal("xp_milestone"),
      v.literal("special")
    ),
    requirement: v.object({
      type: v.string(), // "complete_book", "streak_days", "total_xp", etc.
      value: v.union(v.string(), v.number()), // book name or number threshold
    }),
    xpReward: v.number(),
  }).index("by_key", ["key"]),

  // User achievements (unlocked)
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_achievement", ["userId", "achievementId"]),

  // Tier thresholds configuration
  tierThresholds: defineTable({
    tier: v.string(), // "Bronze", "Silver", "Gold", "Platinum", "Diamond"
    minXp: v.number(), // minimum 14-day rolling XP for this tier
    order: v.number(), // for sorting (1 = lowest, 5 = highest)
    color: v.string(), // hex color for display
  }).index("by_order", ["order"]),

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
