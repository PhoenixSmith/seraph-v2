import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

// Bible books with their chapter counts
const BIBLE_BOOKS: Record<string, number> = {
  // Old Testament
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  // New Testament
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

// ============================================================================
// QUERIES
// ============================================================================

// Get all achievements (definitions)
export const getAllAchievements = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("achievements"),
      key: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
      category: v.string(),
      xpReward: v.number(),
    })
  ),
  handler: async (ctx) => {
    const achievements = await ctx.db.query("achievements").collect();
    return achievements.map((a) => ({
      _id: a._id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      xpReward: a.xpReward,
    }));
  },
});

// Get user's unlocked achievements
export const getUserAchievements = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("userAchievements"),
      achievementId: v.id("achievements"),
      key: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
      category: v.string(),
      xpReward: v.number(),
      unlockedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const result = [];
    for (const ua of userAchievements) {
      const achievement = await ctx.db.get(ua.achievementId);
      if (achievement) {
        result.push({
          _id: ua._id,
          achievementId: ua.achievementId,
          key: achievement.key,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          xpReward: achievement.xpReward,
          unlockedAt: ua.unlockedAt,
        });
      }
    }

    return result;
  },
});

// Get achievements with unlock status
export const getAchievementsWithStatus = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("achievements"),
      key: v.string(),
      name: v.string(),
      description: v.string(),
      icon: v.string(),
      category: v.string(),
      xpReward: v.number(),
      unlocked: v.boolean(),
      unlockedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    const achievements = await ctx.db.query("achievements").collect();

    if (!userId) {
      return achievements.map((a) => ({
        _id: a._id,
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        unlocked: false,
        unlockedAt: undefined,
      }));
    }

    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const unlockedMap = new Map<string, number>();
    for (const ua of userAchievements) {
      unlockedMap.set(ua.achievementId, ua.unlockedAt);
    }

    return achievements.map((a) => ({
      _id: a._id,
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      xpReward: a.xpReward,
      unlocked: unlockedMap.has(a._id),
      unlockedAt: unlockedMap.get(a._id),
    }));
  },
});

// Get achievement count
export const getAchievementStats = query({
  args: {},
  returns: v.object({
    unlocked: v.number(),
    total: v.number(),
    percentage: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);

    const totalAchievements = await ctx.db.query("achievements").collect();
    const total = totalAchievements.length;

    if (!userId) {
      return { unlocked: 0, total, percentage: 0 };
    }

    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const unlocked = userAchievements.length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return { unlocked, total, percentage };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (called by other modules)
// ============================================================================

// Check and award book completion achievement
export const checkBookCompletion = internalMutation({
  args: {
    userId: v.id("users"),
    book: v.string(),
  },
  returns: v.union(v.id("achievements"), v.null()),
  handler: async (ctx, args) => {
    const { userId, book } = args;

    // Get total chapters for this book
    const totalChapters = BIBLE_BOOKS[book];
    if (!totalChapters) return null;

    // Count completed chapters
    const completions = await ctx.db
      .query("chapterCompletions")
      .withIndex("by_user_and_book", (q) =>
        q.eq("userId", userId).eq("book", book)
      )
      .collect();

    if (completions.length < totalChapters) return null;

    // Find the achievement for this book
    const achievementKey = `complete_${book.toLowerCase().replace(/\s+/g, "_")}`;
    const achievement = await ctx.db
      .query("achievements")
      .withIndex("by_key", (q) => q.eq("key", achievementKey))
      .unique();

    if (!achievement) return null;

    // Check if already unlocked
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_user_and_achievement", (q) =>
        q.eq("userId", userId).eq("achievementId", achievement._id)
      )
      .unique();

    if (existing) return null;

    // Award achievement
    await ctx.db.insert("userAchievements", {
      userId,
      achievementId: achievement._id,
      unlockedAt: Date.now(),
    });

    // Award XP bonus
    const user = await ctx.db.get(userId);
    if (user) {
      await ctx.db.patch(userId, {
        totalXp: (user.totalXp ?? 0) + achievement.xpReward,
      });
    }

    return achievement._id;
  },
});

// Check streak achievements
export const checkStreakAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    currentStreak: v.number(),
  },
  returns: v.array(v.id("achievements")),
  handler: async (ctx, args) => {
    const { userId, currentStreak } = args;
    const awarded: Id<"achievements">[] = [];

    // Get all streak achievements
    const streakAchievements = await ctx.db
      .query("achievements")
      .collect();

    const filtered = streakAchievements.filter(
      (a) => a.category === "streak" && a.requirement.type === "streak_days"
    );

    for (const achievement of filtered) {
      const requiredDays = achievement.requirement.value as number;
      if (currentStreak < requiredDays) continue;

      // Check if already unlocked
      const existing = await ctx.db
        .query("userAchievements")
        .withIndex("by_user_and_achievement", (q) =>
          q.eq("userId", userId).eq("achievementId", achievement._id)
        )
        .unique();

      if (existing) continue;

      // Award achievement
      await ctx.db.insert("userAchievements", {
        userId,
        achievementId: achievement._id,
        unlockedAt: Date.now(),
      });

      // Award XP bonus
      const user = await ctx.db.get(userId);
      if (user) {
        await ctx.db.patch(userId, {
          totalXp: (user.totalXp ?? 0) + achievement.xpReward,
        });
      }

      awarded.push(achievement._id);
    }

    return awarded;
  },
});

