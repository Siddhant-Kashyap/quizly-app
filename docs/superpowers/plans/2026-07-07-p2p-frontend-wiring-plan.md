# Wire Frontend to Real P2P Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully client-side-simulated PvP matchmaking/gameplay in the Expo app with real connections to the already-shipped Go matchmaking + WebSocket gameplay backend.

**Architecture:** Two new React hooks (`useMatchmaking`, `usePvpGameplay`) own the two WebSocket connection lifecycles and translate the wire protocol into state shapes the existing UI already knows how to render — no visual redesign. One small Spring endpoint fills a gap the backend didn't anticipate (opponent display name lookup), and two small fields get added to an already-shipped Go message (total question count, per-question XP) that the reused UI needs but the wire protocol never carried.

**Tech Stack:** Expo/React Native (TypeScript), Zustand, native `WebSocket` (built into RN, no library needed), Spring Boot (Java 21), Go 1.22.

**Spec:** `docs/superpowers/specs/2026-07-07-p2p-frontend-wiring-design.md` (this plan implements it exactly — read it for full rationale on each design decision below).

**Repos involved:** `/home/sid/Work/Quizly/app` (primary, this plan lives here) and `/home/sid/Work/Quizly/service` (two small additions). Both are independent git repos on branch `master`. Commit directly to `master` in both, per explicit user instruction — no branch/worktree needed.

**Running tests while executing this plan:**
- Frontend: `cd app && npx jest` (or `npx jest <path>` for a single file)
- Go: `cd service/go && go test ./... -race`
- Spring: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test` — requires local MongoDB on `localhost:27017` (already running per prior sessions)

---

## Task 1: Go — add `totalQuestions` and `xpReward` to `QUESTION_START`

**Files:**
- Modify: `service/go/internal/ws/game_loop.go`
- Test: `service/go/internal/ws/game_loop_test.go`

The wire protocol currently never sends a session's total question count
or a question's XP value — both needed by frontend UI this plan reuses
unchanged. See spec §1b for full rationale.

- [ ] **Step 1: Write the failing test**

Add to `service/go/internal/ws/game_loop_test.go`:
```go
func TestGameLoop_questionStart_includesTotalQuestionsAndXpReward(t *testing.T) {
	old := questionTimerDuration
	questionTimerDuration = 2 * time.Second
	defer func() { questionTimerDuration = old }()

	s := newTestSession(
		session.Question{ID: "q1", CorrectAnswer: "B", XPReward: 20},
		session.Question{ID: "q2", CorrectAnswer: "A", XPReward: 15},
	)
	fb := &fakeBroadcaster{}
	loop := NewGameLoop(s, fb, func(p map[string]interface{}) {})

	done := make(chan struct{})
	go func() { loop.Run(); close(done) }()

	time.Sleep(20 * time.Millisecond)
	start := fb.find("QUESTION_START")
	if start == nil {
		t.Fatal("expected a QUESTION_START message")
	}
	if start["totalQuestions"] != float64(2) {
		t.Errorf("expected totalQuestions=2, got %v", start["totalQuestions"])
	}
	question, ok := start["question"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected question to be an object, got %v", start["question"])
	}
	if question["xpReward"] != float64(20) {
		t.Errorf("expected question.xpReward=20, got %v", question["xpReward"])
	}

	// Finish the session so the test's goroutine doesn't leak past this test.
	loop.SubmitAnswer("playerA", "q1", "B")
	loop.SubmitAnswer("playerB", "q1", "A")
	time.Sleep(20 * time.Millisecond)
	loop.SubmitAnswer("playerA", "q2", "B")
	loop.SubmitAnswer("playerB", "q2", "A")
	waitForDone(t, done)
}
```
(JSON numbers decode into `float64` via `encoding/json` into `map[string]interface{}` — matches the pattern `fakeBroadcaster.Send` already uses for every other test in this file, just not previously exercised for a numeric field.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd service/go && go test ./internal/ws/... -run TestGameLoop_questionStart_includesTotalQuestionsAndXpReward -v`
Expected: FAIL — `start["totalQuestions"]` is `nil` (field doesn't exist yet), `question["xpReward"]` is `nil`.

- [ ] **Step 3: Add both fields**

In `service/go/internal/ws/game_loop.go`, replace:
```go
type wsQuestion struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"`
	Text    string   `json:"text"`
	Options []string `json:"options"`
}

type questionStartMsg struct {
	Type           string     `json:"type"`
	Question       wsQuestion `json:"question"`
	QuestionNumber int        `json:"questionNumber"`
	TimerSeconds   int        `json:"timerSeconds"`
}
```
with:
```go
type wsQuestion struct {
	ID       string   `json:"id"`
	Type     string   `json:"type"`
	Text     string   `json:"text"`
	Options  []string `json:"options"`
	XPReward int      `json:"xpReward"`
}

