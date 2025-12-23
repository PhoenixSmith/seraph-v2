# Bible Chapter Explorer - Aesthetics & UI Specification Guide

A comprehensive specification for the Seraph Bible Chapter Overview GUI, covering visual design, component architecture, interactions, and implementation details.

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Component Architecture](#component-architecture)
5. [Chapter Path Grid](#chapter-path-grid)
6. [Verse Display System](#verse-display-system)
7. [Navigation & Dropdowns](#navigation--dropdowns)
8. [Quiz Interface](#quiz-interface)
9. [Animations & Effects](#animations--effects)
10. [Layout & Spacing](#layout--spacing)
11. [State Management](#state-management)
12. [File Reference](#file-reference)

---

## Overview

The Bible Chapter Explorer is a sophisticated reading and quiz interface that guides users through all 66 books of the Bible. The design emphasizes readability, progression tracking, and gamified learning through an elegant dark-themed UI with accent colors and smooth animations.

**Core Features:**
- Chapter grid visualization with connected paths
- Verse-by-verse reading with swipe navigation
- Interactive quiz system with streak tracking
- Progress tracking per book and chapter
- Premium gating with paywall at Genesis 50:26

---

## Color System

### Primary Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#6860D4` | Main accent, active states |
| **Secondary** | `#573CBD` | Buttons, gradient endpoints |
| **Accent** | `#CE97F3` | Light magenta highlights |
| **Light Accent** | `#8F8AD8` | Lavender tones, secondary highlights |
| **Blue Rim** | `#766FD6` | Border accents, premium elements |

### Dark Theme Foundation

| Name | Hex | Usage |
|------|-----|-------|
| **Dark Color** | `#1F1F20` | Primary background |
| **Dark Rim Light** | `#313133` | Subtle borders, card edges |
| **Deep Black** | `#0A0A0A` | Gradient endpoints |

### Text Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Primary Font** | `#FFFFFF` | Active verse text, titles |
| **Secondary Font** | `#7A7A7A` | Inactive verses, hints |
| **Gray** | `#808080` | Disabled states |

### Dynamic Pastel Generation

Chapter grid buttons use dynamically generated pastel colors based on the book name hash:

```dart
Color getPastelColorFromString(String input) {
  final hash = input.hashCode;
  final hue = (hash % 360).toDouble();
  return HSLColor.fromAHSL(1.0, hue, 0.6, 0.8).toColor();
}
```

This creates a unique, consistent color for each book while maintaining a soft pastel aesthetic.

---

## Typography

### Font Family

**Poppins** is used exclusively throughout the interface for consistency and modern readability.

### Size Scale

| Element | Size | Weight |
|---------|------|--------|
| Titles | 26pt+ | Bold |
| Button Text | 20pt | Semi-bold |
| Verse Text | 14-20pt | Regular (adjustable) |
| Question Text | 16pt | Regular |
| Chapter Numbers | 14pt | Medium |
| Dropdown Items | 14pt | Regular |

### Font Size Adjustment

Users can adjust verse text size via a slider:
- **Range:** 14pt - 20pt
- **Divisions:** 6 discrete steps
- **Default:** 14pt
- **Component:** `FontSizeSlider`

---

## Component Architecture

### Hierarchy Overview

```
BibleVersePage (Main Container)
├── Top Navigation Section
│   └── VerseSelectionDropdown
│       ├── Book Dropdown
│       ├── Chapter Dropdown
│       └── Verse Dropdown
│
├── Chapter Overview (no chapter selected)
│   ├── ChapterPath (Grid visualization)
│   └── BookProgressDisplay
│
├── Verse Display Section (chapter/verse selected)
│   ├── VerseDisplay (Previous - grayed)
│   ├── VerseDisplay (Current - white)
│   ├── VerseDisplay (Next - grayed)
│   └── ProgressBar
│
├── Navigation Controls
│   ├── Jump to verse 1 button
│   ├── Jump to last verse button
│   └── FontSizeSlider
│
├── Quiz Section (when active)
│   ├── Streak Display (🔥)
│   ├── QuestionDisplay
│   ├── Answer Buttons
│   ├── Quiz ProgressBar
│   ├── Report Question
│   ├── Study Mode
│   └── Exit Quiz
│
└── Overlays
    ├── Confetti Controllers (×2)
    ├── Paywall Modal
    └── Angel Rive Animation
```

---

## Chapter Path Grid

The Chapter Path is a visual grid representation of all chapters in a book, showing progression and current position.

### Grid Layout

- **Columns:** 5 per row
- **Direction:** Alternates left-to-right and right-to-left per row (snake pattern)
- **Cell Size:** 50×50 pt
- **Border Radius:** 16pt on grid cells, 10pt on container top corners

### Cell States

| State | Icon | Visual Treatment |
|-------|------|------------------|
| **Locked** | 🔒 Lock | Dimmed, muted pastel |
| **Current** | ⭐ Star | Shimmer animation, full color |
| **Completed** | ✓ Check | Full pastel, subtle glow |
| **Available** | Number | Standard pastel |

### Connecting Lines

Chapters are visually connected with animated white lines:
- **Stroke Width:** 4pt
- **Color:** White
- **Pattern:** Connects adjacent cells following the snake pattern
- **Animation:** Subtle pulse on active connections

### Shadow & Depth

```dart
BoxDecoration(
  boxShadow: [
    BoxShadow(
      color: Colors.black.withOpacity(0.2),
      blurRadius: 7,
      offset: Offset(0, 3),
    ),
  ],
)
```

### Book Progress Display

A horizontal progress bar below the chapter grid showing completion percentage:
- **Height:** 8pt
- **Background:** `darkColorRimLight`
- **Fill:** Gradient from `primary` to `accent`
- **Border Radius:** 1000pt (pill shape)

---

## Verse Display System

### Three-Verse Stack

The reading interface displays three verses simultaneously:

```
┌─────────────────────────────────┐
│  [Previous Verse - Gray 50%]    │
├─────────────────────────────────┤
│                                 │
│  [Current Verse - White 100%]   │
│                                 │
├─────────────────────────────────┤
│  [Next Verse - Gray 50%]        │
└─────────────────────────────────┘
         [Progress Bar]
```

### Verse Styling

**Current Verse:**
- Color: `#FFFFFF` (white)
- Size: User-adjusted (14-20pt)
- Alignment: Center
- Padding: 16pt horizontal

**Adjacent Verses:**
- Color: `#7A7A7A` (50% opacity)
- Size: Same as current
- Purpose: Context preview

### Chapter Progress Bar

- **Position:** Below verse stack
- **Width:** 80% of container
- **Height:** 6pt
- **Shows:** Current verse position within chapter

---

## Navigation & Dropdowns

### Verse Selection Dropdown

Three cascading dropdowns for hierarchical navigation:

```
[Book ▼] → [Chapter ▼] → [Verse ▼]
```

### Dropdown Styling

```dart
Container(
  decoration: BoxDecoration(
    color: darkColor,
    borderRadius: BorderRadius.circular(10),
    border: Border.all(color: darkColorRimLight),
  ),
)
```

### Dropdown Item States

| State | Visual |
|-------|--------|
| Default | White text |
| Locked | Lock icon + muted text |
| Completed | Check icon + text |
| Selected | Primary color highlight |

### Gesture Navigation

| Gesture | Action |
|---------|--------|
| Swipe Up | Next verse |
| Swipe Down | Previous verse |
| Keyboard ↑ | Jump to verse 1 |
| Keyboard ↓ | Jump to last verse |

### Navigation Bounds

- **Start Bound:** Genesis 1:1 (cannot go before)
- **End Bound:** Revelation 22:21 (cannot go after)
- **Wrap Behavior:** End of chapter wraps to verse 1
- **Rate Limiting:** `timeTillCanSwipeAgain` prevents rapid swipes

---

## Quiz Interface

### Question Container

```dart
Container(
  constraints: BoxConstraints(maxWidth: 600),
  decoration: BoxDecoration(
    gradient: RadialGradient(
      colors: [darkColor, Color(0xFF0A0A0A)],
    ),
    border: GradientBoxBorder(
      gradient: LinearGradient(
        colors: [primary, secondary],
      ),
      width: 2,
    ),
    borderRadius: BorderRadius.circular(16),
  ),
)
```

### Streak Display

```
🔥 12
```

- **Icon:** Fire emoji
- **Position:** Above question
- **Purpose:** Shows consecutive correct answers

### Answer Buttons

- **Style:** Gradient background (secondary → primary)
- **Border:** Gradient border using `GradientBoxBorder`
- **Animation:** 250ms transition on tap
- **Numbering:** 1., 2., 3., etc. prefix
- **Text Transform:** Auto-capitalized first letter

### Wrong Answer Feedback

- **Color Flash:** Red tint on question text
- **Sound:** `failure.wav`
- **Behavior:** Question moves to end of queue

### Correct Answer Feedback

- **Sound:** `success.wav`
- **Behavior:** Question removed from queue
- **XP:** +1 XP per correct answer

---

## Animations & Effects

### Confetti System

Two confetti controllers for layered celebration:

```dart
// Controller 1: Dense burst
ConfettiController(
  duration: Duration(seconds: 2),
  numberOfParticles: 40,
)

// Controller 2: Lighter accent
ConfettiController(
  duration: Duration(seconds: 2),
  numberOfParticles: 20,
)
```

**Colors:** Green, Blue, Pink, Orange, Purple

### Shimmer Animation

Applied to current chapter cell and loading states:

```dart
Shimmer(
  duration: Duration(seconds: 2),
  color: Colors.white,
  child: ChapterCell(),
)
```

### Rive Animation

**Angel Celebration:**
- **Trigger:** Chapter completion
- **Asset:** Angel animation file
- **Duration:** Synced with confetti

### Button Animations

```dart
AnimatedButton(
  duration: Duration(milliseconds: 250),
  // Smooth color and scale transitions
)
```

### Animated Loading Border

Used around book name display:

```dart
AnimatedLoadingBorder(
  borderColor: primary,
  child: BookTitle(),
)
```

---

## Layout & Spacing

### Container Constraints

| Element | Max Width |
|---------|-----------|
| Main Container | 700pt |
| Quiz Container | 600pt |
| Chapter Grid | 100% of parent |

### Padding Standards

| Context | Value |
|---------|-------|
| Page Padding | 16pt |
| Card Internal | 12pt |
| Button Padding | 12pt vertical, 24pt horizontal |
| Verse Stack | 16pt horizontal |

### Border Radius Scale

| Size | Usage |
|------|-------|
| 1000pt | Pills, progress bars |
| 16pt | Cards, grid cells |
| 10pt | Dropdowns, containers |
| 8pt | Small buttons |

### Shadow Standards

```dart
BoxShadow(
  color: Colors.black.withOpacity(0.2),
  blurRadius: 7,
  offset: Offset(0, 3),
)
```

---

## State Management

### Global Variables (GVH)

```dart
// Current selection state
BibleChapter? currentlySelectedBookData
int? currentlySelectedChapter  // null = viewing chapter grid
int? currentlySelectedVerse    // null = no verse selected

// Cached data
List<BibleChapter> allBooks    // 66 books, loaded once
```

### View States

| State | Condition | Display |
|-------|-----------|---------|
| Book Selection | `currentlySelectedBookData == null` | Book list |
| Chapter Grid | `currentlySelectedChapter == null` | ChapterPath grid |
| Verse Reading | `currentlySelectedVerse != null` | Verse stack |
| Quiz Active | `questions.isNotEmpty` | Quiz interface |

### Data Flow

```
User Selection
      ↓
DB.getChapterVerses(bookId, chapter)
      ↓
List<String> verses
      ↓
VerseDisplay widgets
```

---

## File Reference

### Core Files

| Path | Purpose |
|------|---------|
| `lib/pages/bible_verse_page.dart` | Main page (1,346 lines) |
| `lib/data/bible_chapter.dart` | Book/chapter model |
| `lib/data/question.dart` | Quiz question model |
| `lib/data/chapter_completion.dart` | Completion tracking |

### Components

| Path | Purpose |
|------|---------|
| `lib/components/verse_display.dart` | Individual verse rendering |
| `lib/components/verse_selection_dropdown.dart` | Navigation dropdowns |
| `lib/components/chapter_path.dart` | Chapter grid with connections |
| `lib/components/book_progress_display.dart` | Book completion bar |
| `lib/components/progress_bar.dart` | Generic progress visualization |
| `lib/components/font_size_slider.dart` | Font size adjustment |
| `lib/components/question_display.dart` | Quiz question UI |
| `lib/components/Popups/chapter_test_complete.dart` | Completion celebration |

### Utilities

| Path | Purpose |
|------|---------|
| `lib/utils/gvh.dart` | Global state & color constants |
| `lib/utils/db.dart` | Database/API layer |

---

## Dependencies

Key Flutter packages powering the UI:

```yaml
dependencies:
  gradient_ui_widgets: ^x.x.x      # Gradient text and buttons
  gradient_borders: ^x.x.x         # Gradient box borders
  animated_button: ^x.x.x          # Button animations
  confetti: ^x.x.x                 # Confetti particle effects
  shimmer_animation: ^x.x.x        # Shimmer loading effects
  rive: ^x.x.x                     # Vector animations
  supabase_flutter: ^x.x.x         # Database and auth
  animated_loading_border: ^x.x.x  # Animated borders
  purchases_flutter: ^x.x.x        # RevenueCat IAP
```

---

## Premium & Paywall

### Free Content

- **Book:** Genesis only (50 chapters)
- **Trigger:** Reaching Genesis 50:26

### Paywall Modal

```dart
Container(
  decoration: BoxDecoration(
    gradient: RadialGradient(
      colors: [darkColor, Color(0xFF0A0A0A)],
    ),
    border: GradientBoxBorder(
      gradient: LinearGradient(colors: [blueRim, primary]),
      width: 2,
    ),
  ),
  child: PremiumPrompt(),
)
```

### Premium Unlocks

- 65 additional books
- 11,300+ quiz questions
- Full Bible access through Revelation

---

## Audio Feedback

| Event | Sound File |
|-------|------------|
| Chapter Complete | `level_complete.wav` |
| Correct Answer | `success.wav` |
| Wrong Answer | `failure.wav` |

---

## Summary Statistics

- **Total Components:** 10+ specialized widgets
- **Color Palette:** 8 primary + dynamic pastels
- **Gradient Types:** Linear, Radial
- **Animation Types:** Rive, Shimmer, Confetti, Animated Buttons
- **Database Methods:** 7+ specialized queries
- **Max Container Width:** 700pt
- **Font Size Range:** 14-20pt
