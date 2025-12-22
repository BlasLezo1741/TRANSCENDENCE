import React, {useRef, useEffect} from "react";
import { Player } from '../ts/models/Player.ts';
import type { PlayerDir } from "../ts/types/direction.ts";

const getDir: Record<string, PlayerDir> = {
    ArrowUp: "up",
    ArrowDown: "down",
    w: "up",
    s: "down",
};

const Canvas: React.FC = () =>
{
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() =>
    {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;

        // 1. Create game objects

        const players: Player[] = [
            new Player("Jose Luis", 20, 50, "w", "s", canvas.height),
            new Player("Alberto", 760, 50, "ArrowUp", "ArrowDown", canvas.height)
        ];
        // const ball = new Ball();

        const keysPressed: Record<string, boolean> = {};

        window.addEventListener("keyup", (e) => {
            if (getDir[e.key]) keysPressed[e.key] = false;
        });
        window.addEventListener("keydown", (e) => {
            if (getDir[e.key]) keysPressed[e.key] = true;
        });

        const update = () =>
        {
            
            // ball.move();
            players.forEach(p => 
            {
                p.move(keysPressed);
            });
        }

        const draw = () =>
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "white";
            players[0].draw(ctx);
            players[1].draw(ctx);
            // players.forEach( p =>
            // {
            //     p.draw(ctx);
            // });
            // ball.draw(ctx);
        }

        const gameLoop = () =>
        {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();

        // Clean listener
        // return () => 
        // {
        //     window.removeEventListener("keydown", handleKeyDown);
        // };
    }, []);

    return <canvas ref={canvasRef}/>;
};

export default Canvas;