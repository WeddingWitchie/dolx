// @ts-check
/* global CombatRenderer, PlayerCombatMapper, NpcCombatMapper, Condom */

/**
 * @typedef XrayOptions
 * @property {"img/sex"} root
 * @property {string} src Source directory for xray images.
 * @property {boolean} showPcPenis
 * @property {boolean} showPcVagina
 * @property {boolean} showPcArse
 * @property {boolean} showNpcPenis
 * @property {boolean} showNpcVagina
 * @property {boolean} showNpcArse
 * @property {XrayPlayerPenetrator} penis Player penis and penetrated.
 * @property {XrayNpcPenetrator} vagina Player vagina and penetrators.
 * @property {XrayNpcPenetrator} anus Player anus and penetrators.
 * @property {object} filters The filters for layers.
 * @property {string} animKeyBase
 * @property {string} animKeyVagina
 * @property {string} animKeyPenis
 * @property {string} animKeyArse
 */

/**
 * @typedef XrayPlayerPenetrator
 * @property {string} base
 * @property {boolean} show
 * @property {string} penetratedType
 * @property {string} type
 * @property {"anal" | "vaginal"} penetrated
 * @property {string} playerSprite
 * @property {string} tentacleColour
 * @property {number} size
 * @property {boolean} doublePen
 * @property {string | 0} state
 * @property {Condom} condom
 * @property {number} cum
 * @property {boolean} isCumActive
 * @property {boolean} showCum
 */

/**
 * @typedef XrayNpcPenetrator
 * @property {string} base
 * @property {boolean} show
 * @property {number=} npc
 * @property {number=} npc2
 * @property {number=} npc3
 * @property {string} npcType
 * @property {number} size
 * @property {number} size2
 * @property {number=} size3
 * @property {boolean} doublePen
 * @property {string} penetratorSprite
 * @property {string} tentacleColour
 * @property {boolean} isCumActive
 * @property {boolean} showCum
 * @property {number} cum
 */

class XrayCombatMapper {
	/** @returns {XrayOptions} */
	static generateOptions() {
		// @ts-ignore
		return {
			src: "img/sex/xray/",
			animKeyBase: "idle",
			animKeyVagina: "sex-1f-idle",
			animKeyPenis: "sex-1f-idle",
			animKeyArse: "sex-1f-idle",
			filters: {},
			// For the default objects below, replace default values where applicable
			// You may want to set these properties as nullable/undefinable in the typings
			vagina: {
				base: "",
				show: true,
				cum: 0,
				doublePen: false,
				isCumActive: false,
				showCum: false,
				npcType: "",
				penetratorSprite: "",
				size: 0,
				size2: 0,
				tentacleColour: "tentacle-purple",
			},
			anus: {
				base: "",
				show: true,
				cum: 0,
				doublePen: false,
				isCumActive: false,
				showCum: false,
				npcType: "",
				penetratorSprite: "",
				size: 0,
				size2: 0,
				tentacleColour: "tentacle-purple",
			},
			penis: {
				base: "",
				show: true,
				cum: 0,
				isCumActive: false,
				size: 0,
				tentacleColour: "tentacle-purple",
				condom: {
					state: "",
					colour: "",
					type: "",
					willUse: false,
					worn: false,
				},
				penetrated: "vaginal",
				penetratedType: "",
				playerSprite: "",
				doublePen: false,
				showCum: false,
				state: "",
				type: "",
			},
		};
	}

	/**
	 * @returns {boolean}
	 */
	static isPcBlowjobVisible() {
		return (V.player.penisExist || playerHasStrapon()) && combat.isPenisPenetrated() && V.penisstate !== "othermouth";
	}

	/**
	 * @returns {boolean}
	 */
	static isPcVaginaVisible() {
		return V.player.vaginaExist && combat.isVaginaPenetrated();
	}

	/**
	 * @returns {boolean}
	 */
	static isPcAnusVisible() {
		return combat.isAnusPenetrated();
	}

	/**
	 * @returns {boolean}
	 */
	static isNpcBlowjobVisible() {
		return XrayCombatMapper.isPcVaginaVisible() || XrayCombatMapper.isPcAnusVisible();
	}

