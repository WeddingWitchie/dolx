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
 * Returns the correct swarm noun for the given creature count.
 *
 * @param {number} [count] Defaults to the current swarm count.
 * @returns {string} Singular name for 1 creature, plural type otherwise.
 */
function swarmWord(count) {
	if (!V.swarm) return "";
	const n = count === undefined ? V.swarm.amount?.active?.[0] : count;
	return n === 1 ? V.swarm.name : V.swarm.type;
}

window.swarmWord = swarmWord;
