import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// XP constants
const XP_PER_VERSE = 1;
const XP_PER_QUIZ_CORRECT = 5;

// Get today's date in YYYY-MM-DD format
function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

// Check if two dates are consecutive
function isConsecutiveDay(lastDate: string, today: string): boolean {
  const last = new Date(lastDate);
  const current = new Date(today);
  const diffTime = current.getTime() - last.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays === 1;
}

// Record a verse read - awards XP and updates streak
export const recordVerseRead = mutation({
  args: {},
  returns: v.object({
    xpAwarded: v.number(),
    totalXp: v.number(),
    currentStreak: v.number(),
    streakUpdated: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const today = getToday();
    const lastReadDate = user.lastReadDate;
    const currentXp = user.totalXp ?? 0;
    let currentStreak = user.currentStreak ?? 0;
    let longestStreak = user.longestStreak ?? 0;
    let streakUpdated = false;

    // Update streak logic
    if (!lastReadDate) {
      // First time reading
      currentStreak = 1;
      streakUpdated = true;
    } else if (lastReadDate === today) {
      // Already read today, streak stays the same
      streakUpdated = false;
    } else if (isConsecutiveDay(lastReadDate, today)) {
      // Consecutive day, increment streak
      currentStreak += 1;
      streakUpdated = true;
    } else {
      // Streak broken, reset to 1
      currentStreak = 1;
      streakUpdated = true;
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const newTotalXp = currentXp + XP_PER_VERSE;

    // Update user record
    await ctx.db.patch(userId, {
      totalXp: newTotalXp,
      currentStreak,
      longestStreak,
      lastReadDate: today,
    });

    // Update rolling XP for tier calculation
    const existingRolling = await ctx.db
      .query("rollingXp")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .unique();

    if (existingRolling) {
      await ctx.db.patch(existingRolling._id, {
        xpEarned: existingRolling.xpEarned + XP_PER_VERSE,
      });
    } else {
      await ctx.db.insert("rollingXp", {
        userId,
        date: today,
        xpEarned: XP_PER_VERSE,
      });
    }

    // Check for streak achievements if streak was updated
    if (streakUpdated) {
      await ctx.scheduler.runAfter(0, internal.achievements.checkStreakAchievements, {
        userId,
        currentStreak,
      });
    }

    // Check for XP achievements
    await ctx.scheduler.runAfter(0, internal.achievements.checkXpAchievements, {
      userId,
      totalXp: newTotalXp,
    });

    // Recalculate tier
    await ctx.scheduler.runAfter(0, internal.tiers.recalculateUserTier, {
      userId,
    });

    return {
      xpAwarded: XP_PER_VERSE,
      totalXp: newTotalXp,
      currentStreak,
      streakUpdated,
    };
  },
});

// Record quiz answer - awards XP for correct answers
export const recordQuizAnswer = mutation({
  args: {
    correct: v.boolean(),
    book: v.string(),
    chapter: v.number(),
  },
  returns: v.object({
    xpAwarded: v.number(),
    totalXp: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!args.correct) {
      const user = await ctx.db.get(userId);
      return {
        xpAwarded: 0,
        totalXp: user?.totalXp ?? 0,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newTotalXp = (user.totalXp ?? 0) + XP_PER_QUIZ_CORRECT;

    // Update user XP
    await ctx.db.patch(userId, { totalXp: newTotalXp });

    // Update rolling XP
    const today = getToday();
    const existingRolling = await ctx.db
      .query("rollingXp")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .unique();

    if (existingRolling) {
      await ctx.db.patch(existingRolling._id, {
        xpEarned: existingRolling.xpEarned + XP_PER_QUIZ_CORRECT,
      });
    } else {
      await ctx.db.insert("rollingXp", {
        userId,
        date: today,
        xpEarned: XP_PER_QUIZ_CORRECT,
      });
    }

    // Check XP achievements
    await ctx.scheduler.runAfter(0, internal.achievements.checkXpAchievements, {
      userId,
      totalXp: newTotalXp,
    });

    // Recalculate tier
    await ctx.scheduler.runAfter(0, internal.tiers.recalculateUserTier, {
      userId,
    });

    return {
      xpAwarded: XP_PER_QUIZ_CORRECT,
      totalXp: newTotalXp,
    };
  },
});

// Get user's progress summary
export const getProgressSummary = query({
  args: {},
  returns: v.union(
    v.object({
      totalXp: v.number(),
      currentStreak: v.number(),
      longestStreak: v.number(),
      currentTier: v.optional(v.string()),
      lastReadDate: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      totalXp: user.totalXp ?? 0,
      currentStreak: user.currentStreak ?? 0,
      longestStreak: user.longestStreak ?? 0,
      currentTier: user.currentTier,
      lastReadDate: user.lastReadDate,
    };
  },
});
