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
global.css                    # Tailwind directives; imported in app/_layout.tsx
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
    quiz.tsx                  # Quiz hub / start battle entry point
    notifications.tsx         # Activity list (no feature store — read-only)
    profile.tsx
  (quiz)/
    _layout.tsx               # Hides tab bar for quiz play
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
    notifications/
      hooks/                  # useNotifications (no store — read-only)
    leaderboard/
      components/             # PodiumRow, RankList, TabFilter
      hooks/                  # useLeaderboard
    profile/
      components/             # StatsGrid, BadgeRow, StreakCalendar
      hooks/                  # useProfile
      store.ts
    auth/
      components/             # LoginForm, GuestButton
      hooks/                  # useAuth
      store.ts
    onboarding/
      store.ts                # selectedTopics persisted until auth syncs
  shared/
    components/               # Button, Text, Card, Skeleton, Avatar
    theme/
      colors.ts               # Design tokens
      typography.ts           # Inter type scale
      spacing.ts
    lib/
      api.ts                  # HTTP client (fetch wrapper)
      storage.ts              # AsyncStorage helpers (typed wrappers)
    hooks/                    # useHaptics, useAnimation
    types.ts                  # Shared TypeScript interfaces
```

**Notes:**
- `notifications/` has no feature store — it is a read-only screen fetching directly via a hook. No Zustand slice needed.
- `leaderboard/` has its own feature folder (components + hook) but no Zustand store — data is fetched and held locally in the hook.
- `reward/` is a modal with no feature folder — it reads from `quiz/store.ts` to display earned XP/badges.

---

## 2. Navigation Architecture

Expo Router drives all navigation via the `app/` file tree.

```
Root (_layout.tsx)
├── Splash (index.tsx)
│   └── auth redirect logic (see boot flow below)
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
├── (quiz) group — own layout, tab bar hidden
│   └── [id].tsx           # Full-screen quiz play
│
├── leaderboard.tsx        # Pushed from results screen
└── reward.tsx             # Modal route (transparentModal presentation)
```

**Key decisions:**
- `(auth)`, `(tabs)`, and `(quiz)` are Expo Router route groups — affect layout, not URL.
- `(quiz)/[id].tsx` resolves to URL `/[id]`. Using a separate group avoids the routing ambiguity of having `(tabs)/quiz.tsx` (URL `/quiz`) and a sibling directory `quiz/` both existing under `app/`.
- `reward.tsx` uses `presentation: 'transparentModal'` declared via `<Stack.Screen options={{ presentation: 'transparentModal' }} />` in its parent stack layout.
- Auth redirect logic lives entirely in root `_layout.tsx`.

### Auth Boot Flow (root `_layout.tsx`)

```
App opens
  │
  ├── expo-splash-screen.preventAutoHideAsync() called immediately
  │
  ├── Load fonts (useFonts)
  ├── Hydrate persisted auth store (Zustand persist rehydration)
  │
  ├── hasSeenOnboarding? (AsyncStorage key: 'quizly.onboarded')
  │     NO  → <Redirect href="/(auth)/onboarding" />
  │     YES →
  │           isGuest or isLoggedIn?
  │             YES → <Redirect href="/(tabs)" />
  │             NO  → <Redirect href="/(auth)/onboarding" />
  │
  └── expo-splash-screen.hideAsync() after fonts + rehydration done
```

**First launch detection:** absence of the `quizly.onboarded` key in AsyncStorage. Set this key to `'true'` on onboarding completion.

---

## 3. State Management (Zustand v5)

Each feature owns a separate Zustand store. Stores are never merged.

**Zustand v5 note:** v5 dropped the curried `create` form. Use the direct form:
```ts
// v5 — correct
const useAuthStore = create<AuthState>()(persist((set) => ({ ... }), { ... }))
// v4 — broken in v5
const useAuthStore = create(persist(...))
```

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
cursor: string | null        // cursor for next page fetch
hasMore: boolean
currentTopic: string
likedCardIds: string[]       // Set not used — not serializable via persist
savedCardIds: string[]
actions: fetchCards(), fetchMoreCards(), likeCard(), saveCard(), setTopic()
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
profile: UserProfile | null   // xp, level, streak, badges, rank
actions: fetchProfile(), claimReward()
```
**Persisted** via `zustand/middleware persist` + AsyncStorage.

### `src/features/onboarding/store.ts`
```ts
selectedTopics: string[]
hasCompleted: boolean
actions: toggleTopic(), completeOnboarding()
```
**Persisted.** `selectedTopics` seeds the feed's `currentTopic` on first home load. After login, selected topics are synced to the API via `PATCH /profile`.

---

## 4. API Layer

A thin `fetch` wrapper lives in `src/shared/lib/api.ts`:
- Base URL from `EXPO_PUBLIC_API_URL` environment variable (see Section 7 for env file setup)
- Automatically attaches `Authorization: Bearer <token>` from auth store
- Throws typed `ApiError` on non-2xx responses
- Guest requests include `X-Guest-Id` header

Each feature exposes its own hook for data fetching — no shared query library (intentionally kept simple while the API shape is still evolving):

| Hook | Endpoint |
|------|----------|
| `useFeed()` | `GET /cards?topic=&cursor=` |
| `useCategories()` | `GET /topics` |
| `useQuizSession()` | `POST /quiz/start`, `POST /quiz/answer` |
| `useLeaderboard()` | `GET /leaderboard?period=weekly\|monthly\|alltime` |
| `useProfile()` | `GET /profile`, `PATCH /profile` |
| `useNotifications()` | `GET /notifications` |
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

**`tailwind.config.js` content glob** (critical — must cover both `app/` and `src/`):
```js
content: [
  './app/**/*.{ts,tsx}',
  './src/**/*.{ts,tsx}',
]
```

