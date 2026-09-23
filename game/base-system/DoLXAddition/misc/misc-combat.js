/**
 * Clean up leftover NPC combat state after <<endevent>>.
 *
 * <<endevent>> removes all NPCs but normally leaves body-position trackers behind.
 * This can make the next encounter think an NPC from the previous scene is still
 * penetrating or touching the player, causing incorrect text and combat errors.
 *
 * Clear only NPC-related states here. Non-human states such as tentacles, machines,
 * plants, toys, and masturbation are left unchanged.
 */
(function () {
	"use strict";

	/* Values that describe something other than an NPC's body, or a neutral resting state. */
	const KEEP_EXACT = new Set([
		"none",
		"covered",
		"bound",
		"behind",
		"handheld",
		"heldSexToy",
		"heldXchangePill",
		"gagged",
		"run",
		"walk",
		"strut",
		"possessed",
		"trapped",
	]);

	/* Keep solo states such as swarms, tentacles, machines, restraints, plants, sex toys, and masturbation.
	Clear "cover", "coverpenis", and "clit" because they require another NPC. */
	const KEEP_PREFIX = [
		"struggle",
		"tent",
		"machine",
		"stroker",
		"dildo",
		"swarm",
		"mech",
		"manus",
		"mballs",
		"mbreastpump",
		"mdildomouth",
		"mpenis",
		"mpickupdildo",
		"mvagina",
	];

	function isNpcSourced(value) {
		if (!value || typeof value !== "string") return false;
		if (KEEP_EXACT.has(value)) return false;
		return !KEEP_PREFIX.some(prefix => value.startsWith(prefix));
	}

	function isIdle(value) {
		return !value || value === "none";
	}

	/* use/state trackers, grouped with the target indexes that only mean anything while they are set. */
	const GROUPS = [
		{ trackers: ["vaginause", "vaginastate"], organ: "vagina", zero: ["vaginatarget"], unset: ["vaginadoubletarget"] },
		{ trackers: ["anususe", "anusstate"], zero: ["anustarget"], unset: ["anusdoubletarget"] },
		{ trackers: ["penisuse", "penisstate"], organ: "penis", zero: ["penistarget"], unset: [] },
		{ trackers: ["mouthuse", "mouthstate"], zero: ["mouthtarget"], unset: [] },
		{ trackers: ["chestuse", "cheststate"], zero: ["chesttarget"], unset: [] },
		{ trackers: ["thighuse"], zero: ["thightarget"], unset: [] },
		{ trackers: ["feetuse"], zero: ["feettarget"], unset: ["leglocktarget"] },
		{ trackers: ["leftarm"], zero: ["lefttarget"], unset: [] },
		{ trackers: ["rightarm"], zero: ["righttarget"], unset: [] },
		{ trackers: ["bottomuse"], zero: [], unset: [] },
		{ trackers: ["head"], zero: [], unset: [] },
		{ trackers: ["neckuse"], zero: [], unset: [] },
	];

	/* Penetration/contact dialogue flags. Same list <<manend>> unsets, minus its speech-cycle bump. */
	const SPEECH_FLAGS = [
		"speechpenispenetrated",
		"speechvaginapenetrated",
		"speechanuspenetrated",
		"speechmouthpenetrated",
		"speechotheranuspenetrated",
		"speechvaginaimminent",
		"speechpenisimminent",
		"speechanusimminent",
		"speechmouthimminent",
		"speechotheranusimminent",
		"speechvaginaentrance",
		"speechanusentrance",
		"speechmouthentrance",
		"speechpenisentrance",
		"speechotheranusentrance",
		"speechvaginawithhold",
		"speechanuswithhold",
		"speechpeniswithhold",
		"speechotheranuswithhold",
		"speechvagina",
		"speechpenis",
		"speechanus",
		"speechvaginamouth",
		"speechvaginavagina",
		"speechbeat",
		"speechhit",
		"speechscratch",
		"speechtribentrance",
		"speechfacesit",
		"speechmouthotheranus",
		"speechanallick",
		"speechanalkiss",
		"speechfencingentrance",
		"speechpenispenis",
		"speechheadbreasts",
		"speechheadchest",
		"speechheadnipple",
		"speechheadsuckle",
		"speechheadnippleclosed",
		"speechheadsuckleclosed",
		"speechfeet",
		"speechthigh",
		"speechcheeks",
		"speechhandjobpenis",
		"speechhandjobvagina",
		"speechmasturbate",
		"speechdildovagina",
		"speechdildoanus",
		"speechstroker",
		"speechthroat",
		"speechvaginafoot",
		"speechpenisfoot",
		"speechchastity",
		"speechNPCChastity",
		"speechstruggle",
		"speechstripstruggle",
		"speechspank",
		"speecharms",
		"speechclit",
		"speechglans",
		"speechfutapenis",
		"speechbottom",
		"speechhair",
		"speechchestrub",
		"speechbreastrub",
		"speechvaginaflaunt",
		"speechpenisbig",
		"speechpenisescape",
		"speechvaginaescape",
		"speechanusescape",
		"speechsteal",
		"speechnamedrop",
		"speechadmired",
		"speechaskrough",
		"speechgrapple",
		"speechwheeze",
		"speechNPCPenisVirgin",
		"speechNPCVaginaVirgin",
		"speechNPCAnusVirgin",
		"speechNPCOralVirgin",
		"speechNPCKissVirgin",
		"speechNPCHandholdingVirgin",
	];

	/**
	 * Clears every player body-position tracker that still points at an NPC.
	 * Called from <<endevent>>, after the NPC list has been wiped.
	 */
	window.clearOrphanedNpcState = function clearOrphanedNpcState() {
		try {
			const V = State.variables;
			const player = V.player || {};

			GROUPS.forEach(group => {
				/* An absent organ rests at "none" rather than 0, matching <<endcombat>>. */
				let idle = 0;
				if (group.organ === "vagina" && !player.vaginaExist) idle = "none";
				if (group.organ === "penis" && !player.penisExist && !playerHasStrapon()) idle = "none";

				group.trackers.forEach(key => {
					if (isNpcSourced(V[key])) V[key] = idle;
				});

				/* Only drop the target indexes once nothing is holding that body part at all
				   a kept tentacle or toy state still needs whatever it is pointing at. */
				if (group.trackers.every(key => isIdle(V[key]))) {
					group.zero.forEach(key => {
						V[key] = 0;
					});
					group.unset.forEach(key => {
						delete V[key];
					});
				}
			});

			SPEECH_FLAGS.forEach(flag => {
				delete V[flag];
			});
		} catch (ex) {
			console.error("clearOrphanedNpcState failed", ex);
		}
	};
})();

