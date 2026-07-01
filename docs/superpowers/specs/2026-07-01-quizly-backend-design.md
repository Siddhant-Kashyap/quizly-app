# Quizly — Backend Service Design

**Date:** 2026-07-01
**Status:** Approved
**Location:** `/home/sid/Work/Quizly/service/`

---

## Overview

The Quizly backend is a polyglot, two-service architecture:

- **Spring Boot (Java 21)** — auth, user profiles, feed content, leaderboard, notifications. Port 8080.
- **Go 1.22** — real-time P2P quiz battle engine over WebSockets. Port 8081.

Both services run locally as standalone processes. The folder structure is Docker-ready for future containerisation. A future NGINX reverse proxy (Approach B) can front both services behind a single URL with zero changes to either service's code.

---

## 1. Folder Structure

```
/home/sid/Work/Quizly/service/
  spring/                          # Spring Boot — Java 21
    src/main/java/com/quizly/
      auth/
        controller/                # AuthController (google, guest, merge)
        service/                   # AuthService, FirebaseService
        dto/                       # LoginRequest, AuthResponse
      user/
        controller/                # UserController
        service/                   # UserService
        repository/                # UserRepository, UserProfileRepository (JPA)
        entity/                    # User, UserProfile, Badge, QuizResult
      feed/
        controller/                # FeedController, TopicController
        service/                   # FeedService
        repository/                # FactCardRepository, TopicRepository (MongoDB)
        document/                  # FactCard, Topic (MongoDB documents)
      quiz/
        controller/                # QuizController (session init/end, history)
        service/                   # QuizService (calls Go via REST)
        repository/                # QuizResultRepository (JPA)
        entity/                    # QuizResult
      notification/
        controller/                # NotificationController
        service/                   # NotificationService (OneSignal via OkHttp)
        scheduler/                 # NotificationScheduler (@Scheduled jobs)
        entity/                    # Notification
        repository/                # NotificationRepository (JPA)
      shared/
        config/                    # SecurityConfig, MongoConfig, SQLiteConfig,
                                   # FirebaseConfig, SchedulingConfig
        exception/                 # GlobalExceptionHandler, ApiError
        filter/                    # JwtAuthFilter
        util/                      # JwtUtil
    src/main/resources/
      application.yml              # Base config (structure only, no secrets)
      application-local.yml        # Local secrets and URLs (gitignored)
    pom.xml

  go/                              # Go 1.22 — real-time quiz engine
    cmd/
      server/
        main.go                    # Entry point — starts HTTP + WebSocket server
    internal/
      session/
        session.go                 # Session + Answer structs
        manager.go                 # SessionManager (in-memory, concurrent-safe)
      match/
        matchmaker.go              # P2P pairing logic
      ws/
        hub.go                     # WebSocket hub (broadcast, register, unregister)
        client.go                  # Per-connection client
        handler.go                 # WS upgrade + message dispatch
      api/
        routes.go                  # HTTP route registration
        handler.go                 # REST handlers (called by Spring Boot)
    go.mod
    go.sum

  docker/                          # Future Docker/NGINX (placeholder now)
    docker-compose.yml             # Empty scaffold
    nginx/
      nginx.conf                   # Empty scaffold — ready for Approach B migration
```

---

## 2. Database Design

### SQLite — via Spring Data JPA + Hibernate
Used for structured relational user data requiring ACID guarantees.