	/**
	 * @param {XrayOptions} options
	 * @returns {XrayOptions}
	 */
	static mapXrayOptions(options) {
		// Set directory for images
		options.root = "img/sex";
		options.src = `${options.root}/xray/`;

		options.filters = options.filters || {};

		// Show Conditions
		// If penis-to-mouth xrays ever become a thing, adjust this check
		options.showPcPenis = XrayCombatMapper.isPcBlowjobVisible();
		options.showPcVagina = XrayCombatMapper.isPcVaginaVisible();
		options.showPcArse = XrayCombatMapper.isPcAnusVisible();
		options.showNpcPenis = XrayCombatMapper.isNpcBlowjobVisible();

		// Colours
		// @ts-ignore
		CombatRenderer.generateBodyFilters(options);
		// @ts-ignore
		PlayerCombatMapper.mapPcToClothingOption("under_lower", V.player, options);

		// Genitals
		if (options.showPcPenis) {
			XrayCombatMapper.mapXrayPlayerPenis(options, options.penis);
		}
		if (options.showPcVagina) {
			XrayCombatMapper.mapXrayPenetrators(options, options.vagina, "vagina");
		}
		if (options.showPcArse) {
			XrayCombatMapper.mapXrayPenetrators(options, options.anus, "anus");
		}

		// Set animation speed
		if (V.enemytype === "machine") {
			switch (V.machine?.speed) {
				case 1:
					options.animKeyBase = "slow";
					break;
				case 2:
					options.animKeyBase = "fast";
					break;
				default:
					options.animKeyBase = "vfast";
					break;
			}
		} else {
			if (T.knotted || T.knotted_short) {
				options.animKeyBase = "mid";
			} else {
				const step = V.enemyarousalmax > 0 ? V.enemyarousalmax / 5 : 0;

				if (V.orgasmdown > 0 || (step && V.enemyarousal >= step * 4)) options.animKeyBase = "vfast";
				else if (step && V.enemyarousal >= step * 3) options.animKeyBase = "fast";
				else if (step && V.enemyarousal >= step * 1) options.animKeyBase = "mid";
				else options.animKeyBase = "slow";
			}
		}

		options.animKeyVagina = `sex-${combat.isVaginaActive("xray") ? "8f-" + options.animKeyBase : "1f-idle"}`;
		options.animKeyArse = `sex-${combat.isAnusActive("xray") ? "8f-" + options.animKeyBase : "1f-idle"}`;
		options.animKeyPenis = `sex-${combat.isPenisActive("xray") ? "8f-" + options.animKeyBase : "1f-idle"}`;

		return options;
	}

