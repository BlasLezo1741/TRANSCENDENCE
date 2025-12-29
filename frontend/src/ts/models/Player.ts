export class Player
{
    private             nickname: string;
    private             x: number;
    private             y: number;

    static readonly     width: number = 10;
    static readonly     height: number = 100;
    static readonly     speed: number = 10;

    private             keyUp: string;
    private             keyDown: string;

    private readonly    h: number

    constructor(nickname: string, x: number, y: number, up: string, down: string, h: number)
    {
        this.nickname = nickname;
        this.x = x;
        this.y = y;
        this.keyUp = up;
        this.keyDown = down;
        this.h = h;
    }

    move(keysPressed: Record<string, boolean>)
    {
        if (keysPressed[this.keyUp])
            this.y = Math.max(0, this.y - Player.speed);
        else if (keysPressed[this.keyDown])
            this.y = Math.min(this.h - Player.height, this.y + Player.speed);
    }

    draw(ctx: CanvasRenderingContext2D)
    {
        ctx.fillRect(this.x, this.y, Player.width, Player.height);
    }

    getX() { return this.x; }
    getY() { return this.y; }
    getWidth() { return Player.width; }
    getHeight() { return Player.height; }
}