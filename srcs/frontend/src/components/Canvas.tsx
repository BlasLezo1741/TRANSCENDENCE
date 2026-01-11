import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"
import { sendMove, onGameUpdate, onMatchFound, socket, onGameOver, onPlayerOffline } from '../services/socketService'; 
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
            ballInit
            // Callback: Esto se ejecuta cuando TU detectas un gol (solo si eres P1)
            // (score, dir) => {
            //     // console.log("📤 Enviando Score al servidor:", score); // Descomentar para debug
            //     socket.emit('update_score', { score, ballDir: dir }); 
            //}
            //() => {} // Callback vacío, ya no usamos 'update_score' desde cliente
        );

        // --- 3. EVENTOS DEL SOCKET ---

        const handleMatchFound = (data: any) => {
            console.log("✅ Sala confirmada:", data.roomId);
        };

        // --- NUEVO: FÍSICA DEL SERVIDOR ---
        // Este evento ocurre 60 veces por segundo
        socket.on('game_update_physics', (data: { ball: {x: number, y: number}, score: number[] }) => {
            // 1. Sincronizar Bola (Backend 0.0-1.0 -> Frontend Píxeles)
            if (game.ball) {
                game.ball.sync(data.ball.x, data.ball.y);
            }
            
            // 2. Sincronizar Marcador (Si la clase Pong tiene método para esto)
            // Asumimos que Pong tiene una propiedad score o método setScore
            if (game.score) {
                 game.score = data.score;
            }
        });

        // Movimiento del Oponente (Suavizado visual)
        const handleGameUpdate = (data: any) => {
            if (data.playerId !== socket.id) {
                // data.move es la dirección ('up', 'down')
                // data.y es la posición exacta (si la implementaste en frontend)
                game.moveOpponent(data.move); 
                
                // Si implementas corrección de posición en Pong.ts:
                // if (data.y !== undefined) game.setOpponentY(data.y);
            }
        };

        const handleGameOver = (data: any) => {
            console.log("🏁 Game Over recibido. Ganador:", data.winner);
            
            // Paramos animación
            cancelAnimationFrame(animationId);
            
            if (mode === 'remote' || mode === 'tournament') {
                 // Lógica de cierre remota
                 alert("Game Over! Winner: " + data.winner);
                 dispatch({ type: "MENU" });
            } else {
                 // Lógica local
                 alert("Partida finalizada.");
                 dispatch({ type: "MENU" });
            }
        };

        const handlePlayerOffline = () => {
            console.warn("⚠️ Rival desconectado");
        };

        // Activamos listeners
        onMatchFound(handleMatchFound);
        //socket.on('score_updated', handleScoreUpdate); // Ya no es necesario separado, viene en physics, pero puedes dejarlo si quieres sonidos.
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

        // --- BUCLE DE RENDERIZADO (NO FÍSICA) ---
        let animationId: number;

        const renderLoop = () =>
        {
            // IMPORTANTE: game.update() ya no debe calcular física de bola.
            // Si Pong.ts aún mueve la bola localmente, deberás eliminar eso en Pong.ts
            // o crear un método game.updateVisualsOnly().
            // Por ahora, llamamos a update asumiendo que solo mueve palas locales.
            game.update(); 
            
            game.draw(); // Dibuja la bola en la posición sincronizada por 'sync()'

            animationId = requestAnimationFrame(renderLoop);
        };

        renderLoop();
        
        // --- 6. CLEANUP ---
        return () =>
        {
            cancelAnimationFrame(animationId);

            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            
            socket.off('game_update_physics'); // <--- IMPORTANTE: Limpiar nuevo evento
            socket.off('game_update');
            socket.off('match_found');
            socket.off('game_over');
            socket.off('player_offline');
            socket.off('score_updated');
        };
    
    }, [mode, userName, opponentName, ballInit, playerSide, dispatch]); 

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;