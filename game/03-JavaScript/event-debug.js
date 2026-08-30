// @ts-check

/*  Jimmy: Blueprint for event structure, packaged for convenience.
 *  $event = {
 *      buffer = [] : EventNPC, refer to below
 *      schema = 1 : Integer, defines the current version on the save, useful for update tracking.
 *  }
 *
 *  EventNPC = {
 *      slot: Where the NPC is positioned in NPCList.
 *              EG: 0       $NPCList[0]
 *      time: The time the NPC was generated.
 *              EG: 805     13:48 / 1:48pm
 *      area: Where it was generated.
 *              EG: ['::Alleyways', 'eventsstreet', 'eventday', 'streetFollowDogAlley']
 *                      Passage        Widget 1      Widget 2    Widget 3
 *  }
 */

/**
 * Returns true iff the given $NPCList entry represents a fully-generated, live NPC (not an empty slot, and not a genuine gap).
 * WHY THIS PREDICATE EXISTS? Read this before "fixing" it back to a type-only check.
 *
 * The original validator used `"type" in npcList[i]`. Empty slots come in two shapes and
 * a type-only check mishandles both:
 *   - <<clearnpc>>/<<clearsinglenpc>> write a clone(setup.baseNPC), which in this fork holds
 *     only chastity/location/skills/pronouns/traits. `"type" in npc` is false, but the clone
 *     is still a truthy object, so any `if (npcList[i])` style check treats it as occupied.
 *   - <<endnpc>> leaves a zeroed record where fields exist but carry placeholder values.
 * After every <<endcombat>>, <<clearnpc>> refills slots 0..5 that way and sets NPCList.length = 6; that's the codebase's standard "padding" pattern, not a bug.
 *
 * HISTORICAL NOTE: earlier revisions of this comment claimed setup.baseNPC sets
 * `type: "human"`, so that padding clones would pass a type check and trip "EVENT DESYNC"
 * on every fresh encounter. That was a real symptom with a different cause: the
 * <<animatemodel>> widget (commit ee84ce2b79) stamped `type`, `condom`, `pronoun` etc. onto
 * every $NPCList slot on every passage render, so padding clones really did carry a truthy
 * type - not from setup.baseNPC, but from the sidebar portrait renderer corrupting NPC state.
 * That corruption is fixed (renderer no longer writes to $NPCList); the predicate below is
 * still the right one, because fullDescription is what distinguishes generated from cleared
 * across BOTH empty-slot shapes.
 *
 * The reliable post-generation marker is `fullDescription`: generateNPC and the
 * <<npc>> widget both populate it as their final step, so a slot that has a real,
 * non-empty, non-placeholder fullDescription is definitively a live NPC. Empty slots
 * either have it unset, empty, or as the literal placeholder
 * "undefined undefined" (see the fix-up code in npc-generation.twee).
 *
 * This predicate still catches every form of *real* desync:
 *   - live NPC with no matching buffer entry → flagged via empty-slots check below
 *   - buffer entry for a slot that's only an empty clone → flagged via the slot >= numOfNPCs check below (since numOfNPCs reflects live NPCs only)
 *   - two buffer entries for the same slot → flagged via the duplicate check
 *   - more buffer entries than live NPCs → flagged via the length check
 *
 * What this predicate intentionally does NOT flag is empty clones occupying unused slots that's not a desync, it's the codebase's expected steady state.
 *
 * @param {unknown} slot
 * @returns {boolean}
 */
function isLiveNPC(slot) {
	if (slot == null || typeof slot !== "object") return false;
	/** @type {Record<string, any>} */
	const npc = /** @type {any} */ (slot);
	if (!npc.type || npc.type === "undefined") return false;
	if (typeof npc.fullDescription !== "string") return false;
	const fd = npc.fullDescription.trim();
	if (!fd || fd === "undefined undefined" || fd === "undefined") return false;
	return true;
}
/* Exported so the debug overlay in debug-events.twee shares this exact predicate
   instead of re-implementing it inline and drifting out of sync. */
window.isLiveNPC = isLiveNPC;

/**
 * Handles event data for NPC objects for debugging.
 *
 * @module EventData
 */