```sql
users
  id                UUID (PK)
  email             VARCHAR UNIQUE nullable
  username          VARCHAR UNIQUE
  avatar_url        VARCHAR nullable
  provider          ENUM('google', 'guest')
  firebase_uid      VARCHAR nullable UNIQUE
  guest_id          VARCHAR nullable UNIQUE
  onesignal_player_id VARCHAR nullable
  created_at        TIMESTAMP

user_profiles
  id                UUID (PK)
  user_id           UUID FK → users.id
  xp                INTEGER DEFAULT 0
  level             INTEGER DEFAULT 1
  streak_days       INTEGER DEFAULT 0
  last_active       DATE nullable
  accuracy          DECIMAL(5,2) DEFAULT 0
  rank              INTEGER nullable
  selected_topics   TEXT              -- JSON array, set during onboarding

badges
  id                UUID (PK)
  user_id           UUID FK → users.id
  badge_type        VARCHAR           -- e.g. 'physics_master', '12_day_streak'
  earned_at         TIMESTAMP

quiz_results
  id                UUID (PK)
  user_id           UUID FK → users.id
  session_id        VARCHAR           -- matches Go session ID
  opponent_id       UUID nullable     -- null for solo
  score             INTEGER
  xp_earned         INTEGER
  combo_max         INTEGER
  accuracy          DECIMAL(5,2)
  played_at         TIMESTAMP

notifications
  id                UUID (PK)
  user_id           UUID FK → users.id
  type              VARCHAR           -- 'challenge', 'badge', 'streak', 'rank', 'daily'
  title             VARCHAR
  body              VARCHAR
  is_read           BOOLEAN DEFAULT false
  created_at        TIMESTAMP
```

### MongoDB — via Spring Data MongoDB
Used for content: high-volume, schema-flexible, read-heavy.

```
fact_cards collection
  _id           ObjectId
  topic         String              -- "physics", "space", etc.
  title         String
  body          String
  image_url     String (nullable)
  author        String
  read_time_sec Int
  likes         Int
  saves         Int
  created_at    Date

quiz_questions collection
  _id           ObjectId
  topic         String
  type          String              -- "mcq" | "true_false" | "fill_blank"
  text          String
  options       [String] (nullable) -- MCQ only
  correct_answer String
  xp_reward     Int
  difficulty    String              -- "easy" | "medium" | "hard"

topics collection
  _id           ObjectId
  slug          String              -- "physics"
  label         String              -- "Physics"
  icon_url      String
  card_count    Int                 -- denormalized counter
```

### Go — in-memory only
Go holds no persistent state. Questions are passed in by Spring Boot on session start. Final scores are written back to Spring Boot via REST on session end.

```go
type Session struct {
    ID                 string
    PlayerA            string
    PlayerB            string
    Questions          []Question
    CurrentQuestionIdx int
    QuestionStartedAt  time.Time
    TimerDuration      time.Duration   // 5 * time.Second
    Answers            map[string][]Answer
    Scores             map[string]int  // playerID → score
    Combos             map[string]int  // playerID → current consecutive correct streak
    State              string          // "waiting" | "active" | "finished"
}

// Combo: consecutive correct answers by the same player.
// Resets to 0 on any wrong answer or timer expiry (no answer).
// combo value is broadcast in QUESTION_RESULT for UI display (x2, x3, etc.).

type Question struct {
    ID            string
    Type          string
    Text          string
    Options       []string
    CorrectAnswer string
    XPReward      int
}

type Answer struct {
    PlayerID    string
    Value       string
    AnsweredAt  time.Time
    IsCorrect   bool
}
```

---

## 3. Auth Flow

### Google OAuth (Firebase)

```
Mobile → Google Sign-In → receives Firebase ID Token
Mobile → POST /auth/google { idToken }
Spring Boot → FirebaseAuth.verifyIdToken(idToken) → { uid, email }
Spring Boot → lookup users by firebase_uid
              NOT FOUND → create new User + UserProfile rows
              FOUND     → fetch existing user
Spring Boot → mint JWT (userId, isGuest=false, exp=24h)
Spring Boot → return { jwt, user }
Mobile → stores JWT, sends as Authorization: Bearer <jwt> on all future requests
```

### Guest Flow

```
Mobile → POST /auth/guest { guestId }
Spring Boot → lookup users by guest_id
              NOT FOUND → create guest User + UserProfile rows
              FOUND     → return existing
Spring Boot → mint JWT (userId, isGuest=true, exp=7d)
Spring Boot → return { jwt, user }
```

### Guest → Account Merge

