/* Add the dance studio locker for old saves that missed the wardrobe update.
 * This only creates it if missing and does not affect stored clothes.
 * $wardrobeMult is handled by modWardrobeUpdate like other wardrobes. */
function ensureDanceStudioWardrobe() {
	if (!V.wardrobes || typeof V.wardrobes !== "object" || Array.isArray(V.wardrobes)) return;
	if (!V.wardrobes.danceStudio || typeof V.wardrobes.danceStudio !== "object" || Array.isArray(V.wardrobes.danceStudio)) {
		V.wardrobes.danceStudio = {};
	}
	const locker = V.wardrobes.danceStudio;
	for (const slot of setup.clothes_all_slots) {
		if (!Array.isArray(locker[slot])) locker[slot] = [];
	}
	if (locker.name === undefined) locker.name = "Dance studio locker";
	if (locker.unlocked === undefined) locker.unlocked = true;
	if (locker.isolated === undefined) locker.isolated = true;
	if (locker.shopSend === undefined) locker.shopSend = false;
	if (locker.transfer === undefined) locker.transfer = true;
	if (!Number.isFinite(locker.space)) locker.space = 5 * (V.wardrobeMult || 1);
	/* Keeps the locker's contents out of reach anywhere but the studio, the same way the prison and tower lockers work. */
	if (!Array.isArray(locker.locationRequirement) || !locker.locationRequirement.length) locker.locationRequirement = ["dance_studio"];
}
window.ensureDanceStudioWardrobe = ensureDanceStudioWardrobe;

/* The MMA gym only stored clothes in a pile, so they did not appear in the wardrobe UI. This adds a proper locker like the dance studio's. */
function ensureMmaGymWardrobe() {
	if (!V.wardrobes || typeof V.wardrobes !== "object" || Array.isArray(V.wardrobes)) return;
	if (!V.wardrobes.mmaGym || typeof V.wardrobes.mmaGym !== "object" || Array.isArray(V.wardrobes.mmaGym)) {
		V.wardrobes.mmaGym = {};
	}
	const locker = V.wardrobes.mmaGym;
	for (const slot of setup.clothes_all_slots) {
		if (!Array.isArray(locker[slot])) locker[slot] = [];
	}
	if (locker.name === undefined) locker.name = "MMA gym locker";
	if (locker.unlocked === undefined) locker.unlocked = true;
	if (locker.isolated === undefined) locker.isolated = true;
	if (locker.shopSend === undefined) locker.shopSend = false;
	if (locker.transfer === undefined) locker.transfer = true;
	if (!Number.isFinite(locker.space)) locker.space = 5 * (V.wardrobeMult || 1);
	if (!Array.isArray(locker.locationRequirement) || !locker.locationRequirement.length) locker.locationRequirement = ["mma_gym"];
}
window.ensureMmaGymWardrobe = ensureMmaGymWardrobe;

/* Colosseum cages are cleared after each event. One washroom locker is kept for regular fighters. */
function ensureColosseumWardrobe() {
	if (!V.wardrobes || typeof V.wardrobes !== "object" || Array.isArray(V.wardrobes)) return;
	if (!V.wardrobes.colosseum || typeof V.wardrobes.colosseum !== "object" || Array.isArray(V.wardrobes.colosseum)) {
		V.wardrobes.colosseum = {};
	}
	const locker = V.wardrobes.colosseum;
	for (const slot of setup.clothes_all_slots) {
		if (!Array.isArray(locker[slot])) locker[slot] = [];
	}
	if (locker.name === undefined) locker.name = "Colosseum locker";
	if (locker.unlocked === undefined) locker.unlocked = true;
	if (locker.isolated === undefined) locker.isolated = true;
	if (locker.shopSend === undefined) locker.shopSend = false;
	if (locker.transfer === undefined) locker.transfer = true;
	if (!Number.isFinite(locker.space)) locker.space = 5 * (V.wardrobeMult || 1);
	if (!Array.isArray(locker.locationRequirement) || !locker.locationRequirement.length) locker.locationRequirement = ["colosseum"];
}
window.ensureColosseumWardrobe = ensureColosseumWardrobe;