class EventData {
	constructor() {
		this.disable = false;
	}

	/**
	 * @param {string} passage
	 * @param {number} index
	 * @param {number} time
	 * @returns {void}
	 */
	push(passage, index, time) {
		if (this.disable) return;
		if (V.event == null) {
			V.event = { buffer: [], schema: 1 };
		}
		V.event.buffer.push({
			slot: index,
			time,
			// dnac: keeping it consistent with docs
			area: [passage, ...ExecutionContext.instance.callStack.map(meta => meta.name).slice(0, -1)],
		});
	}

	/**
	 * @param {number} index
	 * @returns {void}
	 */
	pop(index) {
		if (this.disable) return;
		if (!V.event) return;

		V.event.buffer = V.event.buffer.filter(e => e.slot !== index); // TODO: Splice backwards instead.
		if (V.event.buffer.length === 0) {
			this.clear();
		}
	}

	/**
	 * @param {number} index
	 * @returns {EventNpc | undefined}
	 */
	get(index) {
		return V.event?.buffer.find(e => e.slot === index);
	}

	/**
	 * @param {number} index
	 * @returns {boolean}
	 */
	has(index) {
		return V.event?.buffer.some(e => e.slot === index) || false;
	}

	/**
	 * @param {number} index
	 * @returns {EventNpc[]}
	 */
	getEvery(index) {
		return V.event?.buffer.filter(e => e.slot === index) || [];
	}

	/**
	 * @returns {number}
	 */
	count() {
		return V.event?.buffer.length || 0;
	}

	/**
	 * @returns {boolean}
	 */
	any() {
		return this.count() > 0;
	}

	/**
	 * @returns {void}
	 */
	clear() {
		if (this.disable) return;
		delete V.event;
	}

	/**
	 * @param {number} index
	 * @returns {boolean}
	 */
	isSlotTaken(index) {
		return V.event?.buffer.some(e => e.slot === index) || false;
	}

	/**
	 * @returns {boolean}
	 */
	get Disable() {
		return this.disable;
	}

	/**
	 * @param {boolean} value
	 */
	set Disable(value) {
		if (typeof value !== "boolean") {
			console.debug("EventData.disable set with unexpected data-type, requires boolean.");
			return;
		}
		this.disable = value;
	}

	/**
	 * @returns {boolean}
	 */
	validate() {
		// Return true if no event is in progress. False would indicate a problem in our stack
		// system for NPCs. True indicates normal operation.
		if (V.event == null) return true;

		const buffer = V.event.buffer;
		const npcList = V.NPCList;
		if (!Array.isArray(npcList)) return true;
		if (!Array.isArray(buffer)) return true;

		// Find the semantic NPC count: walk backwards to the last slot containing a real NPC.
		//
		// IMPORTANT: We can NOT use `"type" in npcList[i]` here, and we also can NOT use just
		// `slot.type`. A cleared slot is still a truthy object (a clone(setup.baseNPC), or an
		// <<endnpc>> zeroed record), and an <<endnpc>> record can carry leftover fields. The only
		// field that reliably distinguishes "fully generated" from "freshly cleared" is
		// `fullDescription`: generateNPC constructs it at the end of generation from
		// description + role + title, and a cleared slot has it either unset or as the literal
		// placeholder "undefined undefined" (see npc-generation.twee guards). See the long note
		// on isLiveNPC above for why the older "baseNPC has type: human" rationale was wrong.
		//
		// Also guard against npcList[i] itself being null/undefined (genuine gap), which
		// the previous code would crash on (`"type" in undefined` throws TypeError).
		let numOfNPCs = 0;
		for (let i = npcList.length - 1; i >= 0; i--) {
			if (isLiveNPC(npcList[i])) {
				numOfNPCs = i + 1;
				break;
			}
		}

		// No real NPCs in the list. If the buffer is also empty, fine.
		// If it has entries, those are stale (NPCs were cleared but buffer wasn't) then treat as desync.
		if (numOfNPCs === 0) {
			return buffer.length === 0;
		}

		// First check for if buffer's length exceeds the populated NPCList range.
		if (buffer.length > numOfNPCs) return false;

		// Generate array to track whether an NPC slot is referenced by the buffer.
		const usedArr = Array(numOfNPCs).fill(false);
		for (let i = 0; i < buffer.length; i++) {
			const element = buffer[i];
			if (!element || typeof element.slot !== "number") continue;
			// A buffer entry referencing a slot beyond the populated range is itself a desync.
			if (element.slot < 0 || element.slot >= numOfNPCs) {
				if (V.options.debugdisable === "f" || V.debug) {
					console.warn("Buffer entry references non-existent NPC at slot", element.slot, "(numOfNPCs:", numOfNPCs, ")");
				}
				return false;
			}
			if (!usedArr[element.slot]) {
				usedArr[element.slot] = true;
				continue;
			} else if (V.options.debugdisable === "f" || V.debug) {
				// NPC position is being used more than once, although not a gap, flag.
				console.warn("NPC slot", element.slot, "is being used more than once. Existing NPCs should be disposed before using their slot.");
				return false;
			}
		}

		// Check usedArr for false values. These are slots with a real NPC but no buffer entry.
		// [true, false, true, false] => [1, 3]
		const slots = [];
		for (let i = 0; i < usedArr.length; i++) {
			const e = usedArr[i];
			if (!e) slots.push(i);
		}
		if (slots.length !== 0) {
			if (V.options.debugdisable === "f" || V.debug) {
				console.warn("NPC slots that are empty:", slots);
			}
			return false;
		}
		return true;
	}

