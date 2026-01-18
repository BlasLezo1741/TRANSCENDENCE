import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"
import { sendMove, onGameUpdate, onMatchFound, finishGame, socket, onGameOver, onPlayerOffline } from '../services/socketService'; //IMPORTAMOS EL SERVICIO DE SOCKETS
import type { GameMode } from "../ts/types.ts";

type CanvasProps = {
    mode: GameMode;
    dispatch: React.Dispatch<any>;
    playerNumber?: 1 | 2; // Only for remote
    userName: string;
    opponentName?: string;
    ballInit: { x: number, y: number } | null;
    playerSide?: 'left' | 'right';
    roomId: string;
};

function Canvas({ mode, dispatch, playerNumber = 1, userName, opponentName = "Oponente", ballInit, playerSide = 'left', roomId }: CanvasProps)
{
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const roomIdRef = useRef<string>(roomId); //nuevo
    const animationIdRef = useRef<number | null>(null);
    const gameRunningRef = useRef(false);
    const lastSentY = useRef<number>(0.5); // Aquí la última posición enviada

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;
        // POSICIONAMIENTO EN PANTALLA
        let finalPlayerNumber = 1; // Por defecto somos el 1 (Izquierda)

        //logica de nombres
        let leftName = "P1";
        let rightName = "P2";

        if (mode.includes('remote') || mode === 'tournament') {
            if (playerSide === 'left') {
                finalPlayerNumber = 1;
                leftName = userName;
                rightName = opponentName;
            } else {
                finalPlayerNumber = 2;
                leftName = opponentName;
                rightName = userName;
            }
        } 
        else if (mode === 'ia') {
            leftName = userName;
            rightName = "IA-Bot";
        } 
        else {
            leftName = userName;
            rightName = "Invitado";
        }

        console.log(`🎮 INICIANDO JUEGO [${mode}] | Soy: ${finalPlayerNumber} (${playerSide})`);
        console.log(`⚔️ MATCH: ${leftName} (Izda) vs ${rightName} (Dcha)`);

        //Inicializar juego
        //const game = new Pong(canvas, ctx, mode, playerNumber, 5);
        const game = new Pong(
            canvas,
            ctx,
            mode,
            //playerNumber,
            finalPlayerNumber,
            leftName,
            rightName,
            ballInit
        );
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

        // Cuando TU RIVAL GANA. El servidor te avisa a ti.
        onGameOver((data) => {
            console.log("🏁 Game Over recibido del servidor. Ganador:", data.winner);
            // Evitamos que salte la alerta dos veces si fuimos nosotros los que ganamos
            if (!game.hasWinner()) {
                alert("Game Over! The winner is: " + data.winner);
                dispatch({ type: "MENU" });
            }
        });

        // --- Escuchar Desconexión ---
        onPlayerOffline((data) => {
            console.warn("⚠️ El oponente se ha desconectado");
            // Aquí podrías pausar el juego o dar la victoria automática
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

        const handleKeyDown = (e: KeyboardEvent) =>
        {
            e.preventDefault();
            if (game.keysPressed[e.key]) return;//Para que al mantener la tecla pulsado solo se envie un movimiento
            game.keysPressed[e.key] = true;
            // ENVIAR MOVIMIENTO AL SERVIDOR
            if (mode !== 'ia') {
                if (e.key === 'ArrowUp' || e.key === 'w')
                {
                    sendMove('up');   // <--- NUEVO
                }
                else if (e.key === 'ArrowDown' || e.key === 's')
                {
                    sendMove('down'); // <--- NUEVO
                }
            }
            if (e.code === "Space" && mode != "remote")
                game.setPause();  
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        const gameLoop = () =>
        {
            if (!gameRunningRef.current) return;

            game.update();
            game.draw();

            if (game.hasWinner())
            {
                const winnerName = game.getWinner(); 
                console.log("🏆 JUEGO TERMINADO. Ganador:", winnerName);
                
                if (mode === 'remote')
                {
                    finishGame(winnerName); 
                } else
                {
                    console.log("ℹ️ Partida local/IA finalizada. No se guarda en DB.");
                }

                alert("The player " + game.getWinner() + " has won!");
                dispatch({ type: "MENU"});
                return ;
            }

            animationIdRef.current = requestAnimationFrame(gameLoop);
        };

        setTimeout(() =>
        {
            gameRunningRef.current = true;
            animationIdRef.current = requestAnimationFrame(gameLoop);
        }, 100);
        
        return () =>
        {
            gameRunningRef.current = false;
            if (animationIdRef.current !== null)
                cancelAnimationFrame(animationIdRef);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            socket.off('game_update');//Limpieza del socket
            socket.off('match_found');
            socket.off('game_over');
            socket.off('player_offline');
        };
    }, [mode, playerNumber, userName, opponentName, ballInit, playerSide]);

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;