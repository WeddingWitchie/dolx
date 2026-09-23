/* Detached starting trait: feelings rarely show. Stress and NPC love move less; arousal, pain, and trauma are untouched. */

function playerIsDetached() {
	return V.backgroundTraits?.includes("detached") === true;
}

/* Stress gain multiplier. The reduction fades out as pain rises, so physical suffering still stresses fully. */
function detachedStressMod() {
	if (!playerIsDetached()) return 1;
	const pain = Math.clamp(Number(V.pain) || 0, 0, 100);
	return 0.65 + 0.35 * (pain / 100);
}

/* Love gains x0.75, losses x0.8. Rounds randomly so love stays a whole number, since most changes are +/-1. */
function detachedLoveScale(val) {
	if (!playerIsDetached() || !val) return val;
	const scaled = Math.abs(val) * (val > 0 ? 0.75 : 0.8);
	const whole = Math.floor(scaled);
	return Math.sign(val) * (whole + (Math.random() < scaled - whole ? 1 : 0));
}

/* An orgasm or near-max stress breaks through the trait. */
function detachedCracks() {
	if (!playerIsDetached()) return false;
	return V.orgasmdown >= 1 || V.stress >= V.stressmax * 0.9;
}

/* Sprite hides arousal and embarrassment. Pain checks stay in the renderer. */
function detachedFaceMasked() {
	return playerIsDetached() && !detachedCracks();
}

Object.assign(window, {
	playerIsDetached,
	detachedStressMod,
	detachedLoveScale,
	detachedCracks,
	detachedFaceMasked,
});
