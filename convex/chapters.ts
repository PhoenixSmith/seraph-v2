import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// XP constants
const XP_PER_CHAPTER = 10;

// ============================================================================
// QUERIES
// ============================================================================

// Get all completed chapters for current user
export const getCompletedChapters = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("chapterCompletions"),
      book: v.string(),
      chapter: v.number(),
      completedAt: v.number(),
      xpAwarded: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return completions.map((c) => ({
      _id: c._id,
      book: c.book,
      chapter: c.chapter,
      completedAt: c.completedAt,
      xpAwarded: c.xpAwarded,
    }));
  },
});

// Get completed chapters for a specific book
export const getCompletedChaptersForBook = query({
  args: { book: v.string() },
  returns: v.array(v.number()),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", userId).eq("book", args.book)
      )
      .collect();

    return completions.map((c) => c.chapter);
  },
});

// Check if a specific chapter is completed
export const isChapterCompleted = query({
  args: { book: v.string(), chapter: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return false;

    const completion = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user_book_chapter", (q) =>
        q.eq("userId", userId).eq("book", args.book).eq("chapter", args.chapter)
      )
      .unique();

    return completion !== null;
  },
});

// Get book completion progress
export const getBookProgress = query({
  args: { book: v.string(), totalChapters: v.number() },
  returns: v.object({
    completed: v.number(),
    total: v.number(),
    percentage: v.number(),
    isComplete: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return {
        completed: 0,
        total: args.totalChapters,
        percentage: 0,
        isComplete: false,
      };
    }

    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", userId).eq("book", args.book)
      )
      .collect();

    const completed = completions.length;
    const percentage = Math.round((completed / args.totalChapters) * 100);

    return {
      completed,
      total: args.totalChapters,
      percentage,
      isComplete: completed >= args.totalChapters,
    };
  },
});

// Get overall Bible reading progress
export const getOverallProgress = query({
  args: {},
  returns: v.object({
    totalChaptersCompleted: v.number(),
    booksStarted: v.number(),
    booksCompleted: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return {
        totalChaptersCompleted: 0,
        booksStarted: 0,
        booksCompleted: 0,
      };
    }

    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group by book
    const bookChapters = new Map<string, Set<number>>();
    for (const c of completions) {
      if (!bookChapters.has(c.book)) {
        bookChapters.set(c.book, new Set());
      }
      bookChapters.get(c.book)!.add(c.chapter);
    }

    // Check completed books using userAchievements
    const bookAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Count book completion achievements
    let booksCompleted = 0;
    for (const ua of bookAchievements) {
      const achievement = await ctx.db.get(ua.achievementId);
      if (achievement?.category === "book_completion") {
        booksCompleted++;
      }
    }

    return {
      totalChaptersCompleted: completions.length,
      booksStarted: bookChapters.size,
      booksCompleted,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

// Complete a chapter
export const completeChapter = mutation({
  args: {
    book: v.string(),
    chapter: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    alreadyCompleted: v.boolean(),
    xpAwarded: v.number(),
    newAchievements: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if already completed
    const existing = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user_book_chapter", (q) =>
        q.eq("userId", userId).eq("book", args.book).eq("chapter", args.chapter)
      )
      .unique();

    if (existing) {
      return {
        success: true,
        alreadyCompleted: true,
        xpAwarded: 0,
        newAchievements: [],
      };
    }

    // Record completion
    await ctx.db.insert("chapterCompletions", {
      userId,
      book: args.book,
      chapter: args.chapter,
      completedAt: Date.now(),
      xpAwarded: XP_PER_CHAPTER,
    });

    // Update user XP
    const user = await ctx.db.get(userId);
    if (user) {
      const newTotalXp = (user.totalXp ?? 0) + XP_PER_CHAPTER;
      await ctx.db.patch(userId, { totalXp: newTotalXp });
    }

    // Update rolling XP
    const today = new Date().toISOString().split("T")[0];
    const existingRolling = await ctx.db
      .query("rollingXp")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).eq("date", today)
      )
      .unique();

    if (existingRolling) {
      await ctx.db.patch(existingRolling._id, {
        xpEarned: existingRolling.xpEarned + XP_PER_CHAPTER,
      });
    } else {
      await ctx.db.insert("rollingXp", {
        userId,
        date: today,
        xpEarned: XP_PER_CHAPTER,
      });
    }

    // Check for book completion achievement
    const newAchievements: string[] = [];

    // Schedule achievement check (non-blocking)
    await ctx.scheduler.runAfter(0, internal.achievements.checkBookCompletion, {
      userId,
      book: args.book,
    });

    // Schedule tier recalculation
    await ctx.scheduler.runAfter(0, internal.tiers.recalculateUserTier, {
      userId,
    });

    return {
      success: true,
      alreadyCompleted: false,
      xpAwarded: XP_PER_CHAPTER,
      newAchievements,
    };
  },
});

// Get recent chapter completions (for activity feed)
export const getRecentCompletions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      book: v.string(),
      chapter: v.number(),
      completedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 10;

    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return completions.map((c) => ({
      book: c.book,
      chapter: c.chapter,
      completedAt: c.completedAt,
    }));
  },
});
