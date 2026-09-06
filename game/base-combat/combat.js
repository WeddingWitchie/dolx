// @ts-nocheck

/**
 * Finds the named NPC currently using a combat slot.
 *
 * Uses the slot's fullDescription because it is updated whenever the NPC changes,
 * so it reliably shows who is in that slot right now.
 *
 * $npc and $npcrow are not used because they can contain old data after a scene
 * ends, and they may be empty for NPCs restored with <<loadNPC>>.
 *
 * Some ordinary NPCs use their first name as fullDescription. This can cause a
 * false match with named NPCs such as Poppy. If .name and .fullDescription are
 * the same, the NPC is only accepted when <<npc>> mapped that character to the
 * current slot.
 *
 * @param {string | number} index NPC slot in $NPCList.
 * @returns {string} The named NPC's name, or "" if the slot contains an ordinary NPC.
 */
function namedNpcInSlot(index) {
	// @ts-ignore
	const npc = V.NPCList?.[index];
	if (!npc) return "";

	const name = npc.fullDescription;
	if (typeof name !== "string" || !setup.NPCNameList.includes(name)) return "";

	if (npc.name === name) {
		const slot = Number(index);
		const mappedIndex = V.npcrow?.findIndex(row => Number(row) === slot) ?? -1;
		if (mappedIndex === -1 || V.npc?.[mappedIndex] !== name) return "";
	}

	return name;
}

window.namedNpcInSlot = namedNpcInSlot;

/**
 * Resolves named NPC-specific ejaculation macros.
 *
 * This helper allows callers to use a single lookup instead of repeating
 * named NPC checks. If a matching macro such as <<ejaculation-robin>>
 * exists for the resolved NPC name, it is returned for direct use.
 *
 * @param {string | number} index NPC index or identifier.
 * @param {...string} args Optional extra macro arguments.
 * @returns {string} Matching named NPC ejaculation macro, or an empty string if none applies.
 */
function namedNpcEjaculation(index, ...args) {
	const npcName = namedNpcInSlot(index);
	if (!npcName) return "";

	const macroName = `ejaculation-${npcName.toLowerCase()}`;
	if (!Macro.has(macroName)) return "";

	const output = args[0] ? " " + args[0] : "";
	return `<<${macroName}${output}>>`;
}

window.namedNpcEjaculation = namedNpcEjaculation;
DefineMacroS("namedNpcEjaculation", namedNpcEjaculation);

/**
 * Resolves the named NPC combat comment macro.
 *
 * Returns the corresponding <<speech-*>> macro for named NPCs that have
 * a supported combat comment handler. If no matching handler exists,
 * marks the current comment pass as having no named NPC comment.
 *
 * Special case:
 * - "Ivory Wraith" maps to <<speechWraith>>.
 *
 * Takes the NPC's slot rather than a name so it can tell a real named NPC from an
 * ordinary one who happens to share the name. See namedNpcInSlot().
 *
 * @param {string | number} index NPC slot in $NPCList.
 * @returns {string} The speech macro to print, or an empty string if none applies.
 */
function namedNpcComments(index) {
	// Reset the no-comment flag before resolving this NPC's comment.
	delete T.noNameComment;

	// Do not return any comment while the current pass is silent.
	if (T.silent) return "";

	if (V.speechAlphaKnot) {
		const alphaKnotTarget = Number(V.speechAlphaKnotTarget);
		// Compare slots, not descriptions. Ordinary NPCs share descriptions, so matching on
		// the name can pick the wrong enemy. This mirrors the check in <<actionsman>>.
		if (!Number.isFinite(alphaKnotTarget) || alphaKnotTarget === Number(index)) {
			return "<<alphaknotSpeech>>";
		}
	}

	const npcName = namedNpcInSlot(index);

	// Named NPCs with registered handlers resolve to their matching speech macro.
	if (npcName && Macro.has(`speech-${npcName.toLowerCase()}`)) {
		return `<<speech-${npcName.toLowerCase()}>>`;
	}
	// Special case for Ivory Wraith, which uses a dedicated speech macro name.
	else if (npcName === "Ivory Wraith") {
		return "<<speechWraith>>";
	}
	// No valid named NPC comment was found for this pass.
	else {
		T.noNameComment = true;
		return "";
	}
}

DefineMacroS("namedNpcComments", namedNpcComments);

// NPCs reaction widgets, used namedNpcReaction() to append the relevant action.
// Example: Avery + "kissSkin" -> <<reaction-avery-kissSkin>>
const npcReactionWidgets = {
	Avery: "reaction-avery",
	Gwylan: "reaction-gwylan",
	Sydney: "reaction-sydney",
};

/**
 * Resolves a named NPC's reaction to something that just happened in combat.
 * An NPC with no widget for that event renders nothing.
 *
 * `<<namedNpcReaction _n "kissSkin" "thighs">>` -> `<<reaction-avery-kissSkin "thighs">>`
 *
 * @param {string | number} index NPC index or identifier
 * @param {string} event What just happened, e.g. "kissSkin".
 * @param {string} [detail] Optional detail about the combat state, e.g. which body part.
 * @returns {string} The NPC's reaction macro, or an empty string if none applies.
 */
function namedNpcReaction(index, event, detail) {
	const family = npcReactionWidgets[V.NPCList[index]?.fullDescription];
	if (!family || !event) return "";
	const macro = `${family}-${event}`;
	if (!Macro.has(macro)) return "";
	return `<<${macro}${detail === undefined ? "" : " " + JSON.stringify(detail)}>>`;
}

window.namedNpcReaction = namedNpcReaction;
DefineMacroS("namedNpcReaction", namedNpcReaction);
