export class Ball
{
    x: number;
    y: number;
    radious: number;
    speed: number;

    dirX: number;
    dirY: number;

    canvasHeight: number;
    canvasWidth: number;

    spawnX: number;
    spawnY: number;

    waiting: boolean;

    score: number[] = [];

    constructor(c: HTMLCanvasElement)
    {
        this.x = this.spawnX = c.width / 2;
        this.y = this.spawnY = c.height / 2;
        this.dirX = this.dirY = 0;
        this.radious = 5;
        this.speed = 5;
        this.canvasWidth = c.width;
        this.canvasHeight = c.height;
        this.waiting = false;
        this.score[0] = 0;
        this.score[1] = 0;

        this.setDirection();
    }

    private setDirection()
    {
        const dirX = Math.random() < 0.5 ? -1 : 1;
        const dirY = Math.random() * 2 - 1;
        const leng = Math.sqrt(dirX * dirX + dirY * dirY);

        this.dirX = (dirX / leng) * this.speed;
        this.dirY = (dirY / leng) * this.speed;
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

    private wallCollision()
    {
        if (this.y <= this.radious || this.y >= this.canvasHeight - this.radious)
            this.dirY = -this.dirY;
    }

    private async reset(): Promise<void>
    {
        this.waiting = true;

        this.x = this.spawnX;
        this.y = this.spawnY;
        this.setDirection();

        await this.delay(1000);

        this.waiting = false;
    }

    private goal()
    {
        if (this.x <= 5)
        {
            // Score player2
            this.score[1]++;
            this.reset();
        }
        else if (this.x >= this.canvasWidth - 5)
        {
            // Score player 1
            this.score[0]++;
            this.reset();
        }
    }

    update()
    {
        if (this.waiting)
            return ;

        this.wallCollision();
        this.x += this.dirX;
        this.y += this.dirY;
        this.goal();
    }

    getScore(): number[]
    {
        return this.score;
    }
}


// import { Player } from './Player.ts'

// export class Ball
// {
//     // Current pos
//     private                 x: number;
//     private                 y: number;
//     // Initial pos
//     private readonly        spawnX: number;
//     private readonly        spawnY: number;
//     // Direction
//     private                 dirX: number;
//     private                 dirY: number;
//     // Canvas size
//     private readonly        canvasWidth: number;
//     private readonly        canvasHeight: number;
//     // Ball data
//     static readonly         radious: number = 5;
//     static readonly         initialSpeed: number = 4;
//     static readonly         speed: number = 12;
//     private                 reset: boolean;

//     private setDirection(s: number)
//     {
//         const dirX = Math.random() < 0.5 ? -1 : 1;
//         const dirY = Math.random() * 2 - 1;
//         const leng = Math.sqrt(dirX * dirX + dirY * dirY);

//         this.dirX = (dirX / leng) * s;
//         this.dirY = (dirY / leng) * s;
//     }

//     constructor(x: number, y: number, width: number, height: number)
//     {
//         this.x = this.spawnX = x;
//         this.y = this.spawnY = y;

//         this.dirX = this.dirY = 0;
//         this.reset = false;

//         this.setDirection(Ball.initialSpeed);

//         this.canvasWidth = width;
//         this.canvasHeight = height;

              
//     }

//     private score()
//     {
//         if (this.x <= 20 || this.x >= this.canvasWidth - 20)
//         {            
//             // this.reset = true;
//             this.x = this.spawnX;
//             this.y = this.spawnY;
//         }
//     }

//     private setSpeed()
//     {
//         const leng = Math.sqrt(this.dirX * this.dirX + this.dirY * this.dirY);

//         this.dirX = (this.dirX / leng) * Ball.speed;
//         this.dirY = (this.dirY / leng) * Ball.speed;
//     }

//     // Ball collision with player
//     paddleCollision(p: Player)
//     {
//         const px = p.getX();
//         const py = p.getY();
//         const pw = p.getWidth();
//         const ph = p.getHeight();

//         if (this.x + Ball.radious >= px && this.x - Ball.radious <= px + pw)
//         {
//             if (this.y >= py && this.y <= py + ph)
//             {
//                 this.dirX = -this.dirX;
//                 this.setSpeed();
//             }
//         }
//     }

//     private wallCollision()
//     {
//         // Top wall
//         if (this.y <= 0 + Ball.radious)
//             this.dirY = -this.dirY;
//         // Bottom wall
//         else if (this.y >= this.canvasHeight - Ball.radious)
//             this.dirY = -this.dirY;
//     }

//     // Move the ball + wall collision + score
//     move()
//     {
//         this.wallCollision();
//         this.x += this.dirX;
//         this.y += this.dirY;
//         this.score();
//     }

//     // Draw the ball
//     draw(ctx: CanvasRenderingContext2D)
//     {
//         if (!this.reset)
//         {
//             ctx.beginPath();
//             ctx.arc(this.x, this.y, Ball.radious, 0, Math.PI * 2);
//             ctx.fill();
//         }
//     }
// }