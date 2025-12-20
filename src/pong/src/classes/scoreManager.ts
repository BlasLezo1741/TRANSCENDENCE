import { Player } from "./player.js"

export class ScoreManager
{
	private		maxScore: number;
	private		scores: Map<Player, number>;

	constructor(players: Player[], max: number)
	{
		this.maxScore = max;
		this.scores = new Map();
		players.forEach(p =>
		{
			this.scores.set(p, 0);
		});
	}

	addPoint(player: Player)
	{
		if (this.scores.has(player))
		{
			const current = this.scores.get(player) ?? 0;
			this.scores.set(player, current + 1);
		}
	}

	getScore(player: Player): number
	{
		if (this.scores.has(player))
		{
			const score = this.scores.get(player) ?? 0;
			return score;
		}
		return -1;
	}
}
