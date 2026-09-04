/**
 * @typedef TransformationDefault
 * @property {{ h: number, s: number, l: number }} colour
 */

class Transformations {
	/** @returns {Readonly<Partial<Record<TransformationKeys, TransformationDefault>>>} */
	static get defaults() {
		return Object.freeze({
			demon: {
				colour: { h: 275, s: 100, l: 30 },
			},
		});
	}

	static get colourableAnimalParts() {
		return Object.freeze({
			wolf: ["ears", "tail", "cheeks", "pits", "pubes"],
			cat: ["ears", "tail"],
			cow: ["horns", "ears", "tail"],
			bird: ["wings", "tail", "malar", "plumage", "pubes"],
			fox: ["ears", "tail", "cheeks"],
			bunny: ["ears", "tail"],
			bear: ["ears", "tail", "plumage", "pubes"],
			waterdragon: ["horns", "ears", "tail"],
		});
	}

	static partActive(transformation, part) {
		const value = V.transformationParts?.[transformation]?.[part];
		return value !== undefined && value !== "disabled" && value !== "hidden";
	}

	static hasWings() {
		return ["angel", "fallenAngel", "demon", "bird", "okami", "seraphim"].some(transformation => this.partActive(transformation, "wings"));
	}

	/* Wings that look the part but have no bird lineage behind them, so they can't fly unaided.
	Okami wings are stored under the chimera rather than under angel, so they must be listed separately. */
	static hasDivineWings() {
		return ["angel", "fallenAngel", "demon", "okami"].some(transformation => this.partActive(transformation, "wings"));
	}

	static hasGwylanStrengthenedWings() {
		return this.hasDivineWings() && V.gwylan?.wingStrength > Time.date.timeStamp;
	}

	static hasNaturalFlightWings() {
		return ["bird", "seraphim"].some(transformation => this.partActive(transformation, "wings"));
	}

	static hasFlightWings() {
		return this.hasNaturalFlightWings() || this.hasGwylanStrengthenedWings();
	}

	static chimeraActive(name) {
		const anyPart = (transformation, parts) => parts.some(part => this.partActive(transformation, part));
		switch (name) {
			case "seraphim":
				return anyPart("seraphim", ["wings", "plumage", "eyes"]);
			case "kitsune":
				return anyPart("kitsune", ["ears", "tail", "cheeks", "misc"]);
			case "okami":
				return anyPart("okami", ["ears", "tail", "wings", "misc"]);
			case "bakunawa":
				return !!(
					(V.chimera?.bakunawa?.tail && this.partActive("waterdragon", "tail") && this.partActive("demon", "tail")) ||
					(V.chimera?.bakunawa?.horns && this.partActive("waterdragon", "horns") && this.partActive("demon", "horns")) ||
					(V.chimera?.bakunawa?.ears && this.partActive("waterdragon", "ears") && anyPart("demon", ["horns", "tail", "wings"]))
				);
			case "ryuujin":
				return !!(
					(V.chimera?.ryuujin?.tail && this.partActive("waterdragon", "tail") && anyPart("angel", ["halo", "wings"])) ||
					(V.chimera?.ryuujin?.horns && this.partActive("waterdragon", "horns") && anyPart("angel", ["halo", "wings"])) ||
					(V.chimera?.ryuujin?.halo && this.partActive("angel", "halo") && anyPart("waterdragon", ["horns", "ears", "tail"]))
				);
			case "melusine":
				return !!(
					(V.chimera?.melusine?.ears && this.partActive("waterdragon", "ears") && anyPart("angel", ["halo", "wings"]) && this.partActive("bird", "wings")) ||
					(V.chimera?.melusine?.horns && this.partActive("waterdragon", "horns") && anyPart("angel", ["halo", "wings"]) && this.partActive("bird", "wings")) ||
					(V.chimera?.melusine?.tail && this.partActive("waterdragon", "tail") && anyPart("angel", ["halo", "wings"]) && this.partActive("bird", "wings")) ||
					(V.chimera?.melusine?.halo &&
						this.partActive("angel", "halo") &&
						anyPart("waterdragon", ["horns", "ears", "tail"]) &&
						this.partActive("bird", "wings")) ||
					(V.chimera?.melusine?.wings &&
						this.partActive("bird", "wings") &&
						anyPart("angel", ["halo", "wings"]) &&
						anyPart("waterdragon", ["horns", "ears", "tail"]))
				);
			default:
				return false;
		}
	}

