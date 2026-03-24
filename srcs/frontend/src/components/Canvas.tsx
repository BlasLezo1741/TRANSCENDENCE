import React, {useRef, useEffect, useState} from "react";
import { Player } from "../ts/models/Player.ts";
import { Pong } from "../ts/models/Pong.ts";
import { socket } from '../services/socketService'; 
import type { GameMode, GameDifficult } from "../ts/types.ts";
import { useModal } from '../context/ModalContext';
import { useTranslation } from "react-i18next";

type CanvasProps = {
    mode: GameMode;
    difficult: GameDifficult;
    dispatch: React.Dispatch<any>;
    playerNumber?: 1 | 2; 
    userName: string;
    opponentName?: string;
    ballInit: { x: number, y: number } | null;
    playerSide?: 'left' | 'right';
    roomId: string;
    isGameActive: boolean;
    onGameOver?: (winner: string) => void;
    chatOpen: boolean;
};

type DirX = "left" | "right" | "";
type DirY = "up" | "down" | "";

interface PosData
{
    touchX: number;
    touchY: number;
    halfX: number;
    halfY: number;
    dirX: DirX;
    dirY: DirY;
    mobile: boolean;
}

function Canvas({ mode, difficult, dispatch, userName, opponentName = "Oponente", ballInit, playerSide = 'left', roomId,
    isGameActive, onGameOver, chatOpen }: CanvasProps)
{
    const { showModal } = useModal();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationIdRef = useRef<number | null>(null);
    const gameRunningRef = useRef(false);
    //const roomIdRef = useRef<string>(roomId); //nuevo
    //const roomIdRef = useRef<string | null>(null);//guardamos IDde la sala
    const lastSentY = useRef<number>(0.5); // Aquí la última posición enviada
    const gameRef = useRef<Pong | null>(null);
    // TRUCO DE REF: Guardamos el estado en una referencia
    // Esto permite que el renderLoop (que corre aislado) lea el valor actual sin reiniciarse
    const activeRef = useRef(isGameActive);
    const { t } = useTranslation();

    // Actualizamos la referencia cada vez que cambia la prop
    useEffect(() => { activeRef.current = isGameActive; }, [isGameActive]);

    // -----------------------------------------------------------
    // INICIO DEL USE EFFECT (Todo ocurre aquí dentro)
    // -----------------------------------------------------------

    const guest = t('guest');
    const title_end = t('game.ended');
    const title_dis = t('game.disconnected');
    const msg_win = t('game.winner');
    const msg_dis = t('game.messageDisconnected');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = 600;

        // --- 1. POSITIONING LOGIC  ---
        let finalPlayerNumber = 1; 
        let leftName = "P1";
        let rightName = "P2";

        if (mode.includes('remote')) {
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
            rightName = guest;
        }


        // --- 2. INSTANCIAR JUEGO ---
        const game = new Pong(
            canvas,
            ctx,
            mode,
            difficult,
            finalPlayerNumber,
            leftName,
            rightName,
            ballInit,
        );

        gameRef.current = game;

        // Centrar la bola visualmente mientras esperamos al servidor
        if (mode.includes('remote') && game.ball) {
            game.ball.x = canvas.width / 2;
            game.ball.y = canvas.height / 2;
        }

        // --- 3. EVENTOS DEL SOCKET ---

        // --- SERVER PHYSICS ---
        //  This event occurs 60 times per second 
        socket.on('game_update_physics', (data: any) => {
            // Si los datos son de la sala vieja, IGNORAR.
            if (data.roomId && data.roomId !== roomId) return;
            
            // Si NO estamos en remoto, ignoramos los datos fantasma del servidor
            if (!mode.includes('remote')) return;

            if (!game) return;

            if (!activeRef.current) return;

            // 1. SYNCHRONIZE BALL
            if (game.ball && data.ball) {
                // We multiply HERE by width/height
                const pixelX = data.ball.x * canvas.width;
                const pixelY = data.ball.y * canvas.height;
                
                // We pass already calculated pixels
                game.ball.sync(pixelX, pixelY);
            }
            
            //(Strategy: Trust Local + Rival Interpolation)
            if (data.paddles) {
                const p1Height = game.player1.getHeight();
                const p2Height = game.player2.getHeight();

                //  Target positions according to the server
                const targetY_P1 = (data.paddles.left * canvas.height) - (p1Height / 2);
                const targetY_P2 = (data.paddles.right * canvas.height) - (p2Height / 2);

                // Smoothing factor (0.3 is balanced)
                const LERP = 0.3;

                if (game.playerNumber === 1) {
                    // --- I AM PLAYER 1 (Left)---
                    
                    // MY PADDLE (P1): WE DON'T TOUCH IT.
                    // My keyboard moves it in the renderLoop. If I touch it here, it will vibrate.
                    
                    // RIVAL (P2): We smoothly interpolate it towards its destination
                    game.player2.y = game.player2.y + (targetY_P2 - game.player2.y) * LERP;
                } 
                else if (game.playerNumber === 2) {
                    // --- I AM PLAYER 2 (Right) ---

                    //  MY PADDLE (P2): WE DON'T TOUCH IT.
                    
                    // RIVAL (P1): We smoothly interpolate it
                    game.player1.y = game.player1.y + (targetY_P1 - game.player1.y) * LERP;
                }
            }
            // 3. Synchronize SCOREBOARD
            if (game.score && data.score) {
                 game.score = data.score;
            }
        });

        const handleGameOver = (data: any) => {
            
            // Si el "Game Over" es de la sala vieja, IGNORAR.
            // Usamos data?.roomId por si acaso el backend no manda roomId en algún modo
            if (data?.roomId && data.roomId !== roomId) return;

            let winnerName = "Desconocido";
            if (data.winner === 'left') winnerName = leftName;
            else if (data.winner === 'right') winnerName = rightName;
            
            //console.log("🏁 Game Over. Ganador:", winnerName);
            // Paramos animación
            cancelAnimationFrame(animationId);
            
            // SI TENEMOS onGameOver, SE LO DEJAMOS AL PONGSCREEN
            if (onGameOver) {
                onGameOver(winnerName);
            } else {
                showModal({
                    title: title_end,
                    message: msg_win + ": " + winnerName,
                    //title: t('game.ended'),
                    //message: t('game.winner', { name : winnerName }),
                    type: "success",
                    onConfirm: () => {
                        dispatch({ type: "MENU" });
                    }
                });
            }
        };

        // Definimos qué hacer cuando el rival se desconecta
        //const handleOpponentDisconnected = () => {
        // Añadimos (data: any) para poder comprobar el roomId
        const handleOpponentDisconnected = (data: any) => {
            // Ignorar si se desconectó el de la sala vieja
            if (data?.roomId && data.roomId !== roomId) return;
            
            console.warn("Rival desconectado");
            const winnerName = userName;
            //FORZAMOS SIEMPRE EL MENSAJE EMERGENTE PRIMERO
            showModal({
                title: title_dis,
                message: t('game.messageDisconnected', { name: opponentName }),
                //msg_dis + ": " + opponentName,
                //title: t('game.disconnected'), // Título de la alerta
                // message: `El rival ha abandonado la partida. ¡${winnerName} gana por abandono!`,
                //message: t('game.messageDisconnected', { name: opponentName }),
                type: "info",
                onConfirm: () => {
                    // Cuando el usuario pulse "Aceptar", le mandamos a las estadísticas
                    if (onGameOver) {
                        onGameOver(winnerName);
                    } else {
                        dispatch({ type: "MENU" });
                    }
                }
            });
        };

        // Activamos listeners de eventos de juego
        socket.on('game_over', handleGameOver);
        socket.on('opponent_disconnected', handleOpponentDisconnected);

        // --- 4. CONTROLES DE TECLADO ---

        const handleKeyUp = (e: KeyboardEvent) =>
        {
            if (!activeRef.current || !gameRef.current) return;

            gameRef.current.keysPressed[e.key] = false;       
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeRef.current || !gameRef.current) return;

            if (gameRef.current.keysPressed[e.key]) return;
            
            gameRef.current.keysPressed[e.key] = true;
            
            if (e.code === "Space" && mode !== "remote" && !gameRef.current.chat)
                gameRef.current.setPause(!gameRef.current.getPause());  
        };

        const handlePointerDown = (e: PointerEvent) =>
        {
            if (!activeRef.current || !gameRef.current) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            // Tomamos rect y aplicamos la escala
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            const touchX = (e.clientX - rect.left) * scaleX;
            const touchY = (e.clientY - rect.top) * scaleY;

            const halfX = canvas.width / 2;
            const halfY = canvas.height / 2;

            const isMobile = window.innerWidth <= 660;

            const dirY: DirY = isMobile
                ? touchX < halfX ? "down" : "up"
                : touchY < halfY ? "up" : "down";

            // Determinar jugador en modo local o IA
            const player = mode === "ia"
                ? gameRef.current.player1
                : mode === "local"
                ? touchX < halfX
                    ? gameRef.current.player1
                    : gameRef.current.player2
                : gameRef.current.playerNumber === 1
                ? gameRef.current.player1
                : gameRef.current.player2;

            // Movimiento continuo usando requestAnimationFrame
            let moveAnimId: number;
            const movePlayer = () => {
                if (!activeRef.current) return;
                if (dirY === "up") player.moveUp();
                else player.moveDown();
                moveAnimId = requestAnimationFrame(movePlayer);
            };

            movePlayer();

            const stopMoving = () => cancelAnimationFrame(moveAnimId);

            canvas.addEventListener("pointerup", stopMoving, { once: true });
            canvas.addEventListener("pointercancel", stopMoving, { once: true });
            canvas.addEventListener("pointerleave", stopMoving, { once: true });
        };

        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("keydown", handleKeyDown);
        canvas.addEventListener("pointerdown", handlePointerDown);

        // --- BUCLE DE RENDERIZADO (NO FÍSICA) ---
        let animationId: number;

        const renderLoop = () => 
        {
            // MAIN LOOP BLOCKING During COUNTDOWN 
            if (!activeRef.current || gameRef.current?.getPause()) {
                // If we are in countdown:
                // WE DRAW (to see the static board in the background)
                gameRef.current.draw(); 
                // But WE DON'T UPDATE (game.update() is not called)
                
                // We request next frame and EXIT
                animationId = requestAnimationFrame(renderLoop);
                return; 
            }
            
            // 1. If activeRef.current is TRUE. Move paddle locally (Your keyboard updates game.player1.y here)
            gameRef.current?.update(); 
            // gameRef.current?.draw(); 
            // // Solo calculamos las físicas locales si NO es un juego remoto
            // if (!mode.includes('remote')) {
            //     gameRef.current?.update(); 
            // }

            // El draw() lo dejamos FUERA del if, porque SIEMPRE tenemos que pintar la pantalla
            gameRef.current?.draw();

            // --- NEW BLOCK: LOCAL / IA VICTORY CONTROL  ---
            // Only enters here if we are NOT in online mode
            if (!mode.includes('remote') && gameRef.current?.hasWinner())
            {
                const winnerName = gameRef.current.getWinner();
                
                // We stop the loop immediately 
                cancelAnimationFrame(animationId);
                
                // We notify and exit with delay to give time to enter the last point on the scoreboard
                setTimeout(() => {
                    // AVISAMOS AL PONGSCREEN
                    if (onGameOver) {
                        onGameOver(winnerName);
                    } else {
                        showModal({
                            title: title_end,
                            message: msg_win + ": " + winnerName,
                            //title: t('game.ended'),
                            //message: t('game.winner', { name : winnerName }),
                            type: "success",
                            onConfirm: () => {
                                dispatch({ type: "MENU" });
                            }
                        });
                    }
                }, 50);
                return; 
            }
            
            // 2. SEND POSITION TO SERVER
            if (mode.includes('remote')) {
                const myPlayer = gameRef.current?.playerNumber === 1 ? gameRef.current?.player1 : gameRef.current?.player2;
                
                // --- ABSOLUTE COORDINATE CALCULATION --- 
                // We get the paddle center in pixels 
                const myCenterPixel = myPlayer.y + (myPlayer.height / 2);
                
                // We convert it to percentage (0.0 to 1.0) 
                const myNormalizedY = myCenterPixel / canvas.height;

                // 3. Send only if it has changed (to not saturate)
                // We use roomIdRef.current to ensure we have the ID change by roomId
                if (roomId && Math.abs(myNormalizedY - lastSentY.current) > 0.001) {
                    
                    socket.emit('paddle_move', { 
                        roomId: roomId, 
                        y: myNormalizedY // <--- We send the exact data, NOT 'up' or 'down'
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
            
            // // Avisar al backend para que destruya la sala y no mande datos fantasma
            // if (roomId && mode.includes('remote')) {
            //     socket.emit('leave_game', { roomId: roomId }); 
            //     // Nota: Si en tu backend este evento se llama distinto (ej: 'leave_room'), cámbialo aquí.
            // }

            socket.off('game_update_physics');
            socket.off('game_over', handleGameOver);
            socket.off('opponent_disconnected', handleOpponentDisconnected);
        };
    
    }, [mode, userName, opponentName, ballInit, playerSide, dispatch, roomId]); 

    useEffect(() => {
        if (!gameRef.current) return;
        gameRef.current.setPause(chatOpen);
        gameRef.current.chat = chatOpen;
    }, [chatOpen]);

    return <canvas ref={canvasRef} className="block border-3 border-white bg-black"/>;
}

export default Canvas;
