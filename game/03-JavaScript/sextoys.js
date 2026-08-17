function playerHasStrapon() {
	return V.worn.under_lower.type.includes("strap-on") && ["waist", "totheside"].includes(V.worn.under_lower.state);
}
window.playerHasStrapon = playerHasStrapon;

function playerPenisSize() {
	if (playerHasStrapon() && V.worn.under_lower.size !== undefined) return V.worn.under_lower.size;
	return V.player.penissize;
}
window.playerPenisSize = playerPenisSize;

function npcHasStrapon(index = V.index) {
	if (typeof index !== "number") {
		if (V.options.debugdisable === "f" || V.debug === 1)
			Errors.report(`[npcHasStrapon]: index must be a number, was ${typeof index}.`, {
				index,
			});
		return false;
	} else if (index < 0 || index > 5) {
		if (V.options.debugdisable === "f" || V.debug === 1) Errors.report(`[npcHasStrapon]: index must be between 0 and 5 inclusive, was ${index}.`, { index });
		return false;
	}
	// index is 0 to 5
	const npc = V.NPCList[index];
	return !!npc && !!npc.strapon && npc.strapon.state === "worn";
}
window.npcHasStrapon = npcHasStrapon;

function getSexToysofType(toyType) {
	const sexToys = {
		dildos: ["dildo", "length of anal beads"],
		whip: ["riding crop", "flog"],
		stroker: ["stroker"],
		vibrator: ["vibrator", "bullet vibe"],
		get all() {
			return [...this.dildos, ...this.whip, ...this.stroker, ...this.vibrator];
		},
	};

	/* sexToys.all = sexToys.dildos.concat(sexToys.whip, sexToys.stroker, sexToys.vibrator); */

	const dandv = sexToys.dildos.concat(sexToys.vibrator);
	const dandvs = dandv.concat(sexToys.stroker);
	const dandvw = dandv.concat(sexToys.whip);

	if (toyType) {
		if (Object.keys(sexToys).includes(toyType)) return sexToys[toyType];
		else if (toyType === "dildo") return dandv;
		else if (toyType === "dildos and strokers") return dandvs;
		else if (toyType === "dildos and whips") return dandvw;
		else return sexToys.all;
	} else {
		// console.log("All sex toys. Length = "+sexToys["all"].length+ " and I contain: " +sexToys["all"]);
		return sexToys.all;
	}
}
window.getSexToysofType = getSexToysofType;

function npcHasSexToyOfType(npcIndex, toyType) {
	const npc = V.NPCList[npcIndex];
	const sexToyList = getSexToysofType(toyType);

	/* Only output to console if in debug mode. */
	if (V.debug) console.log("sex toys: " + getSexToysofType("all"));

	return sexToyList.includes(npc.righttool) || sexToyList.includes(npc.lefttool);
}
window.npcHasSexToyOfType = npcHasSexToyOfType;

const randomSexToy = toyType => getSexToysofType(toyType).random();
window.randomSexToy = randomSexToy;

function playerHasButtPlug() {
	return V.worn.butt_plug != null && V.worn.butt_plug.state === "worn" && V.worn.butt_plug.worn;
	// V.worn.butt_plug.worn is just as a safeguard for now
}
window.playerHasButtPlug = playerHasButtPlug;

// Reconcile the inventory items' `worn` bookkeeping flags with the V.worn slots for the source of truth for what's actually on/in the body.
// The two copies desync when code outside the toy inventory UI clears a worn slot (e.g. visionPrepMorph), and once a save/load has broken the slot↔item object alias nothing repairs the flag, leaving a phantom "worn" toy that's only carried.
// Presence in a slot is enough to keep the flag: a combat-"removed" plug (state !== "worn") still occupies its slot and gets re-inserted by buttplugon, so its flag must survive.
// Strap-ons are skipped; they're synced against V.worn.under_lower elsewhere.
function dolxSyncSexToyWornFlags() {
	const inv = V.player?.inventory?.sextoys;
	if (!inv) return;
	const slotToys = [V.worn?.butt_plug, V.worn?.vaginal_dildo, V.worn?.vibrator, V.worn?.bullet_vibe].filter(Boolean);
	for (const items of Object.values(inv)) {
		if (!Array.isArray(items)) continue;
		for (const item of items) {
			if (!item?.worn) continue;
			if (Array.isArray(item.type) && item.type.includes("strap-on")) continue;
			const inSlot = slotToys.some(w => w === item || (w.name === item.name && w.colour === item.colour));
			if (!inSlot) item.worn = false;
		}
	}
}
window.dolxSyncSexToyWornFlags = dolxSyncSexToyWornFlags;