When a guest logs in with Google, Spring Boot:
1. Verifies Firebase ID token → gets real `uid`
2. Finds existing guest User row by `guestId`
3. Transfers `xp`, `streak_days`, `selected_topics`, `badges`, `quiz_results` to the Google-authed user
4. Deletes the guest User row

### JWT Details
- Library: `io.jsonwebtoken:jjwt`
- Algorithm: HS256
- Secret: from `application-local.yml` (never committed)
- Payload: `userId`, `isGuest`, `exp`
- `JwtAuthFilter` validates token on every request except `POST /auth/**`

### Firebase Admin SDK
- Initialized once in `FirebaseConfig.java` from service account JSON
- Used only for `FirebaseAuth.getInstance().verifyIdToken(idToken)`

---

## 4. Real-Time P2P Quiz Flow

### Solo quiz mode
When `mode: "solo"`, Go is not involved at all:
```
Mobile → POST /quiz/start { topic, mode: "solo" }
Spring Boot → fetches 5 questions from MongoDB
Spring Boot → creates QuizResult row (in-progress state)
Spring Boot → returns { sessionId, mode: "solo", questions[] }  // no wsUrl

Per question:
Mobile → POST /quiz/answer { sessionId, questionId, answer }
Spring Boot → evaluates answer, updates QuizResult, returns { isCorrect, correctAnswer, xpEarned }

After all questions answered, Spring Boot finalises QuizResult, awards XP, checks badge thresholds.
```

### P2P session lifecycle

```
1. Mobile → POST /quiz/start { topic, mode: "p2p", opponentId? }
   Spring Boot fetches 5 questions from MongoDB for the chosen topic
   Spring Boot → POST http://localhost:8081/session
                 { sessionId, playerA, playerB, questions[] }
   Spring Boot → returns { sessionId, wsUrl: "ws://10.0.2.2:8081/ws" }

2. Both players → WS /ws?sessionId=XYZ&playerId=ABC
   Go hub waits until both players connected → broadcasts QUESTION_START

3. Per question (5-second timer):
   Go → broadcasts QUESTION_START to both players
        { questionId, text, options, questionNumber, timerSeconds: 5 }
   Go starts server-side 5-second timer (time.AfterFunc)

   Player answers → Go receives PLAYER_ANSWER
                    { sessionId, playerId, answer }
   Go evaluates: correct + first to answer → wins the question
   Go broadcasts QUESTION_RESULT to both
                 { winnerId, correctAnswer, scores, combo }

   Timer expires → unanswered questions auto-scored as wrong
   Next question begins immediately

4. All questions done:
   Go broadcasts SESSION_END { winnerId, finalScores, xpEarned }
   Go → POST http://localhost:8080/quiz/result
        { sessionId, playerAScore, playerBScore, xpEarned }
   Spring Boot → saves QuizResult rows, awards XP, checks badge thresholds
```

### WebSocket message types

| Direction | Type | Payload |
|-----------|------|---------|
| Go → Both | `QUESTION_START` | questionId, text, options, type, questionNumber, timerSeconds _(correctAnswer intentionally excluded — would allow client cheating)_ |
| Mobile → Go | `PLAYER_ANSWER` | sessionId, playerId, answer |
| Go → Both | `QUESTION_RESULT` | winnerId, correctAnswer, playerAScore, playerBScore, playerACombo, playerBCombo |
| Go → Both | `TIMER_TICK` | remainingSeconds (optional UI countdown) |
| Go → Both | `SESSION_END` | winnerId, finalScores, xpEarned |
| Go → Both | `PLAYER_DISCONNECTED` | playerId — broadcast immediately on WS close |

### WebSocket disconnection policy
If a player disconnects mid-session: Go broadcasts `PLAYER_DISCONNECTED`, immediately ends the session, awards the remaining player a win, and calls `POST /quiz/result` with the scores at the point of disconnection. No reconnection window — disconnect = forfeit. This keeps the session state machine simple.

