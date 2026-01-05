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
    | "remote";