/* True when an orgasm restriction is actually in force (setting off, not paused), so masturbation alone can't finish.
   Scenes use it only to enable fallbacks and early exits. */
function playerCannotSelfClimax() {
	if (V.statFreeze || V.hc || V.sexRitual) return false;
	return !!(
		(V.penis_addict_trait === 1 && !V.xchange?.genitalAddictFreeOrgasm) ||
		(V.hole_addict_trait === 1 && V.player?.penisExist && !V.xchange?.genitalAddictFreeOrgasm) ||
		// eslint-disable-next-line no-undef
		(playerIsXChanged() && V.xchange?.pill?.alphaEffect && V.player?.penisExist && !V.xchange?.alphaFreeOrgasm) ||
		// eslint-disable-next-line no-undef
		oralFixationDenies() ||
		// eslint-disable-next-line no-undef
		breederOrgasmDenied()
	);
}
window.playerCannotSelfClimax = playerCannotSelfClimax;

/* Matches the daily demon burn check: any purity causes a burn at midnight, and feat demons burn from level 1 instead of 6. */
function demonPurityBurnPending() {
	return !!(V.purity >= 1 && (effectiveTransformationLevel("demon") >= 6 || (V.demon >= 1 && V.demonFeat)));
}
window.demonPurityBurnPending = demonPurityBurnPending;
