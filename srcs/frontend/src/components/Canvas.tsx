import React, {useRef, useEffect} from "react";
import { Pong } from "../ts/models/Pong.ts"
import { socket } from '../services/socketService'; 
import type { GameMode } from "../ts/types.ts";

type CanvasProps = {
    mode: GameMode;
    dispatch: React.Dispatch<any>;
    playerNumber?: 1 | 2; 
    userName: string;
    opponentName?: string;
    ballInit: { x: number, y: number } | null;
    playerSide?: 'left' | 'right';
    roomId: string;
};

function Canvas({ mode, dispatch, userName, opponentName = "Oponente", ballInit, playerSide = 'left', roomId }: CanvasProps)
{
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const roomIdRef = useRef<string>(roomId); //nuevo
    
    //const roomIdRef = useRef<string | null>(null);//guardamos IDde la sala
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

        // --- FÍSICA DEL SERVIDOR ---
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
            
            //(Estrategia: Trust Local + Interpolación Rival)
            if (data.paddles) {
                const p1Height = game.player1.getHeight();
                const p2Height = game.player2.getHeight();

                // Posiciones objetivo según el servidor
                const targetY_P1 = (data.paddles.left * canvas.height) - (p1Height / 2);
                const targetY_P2 = (data.paddles.right * canvas.height) - (p2Height / 2);

                // Factor de suavizado (0.3 es equilibrado)
                const LERP = 0.3;

                if (game.playerNumber === 1) {
                    // --- SOY JUGADOR 1 (Izquierda) ---
                    
                    // MI PALA (P1): NO LA TOCAMOS. 
                    // Mi teclado la mueve en el renderLoop. Si la toco aquí, vibrará.
                    
                    // RIVAL (P2): Lo interpolamos suavemente hacia su destino
                    game.player2.y = game.player2.y + (targetY_P2 - game.player2.y) * LERP;
                } 
                else if (game.playerNumber === 2) {
                    // --- SOY JUGADOR 2 (Derecha) ---

                    // MI PALA (P2): NO LA TOCAMOS.
                    
                    // RIVAL (P1): Lo interpolamos suavemente
                    game.player1.y = game.player1.y + (targetY_P1 - game.player1.y) * LERP;
                }
            }
            // 3. Sincronizar MARCADOR
            if (game.score && data.score) {
                 game.score = data.score;
            }
        });

        const handleGameOver = (data: any) => {
            
            let winnerName = "Desconocido";
            if (data.winner === 'left') winnerName = leftName;
            else if (data.winner === 'right') winnerName = rightName;
            
            console.log("🏁 Game Over. Ganador:", winnerName);
            // Paramos animación
            cancelAnimationFrame(animationId);
            
            alert("Game Over! Winner: " + winnerName);
            dispatch({ type: "MENU" });

            // if (mode === 'remote' || mode === 'tournament') {
            //      // Lógica de cierre remota
            //      alert("Game Over! Winner: " + winnerName);
            //      dispatch({ type: "MENU" });
            // } else {
            //      // Lógica local
            //      alert("Partida finalizada.");
            //      dispatch({ type: "MENU" });
            // }
        };

        // Definimos qué hacer cuando el rival se desconecta
        const handleOpponentDisconnected = () => {
            console.warn("⚠️ Rival desconectado");
            alert("El rival se ha desconectado. Ganaste por abandono.");
            dispatch({ type: "MENU" });
        };

        // Activamos listeners de eventos de juego
        socket.on('game_over', handleGameOver);
        socket.on('opponent_disconnected', handleOpponentDisconnected);

        // --- 4. CONTROLES DE TECLADO ---

        const handleKeyUp = (e: KeyboardEvent) => {
            game.keysPressed[e.key] = false;
            
            // if (mode !== 'ia' && ['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
            //     sendMove('stop'); 
            // }          
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (game.keysPressed[e.key]) return;
            game.keysPressed[e.key] = true;
            if (e.code === "Space" && mode !== "remote")
                game.setPause();  
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        // --- BUCLE DE RENDERIZADO (NO FÍSICA) ---
        let animationId: number;

        const renderLoop = () => {
            // 1. Mover pala localmente (Tu teclado actualiza game.player1.y aquí)
            game.update(); 
            game.draw(); 

            // --- NUEVO BLOQUE: CONTROL DE VICTORIA LOCAL / IA ---
            // Solo entra aquí si NO estamos en modo online
            if (!mode.includes('remote') && mode !== 'tournament') {
                if (game.hasWinner()) {
                    const winnerName = game.getWinner();
                    
                    // Paramos el bucle inmediatamente
                    cancelAnimationFrame(animationId);
                    
                    // Avisamos y salimos
                    alert(`¡Juego Terminado! Ganador: ${winnerName}`);
                    dispatch({ type: "MENU" });
                    return; 
                }
            }
            // ----------------------------------------------------
            
            
            // 2. ENVIAR POSICIÓN AL SERVIDOR
            if (mode.includes('remote') || mode === 'tournament') {
                const myPlayer = game.playerNumber === 1 ? game.player1 : game.player2;
                
                // --- CÁLCULO DE COORDENADA ABSOLUTA ---
                // Obtenemos el centro de la pala en píxeles
                const myCenterPixel = myPlayer.y + (myPlayer.height / 2);
                
                // Lo convertimos a porcentaje (0.0 a 1.0)
                const myNormalizedY = myCenterPixel / canvas.height;

                // 3. Enviar solo si ha cambiado (para no saturar)
                // Usamos roomIdRef.current para asegurar que tenemos la ID
                if (roomIdRef.current && Math.abs(myNormalizedY - lastSentY.current) > 0.001) {
                    
                    socket.emit('paddle_move', { 
                        roomId: roomIdRef.current, 
                        y: myNormalizedY // <--- Enviamos el dato exacto, NO 'up' o 'down'
                    });
                    lastSentY.current = myNormalizedY;
                }
                // // DEBUG: SI NO ENTRA ARRIBA, MIRA POR QUÉ
                // else if (!roomIdRef.current) {
                //     console.warn("⛔ No hay RoomID, no puedo enviar movimiento");
                // }
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
            
            socket.off('game_update_physics');
            socket.off('game_over', handleGameOver);
            socket.off('opponent_disconnected', handleOpponentDisconnected);
        };
    
    }, [mode, userName, opponentName, ballInit, playerSide, dispatch, roomId]); 

    return <canvas ref={canvasRef} style={{background: "black"}}/>;
}

export default Canvas;