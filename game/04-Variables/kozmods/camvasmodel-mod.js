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
