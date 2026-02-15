# Pong Game - Frontend Documentation

## Executive Summary

The frontend implementation establishes a high-performance, multi-mode Pong game architecture supporting three distinct gameplay flavors: local player-versus-player (PvP), local player-versus-AI (PvIA), and remote networked multiplayer. By leveraging TypeScript class-based models for game entities and React functional components for rendering, the system achieves deterministic physics simulation for local modes while seamlessly integrating WebSocket-driven server-authoritative gameplay for remote sessions.

The architecture is meticulously structured to decouple rendering concerns from game logic, ensuring that ball trajectory calculations, paddle collision detection, and input handling remain modular and testable. Real-time synchronization employs a hybrid "Trust Local + Interpolate Remote" strategy to minimize perceived latency while maintaining competitive integrity.

---

## System Architecture Overview

### Component Hierarchy Diagram

```mermaid
graph TD
    subgraph "React Layer"
        PS[PongScreen.tsx] --> Canvas[Canvas.tsx]
        Canvas --> CanvasRef[Canvas Ref]
    end

    subgraph "Game Engine Layer"
        Canvas --> Pong[Pong.ts]
        Pong --> Player1[Player.ts - P1]
        Pong --> Player2[Player.ts - P2]
        Pong --> Ball[Ball.ts]
    end

    subgraph "Input System"
        Window[Window Events] --> KeyHandler[Keyboard Handler]
        KeyHandler --> Pong
    end

    subgraph "Network Layer (Remote Mode Only)"
        Socket[SocketService] --> Canvas
        Canvas -->|paddle_move| Socket
        Socket -->|game_update_physics| Canvas
        Socket -->|game_over| Canvas
    end

    subgraph "Rendering Pipeline"
        CanvasRef --> CTX[2D Context]
        Pong --> RenderLoop[requestAnimationFrame]
        RenderLoop --> Draw[draw methods]
        Draw --> CTX
    end

    style Pong fill:#dfd,stroke:#333,stroke-width:2px
    style Ball fill:#fdd,stroke:#333,stroke-width:2px
    style Socket fill:#bbf,stroke:#333,stroke-width:2px
```

---

## Game Mode Comparison

| Mode | Physics Calculation | Input Handling | Score Management | Network |
|------|-------------------|----------------|------------------|---------|
| **local** (PvP) | Client-side (`Ball.update`) | P1: W/S, P2: Arrow Keys | Client-side | None |
| **ia** (PvIA) | Client-side (`Ball.update`) | Player: W/S or Arrows, AI: `moveIA` | Client-side | None |
| **remote** / **tournament** | Server-side (60 FPS) | Client sends normalized Y | Server-authoritative | WebSocket |

---

## Sequence Diagrams

### Local Mode (PvP) - Complete Game Flow

```mermaid
sequenceDiagram
    participant User1 as Player 1 (W/S)
    participant User2 as Player 2 (Arrows)
    participant Canvas as Canvas.tsx
    participant Pong as Pong.ts
    participant Ball as Ball.ts
    participant P1 as Player.ts (P1)
    participant P2 as Player.ts (P2)

    Note over Canvas,Ball: Initialization
    Canvas->>Pong: new Pong(mode='local')
    Pong->>P1: new Player('userName', x=20)
    Pong->>P2: new Player('Invitado', x=770)
    Pong->>Ball: new Ball(canvas)
    Ball->>Ball: setLocalDirection()

    Note over Canvas,Ball: Game Loop (60 FPS)
    loop requestAnimationFrame
        User1->>Canvas: keydown 'w' / 's'
        User2->>Canvas: keydown 'ArrowUp' / 'ArrowDown'
        Canvas->>Pong: update()
        Pong->>Pong: handleLocalInput(p1, 'w', 's')
        Pong->>P1: moveUp() / moveDown()
        Pong->>Pong: handleLocalInput(p2, 'ArrowUp', 'ArrowDown')
        Pong->>P2: moveUp() / moveDown()
        Pong->>Ball: update([p1, p2])
        Ball->>Ball: x += vx, y += vy
        Ball->>Ball: wallCollision()
        Ball->>Ball: checkPaddleCollision(p1, p2)
        alt Ball hits paddle
            Ball->>Ball: handlePaddleHit(player, angle)
            Ball->>Ball: Increase speed
        end
        Ball->>Ball: goal()
        alt Ball exits screen
            Ball->>Ball: score[i]++
            Ball->>Ball: resetLocal()
        end
        Pong->>Pong: checkLocalWin()
        alt score >= maxScore
            Pong->>Pong: winner = playerName, end = true
            Canvas->>Canvas: showModal("Game Over")
        end
        Canvas->>Pong: draw()
        Pong->>P1: draw(ctx)
        Pong->>P2: draw(ctx)
        Pong->>Ball: draw(ctx)
    end
```

### AI Mode - AI Movement Logic

```mermaid
sequenceDiagram
    participant User as Player (Human)
    participant Canvas as Canvas.tsx
    participant Pong as Pong.ts
    participant P1 as Player.ts (Human)
    participant P2 as Player.ts (AI)
    participant Ball as Ball.ts

    Note over Pong,Ball: AI Update Cycle
    loop Every Frame
        User->>Canvas: keydown input
        Canvas->>Pong: update()
        Pong->>P1: handleLocalInput(w/s or arrows)
        Pong->>P2: moveIA(ball.y)
        P2->>P2: Calculate center = y + height/2
        P2->>P2: diff = ballPosition - center
        alt abs(diff) < 10px
            P2->>P2: No movement (zona muerta)
        else abs(diff) > speedIA
            P2->>P2: y += speedIA * sign(diff)
        else
            P2->>P2: y += diff (exact alignment)
        end
        P2->>P2: clampY()
        Pong->>Ball: update([p1, p2])
    end
```

### Remote Mode - WebSocket Synchronization

```mermaid
sequenceDiagram
    participant P1 as Player 1 Browser
    participant Canvas1 as Canvas.tsx (P1)
    participant Socket as WebSocket
    participant Server as GameGateway.ts
    participant Canvas2 as Canvas.tsx (P2)
    participant P2 as Player 2 Browser

    Note over P1,P2: Match Initialization
    P1->>Socket: join_queue({mode, nickname})
    P2->>Socket: join_queue({mode, nickname})
    Server->>Server: Create roomId, initialize GameState
    Server->>Canvas1: match_found({side: 'left', opponent})
    Server->>Canvas2: match_found({side: 'right', opponent})
    
    Note over P1,P2: Game Loop (60 FPS Server)
    loop Every 16.67ms (Server Interval)
        P1->>Canvas1: Keyboard input
        Canvas1->>Canvas1: myPlayer.moveUp/Down() (local prediction)
        Canvas1->>Canvas1: Calculate myNormalizedY
        Canvas1->>Socket: paddle_move({roomId, y: 0.0-1.0})
        Socket->>Server: Update game.paddles.left
        
        P2->>Canvas2: Keyboard input
        Canvas2->>Canvas2: myPlayer.moveUp/Down() (local prediction)
        Canvas2->>Socket: paddle_move({roomId, y: 0.0-1.0})
        Socket->>Server: Update game.paddles.right
        
        Server->>Server: updateBallPhysics()
        Server->>Server: checkCollisions()
        Server->>Server: updateScore()
        
        Server->>Socket: game_update_physics({ball, paddles, score})
        Socket->>Canvas1: Receive update
        Canvas1->>Canvas1: ball.sync(pixelX, pixelY)
        Canvas1->>Canvas1: player2.y LERP interpolation (opponent)
        
        Socket->>Canvas2: Receive update
        Canvas2->>Canvas2: ball.sync(pixelX, pixelY)
        Canvas2->>Canvas2: player1.y LERP interpolation (opponent)
    end

    alt Game Ends
        Server->>Socket: game_over({winner})
        Socket->>Canvas1: Display winner modal
        Socket->>Canvas2: Display winner modal
    end
```

