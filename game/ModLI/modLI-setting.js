/*------------------ ModLI shared helpers -------------------*/

window.ensureModLISettings = function ensureModLISettings() {
	if (V.modLIUnlocks == null) V.modLIUnlocks = {};
	if (V.ModExclusiveLIEnabled == null) V.ModExclusiveLIEnabled = 0;

	if (!Array.isArray(setup.modLIRegistry)) {
		setup.modLIRegistry = []; setup._modLIRegistrySanitized = true;
		return;
	}
	if (setup._modLIRegistrySanitized) return;

	const seen = new Set();
	const out = [];
	const src = setup.modLIRegistry;
	for (let i = 0; i < src.length; i++) {
		const n = src[i];
		if (typeof n !== "string") continue;
		const t = n.trim();
		if (t && !seen.has(t)) {
			seen.add(t);
			out.push(t);
		}
	}
	setup.modLIRegistry = out;
	setup._modLIRegistrySanitized = true;
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
	const reg = setup.modLIRegistry;
	const unlocks = V.modLIUnlocks;
	const out = [];
	for (let i = 0; i < reg.length; i++) {
		if (!unlocks[reg[i]]) out.push(reg[i]);
	}
	return out;
};

window.getActivatedModLIs = function getActivatedModLIs() {
	ensureModLISettings();
	const reg = setup.modLIRegistry;
	const unlocks = V.modLIUnlocks;
	const out = [];
	for (let i = 0; i < reg.length; i++) {
		if (unlocks[reg[i]]) out.push(reg[i]);
	}
	return out;
};

/* Register built-in mod-exclusive LIs here */
registerModLI("Poppy");
