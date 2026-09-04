/* Carrying a serving outfit in the POCKET bag.
 *
 * Clothes are stored differently from normal bag items, so packing an outfit
 * removes the actual garments from the wardrobe and stores them in the bag.
 * Only maid, butler and waiting outfits can be packed.
 * This is for carrying work outfits, not general clothing storage so different from "handbag" feature.
 *
 * State: V.pocket.outfit
 *   pieces [{ slot, item }] : up to 4 packed garments
 *   from : wardrobe they came from, used when taking them back out
 */
/* globals clothingData selectWardrobe pocketEnsure pocketCarryCapacity pocketBagCapacity */

setup.pocketOutfit = {
	maxPieces: 4,
	/* Layers a serving outfit is actually made of. Underwear and genitals are deliberately absent. */
	slots: ["head", "upper", "lower", "hands", "legs", "feet", "neck"],
	/* A garment qualifies if its type includes one of these.
	"serving" covers waiting staff, while "maid" covers maid and butler outfits. */
	types: ["maid", "serving"],
};

function pocketOutfitEnsure() {
	pocketEnsure();
	const pocket = V.pocket;
	if (!pocket.outfit || typeof pocket.outfit !== "object" || Array.isArray(pocket.outfit)) pocket.outfit = {};
	const outfit = pocket.outfit;
	if (!Array.isArray(outfit.pieces)) outfit.pieces = [];
	outfit.pieces = outfit.pieces.filter(piece => piece && typeof piece === "object" && piece.slot && piece.item);
	outfit.pieces = outfit.pieces.slice(0, setup.pocketOutfit.maxPieces);
	if (typeof outfit.from !== "string") outfit.from = "wardrobe";
	return outfit;
}
window.pocketOutfitEnsure = pocketOutfitEnsure;

/* Whether one wardrobe garment counts as part of a serving outfit. */
function pocketOutfitQualifies(slot, item) {
	if (!item || !setup.pocketOutfit.slots.includes(slot)) return false;
	let type;
	try {
		type = clothingData(slot, item, "type");
	} catch (ex) {
		return false;
	}
	if (!Array.isArray(type)) return false;
	return setup.pocketOutfit.types.some(tag => type.includes(tag));
}
window.pocketOutfitQualifies = pocketOutfitQualifies;

/* Everything in the open wardrobe that could go in the bundle, newest slot order first. */
function pocketOutfitCandidates() {
	const wardrobe = selectWardrobe();
	const found = [];
	if (!wardrobe) return found;
	setup.pocketOutfit.slots.forEach(slot => {
		if (!Array.isArray(wardrobe[slot])) return;
		wardrobe[slot].forEach((item, index) => {
			if (!pocketOutfitQualifies(slot, item)) return;
			found.push({ slot, index, item, name: pocketOutfitPieceName(slot, item) });
		});
	});
	return found;
}
window.pocketOutfitCandidates = pocketOutfitCandidates;

function pocketOutfitPieceName(slot, item) {
	let name;
	try {
		name = clothingData(slot, item, "name");
	} catch (ex) {
		name = item?.name;
	}
	return name || "garment";
}
window.pocketOutfitPieceName = pocketOutfitPieceName;

function pocketOutfitCarrying() {
	return pocketOutfitEnsure().pieces.length > 0;
}
window.pocketOutfitCarrying = pocketOutfitCarrying;

function pocketOutfitPieceCount() {
	return pocketOutfitEnsure().pieces.length;
}
window.pocketOutfitPieceCount = pocketOutfitPieceCount;

/* The bundle occupies one bag slot for as long as it holds anything. */
function pocketOutfitSyncSlot() {
	pocketEnsure();
	const carrying = pocketOutfitCarrying();
	const index = V.pocket.bag.slots.findIndex(slot => slot.kind === "outfit");
	if (!carrying) {
		if (index !== -1) V.pocket.bag.slots.splice(index, 1);
		return true;
	}
	if (index !== -1) return true;
	const personalUsed = V.pocket.bag.slots.some(slot => slot.location === "pocket");
	let location = "pocket";
	if (personalUsed) {
		if (V.pocket.bag.slots.filter(slot => slot.location === "bag").length >= pocketBagCapacity()) return false;
		location = "bag";
	}
	V.pocket.bag.slots.push({ kind: "outfit", key: "outfit", location });
	return true;
}
window.pocketOutfitSyncSlot = pocketOutfitSyncSlot;

