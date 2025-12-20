import { gameLoop } from "./game.js"

/*
const name1 = prompt("Name of the player 1") || "Player 1";
const name2 = prompt("Name of the player 2") || "Player 2";

const player1 = new Player(name1, 10, 250);
const player2 = new Player(name2, canvas.width - Player.width - 10, 250);

type WebState = 
	| { state: "menu" }
	| { state: "game", players?: Player[] }
	| { state: "exit" };

let web: WebState = { state: "game", players: [player1, player2] };
*/
function main()
{
	gameLoop();
	/*
	switch (web.state)
	{
		case "menu":
			console.log("Menu");
			break;
		case "game":
			gameLoop();
			break;
		case "exit":
			console.log("Exiting game!")
			break;
		default:
			throw new Error("Unknown error");
	}*/
}
main();

// Width: 800, height: 600
