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

    
    const roomIdRef = useRef<string | null>(null);//guardamos IDde la sala
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
            
            // 2. SINCRONIZAR PALAS 
            // if (data.paddles) {
            //     // --- JUGADOR 1 (Izquierda) ---
            //     // El servidor manda el CENTRO (0.0 a 1.0). Convertimos a Top-Left en Píxeles.
            //     const p1Height = game.player1.getHeight();
            //     const p1CenterY = data.paddles.left * canvas.height;
            //     game.player1.y = p1CenterY - (p1Height / 2);

            //     // --- JUGADOR 2 (Derecha) ---
            //     const p2Height = game.player2.getHeight();
            //     const p2CenterY = data.paddles.right * canvas.height;
            //     game.player2.y = p2CenterY - (p2Height / 2);

            //     // Debug temporal: Si sigues sin ver movimiento, descomenta esto para ver qué llega
            //     // console.log("P1 Y:", data.paddles.left, "P2 Y:", data.paddles.right);
            // }
            // if (data.paddles) {
            //     const p1Height = game.player1.getHeight();
            //     const p2Height = game.player2.getHeight();

            //     // Calculamos dónde dice el SERVIDOR que deben estar las palas
            //     const targetY_P1 = (data.paddles.left * canvas.height) - (p1Height / 2);
            //     const targetY_P2 = (data.paddles.right * canvas.height) - (p2Height / 2);

            //     // // --- OPCIÓN 1: SINCRONIZACIÓN DIRECTA (La que tenías antes) ---
            //     // // Elimina el efecto túnel, pero puede dar saltos si hay lag.
            //     // game.player1.y = targetY_P1;
            //     // game.player2.y = targetY_P2;

            //     // --- OPCIÓN 2: INTERPOLACIÓN (Prueba esta si quieres suavizar los tirones) ---
            //     // El 0.5 significa "muévete el 50% de la distancia hacia el objetivo en cada frame".
                
            //     const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;
            //     game.player1.y = lerp(game.player1.y, targetY_P1, 0.5);
            //     game.player2.y = lerp(game.player2.y, targetY_P2, 0.5);
                
            // }
                // if (data.paddles) {
                //     const p1Height = game.player1.getHeight();
                //     const p2Height = game.player2.getHeight();

                //     // Calculamos dónde dice el SERVIDOR que deben estar
                //     const targetY_P1 = (data.paddles.left * canvas.height) - (p1Height / 2);
                //     const targetY_P2 = (data.paddles.right * canvas.height) - (p2Height / 2);

                //     // Definimos un umbral de tolerancia (ej: 10% de la altura de la pala o unos 10-15 píxeles)
                //     // Si la diferencia es menor a esto, ignoramos al servidor para evitar vibración.
                //     const SYNC_THRESHOLD = p1Height * 0.2; // 20% de margen de error permitido
                //     const LERP_FACTOR = 0.3; // Suavizado para el rival (0.1 muy suave, 0.5 rápido)

                //     // --- LÓGICA DIFERENCIADA ---
                    
                //     if (game.playerNumber === 1) {
                //         // SOY EL JUGADOR 1 (Izquierda)
                        
                //         // A. MI PALA (P1): Solo corregimos si el servidor dice que estamos MUY lejos
                //         if (Math.abs(game.player1.y - targetY_P1) > SYNC_THRESHOLD) {
                //             game.player1.y = targetY_P1; // Corrección forzosa (lagazo o trampa)
                //         }
                //         // Si la diferencia es pequeña, NO HACEMOS NADA. Confiamos en tu movimiento local.

                //         // B. RIVAL (P2): Interpolamos siempre para que se vea suave
                //         game.player2.y = game.player2.y + (targetY_P2 - game.player2.y) * LERP_FACTOR;
                //     } 
                //     else if (game.playerNumber === 2) {
                //         // SOY EL JUGADOR 2 (Derecha)

                //         // A. MI PALA (P2): Solo corregimos si hay desincronización grave
                //         if (Math.abs(game.player2.y - targetY_P2) > SYNC_THRESHOLD) {
                //             game.player2.y = targetY_P2;
                //         }

                //         // B. RIVAL (P1): Interpolamos
                //         game.player1.y = game.player1.y + (targetY_P1 - game.player1.y) * LERP_FACTOR;
                //     }
                // }
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

        //// Movimiento del Oponente (Suavizado visual)
        // const handleGameUpdate = (data: any) => {
        //     if (data.playerId !== socket.id) {
        //         // data.move es la dirección ('up', 'down')
        //         // data.y es la posición exacta (si la implementaste en frontend)
        //         game.moveOpponent(data.move); 
                
        //         // Si implementas corrección de posición en Pong.ts:
        //         // if (data.y !== undefined) game.setOpponentY(data.y);
        //     }
        // };

        const handleGameOver = (data: any) => {
            
            let winnerName = "Desconocido";
            if (data.winner === 'left') winnerName = leftName;   // Variable definida al inicio del Canvas
            else if (data.winner === 'right') winnerName = rightName; // Variable definida al inicio del Canvas
            
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

        const handlePlayerOffline = () => {
            console.warn("⚠️ Rival desconectado");
        };

        // Activamos listeners
        onMatchFound(handleMatchFound);
        //socket.on('score_updated', handleScoreUpdate); // Ya no es necesario separado, viene en physics, pero puedes dejarlo si quieres sonidos.
        //onGameUpdate(handleGameUpdate);
        onGameOver(handleGameOver);
        onPlayerOffline(handlePlayerOffline);

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
            
            // if (mode !== 'ia') {
            //     if (e.key === 'ArrowUp' || e.key === 'w') {
            //         sendMove('up');   
            //     }
            //     else if (e.key === 'ArrowDown' || e.key === 's') {
            //         sendMove('down'); 
            //     }
            // }
            if (e.code === "Space" && mode !== "remote")
                game.setPause();  
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);

        // --- BUCLE DE RENDERIZADO (NO FÍSICA) ---
        let animationId: number;

        // const renderLoop = () =>
        // {
        //     game.update(); 
        //     game.draw(); 

        //     // --- ENVIAR POSICIÓN AL SERVIDOR ---
        //     if (mode.includes('remote') || mode === 'tournament') {
        //         const myPlayer = game.playerNumber === 1 ? game.player1 : game.player2;
                
        //         // Calculamos centro normalizado
        //         const myCenterY = (myPlayer.y + (myPlayer.height / 2)) / canvas.height;

        //         // Usamos roomIdRef.current en lugar de data.roomId
        //         if (roomIdRef.current && Math.abs(myCenterY - lastSentY.current) > 0.001) {
                    
        //             socket.emit('paddle_move', { 
        //                 roomId: roomIdRef.current, // <--- AQUI ESTABA EL ERROR
        //                 y: myCenterY 
        //             });
                    
        //             lastSentY.current = myCenterY;
        //         }
        //     }

        //     animationId = requestAnimationFrame(renderLoop);
        // };

        const renderLoop = () => {
            // 1. Mover pala localmente (Tu teclado actualiza game.player1.y aquí)
            game.update(); 
            game.draw(); 

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