	/**
	 * @returns {void}
	 */
	update() {
		if (V.event == null) {
			return;
		}
		// Check if $event contains schema
		switch (V.event.schema) {
			case 1:
				// No need for updates.
				return;
		}
		// Update to newer schema (1 atm).
		// .event ['Farm Work', 'Farm Work', 'Farm Work', 'Farm Work']
		// .eventtime [497, 497, 497, 497]
		// .eventslot [0, 1, 2, 3]
		// @ts-ignore (Updater code)
		const event = [...V.event];
		V.event = {
			buffer: [],
			schema: 1,
		};
		for (let i = 0; i < event.length; i++) {
			if (V.eventslot && V.eventtime) {
				this.push(event[i], V.eventslot[i], V.eventtime[i]);
			}
		}
		delete V.eventtime;
		delete V.eventslot;
	}
}

// Jimmy: Potentially flawed design style, static class basically.
// But ends up being just an extended function in reality. (Not actually tho)
window.EventSystem = new EventData();

/**
 * Refreshes the event-debug sidebar after the passage body has finished generating NPCs.
 * The caption is wikified before passage content, so its first label can otherwise describe
 * the previous passage while the overlay already sees the new, potentially broken state.
 *
 * @returns {void}
 */
function refreshEventDebugButton() {
	const label = document.querySelector("#event-info-label");
	if (!label || V.options?.debugdisable !== "f") return;

	let text = "EVENT INFO";
	let colour = "yellow";

	if (EventSystem.any()) {
		const event0 = EventSystem.has(0) ? EventSystem.get(0) : undefined;
		const trackedPassages = Array.isArray(V.event?.buffer)
			? V.event.buffer.reduce((passages, event) => {
					if (event?.area?.[0] && !passages.includes(event.area[0])) passages.push(event.area[0]);
					return passages;
			  }, [])
			: [];

		if (!EventSystem.validate()) {
			text = "EVENT DESYNC";
			colour = "red";
		} else if (event0?.area?.[0] === V.passage) {
			text = "EVENT ACTIVE";
			colour = "green";
		} else if (setup.majorAreas.includes(V.passage)) {
			text = "EVENT ESCAPED";
			colour = "red";
		} else if (trackedPassages.length === 1 && ["Forest Cabin", "Eden Cabin", "Eden Clearing"].includes(event0?.area?.[0])) {
			text = "EVENT ACTIVE";
			colour = "green";
		} else {
			text = "SHOW EVENT INFO";
		}
	}

	label.className = colour;
	label.textContent = text;
}

window.refreshEventDebugButton = refreshEventDebugButton;
$(document).on(":passageend", refreshEventDebugButton);
