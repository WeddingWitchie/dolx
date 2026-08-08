function redirectRemovedRingStep(setupItem) {
	const redirects = {
		"-015": "-01",
		"-02": "-01",
		"-03": "-025",
		"-2-5": "-2",
		"-4": "-3",
		"-7": "-5",
		"-8": "-5",
		"-15": "-10",
		"-25": "-20",
		/* Not a removed carat step: the tidebloom ring has no art of its own and wears the 1ct aquamarine sprites. */
		tidebloom: "aquamarine-1",
		/* Whitney's initialled ring reuses the plain silver band sprites. */
		"whitney-gemstone": "silver",
	};

	// Guard against a missing setup/variable; hand back whatever the variable is
	// (possibly undefined) so callers can fall back to their existing behaviour.
	if (!setupItem || typeof setupItem.variable !== "string") {
		return setupItem && setupItem.variable;
	}

	let variable = setupItem.variable;
	for (const [removedSuffix, newSuffix] of Object.entries(redirects)) {
		if (variable.endsWith(removedSuffix)) {
			variable = variable.slice(0, -removedSuffix.length) + newSuffix;
			break;
		}
	}

	// Return the (possibly redirected) variable STRING. Do NOT mutate setupItem:
	// worn.setup is often a direct reference to setup.clothes.rings[index],
	// so writing to it would corrupt the shared clothing definition for the session.
	return variable;
}
window.redirectRemovedRingStep = redirectRemovedRingStep;
