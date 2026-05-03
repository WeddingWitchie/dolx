/* ModLI shared helpers */

window.ensureModLISettings = function ensureModLISettings() {
	V.modLIUnlocks = V.modLIUnlocks || {};
	V.ModExclusiveLIEnabled = V.ModExclusiveLIEnabled || 0;

	setup.modLIRegistry = Array.isArray(setup.modLIRegistry)
		? [...new Set(setup.modLIRegistry.filter(name => typeof name === "string" && name.trim()))]
		: [];
};

window.registerModLI = function registerModLI(name) {
	ensureModLISettings();

	if (typeof name !== "string") return;
	name = name.trim();
	if (!name) return;

	if (!setup.modLIRegistry.includes(name)) {
		setup.modLIRegistry.push(name);
	}
};

window.modLISelected = function modLISelected(name) {
	ensureModLISettings();
	return !!V.modLIUnlocks[name];
};

window.activateModLI = function activateModLI(name) {
	ensureModLISettings();

	if (typeof name !== "string") return false;
	name = name.trim();
	if (!name) return false;

	if (!setup.modLIRegistry.includes(name)) {
		setup.modLIRegistry.push(name);
	}

	if (V.modLIUnlocks[name]) {
		return false;
	}

	V.modLIUnlocks[name] = true;
	return true;
};

window.getAvailableModLIs = function getAvailableModLIs() {
	ensureModLISettings();
	return setup.modLIRegistry.filter(name => !V.modLIUnlocks[name]);
};

window.getActivatedModLIs = function getActivatedModLIs() {
	ensureModLISettings();
	return setup.modLIRegistry.filter(name => !!V.modLIUnlocks[name]);
};

/* Register built-in mod-exclusive LIs here */
registerModLI("Poppy");