/* Rocky alcove for storing wetsuits between dives. */
function ensureLakeStashWardrobe() {
	if (!V.wardrobes || typeof V.wardrobes !== "object" || Array.isArray(V.wardrobes)) return;
	if (!V.wardrobes.lakeStash || typeof V.wardrobes.lakeStash !== "object" || Array.isArray(V.wardrobes.lakeStash)) {
		V.wardrobes.lakeStash = {};
	}
	const locker = V.wardrobes.lakeStash;
	for (const slot of setup.clothes_all_slots) {
		if (!Array.isArray(locker[slot])) locker[slot] = [];
	}
	if (locker.name === undefined) locker.name = "Lake alcove";
	if (locker.unlocked === undefined) locker.unlocked = true;
	if (locker.isolated === undefined) locker.isolated = true;
	/* Nobody delivers to a hole in a rock, but the player may carry things out of it. */
	if (locker.shopSend === undefined) locker.shopSend = false;
	if (locker.transfer === undefined) locker.transfer = true;
	if (!Number.isFinite(locker.space)) locker.space = 5 * (V.wardrobeMult || 1);
	if (!Array.isArray(locker.locationRequirement) || !locker.locationRequirement.length) locker.locationRequirement = ["lake"];
}
window.ensureLakeStashWardrobe = ensureLakeStashWardrobe;

/* Wardrobes accessible remotely. Requires both shopSend and transfer. Excludes locked wardrobes and isolated-orphanage duplicates. */
function remoteWardrobeOptions() {
	const options = [{ key: "wardrobe", name: V.wardrobes?.wardrobe?.name || "Orphanage" }];
	if (!remoteWardrobeAccessAllowed() || !V.wardrobes) return options;
	for (const key of Object.keys(V.wardrobes)) {
		if (key === "wardrobe" || key === "shopReturn" || key === "inventory") continue;
		const wardrobe = V.wardrobes[key];
		if (!wardrobe || typeof wardrobe !== "object" || Array.isArray(wardrobe)) continue;
		if (!wardrobe.unlocked || !wardrobe.transfer || !wardrobe.shopSend) continue;
		if (Array.isArray(wardrobe.locationRequirement) && wardrobe.locationRequirement.length && !wardrobe.locationRequirement.includes(V.location)) {
			continue;
		}
		if (resolveWardrobeLocation(key) !== key) continue;
		options.push({ key, name: wardrobe.name || key });
	}
	return options;
}
window.remoteWardrobeOptions = remoteWardrobeOptions;

/* All wardrobes accessible from the current location, including local-only lockers. */
function accessibleWardrobeOptions(current) {
	const local = resolveWardrobeLocation(current || V.wardrobe_location);
	const localWardrobe = V.wardrobes?.[local];
	const options =
		remoteWardrobeAccessAllowed() && localWardrobe?.transfer !== false && !["prison", "asylum", "tower"].includes(V.location) ? remoteWardrobeOptions() : [];
	if (local && local !== "shopReturn" && local !== "inventory" && !options.some(option => option.key === local)) {
		const wardrobe = local === "wardrobe" ? V.wardrobes?.wardrobe : V.wardrobes?.[local];
		if (wardrobe && wardrobe.unlocked) options.unshift({ key: local, name: wardrobe.name || local });
	}
	return options;
}
window.accessibleWardrobeOptions = accessibleWardrobeOptions;

function wardrobeReachableFromHere(key, current) {
	if (!key) return false;
	return accessibleWardrobeOptions(current).some(option => option.key === key);
}
window.wardrobeReachableFromHere = wardrobeReachableFromHere;

function getWardrobeItemCount(wardrobeId, allSlots = false) {
	let wardrobe;
	if (typeof wardrobeId === "object") {
		wardrobe = wardrobeId;
	} else if (wardrobeId === "wardrobe") {
		wardrobe = V.wardrobe;
	} else {
		wardrobe = V.wardrobes[wardrobeId];
	}

	let total = 0;
	setup.clothes_all_slots.forEach(slot => {
		if (allSlots || !["over_upper", "over_lower", "over_head", "genitals"].includes(slot)) total += wardrobe[slot]?.length ?? 0;
	});

	return total;
}
window.getWardrobeItemCount = getWardrobeItemCount;

