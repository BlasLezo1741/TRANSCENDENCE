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
    update(p1: Player, p2: Player) {
        if (this.waiting) return;

        // 1. Guardar posición previa (CRUCIAL para evitar túnel)
        const prevX = this.x;
        const prevY = this.y;

        // 2. Mover bola temporalmente
        this.x += this.vx;
        this.y += this.vy;

        // 3. Chequear colisión con paredes (Arriba/Abajo)
        this.wallCollision();

        // 4. Chequear colisión con Palas usando TRAYECTORIA (No solo posición)
        this.checkPaddleCollision(p1, p2, prevX, prevY);

        // 5. Goles
        this.goal();
    }

    private checkPaddleCollision(p1: Player, p2: Player, prevX: number, prevY: number) {
        // --- PALA IZQUIERDA (P1) ---
        // La cara de la pala es: x + width
        const p1RightEdge = p1.getX() + p1.getWidth();
        
        // Si nos movemos a la izquierda (vx < 0) Y cruzamos la línea de la pala
        if (this.vx < 0 && prevX >= p1RightEdge && this.x <= p1RightEdge + this.radius) {
            
            // Calculamos la Y exacta del cruce
            const t = (p1RightEdge - prevX) / (this.x - prevX);
            const intersectY = prevY + t * (this.y - prevY);

            // Verificamos si tocamos la pala en altura
            if (intersectY >= p1.getY() - this.radious && 
                intersectY <= p1.getY() + p1.getHeight() + this.radious) {
                
                this.handlePaddleHit(p1, intersectY, 1); // 1 = dirección derecha
                this.x = p1RightEdge + this.radious + 1; // Sacar bola
            }
        }

        // --- PALA DERECHA (P2) ---
        // La cara de la pala es: x
        const p2LeftEdge = p2.getX();

        // Si nos movemos a la derecha (vx > 0) Y cruzamos la línea
        if (this.vx > 0 && prevX <= p2LeftEdge && this.x >= p2LeftEdge - this.radius) {
            
            const t = (p2LeftEdge - prevX) / (this.x - prevX);
            const intersectY = prevY + t * (this.y - prevY);

            if (intersectY >= p2.getY() - this.radious && 
                intersectY <= p2.getY() + p2.getHeight() + this.radious) {
                
                this.handlePaddleHit(p2, intersectY, -1); // -1 = dirección izquierda
                this.x = p2LeftEdge - this.radious - 1; // Sacar bola
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
        if (this.x < 0) {
            this.score[1]++; // Punto P2
            this.resetLocal();
        } else if (this.x > this.canvasWidth) {
            this.score[0]++; // Punto P1
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

    // Reseteo para juego local
    public async resetLocal(): Promise<void> {
        this.waiting = true;
        this.firstHit = true;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.speed = this.initialSpeed;
        
        // Pausa breve antes de sacar
        await new Promise(r => setTimeout(r, 500));
        
        this.setLocalDirection();
        this.waiting = false;
    }

    // Getter para Pong.ts
    getScore(): number[] {
        return this.score;
    }
}