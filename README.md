# Descricion
A partir de la tabla
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

Se realizara:

1. Crear los archivos de clase DTO en el Backend para cada evento de entrada del cliente.

2. Vincularlos en el Gateway de NestJS para que la validación sea automática.

Todo esto se realiza en el modulo web porque tenemos:

**Infraestructura de comunicación:** Los DTOs en este contexto no son para formularios web, sino para validar los paquetes que viajan por el túnel de WebSockets que tú has construido.

**Cumplimiento del Major:** El requisito "Implement real-time features..." no solo pide que los mensajes lleguen, sino que el sistema sea capaz de gestionarlos profesionalmente. Sin DTOs, el "feature" está incompleto porque es vulnerable.

**Puente con otros módulos:** Aunque los datos que validas sirven para Gaming (posiciones) o User Management (estadísticas), la tecnología que permite esa validación en tiempo real pertenece a la capa Web/Sockets del proyecto.

# Objetivo

**Integridad del Juego (Gaming and UX):** Al validar paddle_move con un DTO, aseguras que el servidor sea la "fuente de verdad" (Real-time synchronization). Si el protocolo dice que solo existen 3 estados de movimiento, el DTO garantiza que nadie pueda inyectar un estado prohibido.

**Seguridad en el Historial (User Management):** Aunque game_over sea Servidor → Cliente, los datos que se guardan en el historial (stats: object) vienen de la lógica interna que fue alimentada por estos DTOs. Si los inputs fueron limpios, las estadísticas finales serán veraces.

**Robustez de la Red (Web):** El servidor NestJS descartará automáticamente cualquier paquete que no cumpla con el DTO, protegiendo tu infraestructura de WebSockets de saturación por datos basura.

# Procedimiento
1. Instalacion de las herramientas que permiten a NestJs "leer" las reglas del DTO. (En la terminal del backend se ejecuta: npm install class-validator class-transformer)
2. Crear los diferentes eventos en la ruta backend/src/game/dto/, para cada evento un fichero: *.dto.ts
3. Vincular los eventos modificando backend/src/game.gateway.ts