function discardWardrobeSlot(wardrobe, slot) {
	if (!setup.clothes_all_slots.includes(slot) || !Array.isArray(wardrobe[slot])) return;
	if (V.DoLPSpools !== undefined) V.DoLPSpools += wardrobe[slot].length;
	wardrobe[slot].length = 0;
	for (const otherSlot of setup.clothes_all_slots) {
		for (const item of wardrobe[otherSlot] || []) {
			if (item.outfitPrimary?.[slot] && !["broken", "split"].includes(item.outfitPrimary[slot])) {
				item.outfitPrimary[slot] = "broken";
				item.one_piece = "broken";
			}
			if (item.outfitSecondary?.[0] === slot && !["broken", "split"].includes(item.outfitSecondary[1])) {
				item.outfitSecondary[1] = "broken";
				item.one_piece = "broken";
				item.set = otherSlot;
			}
		}
		V["wear_" + otherSlot] = "none";
	}
}
window.discardWardrobeSlot = discardWardrobeSlot;

const wardrobeFavoriteItemIdKey = "wardrobeFavoriteId";
const wardrobeFavoriteRequiredKeys = ["slot", "variable", "modder"];
const wardrobeFavoriteVariantKeys = ["colour", "colourCustom", "accessory_colour", "accessory_colourCustom", "pattern", "condition"];

function wardrobeFavoriteId(favorite, index = 0) {
	return JSON.stringify(
		wardrobeFavoriteRequiredKeys
			.concat(wardrobeFavoriteVariantKeys)
			.map(key => favorite?.[key] ?? "")
			.concat(index)
	);
}
window.wardrobeFavoriteId = wardrobeFavoriteId;

function wardrobeFavoriteUniqueId(favorite, favorites) {
	let index = favorites.length;
	let id;
	do {
		id = wardrobeFavoriteId(favorite, index++);
	} while (favorites.some(existing => existing.id === id || existing.itemId === id));
	return id;
}

function getWardrobeFavorites() {
	if (!Array.isArray(V.wardrobeFavorites)) V.wardrobeFavorites = [];
	for (let index = V.wardrobeFavorites.length - 1; index >= 0; index--) {
		const favorite = V.wardrobeFavorites[index];
		if (!favorite || typeof favorite !== "object") V.wardrobeFavorites.splice(index, 1);
	}
	V.wardrobeFavorites.forEach((favorite, index) => {
		if (!favorite.id) favorite.id = wardrobeFavoriteId(favorite, index);
	});
	return V.wardrobeFavorites;
}
window.getWardrobeFavorites = getWardrobeFavorites;

function wardrobeFavoriteCondition(item) {
	const outfitPrimary =
		item?.outfitPrimary && typeof item.outfitPrimary === "object"
			? Object.keys(item.outfitPrimary)
					.sort()
					.map(key => [key, item.outfitPrimary[key]])
			: [];
	const outfitSecondary = Array.isArray(item?.outfitSecondary) ? item.outfitSecondary : [];
	return JSON.stringify({
		integrity: item?.integrity ?? "",
		one_piece: item?.one_piece ?? "",
		outfitPrimary,
		outfitSecondary,
	});
}
window.wardrobeFavoriteCondition = wardrobeFavoriteCondition;

function wardrobeFavoriteIdentity(slot, item) {
	return {
		slot,
		name: item?.name ?? "",
		variable: item?.variable ?? item?.name ?? "",
		modder: item?.modder ?? "",
		itemId: item?.[wardrobeFavoriteItemIdKey] ?? "",
		colour: item?.colour ?? 0,
		colourCustom: item?.colour === "custom" ? item?.colourCustom ?? "" : "",
		accessory_colour: item?.accessory_colour ?? 0,
		accessory_colourCustom: item?.accessory_colour === "custom" ? item?.accessory_colourCustom ?? "" : "",
		pattern: item?.pattern ?? 0,
		condition: wardrobeFavoriteCondition(item),
	};
}
window.wardrobeFavoriteIdentity = wardrobeFavoriteIdentity;

