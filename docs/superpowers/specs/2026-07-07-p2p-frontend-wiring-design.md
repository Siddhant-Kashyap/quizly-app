# Wire Frontend to the Real P2P Backend — Design

**Date:** 2026-07-07
**Status:** Draft (pending spec review)
**Location:** `/home/sid/Work/Quizly/app/` (frontend), one small addition in `/home/sid/Work/Quizly/service/spring/` (backend)

---

## Overview

The Go P2P quiz backend (matchmaking + WebSocket gameplay protocol) was
just built and verified end-to-end at the protocol level — see
`service/docs/superpowers/plans/2026-07-07-p2p-matchmaking-and-ws-protocol-plan.md`.
The frontend's PvP experience (`app/(quiz)/matchmaking.tsx`,
`app/(quiz)/[id].tsx`'s pvp branch) is still fully client-side simulated:
matchmaking is a fake 2.2s timer that assigns a random bot name, and the
"opponent" during gameplay is a `Math.random()`-driven local timer, not a
real second player.

This spec covers wiring the real thing: connecting to the actual
matchmaking WebSocket, connecting to the actual gameplay WebSocket, and
rendering the real protocol messages (`MATCH_FOUND`, `QUESTION_START`,
`QUESTION_RESULT`, `SESSION_END`, `PLAYER_DISCONNECTED`) instead of
anything simulated. Solo quiz mode (already wired to the real REST API in
an earlier pass) is untouched.

One backend gap surfaced during design: `MATCH_FOUND` only carries a raw
opponent user ID, with no display name or avatar available anywhere. This
spec adds a small Spring endpoint to look that up, per explicit user
decision (rather than showing a raw UUID or a generic "Opponent" label).

### In scope
- A new Spring endpoint: `GET /users/{id}/public-profile`
- `useMatchmaking` hook — owns the `/matchmaking/ws` connection lifecycle
- `usePvpGameplay` hook — owns the real `/ws` gameplay connection, translates
  the wire protocol into the same shape the existing UI already reads
- Rewiring `matchmaking.tsx` and `(quiz)/[id].tsx`'s pvp branch to use both
- Deleting the now-dead mock-pvp code in `useQuizSession`/`mockData.ts`
- Unit tests for both new hooks; one manual end-to-end pass

### Explicitly out of scope
- Reconnection logic (backend has "no reconnection window" by design —
  client matches that: a dropped connection just ends the game, no retry)
