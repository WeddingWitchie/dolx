// @ts-check
const closeMapperEnemyPleasure = () => Number((/** @type {any} */ (V)).enemypleasure ?? 0);
const closeMapperEnemyPleasureMax = () => Number((/** @type {any} */ (V)).enemypleasuremax ?? 500);
/* global CombatRenderer, PlayerCombatMapper, NpcCombatMapper, Condom */

/**
 * @typedef {"anus" | "vagina" | "mouth"} ClosePenetratorSlot
 */

/**
 * @typedef {object} ClosePenetratorOptions
 * @property {string} state
 * @property {string | null} npc
 * @property {string} [npc2]
 * @property {string} [cumState]
 * @property {boolean} [hirsute]
 * @property {string} [silhouette]
 * @property {boolean} [strapon]
 * @property {boolean} [dpStrapon]
 */

/**
 * @typedef {object} ClosePenisStateOptions
 * @property {string} type
 * @property {string | number} size
 * @property {string} state
 * @property {string | null} npc
 * @property {boolean | Condom | false} condom
 * @property {boolean} concealed
 * @property {SkinColours} [npcTone]
 */

/**
 * @typedef {object} CloseChestStateOptions
 * @property {string | number} base
 * @property {number | "topdown"} breasts
 * @property {string} npc
 * @property {boolean} [condom]
 */

/**
 * @typedef CloseOptions
 * @property {"img/sex"} root
 * @property {string} src Source directory for closeup images.
 * @property {boolean} showChest
 * @property {boolean} showPenis
 * @property {boolean} showVagina
 * @property {boolean} showArse
 * @property {boolean} showMouth
 * @property {"doggy"|"missionary"} position Doggy or missionary position.
 * @property {number|"topdown"} breasts Breast size, or topdown sprites if size >= 8. (May want to add ability to toggle views.)
 * @property {"parasite"|"herm-balls"|"herm-base"} herm Player penis, used in vagina closeup.
 * @property {ClosePenetratorOptions} vagina Player vagina and penetrators, used in vagina closeup.
 * @property {ClosePenisStateOptions} penis Player penis and penetrated, used in penis closeup.
 * @property {ClosePenetratorOptions} anus Player anus and penetrators, used in arse closeup.
 * @property {CloseChestStateOptions} chest Player chest and titjob.
 * @property {ClosePenetratorOptions} mouth Player face and penetrators, used in mouth close up.
 * @property {string} pcPenis Computed sprite for player penis, taking size/chastity/type into account.
 * @property {"beast"|"penis"|"tentacle"} breastsNpc Type of npc giving boobjob.
 * @property {Record<string, any>} filters The filters for layers.
 * @property {string|false} chastity
 * @property {string} pbhairColour
 * @property {string} condomColour
 * @property {string} parasitePanties
 * @property {string} animKeyVagina
 * @property {string} animKeyPenis
 * @property {string} animKeyArse
 * @property {string} animKeyChest
 * @property {string} animKeyMouth
 * @property {boolean} breastjobDemo Options -> Performance toggle for changing breastjob sprites to topdown view
 * @property {boolean} topdownDemo Options -> Performance toggle for changing breastjob sprites to topdown view
 */

class CloseCombatMapper {
	/** @returns {CloseOptions} */
	static generateOptions() {
		// @ts-ignore
		return {
			position: "missionary",
			src: "img/sex/close/",
			animKeyVagina: "sex-1f-idle",
			animKeyPenis: "sex-1f-idle",
			animKeyArse: "sex-1f-idle",
			animKeyChest: "sex-1f-idle",
			animKeyMouth: "sex-1f-idle",
			filters: {},
			vagina: {
				state: "",
				npc: "",
			},
			anus: {
				state: "",
				npc: "",
			},
			penis: {
				type: "",
				size: 1,
				state: "",
				npc: "",
				condom: false,
				concealed: false,
			},
			mouth: {
				state: "",
				npc: "",
			},
			chastity: false,
		};
	}