type questionStartMsg struct {
	Type           string     `json:"type"`
	Question       wsQuestion `json:"question"`
	QuestionNumber int        `json:"questionNumber"`
	TotalQuestions int        `json:"totalQuestions"`
	TimerSeconds   int        `json:"timerSeconds"`
}
```

Then in `broadcastQuestionStart`, replace:
```go
func (g *GameLoop) broadcastQuestionStart(q *session.Question, questionNumber int) {
	g.broadcast(questionStartMsg{
		Type:           "QUESTION_START",
		Question:       wsQuestion{ID: q.ID, Type: q.Type, Text: q.Text, Options: q.Options},
		QuestionNumber: questionNumber,
		TimerSeconds:   int(questionTimerDuration.Seconds()),
	})
}
```
with:
```go
func (g *GameLoop) broadcastQuestionStart(q *session.Question, questionNumber int) {
	g.broadcast(questionStartMsg{
		Type:           "QUESTION_START",
		Question:       wsQuestion{ID: q.ID, Type: q.Type, Text: q.Text, Options: q.Options, XPReward: q.XPReward},
		QuestionNumber: questionNumber,
		TotalQuestions: len(g.session.Questions),
		TimerSeconds:   int(questionTimerDuration.Seconds()),
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd service/go && go test ./internal/ws/... -v`
Expected: PASS (all ws package tests, old and new)

Also run with the race detector:
Run: `cd service/go && go test ./internal/ws/... -race`
Expected: PASS, no race warnings

- [ ] **Step 5: Commit**

```bash
cd service
git add go/internal/ws/game_loop.go go/internal/ws/game_loop_test.go
git commit -m "feat: send totalQuestions and per-question xpReward on QUESTION_START"
```

---

## Task 2: Spring — `GET /users/{id}/public-profile`

**Files:**
- Create: `service/spring/src/main/java/com/quizly/user/dto/PublicUserDto.java`
- Modify: `service/spring/src/main/java/com/quizly/user/service/UserService.java`
- Modify: `service/spring/src/main/java/com/quizly/user/controller/UserController.java`
- Modify: `service/spring/src/main/java/com/quizly/shared/exception/GlobalExceptionHandler.java`
- Test: `service/spring/src/test/java/com/quizly/user/UserControllerTest.java` (new)

**Important correction to an earlier draft of this task:** the original
plan claimed throwing `ResponseStatusException` "bypasses
`GlobalExceptionHandler` entirely" — that's wrong for this specific
codebase. `GlobalExceptionHandler` has `@ExceptionHandler(RuntimeException.class)`,
and `ResponseStatusException` **is** a `RuntimeException`, so without an
explicit handler for it, Spring's `@ExceptionHandler` resolution picks
that broad catch-all and forces every `ResponseStatusException` into a
500 — never reaching Spring's own default 404 behavior. Step 4a below
adds the missing explicit handler; without it, Step 6's "404" test would
actually get back a 500.

- [ ] **Step 1: Write the failing tests**

Create `service/spring/src/test/java/com/quizly/user/UserControllerTest.java`:
```java
package com.quizly.user;

import com.quizly.TestTokenHelper;
import com.quizly.user.entity.User;
import com.quizly.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepo;

    private final List<String> createdUserIds = new ArrayList<>();

    @AfterEach
    void cleanup() {
        userRepo.deleteAllById(createdUserIds);
        createdUserIds.clear();
    }

    @Test
    void getPublicProfile_returnsUsernameAndAvatarForExistingUser() throws Exception {
        User user = userRepo.save(User.builder()
                .username("public-profile-test-" + System.currentTimeMillis())
                .provider("guest")
                .build());
        createdUserIds.add(user.getId());

        mockMvc.perform(get("/users/{id}/public-profile", user.getId())
                        .header("Authorization", "Bearer " + TestTokenHelper.guestToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.getId()))
                .andExpect(jsonPath("$.username").value(user.getUsername()));
    }

    @Test
    void getPublicProfile_returns404ForUnknownUser() throws Exception {
        mockMvc.perform(get("/users/{id}/public-profile", "nonexistent-user-id-xyz")
                        .header("Authorization", "Bearer " + TestTokenHelper.guestToken()))
                .andExpect(status().isNotFound());
    }
}
```
(`User.username` has a unique DB constraint — the timestamp suffix avoids
collisions across repeated local test runs, same lesson learned from the
P2P backend plan's Task 12 smoke test polluting the shared local
`quizly.db`. The `@AfterEach` cleanup keeps that file tidy.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn -q -Dtest=UserControllerTest test`
Expected: FAIL — `/users/{id}/public-profile` doesn't exist yet (404 for both tests, but the first test's `jsonPath` assertions on a 404 body will fail too, and neither status matches `isOk()`).

- [ ] **Step 3: Create `PublicUserDto`**

```java
package com.quizly.user.dto;

public record PublicUserDto(String id, String username, String avatarUrl) {}
```

- [ ] **Step 4: Add `getPublicProfile` to `UserService`**

`UserService`'s constructor currently takes 3 params
(`profileRepo, badgeRepo, resultRepo`) — add `UserRepository userRepo` as
a 4th:
```java
private final UserProfileRepository profileRepo;
private final BadgeRepository badgeRepo;
private final QuizResultRepository resultRepo;
private final UserRepository userRepo;

public UserService(UserProfileRepository profileRepo, BadgeRepository badgeRepo,
                    QuizResultRepository resultRepo, UserRepository userRepo) {
    this.profileRepo = profileRepo;
    this.badgeRepo = badgeRepo;
    this.resultRepo = resultRepo;
    this.userRepo = userRepo;
}
```
Add `import com.quizly.user.repository.UserRepository;` and
`import com.quizly.user.dto.PublicUserDto;` and
`import com.quizly.user.entity.User;` (the last one may already be
covered depending on existing imports — check the current file; it isn't,
since `UserService.java` currently only imports `Badge`/`UserProfile`
entities, not `User`).

Add the method (anywhere among the other public methods):
```java
public PublicUserDto getPublicProfile(String userId) {
    User user = userRepo.findById(userId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
    return new PublicUserDto(user.getId(), user.getUsername(), user.getAvatarUrl());
}
```
(Using `ResponseStatusException` directly, not `IllegalArgumentException`
— `GlobalExceptionHandler` only maps that to 400, and "not found" needs to
be a real 404.)

- [ ] **Step 4a: Add an explicit `ResponseStatusException` handler to `GlobalExceptionHandler`**

Without this, the exception thrown in Step 4 would be caught by the
existing broad `@ExceptionHandler(RuntimeException.class)` (since
`ResponseStatusException extends RuntimeException`) and forced into a
500 instead of the intended 404 — Spring picks the *closest matching*
`@ExceptionHandler` method within a class, so adding a method for the
more specific type here is what makes it win over the generic one; no
ordering/priority annotation needed. In
`service/spring/src/main/java/com/quizly/shared/exception/GlobalExceptionHandler.java`,
add (alongside the existing `RuntimeException`/`IllegalArgumentException`
handlers):
```java
@ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
public ResponseEntity<ApiError> handle(org.springframework.web.server.ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode())
            .body(new ApiError(ex.getStatusCode().value(), ex.getReason()));
}
```

- [ ] **Step 5: Wire the controller**

In `UserController.java`, add:
```java
import com.quizly.user.dto.PublicUserDto;
```
and the new endpoint (no `Authentication` param needed — the path
variable is the id being looked up, not the caller's own id, and
`SecurityConfig`'s default `anyRequest().authenticated()` already
requires a valid JWT for this path with no further permission check
needed, per the spec):
```java
@GetMapping("/users/{id}/public-profile")
public ResponseEntity<PublicUserDto> getPublicProfile(@PathVariable String id) {
    return ResponseEntity.ok(userService.getPublicProfile(id));
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn -q -Dtest=UserControllerTest test`
Expected: PASS

- [ ] **Step 7: Run the full Spring test suite** to make sure nothing else broke (constructor signature changed)

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test`
Expected: all tests PASS (note: `getQuestionsForP2P_all_samplesAcrossRealTopics` in `QuizServiceTest` is a known pre-existing intermittent flake unrelated to this change — if only that one fails, re-run just that test class to confirm it's not a real regression before treating it as a problem)

- [ ] **Step 8: Commit**

```bash
cd service
git add spring/src/main/java/com/quizly/user/dto/PublicUserDto.java \
        spring/src/main/java/com/quizly/user/service/UserService.java \
        spring/src/main/java/com/quizly/user/controller/UserController.java \
        spring/src/main/java/com/quizly/shared/exception/GlobalExceptionHandler.java \
        spring/src/test/java/com/quizly/user/UserControllerTest.java
git commit -m "feat: add GET /users/{id}/public-profile for opponent name lookup"
```

---

## Task 3: Frontend — shared types + WS protocol message types

**Files:**
- Modify: `app/src/shared/types.ts`
- Create: `app/src/features/quiz/hooks/wsProtocol.ts`

No test — pure type definitions, exercised by every subsequent task's
tests via the TypeScript compiler.

- [ ] **Step 1: Add `opponentName` to `QuizSession` and a `PublicUserProfile` type**

In `app/src/shared/types.ts`, change:
```ts
export interface QuizSession {
  sessionId: string
  mode: 'solo' | 'p2p'
  questions?: Question[]
  opponentId?: string
  wsUrl?: string | null
}
```
to:
```ts
export interface QuizSession {
  sessionId: string
  mode: 'solo' | 'p2p'
  questions?: Question[]
  opponentId?: string
  opponentName?: string
  wsUrl?: string | null
}
```
Add a new type (matches the Spring `PublicUserDto` shape exactly):
```ts
export interface PublicUserProfile {
  id: string
  username: string
  avatarUrl: string | null
}
```

- [ ] **Step 2: Create the WS message type definitions**

Create `app/src/features/quiz/hooks/wsProtocol.ts`:
```ts
// Shared message shapes for both WebSocket connections this feature uses
// (matchmaking and gameplay). Field names/shapes match the Go backend's
// wire format exactly — see service/go/internal/ws/game_loop.go and
// service/go/internal/match/matchmaker.go.

export interface MatchFoundMessage {
  type: 'MATCH_FOUND'
  sessionId: string
  opponentId: string
  wsUrl: string
}

export interface QuestionStartMessage {
  type: 'QUESTION_START'
  question: { id: string; type: string; text: string; options: string[]; xpReward: number }
  questionNumber: number
  totalQuestions: number
  timerSeconds: number
}

export interface QuestionResultMessage {
  type: 'QUESTION_RESULT'
  winnerId: string
  correctAnswer: string
  scores: Record<string, number>
  combos: Record<string, number>
}

export interface SessionEndMessage {
  type: 'SESSION_END'
  winnerId: string
  scores: Record<string, number>
  xpEarned: Record<string, number>
}

export interface PlayerDisconnectedMessage {
  type: 'PLAYER_DISCONNECTED'
  playerId: string
}

export type GameplayMessage =
  | QuestionStartMessage
  | QuestionResultMessage
  | SessionEndMessage
  | PlayerDisconnectedMessage
```

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before (a stray root `index.ts` importing nonexistent `./App`) — no new errors from this change, since nothing consumes these new types yet.

- [ ] **Step 4: Commit**

```bash
cd app
git add src/shared/types.ts src/features/quiz/hooks/wsProtocol.ts
git commit -m "feat: add opponentName field and WS protocol message types"
```

---

## Task 4: Frontend — `useMatchmaking` hook

**Files:**
- Create: `app/src/features/quiz/hooks/useMatchmaking.ts`
- Test: `app/src/features/quiz/hooks/__tests__/useMatchmaking.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `app/src/features/quiz/hooks/__tests__/useMatchmaking.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react-native'
import { useMatchmaking } from '../useMatchmaking'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onclose: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(_data: string) {}
  close() {
    this.closed = true
    this.onclose?.()
  }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  ;(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
})

test('connects to the matchmaking endpoint with playerId and topic', () => {
  renderHook(() => useMatchmaking('science', 'player-1'))
  expect(FakeWebSocket.instances).toHaveLength(1)
  expect(FakeWebSocket.instances[0].url).toContain('playerId=player-1')
  expect(FakeWebSocket.instances[0].url).toContain('topic=science')
})

test('reaches matched status on a MATCH_FOUND message', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]

  act(() => { ws.onopen?.() })
  expect(result.current.status).toBe('waiting')

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({ type: 'MATCH_FOUND', sessionId: 's1', opponentId: 'player-2', wsUrl: 'ws://x' }) })
  })
  expect(result.current.status).toBe('matched')
  expect(result.current.match).toEqual({ type: 'MATCH_FOUND', sessionId: 's1', opponentId: 'player-2', wsUrl: 'ws://x' })
})

test('cancel closes the socket', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]
  act(() => { result.current.cancel() })
  expect(ws.closed).toBe(true)
})

test('surfaces a connection error', () => {
  const { result } = renderHook(() => useMatchmaking('science', 'player-1'))
  const ws = FakeWebSocket.instances[0]
  act(() => { ws.onerror?.(new Error('boom')) })
  expect(result.current.error).toBeTruthy()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest useMatchmaking -v`
Expected: FAIL — `useMatchmaking` module doesn't exist yet (compile error).

- [ ] **Step 3: Implement the hook**

Create `app/src/features/quiz/hooks/useMatchmaking.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { MatchFoundMessage } from './wsProtocol'

export type MatchmakingStatus = 'connecting' | 'waiting' | 'matched' | 'error'

export function useMatchmaking(topic: string, playerId: string | null) {
  const [status, setStatus] = useState<MatchmakingStatus>('connecting')
  const [match, setMatch] = useState<MatchFoundMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!playerId) return

    const ws = new WebSocket(
      `${process.env.EXPO_PUBLIC_WS_URL}/matchmaking/ws?playerId=${encodeURIComponent(playerId)}&topic=${encodeURIComponent(topic)}`,
    )
    wsRef.current = ws

    ws.onopen = () => setStatus('waiting')
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as MatchFoundMessage
      if (msg.type === 'MATCH_FOUND') {
        setMatch(msg)
        setStatus('matched')
      }
    }
    ws.onerror = () => setError('Failed to connect to matchmaking')
    ws.onclose = () => setStatus((s) => (s === 'matched' ? s : 'error'))

    return () => {
      ws.close()
    }
  }, [topic, playerId])

  const cancel = useCallback(() => {
    wsRef.current?.close()
  }, [])

  return { status, match, error, cancel }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest useMatchmaking -v`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/quiz/hooks/useMatchmaking.ts src/features/quiz/hooks/__tests__/useMatchmaking.test.ts
git commit -m "feat: add useMatchmaking hook for the real matchmaking WebSocket"
```

---

## Task 5: Frontend — `usePvpGameplay` hook

**Files:**
- Create: `app/src/features/quiz/hooks/usePvpGameplay.ts`
- Test: `app/src/features/quiz/hooks/__tests__/usePvpGameplay.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `app/src/features/quiz/hooks/__tests__/usePvpGameplay.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react-native'
import { usePvpGameplay } from '../usePvpGameplay'

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  closed = false

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(data: string) { this.sent.push(data) }
  close() {
    this.closed = true
    this.onclose?.()
  }
}

beforeEach(() => {
  FakeWebSocket.instances = []
  ;(global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket
})

test('connects directly to the given wsUrl', () => {
  renderHook(() => usePvpGameplay('ws://example/ws?sessionId=s1&playerId=me', 'me', 'opp'))
  expect(FakeWebSocket.instances).toHaveLength(1)
  expect(FakeWebSocket.instances[0].url).toBe('ws://example/ws?sessionId=s1&playerId=me')
})

test('QUESTION_START sets question/questionNumber/totalQuestions/timerSeconds', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'QUESTION_START',
      question: { id: 'q1', type: 'mcq', text: 'Q?', options: ['A', 'B'], xpReward: 20 },
      questionNumber: 1,
      totalQuestions: 5,
      timerSeconds: 5,
    }) })
  })

  expect(result.current.question).toEqual({ id: 'q1', type: 'mcq', text: 'Q?', options: ['A', 'B'], xpReward: 20 })
  expect(result.current.questionNumber).toBe(1)
  expect(result.current.totalQuestions).toBe(5)
  expect(result.current.timerSeconds).toBe(5)
  expect(result.current.correctAnswer).toBeNull()
})

test('QUESTION_RESULT derives myScore/opponentScore/myCombo from the keyed maps', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'QUESTION_RESULT',
      winnerId: 'me',
      correctAnswer: 'B',
      scores: { me: 1, opp: 0 },
      combos: { me: 1, opp: 0 },
    }) })
  })

  expect(result.current.correctAnswer).toBe('B')
  expect(result.current.myScore).toBe(1)
  expect(result.current.opponentScore).toBe(0)
  expect(result.current.myCombo).toBe(1)
})

test('SESSION_END sets sessionEnded/winnerId/xpEarned', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({
      type: 'SESSION_END',
      winnerId: 'me',
      scores: { me: 3, opp: 1 },
      xpEarned: { me: 60, opp: 20 },
    }) })
  })

  expect(result.current.sessionEnded).toBe(true)
  expect(result.current.winnerId).toBe('me')
  expect(result.current.myScore).toBe(3)
  expect(result.current.opponentScore).toBe(1)
  expect(result.current.xpEarned).toBe(60)
})

test('submitAnswer sends a well-formed PLAYER_ANSWER message', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => { result.current.submitAnswer('q1', 'B') })

  expect(ws.sent).toHaveLength(1)
  expect(JSON.parse(ws.sent[0])).toEqual({ type: 'PLAYER_ANSWER', questionId: 'q1', answer: 'B' })
})

test('an unexpected close before SESSION_END surfaces an error', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => { ws.onclose?.() })

  expect(result.current.error).toBeTruthy()
  expect(result.current.sessionEnded).toBe(false)
})

test('a close after a clean SESSION_END does not surface an error', () => {
  const { result } = renderHook(() => usePvpGameplay('ws://x', 'me', 'opp'))
  const ws = FakeWebSocket.instances[0]

  act(() => {
    ws.onmessage?.({ data: JSON.stringify({ type: 'SESSION_END', winnerId: '', scores: {}, xpEarned: {} }) })
  })
  act(() => { ws.onclose?.() })

  expect(result.current.error).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest usePvpGameplay -v`
Expected: FAIL — `usePvpGameplay` module doesn't exist yet (compile error).

- [ ] **Step 3: Implement the hook**

Create `app/src/features/quiz/hooks/usePvpGameplay.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { Question } from '@/shared/types'
import { GameplayMessage } from './wsProtocol'

interface PvpGameplayState {
  question: Question | null
  questionNumber: number
  totalQuestions: number
  timerSeconds: number
  myScore: number
  opponentScore: number
  myCombo: number
  correctAnswer: string | null
  sessionEnded: boolean
  winnerId: string
  xpEarned: number
  error: string | null
}

const initialState: PvpGameplayState = {
  question: null,
  questionNumber: 0,
  totalQuestions: 0,
  timerSeconds: 0,
  myScore: 0,
  opponentScore: 0,
  myCombo: 0,
  correctAnswer: null,
  sessionEnded: false,
  winnerId: '',
  xpEarned: 0,
  error: null,
}

export function usePvpGameplay(wsUrl: string | null, myPlayerId: string, opponentId: string) {
  const [state, setState] = useState<PvpGameplayState>(initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const endedCleanlyRef = useRef(false)

  useEffect(() => {
    if (!wsUrl) return

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as GameplayMessage
      switch (msg.type) {
        case 'QUESTION_START':
          setState((s) => ({
            ...s,
            question: {
              id: msg.question.id,
              type: msg.question.type,
              text: msg.question.text,
              options: msg.question.options,
              xpReward: msg.question.xpReward,
            },
            questionNumber: msg.questionNumber,
            totalQuestions: msg.totalQuestions,
            timerSeconds: msg.timerSeconds,
            correctAnswer: null,
          }))
          break
        case 'QUESTION_RESULT':
          setState((s) => ({
            ...s,
            correctAnswer: msg.correctAnswer,
            myScore: msg.scores[myPlayerId] ?? s.myScore,
            opponentScore: msg.scores[opponentId] ?? s.opponentScore,
            myCombo: msg.combos[myPlayerId] ?? s.myCombo,
          }))
          break
        case 'SESSION_END':
          endedCleanlyRef.current = true
          setState((s) => ({
            ...s,
            sessionEnded: true,
            winnerId: msg.winnerId,
            myScore: msg.scores[myPlayerId] ?? s.myScore,
            opponentScore: msg.scores[opponentId] ?? s.opponentScore,
            xpEarned: msg.xpEarned[myPlayerId] ?? s.xpEarned,
          }))
          break
        case 'PLAYER_DISCONNECTED':
          // No dedicated UI state — SESSION_END always follows immediately.
          break
      }
    }
    ws.onerror = () => setState((s) => ({ ...s, error: 'Connection error' }))
    ws.onclose = () => {
      if (!endedCleanlyRef.current) {
        setState((s) => ({ ...s, error: s.error ?? 'Connection closed unexpectedly' }))
      }
    }

    return () => {
      ws.close()
    }
  }, [wsUrl, myPlayerId, opponentId])

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'PLAYER_ANSWER', questionId, answer }))
  }, [])

  return { ...state, submitAnswer }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest usePvpGameplay -v`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/quiz/hooks/usePvpGameplay.ts src/features/quiz/hooks/__tests__/usePvpGameplay.test.ts
git commit -m "feat: add usePvpGameplay hook for the real gameplay WebSocket"
```

---

## Task 6: Frontend — store changes (`setPvpResult`, `winnerId`)

**Files:**
- Modify: `app/src/features/quiz/store.ts`
- Test: `app/src/features/quiz/__tests__/store.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `app/src/features/quiz/__tests__/store.test.ts`:
```ts
test('setPvpResult sets score/opponentScore/xpEarned/winnerId directly', () => {
  useQuizStore.getState().setPvpResult(3, 1, 60, 'me')
  const s = useQuizStore.getState()
  expect(s.score).toBe(3)
  expect(s.opponentScore).toBe(1)
  expect(s.xpEarned).toBe(60)
  expect(s.winnerId).toBe('me')
})

test('endSession resets winnerId back to empty string', () => {
  useQuizStore.getState().setPvpResult(3, 1, 60, 'me')
  useQuizStore.getState().endSession()
  expect(useQuizStore.getState().winnerId).toBe('')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx jest features/quiz/__tests__/store -v`
Expected: FAIL — `setPvpResult` doesn't exist on the store (TypeScript/runtime error).

- [ ] **Step 3: Add `winnerId` field and `setPvpResult` setter**

Replace `app/src/features/quiz/store.ts` entirely:
```ts
import { create } from 'zustand'
import { QuizSession } from '@/shared/types'

interface QuizState {
  session: QuizSession | null
  score: number
  combo: number
  comboMax: number
  xpEarned: number
  opponentScore: number
  winnerId: string  // '' means unset/draw
  answers: Record<string, string>  // questionId → answer given
  setSession: (session: QuizSession) => void
  addScore: (points: number) => void
  incrementCombo: () => void
  resetCombo: () => void
  addXP: (xp: number) => void
  addOpponentScore: (points: number) => void
  setPvpResult: (score: number, opponentScore: number, xpEarned: number, winnerId: string) => void
  recordAnswer: (questionId: string, answer: string) => void
  endSession: () => void
}

export const useQuizStore = create<QuizState>()((set, get) => ({
  session: null,
  score: 0,
  combo: 0,
  comboMax: 0,
  xpEarned: 0,
  opponentScore: 0,
  winnerId: '',
  answers: {},
  setSession: (session) => set({ session, score: 0, combo: 0, comboMax: 0, xpEarned: 0, opponentScore: 0, winnerId: '', answers: {} }),
  addScore: (points) => set({ score: get().score + points }),
  incrementCombo: () => set((s) => ({ combo: s.combo + 1, comboMax: Math.max(s.comboMax, s.combo + 1) })),
  resetCombo: () => set({ combo: 0 }),
  addXP: (xp) => set({ xpEarned: get().xpEarned + xp }),
  addOpponentScore: (points) => set({ opponentScore: get().opponentScore + points }),
  setPvpResult: (score, opponentScore, xpEarned, winnerId) => set({ score, opponentScore, xpEarned, winnerId }),
  recordAnswer: (questionId, answer) =>
    set({ answers: { ...get().answers, [questionId]: answer } }),
  endSession: () => set({ session: null, score: 0, combo: 0, comboMax: 0, xpEarned: 0, opponentScore: 0, winnerId: '', answers: {} }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx jest features/quiz/__tests__/store -v`
Expected: PASS (all tests in this file, old and new)

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/quiz/store.ts src/features/quiz/__tests__/store.test.ts
git commit -m "feat: add setPvpResult and winnerId to quiz store"
```

---

## Task 7: Frontend — rewire `matchmaking.tsx`

**Files:**
- Modify: `app/app/(quiz)/matchmaking.tsx`

No new isolated test — this screen is thin glue over `useMatchmaking`
(already tested in Task 4) and the `api` client (already tested
elsewhere). Verified manually in Task 10.

- [ ] **Step 1: Read the current file**

Read `app/app/(quiz)/matchmaking.tsx` to confirm it still matches what
this task assumes (a `pickRandomOpponent()` import, a `useEffect` with a
2200ms `setTimeout`, a `Cancel` button calling `router.back()`).

- [ ] **Step 2: Rewrite the screen**

Replace `app/app/(quiz)/matchmaking.tsx` entirely:
```tsx
import { useEffect } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { Users } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { colors } from '@/shared/theme/colors'
import { useMatchmaking } from '@/features/quiz/hooks/useMatchmaking'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { api } from '@/shared/lib/api'
import { PublicUserProfile } from '@/shared/types'

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(0.6)
  const opacity = useSharedValue(0.6)

  useEffect(() => {
    scale.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
    opacity.value = withRepeat(withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false)
  }, [])

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.iris },
        style,
      ]}
    />
  )
}

