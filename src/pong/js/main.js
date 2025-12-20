"use strict";
const startT = document.getElementById("start");
const form = document.getElementById("input");
const result = document.getElementById("alias");
startT.addEventListener("click", tournament);
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const maxPlayers = Number(data.get("players"));
    const maxScore = Number(data.get("score"));
    const ia = data.get("ia") !== null;
    console.log({ maxPlayers, maxScore, ia });
    result.innerHTML = `
    	<p><strong>Num of players:</strong> ${maxPlayers}</p>
   		<p><strong>Max score:</strong> ${maxScore}</p>
    	<p><strong>IA:</strong> ${ia}</p>
  	`;
});
function show(id) {
    document.querySelectorAll(".b").forEach(div => div.classList.add("hidden"));
    const a = document.getElementById(id);
    if (!a)
        alert(`Error: unknown id: ${id}`);
    else {
        a.classList.remove("hidden");
        //a.querySelectorAll(".hidden").forEach(h => h.classList.remove("hidden"));
    }
}
function tournament() {
    show("tournament");
}
