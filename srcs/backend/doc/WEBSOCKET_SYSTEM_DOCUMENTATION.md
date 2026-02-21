# WebSocket System - Documentation

## Overview

The WebSocket system provides real-time, bidirectional communication between the server and all connected clients. Built on top of **Socket.IO** and **NestJS Gateways**, it powers three critical features of the platform simultaneously: live Pong game state synchronization, user online/offline presence tracking, and instant social notifications (friend requests, acceptances, removals, and game invitations).

A single `GameGateway` instance handles all WebSocket traffic, making it the real-time backbone of the entire application. Any service that needs to push data to a client — without that client polling — injects the gateway and calls `sendNotification()`.

---

## System Architecture Diagram

The following Mermaid diagram illustrates the overall module structure and the flow of responsibility across the WebSocket system.

```mermaid
graph TD
    subgraph "NestJS Application"
        GM["GatewayModule @Global"]
        GG[GameGateway]
        FS[FriendsService]
    end

    subgraph "In-Memory State"
        US["userSockets — Map(userId, socketId)"]
        QU["queues — Map(mode, Socket[])"]
        GA["games — Map(roomId, GameState)"]
    end

    subgraph "External"
        SIO[Socket.IO Server]
        DB[(PostgreSQL)]
        FE[Frontend Clients]
    end

    GM --> GG
    GM -->|exports| FS
    GG --> US
    GG --> QU
    GG --> GA
    GG --> SIO
    SIO <-->|WebSocket ws://| FE
    GG -->|insert_full_match_result| DB
    FS -->|sendNotification| GG

    style GM fill:#f96,stroke:#333,stroke-width:2px
    style GG fill:#dfd,stroke:#333,stroke-width:2px
    style FS fill:#bbf,stroke:#333,stroke-width:2px
    style DB fill:#ffd,stroke:#333,stroke-width:2px
```

---

## Flow Diagrams

### 1. Connection & Presence

The following diagram illustrates the sequence of operations when a client connects and disconnects, and how presence is broadcast to all other clients.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant GG as GameGateway
    participant ALL as All Clients

    Note over FE, GG: Phase 1: Connection
    FE->>GG: WS Handshake (?userId=42)
    GG->>GG: userSockets.set(42, socket.id)
    GG->>GG: socket.join("user_42")
    GG->>GG: socket.data.userId = 42
    GG-->>ALL: emit('user_status', {userId:42, status:'online'})

    Note over FE, GG: Phase 2: Disconnection
    FE->>GG: Connection closed
    alt Active socket disconnects
        GG->>GG: userSockets.delete(42)
        GG-->>ALL: emit('user_status', {userId:42, status:'offline'})
    else Stale tab closes
        GG->>GG: Log "stale socket" and ignore
    end
```

---

### 2. Matchmaking Queue

The following diagram illustrates the sequence of operations when two players join the matchmaking queue and a match is found.

```mermaid
sequenceDiagram
    participant PA as Player A
    participant GG as GameGateway
    participant PB as Player B
    participant DB as PostgreSQL

    PA->>GG: emit('join_queue', {mode, nickname})
    GG->>GG: Queue empty — push A
    GG-->>PA: emit('waiting_for_match')

    PB->>GG: emit('join_queue', {mode, nickname})
    GG->>GG: Queue has A — pop A
    GG->>DB: Validate mode exists
    GG->>DB: findPlayerByNick(A)
    GG->>DB: findPlayerByNick(B)
    DB-->>GG: Player DB records
    GG->>GG: roomId = UUID
    GG->>GG: A.join(roomId), B.join(roomId)
    GG->>GG: startGameLoop(roomId)
    GG-->>PA: emit('match_found', {side:'left', opponent:B})
    GG-->>PB: emit('match_found', {side:'right', opponent:A})
