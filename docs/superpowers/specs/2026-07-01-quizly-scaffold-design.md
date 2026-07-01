# Quizly — React Native Expo Scaffold Design

**Date:** 2026-07-01
**Status:** Approved
**Platform:** Android (first), Expo SDK ~52

---

## Overview

Quizly is a gamified learning app where users scroll through bite-sized knowledge cards by topic, take quizzes, compete on leaderboards, and earn XP, streaks, and badges. The visual design is dark, vibrant, and animation-rich — inspired by a TikTok-style vertical scroll feed with heavy gamification.

---

## 1. Folder Structure

```
app/                          # Expo Router file-based routes
  _layout.tsx                 # Root layout (fonts, providers, auth redirect)
  index.tsx                   # Splash screen → redirects based on auth state
  (auth)/
    _layout.tsx
    onboarding.tsx            # Topic selection onboarding (3 swipeable steps)
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx               # Bottom tab navigator (5 tabs)
    index.tsx                 # Home feed (vertical scroll cards)
    explore.tsx               # Categories grid
    quiz.tsx                  # Quiz hub / start battle
    notifications.tsx
    profile.tsx
  quiz/
    [id].tsx                  # Full-screen quiz play (MCQ / True-False / Fill)
  leaderboard.tsx             # Pushed from quiz results
  reward.tsx                  # Modal overlay (reward popup)

src/
  features/
    feed/
      components/             # FactCard, CardActions
      hooks/                  # useFeed, useCardInteractions
      store.ts                # Zustand slice
    quiz/
      components/             # QuestionCard, AnswerOption, Timer
      hooks/                  # useQuizSession
      store.ts
    explore/
      components/             # CategoryCard, TopicGrid
      hooks/                  # useCategories
    profile/
      components/             # StatsGrid, BadgeRow, StreakCalendar
      hooks/                  # useProfile
      store.ts
    auth/
      components/             # LoginForm, GuestButton
      hooks/                  # useAuth
      store.ts
  shared/
    components/               # Button, Text, Card, Skeleton, Avatar
    theme/
      colors.ts               # Design tokens
      typography.ts           # Inter type scale
      spacing.ts
    lib/
      api.ts                  # HTTP client (fetch wrapper)
      storage.ts              # AsyncStorage helpers
    hooks/                    # useHaptics, useAnimation
```

---

## 2. Navigation Architecture

Expo Router drives all navigation via the `app/` file tree.

```
Root (_layout.tsx)
├── Splash (index.tsx)
│   └── redirects → (auth)/onboarding  [first launch]
│                → (tabs)/            [returning user / guest]
│
├── (auth) group — no tab bar
│   ├── onboarding.tsx
│   ├── login.tsx
│   └── register.tsx
│
├── (tabs) group — bottom tab bar
│   ├── index.tsx          # Home feed
│   ├── explore.tsx        # Categories
│   ├── quiz.tsx           # Quiz hub
│   ├── notifications.tsx
│   └── profile.tsx
│
├── quiz/[id].tsx          # Full-screen, no tab bar
├── leaderboard.tsx        # Pushed from results screen
└── reward.tsx             # Modal route (transparent bg overlay)
```

**Key decisions:**
- `(auth)` and `(tabs)` are Expo Router route groups — affect layout, not URL
- `quiz/[id].tsx` is outside `(tabs)` so the tab bar is hidden during active quiz play
- `reward.tsx` is a modal route rendered over the current screen
- Auth state is checked in root `_layout.tsx`; `<Redirect />` handles routing logic
- Guest users are issued a temporary `guestId` (stored in AsyncStorage) and can use the app without logging in; optional login syncs progress to the custom API

---

## 3. State Management (Zustand)

Each feature owns a separate Zustand store. Stores are never merged to keep them independently testable.

### `src/features/auth/store.ts`
```ts
user: User | null
isGuest: boolean
token: string | null
guestId: string | null
actions: login(), logout(), continueAsGuest()
```
**Persisted** via `zustand/middleware persist` + AsyncStorage.

### `src/features/feed/store.ts`
```ts
cards: FactCard[]
currentTopic: string
likedCardIds: Set<string>
savedCardIds: Set<string>
actions: fetchCards(), likeCard(), saveCard(), setTopic()
```
In-memory only (no persistence).

### `src/features/quiz/store.ts`
```ts
session: QuizSession | null
answers: Record<string, string>
score: number
combo: number
xpEarned: number
actions: startQuiz(), submitAnswer(), endQuiz()
```
In-memory only.

### `src/features/profile/store.ts`
```ts
profile: UserProfile | null   # xp, level, streak, badges, rank
actions: fetchProfile(), claimReward()
```
**Persisted** via `zustand/middleware persist` + AsyncStorage.

---

## 4. API Layer

A thin `fetch` wrapper lives in `src/shared/lib/api.ts`:
- Base URL from `EXPO_PUBLIC_API_URL` environment variable
- Automatically attaches `Authorization: Bearer <token>` from auth store
- Throws typed `ApiError` on non-2xx responses
- Guest requests include `X-Guest-Id` header

