import type { GameDifficult } from "../types.ts";

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

    constructor(name: string, x: number, h: number, diff: GameDifficult)
    {
        this.nickname = name;
        this.x = x;
        this.width = 10;

        if (diff === "easy")
        {
            this.height = h * 0.25;
            this.speedIA = 5;
        }
        else if (diff === "normal" || diff === "")
        {
            this.height = h * 0.20;
            this.speedIA = 7;
        }
        else if (diff === "hard")
        {
            this.height = h * 0.1;
            this.speedIA = 10;
        }
        else
        {
            this.height = h * 0.06;
            this.speedIA = 12;
        }
        
        this.speed = 10;
        this.canvasHeight = h;
        // MEJORA: Centrar verticalmente según la altura real del canvas
        this.y = (h / 2) - (this.height / 2);
        this.color = "white";
    }

    moveIA(ballPosition: number)
    {
        const center = this.y + this.height / 2;
        const diff = ballPosition - center;

        // 10px dead zone to prevent the AI from vibrating if the ball is in the center
        if (Math.abs(diff) < 10) return;

        if (Math.abs(diff) > this.speedIA)
            this.y += this.speedIA * Math.sign(diff);
        else
            this.y += diff;
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

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // --- GETTERS & SETTERS ---
    // ---  Sends absolute position to server (0.0 to 1.0)
    getNormalizedY(): number {
        // Visual position (Top) + Half height = Center
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