	/**
	 *
	 * @param {CloseOptions} options
	 * @returns {CloseOptions}
	 */
	static mapCloseOptions(options) {
		// Set position
		options.position = CombatRenderer.getPosition(V.position);

		// Set directory for images
		options.root = "img/sex";
		options.src = `${options.root}/close/`;

		options.filters = options.filters || {
			worn: {},
		};

		// Show Conditions
		options.showPenis = (V.player.penisExist || playerHasStrapon()) && V.worn.under_lower.vagina_exposed === 1 && V.worn.lower.vagina_exposed === 1;
		options.showVagina = V.player.vaginaExist && V.worn.under_lower.vagina_exposed === 1 && V.worn.lower.vagina_exposed === 1;
		options.showChest = combat.isChestActive() || ((V.worn.under_upper.exposed ?? 0) >= 1 && (V.worn.upper.exposed ?? 0) >= 2);
		options.showArse = V.worn.under_lower.anus_exposed === 1 && V.worn.lower.anus_exposed === 1;
		options.showMouth = combat.isMouthActive() && !V.worn.face.type.includes("gag");

		// Genitals
		const penisType = V.player.sex === "f" ? "parasite" : V.player.ballsExist ? "penis" : "herm";
		options.penis = {
			type: penisType,
			size: 1,
			state: options.penis.state || "",
			npc: options.penis.npc ?? null,
			condom: V.player.condom && !playerChastity() && options.penis.size === 1,
			concealed: playerChastity("hidden") && !playerHasStrapon(),
		};

		if (options.showArse) {
			CloseCombatMapper.mapClosePenetrators("anus", options);
		}
		if (V.player.vaginaExist) {
			CloseCombatMapper.mapClosePenetrators("vagina", options);
		}
		if (options.showMouth) {
			CloseCombatMapper.mapClosePenetrators("mouth", options);
		}
		if (V.player.penisExist || playerHasStrapon()) {
			CloseCombatMapper.mapClosePenis(options);
		}
		if (options.showChest) {
			CloseCombatMapper.mapCloseChest(options);
		}

		// Chastity
		/** @type {Record<string, string>} */
		const chastityTypes = {
			"chastity belt": "belt",
			"gold chastity belt": "belt-gold",
			"chastity parasite": `parasite-${V.player.penissize}`,
			"flat chastity cage": "flat",
			"small chastity cage": "small",
		};
		const chastityDevice = playerChastity() ? chastityTypes[V.worn.genitals.name] || "base" : false;
		options.chastity = `chastity-${chastityDevice}`;
		if (playerChastity("cage") && !playerHasStrapon()) {
			if (V.worn.genitals.name === "chastity parasite") options.penis.concealed = true;
			else options.chastity = `chastity-cage-${chastityDevice}`;
			options.penis.size = `chastity-${chastityDevice}`;
		}

		// Colours
		// @ts-ignore
		CombatRenderer.generateBodyFilters(options);

		options.pbhairColour = (V.makeup.pbcolour || V.naturalhaircolour).replace(" ", "");
		options.filters.pbhair = CombatRenderer.lookupColour(setup.colours.hair_map, options.pbhairColour, "pbhair", "pbhair_custom", "pbhair");
		options.filters.hirsute = CombatRenderer.getTransformationFilter("wolf", "pubes");

		if (V.player.condom) {
			options.condomColour = V.player.condom.colour || "red";
			options.filters.condom = CombatRenderer.lookupColour(setup.colours.condom_map, options.condomColour, "condom", "condom_custom", "condom");
		}

		// @ts-ignore
		PlayerCombatMapper.mapPcToClothingOptions(V.player, options);
		options.parasitePanties = options.parasitePanties || "red";
		if (["parasite", "parasitem"].includes(V.parasite.clit.name) || ["parasite"].includes(V.parasite.penis.name)) {
			options.filters.parasitePanties = CombatRenderer.lookupColour(
				setup.colours.clothes_map,
				options.parasitePanties,
				"parasitePanties",
				undefined,
				undefined
			);
		}

		// Set animation speed
		const framesChest = combat.isChestActive("close") ? (V.player.breastsize >= 8 && V.options.topdownBreastjob ? 10 : 6) : 1;
		options.animKeyChest = `sex-${framesChest}f-${combat.isChestActive("close") ? CloseCombatMapper.getCloseAnimationSpeed() : "idle"}`;

		options.animKeyVagina = `${combat.isVaginaActive("close") ? CloseCombatMapper.getCloseAnimation() : "sex-1f-idle"}`;
		options.animKeyArse = `${combat.isAnusActive("close") ? CloseCombatMapper.getCloseAnimation() : "sex-1f-idle"}`;
		options.animKeyPenis = `${combat.isPenisActive("close") ? CloseCombatMapper.getCloseAnimation() : "sex-1f-idle"}`;
		options.animKeyMouth = `${combat.isMouthActive("close") ? CloseCombatMapper.getCloseAnimation() : "sex-1f-idle"}`;

		return options;
	}

