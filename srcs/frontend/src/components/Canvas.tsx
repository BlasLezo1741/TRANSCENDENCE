import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"
import { sendMove, onGameUpdate, onMatchFound, finishGame, socket, onGameOver, onPlayerOffline } from '../services/socketService'; 
import type { GameMode } from "../ts/types.ts";

type CanvasProps = {
    mode: GameMode;
    dispatch: React.Dispatch<any>;
    playerNumber?: 1 | 2; 
    userName: string;
    opponentName?: string;
    ballInit: { x: number, y: number } | null;
    playerSide?: 'left' | 'right';
};

function Canvas({ mode, dispatch, userName, opponentName = "Oponente", ballInit, playerSide = 'left' }: CanvasProps)
{
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // -----------------------------------------------------------
    // INICIO DEL USE EFFECT (Todo ocurre aquí dentro)
    // -----------------------------------------------------------
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;

        // --- 1. LÓGICA DE POSICIONAMIENTO ---
        let finalPlayerNumber = 1; 
        let leftName = "P1";
        let rightName = "P2";

        if (mode === 'remote' || mode === 'tournament') {
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

        // --- 2. INSTANCIAR JUEGO ---
        const game = new Pong(
            canvas,
            ctx,
            mode,
            finalPlayerNumber,
            5,
            leftName,
            rightName,
            ballInit,
            // Callback: Esto se ejecuta cuando TU detectas un gol (solo si eres P1)
            (score, dir) => {
                // console.log("📤 Enviando Score al servidor:", score); // Descomentar para debug
                socket.emit('update_score', { score, ballDir: dir }); 
            }
        );

        // --- 3. EVENTOS DEL SOCKET ---

        const handleMatchFound = (data: any) => {
            console.log("✅ Sala confirmada:", data.roomId);
        };

        const handleScoreUpdate = (data: { score: number[], ballDir: number }) => {
            console.log("⚽ Score recibido del servidor:", data.score);
            game.syncScore(data.score, data.ballDir);
        };

        const handleGameUpdate = (data: any) => {
            if (data.playerId !== socket.id) {
                game.moveOpponent(data.move); 
            }
        };

        const handleGameOver = (data: any) => {
            console.log("🏁 Game Over recibido. Ganador:", data.winner);
            if (!game.hasWinner()) {
                alert("Game Over! The winner is: " + data.winner);
                dispatch({ type: "MENU" });
            }
        };

        const handlePlayerOffline = () => {
            console.warn("⚠️ Rival desconectado");
        };

        // Activamos listeners
        onMatchFound(handleMatchFound);
        socket.on('score_updated', handleScoreUpdate);
        onGameUpdate(handleGameUpdate);
        onGameOver(handleGameOver);
        onPlayerOffline(handlePlayerOffline);

        // --- 4. CONTROLES DE TECLADO ---

        const handleKeyUp = (e: KeyboardEvent) => {
            game.keysPressed[e.key] = false;
            
            if (mode !== 'ia' && ['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                sendMove('stop'); 
            }          
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (game.keysPressed[e.key]) return;
            game.keysPressed[e.key] = true;
            
            if (mode !== 'ia') {
                if (e.key === 'ArrowUp' || e.key === 'w') {
                    sendMove('up');   
                }
                else if (e.key === 'ArrowDown' || e.key === 's') {
                    sendMove('down'); 
                }
            }
            if (e.code === "Space" && mode !== "remote")
                game.setPause();  
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        // --- 5. BUCLE DEL JUEGO (GAME LOOP) ---
        let animationId: number;
        let timeoutId: any;

        // Definimos la función del bucle
        const gameLoop = () =>
        {
            game.update();
            game.draw();

            if (game.hasWinner())
            {
                const winnerName = game.getWinner(); 
                console.log("🏆 JUEGO TERMINADO. Ganador:", winnerName);
                
                if (mode === 'remote' || mode === 'tournament') {
                    finishGame(winnerName); 
                } else {
                    console.log("ℹ️ Partida local/IA finalizada.");
                    alert("The player " + game.getWinner() + " has won!");
                    dispatch({ type: "MENU"});
                }
                return;
            }

            animationId = requestAnimationFrame(gameLoop);
        };

        // Arrancamos el bucle con retraso (Aquí estaba el error de sintaxis antes)
        timeoutId = setTimeout(() => {
            gameLoop();
        }, 500);
        
        // --- 6. CLEANUP (AL DESMONTAR) ---
        return () =>
        {
            // Limpieza vital para evitar doble velocidad
            clearTimeout(timeoutId);
            cancelAnimationFrame(animationId);

            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            
            // Limpiamos sockets
            socket.off('game_update');
            socket.off('match_found');
            socket.off('game_over');
            socket.off('player_offline');
            socket.off('score_updated');
        };
    
    // --- CIERRE DEL USE EFFECT ---
    }, [mode, userName, opponentName, ballInit, playerSide, dispatch]); 

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;