// A vaginal dildo can't stay inside a vagina that no longer exists.
// Called at the fork-owned genderflip sites (X-Change apply, gradual-identity shift, cheat menu) and on every load via <<xchange-modupdate>> to catch vanilla transformation scenes (snake painting, Olive, schism).
function dolxEjectOrphanVaginalDildo() {
	if (V.worn?.vaginal_dildo && !V.player?.vaginaExist) {
		delete V.worn.vaginal_dildo;
		dolxSyncSexToyWornFlags();
	}
}
window.dolxEjectOrphanVaginalDildo = dolxEjectOrphanVaginalDildo;

// An expelled vibe remains in the toy inventory, but is no longer inserted or automatically restored after combat.
function dolxEjectWornVibrator() {
	if (!V.worn?.vibrator) return false;
	V.worn.vibrator.state = "removed";
	V.worn.vibrator.vibrating = 0;
	V.worn.vibrator.worn = false;
	delete V.worn.vibrator;
	dolxSyncSexToyWornFlags();
	return true;
}
window.dolxEjectWornVibrator = dolxEjectWornVibrator;

function playerMasturbationToyByIndex(index) {
	if (index === undefined || index === null || index === "none" || Number.isNaN(Number(index)) || typeof listUniqueCarriedSextoys !== "function") return null;
	const toys = listUniqueCarriedSextoys().filter(toy => {
		if (!Array.isArray(toy.type)) return false;
		return (
			(V.player.penisExist && !playerChastity("penis") && toy.type.includes("stroker")) ||
			toy.type.includes("dildo") ||
			toy.type.includes("breastpump") ||
			toy.type.includes("vibrator")
		);
	});
	return toys[Number(index)] || null;
}

function sexToyIsDildo(toy) {
	return !!toy && Array.isArray(toy.type) && toy.type.includes("dildo");
}

function sexToyIsSmallDildo(toy) {
	return sexToyIsDildo(toy) && ((toy.name || "").includes("small") || (typeof toy.size === "number" && toy.size <= 1));
}

function sexToyIsVaginalWornInventoryDildo(toy) {
	return !!toy && setup.sextoys[toy.index]?.category === "dildo" && sexToyIsDildo(toy) && !toy.type.includes("anal");
}

function playerHasWornVaginalDildo() {
	return V.player.vaginaExist && V.worn.vaginal_dildo != null && V.worn.vaginal_dildo.state === "worn" && V.worn.vaginal_dildo.worn;
}
window.playerHasWornVaginalDildo = playerHasWornVaginalDildo;

// Dildos the player currently has inserted (worn or actively using, not merely carrying) in the given hole.
// Covers persistent vaginal worn dildos, hands-free "floor" masturbation (vaginause/anususe === "mdildopenetrate"),
// handheld masturbation (arm === "mvaginadildo"/"manusdildo"), and combat self-fucking (arm === "dildoSelfPussy"/"dildoSelfAnus").
// Only fully-inserted states count; the "*entrancedildo" tease states are intentionally excluded.
function playerInsertedDildos(genital) {
	const toys = [];
	if (genital === "vagina") {
		if (!V.player.vaginaExist) return [];
		if (playerHasWornVaginalDildo()) toys.push(V.worn.vaginal_dildo);
		if (V.vaginause === "mdildopenetrate") toys.push(playerMasturbationToyByIndex(V.currentToyVagina));
		if (V.leftarm === "mvaginadildo") toys.push(playerMasturbationToyByIndex(V.currentToyLeft));
		if (V.rightarm === "mvaginadildo") toys.push(playerMasturbationToyByIndex(V.currentToyRight));
		if (V.leftarm === "dildoSelfPussy") toys.push(V.currentSexToyLeft);
		if (V.rightarm === "dildoSelfPussy") toys.push(V.currentSexToyRight);
	} else if (genital === "anus") {
		if (V.anususe === "mdildopenetrate") toys.push(playerMasturbationToyByIndex(V.currentToyAnus));
		if (V.leftarm === "manusdildo") toys.push(playerMasturbationToyByIndex(V.currentToyLeft));
		if (V.rightarm === "manusdildo") toys.push(playerMasturbationToyByIndex(V.currentToyRight));
		if (V.leftarm === "dildoSelfAnus") toys.push(V.currentSexToyLeft);
		if (V.rightarm === "dildoSelfAnus") toys.push(V.currentSexToyRight);
	}
	return toys.filter(sexToyIsDildo);
}
window.playerInsertedDildos = playerInsertedDildos;