```

---

### 3. Game Loop & Physics

The following diagram illustrates the server-authoritative game loop, physics updates, and paddle input handling.

```mermaid
sequenceDiagram
    participant GG as GameGateway setInterval 16ms
    participant ROOM as Room 2 Players
    participant PX as Player X

    Note over GG, ROOM: Phase 1: Startup Grace (3500ms)
    GG->>GG: Date.now() < physicsStartTime — skip
    GG->>GG: Date.now() < physicsStartTime — skip

    Note over GG, ROOM: Phase 2: Live Physics
    loop Every 16ms (~60 FPS)
        GG->>GG: Move ball (x+=vx, y+=vy)
        GG->>GG: Bounce off top/bottom walls
        GG->>GG: Sweep-test paddle collision (anti-tunnel)
        GG->>GG: Increment speed on hit x1.02
        GG-->>ROOM: emit('game_update_physics', {ball, score, paddles})
    end

    PX->>GG: emit('paddle_move', {roomId, y})
    GG->>GG: Clamp y to [0.0 - 1.0]
    GG->>GG: Verify client is room participant
    GG->>GG: state.paddles.left or right = y
```

---

### 4. Game Termination

The following diagram illustrates the three termination paths a match can follow and the shared database persistence step.

```mermaid
graph TD
    subgraph "Termination Triggers"
        T1[Score reaches MAX 5]
        T2[Client emits finish_game]
        T3[Player disconnects mid-game]
    end

    subgraph "Shared Path"
        SAVE[saveMatchToDb]
        SL[stopGameLoop — clearInterval + delete from map]
    end

    subgraph "Database"
        DB[(insert_full_match_result)]
    end

    subgraph "Client Notification"
        GO[emit game_over to room]
        OD[emit opponent_disconnected]
        LV[All sockets leave room]
    end

    T1 -->|checkWinner| SAVE
    T2 -->|handleFinishGame| SAVE
    T3 -->|handleDisconnect| SL

    SAVE --> DB
    SAVE --> SL
    DB -.->|Skipped if score 0-0| SAVE

    SL --> GO
    T1 -->|500ms delay| GO
    T2 --> LV
    T3 --> OD

    style T1 fill:#dfd,stroke:#333,stroke-width:2px
    style T2 fill:#bbf,stroke:#333,stroke-width:2px
    style T3 fill:#f96,stroke:#333,stroke-width:2px
    style SAVE fill:#ffd,stroke:#333,stroke-width:2px
    style DB fill:#ffd,stroke:#333,stroke-width:2px
```

---

### 5. Social Notifications

The following diagram illustrates how `FriendsService` uses the gateway to deliver real-time notifications to users for friend requests, acceptances, and removals.

```mermaid
sequenceDiagram
    participant UA as User A (Actor)
    participant FS as FriendsService
    participant GG as GameGateway
    participant UB as User B (Target)

    Note over UA, UB: Friend Request
    UA->>FS: POST /friends/request (targetId=B)
    FS->>FS: INSERT PLAYER_FRIEND pending
    FS->>GG: sendNotification(B, 'friend_request', {from:A})
    GG-->>UB: emit('friend_request', {from:A})

    Note over UA, UB: Accept Request
    UB->>FS: POST /friends/accept (targetId=A)
    FS->>FS: DELETE pending row, INSERT accepted row
    FS->>GG: sendNotification(A, 'friend_accepted', {friendId:B})
    GG-->>UA: emit('friend_accepted', {friendId:B})
    FS->>GG: sendNotification(B, 'friend_accepted', {friendId:A})
    GG-->>UB: emit('friend_accepted', {friendId:A})

    Note over UA, UB: Remove Friend
    UA->>FS: DELETE /friends/remove (targetId=B)
    FS->>FS: DELETE PLAYER_FRIEND row
    FS->>GG: sendNotification(B, 'friend_removed', {from:A})
    GG-->>UB: emit('friend_removed', {from:A})
    FS->>GG: sendNotification(A, 'friend_removed', {from:B})
    GG-->>UA: emit('friend_removed', {from:B})