export default function Matchmaking() {
  const { topic } = useLocalSearchParams<{ topic: string }>()
  const { user } = useAuth()
  const { status, match, error, cancel } = useMatchmaking(topic, user?.id ?? null)

  useEffect(() => {
    if (status !== 'matched' || !match) return
    let cancelled = false
    api.get<PublicUserProfile>(`/users/${match.opponentId}/public-profile`)
      .then((profile) => {
        if (cancelled) return
        router.replace(
          `/(quiz)/${topic}?mode=pvp&sessionId=${match.sessionId}&opponentId=${match.opponentId}` +
          `&opponentName=${encodeURIComponent(profile.username)}&wsUrl=${encodeURIComponent(match.wsUrl)}`,
        )
      })
    return () => { cancelled = true }
  }, [status, match, topic])

  const handleCancel = () => {
    cancel()
    router.back()
  }

  return (
    <View className="flex-1 bg-void items-center justify-center px-8">
      <View className="items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
        <PulseRing delay={0} size={140} />
        <PulseRing delay={400} size={100} />
        <View className="rounded-full bg-surface2 items-center justify-center" style={{ width: 72, height: 72 }}>
          <Users size={30} color={colors.iris} />
        </View>
      </View>

      <Text variant="title" className="text-white mb-2">
        {status === 'error' ? 'Something went wrong' : 'Finding an opponent…'}
      </Text>
      <Text variant="body" className="text-white/50 text-center mb-10">
        {status === 'error'
          ? (error ?? 'Could not connect to matchmaking. Please try again.')
          : 'Matching you with a random player for a head-to-head battle.'}
      </Text>

      <Button label={status === 'error' ? 'Back' : 'Cancel'} variant="ghost" onPress={handleCancel} />
    </View>
  )
}
```
(No client-side timeout, per the spec's explicit decision — indefinite
wait + Cancel. On `status === 'error'`, the same button just navigates
back instead of also calling `cancel()` on an already-dead socket, which
is harmless either way since `cancel()` is a no-op safe to call on a
closed `WebSocket`.)

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before, no new ones.

- [ ] **Step 4: Commit**

```bash
cd app
git add "app/(quiz)/matchmaking.tsx"
git commit -m "feat: wire matchmaking screen to the real matchmaking WebSocket"
```

---

## Task 8: Frontend — rewire `(quiz)/[id].tsx` pvp branch + `reward.tsx`

**Files:**
- Modify: `app/app/(quiz)/[id].tsx`
- Modify: `app/app/reward.tsx`

No new isolated test — covered by Task 5's hook tests plus manual
verification in Task 10 (this is UI glue, and the existing project has
no component-level tests for this screen to extend).

- [ ] **Step 1: Read both current files**

Confirm they still match what this task assumes — in particular
`[id].tsx`'s pvp branch currently uses `startP2P`/the `Math.random()`
opponent-simulation `useEffect`/`PVP_QUESTION_SECONDS` constant, and
`reward.tsx`'s outcome derivation currently compares `score`/`opponentScore`
directly with no `winnerId` involved.

- [ ] **Step 2: Rewrite `(quiz)/[id].tsx`**

Replace the whole file:
```tsx
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, Avatar, Skeleton } from '@/shared/components'
import { QuestionCard } from '@/features/quiz/components/QuestionCard'
import { AnswerOption, AnswerState } from '@/features/quiz/components/AnswerOption'
import { Timer } from '@/features/quiz/components/Timer'
import { useQuizSession } from '@/features/quiz/hooks/useQuizSession'
import { usePvpGameplay } from '@/features/quiz/hooks/usePvpGameplay'
import { useQuizStore } from '@/features/quiz/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { colors } from '@/shared/theme/colors'