// Whether recorded/stored fluid is held in and shielded from washing/decay: a worn butt plug, or any
// inserted dildo (small dildos still retain, matching a real plug's seal even if they visibly leak).
function playerGenitalFluidRetained(genital) {
	if (genital === "anus" && playerHasButtPlug()) return true;
	return playerInsertedDildos(genital).length > 0;
}
window.playerGenitalFluidRetained = playerGenitalFluidRetained;

// Whether the visible leak/drip is stopped: a worn butt plug, or a non-small inserted dildo.
// A small dildo doesn't seal tightly, so it retains fluid but still drips.
function playerGenitalFluidLeakBlocked(genital) {
	if (genital === "anus" && playerHasButtPlug()) return true;
	return playerInsertedDildos(genital).some(toy => !sexToyIsSmallDildo(toy));
}
window.playerGenitalFluidLeakBlocked = playerGenitalFluidLeakBlocked;

function playerHasVibrator() {
	return V.worn.vibrator != null && V.worn.vibrator.state === "worn" && !!V.worn.vibrator.worn;
	// V.worn.vibrator.worn is just as a safeguard for now
}
window.playerHasVibrator = playerHasVibrator;

function playerHasBulletVibe() {
	return playerHasVibrator() && (V.worn.vibrator.name_underscore === "bullet_vibe" || V.worn.vibrator.name === "bullet vibe");
}
window.playerHasBulletVibe = playerHasBulletVibe;

// New vibrators can be missing control data when first worn.
// Set it immediately so the caption and sidebar work correctly.
// Keep existing values so an NPC-held remote is not reset when the toy is removed and worn again.
function initWornVibratorDefaults(toy) {
	const vibe = toy || V.worn?.vibrator;
	if (!vibe) return;
	// The shop only copies a fixed set of fields onto a purchase, so the toy's own settings come from its setup entry.
	const setupToy = setup.sextoys[vibe.index] || {};
	if (typeof vibe.vibrating !== "number") vibe.vibrating = typeof setupToy.vibrating === "number" ? setupToy.vibrating : 0;
	if (typeof vibe.powerMax !== "number") vibe.powerMax = typeof setupToy.powerMax === "number" ? setupToy.powerMax : 3;
	if (typeof vibe.power !== "number") vibe.power = typeof setupToy.power === "number" ? setupToy.power : 1;
	vibe.power = Math.clamp(vibe.power, 1, vibe.powerMax);
	if (vibe.remote == null) vibe.remote = "player";
}
window.initWornVibratorDefaults = initWornVibratorDefaults;

// An unset remote means nobody has taken it off the player, so treat it as player-held.
function playerHasVibratorRemote() {
	return playerHasVibrator() && (V.worn.vibrator.remote == null || V.worn.vibrator.remote === "player");
}
window.playerHasVibratorRemote = playerHasVibratorRemote;

function playerVibratorOn() {
	return playerHasVibrator() && V.worn.vibrator.vibrating === 1;
}
window.playerVibratorOn = playerVibratorOn;

// The sidebar vibrator controls do not trigger passage navigation, so State.top may still contain
// the old vibrator state when saving. Copy the change to State.top immediately so saving and
// reloading before changing passages keeps the correct on/off and power settings.
function syncVibratorToSaveMoment() {
	const topVibrator = State.top?.variables?.worn?.vibrator;
	if (!topVibrator || !V.worn.vibrator) return;
	if (topVibrator.name !== V.worn.vibrator.name || topVibrator.colour !== V.worn.vibrator.colour) return;
	topVibrator.vibrating = V.worn.vibrator.vibrating;
	topVibrator.power = V.worn.vibrator.power;
	topVibrator.powerMax = V.worn.vibrator.powerMax;
}