// Check XP milestone achievements
export const checkXpAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    totalXp: v.number(),
  },
  returns: v.array(v.id("achievements")),
  handler: async (ctx, args) => {
    const { userId, totalXp } = args;
    const awarded: Id<"achievements">[] = [];

    // Get all XP milestone achievements
    const xpAchievements = await ctx.db
      .query("achievements")
      .collect();

    const filtered = xpAchievements.filter(
      (a) => a.category === "xp_milestone" && a.requirement.type === "total_xp"
    );

    for (const achievement of filtered) {
      const requiredXp = achievement.requirement.value as number;
      if (totalXp < requiredXp) continue;

      // Check if already unlocked
      const existing = await ctx.db
        .query("userAchievements")
        .withIndex("by_user_and_achievement", (q) =>
          q.eq("userId", userId).eq("achievementId", achievement._id)
        )
        .unique();

      if (existing) continue;

      // Award achievement
      await ctx.db.insert("userAchievements", {
        userId,
        achievementId: achievement._id,
        unlockedAt: Date.now(),
      });

      // Award XP bonus (careful not to create infinite loop - XP achievements don't award more XP)
      awarded.push(achievement._id);
    }

    return awarded;
  },
});

// ============================================================================
// SEED MUTATIONS (for initial setup)
// ============================================================================

// Seed achievement definitions
export const seedAchievements = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("achievements").first();
    if (existing) return 0;

    const achievements = [];

    // Book completion achievements
    for (const [book, _chapters] of Object.entries(BIBLE_BOOKS)) {
      achievements.push({
        key: `complete_${book.toLowerCase().replace(/\s+/g, "_")}`,
        name: `${book} Complete`,
        description: `Complete all chapters of ${book}`,
        icon: "book",
        category: "book_completion" as const,
        requirement: { type: "complete_book", value: book },
        xpReward: 50,
      });
    }

    // Streak achievements
    const streakMilestones = [
      { days: 7, name: "Week Warrior", icon: "flame", xp: 25 },
      { days: 14, name: "Fortnight Faithful", icon: "flame", xp: 50 },
      { days: 30, name: "Monthly Master", icon: "flame", xp: 100 },
      { days: 60, name: "Two Month Titan", icon: "flame", xp: 150 },
      { days: 90, name: "Quarterly Quest", icon: "flame", xp: 200 },
      { days: 180, name: "Half Year Hero", icon: "flame", xp: 300 },
      { days: 365, name: "Year of Faith", icon: "crown", xp: 500 },
    ];

    for (const milestone of streakMilestones) {
      achievements.push({
        key: `streak_${milestone.days}`,
        name: milestone.name,
        description: `Maintain a ${milestone.days}-day reading streak`,
        icon: milestone.icon,
        category: "streak" as const,
        requirement: { type: "streak_days", value: milestone.days },
        xpReward: milestone.xp,
      });
    }

    // XP milestone achievements
    const xpMilestones = [
      { xp: 100, name: "Century Club", icon: "star" },
      { xp: 500, name: "Rising Scholar", icon: "star" },
      { xp: 1000, name: "Thousand Strong", icon: "star" },
      { xp: 5000, name: "Devoted Reader", icon: "trophy" },
      { xp: 10000, name: "Scripture Master", icon: "trophy" },
      { xp: 25000, name: "Biblical Scholar", icon: "crown" },
      { xp: 50000, name: "Word Warrior", icon: "crown" },
      { xp: 100000, name: "Legendary", icon: "crown" },
    ];

    for (const milestone of xpMilestones) {
      achievements.push({
        key: `xp_${milestone.xp}`,
        name: milestone.name,
        description: `Earn ${milestone.xp.toLocaleString()} total XP`,
        icon: milestone.icon,
        category: "xp_milestone" as const,
        requirement: { type: "total_xp", value: milestone.xp },
        xpReward: 0, // XP achievements don't give more XP to avoid loops
      });
    }

    // Special achievements
    achievements.push(
      {
        key: "first_chapter",
        name: "First Steps",
        description: "Complete your first chapter",
        icon: "footprints",
        category: "special" as const,
        requirement: { type: "chapters_completed", value: 1 },
        xpReward: 10,
      },
      {
        key: "old_testament",
        name: "Old Testament Complete",
        description: "Complete all books of the Old Testament",
        icon: "scroll",
        category: "special" as const,
        requirement: { type: "testament", value: "old" },
        xpReward: 500,
      },
      {
        key: "new_testament",
        name: "New Testament Complete",
        description: "Complete all books of the New Testament",
        icon: "cross",
        category: "special" as const,
        requirement: { type: "testament", value: "new" },
        xpReward: 500,
      },
      {
        key: "full_bible",
        name: "The Whole Word",
        description: "Complete the entire Bible",
        icon: "book-open",
        category: "special" as const,
        requirement: { type: "full_bible", value: 1 },
        xpReward: 1000,
      }
    );

    // Insert all achievements
    for (const achievement of achievements) {
      await ctx.db.insert("achievements", achievement);
    }

    return achievements.length;
  },
});