	/**
	 * @param {XrayOptions} options
	 * @param {XrayNpcPenetrator} penetrator
	 * @param {"vagina" | "anus" | "penis"} slot
	 */
	static mapXrayPenetrators(options, penetrator, slot) {
		/* Target vars hold either an NPCList index or the sentinel string "tentacles"
		(tentacles live in $tentacles, not in $NPCList), so the lookup can legitimately come back empty; treat that as "nobody there". */
		const targetNpc = V.NPCList[V[slot + "target"]];
		const targetNpc2 = V.NPCList[V[slot + "doubletarget"]];

		/* Type of NPC penetrating the player */
		penetrator.npcType =
			V.enemytype === "machine"
				? "machine"
				: ["tentacle", "tentacledeep"].includes(V[slot + "state"]) || V[slot + "target"] === "tentacles"
				? "tentacle"
				: V.portalPanties.state[slot]
				? V.portalPanties.state[slot].type
				: targetNpc
				? targetNpc.type
				: "none";

		/* slot is being doublepenetrated or not */
		penetrator.doublePen = V[slot + "state"] === "doublepenetrated" && targetNpc?.penis === slot + "double" && targetNpc2?.penis === slot + "double";

		/* If NPC pulled out, show empty xray base for that turn
		if (T["pullOut" + slot.toUpperFirst()]) {
			penetrator.npcType = "none";
			penetrator.size = 0;
			penetrator.base = slot === "vagina" && V.orgasmdown >= 1 ? "twitching" : "rest";
			penetrator.show = false;
		} else {
			penetrator.base = "sex";
			penetrator.npc = V[slot + "target"];
		}
		*/
		penetrator.base = "sex";
		penetrator.npc = V[slot + "target"];

		/* Penetrator control */
		switch (penetrator.npcType) {
			case "none":
				penetrator.penetratorSprite = "";
				penetrator.size = 0;
				penetrator.show = false;
				options.filters[slot + "Penetrator"] = "";
				break;
			case "machine":
				penetrator.penetratorSprite = "tentacle";
				penetrator.size = 3;
				penetrator.tentacleColour = V.tentacleColour || "tentacles-peach";
				options.filters[slot + "Penetrator"] = CombatRenderer.lookupColour(
					setup.colours.tentacle_map,
					penetrator.tentacleColour,
					"xrayTentacle",
					undefined,
					undefined
				);
				break;
			case "tentacle": {
				penetrator.penetratorSprite = "tentacle";
				const secondTentacle = V["tentacle" + slot.toUpperFirst() + "2"];
				const thirdTentacle = V["tentacle" + slot.toUpperFirst() + "3"];
				let secondSize;
				let thirdSize;
				for (let tentacleIndex = 0; tentacleIndex < V.tentacles.max; tentacleIndex++) {
					const tentacle = V.tentacles[tentacleIndex];
					if (tentacle === undefined) continue;
					if (tentacle.fullDesc === V["tentacle" + slot.toUpperFirst()]) {
						penetrator.size = tentacle.size;
					}
					if (secondTentacle !== undefined && tentacle.fullDesc === secondTentacle) {
						secondSize = tentacle.size;
					}
					if (thirdTentacle !== undefined && tentacle.fullDesc === thirdTentacle) {
						thirdSize = tentacle.size;
					}
				}
				if (secondSize !== undefined) {
					/* Two tentacles share the hole: reuse the human DP sprite pipeline (-dp variants only exist for sizes 2-4, bigger one must be primary) */
					penetrator.doublePen = true;
					// @ts-ignore - like penetrator.npc above, this is a non-NPCList marker; layers only test it against undefined
					penetrator.npc2 = "tentacles";
					penetrator.size = Math.clamp(penetrator.size, 2, 4);
					penetrator.size2 = Math.clamp(secondSize, 2, 4);
					if (penetrator.size2 > penetrator.size) {
						const tmpSize = penetrator.size;
						penetrator.size = penetrator.size2;
						penetrator.size2 = tmpSize;
					}
				}
				penetrator.tentacleColour = V.tentacleColour || "tentacles-purple";
				options.filters[slot + "Penetrator"] = CombatRenderer.lookupColour(
					setup.colours.tentacle_map,
					penetrator.tentacleColour,
					"xrayTentacle",
					undefined,
					undefined
				);
				if (penetrator.doublePen) {
					options.filters[slot + "Penetrator2"] = options.filters[slot + "Penetrator"];
				}
				if (penetrator.doublePen && thirdSize !== undefined) {
					/* Third tentacle: overlay the plain single-tentacle sprite on the DP pair, drawn slightly darker so it reads as a separate strand.
					   Force its size to differ from the primary's, or it would be completely hidden behind it. */
					// @ts-ignore - non-NPCList marker like npc2; layers only test it against undefined
					penetrator.npc3 = "tentacles";
					penetrator.size3 = Math.clamp(thirdSize, 1, 6);
					if (penetrator.size3 === penetrator.size) {
						penetrator.size3 = penetrator.size3 > 1 ? penetrator.size3 - 1 : penetrator.size3 + 1;
					}
					options.filters[slot + "Penetrator3"] = options.filters[slot + "Penetrator"];
				}
				break;
			}
			case "human":
			case "plant":
				/* For DP, bigger penis MUST be the primary target sprite. */
				if (penetrator.doublePen) {
					penetrator.npc =
						V.NPCList[V[slot + "target"]].penissize <= V.NPCList[V[slot + "doubletarget"]].penissize ? V[slot + "doubletarget"] : V[slot + "target"];
					penetrator.npc2 = penetrator.npc === V[slot + "doubletarget"] ? V[slot + "target"] : V[slot + "doubletarget"];
				} else {
					penetrator.npc = V[slot + "target"];
				}

				this.mapXrayHumanPenis("npc", slot, options);
				if (V.portalPanties.state[slot]) {
					penetrator.size = V.portalPanties.state[slot].size;
				}

				if (penetrator.npc2 !== undefined) {
					this.mapXrayHumanPenis("npc2", slot, options);

					/* size 1 and 5 penises are supposed to be impossible to dp with, so just in case, make sure sprites don't error out */
					penetrator.size = Math.clamp(penetrator.size, 2, 4);
					penetrator.size2 = Math.clamp(penetrator.size2, 2, 4);
				}
				break;
			case "horse":
			case "centaur":
			case "cow":
			case "cowgirl":
			case "bull":
			case "bullboy":
				penetrator.penetratorSprite = "horse";
				penetrator.size = 5;
				break;
			case "dog":
			case "doggirl":
			case "dogboy":
			case "fox":
			case "foxgirl":
			case "foxboy":
			case "wolf":
			case "wolfgirl":
			case "wolfboy":
				penetrator.penetratorSprite = V.ejaculating === 1 && (T.knotted || T.knotted_short) ? "knotted-full" : "knotted";
				penetrator.size = penetrator.npcType.includes("wolf") ? 3 : 2;
				penetrator.base = V.ejaculating === 1 && (T.knotted || T.knotted_short) ? "knotting" : penetrator.base;
				options.filters[slot + "Penetrator"] = {
					blend: "#ec3535",
					blendMode: "multiply",
					desaturate: true,
				};
				break;
			case "pig":
			case "piggirl":
			case "pigboy":
			case "boar":
			case "boargirl":
			case "boarboy":
				penetrator.penetratorSprite = "spiral";
				penetrator.size = penetrator.npcType.includes("boar") ? 3 : 2;
				options.filters[slot + "Penetrator"] = {
					blend: "#ec3535",
					blendMode: "multiply",
					desaturate: true,
				};
				break;
			case "hawk":
			case "harpy":
			case "cat":
			case "catgirl":
			case "catboy":
			case "dolphin":
			case "dolphingirl":
			case "dolphinboy":
				penetrator.penetratorSprite = "point";
				penetrator.size = 2;
				options.filters[slot + "Penetrator"] = {
					blend: "#ec3535",
					blendMode: "multiply",
					desaturate: true,
				};
				break;
			case "bear":
			case "beargirl":
			case "bearboy":
			case "creature":
			case "horned woman":
			case "horned man":
				penetrator.penetratorSprite = "tentacle";
				penetrator.size = 3;
				options.filters[slot + "Penetrator"] = {
					blend: "#ec3535",
					blendMode: "multiply",
					desaturate: true,
				};
				break;
			case "lizard":
			case "lizardgirl":
			case "lizardboy":
				penetrator.penetratorSprite = "penis";
				penetrator.size = 2;
				options.filters[slot + "Penetrator"] = {
					blend: "#ec3535",
					blendMode: "multiply",
					desaturate: true,
				};
				break;
			default:
				Errors.report("Invalid npc for xray image. penetrator.npcType");
				break;
		}

		penetrator.isCumActive = false;
		if (V.ejaculating === 1 || V[slot + "state"] === "tentacledeep" || V["portalejac" + slot]) {
			const npc1HasSperm =
				V[slot + "state"] === "tentacledeep" ||
				V["portalejac" + slot] ||
				(combat.isNpcActive(penetrator.npc) && wearingCondom(penetrator.npc) !== "worn" && !npcHasStrapon(penetrator.npc));
			const npc2HasSperm =
				V[slot + "state"] === "tentacledeep" ||
				(combat.isNpcActive(penetrator.npc2) && wearingCondom(penetrator.npc2) !== "worn" && !npcHasStrapon(penetrator.npc2));
			// Should this also check if NCPs are ejaculating? Or does $ejaculating = 1 do that
			penetrator.isCumActive = npc1HasSperm || npc2HasSperm || V[slot + "state"] === "tentacledeep";
		}

		if (setup.bodyliquid.combined(slot) >= 1 || penetrator.isCumActive) {
			penetrator.cum = Math.clamp(setup.bodyliquid.combined(slot), 1, 5);
			penetrator.showCum = true;
		}
	}

