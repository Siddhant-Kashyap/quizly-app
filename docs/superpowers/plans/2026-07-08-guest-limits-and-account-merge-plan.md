# Guest Limits + Account Merge Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap guest accounts at 5 solo quizzes / 1 PvP match / 10 feed cards, and implement the currently-stubbed `POST /auth/merge` so a guest's progress carries over when they sign in with Google instead of being lost.

**Architecture:** A new Spring endpoint (`GET /quiz/eligibility`) is the single check point the frontend calls before starting a quiz; solo quiz additionally enforces the limit server-side inside `startSolo` itself (PvP stays a soft, client-only gate — no Go↔Spring call added). A new full-screen wall component blocks the relevant feature and offers only "Sign in with Google," which calls the existing (working) native Google Sign-In flow and then `POST /auth/merge` instead of a plain login.

**Tech Stack:** Spring Boot (Java, JPA/SQLite), Expo/React Native (TypeScript), Zustand, AsyncStorage.

---

## Context for the implementer

- Read `/home/sid/Work/Quizly/app/docs/superpowers/specs/2026-07-08-guest-limits-and-account-merge-design.md` first — it has the full rationale for every decision below, including two rounds of spec review that caught real bugs (a `p2p`/`pvp` string mismatch, and a merge branch that silently orphaned database rows). This plan's code has those fixes baked in.
- Google Sign-In (`src/features/auth/lib/googleSignIn.ts`, `useAuth.ts`'s `signInWithGoogle`) already works end-to-end — do not modify it. This plan only adds a second entry point (`mergeGuestIntoGoogle`) that reuses its native-picker step.
- `service/spring/src/test/java/com/quizly/TestTokenHelper.java` generates JWTs for subjects (`"test-guest"`, `"test-user"`) that have **no corresponding `User` row** in the test database — the JWT is cryptographically valid but nothing was ever inserted into the `users` table for that id. Task 1's `checkEligibility` must handle a missing `User` row by allowing (not throwing), both because that's the correct real-world semantics (an unresolvable user can't meaningfully be "a guest over their limit") and because throwing would make unrelated existing tests that use these tokens for non-solo/non-eligibility endpoints newly fragile if they ever incidentally exercised this path.
- `FirebaseToken` (used in Task 3's tests to mock `FirebaseService.verify(...)`) is a `final` class from the Firebase Admin SDK. This project's Mockito version (5.x, via `spring-boot-starter-test`) defaults to the inline mock maker, which mocks final classes without any extra configuration — `mock(FirebaseToken.class)` just works, no `mockito-inline` dependency or extra setup needed.
- Every task's commit must stage **only** that task's own exact file paths — never `git add -A`/`git add .`. Both repos (`app`, `service`) may have unrelated pre-existing uncommitted changes from other work; leave those alone.

---

## Task 1: Backend — `GET /quiz/eligibility`

**Files:**
- Create: `service/spring/src/main/java/com/quizly/quiz/dto/EligibilityResponse.java`
- Modify: `service/spring/src/main/java/com/quizly/quiz/service/QuizService.java`
- Modify: `service/spring/src/main/java/com/quizly/quiz/controller/QuizController.java`
- Test: `service/spring/src/test/java/com/quizly/quiz/QuizServiceTest.java`
- Test: `service/spring/src/test/java/com/quizly/quiz/QuizControllerTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `QuizServiceTest.java` (needs a new `@Autowired UserRepository userRepo` field added to the class alongside the existing autowired fields):

```java
@Autowired com.quizly.user.repository.UserRepository userRepo;
```

```java
@Test
void checkEligibility_guestUnderLimit_isAllowed() {
    String userId = "eligibility-under-limit";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("elig-under").provider("guest").guestId("g-" + userId).build());

    var result = quizService.checkEligibility(userId, "solo");

    assertThat(result.allowed()).isTrue();
}

@Test
void checkEligibility_guestAtLimit_isBlocked() {
    String userId = "eligibility-at-limit";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("elig-at").provider("guest").guestId("g-" + userId).build());
    for (int i = 0; i < 5; i++) {
        quizService.saveSoloResult(userId, new SoloResultRequest("s" + i, 10, 20, 1, 0.5));
    }

    var result = quizService.checkEligibility(userId, "solo");

    assertThat(result.allowed()).isFalse();
}

@Test
void checkEligibility_p2pLimitIsOne_separateFromSoloCount() {
    String userId = "eligibility-p2p-limit";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("elig-p2p").provider("guest").guestId("g-" + userId).build());
    quizService.saveSoloResult(userId, new SoloResultRequest("solo-1", 10, 20, 1, 0.5));
    resultRepo.save(com.quizly.quiz.entity.QuizResult.builder()
            .userId(userId).sessionId("p2p-1").mode("p2p").score(10).xpEarned(10).build());

    var soloResult = quizService.checkEligibility(userId, "solo");
    var p2pResult = quizService.checkEligibility(userId, "p2p");

    assertThat(soloResult.allowed()).isTrue(); // 1 of 5 used
    assertThat(p2pResult.allowed()).isFalse(); // 1 of 1 used
}

@Test
void checkEligibility_googleUser_alwaysAllowedRegardlessOfCount() {
    String userId = "eligibility-google-user";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("elig-google").provider("google").email(userId + "@x.com").build());
    for (int i = 0; i < 10; i++) {
        quizService.saveSoloResult(userId, new SoloResultRequest("s" + i, 10, 20, 1, 0.5));
    }

    var result = quizService.checkEligibility(userId, "solo");

    assertThat(result.allowed()).isTrue();
}