function wardrobeFavoriteAssignItemId(favorite, item) {
	if (!item) return;
	const favorites = getWardrobeFavorites();
	if (!item[wardrobeFavoriteItemIdKey]) item[wardrobeFavoriteItemIdKey] = wardrobeFavoriteUniqueId(favorite, favorites);
	favorite.itemId = item[wardrobeFavoriteItemIdKey];
	favorite.id = favorite.itemId;
}
window.wardrobeFavoriteAssignItemId = wardrobeFavoriteAssignItemId;

function wardrobeFavoriteValue(favorite, key) {
	if (key === "variable") return favorite?.variable ?? favorite?.name ?? "";
	return favorite?.[key] ?? "";
}

function wardrobeFavoriteMatches(favorite, slot, item) {
	const identity = wardrobeFavoriteIdentity(slot, item);
	if (favorite?.itemId) return favorite.itemId === identity.itemId;
	return (
		wardrobeFavoriteRequiredKeys.every(key => wardrobeFavoriteValue(favorite, key) === (identity[key] ?? "")) &&
		wardrobeFavoriteVariantKeys.every(key => favorite?.[key] === undefined || favorite[key] === identity[key])
	);
}
window.wardrobeFavoriteMatches = wardrobeFavoriteMatches;

function isWardrobeFavorite(slot, item) {
	return getWardrobeFavorites().some(favorite => wardrobeFavoriteMatches(favorite, slot, item));
}
window.isWardrobeFavorite = isWardrobeFavorite;

function toggleWardrobeFavorite(slot, item, favoriteId) {
	const favorites = getWardrobeFavorites();
	const index = favoriteId
		? favorites.findIndex(favorite => favorite.id === favoriteId || favorite.itemId === favoriteId)
		: favorites.findIndex(favorite => wardrobeFavoriteMatches(favorite, slot, item));
	if (index >= 0) {
		const favorite = favorites.splice(index, 1)[0];
		if (item?.[wardrobeFavoriteItemIdKey] && (!favorite?.itemId || item[wardrobeFavoriteItemIdKey] === favorite.itemId)) {
			delete item[wardrobeFavoriteItemIdKey];
		}
	} else {
		const favorite = wardrobeFavoriteIdentity(slot, item);
		wardrobeFavoriteAssignItemId(favorite, item);
		favorites.push(favorite);
	}
}
window.toggleWardrobeFavorite = toggleWardrobeFavorite;

function wardrobeFavoriteItems(wardrobe, includeInventory = false) {
	const favorites = getWardrobeFavorites();
	const items = [];

	function addWornMatch(favorite) {
		const item = V.worn?.[favorite.slot];
		if (!item || item.name === "naked") return false;
		if (!wardrobeFavoriteMatches(favorite, favorite.slot, item)) return false;
		if (!favorite.itemId) wardrobeFavoriteAssignItemId(favorite, item);
		items.push({ slot: favorite.slot, item, index: 0, source: "worn", favorite });
		return true;
	}

	function addMatch(sourceWardrobe, source, favorite) {
		if (!sourceWardrobe || !Array.isArray(sourceWardrobe[favorite.slot])) return false;
		const index = sourceWardrobe[favorite.slot].findIndex(item => {
			if (item?.outfitSecondary && !["broken", "split"].includes(item.outfitSecondary[1])) return false;
			return wardrobeFavoriteMatches(favorite, favorite.slot, item);
		});
		if (index < 0) return false;
		if (!favorite.itemId) wardrobeFavoriteAssignItemId(favorite, sourceWardrobe[favorite.slot][index]);
		items.push({ slot: favorite.slot, item: sourceWardrobe[favorite.slot][index], index, source, favorite });
		return true;
	}

	favorites.forEach(favorite => {
		if (addWornMatch(favorite)) return;
		if (addMatch(wardrobe, "wardrobe", favorite)) return;
		if (includeInventory) addMatch(V.wardrobes?.inventory, "inventory", favorite);
	});

	return items;
}
window.wardrobeFavoriteItems = wardrobeFavoriteItems;

function wardrobeSlotName(slot) {
	return String(slot)
		.split("_")
		.map(word => word.slice(0, 1).toUpperCase() + word.slice(1))
		.join(" ");
}
window.wardrobeSlotName = wardrobeSlotName;

