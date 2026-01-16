import { Ball } from "./Ball.ts";
import { Player } from "./Player.ts";
import type { GameMode } from "../types.ts";

export class Pong
{
    c: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    mode: GameMode;
    player1: Player;
    player2: Player;
    ball: Ball;

    keysPressed: { [key: string]: boolean } = {};
    playerNumber: number; // 1 (Left) o 2 (Right)
    score: number[] = [0, 0];
    winner: string = "none";

    // Solo para local/IA
    maxScore: number = 5;
    end: boolean = false;
    pause: boolean = false;

    constructor(
        c: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        mode: GameMode,
        n: number,
        leftPlayerName: string,
        rightPlayerName: string,
        ballInit: { x: number, y: number } | null = null,
    )
    {
        this.c = c;
        this.ctx = ctx;
        this.mode = mode;
        this.playerNumber = n; 
        this.player1 = new Player(leftPlayerName, 20, c.height);
        this.player2 = new Player(rightPlayerName, c.width - 30, c.height);
        this.ball = new Ball(c);
        // LÓGICA DE SINCRONIZACIÓN
        if (ballInit) {
            this.ball.sync(ballInit.x, ballInit.y);
        }
    }

    // --- INPUT REMOTO (Socket) ---
    // Mueve la pala del rival visualmente en remoto
    moveOpponent(dir: 'up' | 'down' | 'stop') {
        const opponent = this.playerNumber === 1 ? this.player2 : this.player1;

        if (dir === 'up') opponent.moveUp(); // Asume que Player tiene moveUp()
        else if (dir === 'down') opponent.moveDown();
    }

    // --- UPDATE (Bucle Visual) ---
    update()
    {
        if (this.pause) return;

        // 1. MODO IA (Jugar contra Bot)
        if (this.mode === 'ia') {
            this.handleLocalInput(this.player1, 'w', 's'); // Humano (Izq)
            this.handleLocalInput(this.player1, 'ArrowUp', 'ArrowDown'); // Alternativa
            
            // IA del Bot (Derecha) - Asumiendo que Player tiene método moveIA
            // Si no lo tiene, avísame para dártelo.
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

    // --- UTILS ---

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

    private checkLocalWin() {
        // Actualizamos score local desde la bola
        this.score = this.ball.getScore();

        if (this.score[0] >= this.maxScore) {
            this.winner = this.player1.getName();
            this.end = true;
        } else if (this.score[1] >= this.maxScore) {
            this.winner = this.player2.getName();
            this.end = true;
        }
    }

    // --- DRAW (Renderizado) ---
    draw()
    {
        // 1. Limpiar
        this.ctx.clearRect(0, 0, this.c.width, this.c.height);

        // 2. Dibujar Red (Decoración)
        this.drawNet();

        // 3. Dibujar Elementos
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);
        this.ball.draw(this.ctx);

        // // 4. Dibujar Marcador (El que viene del server)
        // this.drawScore();
        // 4. Dibujar UI
        if (this.pause) {
            this.drawPause();
        } else {
            this.drawScore();
        }
    }

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

    private drawPause() {
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText("PAUSE", this.c.width / 2, this.c.height / 2);
    }

    private drawNet() {
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(this.c.width / 2, 0);
        this.ctx.lineTo(this.c.width / 2, this.c.height);
        this.ctx.strokeStyle = "white";
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.closePath();
    }

    setPause() {} 
    hasWinner(): boolean { return this.end; }
    getWinner() { return this.winner; }
}