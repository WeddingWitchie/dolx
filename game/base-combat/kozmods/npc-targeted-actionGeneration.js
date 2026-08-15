function listUniqueCarriedXchangePills() {
	/**
	 * TODO: Compile an array containing objects from setup.pills whose 'type' is 'xchange' and the owned amount is greater than zero.
	 * NOTE: Limit the collection to only containing pills of subtypes 'pink basic' and 'blue basic' for experimental reasons.
	 *
	 * @returns {setup.pills[]}
	 */

	if (V.statFreeze) return [];

	const carriedPills = [];
	const xchangePills = setup.pills.filter(med => med.type === "xchange");

	xchangePills.forEach(pill => {
		// Limited to the basic gender/herm pill variants (+ their continue/resistance forms)
		if (
			V.sexStats.pills.pills[pill.name].owned > 0 &&
			[
				"pink basic",
				"blue basic",
				"purple basic",
				"pink continue",
				"pink resistance",
				"blue continue",
				"blue resistance",
				"purple continue",
				"purple resistance",
			].includes(pill.subtype)
		)
			carriedPills.push(pill);
	});

	return carriedPills;
}
window.listUniqueCarriedXchangePills = listUniqueCarriedXchangePills;
