import type { Screen, Action } from "../types.ts"

export function screenReducer(state: Screen, action: Action): Screen {
  switch (action.type) {
    case "MENU": return "menu";
    case "LOGIN": return "login";
    case "SIGN": return "sign";
    case "SETTINGS": return "settings";
    case "PROFILE": return "profile";
    case "STATS": return "stats";
    case "PONG": return "pong";
    default: return state;
  }
}