```

---

### 6. Private Game Invitations

The following diagram illustrates the sequence of operations for sending and accepting a private game invitation between two users.

```mermaid
sequenceDiagram
    participant S as Sender
    participant GG as GameGateway
    participant T as Target
    participant DB as PostgreSQL

    S->>GG: emit('send_game_invite', {targetId})
    GG->>GG: Is target in userSockets?
    alt Target offline
        GG-->>S: emit('invite_error', {msg})
    else Target online
        GG-->>T: emit('incoming_game_invite', {fromUserId, fromUserName, mode})
    end

    T->>GG: emit('accept_game_invite', {challengerId})
    GG->>DB: findPlayerById(challengerId)
    GG->>DB: findPlayerById(acceptorId)
    DB-->>GG: Player nicks
    GG->>GG: roomId = private_CID_AID_timestamp
    GG->>GG: challenger.join(roomId), acceptor.join(roomId)
    GG->>GG: startGameLoop(roomId)
    GG-->>S: emit('match_found', {side:'left', opponent:T_nick})
    GG-->>T: emit('match_found', {side:'right', opponent:S_nick})
```

---

## Files Involved

```
srcs/backend/src/
│
├── gateway.module.ts          ← @Global NestJS module, exports GameGateway
├── game.gateway.ts            ← Core WebSocket gateway (all logic lives here)
│
└── friends/
    └── friends.service.ts     ← Injects GameGateway to send social notifications
