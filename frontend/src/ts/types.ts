export type Screen =
    | "menu"
    | "game"
    | "mode"
    | "pong";

export type Action =
    | { type: "MENU" }
    | { type: "GAME" }
    | { type: "MODE" }
    | { type: "PONG" };

export type GameMode =
    | "ia"
    | "local"
    | "remote";