import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

// Rolling window for tier calculation (14 days)
const ROLLING_WINDOW_DAYS = 14;

// Default tier thresholds (can be overridden in DB)
const DEFAULT_TIERS = [
  { tier: "Bronze", minXp: 0, order: 1, color: "#CD7F32" },
  { tier: "Silver", minXp: 100, order: 2, color: "#C0C0C0" },
  { tier: "Gold", minXp: 300, order: 3, color: "#FFD700" },
  { tier: "Platinum", minXp: 600, order: 4, color: "#E5E4E2" },
  { tier: "Diamond", minXp: 1000, order: 5, color: "#B9F2FF" },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getDateNDaysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split("T")[0];
}

// ============================================================================
// QUERIES
// ============================================================================

// Get current user's tier info
export const getCurrentUserTier = query({
  args: {},
  returns: v.union(
    v.object({
      tier: v.string(),
      color: v.string(),
      rollingXp: v.number(),
      nextTier: v.optional(v.string()),
      xpToNextTier: v.optional(v.number()),
      rank: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    // Get rolling XP for last 14 days
    const cutoffDate = getDateNDaysAgo(ROLLING_WINDOW_DAYS);
    const rollingXpRecords = await ctx.db
      .query("rollingXp")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const rollingXp = rollingXpRecords
      .filter((r) => r.date >= cutoffDate)
      .reduce((sum, r) => sum + r.xpEarned, 0);

    // Get tier thresholds
    let tiers = await ctx.db
      .query("tierThresholds")
      .withIndex("by_order")
      .collect();

    if (tiers.length === 0) {
      // Use defaults if not seeded
      tiers = DEFAULT_TIERS.map((t, i) => ({
        ...t,
        _id: `default_${i}` as Id<"tierThresholds">,
        _creationTime: 0,
      }));
    }

    // Sort by order descending to find highest qualifying tier
    const sortedTiers = [...tiers].sort((a, b) => b.order - a.order);

    let currentTier = sortedTiers[sortedTiers.length - 1]; // Default to lowest
    for (const tier of sortedTiers) {
      if (rollingXp >= tier.minXp) {
        currentTier = tier;
        break;
      }
    }

    // Find next tier
    const currentOrder = currentTier.order;
    const nextTier = tiers.find((t) => t.order === currentOrder + 1);

    return {
      tier: currentTier.tier,
      color: currentTier.color,
      rollingXp,
      nextTier: nextTier?.tier,
      xpToNextTier: nextTier ? nextTier.minXp - rollingXp : undefined,
    };
  },
});

// Get all tier thresholds
export const getTierThresholds = query({
  args: {},
  returns: v.array(
    v.object({
      tier: v.string(),
      minXp: v.number(),
      order: v.number(),
      color: v.string(),
    })
  ),
  handler: async (ctx) => {
    const tiers = await ctx.db
      .query("tierThresholds")
      .withIndex("by_order")
      .collect();

    if (tiers.length === 0) {
      return DEFAULT_TIERS;
    }

    return tiers.map((t) => ({
      tier: t.tier,
      minXp: t.minXp,
      order: t.order,
      color: t.color,
    }));
  },
});

// Get rolling XP history (for chart)
export const getRollingXpHistory = query({
  args: { days: v.optional(v.number()) },
  returns: v.array(
    v.object({
      date: v.string(),
      xp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const days = args.days ?? ROLLING_WINDOW_DAYS;
    const cutoffDate = getDateNDaysAgo(days);

    const records = await ctx.db
      .query("rollingXp")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const filtered = records.filter((r) => r.date >= cutoffDate);

    // Fill in missing days with 0
    const result: { date: string; xp: number }[] = [];
    const xpByDate = new Map<string, number>();
    for (const r of filtered) {
      xpByDate.set(r.date, r.xpEarned);
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = getDateNDaysAgo(i);
      result.push({
        date,
        xp: xpByDate.get(date) ?? 0,
      });
    }

    return result;
  },
});

// Get global leaderboard (top users by rolling XP)
export const getGlobalLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      rollingXp: v.number(),
      tier: v.string(),
      tierColor: v.string(),
      rank: v.number(),
      isCurrentUser: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const currentUserId = await auth.getUserId(ctx);
    const limit = args.limit ?? 50;

    const cutoffDate = getDateNDaysAgo(ROLLING_WINDOW_DAYS);

    // Get all rolling XP records
    const allRollingXp = await ctx.db.query("rollingXp").collect();

    // Aggregate by user
    const userXp = new Map<string, number>();
    for (const record of allRollingXp) {
      if (record.date < cutoffDate) continue;
      const current = userXp.get(record.userId) ?? 0;
      userXp.set(record.userId, current + record.xpEarned);
    }

    // Get tier thresholds
    let tiers = await ctx.db
      .query("tierThresholds")
      .withIndex("by_order")
      .collect();

    if (tiers.length === 0) {
      tiers = DEFAULT_TIERS.map((t, i) => ({
        ...t,
        _id: `default_${i}` as Id<"tierThresholds">,
        _creationTime: 0,
      }));
    }

    const sortedTiers = [...tiers].sort((a, b) => b.order - a.order);

    // Build leaderboard
    const leaderboard: {
      userId: Id<"users">;
      rollingXp: number;
      name?: string;
      image?: string;
      tier: string;
      tierColor: string;
    }[] = [];

    for (const [userIdStr, xp] of userXp.entries()) {
      const userId = userIdStr as Id<"users">;
      const user = await ctx.db.get(userId);
      if (!user) continue;

      // Determine tier
      let userTier = sortedTiers[sortedTiers.length - 1];
      for (const tier of sortedTiers) {
        if (xp >= tier.minXp) {
          userTier = tier;
          break;
        }
      }

      leaderboard.push({
        userId,
        rollingXp: xp,
        name: user.name,
        image: user.image,
        tier: userTier.tier,
        tierColor: userTier.color,
      });
    }

    // Sort by XP descending
    leaderboard.sort((a, b) => b.rollingXp - a.rollingXp);

    // Take top N and add ranks
    return leaderboard.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentUser: currentUserId === entry.userId,
    }));
  },
});

