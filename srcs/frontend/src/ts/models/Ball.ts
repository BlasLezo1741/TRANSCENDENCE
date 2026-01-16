import { Player } from "./Player";

export class Ball
{
    // --- PROPIEDADES (Fusión de A y B) ---
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
    
    // Estado
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
        //this.checkPaddleCollision(p1, p2, prevX, prevY);
        this.checkPaddleCollision(player1, player2, prevX, prevY);
        // 5. Goles
        this.goal();
    }

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

    // Getter para Pong.ts
    getScore(): number[] {
        return this.score;
    }
}