	/**
	 * @param {ClosePenetratorSlot} slot
	 * @param {CloseOptions} options
	 */
	static mapClosePenetrators(slot, options) {
		// Defensive: V.active_enemy / V.NPCList entry can be missing when penetrator state is inconsistent
		const enemyIndex = V.active_enemy;
		const enemyObj = Array.isArray(V.NPCList) && typeof enemyIndex === "number" ? V.NPCList[enemyIndex] : null;

		const activeEnemy = enemyObj?.type || V.enemytype || "npc";

		const npc = ["horse", "centaur"].includes(activeEnemy)
			? "horse"
			: ["beast", "machine", "tentacles"].includes(V.enemytype)
			? V.enemytype
			: "npc";

		const slotState = slot === "anus" ? String(V.anusstate ?? "") : slot === "vagina" ? String(V.vaginastate ?? "") : String(V.mouthstate ?? "");
		const slotUse = slot === "anus" ? String(V.anususe ?? "") : slot === "vagina" ? String(V.vaginause ?? "") : String(V.mouthuse ?? "");

		const chastity =
			(playerChastity("hidden") || V.worn.genitals.name === "chastity parasite") &&
			slot === "vagina" &&
			!["horse", "machine"].includes(npc);

		options[slot] = { state: "", npc: null };

		/* check $anusstate, $vaginastate, or $mouthstate */
		switch (slotState) {
			case "tentacle":
			case "tentacledeep":
			case "tentacleentrance":
			case "tentacleimminent":
				/* tentacle penetrating, or preparing to penetrate, anus/vagina */
				options[slot].state = chastity ? "chastity" : ["tentacle", "tentacledeep"].includes(slotState) ? "penetrated" : "entrance";
				options[slot].npc = "tentacle";
				break;
			case "entrance":
			case "imminent":
			case "penetrated":
				/* other enemy types penetrating, or preparing to penetrate, anus/vagina */
				options[slot].state = chastity ? "chastity" : ["penetrated", "doublepenetrated"].includes(slotState) ? "penetrated" : "entrance";
				options[slot].npc = npc;
				break;
			case "doublepenetrated":
				options[slot].state = chastity ? "chastity" : "penetrated";
				/* futureproofing, in case we ever add the ability to get dped by non-humans */
				options[slot].npc = `dp-top-${npc}`;
				options[slot].npc2 = `dp-bottom-${npc}`;
				break;
			case "othermouth":
			case "othermouthentrance":
			case "othermouthimminent":
				/* beast oral. worst naming convention ever. */
				if (V.enemytype === "beast" && V.monster !== 1) {
					options[slot].state = slotState === "othermouth" ? "penetrated" : "entrance";
					options[slot].npc = "beast-oral";
				} else {
					/* if monsterperson, no beast sprites; anus or vagina is not actively in use */
					options[slot].state = "entrance";
					options[slot].npc = null;
				}
				break;
			default:
				/* anus, vagina, or mouth is not actively in use */
				options[slot].state = "entrance";
				options[slot].npc = null;
		}

		if (slot === "vagina") {
			/* match drippy cum sprites to corresponding vagina state */
			const entrance = ["entrance", "doubleentrance", "tentacleentrance", "imminent"].includes(String(V.vaginastate)) ? "entrance" : "vagina";
			options[slot].cumState = options.vagina.state === "penetrated" ? "penetrated" : entrance;
			/* hirsute pubes */
			options[slot].hirsute =
				!["hidden", "disabled"].includes(V.transformationParts.wolf.pubes) || !["hidden", "disabled"].includes(V.transformationParts.bird.pubes);
		}

		/* colour filters and silhouettes for enemies interacting with vagina/anus */
		if (!["horse", "beast-oral", "machine", "tentacle"].includes(options[slot].npc || "")) {
			if (options[slot].state === "penetrated" || slotUse === "othervagina") {
				options[slot].silhouette = slotUse === "othervagina" ? "trib" : slotState === "doublepenetrated" ? "dp" : "solo";
			}
		}
		/* tentacle colour could theoretically be outside of these functions, as tentacles are incompatible with other enemy types and can only have one colour, which applies to all tentacles interacting with vagina, anus, and penis slots. combat rework should allow for tentacles to be incorporated into other encounters and multiple tentacle colours (vines and roots, for example) */
		if (options[slot].npc === "tentacle") {
			const tentacleColour = V.tentacleColour || "tentacles-purple";
			options.filters[`${slot}Tentacle`] = CombatRenderer.lookupColour(setup.colours.tentacle_map, tentacleColour, "tentacle", undefined, undefined);
		} else {
			if (options[slot].npc) {
				const targetIndex = slot === "anus" ? V.anustarget : slot === "vagina" ? V.vaginatarget : V.mouthtarget;
				const targetNpc = typeof targetIndex === "number" && Array.isArray(V.NPCList) ? V.NPCList[targetIndex] : null;

				/* filters for npc targeting vagina/anus */
				if (targetNpc && !["horse", "beast-oral", "machine"].includes(options[slot].npc || "")) {
					options.filters[`${slot}Npc`] = NpcCombatMapper.getNpcPenetratorFilter(targetNpc);
					options.filters[`${slot}Condom`] = CombatRenderer.getCondomOptions(targetNpc.condom).colour;
				}
			}
			// Ensure filters object exists before writing into it
			options.filters = options.filters || {};
			if (options[slot].npc2) {
				const idx2 = slot === "anus" ? V.anusdoubletarget : slot === "vagina" ? V.vaginadoubletarget : null;
				const targetNpc2 = typeof idx2 === "number" && Array.isArray(V.NPCList) ? V.NPCList[idx2] : null;

				// If the "double target" doesn't exist, the DP state is invalid -> treat as single
				if (!targetNpc2) {
					delete options[slot].npc2;

					// Prevent downstream logic from thinking this is DP
					if (slotState === "doublepenetrated") {
						if (slot === "anus") V.anusstate = "penetrated";
						else if (slot === "vagina") V.vaginastate = "penetrated";
					}
				} else {
					/* filters for npc double-penetrating vagina/anus */
					options.filters[`${slot}Npc2`] = NpcCombatMapper.getNpcPenetratorFilter(targetNpc2);
					options.filters[`${slot}Condom2`] = CombatRenderer.getCondomOptions(targetNpc2?.condom).colour;
				}
			}
		}
	}

