export type Screen =
    | "menu"
    | "sign"
    | "login"
    | "settings"
    | "pong";

export type Action =
    | { type: "MENU" }
    | { type: "SIGN" }
    | { type: "LOGIN" }
    | { type: "SETTINGS" }
    | { type: "PONG" };

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