function setPlayerVibrator(on, link) {
	if (!playerHasVibratorRemote()) return;

	V.worn.vibrator.vibrating = on ? 1 : 0;
	syncVibratorToSaveMoment();

	// Optional: update link text if you pass the DOM link in
	if (link) {
		const label = playerHasBulletVibe() ? "bullet vibe" : "vibrator";
		link.innerText = V.worn.vibrator.vibrating ? `Turn ${label} off` : `Turn ${label} on`;
	}
}
window.setPlayerVibrator = setPlayerVibrator;

function togglePlayerVibrator(link) {
	if (!playerHasVibratorRemote()) return;
	setPlayerVibrator(!playerVibratorOn(), link);
}
window.togglePlayerVibrator = togglePlayerVibrator;

function changePlayerVibratorPower(delta, link) {
	if (!playerHasVibratorRemote()) return;

	if (typeof V.worn.vibrator.power !== "number") V.worn.vibrator.power = 1;
	if (typeof V.worn.vibrator.powerMax !== "number") V.worn.vibrator.powerMax = 3;

	V.worn.vibrator.power = Math.max(1, Math.min(V.worn.vibrator.powerMax, V.worn.vibrator.power + delta));
	syncVibratorToSaveMoment();

	if (link) {
		const label = playerHasBulletVibe() ? "Bullet vibe" : "Vibrator";
		link.innerText = `${label} power: ${V.worn.vibrator.power}/${V.worn.vibrator.powerMax}`;
	}
}
window.changePlayerVibratorPower = changePlayerVibratorPower;

function existsInSexToyInventory(name, colour) {
	if (V.player.inventory.sextoys[name] && V.player.inventory.sextoys[name].length > 0) {
		if (!colour || colour === "any") {
			return true;
		}
		for (const item of V.player.inventory.sextoys[name]) {
			if (item.colour === colour) {
				return true;
			}
		}
	}
	return false;
}
window.existsInSexToyInventory = existsInSexToyInventory;

function sexToysInventoryDelete(name, colour) {
	if (!existsInSexToyInventory(name, colour)) {
		console.log("Item does not exist in the inventory.");
		return;
	}
	if (colour && colour !== "any") {
		let foundIndex = -1;
		// Find the index of the first item with the specified name and colour
		for (let i = 0; i < V.player.inventory.sextoys[name].length; i++) {
			if (V.player.inventory.sextoys[name][i].colour === colour) {
				foundIndex = i;
				break;
			}
		}
		if (foundIndex === -1) {
			console.log(`Item ${name} ${colour} does not exist in the inventory.`);
			return;
		}
		const item = V.player.inventory.sextoys[name][foundIndex];
		if (item.worn && item.type.includes("anal")) {
			delete V.worn.butt_plug;
		}
		if (item.worn && sexToyIsVaginalWornInventoryDildo(item)) {
			if (V.worn.vaginal_dildo && (V.worn.vaginal_dildo.name === item.name || V.worn.vaginal_dildo.name_underscore === item.name_underscore)) {
				delete V.worn.vaginal_dildo;
			}
		}
		if (item.worn && item.type.includes("strap-on")) {
			V.worn.under_lower = clone(setup.clothes.under_lower[0]);
			setLowerVisibility(true);
		}
		V.player.inventory.sextoys[name].splice(foundIndex, 1);
		console.log(`Deleted ${name} ${colour} from inventory.`);
		return;
	}
	// If no specific colour is specified or colour is 'any', then remove the first item with the specified name
	const item = V.player.inventory.sextoys[name][0];
	if (item.worn && item.type.includes("anal")) {
		delete V.worn.butt_plug;
	}
	if (item.worn && sexToyIsVaginalWornInventoryDildo(item)) {
		if (V.worn.vaginal_dildo && (V.worn.vaginal_dildo.name === item.name || V.worn.vaginal_dildo.name_underscore === item.name_underscore)) {
			delete V.worn.vaginal_dildo;
		}
	}
	if (item.worn && item.type.includes("vibrator")) {
		if (V.worn.vibrator && (V.worn.vibrator.name === item.name || V.worn.vibrator.name_underscore === item.name_underscore)) {
			delete V.worn.vibrator;
		}
	}
	if (item.worn && item.type.includes("strap-on")) {
		V.worn.under_lower = clone(setup.clothes.under_lower[0]);
		setLowerVisibility(true);
	}
	V.player.inventory.sextoys[name].splice(0, 1);
	console.log(`Deleted ${name} from inventory.`);
}
window.sexToysInventoryDelete = sexToysInventoryDelete;
