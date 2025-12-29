import type { Screen, Action } from "../types.ts"

export function screenReducer(state: Screen, action: Action): Screen{
    switch (state)
    {
        case "menu":
            if (action.type === "OPTIONS") return "options";
            return state;

        case "options":
            if (action.type === "MENU") return "menu";
            if (action.type === "PONG") return "pong";
            return state;

        case "pong":
            if (action.type === "MENU") return "menu";
            return state;
            
        default:
            return state;
    }
}