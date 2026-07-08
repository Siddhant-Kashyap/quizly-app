# Guest Limits + Account Merge — Design

**Date:** 2026-07-08
**Status:** Draft (pending spec review)
**Location:** `/home/sid/Work/Quizly/app/` (frontend), `/home/sid/Work/Quizly/service/spring/` (backend)

---

## Overview

Guest accounts (created via `POST /auth/guest`) currently have unlimited
access to everything. This spec adds three caps meant to push guests
toward creating a real account, plus the actual guest→Google **account
merge** that makes doing so worthwhile (their progress carries over
instead of starting from zero). Google Sign-In itself is already fully
implemented and working — this spec only adds the merge path.

### In scope
- Three guest limits: 1 completed PvP match, 5 completed solo quizzes,
  10 feed cards viewed (lifetime, client-tracked)
- A new Spring endpoint, `GET /quiz/eligibility`, as the single check point
  for the two server-tracked limits (solo, PvP)
- A new full-screen "sign in to continue" wall, shown instead of the
  blocked feature, whose only action is Google Sign-In
- Implementing `POST /auth/merge` (currently a stub) to fold a guest's
  progress into the Google account they just signed into
- Wiring the wall's Google button to the merge flow specifically (not a
  plain login)

### Explicitly out of scope
- Any UI for guests to merge proactively before hitting a limit (e.g. a
  "sign in" option on the Profile screen) — per your answer, the limit
  walls are the only entry point
- Any account-merge scenario other than guest→Google (e.g. merging two
  existing Google accounts) — doesn't apply here
- Server-side tracking of card views — the 10-card limit is intentionally
  client-only (AsyncStorage), per your answer, accepting that it resets
  if the guest clears app storage or reinstalls
- Any change to Google Sign-In itself — already working, untouched

---

## 1. The three limits

| Feature | Limit | Counted by | Tracked |
|---|---|---|---|
| Solo quiz | 5 completed | `QuizResult` rows with `mode='solo'` | Server (already exists) |
| PvP quiz | 1 completed | `QuizResult` rows with `mode='p2p'` | Server (already exists) |
| Feed cards | 10 viewed, lifetime | A card scrolling into view | Client only (AsyncStorage) |

"Completed" means a finished match/quiz that produced a `QuizResult` row
— abandoning a PvP match mid-game (disconnect/quit) does **not** use up
the guest's one attempt, since no `QuizResult` is written for a match that
never reaches `SESSION_END`. This falls out naturally from the existing
data model; no new abandonment-tracking is needed.

These limits only ever apply to `provider = 'guest'` accounts. A
`provider = 'google'` user is never limited.

---

## 2. Backend: `GET /quiz/eligibility`

New endpoint on the existing `QuizController`
(`spring/src/main/java/com/quizly/quiz/controller/QuizController.java`):

```java
@GetMapping("/eligibility")
public ResponseEntity<EligibilityResponse> eligibility(
        @RequestParam String mode, Authentication auth) {
    return ResponseEntity.ok(quizService.checkEligibility((String) auth.getPrincipal(), mode));
}
```

New DTO `EligibilityResponse(boolean allowed)`.

New method on `QuizService`:

```java
public EligibilityResponse checkEligibility(String userId, String mode) {
    User user = userRepo.findById(userId).orElseThrow();
    if (!"guest".equals(user.getProvider())) return new EligibilityResponse(true);

    long played = quizResultRepo.findByUserIdOrderByPlayedAtDesc(userId).stream()
            .filter(r -> mode.equals(r.getMode()))
            .count();
    int limit = "pvp".equals(mode) ? 1 : 5; // solo
    return new EligibilityResponse(played < limit);
}
```

This is the single choke point for both server-tracked limits — even
though solo quiz starts via a plain `POST /quiz/start` call and PvP starts
by connecting straight to the Go matchmaking WebSocket (no Spring call in
between), both flows call this same endpoint *before* doing either of
those things, so the guard logic lives in one place regardless of how the
actual quiz session mechanics differ afterward.

---

## 3. Frontend: where the check happens

`app/(tabs)/quiz.tsx`'s three entry points (PvP Battle, Mixed Quiz, each
per-topic solo button) each call the eligibility endpoint before
navigating, via a small new hook:

```ts
// src/features/quiz/hooks/useQuizEligibility.ts
export function useQuizEligibility() {
  return async (mode: 'solo' | 'pvp'): Promise<boolean> => {
    const { allowed } = await api.get<{ allowed: boolean }>(`/quiz/eligibility?mode=${mode}`)
    return allowed
  }
}
```

If `allowed` is `false`, navigate to a new route (`/(quiz)/limit-wall?feature=solo|pvp`)
instead of the quiz/matchmaking screen. If the eligibility call itself
fails (network error), fail open (treat as allowed) — a guest limit isn't
worth blocking the whole app over a flaky request.