	/**
	 * @param {"npc" | "npc2"} npc
	 * @param {"vagina" | "anus" | "penis"} slot
	 * @param {XrayOptions} options
	 */
	static mapXrayHumanPenis(npc, slot, options) {
		const index = npc === "npc2" ? "2" : "";
		const penetrator = options[slot];
		const npcSource = V.NPCList[penetrator[npc]];
		if (npcHasStrapon(options[slot][npc])) {
			penetrator[npc + "Strapon"] = true;
			if (npcSource.penisdesc.includes("horse") && !penetrator.doublePen) {
				penetrator["penetratorSprite" + index] = "horse-strapon";
				penetrator["size" + index] = 5;
			} else if (npcSource.penisdesc.includes("knotted") && !penetrator.doublePen) {
				penetrator["penetratorSprite" + index] = "knotted";
				penetrator["size" + index] = 3;
			} else if (npcSource.penisdesc.includes("tentacle")) {
				penetrator["penetratorSprite" + index] = "tentacle";
				penetrator["size" + index] = npcSource.penissize;
			} else if (npcSource.penisdesc.includes("dolphin") && !penetrator.doublePen) {
				penetrator["penetratorSprite" + index] = "point";
				penetrator["size" + index] = 2;
			} else if (npcSource.strapon?.color === "fleshy") {
				penetrator["penetratorSprite" + index] = "penis";
				penetrator["size" + index] = npcSource.penissize;
				penetrator[npc + "Strapon"] = false;
			} else {
				penetrator["penetratorSprite" + index] = "strapon";
				penetrator["size" + index] = npcSource.penissize;
			}
		} else {
			penetrator["penetratorSprite" + index] = "penis";
			penetrator["size" + index] = npcSource?.penissize ?? V.portalPanties.state[slot].size ?? 0;
			if (wearingCondom(penetrator[npc])) {
				options.filters[slot + "Condom" + index] = CombatRenderer.getCondomOptions(npcSource.condom).colour;
			}
		}
		options.filters[slot + "Penetrator" + index] = npcSource ? NpcCombatMapper.getNpcPenetratorFilter(npcSource) : setup.colours.getSkinFilter("light", 0);

		return penetrator;
	}