/* Wardrobe search and filter. The state lives in temporary variables, so leaving the wardrobe clears it. */
function wardrobeFilterReset() {
	T.wardrobeFilter = {
		active: false,
		gender: { female: true, neutral: true, male: true },
		reveal: { from: 0, to: 9999 },
		warmth: { from: 0, to: 100 },
		traits: [],
	};
}
window.wardrobeFilterReset = wardrobeFilterReset;

function wardrobeFilterToggleTrait(trait) {
	const traits = T.wardrobeFilter.traits;
	const index = traits.indexOf(trait);
	if (index === -1) traits.push(trait);
	else traits.splice(index, 1);
}
window.wardrobeFilterToggleTrait = wardrobeFilterToggleTrait;

function wardrobeFilterActive() {
	return !!(T.wardrobeSearch || T.wardrobeFilter?.active);
}
window.wardrobeFilterActive = wardrobeFilterActive;

function wardrobeItemMatches(item) {
	const words = (T.wardrobeSearch || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length) {
		const text = [item.name, item.colour, item.pattern]
			.filter(part => typeof part === "string")
			.join(" ")
			.toLowerCase();
		if (!words.every(word => text.includes(word))) return false;
	}
	const f = T.wardrobeFilter;
	if (!f?.active) return true;
	const gender = { f: "female", m: "male" }[item.gender] ?? "neutral";
	if (!f.gender[gender]) return false;
	if (item.reveal < f.reveal.from || item.reveal >= f.reveal.to) return false;
	const warmth = getTrueWarmth(item);
	if (warmth < f.warmth.from || warmth > f.warmth.to) return false;
	return f.traits.length === 0 || f.traits.some(trait => (item.type || []).includes(trait));
}
window.wardrobeItemMatches = wardrobeItemMatches;

/* Redraws the open list from its first page. The search box sits outside #wardrobeList so it keeps focus while typing. */
function wardrobeFilterRefresh() {
	T.wardrobePages = {};
	$("#wardrobe-filter-state").text(T.wardrobeFilter?.active ? " (on)" : "");
	wardrobeRerenderList();
}
window.wardrobeFilterRefresh = wardrobeFilterRefresh;

/* Redraws the open list in place, keeping the current page. */
function wardrobeRerenderList() {
	if ($("#wardrobeList").length) Wikifier.wikifyEval("<<replace '#wardrobeList'>><<wardrobeContents>><</replace>>");
}
window.wardrobeRerenderList = wardrobeRerenderList;

/* One row of sort links per slot. The first click on a key uses the normal order, a second click on the same key reverses it. */
const wardrobeSortKeys = [
	["name", "Name"],
	["color", "Colour"],
	["lewd", "Lewd"],
	["integrity", "Integrity"],
	["warmth", "Warmth"],
	["outfit", "Outfit Status"],
];

function wardrobeSortBy(slot, key) {
	T.wardrobeSort = T.wardrobeSort || {};
	const last = T.wardrobeSort[slot];
	const descending = last?.key === key && !last.descending;
	T.wardrobeSort[slot] = { key, descending };
	window.wikifier("wardrobeListReorder", slot, key, descending);
}
window.wardrobeSortBy = wardrobeSortBy;

function wardrobeSortLinks(slot, withOutfit) {
	const last = T.wardrobeSort?.[slot];
	return wardrobeSortKeys
		.filter(([key]) => key !== "outfit" || withOutfit)
		.map(([key, label]) => {
			const mark = last?.key === key ? (last.descending ? " &#9660;" : " &#9650;") : "";
			return `<div class="wardrobe-action"><a title="Click again to reverse the order" onclick="wardrobeSortBy('${slot}', '${key}')">${label}${mark}</a></div>`;
		})
		.join("");
}
window.wardrobeSortLinks = wardrobeSortLinks;

function wardrobeOpenFilters() {
	Wikifier.wikifyEval(
		"<<replace '#wardrobe-filters'>><<loadWardrobeFilters>><</replace>><<run linkifyDivs('#wardrobe-filters')>><<toggleclass '#wardrobe-filters' 'hidden'>>"
	);
}
window.wardrobeOpenFilters = wardrobeOpenFilters;

/* Items shown per wardrobe page. */
window.wardrobePageSize = 12;
