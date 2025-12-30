export class Player
{
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    speedIA: number;
    canvasHeight: number;

    constructor(x: number, h: number)
    {
        this.x = x;
        this.y = 250;
        this.width = 10;
        this.height = 100;
        this.speed = 10;
        this.speedIA = 5;
        this.canvasHeight = h;
    }

    moveIA(ballPosition: number)
    {
        const center = this.y + this.height / 2;
        const diff = ballPosition - center;

        if (Math.abs(diff) > this.speedIA)
            this.y += this.speedIA * Math.sign(diff);
        else
            this.y += diff;

        if (this.y < 0)
            this.y = 0;
        else if (this.y + this.height > this.canvasHeight)
            this.y = this.canvasHeight - this.height;
    }

    moveUp()
    {
        this.y = Math.max(0, this.y - this.speed);
    }

    moveDown()
    {
        this.y = Math.min(this.canvasHeight - this.height, this.y + this.speed);
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}