Each feature exposes its own hook for data fetching — no shared query library (intentionally kept simple while the API shape is still evolving):

| Hook | Endpoint |
|------|----------|
| `useFeed()` | `GET /cards?topic=&cursor=` |
| `useCategories()` | `GET /topics` |
| `useQuizSession()` | `POST /quiz/start`, `POST /quiz/answer` |
| `useProfile()` | `GET /profile`, `PATCH /profile` |
| `useAuth()` | `POST /auth/login`, `POST /auth/register`, `POST /auth/guest` |

All hooks return `{ data, isLoading, error, refetch }`.

---

## 5. Theme & Design System

### Color Tokens (`src/shared/theme/colors.ts`)
| Token | Hex | Usage |
|-------|-----|-------|
| `void` | `#050514` | App background |
| `cyan` | `#00E3FF` | Primary action, correct answer |
| `iris` | `#A855F7` | Secondary accent |
| `fuchsia` | `#EC4899` | Highlights |
| `gold` | `#FFD700` | XP, streak, rank |
| `ember` | `#FF8C42` | Fire / warning |
| `surface1` | `#0D0D1A` | Card background |
| `surface2` | `#14142B` | Elevated surfaces |

### Typography (`src/shared/theme/typography.ts`)
| Level | Size | Weight |
|-------|------|--------|
| Display | 24 | Bold 700 |
| Title | 18 | SemiBold 600 |
| Heading | 14 | SemiBold 600 |
| Body | 12 | Regular 400 |
| Caption | 10 | Regular 400 |

Font family: **Inter** (via `@expo-google-fonts/inter`)

### Spacing (`src/shared/theme/spacing.ts`)
`xs: 4 | sm: 8 | md: 16 | lg: 24 | xl: 32`

### NativeWind Integration
All tokens are extended into `tailwind.config.js` enabling `className="bg-void text-cyan"`. Raw token files remain available for programmatic use in animations.

### Shared Component Contracts
| Component | Variants |
|-----------|----------|
| `<Text />` | `display`, `title`, `heading`, `body`, `caption` |
| `<Button />` | `primary`, `secondary`, `ghost` |
| `<Card />` | glassmorphism surface, `surface2` bg + subtle border |
| `<Skeleton />` | shimmer cyan→iris, 1.4s loop |
| `<Avatar />` | circular, initials fallback |

### Microinteractions (react-native-reanimated)
| Name | Behaviour |
|------|-----------|
| Scroll snap | Card transitions ease-out 320ms, subtle parallax on imagery |
| XP burst | Number ticks up, particle ring expands + fades 600ms |
| Quiz answer | Correct option pulses cyan + haptic tap; others dim to 30% alpha |
| Streak fire | Flame icon 4-frame flicker cycle on app open after 7+ days |
| Rank climb | Avatar slides up list with gold glow 480ms cubic-bezier |
| Loading skeleton | Shimmer sweeps left-to-right 1.4s brand gradient cadence |

---

## 6. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~52 | Core SDK |
| `expo-router` | ~4 | File-based routing |
| `react-native` | 0.76 | Framework |
| `nativewind` | ^4 | Tailwind for RN |
| `tailwindcss` | ^3 | CSS engine |
| `zustand` | ^5 | State management |
| `expo-font` | latest | Font loading |
| `@expo-google-fonts/inter` | latest | Inter typeface |
| `react-native-reanimated` | ^3 | Animations |
| `react-native-gesture-handler` | ^2 | Swipe gestures |
| `expo-haptics` | latest | Haptic feedback |
| `@react-native-async-storage/async-storage` | latest | Local persistence |
| `react-native-safe-area-context` | latest | Safe area insets |
| `react-native-screens` | latest | Native screen perf |
| `lucide-react-native` | latest | Icon set |
| `typescript` | ^5 | Type safety |
| `eslint` + `prettier` | latest | Code quality |
| `expo-dev-client` | latest | Custom Android dev build |

**Intentionally excluded:** React Query, Redux, pre-built UI component libraries (building from design system for pixel-perfect fidelity).

---

## Screens Summary

| # | Screen | Route | Notes |
|---|--------|-------|-------|
| 01 | Splash | `index.tsx` | Auto-redirects |
| 02 | Onboarding | `(auth)/onboarding.tsx` | Topic selection, 3 steps |
| 03 | Home feed | `(tabs)/index.tsx` | Vertical scroll cards |
| 04 | Explore | `(tabs)/explore.tsx` | Category grid |
| 05 | Quiz hub | `(tabs)/quiz.tsx` | Start / join battle |
| 06 | Quiz play | `quiz/[id].tsx` | MCQ + T/F + Fill |
| 07 | Leaderboard | `leaderboard.tsx` | Weekly/Monthly/All-time |
| 08 | Reward popup | `reward.tsx` | Modal overlay |
| 09 | Notifications | `(tabs)/notifications.tsx` | Activity list |
| 10 | Profile | `(tabs)/profile.tsx` | XP, stats, badges |
| 11 | Login | `(auth)/login.tsx` | Optional |
| 12 | Register | `(auth)/register.tsx` | Optional |