The 10-card feed limit is checked client-side only, inside
`(tabs)/index.tsx`/`useFeed`: a counter in `AsyncStorage`
(`factora.guestCardsViewed`, incrementing once per unique card id the
first time it's scrolled into view) is compared against `10` on each
scroll-position update. Once reached, the feed's `FlatList` is replaced
with the same limit-wall component (`feature=cards`), inline rather than
via navigation (the feed is the home tab, not a screen you navigate into).

---

## 4. The limit wall

One new component, `src/features/auth/components/GuestLimitWall.tsx`,
parametrized by which feature triggered it (just changes the copy: "You've
used your free PvP match", "You've played 5 free quizzes", "You've seen
10 free cards"). Single action: **Sign in with Google**. No "continue as
guest" option — per your answer, this is a hard block, and no dismiss path
exists.

---

## 5. Account merge

Tapping the wall's Google button calls a new `useAuth` function that
merges rather than plainly logging in:

```ts
// useAuth.ts
const mergeGuestIntoGoogle = async (): Promise<boolean> => {
  const idToken = await signInWithGoogleNative()
  if (!idToken) return false
  const guestId = store.guestId
  const response = guestId
    ? await api.post<AuthResponse>('/auth/merge', { guestId, idToken })
    : await api.post<AuthResponse>('/auth/google', { idToken })
  store.login(response.user, response.jwt)
  await AsyncStorage.removeItem('factora.guestCardsViewed') // fresh account, no more guest caps
  return true
}
```

(Falls back to a plain `/auth/google` call if there's somehow no
`guestId` in the store — shouldn't happen given the wall is only reachable
while logged in as a guest, but keeps the function safe to call generally.)

### Backend: `POST /auth/merge`

```java
@Transactional
public AuthResponse mergeGuestIntoGoogle(String guestId, String idToken) {
    var token = firebaseService.verify(idToken);
    String uid = token.getUid();
    String email = token.getEmail();
    String name = token.getName() != null ? token.getName() : email.split("@")[0];

    User guest = userRepo.findByGuestId(guestId)
            .orElseThrow(() -> new IllegalArgumentException("Unknown guestId"));

    boolean isNewGoogleUser = userRepo.findByFirebaseUid(uid).isEmpty();
    User google = userRepo.findByFirebaseUid(uid).orElseGet(() -> {
        User u = User.builder().firebaseUid(uid).email(email).username(name).provider("google").build();
        User saved = userRepo.save(u);
        profileRepo.save(UserProfile.builder().userId(saved.getId()).build());
        return saved;
    });

    if (isNewGoogleUser) {
        // Brand new Google account — migrate the guest's progress onto it.
        UserProfile guestProfile = profileRepo.findByUserId(guest.getId()).orElse(null);
        if (guestProfile != null) {
            UserProfile googleProfile = profileRepo.findByUserId(google.getId()).orElseThrow();
            googleProfile.setXp(guestProfile.getXp());
            googleProfile.setLevel(guestProfile.getLevel());
            googleProfile.setStreakDays(guestProfile.getStreakDays());
            googleProfile.setLastActive(guestProfile.getLastActive());
            googleProfile.setAccuracy(guestProfile.getAccuracy());
            googleProfile.setSelectedTopics(guestProfile.getSelectedTopics());
            profileRepo.save(googleProfile);
        }
        quizResultRepo.findByUserIdOrderByPlayedAtDesc(guest.getId())
                .forEach(r -> { r.setUserId(google.getId()); quizResultRepo.save(r); });
        cardInteractionRepo.findByUserId(guest.getId())
                .forEach(ci -> { ci.setUserId(google.getId()); cardInteractionRepo.save(ci); });
    }
    // Else: the Google account already had its own progress — it wins,
    // guest data is simply discarded (deleted below either way).

    profileRepo.findByUserId(guest.getId()).ifPresent(profileRepo::delete);
    userRepo.delete(guest);

    String jwt = jwtUtil.generateToken(google.getId(), false);
    return toResponse(google, jwt, false);
}
```

Needs one new repository method, `CardInteractionRepository.findByUserId(String)`
(doesn't exist yet — the repo currently only has lookups scoped to a
specific card).

`AuthController.merge` changes from the current no-op stub to:

```java
@PostMapping("/merge")
public ResponseEntity<AuthResponse> merge(@Valid @RequestBody MergeRequest req) {
    return ResponseEntity.ok(authService.mergeGuestIntoGoogle(req.guestId(), req.idToken()));
}
```

(Return type changes from `Void` to `AuthResponse` — the whole point is
the frontend needs the resulting jwt/user back, same as any other login.)

---

## 6. Testing

- Backend: `QuizService.checkEligibility` — unit tests for guest
  under/at/over each limit, and a google user always allowed regardless of
  count.
- Backend: `AuthService.mergeGuestIntoGoogle` — new-Google-account case
  (progress migrates, guest row gone), existing-Google-account case (guest
  data discarded, Google's own data untouched), unknown-guestId case
  (throws/400).
- Frontend: `useQuizEligibility` — allowed/blocked responses, fail-open on
  network error.
- No isolated test for `GuestLimitWall`/the merge button — thin UI glue,
  covered by the manual pass in `Task 10`-style verification (existing
  project convention for screens, per the earlier P2P wiring plan).

---

## Open questions for plan-writing (not blocking design approval)

- Exact wording of the limit-wall copy per feature — will finalize when
  writing the plan, not a design-level decision.
- Whether `checkEligibility`'s `mode` param should be a Java enum instead
  of a raw String — implementation detail, decide during planning.
