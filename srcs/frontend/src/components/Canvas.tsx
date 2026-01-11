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

    const roomIdRef = useRef<string>(""); // Aquí guardaremos el ID de la sala
    const lastSentY = useRef<number>(0.5); // Aquí la última posición enviada

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

        // --- 2. INSTANCIAR JUEGO ---
        const game = new Pong(
            canvas,
            ctx,
            mode,
            finalPlayerNumber,
            leftName,
            rightName,
            ballInit
        );

        // --- 3. EVENTOS DEL SOCKET ---

        const handleMatchFound = (data: any) => {
            console.log("✅ Sala confirmada:", data.roomId);
            roomIdRef.current = data.roomId;
        };

        // --- NUEVO: FÍSICA DEL SERVIDOR ---
        // Este evento ocurre 60 veces por segundo
        socket.on('game_update_physics', (data: any) => {
            if (!game) return;

            // 1. SINCRONIZAR BOLA
            if (game.ball && data.ball) {
                // Multiplicamos AQUÍ por width/height
                const pixelX = data.ball.x * canvas.width;
                const pixelY = data.ball.y * canvas.height;
                
                // Pasamos píxeles ya calculados
                game.ball.sync(pixelX, pixelY);
            }
            
            // 2. SINCRONIZAR PALA DEL OPONENTE (Corregido: Centro -> Top-Left)
            if (data.paddles) {
                // 1. Obtenemos la posición Y del servidor (0.0 a 1.0) -> Es el CENTRO
                const serverY = (game.playerNumber === 1 ? data.paddles.right : data.paddles.left);
                
                // 2. Convertimos a Píxeles (Sigue siendo el centro en píxeles)
                const centerInPixels = serverY * canvas.height;

                // 3. ¡CRÍTICO! Restamos la mitad de la altura para obtener la esquina superior
                // Usamos la altura real definida en tu clase Player (100)
                const topLeftY = centerInPixels - (game.player2.getHeight() / 2);

                // 4. Asignamos
                if (game.playerNumber === 1) {
                    game.player2.y = topLeftY; 
                } else {
                    game.player1.y = topLeftY; 
                }
            }
            
            // 3. Sincronizar MARCADOR
            if (game.score && data.score) {
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
            //if (game.keysPressed[e.key]) return;
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
            game.update(); 
            game.draw(); 

            // --- ENVIAR POSICIÓN AL SERVIDOR ---
            if (mode.includes('remote') || mode === 'tournament') {
                const myPlayer = game.playerNumber === 1 ? game.player1 : game.player2;
                
                // Calculamos centro normalizado
                const myCenterY = (myPlayer.y + (myPlayer.height / 2)) / canvas.height;

                // Usamos roomIdRef.current en lugar de data.roomId
                if (roomIdRef.current && Math.abs(myCenterY - lastSentY.current) > 0.001) {
                    
                    socket.emit('paddle_move', { 
                        roomId: roomIdRef.current, // <--- AQUI ESTABA EL ERROR
                        y: myCenterY 
                    });
                    
                    lastSentY.current = myCenterY;
                }
            }

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
            //socket.off('game_update');
            //socket.off('match_found');
            socket.off('game_over');
            socket.off('player_offline');
            //socket.off('score_updated');
        };
    
    }, [mode, userName, opponentName, ballInit, playerSide, dispatch]); 

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;