### Internal security for `POST /quiz/result`
Go calls Spring Boot's `POST /quiz/result` with an `X-Internal-Secret: <secret>` header. Spring Boot's `JwtAuthFilter` checks this header on the `/quiz/result` path and rejects any request missing it, preventing mobile clients from submitting fabricated scores. The secret is configured via `internal.secret` in `application-local.yml` and the same value in Go's env (`INTERNAL_SECRET`).

### Accuracy update logic
After each quiz result is saved, Spring Boot recalculates `user_profiles.accuracy` as:
`accuracy = (total correct answers across all quiz_results) / (total questions answered) * 100`
Stored as `DECIMAL(5,2)`. Updated synchronously in `QuizService` after the result row is inserted.

### Why Go for this
The Go WebSocket hub manages concurrent connections with goroutines. Each session runs its 5-second timer in its own goroutine. This handles many simultaneous P2P sessions efficiently without the overhead of Spring Boot's thread-per-request model.

---

## 5. Notification System (OneSignal)

### Device registration
```
Mobile → POST /notifications/register-device { oneSignalPlayerId }
Spring Boot → saves playerId to users.onesignal_player_id
```

### Push notification triggers

| Event | Trigger | Scheduled? |
|-------|---------|------------|
| Quiz challenge | Opponent calls POST /quiz/start with opponentId | No |
| Daily quiz live | Every day at 9:00 AM | `@Scheduled(cron = "0 0 9 * * *")` |
| Streak reminder | Every day at 8:00 PM — only if user active streak > 0 and not active today | `@Scheduled(cron = "0 0 20 * * *")` |
| Badge earned | XP threshold crossed after quiz result saved | No |
| Rank change | After weekly leaderboard recalculation | `@Scheduled(cron = "0 0 0 * * MON")` |

### Implementation
OneSignal Java SDK is outdated — Spring Boot calls OneSignal REST API directly via OkHttp:

```
POST https://onesignal.com/api/v1/notifications
Authorization: Basic <ONESIGNAL_REST_API_KEY>
{
  "app_id": "<ONESIGNAL_APP_ID>",
  "include_player_ids": ["<target_player_id>"],
  "headings": { "en": "..." },
  "contents": { "en": "..." }
}
```

---

## 6. REST API Reference

### Spring Boot (port 8080)

**Auth**
```
POST /auth/google              { idToken } → { jwt, user }
POST /auth/guest               { guestId } → { jwt, user }
POST /auth/merge               { guestId, idToken } → 200 OK
```

**User / Profile**
```
GET  /profile                  → UserProfile (aggregates badge rows + derives weeklyActivity from quiz_results.played_at for the current Mon–Sun week)
PATCH /profile                 { username?, avatarUrl?, selectedTopics? }
POST /notifications/register-device  { oneSignalPlayerId }
```

**Feed**
```
GET  /cards?topic=&cursor=     → { cards: FactCard[], nextCursor }
POST /cards/:id/like
POST /cards/:id/save
DELETE /cards/:id/save
```

**Topics**
```
GET  /topics                   → Topic[]
```

**Quiz**
```
POST /quiz/start               { topic, mode: "solo"|"p2p", opponentId? }
                               solo → { sessionId, mode: "solo", questions[] }
                               p2p  → { sessionId, mode: "p2p", wsUrl }
POST /quiz/answer              { sessionId, questionId, answer }
                               solo only — returns { isCorrect, correctAnswer, xpEarned }
POST /quiz/result              { sessionId, playerAScore, playerBScore, xpEarned }
                               internal — called by Go only; protected by X-Internal-Secret header
GET  /quiz/history             → QuizResult[]
```

**Leaderboard**
```
GET  /leaderboard?period=weekly|monthly|alltime → LeaderboardEntry[]
```

