import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"

import type { GameMode } from "../ts/types.ts";

type CanvasProps = {
    mode: GameMode;
    dispatch: React.Dispatch<any>;
    playerNumber?: 1 | 2; // Only for remote
};

function Canvas({ mode, dispatch, playerNumber = 1 }: CanvasProps)
{
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;

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

            if (game.hasWinner())
            {
                alert("The player " + game.getWinner() + " has won!");
                dispatch({ type: "MENU"});
                return ;
            }

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

export default Canvas;