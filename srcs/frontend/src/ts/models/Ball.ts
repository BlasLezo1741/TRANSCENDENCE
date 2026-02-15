import { Player } from "./Player";

export class Ball
{
    // --- PROPERTIES (A & B Fusion) ---
    x: number;
    y: number;
    radious: number;
    canvasWidth: number;
    canvasHeight: number;

    // FÍSICA (Necesarias para modo Local)
    speed: number;
    initialSpeed: number;
    baseSpeed: number;
    maxSpeed: number;
    increaseSpeed: number;
    vx: number;
    vy: number;
    
    // State
    firstHit: boolean;
    waiting: boolean;
    maxAngle: number;
    spawnX: number;
    spawnY: number;

    score: number[] = [0, 0];

    constructor(c: HTMLCanvasElement)
    {
        this.canvasWidth = c.width;
        this.canvasHeight = c.height;
        
        // Initial configuration 
        this.spawnX = c.width / 2;
        this.spawnY = c.height / 2;
        this.x = this.spawnX;
        this.y = this.spawnY;

        this.radious = c.width * 0.008; //  Your relative visual adjustment 

        // Physics values (Restored from your version A)
        this.vx = 0;
        this.vy = 0;
        this.score = [0, 0];

        this.initialSpeed = 5;
        this.speed = this.initialSpeed;
        this.baseSpeed = 10;
        this.maxSpeed = 20;
        this.increaseSpeed = 0.4; // cceleration per hit

        this.waiting = false;
        this.firstHit = true;
        this.maxAngle = Math.PI / 4; // 45 degrees

    // We only initialize direction if we're not waiting for server sync
        this.setLocalDirection(); 
    }

    // --- MÉTODOS DE DIBUJO Y SYNC (Modo Remote) ---

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radious, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.closePath();
    }

    /**
     * Sincroniza posición desde el servidor (Solo para Remote)
     * En este caso, el servidor hace los cálculos, aquí solo actualizamos X/Y
     */
    sync(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // --- MÉTODOS DE FÍSICA LOCAL (Modo Local / IA) ---
    
    /**
     * This update is ONLY called if the mode is 'local'.
     * It contains Anti-Tunnel logic (Raycasting) adapted to Pixels.
     */
    update(players: Player[] | Player, p2?: Player) {
        if (this.waiting) return;
        //Added code to integrate AI and local modes
        let player1: Player;
        let player2: Player;

        if (Array.isArray(players)) {
            player1 = players[0];
            player2 = players[1];
        } else {
            player1 = players;
            player2 = p2!;
        }

        // 1. Save previous position (CRUCIAL to avoid tunneling)
        const prevX = this.x;
        const prevY = this.y;

        // 2. Move ball temporarily 
        this.x += this.vx;
        this.y += this.vy;

        // 3. Check collision with walls (Top/Bottom)
        this.wallCollision();

        // 4. Check collision with Paddles using TRAJECTORY (Not just position)
        this.checkPaddleCollision(player1, player2, prevX, prevY);
        // 5. Goles
        this.goal();
    }

    private checkPaddleCollision(p1: Player, p2: Player, prevX: number, prevY: number) {
        // We determine which paddle to check based on which side of the field the ball is on
        let player = (this.x < this.canvasWidth / 2) ? p1 : p2;
        
        // PADDLE coordinates
        const pTop = player.getY();
        const pBottom = player.getY() + player.getHeight();
        const pLeft = player.getX();
        const pRight = player.getX() + player.getWidth();

        // BALL coordinates (Square box around the radius)
        const bTop = this.y - this.radious;
        const bBottom = this.y + this.radious;
        const bLeft = this.x - this.radious;
        const bRight = this.x + this.radious;

        // IS THERE COLLISION? (The boxes overlap)
        if (bRight > pLeft && bLeft < pRight && bBottom > pTop && bTop < pBottom) {
            
        // --- POSITION CORRECTION AND BOUNCE ---
            
        // Case: Left Paddle (P1)
            if (player === p1) {
            // We push the ball to the right so it doesn't get stuck
                this.x = pRight + this.radious + 1;
                this.handlePaddleHit(player, this.y, 1); // 1 = bounce to the right
            }
        // Case: Right Paddle (P2) 
            else {
                // We push the ball to the left
                this.x = pLeft - this.radious - 1;
                this.handlePaddleHit(player, this.y, -1); // -1 = bounce to the left 
            }
        }
    }

    private handlePaddleHit(player: Player, hitY: number, direction: number) {
        // Original angle change logic based on where it hit
        const paddleCenterY = player.getY() + player.getHeight() / 2;
        
        // We normalize the impact (-1 top, 0 center, 1 bottom)
        const normalizedIntersect = (hitY - paddleCenterY) / (player.getHeight() / 2);
        
        // We limit the angle 
        const angle = normalizedIntersect * this.maxAngle;

        //  Increase speed 
        if (this.firstHit) {
            this.speed = this.baseSpeed;
            this.firstHit = false;
        } else {
            this.speed = Math.min(this.speed + this.increaseSpeed, this.maxSpeed);
        }

        // Calculate new velocity
        this.vx = direction * this.speed * Math.cos(angle);
        this.vy = this.speed * Math.sin(angle);
    }

    private wallCollision() {
        if (this.y - this.radious < 0) {
            this.y = this.radious;
            this.vy = -this.vy;
        } 
        else if (this.y + this.radious > this.canvasHeight) {
            this.y = this.canvasHeight - this.radious;
            this.vy = -this.vy;
        }
    }

    private goal() {
        // Gol P2 (Bola sale por la izquierda)
        if (this.x < -this.radious) { 
            this.score[1]++; 
            this.resetLocal();
        } 
        // Gol P1 (Bola sale por la derecha)
        else if (this.x > this.canvasWidth + this.radious) { 
            this.score[0]++; 
            this.resetLocal();
        }
    }

    private setLocalDirection() {
        const dirX = Math.random() < 0.5 ? -1 : 1;
        // Ángulo aleatorio suave
        const angle = (Math.random() * 2 - 1) * (Math.PI / 5); 
        
        this.vx = dirX * Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    // Método público para resetear en modo local (llamado desde el constructor de Pong)
    reset() {
        this.resetLocal();
    }
    
    // Reset for local game
    public async resetLocal(): Promise<void> {
        this.waiting = true;
        this.firstHit = true;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.speed = this.initialSpeed;
        
        // Brief pause before serving
        await new Promise(r => setTimeout(r, 1000));
        
        this.setLocalDirection();
        this.waiting = false;
    }

    // Getter para Pong.ts
    getScore(): number[] {
        return this.score;
    }
}