	/**
	 * @param {CloseOptions} options
	 * @returns {ClosePenisStateOptions}
	 */
	static mapClosePenis(options) {
		const penisType = V.player.sex === "f" ? "parasite" : V.player.ballsExist ? "penis" : "herm";
		const activeNpc = typeof V.active_enemy === "number" ? V.NPCList[V.active_enemy] : null;
		options.penis.type = penisType;
		options.penis.condom = V.player.condom && !playerChastity();
		options.penis.concealed = playerChastity("hidden") && !playerHasStrapon();

		if (playerHasStrapon()) {
			const strapon = setup.sextoys.find(strap => strap.name === (V.worn.under_lower.name || "strap-on"));
			if (!strapon) throw new Error("no strap-on found in setup.sextoys");
			options.penis.type = `strapon-${strapon.shape?.replace(/\s/g, "-")}`;
			options.penis.size = strapon.size;
		}

		/* npc targeting player penis */
		switch (V.penisstate) {
			case "tentacle":
			case "tentacledeep":
			case "tentacleentrance":
			case "tentacleimminent":
				/* penis penetrating, or preparing to penetrate, tentussy */
				options.penis.state = playerChastity() ? "chastity" : ["tentacle", "tentacledeep"].includes(V.penisstate) ? "penetrated" : "entrance";
				options.penis.npc = "tentacle";
				break;
			case "entrance":
			case "imminent":
			case "otheranusimminent":
			case "otheranusentrance":
				/* penis preparing to penetrate npc */
				options.penis.state = "entrance";
				options.penis.npc = V.enemytype === "beast" && (V.monster !== 1 || activeNpc?.type === "centaur") ? "beast" : "npc";
				break;
			case "penetrated":
			case "otheranus":
				/* penis penetrating npc */
				options.penis.state = "penetrated";
				options.penis.npc = V.enemytype === "beast" && (V.monster !== 1 || activeNpc?.type === "centaur") ? "beast" : "npc";
				break;
			case "othermouth":
			case "othermouthentrance":
			case "othermouthimminent":
				/* penis penetrating beast mouth */
				if (V.enemytype === "beast" && !(V.monster === 1)) {
					options.penis.state = V.penisstate === "othermouth" ? "penetrated" : V.penisstate === "othermouthimminent" ? "imminent" : "entrance";
					options.penis.npc = "beast-oral";
				} else {
					/* if monsterperson, no beast sprites. no oral sprites */
					options.penis.state = "entrance";
					options.penis.npc = null;
				}
				break;
			default:
				/* penis is not actively in use */
				options.penis.state = "entrance";
				options.penis.npc = null;
		}

		if (options.penis.npc === "tentacle") {
			const tentacleColour = V.tentacleColour || "tentacles-purple";
			options.filters.penisTentacle = CombatRenderer.lookupColour(setup.colours.tentacle_map, tentacleColour, "penisTentacle", undefined, undefined);
		}
		const penisTarget = typeof V.penistarget === "number" ? V.NPCList[V.penistarget] : null;
		if (penisTarget) {
			/* skin colour of npc targeting penis */
			options.penis.npcTone = /** @type {SkinColours} */ (
				penisTarget.skincolour === "ghost" ? "ghost" : penisTarget.skincolour === "black" ? "dark" : "light"
			);
			options.filters.penisNpc = setup.colours.getSkinFilter(options.penis.npcTone, 0);
		}

		return options.penis;
	}

