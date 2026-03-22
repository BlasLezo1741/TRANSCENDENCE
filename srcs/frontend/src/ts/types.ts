export type Screen =
    | "menu"
    | "sign"
    | "login"
    | "profile"
    | "pong"
    | "info"
    | "profile"
    | "stats"
    | "oauth_terms";

export type Action =
    | { type: "MENU" }
    | { type: "SIGN" }
    | { type: "LOGIN" }
    | { type: "PROFILE" }
    | { type: "LOGOUT" }
    | { type: "PONG" }
    | { type: "INFO"; option: string }
    | { type: "PROFILE" }
    | { type: "STATS" }
    | { type: "OAUTH_TERMS" };  // <--- Nuevo

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

export type ScrollOpt = "scroll" | "no-scroll";