	/**
	 * Defining parts per chimera. A chimera showing only a minor cosmetic part (seraphim eyes,
	 * kitsune cheeks, okami markings) still counts as present for the mirror and for dialogue,
	 * but it is not a completed transformation, so it must not grant full level or build.
	 * Chimeras absent from this list already require a combination of defining parts.
	 */
	static get chimeraMajorParts() {
		return {
			seraphim: ["wings"],
			kitsune: ["ears", "tail"],
			okami: ["ears", "tail", "wings"],
		};
	}

	/* True when the chimera is present *and* shows a defining part, i.e. it counts as a full transformation. */
	static chimeraFull(name) {
		if (!this.chimeraActive(name)) return false;
		const major = this.chimeraMajorParts[name];
		if (!major) return true;
		return major.some(part => this.partActive(name, part));
	}

	static get levelDefinitions() {
		return {
			wolf: { value: V.wolfgirl, parts: { ears: 4, cheeks: 5, tail: 6 }, chimeras: ["okami"], full: 6 },
			cat: { value: V.cat, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			cow: { value: V.cow, parts: { horns: 2, ears: 4, tail: 6 }, chimeras: [], full: 6 },
			bear: { value: V.bear, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			bird: { value: V.harpy, parts: { eyes: 2, malar: 2, tail: 4, plumage: 4, wings: 6 }, chimeras: ["seraphim", "melusine"], full: 6 },
			fox: { value: V.fox, parts: { ears: 4, cheeks: 5, tail: 6 }, chimeras: ["kitsune"], full: 6 },
			bunny: { value: V.bunny, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			angel: { value: V.angel, parts: { halo: 4, wings: 6 }, chimeras: ["seraphim", "kitsune", "okami", "ryuujin", "melusine"], full: 6 },
			fallen: { value: V.fallenangel, partKey: "fallenAngel", parts: { halo: 2, wings: 2 }, chimeras: [], full: 4 },
			demon: { value: V.demon, parts: { horns: 2, tail: 4, wings: 6 }, chimeras: ["bakunawa"], full: 6 },
			waterdragon: { value: V.waterdragon, parts: { horns: 2, ears: 4, tail: 7 }, chimeras: ["bakunawa", "ryuujin", "melusine"], full: 7 },
		};
	}

	static baseLevel(name) {
		const definitions = this.levelDefinitions;
		const definition = definitions[name];
		if (!definition) return 0;
		let level = Number(definition.value) || 0;
		for (const [part, requiredLevel] of Object.entries(definition.parts)) {
			if (this.partActive(definition.partKey || name, part)) level = Math.max(level, requiredLevel);
		}
		if (name === "fallen" && ["fallenplus", "classicfallenplus"].includes(V.transformationParts?.fallenAngel?.wings)) level = Math.max(level, 4);
		if (definition.chimeras.some(chimera => this.chimeraFull(chimera))) level = Math.max(level, definition.full);
		return level;
	}

	static effectiveLevel(name) {
		if (!["demon", "fallen", "angel"].includes(name)) return this.baseLevel(name);
		for (const transformation of ["demon", "fallen", "angel"]) {
			const level = this.baseLevel(transformation);
			if (level >= (transformation === "fallen" ? 2 : 1)) return transformation === name ? level : 0;
		}
		return 0;
	}

	static effectiveBuild(name) {
		const builds = {
			wolf: { value: V.wolfbuild, full: 100 },
			cat: { value: V.catbuild, full: 100 },
			cow: { value: V.cowbuild, full: 100 },
			bear: { value: V.bearbuild, full: 100 },
			bird: { value: V.birdbuild, full: 100 },
			fox: { value: V.foxbuild, full: 100 },
			bunny: { value: V.bunnybuild, full: 100 },
			angel: { value: V.angelbuild, full: 50 },
			demon: { value: V.demonbuild, full: 30 },
			waterdragon: { value: V.waterdragonbuild, full: 100 },
		};
		const sources = {
			wolf: ["okami"],
			cat: [],
			cow: [],
			bear: [],
			bird: ["seraphim", "melusine"],
			fox: ["kitsune"],
			bunny: [],
			angel: ["seraphim", "kitsune", "okami", "ryuujin", "melusine"],
			demon: ["bakunawa"],
			waterdragon: ["bakunawa", "ryuujin", "melusine"],
		};
		const definition = builds[name];
		if (!definition) return 0;
		if (name === "angel" && (this.effectiveLevel("demon") >= 1 || this.effectiveLevel("fallen") >= 2)) return 0;
		/* Visible parts keep the transformation active after a genome reset.
		Multiple sources are combined so chimera forms do not lower the result. */
		let floor = 0;
		/* Demon build gates force impregnation as a single threshold, so any visible demon part restores it in full. */
		if (name === "demon" && Object.keys(this.levelDefinitions.demon.parts).some(part => this.partActive("demon", part))) {
			floor = definition.full;
		}
		/* This prevents Banish getting stuck at 0/0 when these parts are kept or restored. */
		if (name === "angel") {
			for (const [part, build] of Object.entries({ halo: 10, wings: 50 })) {
				if (this.partActive("angel", part)) floor = Math.max(floor, build);
			}
		}
		if (sources[name].some(chimera => this.chimeraFull(chimera))) floor = Math.max(floor, definition.full);
		return Math.max(Number(definition.value) || 0, floor);
	}

	static canBanish() {
		return this.effectiveLevel("angel") >= 4 && V.angelBanish >= 1;
	}

	/* --- Real water dragon body -------------------------------------------------------
	   effectiveLevel("waterdragon") reaches 7 from a visible part alone, because the level table maps the tail to 7.
	   That is right for anything the world can see (NPC reactions, nicknames, the mirror) but wrong for the reproductive system.
	   $waterdragonCosmeticUnlocked survives a genome dump, so a PC with zero transformation points can switch the horns, ears
	   and tail back on in the mirror as pure cosmetics, and an imported save can arrive with a part value this build does not recognise.
	   
	   Either way the PC would start producing eggs, and a plain human birth would be hijacked by the nesting instinct at the hospital.
	   Egg laying, dragon labour and the nest therefore key off this instead: the parts must be
	   backed by current transformation progress. $waterdragontf is not used here because old genome dumps could leave
	   that hidden flag set after manifestation reached zero ($waterdragon 6 grows the tail, 7 sets $waterdragontf). */
	static isFullWaterDragon() {
		if (this.effectiveLevel("waterdragon") < 7) return false;
		return (Number(V.waterdragon) || 0) >= 6;
	}

	/* --- Egg laying / dragon labour lockout -------------------------------------------
	The egg cycle pauses when the player is in a scene or location they cannot freely leave, including:
	* Flashbacks, dreams, visions, replays, the hopeless cycle, or other temporary states.
	* Soft bad ends where the player is being held.
	* The asylum, prison, island, and pirate ship, which have their own locked event chains.
	This prevents the egg event from triggering at the wrong time or accidentally removing existing eggs.
	Harper's lab is the exception. Its egg timer continues because the lab handles egg growth and laying through its own events.
	*/
	static waterDragonLayingBlocked() {
		if (V.statFreeze || V.frozenValues || V.replayScene || V.hc) return true;
		if (V.waterDragonLab && V.waterDragonLab.active) return false;
		/* Match checkLabour's guard so wake events don't interrupt active scenes before cleanup. */
		if (V.combat === 1 || V.possessed || V.NPCList?.[0]?.type) return true;
		if (["asylum", "prison", "island", "pirate_ship"].includes(V.location)) return true;
		const lastBadEnd = Array.isArray(V.badEndStats) ? V.badEndStats.last() : undefined;
		return !!(lastBadEnd && !lastBadEnd.trackedEnd);
	}

	/* --- Unfertilised egg cycle ---------------------------------------------------
	Starts a new egg cycle. Accelerated Brood Cycle shortens the wait and gives a better egg-count roll.
	Water Dragons usually lay one egg, sometimes two, and rarely three. */
	static rollWaterDragonEggCycle() {
		const fast = !!V.waterDragonIncubatorTrait;
		const roll = () => (typeof rollLitterSize === "function" ? rollLitterSize("waterdragon") : 1);
		const count = fast ? Math.max(roll(), roll()) : roll();
		return { count, daysTillLaying: fast ? random(12, 18) : random(23, 30) };
	}

	/* Number of full days the eggs are overdue. 0 if they are not due yet.
	daysTillLaying already counts below zero, so no extra value is needed. */
	static waterDragonEggsOverdueDays() {
		const eggs = V.waterDragonEggs;
		if (!eggs || !Number.isFinite(Number(eggs.daysTillLaying))) return 0;
		return Math.max(0, -Number(eggs.daysTillLaying));
	}

	/* After this many overdue days, the player lays the eggs wherever they sleep instead of waiting for the nest. */
	static get waterDragonEggsOverdueLimit() {
		return 3;
	}

	static waterDragonEggsOverdue() {
		return this.waterDragonEggsOverdueDays() >= this.waterDragonEggsOverdueLimit;
	}

	/* --- Bakunawa blood moon resonance ------------------------------------------------
	   The bakunawa is the moon-devouring serpent, so the chimera only stirs while the moon runs red.
	   $forcedBloodmoon is included so scripted blood moons (the wraith nightmare) count like the real thing,
	   matching how the sidebar and road icons decide to show the blood moon. */
	static get bakunawaBloodMoonDamageBonus() {
		return 0.15;
	}

	static bakunawaResonant() {
		if (!this.chimeraActive("bakunawa")) return false;
		return !!(V.forcedBloodmoon || Time.isBloodMoon());
	}

	static bakunawaDamageMultiplier() {
		return this.bakunawaResonant() ? 1 + this.bakunawaBloodMoonDamageBonus : 1;
	}

	/* --- Description (mirror "Described as") helpers ---------------------------------
	   Combination descriptions come in two shapes, matching the automatic <<characteristics>> title:
	   - Special named chimeras whose name already implies the celestial half, so they take NO adjective:
	  	 hellhound (wolf + demon/fallen), dog (wolf + angel), jackalope (bunny + demon), moon rabbit (bunny + angel).
	     Stored as the bare keys "hellhound"/"dog"/"jackalope"/"moonrabbit".
	   - Generic animal + celestial blends, e.g. "fallen cat", "demonic fox". Stored as "<animal>+<celestial>". */

	static get descriptionSpecialNames() {
		return { hellhound: "hellhound", dog: "dog", jackalope: "jackalope", moonrabbit: "moon rabbit" };
	}

	static descriptionAnimalNoun(animal) {
		switch (animal) {
			case "cow":
				return V.player?.gender_appearance === "m" ? "bull" : "cow";
			case "harpy":
				return V.hallucinations >= 2 || !V.settings?.bestialityEnabled ? "harpy" : "bird";
			case "waterdragon":
				return "water dragon";
			default:
				return animal; // cat, fox, bear
		}
	}

	/**
	    Noun phrase for a description key without an article, e.g. "hellhound", "fallen cat".
	    Returns "" when the key is a plain single-species description (handled elsewhere).
	 *
	 * @param {string} id Transformation description key.
	 */
	static descriptionPhrase(id) {
		if (typeof id !== "string") return "";
		if (this.descriptionSpecialNames[id]) return this.descriptionSpecialNames[id];
		if (!id.includes("+")) return "";
		const [animal, celestial] = id.split("+");
		const adjective = { angel: "angelic", fallen: "fallen", demon: "demonic" }[celestial];
		const noun = this.descriptionAnimalNoun(animal);
		return adjective ? `${adjective} ${noun}` : noun;
	}

	/**
	 * Full phrase with article for body text, e.g. "a hellhound", "a fallen cat". "" if not a combo.
	 *
	 * @param {string} id Transformation description key.
	 */
	static descriptionComboLabel(id) {
		const phrase = this.descriptionPhrase(id);
		if (!phrase) return "";
		return `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
	}

	/**
	 * Capitalised phrase for the mirror listbox, e.g. "Hellhound", "Fallen cat". "" if not a combo.
	 *
	 * @param {string} id Transformation description key.
	 */
	static descriptionComboMenuLabel(id) {
		const phrase = this.descriptionPhrase(id);
		if (!phrase) return "";
		return phrase.charAt(0).toUpperCase() + phrase.slice(1);
	}
}

window.Transformations = Transformations;
window.effectiveTransformationLevel = name => Transformations.effectiveLevel(name);
window.isFullWaterDragon = () => Transformations.isFullWaterDragon();
window.effectiveTransformationBuild = name => Transformations.effectiveBuild(name);
window.canAngelBanish = () => Transformations.canBanish();
