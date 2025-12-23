# Seraph - Project Overview

**Version:** 2.0.0
**Tagline:** "Read and Study the Bible"
**Platform:** Cross-platform Mobile & Web (Flutter)

---

## What is Seraph?

Seraph is a gamified Bible reading and study application that transforms scripture engagement into an interactive, rewarding experience. Users read Bible chapters, answer quiz questions, earn XP (experience points), maintain reading streaks, and compete on tier rankings - all while deepening their understanding of the Bible.

---

## Core Features

### Bible Reading
- Full Bible text with book, chapter, and verse navigation
- Swipeable verse-by-verse reading interface
- Chapter completion tracking
- Reading review mode for revisiting completed chapters

### Quiz & Learning System
- Interactive multiple-choice questions for each chapter
- Questions appear after completing chapters
- Question reporting mechanism for quality control
- Review mode to practice previously answered questions

### Gamification
- **XP System:** Earn experience points for reading and correctly answering questions
- **Streaks:** Track consecutive days of Bible reading
- **Tier Rankings:** Compete on weekly leaderboards based on XP earned (rolling 14-day window)
- **Achievements:** Unlock badges by completing entire books of the Bible
- **Celebrations:** Confetti animations and milestone popups for accomplishments

### Social Features
- Friend system with invite functionality
- Public user IDs for discovery
- Progress comparison with friends
- Friend panel displaying connected users

### User Profile
- Personal stats dashboard (tier, XP, achievements)
- Progress visualization with XP trend charts
- Achievement badge collection
- Premium badge display for subscribers

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Flutter (Dart) |
| **Backend** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Email/Password) |
| **Push Notifications** | OneSignal |
| **In-App Purchases** | RevenueCat |
| **Animations** | Rive, Confetti, Animate_do, Shimmer |
| **Charts** | Chart Sparkline |
| **Audio** | AudioPlayers |

---

## Project Structure

```
lib/
├── main.dart                 # App entry point
├── pages/                    # Screen pages
│   ├── auth/                 # Authentication screens
│   ├── bible_verse_page.dart # Main reading interface
│   ├── profile_page.dart     # User profile & stats
│   ├── review_page.dart      # Chapter review mode
│   └── admin_page.dart       # Admin utilities
├── components/               # Reusable UI components
│   ├── question_handler.dart # Quiz management
│   ├── verse_display.dart    # Verse rendering
│   ├── rolling_xp_chart.dart # XP visualization
│   ├── Friends/              # Social features
│   └── Popups/               # Modal dialogs
├── data/                     # Data models
│   ├── user_data.dart
│   ├── question.dart
│   ├── achievement.dart
│   └── bible_chapter.dart
└── utils/                    # Utilities
    ├── gvh.dart              # Global state holder
    ├── db.dart               # Database queries
    └── utility_functions.dart
```

---

## Key Workflows

### Reading Flow
1. Select a book and chapter from the Bible
2. Read through verses with swipe navigation
3. Complete the chapter to earn XP
4. Answer quiz questions that appear after reading
5. Earn additional XP for correct answers

### Progression System
1. XP accumulates from reading and quizzes
2. Weekly XP determines tier ranking
3. Consecutive reading days build streaks
4. Completing all chapters in a book unlocks achievements

---

## Monetization

- **Freemium Model:** Free access through Genesis 50
- **Premium Subscription:** Full Bible access via RevenueCat
- Paywall appears at the Old Testament / New Testament boundary

---

## Design System

| Element | Value |
|---------|-------|
| **Primary Color** | Deep Purple (#6860D4) |
| **Accent Color** | Light Purple (#CE97F3) |
| **Secondary Color** | Dark Purple (#573CB9) |
| **Font Family** | Poppins |
| **Style** | Gradient borders, radial gradients, dark theme |

---

## Database Tables

- `users` - User accounts and profiles
- `bible_books` - Bible book metadata
- `bible_verses` - Verse content
- `questions` - Quiz questions per chapter
- `chapter_completion` - User progress tracking
- `rolling_xp` - Historical XP data
- `user_achievements` - Unlocked achievements
- `tier_ranking` - Tier thresholds and rankings

---

## Recent Development

Recent commits indicate active feature development:
- UI refinements (center bar, dropdown styling)
- Visual enhancements (animated borders, paywall changes)
- Profile style updates

---

*Seraph transforms Bible study into an engaging journey with meaningful progress tracking and community features.*