// Get user's rank in global leaderboard
export const getUserRank = query({
  args: {},
  returns: v.union(
    v.object({
      rank: v.number(),
      totalUsers: v.number(),
      percentile: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const cutoffDate = getDateNDaysAgo(ROLLING_WINDOW_DAYS);

    // Get all rolling XP records
    const allRollingXp = await ctx.db.query("rollingXp").collect();

    // Aggregate by user
    const userXp = new Map<string, number>();
    for (const record of allRollingXp) {
      if (record.date < cutoffDate) continue;
      const current = userXp.get(record.userId) ?? 0;
      userXp.set(record.userId, current + record.xpEarned);
    }

    // Get current user's XP
    const myXp = userXp.get(userId) ?? 0;

    // Count users with more XP
    let rank = 1;
    for (const [_uid, xp] of userXp.entries()) {
      if (xp > myXp) rank++;
    }

    const totalUsers = userXp.size || 1;
    const percentile = Math.round(((totalUsers - rank + 1) / totalUsers) * 100);

    return { rank, totalUsers, percentile };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

// Recalculate and cache user's tier
export const recalculateUserTier = internalMutation({
  args: { userId: v.id("users") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = args;

    const cutoffDate = getDateNDaysAgo(ROLLING_WINDOW_DAYS);
    const rollingXpRecords = await ctx.db
      .query("rollingXp")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const rollingXp = rollingXpRecords
      .filter((r) => r.date >= cutoffDate)
      .reduce((sum, r) => sum + r.xpEarned, 0);

    // Get tier thresholds
    let tiers = await ctx.db
      .query("tierThresholds")
      .withIndex("by_order")
      .collect();

    if (tiers.length === 0) {
      tiers = DEFAULT_TIERS.map((t, i) => ({
        ...t,
        _id: `default_${i}` as Id<"tierThresholds">,
        _creationTime: 0,
      }));
    }

    const sortedTiers = [...tiers].sort((a, b) => b.order - a.order);

    let currentTier = sortedTiers[sortedTiers.length - 1];
    for (const tier of sortedTiers) {
      if (rollingXp >= tier.minXp) {
        currentTier = tier;
        break;
      }
    }

    // Update user's cached tier
    await ctx.db.patch(userId, { currentTier: currentTier.tier });

    return currentTier.tier;
  },
});

// Clean up old rolling XP records (run periodically)
export const cleanupOldRollingXp = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Keep 30 days of history for charts, but only 14 days count for tier
    const cutoffDate = getDateNDaysAgo(30);

    const oldRecords = await ctx.db.query("rollingXp").collect();
    const toDelete = oldRecords.filter((r) => r.date < cutoffDate);

    for (const record of toDelete) {
      await ctx.db.delete(record._id);
    }

    return toDelete.length;
  },
});

// ============================================================================
// SEED MUTATIONS
// ============================================================================

// Seed tier thresholds
export const seedTierThresholds = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("tierThresholds").first();
    if (existing) return 0;

    for (const tier of DEFAULT_TIERS) {
      await ctx.db.insert("tierThresholds", tier);
    }

    return DEFAULT_TIERS.length;
  },
});
