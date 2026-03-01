export type Screen =
    | "menu"
    | "sign"
    | "login"
    | "profile"
    | "settings"
    | "pong"
    | "info"
    | "profile"  // <--- Nuevo
    | "stats"   // <--- Nuevo
    | "oauth_terms"; // <--- New

export type Action =
    | { type: "MENU" }
    | { type: "SIGN" }
    | { type: "LOGIN" }
    | { type: "PROFILE" }
    | { type: "LOGOUT" } //ADDED
    | { type: "SETTINGS" }
    | { type: "PONG" }
    | { type: "INFO"; option: string }
    | { type: "PROFILE" } // <--- Nuevo
    | { type: "STATS" }  // <--- Nuevo
    | { type: "OAUTH_TERMS" }; // <--- New

export type GameMode =
    | "ia"
    | "local"
    | "remote";

export type GameDifficult =
    | "easy"
    | "normal"
    | "hard"
    | "impossible"
    | "";

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