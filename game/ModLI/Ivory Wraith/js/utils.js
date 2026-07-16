W.countPaleBabies = () => {
	Wikifier.wikifyEval("<<getChildrenIds `{location:'home', father:'Ivory Wraith'}`>>");
	return T.childrenIds.length;
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
	let total = 0;

	for (const bodywriting of Object.values(V.skin)) {
		if (bodywriting.special === "Ivory Wraith") {
			total++;
		}
	}

	return total;
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
