
## Protocolo de Eventos: ft_transcendence (Pong)

La siguiente tabla define el **Criterio Único** para el equipo.

| Categoría | Nombre del Evento | Dirección | Datos (Payload) | Propósito y Requisito V.19 |
| :--- | :--- | :--- | :--- | :--- |
| Matchmaking | `join_queue` | Cliente → Servidor | `{ userId: string, mode: "1v1" }` | Inicia la búsqueda de oponente. (Req 4) |
| Matchmaking | `match_found` | Servidor → Cliente | `{ roomId: string, side: "left"\|"right", opponent: {name, avatar} }` | Notifica que hay partida y asigna una Sala. (Req 555) |
| Estado | `game_start` | Servidor → Cliente | `{ countdown: number }` | Inicia la cuenta atrás para que ambos empiecen a la vez. |
| Gameplay | `paddle_move` | Cliente → Servidor | `{ direction: "up" \| "down" \| "stop" }` | Informa la intención de movimiento del jugador. (Req 6) |
| Gameplay | `game_update` | Servidor → Cliente | `{ ball: {x, y}, p1_y: num, p2_y: num }` | Sincronización constante (fuente de verdad del servidor). (Req 7) |
| Marcador | `score_update` | Servidor → Cliente | `{ score: [num, num], scorerId: string }` | Notifica un punto y pausa brevemente el juego. (Req 88) |
| Conexión | `player_offline` | Servidor → Cliente | `{ userId: string, reconnectWindow: number }` | Gestiona desconexiones inesperadas. (Req 9) |
| Finalización | `game_over` | Servidor → Cliente | `{ winnerId: string, stats: object }` | Fin de partida. Guardado en DB vía ORM. (Req 1010) |
| Notificación | `broadcast_notification` | Servidor → Cliente | `{ message: string, type: "info"\|"warning" }` | Sistema de notificaciones generales. (Req 11) |

---

### 1. Actuaciones en la comunicación general (Librerías)

* **Cambios en Docker-compose**
* **Cambios en `backend/package.json`**:
    Añadir en la sección `dependencies`:
    * `"@nestjs/websockets": "^11.0.0"`
    * `"@nestjs/platform-socket.io": "^11.0.0"`
* **Cambios en `frontend/package.json`**:
    Añadir en la sección `dependencies`:
    * `"socket.io-client": "^4.7.0"`

---

### 2. Actuaciones en el Frontend/Backend

Para asegurar la persistencia del socket entre **React** y **NestJS**, se deben configurar los siguientes archivos siguiendo el protocolo de eventos:

| Proyecto | Archivo | Acción |
| :--- | :--- | :--- |
| **Backend** | `backend/src/game.gateway.ts` | **Crear**: Contiene la lógica de WebSockets y Salas. |
| **Backend** | `backend/src/app.module.ts` | **Modificar**: Registrar el Gateway para que NestJS lo reconozca. |
| **Frontend** | `frontend/src/services/socketService.ts` | **Crear**: Cliente para conectar con el servidor y enviar eventos. |
| **Frontend** | `frontend/src/App.tsx` | **Modificar**: Importar el servicio para probar la conexión inicial. |

---

### 💡 Notas sobre GitHub Codespaces

> [!IMPORTANT]
> En **Codespaces**, los puertos son redirigidos. Si trabajas localmente, asegúrate de ajustar los puertos en `main.ts`, `game.gateway.ts` y `socketService.ts`. Revisa el archivo `.env.example` para configurar la URL del puerto 3000 que proporciona el entorno de Codespaces.
