import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// XP constants
const XP_PER_VERSE = 1;

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

    const newTotalXp = currentXp + XP_PER_VERSE;

    // Update user record
    await ctx.db.patch(userId, {
      totalXp: newTotalXp,
      currentStreak,
      lastReadDate: today,
    });

    return {
      xpAwarded: XP_PER_VERSE,
      totalXp: newTotalXp,
      currentStreak,
      streakUpdated,
    };
  },
});
