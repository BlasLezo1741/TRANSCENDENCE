import type { Screen, Action } from "../types.ts"

// export function screenReducer(state: Screen, action: Action): Screen{
//     switch (state)
//     {
//         case "menu":
//             if (action.type === "GAME") return "game";
//             return state;

//         case "game":
//             if (action.type === "MENU") return "menu";
//             if (action.type === "MODE") return "mode";
//             return state;

//         case "mode":
//             if (action.type === "MENU") return "menu";
//             if (action.type === "GAME") return "game";
//             if (action.type === "PONG") return "pong";
//             return state;

//         case "pong":
//             if (action.type === "MENU") return "menu";
//             return state;
            
//         default:
//             return state;
//     }
// }

export function screenReducer(state: Screen, action: Action): Screen {
  switch (action.type) {
    case "MENU": return "menu";
    case "GAME": return "game";
    case "MODE": return "mode";
    case "PONG": return "pong";
    default: return state;
  }
}