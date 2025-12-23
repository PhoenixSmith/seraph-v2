# SERAPH V2 UPDATE PLANS
## Bridging the Gap to Feature Parity

**Current State:** React/Vite web app with core reading + quiz
**Target State:** Full-featured Bible study app per PROJECT_OVERVIEW.md
**Platform Decision:** Continue with React

---

## Feature Parity Gap Analysis

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Bible Reading | React SPA | React SPA (staying) | Complete |
| Quiz System | Implemented | Same | Minor enhancements |
| User Auth | None | Supabase Auth | Full implementation |
| User Profiles | None | Stats dashboard | Full implementation |
| XP System | None | Earn/track XP | Full implementation |
| Streaks | None | Daily tracking | Full implementation |
| Tier Rankings | None | Weekly leaderboards | Full implementation |
| Achievements | None | Badge collection | Full implementation |
| Social/Friends | None | Friend system | Full implementation |
| Backend | None | Supabase + PostgreSQL | Full implementation |
| Premium/Paywall | None | RevenueCat | Full implementation |
| Push Notifications | None | OneSignal | Full implementation |

---

## Implementation Phases

### Phase 1: Backend Foundation
**Priority: Critical - Blocks all other features**

1. **Supabase Project Setup**
   - Create Supabase project
   - Configure environment variables
   - Install `@supabase/supabase-js`

2. **Database Schema Design**
   - `users` - User accounts and profiles
   - `chapter_completion` - Progress tracking
   - `rolling_xp` - XP history (14-day window)
   - `user_achievements` - Unlocked badges
   - `tier_ranking` - Tier thresholds
   - `friendships` - Social connections
   - `questions` - Quiz data (migrate from JSON)

3. **Supabase Auth Integration**
   - Email/password authentication
   - Session management
   - Protected routes

### Phase 2: User System
**Priority: High - Enables personalization**

1. **Authentication Pages**
   - Login page
   - Signup page
   - Password reset flow
   - Email verification

2. **User Profile Page**
   - Personal stats display
   - XP trend chart
   - Achievement badges
   - Edit profile functionality

3. **Session Persistence**
   - Auto-login on return
   - Secure token storage

### Phase 3: Gamification Core
**Priority: High - Core engagement loop**

1. **XP System**
   - XP for chapter completion
   - XP for correct quiz answers
   - XP display in UI
   - XP history tracking

2. **Streak System**
   - Daily reading detection
   - Consecutive day counting
   - Streak display in header
   - Streak freeze (optional premium feature)

3. **Progress Tracking**
   - Chapter completion persistence
   - Book completion detection
   - Overall Bible progress %

### Phase 4: Tier Rankings
**Priority: Medium - Social competition**

1. **Tier System**
   - Define tier thresholds
   - 14-day rolling XP window
   - Tier calculation logic
   - Tier badge display

2. **Leaderboard**
   - Global rankings view
   - Friends-only rankings
   - Weekly reset mechanism

### Phase 5: Achievements
**Priority: Medium - Long-term engagement**

1. **Achievement Definitions**
   - Book completion badges (66 total)
   - Streak milestones
   - XP milestones
   - Special achievements

2. **Achievement UI**
   - Badge collection display
   - Unlock animations
   - Progress toward locked achievements

### Phase 6: Social Features
**Priority: Medium - Community building**

1. **Friend System**
   - User ID generation
   - Friend requests
   - Friend list management
   - Friend panel component

2. **Social Discovery**
   - Search by user ID
   - Invite functionality
   - Friend progress comparison

### Phase 7: Monetization
**Priority: Lower - Revenue enablement**

1. **Premium Gating**
   - Free content through Genesis 50
   - Paywall at OT/NT boundary
   - Premium badge display

2. **Payment Integration**
   - Subscription management (Stripe/Paddle for web)
   - Receipt validation
   - Restore purchases

### Phase 8: Polish & Extras
**Priority: Lower - Enhanced experience**

1. **Push Notifications (OneSignal)**
   - Streak reminders
   - Friend activity alerts
   - Achievement notifications

2. **Audio Features**
   - Sound effects for achievements
   - Optional verse audio

3. **Additional Animations**
   - Rive animations
   - Enhanced confetti
   - Level-up celebrations

---

## Files to Create/Modify

### New Files Needed
```
src/
├── lib/
│   └── supabase.js          # Supabase client config
├── context/
│   └── AuthContext.jsx      # User auth state
├── pages/
│   ├── Login.jsx            # Auth pages
│   ├── Signup.jsx
│   ├── Profile.jsx          # User profile
│   └── Leaderboard.jsx      # Rankings
├── components/
│   ├── ProtectedRoute.jsx   # Auth guard
│   ├── XPDisplay.jsx        # XP counter
│   ├── StreakBadge.jsx      # Streak display
│   ├── TierBadge.jsx        # Tier indicator
│   ├── AchievementCard.jsx  # Badge component
│   ├── FriendPanel.jsx      # Friends list
│   └── Paywall.jsx          # Premium gate
└── hooks/
    ├── useAuth.js           # Auth hook
    ├── useProgress.js       # Progress hook
    └── useXP.js             # XP tracking hook
```

### Existing Files to Modify
- `src/App.jsx` - Add auth, context providers, new routes
- `src/App.css` - Add styles for new components
- `index.html` - Add meta tags, PWA support
- `package.json` - Add new dependencies

### Database Migrations
- Create all Supabase tables
- Migrate quiz data from JSON to database
- Set up Row Level Security (RLS) policies

---

## Recommended Dependencies

```json
{
  "@supabase/supabase-js": "^2.x",
  "react-router-dom": "^6.x",
  "chart.js": "^4.x",
  "react-chartjs-2": "^5.x"
}
```

---

## Estimated Scope

| Phase | Complexity | New Components |
|-------|------------|----------------|
| Phase 1: Backend | High | 3-5 files |
| Phase 2: User System | High | 5-7 files |
| Phase 3: Gamification | Medium | 4-6 files |
| Phase 4: Tier Rankings | Medium | 2-3 files |
| Phase 5: Achievements | Medium | 3-4 files |
| Phase 6: Social | High | 4-6 files |
| Phase 7: Monetization | Medium | 2-3 files |
| Phase 8: Polish | Low | 2-4 files |

---

## Next Steps

1. **Set up Supabase project** and configure environment
2. **Design database schema** in detail
3. **Begin Phase 1** (Backend Foundation) implementation
4. **Progress through phases** sequentially

---

## Notes

- Current BSB.json (11MB) and seraph-progress.json (4.7MB) can be reused
- Existing quiz/reading logic in App.jsx is solid and can be extended
- Design system in App.css is well-structured for expansion
- Consider Progressive Web App (PWA) for mobile-like experience on web
- RevenueCat doesn't have React web SDK - need alternative (Stripe, Paddle) for web payments

---

## Current Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `src/App.jsx` | 732 | Main app component (reading, quiz, navigation) |
| `src/App.css` | 857 | Complete styling with theme support |
| `src/main.jsx` | 11 | React entry point |
| `BSB.json` | 11MB | Complete Bible text (Berean Standard Bible) |
| `seraph-progress.json` | 4.7MB | Quiz questions database |
