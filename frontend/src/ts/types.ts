export type Screen =
    | "menu"
    | "options"
    | "pong";

export type Action =
    | { type: "MENU" }
    | { type: "OPTIONS" }
    | { type: "PONG" };

export type GameMode =
    | "ia"
    | "local"
    | "remote";