---

## State Machine Diagrams

### Game State Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: Canvas mounted
    Initializing --> CountdownWait: isGameActive = false
    CountdownWait --> Playing: isGameActive = true
    
    Playing --> Paused: Space pressed (local only)
    Paused --> Playing: Space pressed again
    
    Playing --> BallReset: Goal scored
    BallReset --> WaitingServe: waiting = true
    WaitingServe --> Playing: 1 second delay
    
    Playing --> GameOver: score >= maxScore
    GameOver --> [*]: Cleanup & dispatch MENU
    
    Playing --> OpponentDisconnected: Remote disconnect
    OpponentDisconnected --> [*]: Cleanup
    
    note right of Playing
        Active game loop:
        - Input handling
        - Physics update
        - Rendering
        - Network sync (remote)
    end note
    
    note right of CountdownWait
        Render loop active but
        game.update() blocked
        Shows static board
    end note
```

### Ball State Machine

```mermaid
stateDiagram-v2
    [*] --> Spawning: Constructor
    Spawning --> Waiting: waiting = true
    Waiting --> InitialServe: setLocalDirection()
    InitialServe --> Moving: waiting = false
    
    Moving --> WallBounce: y < 0 or y > height
    WallBounce --> Moving: vy inverted
    
    Moving --> PaddleHit: Collision detected
    PaddleHit --> SpeedIncrease: firstHit = false
    SpeedIncrease --> AngleCalculation: Compute normalizedIntersect
    AngleCalculation --> Moving: New vx, vy set
    
    Moving --> Goal: x < -radius or x > width + radius
    Goal --> ScoreUpdate: score[i]++
    ScoreUpdate --> Waiting: resetLocal()
    
    note right of Moving
        Position: x += vx, y += vy
        Collision checks every frame
    end note
    
    note right of PaddleHit
        Speed: min(speed + 0.4, maxSpeed)
        Angle: normalized * maxAngle
    end note
```

---

## Data Flow Diagrams

### Local Mode Data Flow

```mermaid
graph LR
    subgraph "Input Layer"
        KB[Keyboard Events] --> KP[keysPressed Object]
    end
    
    subgraph "Update Cycle"
        KP --> HLI[handleLocalInput]
        HLI --> PM[Player.moveUp/Down]
        PM --> PY[Player.y position]
        
        PY --> BU[Ball.update]
        BU --> BC[Ball Collision Logic]
        BC --> BVX[Ball.vx, Ball.vy]
        BVX --> BXY[Ball.x, Ball.y]
        
        BXY --> GC[Goal Check]
        GC --> SC[Score Array]
        SC --> WC[Win Check]
    end
    
    subgraph "Render Layer"
        BXY --> DR[draw methods]
        PY --> DR
        SC --> DR
        DR --> CTX[Canvas 2D Context]
    end
    
    style BU fill:#fdd,stroke:#333,stroke-width:2px
    style CTX fill:#dfd,stroke:#333,stroke-width:2px
```

### Remote Mode Data Flow

```mermaid
graph TB
    subgraph "Client Side (Player 1)"
        KB1[Keyboard] --> LP1[Local Prediction]
        LP1 --> MY1[MyPlayer.y]
        MY1 --> NORM1[Normalize to 0.0-1.0]
        NORM1 --> EMIT1[Socket.emit paddle_move]
    end
    
    subgraph "Network Layer"
        EMIT1 --> WS[WebSocket]
        WS --> SRV[Server Game Loop]
    end
    
    subgraph "Server Physics Engine"
        SRV --> PADDLES[Update paddles.left/right]
        PADDLES --> BALL_CALC[Ball Physics Calculation]
        BALL_CALC --> COLL[Collision Detection]
        COLL --> SCORE[Score Management]
        SCORE --> BROADCAST[Emit game_update_physics]
    end
    
    subgraph "Client Side (Both Players)"
        BROADCAST --> WS2[WebSocket Receive]
        WS2 --> SYNC_BALL[ball.sync pixelX, pixelY]
        WS2 --> SYNC_OPP[Opponent LERP Interpolation]
        SYNC_BALL --> DRAW1[Draw Frame]
        SYNC_OPP --> DRAW1
    end
    
    style SRV fill:#bbf,stroke:#333,stroke-width:2px
    style SYNC_BALL fill:#fdd,stroke:#333,stroke-width:2px
    style LP1 fill:#dfd,stroke:#333,stroke-width:2px
```

---

## Component Reference Documentation

### Ball.ts - Physics & Trajectory Engine

**Purpose**: Manages ball position, velocity, collision detection, and scoring logic for local game modes.

**Key Properties**:
```typescript
// Física (Necesarias para modo Local)
speed: number;           // Current scalar speed
initialSpeed: number;    // Starting speed (5)
baseSpeed: number;       // Speed after first hit (10)
maxSpeed: number;        // Speed ceiling (20)
increaseSpeed: number;   // Acceleration per hit (0.4)
vx: number;             // X velocity component
vy: number;             // Y velocity component

// Estado
firstHit: boolean;      // Triggers baseSpeed activation
waiting: boolean;       // Pauses physics during serve delay
maxAngle: number;       // Maximum reflection angle (π/4)
```

**Core Methods**:

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `constructor` | `c: HTMLCanvasElement` | - | Initializes ball at center with relative sizing (`radious = width * 0.008`), sets initial direction |
| `draw` | `ctx: CanvasRenderingContext2D` | `void` | Renders white circle at current position |
| `sync` | `x: number, y: number` | `void` | **Remote mode only**: Directly updates position from server data |
| `update` | `players: Player[] \| Player, p2?: Player` | `void` | **Local mode only**: Executes physics loop with anti-tunneling protection |
| `wallCollision` | - | `void` | Detects and reflects ball from top/bottom walls |
| `checkPaddleCollision` | `p1: Player, p2: Player, prevX: number, prevY: number` | `void` | Raycasting-based collision with position correction |
| `handlePaddleHit` | `player: Player, hitY: number, direction: number` | `void` | Calculates new velocity based on impact point |
| `goal` | - | `void` | Detects scoring events and triggers `resetLocal()` |
| `resetLocal` | - | `Promise<void>` | Async 1-second delay before serving new ball |

**Anti-Tunneling Implementation**:
```typescript
// 1. Guardar posición previa (CRUCIAL para evitar túnel)
const prevX = this.x;
const prevY = this.y;