	/**
	 * @param {XrayOptions} options
	 * @param {XrayPlayerPenetrator} penetrator
	 */
	static mapXrayPlayerPenis(options, penetrator) {
		/* if player penetrating others */
		penetrator.penetratedType =
			V.enemytype === "machine"
				? "machine"
				: V.penisstate !== 0 && (["tentacle", "tentacledeep"].includes(V.penisstate) || V.penistarget === "tentacles")
				? "tentacle"
				: V.NPCList[V.penistarget]?.type ?? "none";

		const playerPenisType = playerHasStrapon() ? "strapon" : V.player.sex === "f" ? "parasite" : "penis";
		penetrator.type = playerPenisType;
		penetrator.playerSprite = playerPenisType;
		penetrator.size = playerHasStrapon() && V.worn.under_lower.size !== undefined ? V.worn.under_lower.size : V.player.penissize;
		penetrator.size = Math.clamp(penetrator.size, 1, 5);
		penetrator.state = V.penisstate;

		if (V.player.condom) {
			penetrator.condom = V.player.condom;
			if (penetrator.condom.colour) {
				options.filters.playerCondom = CombatRenderer.lookupColour(setup.colours.condom_map, penetrator.condom.colour, "condom", "condom_custom", "condom");
			}
		}

		if (V.orgasmdown >= 1 && V.orgasmcount <= 24 && V.femaleclimax !== 1 && wearingCondom("player") !== "worn" && !playerHasStrapon()) {
			penetrator.isCumActive = true;
			penetrator.showCum = true;
		}

		if (V.internalejac && V.otherFilled > 0) {
			penetrator.showCum = true;
		}

		if (penetrator.state && ["tentacle", "tentacledeep"].includes(penetrator.state)) {
			if (penetrator.penetratedType === "machine") {
				penetrator.penetrated = "vaginal";
				penetrator.tentacleColour = V.tentacleColour || "tentacles-peach";
				options.filters.penisPenetrated = CombatRenderer.lookupColour(
					setup.colours.tentacle_map,
					penetrator.tentacleColour,
					"xrayTentacle",
					undefined,
					undefined
				);
			} else {
				penetrator.penetrated = "vaginal";
				penetrator.tentacleColour = V.tentacleColour || "tentacles-purple";
				options.filters.penisPenetrated = CombatRenderer.lookupColour(
					setup.colours.tentacle_map,
					penetrator.tentacleColour,
					"xrayTentacle",
					undefined,
					undefined
				);
			}
		} else {
			penetrator.penetrated = penetrator.state === "otheranus" ? "anal" : "vaginal";
		}

		if (penetrator.type === "parasite") {
			options.filters.parasite = CombatRenderer.lookupColour(setup.colours.tentacle_map, "tentacles-peach", "xrayTentacle", undefined, undefined);
		}
		penetrator.base = "sex";
		const alphaKnotActive = !!(
			!V.statFreeze &&
			V.xchange?.pill?.active &&
			V.xchange.pill.alphaEffect &&
			V.player.penisExist &&
			!playerHasStrapon() &&
			!playerChastity()
		);
		const alphaKnotState = ["entrance", "imminent", "penetrated", "otheranusentrance", "otheranusimminent", "otheranus"].includes(penetrator.state);
		if (alphaKnotActive && alphaKnotState && V.alphaKnotSwollen) {
			const alphaKnotFull = !!penetrator.isCumActive;
			penetrator.type = "knotted";
			penetrator.playerSprite = alphaKnotFull ? "knotted-full" : "knotted";
			penetrator.size = Math.clamp(penetrator.size, 2, 3);
			if (alphaKnotFull) penetrator.base = "knotting";
		}
		options.showNpcVagina = penetrator.penetrated === "vaginal";
		options.showNpcArse = penetrator.penetrated === "anal";

		return penetrator;
	}
}
window.XrayCombatMapper = XrayCombatMapper;