- A client-side matchmaking timeout (backend has none in v1 either)
- Any topic-selection UI for PvP (already hardcoded to `topic=all` via
  `quiz.tsx`'s "PvP Battle" button — unchanged)
- Solo quiz mode (already wired, not touched by this spec)

---

## 1. Backend: opponent public-profile lookup

New endpoint in the existing `UserController`
(`spring/src/main/java/com/quizly/user/controller/UserController.java`,
which currently has `GET /profile`, `PATCH /profile`,
`POST /notifications/register-device`):

```
GET /users/{id}/public-profile
Authorization: Bearer <jwt>   (same as any other endpoint — anyRequest().authenticated()
                                already covers this, no SecurityConfig change needed)
→ 200 OK
{ "id": "...", "username": "...", "avatarUrl": null }
→ 404 if no user with that id exists
```

New minimal DTO (first of its kind in this codebase — the two existing
near-misses, `AuthResponse.UserDto` and `LeaderboardEntry`, both carry
extra fields this shouldn't expose, like `AuthResponse.UserDto`'s
`email`): `PublicUserDto(String id, String username, String avatarUrl)`
in `user/dto/`. Backed by `UserRepository.findById` (already available,
`UserRepository extends JpaRepository<User, String>`). A small
`UserService` method does the lookup + 404-on-empty (`IllegalArgumentException`,
consistent with the rest of the codebase's `GlobalExceptionHandler` →
400... actually a not-found should be 404, not 400 — use
`ResponseStatusException(HttpStatus.NOT_FOUND)` directly, since
`GlobalExceptionHandler` only maps `IllegalArgumentException`→400 and
generic `RuntimeException`→500, neither of which is right for "not
found"). Works identically for guest opponents — `AuthService.loginAsGuest`
already sets a real `username` (`"Guest_xxxxxx"`) for every guest, so a
guest-vs-guest match still gets a real name.

---

## 2. Frontend: matchmaking flow

**New file:** `app/src/features/quiz/hooks/useMatchmaking.ts`

```ts
type MatchmakingStatus = 'connecting' | 'waiting' | 'matched' | 'error'
interface MatchFound { sessionId: string; opponentId: string; wsUrl: string }

function useMatchmaking(topic: string, playerId: string | null): {
  status: MatchmakingStatus
  match: MatchFound | null
  error: string | null
  cancel: () => void
}
```

Connects to `${process.env.EXPO_PUBLIC_WS_URL}/matchmaking/ws?playerId=${playerId}&topic=${topic}`
on mount (that env var already exists in `.env.local`/`.env.example`,
clearly provisioned in anticipation of this). On the socket's `message`
event, parses JSON, expects `{ type: "MATCH_FOUND", sessionId, opponentId, wsUrl }`,
sets `status: 'matched'`. On `error`, sets `status: 'error'`. `cancel()`
closes the socket (which is exactly what makes the server-side
`Matchmaker.Cancel` fire, per the backend's existing design — the
matchmaking handler's read-drain goroutine treats any read error,
including a client-initiated close, as "cancel"). Cleans up (closes the
socket) on unmount if not already matched/errored, so navigating away
mid-wait doesn't leave a dangling queue entry.

**Modified:** `app/app/(quiz)/matchmaking.tsx`

Replace the `pickRandomOpponent()` + `setTimeout` block with
`useMatchmaking(topic, user?.id ?? null)` (real `user.id` from
`useAuth()` — this is the server-assigned UUID from `AuthResponse.user`,
already stored in the auth store for both guest and real accounts, and is
what the backend's `playerId` concept actually means throughout the P2P
system). On `status === 'matched'`, call
`api.get<PublicUserDto>(`/users/${match.opponentId}/public-profile`)`,
then `router.replace(`/(quiz)/${topic}?mode=pvp&sessionId=${match.sessionId}&opponentId=${match.opponentId}&opponentName=${encodeURIComponent(profile.username)}&wsUrl=${encodeURIComponent(match.wsUrl)}`)`.
Cancel button calls `cancel()` then `router.back()`. No timeout — indefinite
wait, matching the backend's own v1 scope, per your explicit answer. On
`status === 'error'`, show a brief error state with a way back (not a
retry loop — keep this simple).

---

## 3. Frontend: gameplay flow

**New file:** `app/src/features/quiz/hooks/usePvpGameplay.ts`

```ts
interface PvpGameplayState {
  question: Question | null
  questionNumber: number
  timerSeconds: number
  myScore: number
  opponentScore: number
  myCombo: number
  correctAnswer: string | null   // set once QUESTION_RESULT arrives for the current question
  sessionEnded: boolean
  winnerId: string               // '' means a draw
  xpEarned: number
  error: string | null
}

function usePvpGameplay(wsUrl: string, myPlayerId: string, opponentId: string): PvpGameplayState & {
  submitAnswer: (questionId: string, answer: string) => void
}
```

Connects to `wsUrl` directly (already a complete, absolute `ws://` URL
handed over by `MATCH_FOUND` — no construction needed on the client side,
unlike the matchmaking URL). Parses each inbound message by `type`:

- `QUESTION_START` → sets `question` (from the message's nested `question`
  object: `id`, `type`, `text`, `options`), `questionNumber`, resets
  `correctAnswer` to null for the new question.
- `QUESTION_RESULT` → sets `correctAnswer`, and derives `myScore`/`opponentScore`/`myCombo`
  from the message's `scores`/`combos` maps (keyed by real player ID) by
  looking up `myPlayerId`/`opponentId` — these are absolute values from
  the server, not deltas, so the hook just sets them directly rather than
  incrementing anything client-side.
- `SESSION_END` → sets `sessionEnded: true`, `winnerId`, final `xpEarned`
  (looked up the same way from the message's `xpEarned` map).
- `PLAYER_DISCONNECTED` → no dedicated UI state; `SESSION_END` always
  follows immediately per the backend's design (disconnect ends the
  session right away), so there's nothing meaningfully different to show
  in between — the hook can just ignore this message type.
- Unexpected socket `error`/`close` (not preceded by a clean `SESSION_END`)
  → sets `error`, matching the "no reconnection window" scope decision.

`submitAnswer(questionId, answer)` sends
`JSON.stringify({ type: 'PLAYER_ANSWER', questionId, answer })` over the
socket. Closes the socket on unmount.

**Modified:** `app/app/(quiz)/[id].tsx`

The pvp branch now reads `sessionId`, `opponentId`, `opponentName`, `wsUrl`
from route params (via `useLocalSearchParams`, decoding `wsUrl`) instead of
just a cosmetic `opponent` name string, and uses
`usePvpGameplay(wsUrl, user.id, opponentId)` instead of
`useQuizSession`'s `startP2P` + the old
`Math.random()`-driven opponent-simulation `useEffect` (deleted — no
longer needed, a real opponent drives their own side of the match).
The existing UI (question card, score badges for "You"/opponent, combo
pill, XP-per-question label, progress dots) is **not visually
redesigned** — it just reads `question`/`myScore`/`opponentScore`/`myCombo`
from the new hook instead of the old simulated state. `handleAnswer` calls
`submitAnswer(question.id, answer)` instead of the solo-mode REST call.
When `sessionEnded` becomes true, the existing quiz store gets one new
setter call (see §4) with the final score/opponentScore/xpEarned/winnerId,
then navigates to `/reward` exactly as today.

`useQuizSession.ts`: delete `startP2P`, the pvp branch of `submitAnswer`,
and the `questionsForTopic` helper — all dead once `[id].tsx` no longer
calls them. `mockData.ts`: delete `MOCK_QUESTIONS`/`MOCK_ANSWER_KEY` (only
consumer was the pvp mock path being removed) — `MOCK_OPPONENT_NAMES`/`pickRandomOpponent`
also become dead and get removed, since real matchmaking replaces the
random-bot-name assignment entirely.

---

## 4. Store changes

`useQuizStore` (`app/src/features/quiz/store.ts`) gets one new setter,
since its existing `addScore(10)`/`addOpponentScore(10)` increment-style
API assumes solo mode's fixed-10-points-per-question convention, which
doesn't apply to pvp's server-authoritative absolute scores:

```ts
setPvpResult: (score: number, opponentScore: number, xpEarned: number) => void
```

Sets those three fields directly (score/opponentScore/xpEarned already
exist on the store; this is a new way to set them, not new fields).
`session.opponentId` already exists on `QuizSession`; add one new optional
field, `opponentName?: string`, set by `[id].tsx` when it receives the
route param, so `reward.tsx`'s existing
`session?.opponentId ?? 'Opponent'` line becomes
`session?.opponentName ?? 'Opponent'` (the only change `reward.tsx`
needs — everything else there already reads `score`/`opponentScore`/`xpEarned`
from the store, unchanged).

---

## 5. Error handling

- Matchmaking socket error before a match → `useMatchmaking`'s `error`
  state → `matchmaking.tsx` shows a brief message with a button back to
  the quiz hub. No retry loop.
- Gameplay socket drops unexpectedly (distinct from the designed
  disconnect-as-forfeit path, which the *surviving* player experiences
  normally via `PLAYER_DISCONNECTED`+`SESSION_END` messages arriving
  over their still-open socket) → `usePvpGameplay`'s `error` state →
  `[id].tsx` shows a minimal error state with a way back to the quiz hub.
  No reconnection attempt, per the explicit scope decision above.

---

## 6. Testing

**Unit tests** for both new hooks, using a small fake `WebSocket` test
double (constructed similarly to the Go backend's `fakeConn`/`fakeBroadcaster`
test doubles from the same overall project) — `jest.setup.ts` doesn't
currently mock `WebSocket` globally, so each test file gets its own
minimal fake with `send`/`close` spies and a way to simulate inbound
`message`/`error`/`close` events. Cover: `useMatchmaking` reaching
`matched` on a `MATCH_FOUND` message, `cancel()` actually closing the
socket, and an `error` event surfacing correctly; `usePvpGameplay`
correctly transitioning through `QUESTION_START`→`QUESTION_RESULT`→
`SESSION_END`, correctly deriving `myScore`/`opponentScore` from the
keyed maps using `myPlayerId`/`opponentId`, and `submitAnswer` sending the
right JSON shape.

**Manual end-to-end verification**: two real WebSocket connections are
needed to see a real match happen, which one Expo app instance alone
can't provide. Drive one side from the running Expo app (Android
emulator or physical device against the already-running Spring+Go
services), and simulate the second player with a small throwaway Node
script (the same pattern used for the backend's own Task 12 smoke test —
connect to `/matchmaking/ws`, then `/ws`, log received messages, send a
scripted `PLAYER_ANSWER`). Confirms the app actually renders each real
message type and sends a well-formed `PLAYER_ANSWER`, not just that the
hooks pass unit tests in isolation.
