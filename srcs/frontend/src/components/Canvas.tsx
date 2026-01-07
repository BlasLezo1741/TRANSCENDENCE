import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"
import { sendMove, onGameUpdate, onMatchFound, finishGame, socket } from '../services/socketService'; //IMPORTAMOS EL SERVICIO DE SOCKETS
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
        //Inicializar juego
        const game = new Pong(canvas, ctx, mode, playerNumber, 5);
        //Escuchar cuando el servidor confirma la sala
        onMatchFound((data) => {
            console.log("✅ Sala confirmada desde el servidor:", data.roomId);
        });
        // Receptor de movimientos del oponente
        onGameUpdate((data) => {
            // Solo movemos si el ID no es el nuestro (es el oponente)
            if (data.playerId !== socket.id) {
                // Importante: Tu clase Pong debe tener un método que acepte 'up', 'down' o 'stop'
                // para la paleta que no controlas tú.
                game.moveOpponent(data.move); 
            }
        });

        // Keys

        const handleKeyUp = (e: KeyboardEvent) => {
            game.keysPressed[e.key] = false;
            //ENVIAR "STOP" AL SERVIDOR
            // Solo si estamos en modos online y son las teclas de movimiento
            if (mode !== 'ia' && ['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                sendMove('stop'); // <--- NUEVO  
            }          
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (game.keysPressed[e.key]) return;//Para que al mantener la tecla pulsado solo se envie un movimiento
            game.keysPressed[e.key] = true;
            // ENVIAR MOVIMIENTO AL SERVIDOR
            if (mode !== 'ia') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    sendMove('up');   // <--- NUEVO
                }
                else if (e.key === 'ArrowDown' || e.key === 's') {
                    sendMove('down'); // <--- NUEVO
                }
            }
            if (e.code === "Space" && mode != "remote")
                game.setPause();  
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        let animationId: number;

        const gameLoop = () =>
        {
            game.update();
            game.draw();

            if (game.hasWinner())
            {
                const winnerName = game.getWinner(); // Esto devolverá el ganador
                console.log("🏆 JUEGO TERMINADO. Ganador:", winnerName);
                //IMPORTANTE: Enviamos el aviso al servidor
                finishGame(winnerName);

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
            socket.off('game_update');//Limpieza del socket
        };
    }, [mode, playerNumber]);

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;