// 2. Mover bola temporalmente
this.x += this.vx;
this.y += this.vy;

// 4. Chequear colisión con Palas usando TRAYECTORIA (No solo posición)
this.checkPaddleCollision(player1, player2, prevX, prevY);
```

**Collision Detection Strategy**:
- Uses bounding box overlap detection (AABB)
- Determines relevant paddle based on ball's half-court position
- Applies position correction to prevent phasing through paddles:
  ```typescript
  if (player === p1) {
      this.x = pRight + this.radious + 1; // Push right
  } else {
      this.x = pLeft - this.radious - 1;  // Push left
  }
  ```

**Angle Calculation**:
```typescript
// Normalizamos el impacto (-1 arriba, 0 centro, 1 abajo)
const normalizedIntersect = (hitY - paddleCenterY) / (player.getHeight() / 2);

// Limitamos ángulo
const angle = normalizedIntersect * this.maxAngle;

// Calcular nueva velocidad
this.vx = direction * this.speed * Math.cos(angle);
this.vy = this.speed * Math.sin(angle);
```

---

### Player.ts - Paddle Entity

**Purpose**: Represents a paddle with movement capabilities for human players and AI opponents.

**Key Properties**:
```typescript
nickname: string;     // Display name
x: number;           // Horizontal position (fixed)
y: number;           // Vertical position (dynamic)
width: number;       // Always 10 pixels
height: number;      // 20% of canvas height
speed: number;       // Manual movement speed (10 px/frame)
speedIA: number;     // AI movement speed (5 px/frame)
canvasHeight: number; // For boundary clamping
color: string;       // Always "white"
```

**Core Methods**:

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `constructor` | `name: string, x: number, h: number` | - | Centers paddle vertically, sets `height = h * 0.20` |
| `moveIA` | `ballPosition: number` | `void` | AI tracking with 10px dead zone to prevent oscillation |
| `moveUp` | - | `void` | Decreases `y` by `speed`, clamps to bounds |
| `moveDown` | - | `void` | Increases `y` by `speed`, clamps to bounds |
| `clampY` | - | `void` | Private boundary enforcement (`0 <= y <= canvasHeight - height`) |
| `draw` | `ctx: CanvasRenderingContext2D` | `void` | Renders white rectangle |
| `getNormalizedY` | - | `number` | Returns center position as 0.0-1.0 for server transmission |
| `setY` | `val: number` | `void` | **Remote mode**: Allows external position updates with clamping |

**AI Movement Logic**:
```typescript
moveIA(ballPosition: number) {
    const center = this.y + this.height / 2;
    const diff = ballPosition - center;

    // Zona muerta de 10px para evitar que la IA vibre si la bola está en el centro
    if (Math.abs(diff) < 10) return;

    if (Math.abs(diff) > this.speedIA)
        this.y += this.speedIA * Math.sign(diff);
    else
        this.y += diff;
    this.clampY();
}
```

**Normalized Position Calculation** (for remote sync):
```typescript
getNormalizedY(): number {
    // Posición visual (Top) + Mitad de altura = Centro
    const centerY = this.y + (this.height / 2);
    
    // Normalizamos (0.0 a 1.0)
    return centerY / this.canvasHeight;
}
```

---

### Pong.ts - Game State Manager

**Purpose**: Orchestrates game loop, input handling, mode-specific logic, and rendering coordination.

**Key Properties**:
```typescript
mode: GameMode;              // 'local' | 'ia' | 'remote' | 'tournament'
player1: Player;             // Left paddle
player2: Player;             // Right paddle
ball: Ball;
keysPressed: { [key: string]: boolean }; // Input state map
playerNumber: number;        // 1 (Left) or 2 (Right) for remote mode
score: number[];            // [P1 score, P2 score]
winner: string;             // Winner's name
maxScore: number;           // 5 points to win (local/IA only)
end: boolean;               // Game over flag
pause: boolean;             // Pause state (local modes only)
```

**Mode-Specific Input Schemes**:

| Mode | Player 1 Keys | Player 2 Keys | Notes |
|------|--------------|--------------|-------|
| `local` | W/S | Arrow Up/Down | Strict key binding |
| `ia` | W/S OR Arrow Up/Down | AI-controlled | Flexible for single player |
| `remote` / `tournament` | W/S OR Arrow Up/Down | N/A (opponent is remote) | Own paddle only |

**Core Methods**:

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `constructor` | `c, ctx, mode, n, leftPlayerName, rightPlayerName, ballInit` | - | Initializes game state, syncs ball if `ballInit` provided |
| `moveOpponent` | `dir: 'up' \| 'down' \| 'stop'` | `void` | **Remote only**: Updates opponent's paddle visually |
| `update` | - | `void` | Main game loop logic, mode-specific physics delegation |
| `handleLocalInput` | `p: Player, upKey?, downKey?` | `void` | Private input processor with mode-aware key handling |
| `checkLocalWin` | - | `void` | Private win condition checker, sets `end` and `winner` |
| `draw` | - | `void` | Rendering orchestrator, calls entity draw methods |
| `drawScore` | - | `void` | Private HUD renderer for scores and names |
| `drawPause` | - | `void` | Private pause overlay |
| `drawNet` | - | `void` | Private center line decoration |

**Update Loop Logic**:
```typescript
update() {
    if (this.pause) return;

    // 1. MODO IA (Jugar contra Bot)
    if (this.mode === 'ia') {
        this.handleLocalInput(this.player1, 'w', 's'); // Humano (Izq)
        this.handleLocalInput(this.player1, 'ArrowUp', 'ArrowDown'); // Alternativa
        
        this.player2.moveIA(this.ball.y); 

        // Física Local
        this.ball.update([this.player1, this.player2]); 
        this.checkLocalWin();
    }
    
    // 2. MODO LOCAL (1 PC, 2 Humanos)
    else if (this.mode === 'local') {
        this.handleLocalInput(this.player1, 'w', 's'); // P1: WASD
        this.handleLocalInput(this.player2, 'ArrowUp', 'ArrowDown'); // P2: Flechas
        
        // Física Local
        this.ball.update([this.player1, this.player2]);
        this.checkLocalWin();
    }

    // 3. MODO REMOTO / TORNEO (Online)
    else {
        const myPlayer = this.playerNumber === 1 ? this.player1 : this.player2;
        this.handleLocalInput(myPlayer); 
    }
}
```

---

### Canvas.tsx - React Integration & Network Orchestration

**Purpose**: Manages React lifecycle, WebSocket event handling, render loop coordination, and mode-specific initialization.

**Component Props**:
```typescript
type CanvasProps = {
    mode: GameMode;                    // Game mode selector
    dispatch: React.Dispatch<any>;     // State machine dispatcher
    userName: string;                  // Current user's name
    opponentName?: string;             // Remote opponent name
    ballInit: { x: number, y: number } | null; // Server-provided initial position
    playerSide?: 'left' | 'right';     // Remote mode positioning
    roomId: string;                    // WebSocket room identifier
    isGameActive: boolean;             // Countdown gate
};
```

**Key Refs**:
```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);    // Canvas DOM element
const animationIdRef = useRef<number | null>(null);   // RAF ID for cleanup
const gameRunningRef = useRef(false);                 // Unused legacy ref
const roomIdRef = useRef<string>(roomId);             // Stable room reference
const lastSentY = useRef<number>(0.5);                // Network throttling
const activeRef = useRef(isGameActive);               // Countdown blocker
```

**Initialization Logic**:
```typescript
// --- 1. LÓGICA DE POSICIONAMIENTO ---
let finalPlayerNumber = 1; 
let leftName = "P1";
let rightName = "P2";

