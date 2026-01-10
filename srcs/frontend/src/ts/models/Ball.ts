import { Player } from "./Player.ts";

export class Ball
{
    x: number;
    y: number;
    radious: number;

    speed: number;
    initialSpeed: number;
    baseSpeed: number;
    maxSpeed: number;
    increaseSpeed: number;

    vx: number;
    vy: number;

    canvasHeight: number;
    canvasWidth: number;

    spawnX: number;
    spawnY: number;

    firstHit: boolean;
    waiting: boolean;

    maxAngle: number;

    score: number[] = [];

    constructor(c: HTMLCanvasElement)
    {
        this.x = this.spawnX = c.width / 2;
        this.y = this.spawnY = c.height / 2;

        this.vx = this.vy = 0;
        this.score = [0, 0];
        
        this.radious = 5;

        this.speed = this.initialSpeed = 5;
        this.baseSpeed = 10;
        this.maxSpeed = 20;
        this.increaseSpeed = 0.4;
        
        this.canvasWidth = c.width;
        this.canvasHeight = c.height;
        
        this.waiting = false;
        this.firstHit = true;
        
        this.maxAngle = Math.PI / 4;
        
        // NO iniciamos movimiento automáticamente aquí para evitar desincronización
        // Lo hará el Pong o el Servidor
        // Inicio aleatorio solo la primera vez (si no hay servidor)
        //this.setDirection(1);
    }

    private setDirection(direction: number = 0)
    {
        //const dirX = Math.random() < 0.5 ? -1 : 1;
        //const dirY = Math.random() * 2 - 1;
        // Si nos pasan dirección (1 o -1), la usamos. Si es 0, aleatorio.
        const dirX = direction !== 0 ? direction : (Math.random() < 0.5 ? -1 : 1);
        
        // En los saques tras gol, usamos Y=0 para evitar problemas de sincro, 
        // o un valor fijo pequeño.
        const dirY = 0;
        
        const leng = Math.sqrt(dirX * dirX + dirY * dirY);

        this.vx = (dirX / leng) * this.speed;
        this.vy = (dirY / leng) * this.speed;
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radious, 0, Math.PI * 2);
        ctx.fill();
    }

    private delay(ms: number): Promise<void>
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    //MODIFICADO: Acepta dirección opcional
    //public async reset(): Promise<void>
    public async reset(direction: number = 0): Promise<void>
    {
        this.waiting = this.firstHit = true;

        this.x = this.spawnX;
        this.y = this.spawnY;

        this.speed = this.initialSpeed;

        //this.setDirection();
        // Llamamos a setDirection con la dirección específica
        this.setDirection(direction);

        await this.delay(1000);
        this.waiting = false;
    }

    public async setServerDirection(dirX: number, dirY: number): Promise<void>
    {
        // 1. Reseteamos estado igual que en reset()
        this.waiting = true;
        this.firstHit = true;
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.speed = this.initialSpeed;

        // 2. APLICAMOS LA DIRECCIÓN DEL SERVIDOR (Aquí está la clave)
        // En lugar de calcular ángulos aleatorios, usamos lo que nos llega
        this.vx = dirX * this.speed;
        this.vy = dirY * this.speed;

        // 3. Esperamos 1 segundo para que ambos jugadores estén listos
        await this.delay(1000);
        this.waiting = false;
    }

    // --- CAMBIO IMPORTANTE: YA NO CAMBIA EL SCORE NI HACE RESET ---
    // Solo devuelve quién ha marcado: 0 (nadie), 1 (Izq marcó), 2 (Der marcó)
    public checkBounds(): number
    {
        if (this.x <= 5) return 2; // Gol en la izquierda -> Punto para Jugador 2 (Derecha)
        if (this.x >= this.canvasWidth - 5) return 1; // Gol en la derecha -> Punto para Jugador 1 (Izquierda)
        return 0;
    }

    // --- NUEVO: MÉTODO PARA FORZAR EL SCORE ---
    public setScore(p1: number, p2: number) {
        this.score = [p1, p2];
    }

    // private goal()
    // {
    //     if (this.x <= 5)
    //     {
    //         // Score player2
    //         this.score[1]++;
    //         this.reset(-1);
    //     }
    //     else if (this.x >= this.canvasWidth - 5)
    //     {
    //         // Score player 1
    //         this.score[0]++;
    //         this.reset(1);
    //     }
    // }

    private checkPaddle(player: Player)
    {
        const px = player.getX();
        const py = player.getY();
        const width = player.getWidth();
        const height = player.getHeight();

        const closestX = Math.max(px, Math.min(this.x, px + width));
        const closestY = Math.max(py, Math.min(this.y, py + height));

        const dx = this.x - closestX;
        const dy = this.y - closestY;

        if (dx * dx + dy * dy > this.radious * this.radious)
            return;

        const paddleCenterX = px + width / 2;
        const paddleCenterY = py + height / 2;

        const diffX = this.x - paddleCenterX;
        const diffY = this.y - paddleCenterY;

        const overlapX = width / 2 + this.radious - Math.abs(diffX);
        const overlapY = height / 2 + this.radious - Math.abs(diffY);

        if (overlapX < overlapY)
        {
            if (this.firstHit)
            {
                this.speed = this.baseSpeed;
                this.firstHit = false;
            }
            else
                this.speed = Math.min(this.speed + this.increaseSpeed, this.maxSpeed);

            const hitPos = diffY / (height / 2);
            const clampedHit = Math.max(-1, Math.min(1, hitPos));
            const angle = clampedHit * this.maxAngle;

            const dir = this.vx > 0 ? -1 : 1;

            this.vx = Math.cos(angle) * this.speed * dir;
            this.vy = Math.sin(angle) * this.speed;

            this.x += dir * overlapX;
        }
        else
        {
            this.vy = -this.vy;
            this.y += diffY > 0 ? overlapY : -overlapY;
        }
    }

    private paddleCollision(p: Player[])
    {
        this.checkPaddle(p[0]);
        this.checkPaddle(p[1]);
    }

    private wallCollision()
    {
        if (this.y - this.radious < 0)
        {
            const overlap = this.radious - this.y;
            this.y += overlap;
            this.vy = -this.vy;
        }
        else if (this.y + this.radious > this.canvasHeight)
        {
            const overlap = this.y + this.radious - this.canvasHeight;
            this.y -= overlap;
            this.vy = -this.vy;
        }

        const MIN_VY = 0.5;

        if (Math.abs(this.vy) < MIN_VY)
            this.vy = Math.sign(this.vy || 1) * MIN_VY;
    }

    update(p: Player[])
    {
        if (this.waiting)
            return ;

        this.wallCollision();
        this.paddleCollision(p);
        this.x += this.vx;
        this.y += this.vy;
        //this.goal();
    }

    getScore(): number[]
    {
        return this.score;
    }
}