@Test
void checkEligibility_unresolvableUserId_isAllowed() {
    // No User row exists for this id at all — must not throw. See the plan's
    // "Context for the implementer" note on TestTokenHelper-style JWTs with
    // no backing User row.
    var result = quizService.checkEligibility("no-such-user-id", "solo");

    assertThat(result.allowed()).isTrue();
}
```

Add to `QuizControllerTest.java`:

```java
@Test
void eligibility_returnsAllowedTrueForAuthenticatedUser() throws Exception {
    mockMvc.perform(get("/quiz/eligibility?mode=solo")
                    .header("Authorization", "Bearer " + TestTokenHelper.userToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.allowed").value(true));
}
```

(Add `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;` to `QuizControllerTest.java`'s existing static imports if not already present as a wildcard — check the existing `import static ... .*;` line first, it likely already covers `get`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=QuizServiceTest,QuizControllerTest -q`
Expected: FAIL — `checkEligibility` method doesn't exist on `QuizService`, `/quiz/eligibility` doesn't exist (404).

- [ ] **Step 3: Create the DTO**

Create `service/spring/src/main/java/com/quizly/quiz/dto/EligibilityResponse.java`:

```java
package com.quizly.quiz.dto;

public record EligibilityResponse(boolean allowed) {}
```

- [ ] **Step 4: Add `checkEligibility` to `QuizService`**

In `service/spring/src/main/java/com/quizly/quiz/service/QuizService.java`, add a new constructor dependency and the method. The full updated constructor and new imports/field:

```java
import com.quizly.user.entity.User;
import com.quizly.user.repository.UserRepository;
```

```java
    private final com.quizly.user.repository.UserProfileRepository profileRepo;
    private final UserRepository userRepo;
    private final com.quizly.feed.repository.TopicRepository topicRepo;
    private final GoSessionClient goSessionClient;

    @Value("${go-quiz-service.ws-base-url}")
    private String wsBaseUrl;

    public QuizService(QuizQuestionRepository questionRepo, QuizResultRepository resultRepo,
                       com.quizly.user.repository.UserProfileRepository profileRepo,
                       UserRepository userRepo,
                       com.quizly.feed.repository.TopicRepository topicRepo,
                       GoSessionClient goSessionClient) {
        this.questionRepo = questionRepo;
        this.resultRepo = resultRepo;
        this.profileRepo = profileRepo;
        this.userRepo = userRepo;
        this.topicRepo = topicRepo;
        this.goSessionClient = goSessionClient;
    }
```

(Only the `profileRepo` field/param and constructor body gain a new `userRepo` line each — `questionRepo`, `resultRepo`, `topicRepo`, `goSessionClient` are unchanged, just shown above for placement context.)

New method, placed after `startP2P`:

```java
    public EligibilityResponse checkEligibility(String userId, String mode) {
        Optional<User> user = userRepo.findById(userId);
        if (user.isEmpty() || !"guest".equals(user.get().getProvider())) {
            return new EligibilityResponse(true);
        }
        long played = resultRepo.findByUserIdOrderByPlayedAtDesc(userId).stream()
                .filter(r -> mode.equals(r.getMode()))
                .count();
        int limit = "p2p".equals(mode) ? 1 : 5; // solo
        return new EligibilityResponse(played < limit);
    }
```

`Optional` is already imported in this file (`java.util.*`).

- [ ] **Step 5: Add the endpoint to `QuizController`**

In `service/spring/src/main/java/com/quizly/quiz/controller/QuizController.java`, add:

```java
    @GetMapping("/eligibility")
    public ResponseEntity<EligibilityResponse> eligibility(
            @RequestParam String mode, Authentication auth) {
        return ResponseEntity.ok(quizService.checkEligibility((String) auth.getPrincipal(), mode));
    }
```

(`EligibilityResponse` is already covered by the file's existing `import com.quizly.quiz.dto.*;`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=QuizServiceTest,QuizControllerTest -q`
Expected: PASS (all tests in both files, old and new)

- [ ] **Step 7: Commit**

```bash
cd service
git add spring/src/main/java/com/quizly/quiz/dto/EligibilityResponse.java \
        spring/src/main/java/com/quizly/quiz/service/QuizService.java \
        spring/src/main/java/com/quizly/quiz/controller/QuizController.java \
        spring/src/test/java/com/quizly/quiz/QuizServiceTest.java \
        spring/src/test/java/com/quizly/quiz/QuizControllerTest.java
git commit -m "feat: add GET /quiz/eligibility for guest quiz limits"
```

---

## Task 2: Backend — enforce the solo limit inside `startSolo`

**Files:**
- Modify: `service/spring/src/main/java/com/quizly/quiz/service/QuizService.java`
- Test: `service/spring/src/test/java/com/quizly/quiz/QuizServiceTest.java`

- [ ] **Step 1: Write the failing test**

Add to `QuizServiceTest.java`:

```java
@Test
void startSolo_guestAtLimit_throwsForbidden() {
    String userId = "start-solo-at-limit";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("start-solo-at").provider("guest").guestId("g-" + userId).build());
    for (int i = 0; i < 5; i++) {
        quizService.saveSoloResult(userId, new SoloResultRequest("s" + i, 10, 20, 1, 0.5));
    }

    org.assertj.core.api.Assertions.assertThatThrownBy(() -> quizService.startSolo("science", userId))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class)
            .hasMessageContaining("403");
}

@Test
void startSolo_guestUnderLimit_succeeds() {
    String userId = "start-solo-under-limit";
    userRepo.save(com.quizly.user.entity.User.builder()
            .id(userId).username("start-solo-under").provider("guest").guestId("g-" + userId).build());

    var response = quizService.startSolo("science", userId);

    assertThat(response.mode()).isEqualTo("solo");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=QuizServiceTest -q`
Expected: FAIL — `startSolo_guestAtLimit_throwsForbidden` fails because no exception is thrown (the guard doesn't exist yet).

- [ ] **Step 3: Add the guard**

In `service/spring/src/main/java/com/quizly/quiz/service/QuizService.java`, add the import:

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
```

Modify `startSolo`'s first line:

```java
    public StartQuizResponse startSolo(String topic, String userId) {
        if (!checkEligibility(userId, "solo").allowed()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guest solo quiz limit reached");
        }
        List<QuizQuestion> questions = questionRepo
                .findByTopicOrderByIdAsc(topic, PageRequest.of(0, QUESTIONS_PER_SESSION));
        // ...rest of the method is unchanged
```

This reuses `GlobalExceptionHandler`'s existing generic `ResponseStatusException` handler (already present in `service/spring/src/main/java/com/quizly/shared/exception/GlobalExceptionHandler.java`) — no changes needed there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=QuizServiceTest -q`
Expected: PASS (all tests in this file, old and new)

- [ ] **Step 5: Commit**

```bash
cd service
git add spring/src/main/java/com/quizly/quiz/service/QuizService.java \
        spring/src/test/java/com/quizly/quiz/QuizServiceTest.java
git commit -m "feat: enforce guest solo quiz limit server-side inside startSolo"
```

---

## Task 3: Backend — implement `POST /auth/merge`

**Files:**
- Modify: `service/spring/src/main/java/com/quizly/feed/repository/CardInteractionRepository.java`
- Modify: `service/spring/src/main/java/com/quizly/auth/service/AuthService.java`
- Modify: `service/spring/src/main/java/com/quizly/auth/controller/AuthController.java`
- Test: `service/spring/src/test/java/com/quizly/auth/AuthServiceTest.java` (new file)

- [ ] **Step 1: Write the failing tests**

Create `service/spring/src/test/java/com/quizly/auth/AuthServiceTest.java`:

```java
package com.quizly.auth;

import com.quizly.auth.service.AuthService;
import com.quizly.auth.service.FirebaseService;
import com.quizly.feed.entity.CardInteraction;
import com.quizly.feed.repository.CardInteractionRepository;
import com.quizly.quiz.entity.QuizResult;
import com.quizly.quiz.repository.QuizResultRepository;
import com.quizly.user.entity.User;
import com.quizly.user.entity.UserProfile;
import com.quizly.user.repository.UserProfileRepository;
import com.quizly.user.repository.UserRepository;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class AuthServiceTest {
    @Autowired AuthService authService;
    @Autowired UserRepository userRepo;
    @Autowired UserProfileRepository profileRepo;
    @Autowired QuizResultRepository resultRepo;
    @Autowired CardInteractionRepository cardInteractionRepo;
    @MockBean FirebaseService firebaseService;

    private FirebaseToken tokenFor(String uid, String email) {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn(uid);
        when(token.getEmail()).thenReturn(email);
        when(token.getName()).thenReturn(null); // exercise the email-prefix fallback
        return token;
    }

    @Test
    void merge_intoNewGoogleAccount_migratesGuestProgress() {
        String guestId = "merge-new-guest-1";
        User guest = userRepo.save(User.builder()
                .username("MergeGuest1").provider("guest").guestId(guestId).build());
        profileRepo.save(UserProfile.builder().userId(guest.getId()).xp(150).level(2).streakDays(3).build());
        resultRepo.save(QuizResult.builder().userId(guest.getId()).sessionId("s1").mode("solo").score(10).xpEarned(50).build());
        cardInteractionRepo.save(CardInteraction.builder().userId(guest.getId()).cardId("card-1").type("like").build());

        when(firebaseService.verify("fake-token")).thenReturn(tokenFor("new-google-uid-1", "newuser1@example.com"));

        var response = authService.mergeGuestIntoGoogle(guestId, "fake-token");

        assertThat(response.user().isGuest()).isFalse();
        var mergedProfile = profileRepo.findByUserId(response.user().id()).orElseThrow();
        assertThat(mergedProfile.getXp()).isEqualTo(150);
        assertThat(mergedProfile.getStreakDays()).isEqualTo(3);
        assertThat(resultRepo.findByUserIdOrderByPlayedAtDesc(response.user().id())).hasSize(1);
        assertThat(cardInteractionRepo.findByUserId(response.user().id())).hasSize(1);
        assertThat(userRepo.findByGuestId(guestId)).isEmpty(); // guest row gone
    }

    @Test
    void merge_intoExistingGoogleAccount_discardsGuestDataEntirely() {
        String guestId = "merge-existing-guest-1";
        User guest = userRepo.save(User.builder()
                .username("MergeGuest2").provider("guest").guestId(guestId).build());
        profileRepo.save(UserProfile.builder().userId(guest.getId()).xp(999).build());
        resultRepo.save(QuizResult.builder().userId(guest.getId()).sessionId("s2").mode("solo").score(10).xpEarned(50).build());
        cardInteractionRepo.save(CardInteraction.builder().userId(guest.getId()).cardId("card-2").type("save").build());

        User existingGoogle = userRepo.save(User.builder()
                .username("ExistingGoogleUser").provider("google")
                .email("existing@example.com").firebaseUid("existing-google-uid-1").build());
        profileRepo.save(UserProfile.builder().userId(existingGoogle.getId()).xp(500).build());

        when(firebaseService.verify("fake-token-2")).thenReturn(tokenFor("existing-google-uid-1", "existing@example.com"));

        var response = authService.mergeGuestIntoGoogle(guestId, "fake-token-2");

        assertThat(response.user().id()).isEqualTo(existingGoogle.getId());
        var googleProfile = profileRepo.findByUserId(existingGoogle.getId()).orElseThrow();
        assertThat(googleProfile.getXp()).isEqualTo(500); // untouched, guest data did NOT overwrite it
        assertThat(resultRepo.findByUserIdOrderByPlayedAtDesc(guest.getId())).isEmpty(); // deleted, not orphaned
        assertThat(cardInteractionRepo.findByUserId(guest.getId())).isEmpty(); // deleted, not orphaned
        assertThat(userRepo.findByGuestId(guestId)).isEmpty();
    }

    @Test
    void merge_unknownGuestId_throws() {
        when(firebaseService.verify("fake-token-3")).thenReturn(tokenFor("some-uid", "x@example.com"));

        assertThatThrownBy(() -> authService.mergeGuestIntoGoogle("no-such-guest-id", "fake-token-3"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

Also add to `service/spring/src/test/java/com/quizly/auth/AuthControllerTest.java` (this covers the new endpoint's return type/HTTP wiring, complementing the service-level tests above which cover the branching logic):

```java
@Test
void merge_unknownGuestId_returns400() throws Exception {
    mockMvc.perform(post("/auth/merge")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"guestId\":\"no-such-guest\",\"idToken\":\"whatever\"}"))
            .andExpect(status().isBadRequest());
}
```

(This will actually fail at the Firebase-verification step before ever reaching the "unknown guestId" check, since `AuthControllerTest` doesn't mock `FirebaseService` — but with `firebase.enabled=false` in the test profile, `FirebaseService.verify` throws `IllegalArgumentException("Invalid Firebase ID token")` for any token, which the existing `GlobalExceptionHandler`'s `IllegalArgumentException` handler already maps to 400. This test is really asserting "the endpoint exists, takes this shape, and surfaces errors as 400" — the guestId-specific 400 case is more precisely covered by `AuthServiceTest.merge_unknownGuestId_throws` above.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=AuthServiceTest,AuthControllerTest -q`
Expected: FAIL — `mergeGuestIntoGoogle` doesn't exist on `AuthService`, `CardInteractionRepository.findByUserId` doesn't exist.

- [ ] **Step 3: Add `CardInteractionRepository.findByUserId`**

In `service/spring/src/main/java/com/quizly/feed/repository/CardInteractionRepository.java`, add:

```java
    List<CardInteraction> findByUserId(String userId);
```

(Add this alongside the existing `findByUserIdAndCardIdAndType`/`findByUserIdAndCardIdIn` methods — `List` is already imported.)

- [ ] **Step 4: Implement `AuthService.mergeGuestIntoGoogle`**

In `service/spring/src/main/java/com/quizly/auth/service/AuthService.java`, add the new dependencies and method. Updated imports/fields/constructor:

```java
import com.quizly.feed.repository.CardInteractionRepository;
import com.quizly.quiz.repository.QuizResultRepository;
import java.util.Optional;
```

```java
    private final UserRepository userRepo;
    private final UserProfileRepository profileRepo;
    private final QuizResultRepository resultRepo;
    private final CardInteractionRepository cardInteractionRepo;
    private final FirebaseService firebaseService;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepo, UserProfileRepository profileRepo,
                       QuizResultRepository resultRepo, CardInteractionRepository cardInteractionRepo,
                       FirebaseService firebaseService, JwtUtil jwtUtil) {
        this.userRepo = userRepo;
        this.profileRepo = profileRepo;
        this.resultRepo = resultRepo;
        this.cardInteractionRepo = cardInteractionRepo;
        this.firebaseService = firebaseService;
        this.jwtUtil = jwtUtil;
    }
```

(`import com.quizly.user.repository.*;` already covers `UserRepository`/`UserProfileRepository`; `com.quizly.user.entity.*` already covers `User`/`UserProfile`.)

New method, placed after `loginAsGuest`:

```java
    @Transactional
    public AuthResponse mergeGuestIntoGoogle(String guestId, String idToken) {
        var token = firebaseService.verify(idToken);
        String uid = token.getUid();
        String email = token.getEmail();
        String name = token.getName() != null ? token.getName() : email.split("@")[0];

        User guest = userRepo.findByGuestId(guestId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown guestId"));

        Optional<User> existingGoogleUser = userRepo.findByFirebaseUid(uid);
        User google = existingGoogleUser.orElseGet(() -> {
            User u = User.builder().firebaseUid(uid).email(email).username(name).provider("google").build();
            User saved = userRepo.save(u);
            profileRepo.save(UserProfile.builder().userId(saved.getId()).build());
            return saved;
        });

        if (existingGoogleUser.isEmpty()) {
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
            resultRepo.findByUserIdOrderByPlayedAtDesc(guest.getId())
                    .forEach(r -> { r.setUserId(google.getId()); resultRepo.save(r); });
            cardInteractionRepo.findByUserId(guest.getId())
                    .forEach(ci -> { ci.setUserId(google.getId()); cardInteractionRepo.save(ci); });
        } else {
            // The Google account already had its own progress — it wins.
            // Guest data must be explicitly deleted here, not just left behind:
            // QuizResult/CardInteraction.userId are plain strings (no JPA FK),
            // so simply deleting the guest User row below would silently
            // orphan these rows rather than removing them.
            resultRepo.deleteAll(resultRepo.findByUserIdOrderByPlayedAtDesc(guest.getId()));
            cardInteractionRepo.deleteAll(cardInteractionRepo.findByUserId(guest.getId()));
        }

        profileRepo.findByUserId(guest.getId()).ifPresent(profileRepo::delete);
        userRepo.delete(guest);

        String jwt = jwtUtil.generateToken(google.getId(), false);
        return toResponse(google, jwt, false);
    }
```

- [ ] **Step 5: Wire the real endpoint into `AuthController`**

In `service/spring/src/main/java/com/quizly/auth/controller/AuthController.java`, replace the stub:

```java
    @PostMapping("/merge")
    public ResponseEntity<AuthResponse> merge(@Valid @RequestBody MergeRequest req) {
        return ResponseEntity.ok(authService.mergeGuestIntoGoogle(req.guestId(), req.idToken()));
    }
```

(This replaces the old `// TODO: implement guest→account merge in feature phase` / `ResponseEntity<Void>` stub. `AuthResponse` is already covered by the file's `import com.quizly.auth.dto.*;`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -Dtest=AuthServiceTest,AuthControllerTest -q`
Expected: PASS (all tests in both files, old and new)

- [ ] **Step 7: Run the full backend test suite**

Run: `cd service/spring && SPRING_PROFILES_ACTIVE=local mvn test -q`
Expected: PASS (or, if `LeaderboardServiceTest` fails due to accumulated data in the shared dev `quizly.db` file from prior manual testing — a known pre-existing test-isolation gap, unrelated to this change — confirm no *new* failures appear beyond that specific pre-existing issue.)

- [ ] **Step 8: Commit**

```bash
cd service
git add spring/src/main/java/com/quizly/feed/repository/CardInteractionRepository.java \
        spring/src/main/java/com/quizly/auth/service/AuthService.java \
        spring/src/main/java/com/quizly/auth/controller/AuthController.java \
        spring/src/test/java/com/quizly/auth/AuthServiceTest.java \
        spring/src/test/java/com/quizly/auth/AuthControllerTest.java
git commit -m "feat: implement POST /auth/merge to fold guest progress into a Google account"
```

---

## Task 4: Frontend — `useQuizEligibility` hook

**Files:**
- Create: `app/src/features/quiz/hooks/useQuizEligibility.ts`
- Test: `app/src/features/quiz/hooks/__tests__/useQuizEligibility.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/src/features/quiz/hooks/__tests__/useQuizEligibility.test.ts`:

```ts
import { renderHook } from '@testing-library/react-native'
import { useQuizEligibility } from '../useQuizEligibility'
import { api } from '@/shared/lib/api'

jest.mock('@/shared/lib/api', () => ({ api: { get: jest.fn() } }))

beforeEach(() => { jest.clearAllMocks() })

test('returns true when the backend says allowed', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ allowed: true })
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('solo')

  expect(allowed).toBe(true)
  expect(api.get).toHaveBeenCalledWith('/quiz/eligibility?mode=solo')
})

test('returns false when the backend says blocked', async () => {
  ;(api.get as jest.Mock).mockResolvedValue({ allowed: false })
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('p2p')

  expect(allowed).toBe(false)
  expect(api.get).toHaveBeenCalledWith('/quiz/eligibility?mode=p2p')
})

test('fails open (returns true) if the request itself throws', async () => {
  ;(api.get as jest.Mock).mockRejectedValue(new Error('network error'))
  const { result } = renderHook(() => useQuizEligibility())

  const allowed = await result.current('solo')

  expect(allowed).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx jest useQuizEligibility -v`
Expected: FAIL — `useQuizEligibility` module doesn't exist yet.

- [ ] **Step 3: Implement the hook**

Create `app/src/features/quiz/hooks/useQuizEligibility.ts`:

```ts
import { api } from '@/shared/lib/api'

// A guest limit isn't worth blocking the whole app over a flaky network
// request — if the eligibility check itself fails, fail open (allow).
export function useQuizEligibility() {
  return async (mode: 'solo' | 'p2p'): Promise<boolean> => {
    try {
      const { allowed } = await api.get<{ allowed: boolean }>(`/quiz/eligibility?mode=${mode}`)
      return allowed
    } catch {
      return true
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx jest useQuizEligibility -v`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/quiz/hooks/useQuizEligibility.ts src/features/quiz/hooks/__tests__/useQuizEligibility.test.ts
git commit -m "feat: add useQuizEligibility hook for the guest quiz limit check"
```

---

## Task 5: Frontend — `mergeGuestIntoGoogle` in `useAuth`

**Files:**
- Modify: `app/src/features/auth/hooks/useAuth.ts`
- Test: `app/src/features/auth/__tests__/useAuth.test.ts` (new file — no existing test file for this hook; `store.test.ts` in the same directory tests the Zustand store directly, not the hook)

- [ ] **Step 1: Read the current file to confirm assumptions**

Read `app/src/features/auth/hooks/useAuth.ts` and confirm it still matches: `loginWithGoogle(idToken)` posts to `/auth/google` then calls `store.login(...)`; `signInWithGoogle()` wraps the native picker + `loginWithGoogle`; `store` is `useAuthStore()`, exposing `guestId`.

- [ ] **Step 2: Write the failing test**

Create `app/src/features/auth/__tests__/useAuth.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store'
import { useProfileStore } from '@/features/profile/store'
import { api } from '@/shared/lib/api'
import * as googleSignIn from '../lib/googleSignIn'

jest.mock('@/shared/lib/api', () => ({ api: { post: jest.fn() } }))
jest.mock('../lib/googleSignIn', () => ({ signInWithGoogle: jest.fn() }))

const mockUser = { id: 'google-user-1', username: 'Merged User', email: 'm@example.com', avatarUrl: null }

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ user: null, isGuest: true, token: 'old-guest-token', guestId: 'guest-abc' })
  useProfileStore.setState({ profile: null })
})

test('mergeGuestIntoGoogle posts /auth/merge with the current guestId and logs in on success', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())
  let merged: boolean = false
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(true)
  expect(api.post).toHaveBeenCalledWith('/auth/merge', { guestId: 'guest-abc', idToken: 'fake-id-token' })
  expect(useAuthStore.getState().isGuest).toBe(false)
  expect(useAuthStore.getState().user?.id).toBe('google-user-1')
})

