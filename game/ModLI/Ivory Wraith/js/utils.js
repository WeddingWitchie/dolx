W.countPaleBabies = () => {
	return getChildrenAt("home").filter(child => {
		const pregnancy = getPregnancyOf(child);
		return pregnancy && pregnancy.carrier === "pc" && pregnancy.donor === "Ivory Wraith";
	}).length;
};

W.countPaleCritters = () => {
	const containers = V.container.list;
	let pales = 0;

	for (const container of containers) {
		if (V.container[container].count > 0) {
			for (const critter of Object.values(V.container[container].creatures)) {
				if (critter.creature.includes("Pale")) {
					pales++;
				}
			}
		}
	}
	return pales;
};

W.countSpecialTattoos = () => {
	return W.wraithBrandParts().length;
};

W.wraithIsAngry = () => {
	if (V.wraith.state === "haunt" || V.necklaceThief === "player" || ["dead", "sold"].includes(V.wraith.offspring)) {
		return true;
	}
	return false;
};

W.brandMethod = () => {
	switch (WOpts.bodywritinglvl) {
		case 1:
			return "tattoo";
		case 2:
			return "magic";
	}
};

/*
	Body part keys currently carrying one of the Wraith's marks, in $skin order.
	Used by the "show someone the mark" scenes so they can name a specific spot.
*/
W.wraithBrandParts = () => {
	const parts = [];
	for (const [part, writing] of Object.entries(V.skin)) {
		if (writing && writing.special === "Ivory Wraith") parts.push(part);
	}
	return parts;
};

/*
	How obvious the Wraith's claim is to others.
	More marks, especially burned ones, make it harder to dismiss when you tell someone about them.
*/
W.wraithBrandWeight = () => {
	let weight = 0;
	for (const writing of Object.values(V.skin)) {
		if (!writing || writing.special !== "Ivory Wraith") continue;
		weight += ["brand", "magic"].includes(writing.pen) ? 2 : 1;
	}
	return weight;
};

/*
	The Wraith can reach you while you sleep during a blood moon, even in a bad end, and will try to make you escape.
	Requires $wraith.nightmare and can only trigger once per bad end.
*/
W.badEndPossessionCheck = () => {
	if (V.statFreeze || V.replayScene || V.possessed) return false;
	if (!V.wraith || !V.wraith.init || V.wraith.state === "" || !(V.wraith.nightmare >= 1)) return false;
	if (!Time.isBloodMoon()) return false;

	/*
		Not at sea.
		The island and pirate ship are outside the map, so any open badEndTracking here is leftover from the mainland.
	*/
	if (["island", "pirate_ship"].includes(V.location)) return false;

	/*
		It must have marked you, and be attached enough to come for you.
		A single tattoo from a stranger is not enough.
	*/
	if (W.wraithBrandWeight() < 1) return false;
	const attached = (V.wraith.possessCount || 0) >= 2 || C.npc["Ivory Wraith"].love >= 40;
	if (!attached) return false;

	const badEnd = Array.isArray(V.badEndStats) ? V.badEndStats.last() : undefined;
	if (!badEnd || badEnd.trackedEnd) return false;

	/* Once per bad end as trackedStart is a stable id for this particular captivity. */
	if (V.wli && V.wli.lastEscapeBadEnd === badEnd.trackedStart) return false;

	V.wli = V.wli || {};
	V.wli.pendingEscapeBadEnd = badEnd.trackedStart;
	return true;
};

/*
	Whether the Wraith can take control while the player is fully dissociated or in a deep trance.
	It cannot take over while the player is mentally present.

	This is not limited to the blood moon. The blood moon only makes it more likely.
*/
W.combatGripCheck = () => {
	if (V.statFreeze || V.replayScene || V.possessed || V.wraithGrip) return false;
	if (V.combat !== 1) return false;
	if (!V.wraith || !V.wraith.init || V.wraith.state === "") return false;

	const vacant = V.dissociation >= 2 || V.trance >= 1;
	if (!vacant) return false;

	const brandWeight = W.wraithBrandWeight();
	const claimed = brandWeight >= 1 || C.npc["Ivory Wraith"].lust >= 40;
	if (!claimed) return false;

	/* Willpower is what keeps someone at home behind their own eyes. */
	const resist = Math.clamp(currentSkillValue("willpower") / 40, 0, 25);
	const chance = (Time.isBloodMoon() ? 35 : 12) + brandWeight * 2 - resist;
	return random(1, 100) <= chance;
};
