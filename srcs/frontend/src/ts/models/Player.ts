export class Player
{
    nickname: string;
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    speedIA: number;
    canvasHeight: number;
    color: string;

    constructor(name: string, x: number, h: number)
    {
        this.nickname = name;
        this.x = x;
        this.width = 10;
        //this.height = 100;
        this.height = h * 0.20;
        this.speed = 10;
        this.speedIA = 5;
        this.canvasHeight = h;
        // MEJORA: Centrar verticalmente según la altura real del canvas
        this.y = (h / 2) - (this.height / 2);
        this.color = "white";
    }

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

        // if (this.y < 0)
        //     this.y = 0;
        // else if (this.y + this.height > this.canvasHeight)
        //     this.y = this.canvasHeight - this.height;
        // Límites de pantalla. Cambio propuesto
        this.clampY();
    }
    // --- MOVIMIENTO MANUAL ---
    moveUp()
    {
        this.y -= this.speed;
        this.clampY();
    }

    moveDown()
    {
        this.y += this.speed;
        this.clampY();
    }

    // Helper para no salirse de la pantalla
    private clampY() 
    {
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > this.canvasHeight) 
            this.y = this.canvasHeight - this.height;
    }
    // moveUp()
    // {
    //     this.y = Math.max(0, this.y - this.speed);
    // }

    // moveDown()
    // {
    //     this.y = Math.min(this.canvasHeight - this.height, this.y + this.speed);
    // }

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // --- GETTERS & SETTERS ---
    // --- NUEVO: Útil para enviar posición absoluta al server (0.0 a 1.0) ---
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
    
    getX(): number
    {
        return this.x;
    }

    getY(): number
    {
        return this.y;
    }

    getWidth(): number
    {
        return this.width;
    }

    getHeight(): number
    {
        return this.height;
    }

    getName(): string
    {
        return this.nickname;
    }
}