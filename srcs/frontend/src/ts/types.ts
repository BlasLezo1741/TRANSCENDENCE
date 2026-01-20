export type Screen =
    | "menu"
    | "sign"
    | "login"
    | "profile"
    | "settings"
    | "pong"
    | "profile"  // <--- Nuevo
    | "stats";   // <--- Nuevo

export type Action =
    | { type: "MENU" }
    | { type: "SIGN" }
    | { type: "LOGIN" }
    | { type: "PROFILE" }
    | { type: "LOGOUT" } //ADDED
    | { type: "SETTINGS" }
    | { type: "PONG" }
    | { type: "PROFILE" } // <--- Nuevo
    | { type: "STATS" };  // <--- Nuevo

export type GameMode =
    | "ia"
    | "local"
    | "remote"
    | "tournament";

// Lo que recibimos cuando el rival se mueve
export type GameUpdatePayload = {
    playerId: string;
    move: 'up' | 'down' | 'stop';
};

// Lo que recibimos cuando alguien marca
export type ScoreUpdatePayload = {
    score: [number, number];
    scorerId: string;
};