	/**
	 * @param {CloseOptions} options
	 */
	static mapCloseChest(options) {
		const chestTarget = typeof V.chesttarget === "number" ? V.chesttarget : null;
		const breastsNpc = chestTarget == null ? null : V.NPCList[chestTarget];
		const topdown = V.player.breastsize >= 8 && ["penis", "tentacle"].includes(V.chestuse.toString()) && V.options.topdownBreastjob;
		options.chest = {
			base: ["penis", "tentacle"].includes(V.chestuse.toString()) ? (topdown ? "topdown-job" : "base-job") : V.player.breastsize,
			breasts: V.player.breastsize,
			npc: topdown ? "penis-topdown" : V.enemytype === "beast" ? "beast" : V.chestuse.toString(),
		};

		if (options.chest.npc === "tentacle") {
			const tentacleColour = V.tentacleColour || "tentacles-purple";
			options.filters.chestTentacle = CombatRenderer.lookupColour(setup.colours.tentacle_map, tentacleColour, "chestTentacle", undefined, undefined);
		}
		if (breastsNpc) {
			options.filters.chestNpc = NpcCombatMapper.getNpcSkinFilter(breastsNpc);
			options.filters.breastsCondom = CombatRenderer.getCondomOptions(breastsNpc.condom);
		}
	}

	/**
	 * @returns {string}
	 */
	static getCloseAnimation() {
		const speed = CloseCombatMapper.getCloseAnimationSpeed();
		if (combat.isRapid()) {
			return "sex-6f-vfast";
		}
		return `sex-6f-${speed}`;
	}

	/**
	 * @returns {string}
	 */
	static getCloseAnimationSpeed() {
		if (T.crOverrides?.animSpeed) {
			return T.crOverrides.animSpeed;
		}
		if (combat.isRapid()) {
			return "vfast";
		}
		if (V.enemytype === "machine") {
			switch (V.machine?.speed) {
				case 1:
					return "slow";
				case 2:
					return "fast";
				case 3:
					return "vfast";
				default:
					return "vfast";
			}
		} else {
			if (T.knotted || T.knotted_short) return "mid";
			if (closeMapperEnemyPleasure() >= (closeMapperEnemyPleasureMax() / 5) * 4) return "vfast";
			if (closeMapperEnemyPleasure() >= (closeMapperEnemyPleasureMax() / 5) * 3) return "fast";
			if (closeMapperEnemyPleasure() >= (closeMapperEnemyPleasureMax() / 5) * 1) return "mid";
			return "slow";
		}
	}
}
window.CloseCombatMapper = CloseCombatMapper;
