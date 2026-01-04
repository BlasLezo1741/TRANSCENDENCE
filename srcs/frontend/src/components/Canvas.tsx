import React, {useRef, useEffect} from "react";
<<<<<<< HEAD
import { Player } from '../ts/models/Player.ts';
import type { PlayerDir } from "../ts/types/direction.ts";
import { Ball } from '../ts/models/Ball.ts'

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
=======
import { Pong } from "../ts/models/Pong.ts"

import type { GameMode } from "../ts/types.ts";

type CanvasProps = {
    mode: GameMode;
    playerNumber?: 1 | 2; // Only for remote
};

function Canvas({ mode, playerNumber = 1 }: CanvasProps)
{
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
>>>>>>> 53_game
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;

<<<<<<< HEAD
        // Create game objects

        const players: Player[] = [
            new Player("Jose Luis", 20, 50, "w", "s", canvas.height),
            new Player("Alberto", 760, 50, "ArrowUp", "ArrowDown", canvas.height)
        ];
        const ball = new Ball(canvas.width / 2, canvas.height / 2, canvas.width, canvas.height);

        // Keys

        const keysPressed: Record<string, boolean> = {};

        window.addEventListener("keyup", (e) => {
            if (getDir[e.key]) keysPressed[e.key] = false;
        });
        window.addEventListener("keydown", (e) => {
            if (getDir[e.key]) keysPressed[e.key] = true;
        });

        // Update positions

        const update = () =>
        {
            players.forEach(p => 
            {
                p.move(keysPressed);
                ball.paddleCollision(p);
            });
            ball.move();
        }

        // Draw objects

        const draw = () =>
        {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "white";
            players.forEach( p =>
            {
                p.draw(ctx);
            });
            ball.draw(ctx);
        }

        const gameLoop = () =>
        {
            update();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();

    }, []);

    return <canvas ref={canvasRef}/>;
};
=======
        const game = new Pong(canvas, ctx, mode, playerNumber, 5);

        // Keys

        const handleKeyUp = (e: KeyboardEvent) => {
            game.keysPressed[e.key] = false;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            game.keysPressed[e.key] = true;

            if (e.code === "Space" && mode != "remote")
                game.setPause();  
        }

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        let animationId: number;

        const gameLoop = () =>
        {
            game.update();
            game.draw();
            animationId = requestAnimationFrame(gameLoop);
        };
        gameLoop();
        
        return () =>
        {
            cancelAnimationFrame(animationId);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [mode, playerNumber]);

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}
>>>>>>> 53_game

export default Canvas;