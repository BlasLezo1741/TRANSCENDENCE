
**Protocolo de Eventos: ft_transcendence (Pong)**
La siguiente tabla define el "Criterio Único" para el equipo.
|Categoría | Nombre del Evento | Dirección | Datos (Payload) | Propósito y Requisito V.19|
|-- | -- | -- | -- | --|
|Matchmaking | join_queue | Cliente → Servidor | { userId: string, mode: "1v1" } | Inicia la búsqueda de oponente. 4|
Matchmaking | match_found | Servidor → Cliente | { roomId: string, side: "left"\|"right", opponent: {name, avatar} } | Notifica que hay partida y asigna una Sala. 555
Estado | game_start | Servidor → Cliente | { countdown: number } | Inicia la cuenta atrás para que ambos empiecen a la vez.
Gameplay | paddle_move | Cliente → Servidor | { direction: "up" \| "down" \| "stop" } | Informa la intención de movimiento del jugador. 6
Gameplay | game_update | Servidor → Cliente | { ball: {x, y}, p1_y: num, p2_y: num } | Sincronización constante (fuente de verdad del servidor). 7
Marcador | score_update | Servidor → Cliente | { score: [num, num], scorerId: string } | Notifica un punto y pausa brevemente el juego. 88
Conexión | player_offline | Servidor → Cliente | { userId: string, reconnectWindow: number } | Gestiona desconexiones inesperadas para el módulo Remote Players. 9
Finalización | game_over | Servidor → Cliente | { winnerId: string, stats: object } | Fin de partida. Dispara el guardado en la base de datos vía ORM. 1010
Notificación | broadcast_notification | Servidor → Cliente | { message: string, type: "info"\|"warning" } | Sistema de notificaciones generales (torneos, amigos). 11
**1. Actuaciones en la comunicacion general. Configuracion de las librerias.**
- cambios en Docker-compose
- cambios en backend/package.json :
En la sección "dependencies". Añado manualmente estas dos líneas:
• "@nestjs/websockets": "^11.0.0"
• "@nestjs/platform-socket.io": "^11.0.0"
(11.0.0 misma versi’on que NestJS)
- cambios en fronted/package.json :
En la sección "dependencies". Añado manualmente la línea:
• "socket.io-client": "^4.7.0"
**2. Actuaciones en el fronted/backend**
Para que el socket sea persistente, se deben conectar React y NestJS
correctamente, siguiendo el protocolo de eventos,creando y modificando los siguientes archivos:
Proyecto | Archivo | Acción|
-- | -- | --|
Backend | backend/src/game.gateway.ts | Crear: Contiene la lógica de WebSockets y Salas.|
Backend | backend/src/app.module.ts | Modificar: Registrar el Gateway para que NestJS lo reconozca.|
Frontend | frontend/src/services/socketService.ts | Crear: Cliente para conectar con el servidor y enviar eventos.|
Frontend | frontend/src/App.tsx | Modificar: Importar el servicio para probar la conexión inicial.|
[+]TRABAJANDO CON CODESPACE[/+]
[+]Se han tenido que cambiar los puertos, porque los redirige, si se trabajara en la maquina probablemente tendr'iamos que tocar los ficheros del backend (main.ts y game.gateway.ts) y en el fronted (socketService.ts) para reconfigurar los puertos.[/+]