```

---

## Module Details

### 1. `gateway.module.ts`

**Purpose:** Registers `GameGateway` as a globally available provider so any module in the application can inject it without re-importing `GatewayModule`.

```typescript
@Global()
@Module({
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
```

The `@Global()` decorator is the key design decision here. Without it, every module that needs to push real-time notifications (e.g., `FriendsModule`) would need to explicitly import `GatewayModule` in its own `@Module` imports array. With it, a single registration in `AppModule` suffices.

---

### 2. `game.gateway.ts` — In-Memory State

Three `Map` structures hold all runtime state:

| Map | Key | Value | Purpose |
|-----|-----|-------|---------|
| `userSockets` | `userId: number` | `socketId: string` | Maps a DB user ID to their active socket |
| `queues` | `mode: string` | `Socket[]` | Waiting players per game mode |
| `games` | `roomId: string` | `GameState` | Full physics state for each live match |

**`GameState` interface:**

```typescript
interface GameState {
  roomId: string;
  playerLeftDbId: number;   // DB primary key (for final INSERT)
  playerRightDbId: number;
  playerLeftId: string;     // Socket ID (for disconnect detection)
  playerRightId: string;
  ball: {
    x: number;   // 0.0 – 1.0 normalized
    y: number;
    vx: number;  // velocity per frame
    vy: number;
    speed: number;
  };
  paddles: {
    left: number;   // Y center, 0.0 – 1.0
    right: number;
  };
  score: [number, number];   // [left, right]
  stats: {
    totalHits: number;
    maxRally: number;
    startTime: Date;
  };
  intervalId?: NodeJS.Timeout;
}
```

---

### 3. Physics Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PADDLE_HEIGHT` | `0.2` | Paddle height as fraction of screen |
| `INITIAL_SPEED` | `0.01` | Starting ball speed per frame |
| `SPEED_INCREMENT` | `1.02` | Speed multiplier per paddle hit (+2%) |
| `MAX_SCORE` | `5` | Points needed to win |
| `PADDLE_MARGIN` | `0.035` | X distance of paddle face from edge |

---

### 4. `sendNotification()` — Public API

Any NestJS service that injects `GameGateway` can call this method to push arbitrary events to a specific user, regardless of how many browser tabs they have open:

```typescript
public sendNotification(targetUserId: number, event: string, payload: any) {
  // Targets the named room "user_<id>" — works across multiple tabs
  this.server.to(`user_${targetUserId}`).emit(event, payload);
}
```

**Usage from `FriendsService`:**
```typescript
constructor(private readonly gateway: GameGateway) {}

// On friend request:
this.gateway.sendNotification(targetId, 'friend_request', { from: userId });

// On accept — notifies BOTH sides:
this.gateway.sendNotification(targetId, 'friend_accepted', { friendId: userId });
this.gateway.sendNotification(userId,   'friend_accepted', { friendId: targetId });

// On remove — notifies BOTH sides:
this.gateway.sendNotification(targetId, 'friend_removed', { from: userId });
this.gateway.sendNotification(userId,   'friend_removed', { from: targetId });
```

---

### 5. `isUserOnline()` — Presence Query

A synchronous helper consumed by `FriendsService` to enrich friend list responses with live presence data:

```typescript
public isUserOnline(userId: number): boolean {
  return this.userSockets.has(userId);
}
```

**Usage in `FriendsService.getFriends()`:**
```typescript
const enrichedResult = result.map((friend: any) => ({
  ...friend,
  status: this.gateway.isUserOnline(Number(friend.friend_id)) ? 'online' : 'offline'
}));
```

This avoids a round-trip to the database — presence is derived from the live in-memory map.

---

## Event Reference

### Events Received (Client → Server)

| Event | DTO / Payload | Handler | Description |
|-------|--------------|---------|-------------|
| `join_queue` | `{ mode: string, nickname: string }` | `handleJoinQueue()` | Enter matchmaking queue for a game mode |
| `paddle_move` | `{ roomId: string, y: number }` | `handlePaddleMove()` | Update paddle Y position (clamped 0–1) |
| `finish_game` | `{ roomId: string, winnerId: string }` | `handleFinishGame()` | Signal game end (forfeit or manual stop) |
| `send_game_invite` | `{ targetId: number }` | `handleSendInvite()` | Send a private game invitation |
| `accept_game_invite` | `{ challengerId: number }` | `handleAcceptInvite()` | Accept invitation and start private match |

### Events Emitted (Server → Client)

| Event | Payload | Audience | Description |
|-------|---------|----------|-------------|
| `user_status` | `{ userId, status: 'online' \| 'offline' }` | All clients | Presence broadcast on connect/disconnect |
| `waiting_for_match` | `{ message, mode }` | Queued player only | Confirms player is in the waiting queue |
| `match_found` | `{ roomId, matchId, side, opponent, ballInit }` | Both matched players | Signals start of a match, assigns sides |
| `game_update_physics` | `{ ball: {x,y}, score, paddles: {left,right} }` | Room | Authoritative game state at ~60 FPS |
| `score_updated` | `{ score: [number, number] }` | Room | Immediate score change notification on goal |
| `game_over` | `{ winner: 'left' \| 'right' }` | Room | Match ended, indicates winning side |
| `opponent_disconnected` | _(none)_ | Room | Remaining player's opponent left mid-game |
| `incoming_game_invite` | `{ fromUserId, fromUserName, mode }` | Target user | Private game invitation received |
| `invite_error` | `{ msg: string }` | Sender | Target user is offline or unreachable |
| `friend_request` | `{ from: userId, msg }` | Target user | Incoming friend request notification |
| `friend_accepted` | `{ friendId, msg }` | Both parties | Friendship confirmed notification |
| `friend_removed` | `{ from: userId, msg }` | Both parties | Friendship removed notification |

---

## Connection Lifecycle

### Frontend Connection Snippet

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  query: { userId: currentUser.id }  // ← Required for presence tracking
});

// Presence
socket.on('user_status', ({ userId, status }) => {
  updateFriendStatus(userId, status);
});

// Social
socket.on('friend_request',  (data) => showNotification(data));
socket.on('friend_accepted', (data) => refreshFriendList());
socket.on('friend_removed',  (data) => refreshFriendList());