if (mode.includes('remote') || mode === 'tournament') {
    if (playerSide === 'left') {
        finalPlayerNumber = 1;
        leftName = userName;
        rightName = opponentName;
    } else {
        finalPlayerNumber = 2;
        leftName = opponentName;
        rightName = userName;
    }
} 
else if (mode === 'ia') {
    leftName = userName;
    rightName = "IA-Bot";
} 
else {
    leftName = userName;
    rightName = "Invitado";
}
```

**WebSocket Event Handlers**:

| Event | Frequency | Purpose | Handler Logic |
|-------|-----------|---------|---------------|
| `game_update_physics` | 60 FPS | Server physics sync | Updates `ball.sync()`, applies LERP to opponent paddle |
| `game_over` | Once | Match completion | Cancels RAF, shows winner modal, dispatches MENU |
| `opponent_disconnected` | Once | Connection loss | Shows abandonment modal, awards win by forfeit |

**LERP Interpolation Strategy**:
```typescript
const LERP = 0.3;

if (game.playerNumber === 1) {
    // --- SOY JUGADOR 1 (Izquierda) ---
    
    // MI PALA (P1): NO LA TOCAMOS. 
    // Mi teclado la mueve en el renderLoop. Si la toco aquí, vibrará.
    
    // RIVAL (P2): Lo interpolamos suavemente hacia su destino
    game.player2.y = game.player2.y + (targetY_P2 - game.player2.y) * LERP;
} 
else if (game.playerNumber === 2) {
    // --- SOY JUGADOR 2 (Derecha) ---

    // MI PALA (P2): NO LA TOCAMOS.
    
    // RIVAL (P1): Lo interpolamos suavemente
    game.player1.y = game.player1.y + (targetY_P1 - game.player1.y) * LERP;
}
```

**Render Loop with Countdown Gate**:
```typescript
const renderLoop = () => {
    
    // BLOQUEO BUCLE PRINCIPAL En CUENTA ATRAS
    if (!activeRef.current) {
        // Si estamos en cuenta atrás:
        // DIBUJAMOS (para ver el tablero estático de fondo)
        game.draw(); 
        // Pero NO ACTUALIZAMOS (game.update() no se llama)
        
        // Pedimos siguiente frame y SALIMOS
        animationId = requestAnimationFrame(renderLoop);
        return; 
    }
    
    // 1.Si activeRef.current es TRUE. Mover pala localmente
    game.update(); 
    game.draw(); 

    // --- CONTROL DE VICTORIA LOCAL / IA ---
    if (!mode.includes('remote') && mode !== 'tournament') {
        if (game.hasWinner()) {
            const winnerName = game.getWinner();
            cancelAnimationFrame(animationId);
            
            setTimeout(() => {
                showModal({
                    title: "🏆 ¡PARTIDA FINALIZADA!",
                    message: `Ganador: ${winnerName}`,
                    type: "success",
                    onConfirm: () => {
                        dispatch({ type: "MENU" });
                    }
                });
            }, 50);
            return; 
        }
    }
    
    // 2. ENVIAR POSICIÓN AL SERVIDOR
    if (mode.includes('remote') || mode === 'tournament') {
        const myPlayer = game.playerNumber === 1 ? game.player1 : game.player2;
        
        // --- CÁLCULO DE COORDENADA ABSOLUTA ---
        const myCenterPixel = myPlayer.y + (myPlayer.height / 2);
        const myNormalizedY = myCenterPixel / canvas.height;

        // 3. Enviar solo si ha cambiado (para no saturar)
        if (roomIdRef.current && Math.abs(myNormalizedY - lastSentY.current) > 0.001) {
            
            socket.emit('paddle_move', { 
                roomId: roomIdRef.current, 
                y: myNormalizedY
            });
            lastSentY.current = myNormalizedY;
        }
    }

    animationId = requestAnimationFrame(renderLoop);
};
```

**Network Position Transmission**:
- Converts pixel-based paddle position to normalized 0.0-1.0 range
- Throttles updates using 0.001 delta threshold
- Sends `paddle_move` events with room ID and normalized Y coordinate

**Cleanup Procedure**:
```typescript
return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    socket.off('game_update_physics');
    socket.off('game_over', handleGameOver);
    socket.off('opponent_disconnected', handleOpponentDisconnected);
};
```

---

## Performance Considerations

### Frame Rate Management

| Context | Rate | Method | Notes |
|---------|------|--------|-------|
| Local render loop | ~60 FPS (browser-dependent) | `requestAnimationFrame` | Adaptive to monitor refresh rate |
| Remote server physics | Fixed 60 FPS (16.67ms) | `setInterval` | Server-side game loop |
| Network updates | Variable | WebSocket events | Depends on server broadcast frequency |

### Optimization Strategies

1. **LERP Interpolation (0.3 factor)**: Smooths opponent paddle movement while maintaining responsiveness
2. **Position Delta Threshold (0.001)**: Reduces network traffic by filtering negligible movements
3. **Bounding Box Collisions**: AABB checks are computationally cheaper than circle-to-rectangle
4. **Half-Court Paddle Selection**: Reduces collision checks from 2 to 1 per frame
5. **Countdown Gate**: Prevents physics calculations during pre-game phase while maintaining visual feedback

### Memory Management

- **useRef for Animation ID**: Prevents stale closure issues in RAF loop
- **useRef for Room ID**: Avoids dependency array triggers
- **WebSocket Event Cleanup**: Prevents memory leaks on component unmount
- **RAF Cancellation**: Ensures render loop termination

---

## Testing & Debugging

### Console Logging Strategy

The codebase includes strategic logging for debugging:

```typescript
console.log(`🎮 INICIANDO JUEGO [${mode}] | Soy: ${finalPlayerNumber} (${playerSide})`);
console.log(`⚔️ MATCH: ${leftName} (Izda) vs ${rightName} (Dcha)`);
```

### Common Issues & Solutions

| Issue | Symptom | Cause | Solution |
|-------|---------|-------|----------|
| Paddle vibration in remote | Jittery opponent paddle | Server updates overriding local state | Never interpolate own paddle, LERP opponent only |
| Ball tunneling | Ball passes through paddle | High velocity, single-frame detection | Use raycasting with `prevX`, `prevY` |
| Network lag spikes | Choppy ball movement | Server updates delayed | LERP smoothing mitigates visual artifacts |
| Countdown visual freeze | Black canvas during countdown | `game.update()` blocked entirely | Call `game.draw()` even when `!activeRef.current` |
| Score desync | Different scores on clients | Client-side scoring in remote mode | Use server-authoritative `data.score` |

---

## Code Walkthrough with Spanish Comments

This section presents the actual implementation code with all original Spanish comments preserved exactly as written. After each code snippet, you'll find a translation table for all Spanish comments.

---

### Ball.ts - Complete Implementation

#### Constructor and Initialization

```typescript
constructor(c: HTMLCanvasElement)
{
    this.canvasWidth = c.width;
    this.canvasHeight = c.height;
    
    // Configuración inicial
    this.spawnX = c.width / 2;
    this.spawnY = c.height / 2;
    this.x = this.spawnX;
    this.y = this.spawnY;

    this.radious = c.width * 0.008; // Tu ajuste visual relativo

    // Valores de física (Restaurados de tu versión A)
    this.vx = 0;
    this.vy = 0;
    this.score = [0, 0];

    this.initialSpeed = 5;
    this.speed = this.initialSpeed;
    this.baseSpeed = 10;
    this.maxSpeed = 20;
    this.increaseSpeed = 0.4; // Aceleración por golpe

    this.waiting = false;
    this.firstHit = true;
    this.maxAngle = Math.PI / 4; // 45 grados

    // Solo iniciamos dirección si no estamos esperando sync del server
    this.setLocalDirection(); 
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Configuración inicial` | Initial configuration |
| `// Tu ajuste visual relativo` | Your relative visual adjustment |
| `// Valores de física (Restaurados de tu versión A)` | Physics values (Restored from your version A) |
| `// Aceleración por golpe` | Acceleration per hit |
| `// 45 grados` | 45 degrees |
| `// Solo iniciamos dirección si no estamos esperando sync del server` | We only initialize direction if we're not waiting for server sync |

**Technical Explanation**: The constructor initializes the ball at the canvas center with physics properties suitable for local gameplay. The radius is calculated as 0.8% of canvas width for responsive scaling. The comment about "version A" refers to a previous implementation that was merged with another version.

---

#### Update Method - Anti-Tunneling Physics

```typescript
/**
 * Este update SOLO se llama si el modo es 'local'.
 * Contiene la lógica Anti-Túnel (Raycasting) adaptada a Pixeles.
 */
update(players: Player[] | Player, p2?: Player) {
    if (this.waiting) return;
    
    //Adicion codigo par integrar ia y local
    let player1: Player;
    let player2: Player;

    if (Array.isArray(players)) {
        player1 = players[0];
        player2 = players[1];
    } else {
        player1 = players;
        player2 = p2!;
    }

    // 1. Guardar posición previa (CRUCIAL para evitar túnel)
    const prevX = this.x;
    const prevY = this.y;

    // 2. Mover bola temporalmente
    this.x += this.vx;
    this.y += this.vy;

    // 3. Chequear colisión con paredes (Arriba/Abajo)
    this.wallCollision();

    // 4. Chequear colisión con Palas usando TRAYECTORIA (No solo posición)
    this.checkPaddleCollision(player1, player2, prevX, prevY);
    
    // 5. Goles
    this.goal();
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `Este update SOLO se llama si el modo es 'local'.` | This update is ONLY called if the mode is 'local'. |
| `Contiene la lógica Anti-Túnel (Raycasting) adaptada a Pixeles.` | It contains Anti-Tunnel logic (Raycasting) adapted to Pixels. |
| `//Adicion codigo par integrar ia y local` | Added code to integrate AI and local modes |
| `// 1. Guardar posición previa (CRUCIAL para evitar túnel)` | 1. Save previous position (CRUCIAL to avoid tunneling) |
| `// 2. Mover bola temporalmente` | 2. Move ball temporarily |
| `// 3. Chequear colisión con paredes (Arriba/Abajo)` | 3. Check collision with walls (Top/Bottom) |
| `// 4. Chequear colisión con Palas usando TRAYECTORIA (No solo posición)` | 4. Check collision with Paddles using TRAJECTORY (Not just position) |
| `// 5. Goles` | 5. Goals |

**Technical Explanation**: The update method implements the core physics loop for local modes. The critical anti-tunneling technique stores the previous frame's position before movement, then uses raycasting to detect if the ball's trajectory intersected a paddle between frames. This prevents high-speed balls from "phasing through" paddles.

---

#### Paddle Collision Detection - Raycasting Implementation

```typescript
private checkPaddleCollision(p1: Player, p2: Player, prevX: number, prevY: number) {
    // Determinamos qué pala comprobar según en qué lado del campo esté la bola
    let player = (this.x < this.canvasWidth / 2) ? p1 : p2;
    
    // Coordenadas de la PALA
    const pTop = player.getY();
    const pBottom = player.getY() + player.getHeight();
    const pLeft = player.getX();
    const pRight = player.getX() + player.getWidth();

    // Coordenadas de la BOLA (Caja cuadrada alrededor del radio)
    const bTop = this.y - this.radious;
    const bBottom = this.y + this.radious;
    const bLeft = this.x - this.radious;
    const bRight = this.x + this.radious;

    // ¿HAY COLISIÓN? (Se superponen las cajas)
    if (bRight > pLeft && bLeft < pRight && bBottom > pTop && bTop < pBottom) {
        
        // --- CORRECCIÓN DE POSICIÓN Y REBOTE ---
        
        // Caso: Pala Izquierda (P1)
        if (player === p1) {
            // Empujamos la bola a la derecha para que no se quede enganchada
            this.x = pRight + this.radious + 1;
            this.handlePaddleHit(player, this.y, 1); // 1 = rebote a la derecha
        }
        // Caso: Pala Derecha (P2)
        else {
            // Empujamos la bola a la izquierda
            this.x = pLeft - this.radious - 1;
            this.handlePaddleHit(player, this.y, -1); // -1 = rebote a la izquierda
        }
    }
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Determinamos qué pala comprobar según en qué lado del campo esté la bola` | We determine which paddle to check based on which side of the field the ball is on |
| `// Coordenadas de la PALA` | PADDLE coordinates |
| `// Coordenadas de la BOLA (Caja cuadrada alrededor del radio)` | BALL coordinates (Square box around the radius) |
| `// ¿HAY COLISIÓN? (Se superponen las cajas)` | IS THERE COLLISION? (The boxes overlap) |
| `// --- CORRECCIÓN DE POSICIÓN Y REBOTE ---` | --- POSITION CORRECTION AND BOUNCE --- |
| `// Caso: Pala Izquierda (P1)` | Case: Left Paddle (P1) |
| `// Empujamos la bola a la derecha para que no se quede enganchada` | We push the ball to the right so it doesn't get stuck |
| `// 1 = rebote a la derecha` | 1 = bounce to the right |
| `// Caso: Pala Derecha (P2)` | Case: Right Paddle (P2) |
| `// Empujamos la bola a la izquierda` | We push the ball to the left |
| `// -1 = rebote a la izquierda` | -1 = bounce to the left |

**Technical Explanation**: This method uses Axis-Aligned Bounding Box (AABB) collision detection. The comment about "caja cuadrada" (square box) refers to treating the circular ball as a square hitbox for simpler calculations. The position correction (pushing the ball outside the paddle by radius + 1 pixel) prevents the ball from getting stuck inside the paddle geometry.

---

#### Angle Adjustment - Impact Point Physics

```typescript
private handlePaddleHit(player: Player, hitY: number, direction: number) {
    // Lógica original de cambio de ángulo basada en dónde golpeó
    const paddleCenterY = player.getY() + player.getHeight() / 2;
    
    // Normalizamos el impacto (-1 arriba, 0 centro, 1 abajo)
    const normalizedIntersect = (hitY - paddleCenterY) / (player.getHeight() / 2);
    
    // Limitamos ángulo
    const angle = normalizedIntersect * this.maxAngle;

    // Aumentar velocidad
    if (this.firstHit) {
        this.speed = this.baseSpeed;
        this.firstHit = false;
    } else {
        this.speed = Math.min(this.speed + this.increaseSpeed, this.maxSpeed);
    }

    // Calcular nueva velocidad
    this.vx = direction * this.speed * Math.cos(angle);
    this.vy = this.speed * Math.sin(angle);
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Lógica original de cambio de ángulo basada en dónde golpeó` | Original angle change logic based on where it hit |
| `// Normalizamos el impacto (-1 arriba, 0 centro, 1 abajo)` | We normalize the impact (-1 top, 0 center, 1 bottom) |
| `// Limitamos ángulo` | We limit the angle |
| `// Aumentar velocidad` | Increase speed |
| `// Calcular nueva velocidad` | Calculate new velocity |

**Technical Explanation**: The normalized intersection maps the hit point to a range of -1 (top edge) to 1 (bottom edge). Multiplying by `maxAngle` (45°) creates steeper angles for edge hits and shallow angles for center hits, simulating realistic paddle physics.

---

#### Ball Reset - Serve Delay Logic

```typescript
// Reseteo para juego local
public async resetLocal(): Promise<void> {
    this.waiting = true;
    this.firstHit = true;
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.speed = this.initialSpeed;
    
    // Pausa breve antes de sacar
    await new Promise(r => setTimeout(r, 1000));
    
    this.setLocalDirection();
    this.waiting = false;
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Reseteo para juego local` | Reset for local game |
| `// Pausa breve antes de sacar` | Brief pause before serving |

**Technical Explanation**: The async 1-second delay provides visual feedback after goals, allowing players to prepare for the next serve. The `waiting` flag prevents physics calculations during this pause.

---

### Player.ts - Complete Implementation

#### AI Movement Logic

```typescript
moveIA(ballPosition: number)
{
    const center = this.y + this.height / 2;
    const diff = ballPosition - center;

    // Zona muerta de 10px para evitar que la IA vibre si la bola está en el centro
    if (Math.abs(diff) < 10) return;

    if (Math.abs(diff) > this.speedIA)
        this.y += this.speedIA * Math.sign(diff);
    else
        this.y += diff;
    this.clampY();
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Zona muerta de 10px para evitar que la IA vibre si la bola está en el centro` | 10px dead zone to prevent the AI from vibrating if the ball is in the center |

**Technical Explanation**: The "dead zone" (zona muerta) prevents micro-adjustments when the ball is near the paddle center. Without this, the AI would jitter back and forth, creating unrealistic movement. When the difference exceeds the AI speed, it moves at constant velocity; otherwise, it moves exactly to the ball position for precise tracking.

---

#### Position Normalization for Network Sync

```typescript
// ---  Envia posición absoluta al server (0.0 a 1.0) ---
getNormalizedY(): number {
    // Posición visual (Top) + Mitad de altura = Centro
    const centerY = this.y + (this.height / 2);
    
    // Normalizamos (0.0 a 1.0)
    return centerY / this.canvasHeight;
}

// IMPORTANTE: Permite asignar la posición directamente desde Canvas.tsx (interpolación)
setY(val: number) { 
    this.y = val; 
    this.clampY();
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// ---  Envia posición absoluta al server (0.0 a 1.0) ---` | --- Sends absolute position to server (0.0 to 1.0) --- |
| `// Posición visual (Top) + Mitad de altura = Centro` | Visual position (Top) + Half height = Center |
| `// Normalizamos (0.0 a 1.0)` | We normalize (0.0 to 1.0) |
| `// IMPORTANTE: Permite asignar la posición directamente desde Canvas.tsx (interpolación)` | IMPORTANT: Allows assigning position directly from Canvas.tsx (interpolation) |

**Technical Explanation**: The normalization converts pixel coordinates to a 0.0-1.0 range for resolution-independent network transmission. The `setY` method is crucial for remote mode, allowing the Canvas component to apply LERP interpolation to opponent paddle positions received from the server.

---

### Pong.ts - Complete Implementation

#### Mode-Specific Update Logic

```typescript
update()
{
    if (this.pause) return;

    // 1. MODO IA (Jugar contra Bot)
    if (this.mode === 'ia') {
        this.handleLocalInput(this.player1, 'w', 's'); // Humano (Izq)
        this.handleLocalInput(this.player1, 'ArrowUp', 'ArrowDown'); // Alternativa
        
        // IA del Bot (Derecha) - Asumiendo que Player tiene método moveIA
        this.player2.moveIA(this.ball.y); 

        // Física Local
        this.ball.update([this.player1, this.player2]); 
        this.checkLocalWin();
    }
    
    // 2. MODO LOCAL (1 PC, 2 Humanos)
    else if (this.mode === 'local') {
        this.handleLocalInput(this.player1, 'w', 's'); // P1: WASD
        this.handleLocalInput(this.player2, 'ArrowUp', 'ArrowDown'); // P2: Flechas
        
        // Física Local
        this.ball.update([this.player1, this.player2]);
        this.checkLocalWin();
    }

    // 3. MODO REMOTO / TORNEO (Online)
    else {
        // Solo gestionamos NUESTRO input para predicción del cliente.
        // La física de la bola y del rival viene del servidor (Canvas.tsx).
        const myPlayer = this.playerNumber === 1 ? this.player1 : this.player2;
        this.handleLocalInput(myPlayer); 
    }
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// 1. MODO IA (Jugar contra Bot)` | 1. AI MODE (Play against Bot) |
| `// Humano (Izq)` | Human (Left) |
| `// Alternativa` | Alternative |
| `// IA del Bot (Derecha) - Asumiendo que Player tiene método moveIA` | Bot AI (Right) - Assuming Player has moveIA method |
| `// Física Local` | Local Physics |
| `// 2. MODO LOCAL (1 PC, 2 Humanos)` | 2. LOCAL MODE (1 PC, 2 Humans) |
| `// P2: Flechas` | P2: Arrows |
| `// 3. MODO REMOTO / TORNEO (Online)` | 3. REMOTE MODE / TOURNAMENT (Online) |
| `// Solo gestionamos NUESTRO input para predicción del cliente.` | We only manage OUR input for client prediction. |
| `// La física de la bola y del rival viene del servidor (Canvas.tsx).` | The ball physics and rival come from the server (Canvas.tsx). |

**Technical Explanation**: The update method branches based on game mode. In AI mode, player 1 accepts flexible input (W/S or arrows) for single-player convenience. In local PvP, strict key bindings prevent conflicts. In remote mode, only the local player's paddle is updated here; server broadcasts handle the rest.

---

#### Input Handling - Multi-Key Support

```typescript
private handleLocalInput(p: Player, upKey: string = 'ArrowUp', downKey: string = 'ArrowDown') {
    // En modo online (sin args), aceptamos ambas teclas para el jugador activo
    const wKey = 'w';
    const sKey = 's';
    const uKey = 'ArrowUp';
    const dKey = 'ArrowDown';

    // Si se especifican teclas (modo local 1v1), somos estrictos
    if (arguments.length > 1) {
         if (this.keysPressed[upKey]) p.moveUp();
         if (this.keysPressed[downKey]) p.moveDown();
    } 
    // Si no (modo online o IA P1), aceptamos todo
    else {
         if (this.keysPressed[uKey] || this.keysPressed[wKey]) p.moveUp();
         if (this.keysPressed[dKey] || this.keysPressed[sKey]) p.moveDown();
    }
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// En modo online (sin args), aceptamos ambas teclas para el jugador activo` | In online mode (without args), we accept both keys for the active player |
| `// Si se especifican teclas (modo local 1v1), somos estrictos` | If keys are specified (local 1v1 mode), we are strict |
| `// Si no (modo online o IA P1), aceptamos todo` | If not (online mode or IA P1), we accept everything |

**Technical Explanation**: The method uses JavaScript's `arguments.length` to detect whether specific keys were provided. This enables flexible bindings for single-player modes while maintaining strict separation for local multiplayer.

---

#### Scoreboard Rendering

```typescript
private drawScore() {
    this.ctx.font = "48px Arial";
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    
    // Puntuación P1
    this.ctx.fillText(this.score[0].toString(), this.c.width * 0.25, 20);
    // Puntuación P2
    this.ctx.fillText(this.score[1].toString(), this.c.width * 0.75, 20);
    
    // Nombres (Opcional)
    this.ctx.font = "20px Arial";
    this.ctx.fillText(this.player1.getName(), this.c.width * 0.25, 70);
    this.ctx.fillText(this.player2.getName(), this.c.width * 0.75, 70);
}
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// Puntuación P1` | P1 Score |
| `// Puntuación P2` | P2 Score |
| `// Nombres (Opcional)` | Names (Optional) |

**Technical Explanation**: Scores are positioned at 25% and 75% of canvas width for balanced spacing. Player names appear below scores in smaller font.

---

### Canvas.tsx - Complete Implementation

#### Player Positioning Logic

```typescript
// --- 1. LÓGICA DE POSICIONAMIENTO ---
let finalPlayerNumber = 1; 
let leftName = "P1";
let rightName = "P2";

if (mode.includes('remote') || mode === 'tournament') {
    if (playerSide === 'left') {
        finalPlayerNumber = 1;
        leftName = userName;
        rightName = opponentName;
    } else {
        finalPlayerNumber = 2;
        leftName = opponentName;
        rightName = userName;
    }
} 
else if (mode === 'ia') {
    leftName = userName;
    rightName = "IA-Bot";
} 
else {
    leftName = userName;
    rightName = "Invitado";
}

console.log(`🎮 INICIANDO JUEGO [${mode}] | Soy: ${finalPlayerNumber} (${playerSide})`);
console.log(`⚔️ MATCH: ${leftName} (Izda) vs ${rightName} (Dcha)`);
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// --- 1. LÓGICA DE POSICIONAMIENTO ---` | --- 1. POSITIONING LOGIC --- |
| `(Izda)` | (Left) |
| `(Dcha)` | (Right) |

**Technical Explanation**: The positioning logic ensures correct player assignment in remote games. If you're the right player, your opponent (left player) gets shown on the left side of your screen. The console logs use "Izda" (left) and "Dcha" (right) abbreviations.

---

#### Server Physics Synchronization

```typescript
// --- FÍSICA DEL SERVIDOR ---
// Este evento ocurre 60 veces por segundo
socket.on('game_update_physics', (data: any) => {
    if (!game) return;

    if (!activeRef.current) return;

    // 1. SINCRONIZAR BOLA
    if (game.ball && data.ball) {
        // Multiplicamos AQUÍ por width/height
        const pixelX = data.ball.x * canvas.width;
        const pixelY = data.ball.y * canvas.height;
        
        // Pasamos píxeles ya calculados
        game.ball.sync(pixelX, pixelY);
    }
    
    //(Estrategia: Trust Local + Interpolación Rival)
    if (data.paddles) {
        const p1Height = game.player1.getHeight();
        const p2Height = game.player2.getHeight();

        // Posiciones objetivo según el servidor
        const targetY_P1 = (data.paddles.left * canvas.height) - (p1Height / 2);
        const targetY_P2 = (data.paddles.right * canvas.height) - (p2Height / 2);

        // Factor de suavizado (0.3 es equilibrado)
        const LERP = 0.3;

        if (game.playerNumber === 1) {
            // --- SOY JUGADOR 1 (Izquierda) ---
            
            // MI PALA (P1): NO LA TOCAMOS. 
            // Mi teclado la mueve en el renderLoop. Si la toco aquí, vibrará.
            
            // RIVAL (P2): Lo interpolamos suavemente hacia su destino
            game.player2.y = game.player2.y + (targetY_P2 - game.player2.y) * LERP;
        } 
        else if (game.playerNumber === 2) {
            // --- SOY JUGADOR 2 (Derecha) ---

            // MI PALA (P2): NO LA TOCAMOS.
            
            // RIVAL (P1): Lo interpolamos suavemente
            game.player1.y = game.player1.y + (targetY_P1 - game.player1.y) * LERP;
        }
    }
    // 3. Sincronizar MARCADOR
    if (game.score && data.score) {
         game.score = data.score;
    }
});
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// --- FÍSICA DEL SERVIDOR ---` | --- SERVER PHYSICS --- |
| `// Este evento ocurre 60 veces por segundo` | This event occurs 60 times per second |
| `// 1. SINCRONIZAR BOLA` | 1. SYNCHRONIZE BALL |
| `// Multiplicamos AQUÍ por width/height` | We multiply HERE by width/height |
| `// Pasamos píxeles ya calculados` | We pass already calculated pixels |
| `//(Estrategia: Trust Local + Interpolación Rival)` | (Strategy: Trust Local + Rival Interpolation) |
| `// Posiciones objetivo según el servidor` | Target positions according to the server |
| `// Factor de suavizado (0.3 es equilibrado)` | Smoothing factor (0.3 is balanced) |
| `// --- SOY JUGADOR 1 (Izquierda) ---` | --- I AM PLAYER 1 (Left) --- |
| `// MI PALA (P1): NO LA TOCAMOS.` | MY PADDLE (P1): WE DON'T TOUCH IT. |
| `// Mi teclado la mueve en el renderLoop. Si la toco aquí, vibrará.` | My keyboard moves it in the renderLoop. If I touch it here, it will vibrate. |
| `// RIVAL (P2): Lo interpolamos suavemente hacia su destino` | RIVAL (P2): We smoothly interpolate it towards its destination |
| `// --- SOY JUGADOR 2 (Derecha) ---` | --- I AM PLAYER 2 (Right) --- |
| `// MI PALA (P2): NO LA TOCAMOS.` | MY PADDLE (P2): WE DON'T TOUCH IT. |
| `// RIVAL (P1): Lo interpolamos suavemente` | RIVAL (P1): We smoothly interpolate it |
| `// 3. Sincronizar MARCADOR` | 3. Synchronize SCOREBOARD |

**Technical Explanation**: This is the core synchronization strategy. The server sends normalized coordinates (0.0-1.0), which are converted to pixels client-side. The critical insight is that we NEVER modify our own paddle based on server data (to avoid input lag), but we DO interpolate the opponent's paddle using LERP for smooth visuals despite network jitter.

---

#### Render Loop with Countdown Gate

```typescript
const renderLoop = () => {
    
    // BLOQUEO BUCLE PRINCIPAL En CUENTA ATRAS
    if (!activeRef.current) {
        // Si estamos en cuenta atrás:
        // DIBUJAMOS (para ver el tablero estático de fondo)
        game.draw(); 
        // Pero NO ACTUALIZAMOS (game.update() no se llama)
        
        // Pedimos siguiente frame y SALIMOS
        animationId = requestAnimationFrame(renderLoop);
        return; 
    }
    
    // 1.Si activeRef.current es TRUE. Mover pala localmente (Tu teclado actualiza game.player1.y aquí)
    game.update(); 
    game.draw(); 

    // --- NUEVO BLOQUE: CONTROL DE VICTORIA LOCAL / IA ---
    // Solo entra aquí si NO estamos en modo online
    if (!mode.includes('remote') && mode !== 'tournament') {
        if (game.hasWinner()) {
            const winnerName = game.getWinner();
            
            // Paramos el bucle inmediatamente
            cancelAnimationFrame(animationId);
            
            // Avisamos y salimos con delay para dar tiempo a meter el ultimo tanto en el marcador
            setTimeout(() => {
                showModal({
                    title: "🏆 ¡PARTIDA FINALIZADA!",
                    message: `Ganador: ${winnerName}`,
                    type: "success",
                    onConfirm: () => {
                        dispatch({ type: "MENU" });
                    }
                });
            }, 50);
            return; 
        }
    }
    
    // 2. ENVIAR POSICIÓN AL SERVIDOR
    if (mode.includes('remote') || mode === 'tournament') {
        const myPlayer = game.playerNumber === 1 ? game.player1 : game.player2;
        
        // --- CÁLCULO DE COORDENADA ABSOLUTA ---
        // Obtenemos el centro de la pala en píxeles
        const myCenterPixel = myPlayer.y + (myPlayer.height / 2);
        
        // Lo convertimos a porcentaje (0.0 a 1.0)
        const myNormalizedY = myCenterPixel / canvas.height;

        // 3. Enviar solo si ha cambiado (para no saturar)
        // Usamos roomIdRef.current para asegurar que tenemos la ID
        if (roomIdRef.current && Math.abs(myNormalizedY - lastSentY.current) > 0.001) {
            
            socket.emit('paddle_move', { 
                roomId: roomIdRef.current, 
                y: myNormalizedY // <--- Enviamos el dato exacto, NO 'up' o 'down'
            });
            lastSentY.current = myNormalizedY;
        }
    }

    animationId = requestAnimationFrame(renderLoop);
};
```

**Spanish Comments Translation:**

| Spanish Comment | English Translation |
|----------------|-------------------|
| `// BLOQUEO BUCLE PRINCIPAL En CUENTA ATRAS` | MAIN LOOP BLOCKING During COUNTDOWN |
| `// Si estamos en cuenta atrás:` | If we are in countdown: |
| `// DIBUJAMOS (para ver el tablero estático de fondo)` | WE DRAW (to see the static board in the background) |
| `// Pero NO ACTUALIZAMOS (game.update() no se llama)` | But WE DON'T UPDATE (game.update() is not called) |
| `// Pedimos siguiente frame y SALIMOS` | We request next frame and EXIT |
| `// 1.Si activeRef.current es TRUE. Mover pala localmente (Tu teclado actualiza game.player1.y aquí)` | 1. If activeRef.current is TRUE. Move paddle locally (Your keyboard updates game.player1.y here) |
| `// --- NUEVO BLOQUE: CONTROL DE VICTORIA LOCAL / IA ---` | --- NEW BLOCK: LOCAL / IA VICTORY CONTROL --- |
| `// Solo entra aquí si NO estamos en modo online` | Only enters here if we are NOT in online mode |
| `// Paramos el bucle inmediatamente` | We stop the loop immediately |
| `// Avisamos y salimos con delay para dar tiempo a meter el ultimo tanto en el marcador` | We notify and exit with delay to give time to enter the last point on the scoreboard |
| `// 2. ENVIAR POSICIÓN AL SERVIDOR` | 2. SEND POSITION TO SERVER |
| `// --- CÁLCULO DE COORDENADA ABSOLUTA ---` | --- ABSOLUTE COORDINATE CALCULATION --- |
| `// Obtenemos el centro de la pala en píxeles` | We get the paddle center in pixels |
| `// Lo convertimos a porcentaje (0.0 a 1.0)` | We convert it to percentage (0.0 to 1.0) |
| `// 3. Enviar solo si ha cambiado (para no saturar)` | 3. Send only if it has changed (to not saturate) |
| `// Usamos roomIdRef.current para asegurar que tenemos la ID` | We use roomIdRef.current to ensure we have the ID |
| `// <--- Enviamos el dato exacto, NO 'up' o 'down'` | <--- We send the exact data, NOT 'up' or 'down' |

**Technical Explanation**: The render loop has three critical sections: (1) Countdown gate that draws but doesn't update, (2) Local victory detection with 50ms delay to allow final score rendering, (3) Network position transmission with delta threshold to reduce bandwidth.

---

## Future Enhancement Opportunities

1. **Client-Side Prediction**: Implement ball trajectory prediction to reduce perceived latency in remote mode
2. **Input Buffering**: Queue inputs during lag spikes for smoother remote gameplay
3. **Replay System**: Record game states for post-match analysis
4. **Dynamic LERP Factor**: Adjust interpolation based on measured latency
5. **Spectator Mode**: Allow additional clients to observe matches without input
6. **Power-ups**: Extend `Ball.ts` with special effects and modifier logic
7. **Customizable Physics**: Expose speed, angle, and paddle size as configuration parameters

---

## References

- **RFC 6238** (TOTP Standard): Time-based synchronization principles applicable to network tick rates
- **RequestAnimationFrame API**: [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- **Socket.IO Client**: [Official Documentation](https://socket.io/docs/v4/client-api/)
- **AABB Collision Detection**: Axis-Aligned Bounding Box algorithm
- **LERP Interpolation**: Linear interpolation formula `lerp(a, b, t) = a + (b - a) * t`

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-14  
**Authors**: Development Team  
**Confidentiality**: Internal Use Only
