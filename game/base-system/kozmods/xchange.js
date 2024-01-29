

function playerIsXChanged() {
	return (
		V.xchangePill && V.xchangePill.active
	);
}
window.playerIsXChanged = playerIsXChanged;

function playerBodyIsMale() {
	return (V.player.gender === "m" && !playerIsXChanged()) || (V.player.gender === "f" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;

function playerBodyIsFemale() {
	return (V.player.gender === "f" && !playerIsXChanged()) || (V.player.gender === "m" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;

function playerMayBeSpiked() {
	return V.xchange.nonconEnabled === 1 && !playerIsXChanged() && !playerIsPregnant();
}
window.playerMayBeSpiked = playerMayBeSpiked;