**Notifications**
```
GET  /notifications            → Notification[]
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

### Go service (port 8081)

**Called by Spring Boot**
```
POST /session                  { sessionId, playerA, playerB, questions[] } → 200 OK
```

**Called by Mobile**
```
WS   /ws?sessionId=&playerId=
```

**Called by Go → Spring Boot**
```
POST http://localhost:8080/quiz/result  { sessionId, playerAScore, playerBScore, xpEarned }
```

### Future NGINX migration (zero changes to Spring Boot or Go code)
```nginx
# nginx.conf — routes external (mobile) traffic only
location /api/ { proxy_pass http://spring:8080/; }
location /ws/  { proxy_pass http://go:8081/;     }
```

**Important:** Spring Boot → Go internal calls (`POST http://go:8081/session`) bypass NGINX and use direct Docker service names. These are configured via the `go-quiz-service.base-url` env var and do not change when NGINX is added in front.

Mobile env vars today:
```
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:8081
```

After NGINX migration, both collapse to one base URL.

---

## 7. Key Dependencies

### Spring Boot (`pom.xml`)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `spring-boot-starter-web` | 3.3.x | REST controllers |
| `spring-boot-starter-data-jpa` | 3.3.x | JPA/Hibernate for SQLite |
| `spring-boot-starter-data-mongodb` | 3.3.x | MongoDB repositories |
| `spring-boot-starter-security` | 3.3.x | Security filter chain |
| `spring-boot-starter-validation` | 3.3.x | DTO validation |
| _(scheduling — no separate starter needed)_ | — | `@EnableScheduling` on `SchedulingConfig.java` activates `@Scheduled`; it's included via `spring-boot-starter-web` transitively |
| `org.xerial:sqlite-jdbc` | 3.46.x | SQLite JDBC driver |
| `org.hibernate.orm:hibernate-community-dialects` | 6.6.x | Hibernate 6 SQLite dialect (replaces gwenn — gwenn 0.1.x targets Hibernate 5 and fails on Spring Boot 3.x) |
| `io.jsonwebtoken:jjwt-api` | 0.12.x | JWT |
| `io.jsonwebtoken:jjwt-impl` | 0.12.x | JWT implementation |
| `io.jsonwebtoken:jjwt-jackson` | 0.12.x | JWT JSON serialization (required — missing it throws MissingImplementationException at runtime) |
| `com.google.firebase:firebase-admin` | 9.x | Firebase token verification |
| `com.squareup.okhttp3:okhttp` | 4.x | OneSignal REST calls |
| `org.projectlombok:lombok` | 1.18.x | Boilerplate reduction |
| Java | **21 LTS** | Required for Spring Boot 3.x |

### Go (`go.mod`)

| Package | Purpose |
|---------|---------|
| `github.com/gorilla/websocket` | WebSocket server _(archived — functional for scaffold; consider `nhooyr.io/websocket` before production)_ |
| `github.com/gorilla/mux` | HTTP router _(archived — consider `github.com/go-chi/chi` before production)_ |
| `github.com/google/uuid` | Session ID generation |
| Go | **1.22** | |

---

## 8. Environment Variables

### `service/spring/src/main/resources/application-local.yml` (gitignored)

```yaml
spring:
  datasource:
    url: jdbc:sqlite:./quizly.db
  data:
    mongodb:
      uri: mongodb://localhost:27017/quizly

firebase:
  service-account-path: ./firebase-service-account.json

onesignal:
  app-id: YOUR_APP_ID
  rest-api-key: YOUR_REST_API_KEY

jwt:
  secret: YOUR_LOCAL_SECRET_MIN_32_CHARS
  expiry-hours: 24
  guest-expiry-hours: 168

go-quiz-service:
  base-url: http://localhost:8081

internal:
  secret: YOUR_INTERNAL_SECRET_MIN_32_CHARS
```

### `service/spring/src/main/resources/application-local.yml.example` (committed)

Same structure with empty values — documents all required variables.

### Go environment (set in shell or future Docker env)
```
SPRING_BASE_URL=http://localhost:8080
PORT=8081
INTERNAL_SECRET=YOUR_INTERNAL_SECRET_MIN_32_CHARS
```