const LETTERS = ['A', 'B', 'C', 'D']

function PlayerRing({ name, color, sub }: { name: string; color: string; sub: string }) {
  return (
    <View className="items-center">
      <View
        className="rounded-full items-center justify-center"
        style={{ width: 60, height: 60, borderWidth: 2, borderColor: color }}
      >
        <Avatar name={name} size={50} />
      </View>
      <Text variant="heading" className="text-white mt-2">{name}</Text>
      <Text variant="caption" className="text-white/40">{sub}</Text>
    </View>
  )
}

function SoloQuizPlay({ id }: { id: string }) {
  const { startSolo, submitAnswer, finishSolo, session, score, combo, recordAnswer, addScore, addXP, incrementCombo, resetCombo } = useQuizSession()
  const haptics = useHaptics()

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null)

  useEffect(() => {
    startSolo(id)
  }, [id])

  const questions = session?.questions ?? []
  const question = questions[index]

  const finishQuiz = async () => {
    const state = useQuizStore.getState()
    if (state.session) {
      const totalAnswered = Object.keys(state.answers).length
      const accuracy = totalAnswered > 0 ? state.score / (totalAnswered * 10) : 0
      try {
        await finishSolo(state.session.sessionId, state.score, state.xpEarned, state.comboMax, accuracy)
      } catch {
        // Best-effort — don't block showing the reward screen on a network failure.
      }
    }
    router.replace('/reward')
  }

  const handleAnswer = async (answer: string) => {
    if (!question || selected) return
    setSelected(answer)
    const result = await submitAnswer(session!.sessionId, question.id, answer, 'solo')
    setCorrectAnswer(result.correctAnswer)
    recordAnswer(question.id, answer)

    if (result.isCorrect) {
      haptics.success()
      addScore(10)
      addXP(result.xpEarned)
      incrementCombo()
    } else {
      haptics.error()
      resetCombo()
    }

    setTimeout(() => {
      if (index + 1 >= questions.length) {
        finishQuiz()
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
        setCorrectAnswer(null)
      }
    }, 1200)
  }

  if (!session || !question) {
    return (
      <View className="flex-1 bg-void px-6 pt-20" style={{ gap: 16 }}>
        <Skeleton height={100} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    )
  }

  const optionState = (option: string): AnswerState => {
    if (!selected) return 'default'
    if (option === correctAnswer) return 'correct'
    if (option === selected && option !== correctAnswer) return 'incorrect'
    return 'default'
  }

  const options = question.options ?? ['True', 'False']

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <View className="items-center mb-6">
        <View
          className="rounded-full items-center justify-center bg-surface2"
          style={{ width: 64, height: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text variant="title" className="text-white">{String(score).padStart(2, '0')}</Text>
        </View>
      </View>

      {combo > 1 && (
        <View className="self-center rounded-full px-4 py-1 mb-4 bg-fuchsia/20">
          <Text variant="heading" style={{ color: colors.fuchsia }}>⚡ x{combo} combo</Text>
        </View>
      )}

      <QuestionCard question={question} index={index} total={questions.length} />

      <View className="mt-6">
        {options.map((option, i) => (
          <AnswerOption
            key={option}
            label={option}
            letter={LETTERS[i] ?? `${i + 1}`}
            state={optionState(option)}
            disabled={!!selected}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between mt-auto pb-6">
        <Text variant="caption" className="text-cyan">⚡ +{question.xpReward} XP if correct</Text>
        <View className="flex-row" style={{ gap: 6 }}>
          {questions.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: i <= index ? colors.cyan : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

function PvpQuizPlay({ sessionId, opponentId, opponentName, wsUrl }: { sessionId: string; opponentId: string; opponentName: string; wsUrl: string }) {
  const { user } = useAuth()
  const haptics = useHaptics()
  const setSession = useQuizStore((s) => s.setSession)
  const setPvpResult = useQuizStore((s) => s.setPvpResult)
  const {
    question, questionNumber, totalQuestions, timerSeconds,
    myScore, opponentScore, myCombo, correctAnswer, sessionEnded, winnerId, xpEarned,
    submitAnswer,
  } = usePvpGameplay(wsUrl, user!.id, opponentId)

  const [selected, setSelected] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    // reward.tsx reads session.mode/opponentName from the store — nothing
    // else populates it for the pvp path (solo's useQuizSession.startSolo
    // does this for solo via its own setSession call), so this screen has
    // to set it itself, once, on mount.
    setSession({ sessionId, mode: 'p2p', opponentId, opponentName, wsUrl })
  }, [sessionId, opponentId, opponentName, wsUrl, setSession])

  useEffect(() => {
    // A new question arriving resets per-question local UI state.
    setSelected(null)
    setExpired(false)
  }, [question?.id])

  useEffect(() => {
    if (!sessionEnded) return
    setPvpResult(myScore, opponentScore, xpEarned, winnerId)
    router.replace('/reward')
  }, [sessionEnded])

  const handleAnswer = (answer: string) => {
    if (!question || selected || expired) return
    setSelected(answer)
    submitAnswer(question.id, answer)
    // No synchronous result here, unlike solo mode — correctness feedback
    // arrives asynchronously via the QUESTION_RESULT message updating
    // `correctAnswer` above, which the haptics useEffect below reacts to.
  }

  useEffect(() => {
    if (correctAnswer === null || !selected) return
    if (selected === correctAnswer) haptics.success()
    else haptics.error()
  }, [correctAnswer])

  if (!question) {
    return (
      <View className="flex-1 bg-void px-6 pt-20" style={{ gap: 16 }}>
        <Skeleton height={100} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </View>
    )
  }

  const optionState = (option: string): AnswerState => {
    if (!selected && correctAnswer === null) return 'default'
    if (option === correctAnswer) return 'correct'
    if (option === selected && option !== correctAnswer) return 'incorrect'
    return 'default'
  }

  const options = question.options ?? ['True', 'False']

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <View className="flex-row items-center justify-between mb-6">
        <PlayerRing name="You" color={colors.cyan} sub={`${questionNumber} of ${totalQuestions}`} />

        <View
          className="rounded-full items-center justify-center bg-surface2"
          style={{ width: 56, height: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text variant="title" className="text-white">{String(myScore).padStart(2, '0')}</Text>
        </View>

        <PlayerRing name={opponentName} color={colors.fuchsia} sub={`Score ${opponentScore}`} />
      </View>

      <View className="mb-4">
        <Timer key={question.id} duration={timerSeconds} isPaused={!!selected || expired} onExpire={() => setExpired(true)} />
      </View>

      {myCombo > 1 && (
        <View className="self-center rounded-full px-4 py-1 mb-4 bg-fuchsia/20">
          <Text variant="heading" style={{ color: colors.fuchsia }}>⚡ x{myCombo} combo</Text>
        </View>
      )}

      <QuestionCard question={question} index={questionNumber - 1} total={totalQuestions} />

      <View className="mt-6">
        {options.map((option, i) => (
          <AnswerOption
            key={option}
            label={option}
            letter={LETTERS[i] ?? `${i + 1}`}
            state={optionState(option)}
            disabled={!!selected || expired}
            onPress={() => handleAnswer(option)}
          />
        ))}
      </View>

      <View className="flex-row items-center justify-between mt-auto pb-6">
        <Text variant="caption" className="text-cyan">⚡ +{question.xpReward} XP if correct</Text>
        <View className="flex-row" style={{ gap: 6 }}>
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{ width: 6, height: 6, backgroundColor: i <= questionNumber - 1 ? colors.cyan : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

export default function QuizPlay() {
  const { id, mode, sessionId, opponentId, opponentName, wsUrl } = useLocalSearchParams<{
    id: string; mode?: string; sessionId?: string; opponentId?: string; opponentName?: string; wsUrl?: string
  }>()
  const isPvp = mode === 'pvp'

  if (isPvp) {
    if (!sessionId || !opponentId || !wsUrl) {
      // Missing required pvp params — nothing sensible to render.
      return (
        <View className="flex-1 bg-void px-6 pt-20" style={{ gap: 16 }}>
          <Skeleton height={100} />
        </View>
      )
    }
    return (
      <PvpQuizPlay
        sessionId={sessionId}
        opponentId={opponentId}
        opponentName={opponentName ?? 'Opponent'}
        wsUrl={wsUrl}
      />
    )
  }

  return <SoloQuizPlay id={id} />
}
```

**Why this got split into `SoloQuizPlay`/`PvpQuizPlay`.** The original
single component branched on `isPvp` throughout with two increasingly
different state-management models sharing one function body (solo:
`useQuizSession` + local `index`/`setTimeout` pacing; pvp: a dedicated WS
hook + server-driven pacing). Splitting into two focused components (one
per mode, sharing only `PlayerRing`) is more in keeping with "one clear
responsibility per unit" than continuing to grow one function with two
increasingly unrelated branches — this is the kind of file-structure call
the plan is supposed to lock in up front, not an unrelated refactor: the
solo branch's code is **unchanged**, just moved into its own function.

- [ ] **Step 3: Update `reward.tsx`'s outcome derivation**

In `app/app/reward.tsx`, replace:
```ts
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, Frown, Handshake } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useQuizStore } from '@/features/quiz/store'
import { colors, gradients } from '@/shared/theme/colors'

export default function Reward() {
  const { session, score, xpEarned, opponentScore, answers, endSession } = useQuizStore()
  const totalAnswered = Object.keys(answers).length
  const correctCount = score / 10
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  const isPvp = session?.mode === 'p2p'
  const opponentName = session?.opponentId ?? 'Opponent'
  const outcome = score > opponentScore ? 'win' : score < opponentScore ? 'lose' : 'draw'
```
with:
```ts
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Trophy, Frown, Handshake } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useQuizStore } from '@/features/quiz/store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

export default function Reward() {
  const { session, score, xpEarned, opponentScore, winnerId, answers, endSession } = useQuizStore()
  const { user } = useAuth()
  const totalAnswered = Object.keys(answers).length
  const correctCount = score / 10
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0

  const isPvp = session?.mode === 'p2p'
  const opponentName = session?.opponentName ?? 'Opponent'
  const outcome = winnerId === user?.id ? 'win' : winnerId === '' ? 'draw' : 'lose'
```
(Rest of the file — the `OUTCOME_COPY` map, JSX, `handleDone` — is
unchanged; only the outcome derivation and `opponentName` source change,
per the spec's rationale: comparing scores alone gives the wrong answer
for a disconnect-as-forfeit ending, where the surviving player wins
regardless of their score.)

- [ ] **Step 4: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before, no new ones.

- [ ] **Step 5: Commit**

```bash
cd app
git add "app/(quiz)/[id].tsx" app/reward.tsx
git commit -m "feat: wire pvp gameplay screen to the real gameplay WebSocket"
```

---

## Task 9: Frontend — delete dead mock-pvp code

**Files:**
- Modify: `app/src/features/quiz/hooks/useQuizSession.ts`
- Modify: `app/src/shared/lib/mockData.ts`

No test — pure deletion of code nothing calls anymore after Task 8.
Verified by the typecheck/test run in Step 3 below (if anything still
referenced the deleted exports, this would fail to compile).

- [ ] **Step 1: Delete `startP2P` and the pvp branch of `submitAnswer` from `useQuizSession.ts`**

Replace `app/src/features/quiz/hooks/useQuizSession.ts` entirely:
```ts
import { QuizSession, QuizAnswer, StartQuizResponse, AnswerResponse, Topic } from '@/shared/types'
import { useQuizStore } from '../store'
import { api } from '@/shared/lib/api'

// The backend has no "all topics" concept — POST /quiz/start does an exact
// topic match (see service/docs/API.md §2/§4). To keep the "Mixed Quiz"
// experience, start a session per real topic and merge the questions
// client-side, keeping one of the returned sessionIds to submit
// answers/results against (sessionId isn't validated against server-side
// session state today — see API.md §2 AnswerRequest note).
async function startSoloAllTopics(): Promise<StartQuizResponse> {
  const topics = await api.get<Topic[]>('/topics')
  const responses = await Promise.all(
    topics.map((t) => api.post<StartQuizResponse>('/quiz/start', { topic: t.slug, mode: 'solo' })),
  )
  const questions = responses.flatMap((r) => r.questions).sort(() => Math.random() - 0.5).slice(0, 6)
  return { sessionId: responses[0].sessionId, mode: 'solo', questions, wsUrl: null }
}

export function useQuizSession() {
  const store = useQuizStore()

  const startSolo = async (topic: string): Promise<QuizSession> => {
    const response = topic === 'all'
      ? await startSoloAllTopics()
      : await api.post<StartQuizResponse>('/quiz/start', { topic, mode: 'solo' })
    const session: QuizSession = { sessionId: response.sessionId, mode: 'solo', questions: response.questions }
    store.setSession(session)
    return session
  }

  const submitAnswer = async (sessionId: string, questionId: string, answer: string, mode: 'solo'): Promise<QuizAnswer> => {
    const result = await api.post<AnswerResponse>('/quiz/answer', { sessionId, questionId, answer })
    return { questionId, ...result }
  }

  const finishSolo = async (sessionId: string, score: number, xpEarned: number, comboMax: number, accuracy: number) => {
    await api.post('/quiz/solo/result', { sessionId, score, xpEarned, comboMax, accuracy })
  }

  return { startSolo, submitAnswer, finishSolo, ...store }
}
```
(`submitAnswer`'s `mode` parameter is now always `'solo'` — kept as an
explicit parameter rather than dropped entirely, since `SoloQuizPlay`
already calls it that way and changing the call site too is unnecessary
churn for this task. `Question`/`MOCK_QUESTIONS`/`MOCK_ANSWER_KEY` imports
are gone since nothing in this file references them anymore.)

- [ ] **Step 2: Delete `MOCK_QUESTIONS`/`MOCK_ANSWER_KEY`/`MOCK_OPPONENT_NAMES`/`pickRandomOpponent` from `mockData.ts`**

Replace `app/src/shared/lib/mockData.ts` entirely:
```ts
export function mockDelay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

// Onboarding's topic picker runs before login, but GET /topics requires a
// JWT — there's no authenticated way to fetch real topics at that point in
// the flow. This static list mirrors the backend seed data (see
// service/docs/API.md §1) purely so onboarding has something to show;
// everywhere else in the app fetches topics from the real API.
export const ONBOARDING_TOPICS = [
  { slug: 'science', label: 'Science', iconUrl: 'Atom', cardCount: 42 },
  { slug: 'history', label: 'History', iconUrl: 'Landmark', cardCount: 35 },
  { slug: 'space', label: 'Space', iconUrl: 'Rocket', cardCount: 28 },
  { slug: 'tech', label: 'Tech', iconUrl: 'Cpu', cardCount: 31 },
  { slug: 'nature', label: 'Nature', iconUrl: 'Leaf', cardCount: 24 },
  { slug: 'pop-culture', label: 'Pop Culture', iconUrl: 'Film', cardCount: 19 },
]
```
(`mockDelay` is kept — check Step 3 below for whether anything still
uses it before assuming it's fully dead.)

- [ ] **Step 3: Confirm nothing else references the deleted exports**

Run: `cd app && grep -rn "MOCK_QUESTIONS\|MOCK_ANSWER_KEY\|MOCK_OPPONENT_NAMES\|pickRandomOpponent\|questionsForTopic\|startP2P" src app --include="*.ts" --include="*.tsx"`
Expected: no matches. If `mockDelay` also turns out to have zero
remaining call sites when you check
`grep -rn "mockDelay" src app --include="*.ts" --include="*.tsx"`, remove
it too rather than leaving unused exported dead code — check this
explicitly rather than assuming either way.

- [ ] **Step 4: Typecheck and run the full test suite**

Run: `cd app && npx tsc --noEmit && npx jest`
Expected: typecheck shows the same single pre-existing unrelated error
as before (nothing new); all tests pass.

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/quiz/hooks/useQuizSession.ts src/shared/lib/mockData.ts
git commit -m "chore: delete dead mock-pvp code now that pvp uses the real backend"
```

---

## Task 10: Manual end-to-end verification

**Files:** none — verification only, no code changes.

- [ ] **Step 1: Start all three services**

MongoDB should already be running on `localhost:27017`. Start Spring and Go:
```bash
cd service/spring && SPRING_PROFILES_ACTIVE=local mvn spring-boot:run
```
```bash
cd service/go && SPRING_BASE_URL=http://localhost:8080 INTERNAL_SECRET=internal-secret-placeholder go run ./cmd/server
```
Confirm both start cleanly (Spring on 8080, Go logs
`Go quiz service starting on :8081`).

- [ ] **Step 2: Start the Expo app**

```bash
cd app && npx expo start
```
Open on an Android emulator (matches the `10.0.2.2` addresses already
configured in `.env.local`) or a physical device on the same network with
`EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WS_URL` adjusted to the host machine's
LAN IP if not using an emulator.

- [ ] **Step 3: Log in and reach the PvP flow**

Go through onboarding/guest login if needed, then from the Quiz Hub tap
"PvP Battle". Confirm the matchmaking screen appears with the existing
pulse-ring animation and now waits indefinitely (no more fixed 2.2s).

- [ ] **Step 4: Simulate a second player from a script**

Since one Expo app instance can't provide two independent connections,
write a small throwaway Node script (Node 23+ has a native `WebSocket`
global, no install needed) mirroring the backend's own Task 12 smoke
test, e.g. in the scratchpad directory:
```js
// matchmaking-and-play.mjs
const playerId = process.argv[2] ?? 'script-player'
const topic = process.argv[3] ?? 'all'

const mm = new WebSocket(`ws://localhost:8081/matchmaking/ws?playerId=${playerId}&topic=${topic}`)
mm.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  console.log('[matchmaking]', msg)
  if (msg.type === 'MATCH_FOUND') {
    const game = new WebSocket(msg.wsUrl)
    game.onmessage = (ev) => {
      const gm = JSON.parse(ev.data)
      console.log('[gameplay]', gm)
      if (gm.type === 'QUESTION_START') {
        // Answer with the first option after a short delay, just to progress the game.
        setTimeout(() => {
          game.send(JSON.stringify({ type: 'PLAYER_ANSWER', questionId: gm.question.id, answer: gm.question.options?.[0] ?? 'True' }))
        }, 500)
      }
    }
  }
}
```
Run it with the real authenticated user id the *app* is logged in as
one side, and this script as the other:
```bash
node matchmaking-and-play.mjs <a-different-real-guest-user-id> all
```
(Get a second real guest user id via `POST /auth/guest` with a distinct
`guestId` first, same approach as the backend plan's own Task 12.)

- [ ] **Step 5: Confirm the app's UI updates correctly**

Once the script connects and both are queued for the same topic, the
app should immediately transition from "Finding an opponent…" into
gameplay, showing the opponent's real username (from the new
`/users/{id}/public-profile` lookup) instead of a bot name, the correct
`questionNumber`/`totalQuestions` (matching what the script logs), a
live-updating timer, and score badges that update once `QUESTION_RESULT`
arrives. Answer at least one question through the app's UI and confirm
the script's log shows the corresponding `QUESTION_RESULT` message.

- [ ] **Step 6: Let the match finish, confirm the reward screen**

Let all questions play out (or kill the script mid-match to test the
disconnect path instead). Confirm the app navigates to the reward screen
showing the correct win/lose/draw outcome (cross-check against the
script's logged final `SESSION_END.winnerId`) and the opponent's real
name, not a UUID or "Bot".

- [ ] **Step 7: Report results**

Note any bugs or unexpected behavior found — this step doesn't get
committed, it's just closing the loop with whoever's driving execution.
Stop and report rather than silently working around anything that looks
like a real bug in the implementation (not a test-script issue).