/* Why a garment can't be packed right now, or "" if it can. */
function pocketOutfitPackBlocked() {
	const outfit = pocketOutfitEnsure();
	if (outfit.pieces.length >= setup.pocketOutfit.maxPieces) return "That's as much as you can fold up and carry.";
	if (outfit.pieces.length === 0 && V.pocket.bag.slots.length >= pocketCarryCapacity()) return "You've nothing free to carry it in.";
	return "";
}
window.pocketOutfitPackBlocked = pocketOutfitPackBlocked;

/* Move one garment out of the open wardrobe and into the bundle. */
function pocketOutfitPack(slot, index) {
	const outfit = pocketOutfitEnsure();
	if (pocketOutfitPackBlocked()) return false;
	const wardrobe = selectWardrobe();
	const item = wardrobe?.[slot]?.[index];
	if (!pocketOutfitQualifies(slot, item)) return false;
	/* Record where it came from so taking it out again puts it back in the same wardrobe. */
	if (outfit.pieces.length === 0) outfit.from = V.wardrobe_location || "wardrobe";
	outfit.pieces.push({ slot, item: clone(item) });
	wardrobe[slot].deleteAt(index);
	pocketOutfitSyncSlot();
	return true;
}
window.pocketOutfitPack = pocketOutfitPack;

/* Put one garment back. Falls back to the main wardrobe if the original one is gone. */
function pocketOutfitUnpack(pieceIndex) {
	const outfit = pocketOutfitEnsure();
	const piece = outfit.pieces[pieceIndex];
	if (!piece) return false;
	let wardrobe = outfit.from === "wardrobe" ? V.wardrobe : V.wardrobes?.[outfit.from];
	if (!wardrobe) wardrobe = V.wardrobe;
	if (!Array.isArray(wardrobe[piece.slot])) wardrobe[piece.slot] = [];
	wardrobe[piece.slot].push(clone(piece.item));
	outfit.pieces.splice(pieceIndex, 1);
	pocketOutfitSyncSlot();
	return true;
}
window.pocketOutfitUnpack = pocketOutfitUnpack;

function pocketOutfitUnpackAll() {
	const outfit = pocketOutfitEnsure();
	while (outfit.pieces.length) pocketOutfitUnpack(outfit.pieces.length - 1);
	return true;
}
window.pocketOutfitUnpackAll = pocketOutfitUnpackAll;

/* How exposed the outfit is: the most revealing piece decides. */
function pocketOutfitReveal(pieces) {
	const list = pieces || pocketOutfitEnsure().pieces;
	return list.reduce((worst, piece) => {
		let reveal = 0;
		try {
			reveal = Number(clothingData(piece.slot, piece.item, "reveal")) || 0;
		} catch (ex) {
			reveal = 0;
		}
		return Math.max(worst, reveal);
	}, 0);
}
window.pocketOutfitReveal = pocketOutfitReveal;

/* "m", "f" or "n" for what the outfit reads as. Neutral only when nothing gendered is in it. */
function pocketOutfitGender(pieces) {
	const list = pieces || pocketOutfitEnsure().pieces;
	const counts = { m: 0, f: 0 };
	list.forEach(piece => {
		let gender;
		try {
			gender = clothingData(piece.slot, piece.item, "gender");
		} catch (ex) {
			gender = "n";
		}
		if (gender === "m" || gender === "f") counts[gender]++;
	});
	if (counts.f > counts.m) return "f";
	if (counts.m > counts.f) return "m";
	return "n";
}
window.pocketOutfitGender = pocketOutfitGender;

/* A readable name for the bundle: the upper or lower piece if there is one, else the first thing in it. */
function pocketOutfitName(pieces) {
	const list = pieces || pocketOutfitEnsure().pieces;
	if (!list.length) return "";
	const lead = list.find(piece => piece.slot === "upper") || list.find(piece => piece.slot === "lower") || list[0];
	return pocketOutfitPieceName(lead.slot, lead.item);
}
window.pocketOutfitName = pocketOutfitName;

/* Every piece named in order, for "you hand over the X, the Y and the Z". */
function pocketOutfitPieceNames(pieces) {
	const list = pieces || pocketOutfitEnsure().pieces;
	return list.map(piece => pocketOutfitPieceName(piece.slot, piece.item));
}
window.pocketOutfitPieceNames = pocketOutfitPieceNames;

/* Hand the bundle over for good. Returns the pieces so the receiver can keep a record of them. */
function pocketOutfitSurrender() {
	const outfit = pocketOutfitEnsure();
	const pieces = outfit.pieces.map(piece => clone(piece));
	outfit.pieces = [];
	pocketOutfitSyncSlot();
	return pieces;
}
window.pocketOutfitSurrender = pocketOutfitSurrender;