**NativeWind v4 `cssInterop` requirement:** Custom React Native components that accept `className` must be registered with `cssInterop`. This is a v4 breaking change from v2. All shared components (`<Text />`, `<Button />`, etc.) must call `cssInterop(ComponentName, { className: 'style' })` in their file.

### Shared Component Contracts
| Component | Variants |
|-----------|----------|
| `<Text />` | `display`, `title`, `heading`, `body`, `caption` |
| `<Button />` | `primary`, `secondary`, `ghost` |
| `<Card />` | glassmorphism surface, `surface2` bg + subtle border |
| `<Skeleton />` | shimmer cyan→iris, 1.4s loop |
| `<Avatar />` | circular, initials fallback |

### Microinteractions
Animations are **stubbed at scaffold stage** — placeholders only. A separate animation spec will detail timing, easing, and implementation. The 6 planned interactions are:

- Scroll snap (feed cards)
- XP burst (score increase)
- Quiz answer feedback (pulse + haptic)
- Streak fire (flame icon)
- Rank climb (leaderboard row)
- Loading skeleton (shimmer)

All implemented via `react-native-reanimated` v3 (`withTiming` / `withSpring`).

---

## 6. Shared Types (`src/shared/types.ts`)

```ts
interface User {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

interface UserProfile {
  userId: string
  xp: number
  level: number
  streakDays: number
  accuracy: number        // 0–100
  rank: number
  badges: Badge[]
  weeklyActivity: boolean[] // [Mon..Sun]
}

interface Badge {
  id: string
  name: string
  iconUrl: string
  earnedAt: string
}

interface FactCard {
  id: string
  topic: string
  title: string
  body: string
  imageUrl?: string
  author: string
  readTimeSeconds: number
  likes: number
  saves: number
}

interface QuizSession {
  id: string
  questions: Question[]
  opponentId?: string     // null for solo
  endsAt: string          // ISO timestamp
}

interface Question {
  id: string
  type: 'mcq' | 'true_false' | 'fill_blank'
  text: string
  options?: string[]      // MCQ only
  correctAnswer: string
  xpReward: number
}

interface ApiError {
  status: number
  message: string
}
```

---

## 7. Configuration Files

### Environment Variables (`.env.local`, `.env.example`)
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```
- `.env.local` — local dev values, gitignored
- `.env.example` — committed, documents required variables with empty values
- Prefix `EXPO_PUBLIC_` is required for Expo to bundle the variable into the client

### `tsconfig.json` — Path Aliases
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
Enables `import { Button } from '@/shared/components/Button'` throughout the codebase.

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: ['react-native-reanimated/plugin'],
  }
}
```

### `metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)
module.exports = withNativeWind(config, { input: './global.css' })
```

### `global.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Imported once in `app/_layout.tsx`.

### `app.json` (key fields)
```json
{
  "expo": {
    "name": "Quizly",
    "slug": "quizly",
    "version": "1.0.0",
    "android": {
      "package": "com.quizly.app"
    }
  }
}
```

---

## 8. Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~52.0.0 | Core SDK |
| `expo-router` | ~4.0.0 | File-based routing |
| `react-native` | 0.76.x | Framework |
| `nativewind` | ^4.0.0 | Tailwind for RN |
| `tailwindcss` | ^3.4.0 | CSS engine |
| `zustand` | ^5.0.0 | State management |
| `expo-font` | ~13.0.0 | Font loading |
| `expo-splash-screen` | ~0.29.0 | Native splash control |
| `expo-status-bar` | ~2.0.0 | Status bar theming |
| `expo-constants` | ~17.0.0 | App config / env access |
| `expo-haptics` | ~14.0.0 | Haptic feedback |
| `expo-dev-client` | ~4.0.0 | Custom Android dev build |
| `@expo-google-fonts/inter` | ^0.2.3 | Inter typeface |
| `react-native-reanimated` | ^3.16.0 | Animations |
| `react-native-gesture-handler` | ^2.20.0 | Swipe gestures |
| `@react-native-async-storage/async-storage` | ^2.1.0 | Local persistence |
| `react-native-safe-area-context` | ^4.14.0 | Safe area insets |
| `react-native-screens` | ^4.4.0 | Native screen perf |
| `lucide-react-native` | ^0.475.0 | Icon set |
| `typescript` | ^5.3.0 | Type safety |
| `eslint` | ^8.57.0 | Linting |
| `prettier` | ^3.3.0 | Formatting |

**Intentionally excluded:** React Query, Redux, pre-built UI component libraries (building from design system for pixel-perfect fidelity).

---

## Screens Summary

| # | Screen | Route | Notes |
|---|--------|-------|-------|
| 01 | Splash | `index.tsx` | Auto-redirects; hides native splash after hydration |
| 02 | Onboarding | `(auth)/onboarding.tsx` | Topic selection, 3 steps; sets `quizly.onboarded` key |
| 03 | Home feed | `(tabs)/index.tsx` | Vertical scroll cards |
| 04 | Explore | `(tabs)/explore.tsx` | Category grid |
| 05 | Quiz hub | `(tabs)/quiz.tsx` | Start / join battle |
| 06 | Quiz play | `(quiz)/[id].tsx` | MCQ + T/F + Fill; tab bar hidden |
| 07 | Leaderboard | `leaderboard.tsx` | Weekly/Monthly/All-time; pushed from results |
| 08 | Reward popup | `reward.tsx` | `transparentModal` over current screen |
| 09 | Notifications | `(tabs)/notifications.tsx` | Activity list; no Zustand store |
| 10 | Profile | `(tabs)/profile.tsx` | XP, stats, badges |
| 11 | Login | `(auth)/login.tsx` | Optional; guest can skip |
| 12 | Register | `(auth)/register.tsx` | Optional |