test('mergeGuestIntoGoogle clears the profile store and the card-view counter on success', async () => {
  useProfileStore.setState({ profile: { userId: 'guest-abc' } as never })
  await AsyncStorage.setItem('factora.guestCardsViewed', JSON.stringify(['c1', 'c2']))
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue('fake-id-token')
  ;(api.post as jest.Mock).mockResolvedValue({ jwt: 'new-jwt', user: { ...mockUser, isGuest: false } })

  const { result } = renderHook(() => useAuth())
  await act(async () => { await result.current.mergeGuestIntoGoogle() })

  expect(useProfileStore.getState().profile).toBeNull()
  expect(await AsyncStorage.getItem('factora.guestCardsViewed')).toBeNull()
})

test('mergeGuestIntoGoogle returns false without calling the API if the picker was cancelled', async () => {
  ;(googleSignIn.signInWithGoogle as jest.Mock).mockResolvedValue(null)

  const { result } = renderHook(() => useAuth())
  let merged: boolean = true
  await act(async () => { merged = await result.current.mergeGuestIntoGoogle() })

  expect(merged).toBe(false)
  expect(api.post).not.toHaveBeenCalled()
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app && npx jest features/auth/__tests__/useAuth -v`
Expected: FAIL — `mergeGuestIntoGoogle` doesn't exist on the object returned by `useAuth()`.

- [ ] **Step 4: Implement `mergeGuestIntoGoogle`**

In `app/src/features/auth/hooks/useAuth.ts`, add the import:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
```

Add the new function alongside `signInWithGoogle` (after it):

```ts
  // Guest→Google merge: reuses the same native Google Sign-In step as
  // signInWithGoogle, but exchanges the ID token via /auth/merge instead of
  // /auth/google, so the guest's progress carries over instead of starting
  // a fresh empty account. Only ever called from a guest session's limit
  // wall (see GuestLimitWall.tsx) — falls back to a plain /auth/google call
  // if there's somehow no guestId in the store, which keeps this safe to
  // call generally even though that shouldn't happen given the call site.
  const mergeGuestIntoGoogle = async (): Promise<boolean> => {
    const idToken = await signInWithGoogleNative()
    if (!idToken) return false
    const guestId = store.guestId
    const response = guestId
      ? await api.post<AuthResponse>('/auth/merge', { guestId, idToken })
      : await api.post<AuthResponse>('/auth/google', { idToken })
    store.login(response.user, response.jwt)
    useProfileStore.getState().clearProfile() // fresh (possibly merged) account — refetch, don't show stale guest data
    await AsyncStorage.removeItem('factora.guestCardsViewed') // fresh account, no more guest caps
    return true
  }
```

Update the return statement:

```ts
  return { ...store, loginWithGoogle, signInWithGoogle, mergeGuestIntoGoogle, loginAsGuest, logout }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd app && npx jest features/auth/__tests__/useAuth -v`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Run the full frontend test suite and typecheck**

Run: `cd app && npx tsc --noEmit && npx jest`
Expected: typecheck shows the same single pre-existing unrelated error as before (`index.ts` → `./App`, nothing new); all tests pass.

- [ ] **Step 7: Commit**

```bash
cd app
git add src/features/auth/hooks/useAuth.ts src/features/auth/__tests__/useAuth.test.ts
git commit -m "feat: add mergeGuestIntoGoogle to useAuth for the guest-to-Google merge flow"
```

---

## Task 6: Frontend — `GuestLimitWall` component + route

**Files:**
- Create: `app/src/features/auth/components/GuestLimitWall.tsx`
- Create: `app/app/(quiz)/limit-wall.tsx`

No isolated test — this is UI glue over `mergeGuestIntoGoogle` (already tested in Task 5). Verified manually in Task 10, matching the existing project convention for thin screens (e.g. the earlier P2P wiring plan's `matchmaking.tsx`).

- [ ] **Step 1: Read reference files**

Read `app/app/(auth)/login.tsx` for the existing visual pattern (gradient icon, display text, body text, error text below the button, single `Button` action) — `GuestLimitWall` follows the same structure.

- [ ] **Step 2: Create the component**

Create `app/src/features/auth/components/GuestLimitWall.tsx`:

```tsx
import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock } from 'lucide-react-native'
import { Text, Button } from '@/shared/components'
import { useAuth } from '../hooks/useAuth'
import { colors, gradients } from '@/shared/theme/colors'

type LimitFeature = 'solo' | 'pvp' | 'cards'

const COPY: Record<LimitFeature, { title: string; body: string }> = {
  solo: {
    title: "You've played 5 free quizzes",
    body: 'Sign in with Google to keep playing and save your progress.',
  },
  pvp: {
    title: "You've used your free PvP match",
    body: 'Sign in with Google to battle more opponents and save your progress.',
  },
  cards: {
    title: "You've seen 10 free cards",
    body: 'Sign in with Google to keep exploring and save your progress.',
  },
}

export function GuestLimitWall({ feature }: { feature: LimitFeature }) {
  const { mergeGuestIntoGoogle } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const copy = COPY[feature]

  const handleSignIn = async () => {
    setError(null)
    try {
      const merged = await mergeGuestIntoGoogle()
      if (merged) router.replace('/(tabs)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')
    }
  }

  return (
    <View className="flex-1 bg-void items-center justify-center px-6">
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        <Lock size={32} color={colors.white} />
      </LinearGradient>
      <Text variant="display" className="text-cyan mb-2 text-center">{copy.title}</Text>
      <Text variant="body" className="text-white/60 text-center mb-12">{copy.body}</Text>

      {error && (
        <Text variant="caption" className="text-red-400 text-center mb-4">{error}</Text>
      )}

      <Button label="Sign in with Google" onPress={handleSignIn} />
    </View>
  )
}
```

- [ ] **Step 3: Create the route wrapper**

Create `app/app/(quiz)/limit-wall.tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router'
import { GuestLimitWall } from '@/features/auth/components/GuestLimitWall'

export default function LimitWallScreen() {
  const { feature } = useLocalSearchParams<{ feature: 'solo' | 'pvp' }>()
  return <GuestLimitWall feature={feature ?? 'solo'} />
}
```

- [ ] **Step 4: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before, no new ones.

- [ ] **Step 5: Commit**

```bash
cd app
git add src/features/auth/components/GuestLimitWall.tsx "app/(quiz)/limit-wall.tsx"
git commit -m "feat: add GuestLimitWall component and its route"
```

---

## Task 7: Frontend — wire `quiz.tsx`'s entry points to the eligibility check

**Files:**
- Modify: `app/app/(tabs)/quiz.tsx`

No isolated test — thin navigation glue over `useQuizEligibility` (already tested in Task 4). Verified manually in Task 10.

- [ ] **Step 1: Read the current file to confirm assumptions**

Read `app/app/(tabs)/quiz.tsx` and confirm it still has three navigation `Pressable`s: PvP Battle (→ `/(quiz)/matchmaking?topic=all`), Mixed Quiz (→ `/(quiz)/all`), and one per topic (→ `/(quiz)/${topic.slug}`).

- [ ] **Step 2: Rewrite the screen**

Replace `app/app/(tabs)/quiz.tsx` entirely:

```tsx
import { View, Pressable, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Zap, Swords } from 'lucide-react-native'
import { Text } from '@/shared/components'
import { useCategories } from '@/features/explore/hooks/useCategories'
import { useQuizEligibility } from '@/features/quiz/hooks/useQuizEligibility'
import { TOPIC_COLORS, DEFAULT_TOPIC_COLOR } from '@/shared/lib/topicColors'
import { colors, gradients } from '@/shared/theme/colors'

export default function QuizHub() {
  const { topics } = useCategories()
  const checkEligibility = useQuizEligibility()

  const startPvp = async () => {
    const allowed = await checkEligibility('p2p')
    router.push(allowed ? '/(quiz)/matchmaking?topic=all' : '/(quiz)/limit-wall?feature=pvp')
  }

  const startSolo = async (topic: string) => {
    const allowed = await checkEligibility('solo')
    router.push(allowed ? `/(quiz)/${topic}` : '/(quiz)/limit-wall?feature=solo')
  }

  return (
    <View className="flex-1 bg-void px-6 pt-16">
      <Text variant="display" className="text-white mb-1">Quiz Hub</Text>
      <Text variant="body" className="text-white/50 mb-6">Play solo at your pace, or battle a random opponent.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable onPress={startPvp}>
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, padding: 20, marginBottom: 16 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <Swords size={24} color={colors.white} />
                <View>
                  <Text variant="heading" className="text-white">PvP Battle</Text>
                  <Text variant="caption" className="text-white/80">Random opponent · head to head</Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.white} />
            </View>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => startSolo('all')}
          className="bg-iris/20 rounded-2xl p-5 mb-6 flex-row items-center justify-between"
          style={{ borderWidth: 1, borderColor: colors.iris }}
        >
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Zap size={22} color={colors.iris} />
            <View>
              <Text variant="heading" className="text-white">Mixed Quiz</Text>
              <Text variant="caption" className="text-white/50">6 random questions, all topics</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.white} />
        </Pressable>

        <Text variant="heading" className="text-white/60 mb-3">Solo by Topic</Text>
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            onPress={() => startSolo(topic.slug)}
            className="bg-surface2 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
          >
            <Text variant="heading" style={{ color: colors[TOPIC_COLORS[topic.slug] ?? DEFAULT_TOPIC_COLOR] }}>{topic.label}</Text>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}
```

(Only the three `onPress` handlers change — `startPvp`/`startSolo` replace the direct `router.push(...)` calls; everything else, including all styling/JSX structure, is unchanged.)

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before, no new ones.

- [ ] **Step 4: Commit**

```bash
cd app
git add "app/(tabs)/quiz.tsx"
git commit -m "feat: gate quiz hub entry points behind the guest eligibility check"
```

---

## Task 8: Frontend — `useGuestCardLimit` hook

**Files:**
- Create: `app/src/features/feed/hooks/useGuestCardLimit.ts`
- Test: `app/src/features/feed/hooks/__tests__/useGuestCardLimit.test.ts`

- [ ] **Step 1: Read the current auth store to confirm `isGuest` shape**

Read `app/src/features/auth/store.ts` and confirm `useAuthStore` exposes a boolean `isGuest` field (used below to gate tracking — only guests are limited).

- [ ] **Step 2: Write the failing tests**

Create `app/src/features/feed/hooks/__tests__/useGuestCardLimit.test.ts`:

```ts
import { renderHook, waitFor, act } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useGuestCardLimit } from '../useGuestCardLimit'
import { useAuthStore } from '@/features/auth/store'

beforeEach(async () => {
  await AsyncStorage.clear()
  useAuthStore.setState({ isGuest: true })
})

test('is not blocked below the limit, and ignores non-guests entirely', async () => {
  useAuthStore.setState({ isGuest: false })
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 15; i++) result.current.recordView(`card-${i}`) })

  expect(result.current.isBlocked).toBe(false) // never blocked — not a guest
})

test('becomes blocked once a guest has viewed 10 distinct cards', async () => {
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 10; i++) result.current.recordView(`card-${i}`) })

  await waitFor(() => expect(result.current.isBlocked).toBe(true))
})

test('viewing the same card repeatedly only counts once', async () => {
  const { result } = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(result.current.isBlocked).toBe(false))

  act(() => { for (let i = 0; i < 20; i++) result.current.recordView('same-card') })

  expect(result.current.isBlocked).toBe(false)
})

test('persists the viewed count across a remount (AsyncStorage)', async () => {
  const first = renderHook(() => useGuestCardLimit())
  await waitFor(() => expect(first.result.current.isBlocked).toBe(false))
  act(() => { for (let i = 0; i < 10; i++) first.result.current.recordView(`card-${i}`) })
  await waitFor(() => expect(first.result.current.isBlocked).toBe(true))

  const second = renderHook(() => useGuestCardLimit())

  await waitFor(() => expect(second.result.current.isBlocked).toBe(true))
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd app && npx jest useGuestCardLimit -v`
Expected: FAIL — `useGuestCardLimit` module doesn't exist yet.

- [ ] **Step 4: Implement the hook**

Create `app/src/features/feed/hooks/useGuestCardLimit.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/features/auth/store'

const STORAGE_KEY = 'factora.guestCardsViewed'
const LIMIT = 10

export function useGuestCardLimit() {
  const isGuest = useAuthStore((s) => s.isGuest)
  const [viewedIds, setViewedIds] = useState<string[]>([])

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setViewedIds(JSON.parse(raw))
    })
  }, [])

  const recordView = useCallback((cardId: string) => {
    if (!isGuest) return
    setViewedIds((prev) => {
      if (prev.includes(cardId) || prev.length >= LIMIT) return prev
      const next = [...prev, cardId]
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [isGuest])

  return { isBlocked: isGuest && viewedIds.length >= LIMIT, recordView }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd app && npx jest useGuestCardLimit -v`
Expected: PASS (all 4 tests)

- [ ] **Step 6: Commit**

```bash
cd app
git add src/features/feed/hooks/useGuestCardLimit.ts src/features/feed/hooks/__tests__/useGuestCardLimit.test.ts
git commit -m "feat: add useGuestCardLimit hook for the guest feed card cap"
```

---

## Task 9: Frontend — wire the feed screen to the card limit

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

No isolated test — thin rendering glue over `useGuestCardLimit` (already tested in Task 8) and `GuestLimitWall` (Task 6). Verified manually in Task 10.

- [ ] **Step 1: Read the current file to confirm assumptions**

Read `app/app/(tabs)/index.tsx` and confirm it still uses `Animated.FlatList` with a Reanimated `useAnimatedScrollHandler` for `scrollY`, and has no `onViewableItemsChanged`/`viewabilityConfig` props yet.

- [ ] **Step 2: Rewrite the screen**

Replace `app/app/(tabs)/index.tsx` entirely:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Pressable, useWindowDimensions } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import { Skeleton, Text } from '@/shared/components'
import { FactCard } from '@/features/feed/components/FactCard'
import { useFeed } from '@/features/feed/hooks/useFeed'
import { useGuestCardLimit } from '@/features/feed/hooks/useGuestCardLimit'
import { useCategories } from '@/features/explore/hooks/useCategories'
import { GuestLimitWall } from '@/features/auth/components/GuestLimitWall'
import { FactCard as FactCardType } from '@/shared/types'
import { colors } from '@/shared/theme/colors'

export default function Home() {
  const { cards, currentTopic, isLoading, fetchCards } = useFeed()
  const { topics } = useCategories()
  const { isBlocked, recordView } = useGuestCardLimit()
  const [containerHeight, setContainerHeight] = useState(0)
  const { height } = useWindowDimensions()
  const scrollY = useSharedValue(0)

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y
  })

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: FactCardType }[] }) => {
      viewableItems.forEach((vi) => recordView(vi.item.id))
    },
  ).current
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current

  useEffect(() => {
    fetchCards(currentTopic)
  }, [currentTopic])

  const pageHeight = containerHeight || height
  const activeTopic = topics.find((t) => t.slug === currentTopic)

  if (isBlocked) {
    return <GuestLimitWall feature="cards" />
  }

  return (
    <View
      className="flex-1 bg-void"
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {activeTopic && (
        <Pressable
          onPress={() => fetchCards('all')}
          className="absolute self-center flex-row items-center rounded-full px-4 py-2 bg-void/80 border border-white/15"
          style={{ top: 56, zIndex: 10, gap: 6 }}
        >
          <Text variant="caption" className="text-white">{activeTopic.label}</Text>
          <X size={12} color={colors.white} />
        </Pressable>
      )}

      {isLoading || containerHeight === 0 ? (
        <View className="flex-1 justify-center px-6" style={{ gap: 16 }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={120} />
          <Skeleton height={16} width="80%" />
          <Skeleton height={16} width="40%" />
        </View>
      ) : (
        <Animated.FlatList<FactCardType>
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }: { item: FactCardType; index: number }) => (
            <View style={{ height: pageHeight }}>
              <FactCard card={item} topics={topics} progress={(index + 1) / cards.length} index={index} scrollY={scrollY} pageHeight={pageHeight} />
            </View>
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={pageHeight}
          decelerationRate="fast"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        />
      )}
    </View>
  )
}
```

(Changes: new `useGuestCardLimit`/`GuestLimitWall` imports, the `isBlocked` early-return, and the new `onViewableItemsChanged`/`viewabilityConfig` props on `Animated.FlatList` — wrapped in `useRef` per React Native's requirement that these two props not change identity across renders. Everything else, including the existing `scrollHandler`/Reanimated setup, is untouched; both scroll-tracking mechanisms coexist independently on the same list.)

- [ ] **Step 3: Typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: same single pre-existing unrelated error as before, no new ones.

- [ ] **Step 4: Run the full frontend test suite**

Run: `cd app && npx jest`
Expected: PASS (all suites, old and new)

- [ ] **Step 5: Commit**

```bash
cd app
git add "app/(tabs)/index.tsx"
git commit -m "feat: block the feed behind GuestLimitWall once a guest hits the 10-card cap"
```

---

## Task 10: Manual end-to-end verification

**Files:** none — verification only, no code changes.

- [ ] **Step 1: Start all three services**

```bash
cd service/spring && SPRING_PROFILES_ACTIVE=local mvn spring-boot:run
```
```bash
cd service/go && PORT=8090 SPRING_BASE_URL=http://localhost:8080 INTERNAL_SECRET=internal-secret-placeholder WS_BASE_URL=ws://<your-lan-ip>:8090 go run ./cmd/server
```
(Using port 8090 for Go, matching the port-conflict workaround already in place from the P2P/Google-login work this session — Metro's dev server needs 8081.)

- [ ] **Step 2: Start the Expo dev client**

```bash
cd app && npx expo run:android
```
(A custom dev client build is required, not Expo Go, since Google Sign-In needs native modules — already set up from the Google Sign-In work.)

- [ ] **Step 3: Verify the solo quiz limit**

Log in as a fresh guest. Play and finish 5 solo quizzes (any topic or Mixed Quiz). Confirm:
- Quizzes 1–5 play normally.
- Attempting a 6th (tap any solo entry point) immediately shows the `GuestLimitWall` ("You've played 5 free quizzes") instead of starting the quiz — no wasted `/quiz/start` round-trip the user has to wait on.

- [ ] **Step 4: Verify the PvP limit**

As the same guest (still under the solo limit doesn't matter — PvP is tracked separately), play one PvP match to completion (use the Node script from the earlier P2P plan to simulate the opponent, or two devices). Confirm:
- Tapping "PvP Battle" a second time shows the `GuestLimitWall` ("You've used your free PvP match") instead of entering matchmaking.

- [ ] **Step 5: Verify the card feed limit**

As a fresh guest (new guest login, to reset all limits), scroll through the home feed. Confirm:
- The feed works normally for the first 10 distinct cards.
- After the 10th card has scrolled into view, the feed is replaced by `GuestLimitWall` ("You've seen 10 free cards").

- [ ] **Step 6: Verify the merge — new Google account**

From any of the three limit walls, tap "Sign in with Google" using a Google account that has **never** signed into this app before. Confirm:
- Native picker appears, sign-in completes, app lands on the home tab.
- Profile screen shows the guest's prior XP/level/streak (not reset to zero).
- `GET /quiz/history` (or the Profile screen's quiz history, if surfaced there) shows the guest's prior quiz results.
- The card feed is no longer blocked (fresh, non-guest account).

- [ ] **Step 7: Verify the merge — pre-existing Google account**

Log in as a guest again (fresh `guestId`), hit any limit, then sign in with a Google account that **already has** its own progress from a previous session (e.g., the account used in Step 6). Confirm:
- Sign-in completes normally.
- Profile shows the *existing* Google account's progress, unchanged — not overwritten by the guest session's (discarded) data.

- [ ] **Step 8: Report results**

Note any bugs or unexpected behavior found — this step doesn't get committed, it's just closing the loop with whoever's driving execution. Stop and report rather than silently working around anything that looks like a real bug in the implementation (not a test-script issue).