// Game invitation
socket.on('incoming_game_invite', (data) => showInviteModal(data));
```

### Multi-Tab Handling

A deliberate guard prevents a closing stale tab from marking a user as offline when they have another tab still open:

```typescript
handleDisconnect(client: Socket) {
  const currentSocketId = this.userSockets.get(userId);

  // Only act if THIS socket is the registered active one
  if (currentSocketId === client.id) {
    this.userSockets.delete(userId);
    this.server.emit('user_status', { userId, status: 'offline' });
  }
  // Otherwise: stale tab — ignore.
}
```

The `user_<id>` room (joined in `handleConnection`) ensures that if a user does have two tabs, any targeted notification via `sendNotification()` reaches both tabs simultaneously.

---

## Database Persistence

When a match concludes (by score, forfeit, or disconnect), `saveMatchToDb()` calls the PostgreSQL stored function `insert_full_match_result`, which atomically writes to three tables: `MATCH`, `COMPETITOR`, and `METRICS`.

```typescript
await this.db.execute(sql`
  SELECT insert_full_match_result(
    ${MODE_REMOTE_ID}::smallint,
    ${state.stats.startTime.toISOString()}::timestamp,
    ${durationMs}::integer,
    ${winnerPk}::integer,
    ${state.playerLeftDbId}::integer,
    ${state.score[0]}::float,
    ${state.playerRightDbId}::integer,
    ${state.score[1]}::float,
    ${state.stats.totalHits}::float
  )
`);
```

**Edge cases handled:**
- `score[0] === 0 && score[1] === 0` → skipped (no meaningful data)
- Tie (simultaneous disconnect) → left player assigned as fallback winner
- DB error → logged, does not crash the gateway

---

## Security Considerations

### Input Validation

All incoming WebSocket message bodies are validated through NestJS `ValidationPipe` with `whitelist: true`, applied at the gateway class level:

```typescript
@UsePipes(new ValidationPipe({ whitelist: true }))
@WebSocketGateway({ ... })
export class GameGateway { ... }
```

This means any property not declared in the DTO is silently stripped before reaching the handler.

### Coordinate Clamping

Paddle positions sent by clients are sanitized server-side before being applied to game state:

```typescript
newY = Math.max(0, Math.min(1, newY));
```

This prevents a client from teleporting their paddle outside the valid range, regardless of what the frontend sends.

### No Unauthenticated Game State Modification

Handlers verify that the requesting socket is actually a participant of the target room before applying changes:

```typescript
if (client.id === game.playerLeftId) {
  game.paddles.left = newY;
} else if (client.id === game.playerRightId) {
  game.paddles.right = newY;
}
// Otherwise: silently ignored
```

### CORS

Currently set to `origin: '*'` for development. Should be restricted to the frontend origin in production.

---

## Performance

### Broadcasting Strategy

| Scenario | Method | Scope |
|----------|--------|-------|
| Game physics (~60 FPS) | `server.to(roomId).emit(...)` | Room (2 players) |
| Score update | `server.to(roomId).emit(...)` | Room (2 players) |
| Presence change | `server.emit(...)` | All connected clients |
| Notification | `server.to("user_X").emit(...)` | Specific user's room |

Physics updates are intentionally scoped to `roomId` rooms — a broadcast that reaches only the two players in a match, not every connected user on the platform.

### Game Loop Timing

A 3,500 ms grace period before physics processing begins allows both clients to render the countdown animation before the ball starts moving. After that, the server loop runs at 16 ms intervals (~60 FPS) and the client renders whatever state arrives.

---

## Troubleshooting

### Issue: User appears offline immediately after reconnecting

**Cause:** The new socket's ID may have been registered before the old socket's disconnect fired.  
**Check:** Confirm the guard `currentSocketId === client.id` is in place in `handleDisconnect()`. The multi-tab logic handles this automatically.

### Issue: Notifications not received

**Check:**
1. Is `userId` being passed in the connection query? (`io(URL, { query: { userId } })`)
2. Is the user's socket in `userSockets` map? (Check gateway logs for `✅ Cliente conectado`)
3. Was the `@Global()` decorator applied to `GatewayModule`? Without it, the injected gateway in `FriendsService` may be a different instance.

### Issue: Game physics desync between players

**Check:**
1. Is the client using `websocket` transport only? Polling introduces variable latency.
2. Does the client render `game_update_physics` events immediately without extra interpolation delay?

### Issue: Match not saved to database after game ends

**Check:**
1. Did both players have valid entries in the `player` table when the match started?
2. Was the final score `0-0`? Those are intentionally skipped.
3. Check backend logs for `❌ Error guardando partida en DB`.

---

## Testing Checklist

### Connection
- [ ] Client connects with `userId` query param and appears online
- [ ] `user_status { online }` broadcast received by other clients
- [ ] Client disconnects and `user_status { offline }` is broadcast
- [ ] Closing one of two open tabs does not trigger `offline` event

### Matchmaking
- [ ] First player to join receives `waiting_for_match`
- [ ] Second player triggers `match_found` for both
- [ ] `side: 'left'` and `side: 'right'` are assigned correctly
- [ ] Joining the same mode twice does not match a player against themselves

### Game Physics
- [ ] Ball position updates arrive at ~60 FPS
- [ ] Ball bounces off top and bottom walls
- [ ] Paddle hit redirects ball with angle variation
- [ ] Ball speed increases after each paddle hit
- [ ] Scoring increments correct player's score
- [ ] `score_updated` fires on each goal
- [ ] Game ends when a player reaches 5 points
- [ ] `game_over` fires 500 ms after final point

### Disconnection Mid-Game
- [ ] `opponent_disconnected` event received by remaining player
- [ ] Game loop stops and room is cleaned up

### Social Notifications
- [ ] `friend_request` received by target immediately after POST
- [ ] `friend_accepted` received by **both** parties
- [ ] `friend_removed` received by **both** parties

### Game Invitations
- [ ] `incoming_game_invite` received by online target
- [ ] `invite_error` sent to sender if target is offline
- [ ] Accepting invite starts a private match with correct sides

---

## Future Enhancements

1. **JWT Authentication** — Validate a token during the WebSocket handshake instead of trusting `userId` from the query string
2. **Reconnection Recovery** — Allow a disconnected player to rejoin an active match within a grace period
3. **Spectator Mode** — Let other users join a room as read-only observers
4. **Tournament Bracket Sync** — Emit bracket updates in real time as matches conclude
5. **Rate Limiting** — Throttle `paddle_move` events per socket to prevent abuse
6. **Redis Adapter** — Replace in-memory Maps with a Redis adapter to support horizontal scaling across multiple server instances

---

## Summary

The WebSocket system is the real-time nervous system of the platform. A single `GameGateway` class serves three responsibilities at once — presence tracking, game state synchronization, and social event delivery — without any polling or page refreshes on the client side.

- ✅ **Real-time** — All game, presence and social events arrive in under a network round-trip
- ✅ **Authoritative** — Server owns the game state; clients send intent only
- ✅ **Resilient** — Multi-tab, stale socket, and mid-game disconnect cases are all handled
- ✅ **Efficient** — Physics broadcasts are scoped to 2-player rooms, not the full user base
- ✅ **Extensible** — Any service can push notifications via the injected `sendNotification()` API
- ✅ **Validated** — All incoming payloads pass through `ValidationPipe` with whitelisting

**Core files:** 2  
**Events handled:** 5 inbound, 11 outbound  
**Transport:** WebSocket (no polling)  
**Game loop:** ~60 FPS, server-authoritative

**Result:** Production-grade real-time infrastructure powering gameplay, presence, and social interactions simultaneously. 🎮

[Return to Main modules table](../../../README.md#modules)