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

	static partActive(transformation, part) {
		const value = V.transformationParts?.[transformation]?.[part];
		return value !== undefined && value !== "disabled" && value !== "hidden";
	}

	static hasWings() {
		return ["angel", "fallenAngel", "demon", "bird", "okami", "seraphim"].some(transformation => this.partActive(transformation, "wings"));
	}

	static hasFlightWings() {
		return ["bird", "seraphim"].some(transformation => this.partActive(transformation, "wings"));
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
			default:
				return false;
		}
	}

	static get levelDefinitions() {
		return {
			wolf: { value: V.wolfgirl, parts: { ears: 4, cheeks: 5, tail: 6 }, chimeras: ["okami"], full: 6 },
			cat: { value: V.cat, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			cow: { value: V.cow, parts: { horns: 2, ears: 4, tail: 6 }, chimeras: [], full: 6 },
			bear: { value: V.bear, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			bird: { value: V.harpy, parts: { eyes: 2, malar: 2, tail: 4, plumage: 4, wings: 6 }, chimeras: ["seraphim"], full: 6 },
			fox: { value: V.fox, parts: { ears: 4, cheeks: 5, tail: 6 }, chimeras: ["kitsune"], full: 6 },
			bunny: { value: V.bunny, parts: { ears: 4, tail: 6 }, chimeras: [], full: 6 },
			angel: { value: V.angel, parts: { halo: 4, wings: 6 }, chimeras: ["seraphim", "kitsune", "okami", "ryuujin"], full: 6 },
			fallen: { value: V.fallenangel, partKey: "fallenAngel", parts: { halo: 2, wings: 2 }, chimeras: [], full: 4 },
			demon: { value: V.demon, parts: { horns: 2, tail: 4, wings: 6 }, chimeras: ["bakunawa"], full: 6 },
			waterdragon: { value: V.waterdragon, parts: { horns: 2, ears: 4, tail: 7 }, chimeras: ["bakunawa", "ryuujin"], full: 7 },
		};
	}

	static effectiveLevel(name) {
		const definitions = this.levelDefinitions;
		const definition = definitions[name];
		if (!definition) return 0;
		let level = Number(definition.value) || 0;
		for (const [part, requiredLevel] of Object.entries(definition.parts)) {
			if (this.partActive(definition.partKey || name, part)) level = Math.max(level, requiredLevel);
		}
		if (name === "fallen" && ["fallenplus", "classicfallenplus"].includes(V.transformationParts?.fallenAngel?.wings)) level = Math.max(level, 4);
		if (definition.chimeras.some(chimera => this.chimeraActive(chimera))) level = Math.max(level, definition.full);
		return level;
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
			bird: ["seraphim"],
			fox: ["kitsune"],
			bunny: [],
			angel: ["seraphim", "kitsune", "okami", "ryuujin"],
			demon: ["bakunawa"],
			waterdragon: ["bakunawa", "ryuujin"],
		};
		const definition = builds[name];
		if (!definition) return 0;
		/* Demon build alone gates force impregnation (see actions-vagina/penis/anus.twee),
		so a visible demon part must keep it at full even after a genome dump clears $demonbuild,
		matching how effectiveLevel() already treats those parts as a completed demon. */
		if (name === "demon") {
			const levelDefinition = this.levelDefinitions.demon;
			const partsFull = Object.keys(levelDefinition.parts).some(part => this.partActive("demon", part));
			if (partsFull) return Math.max(Number(definition.value) || 0, definition.full);
		}
		if (sources[name].some(chimera => this.chimeraActive(chimera))) {
			return Math.max(Number(definition.value) || 0, definition.full);
		}
		return Number(definition.value) || 0;
	}

	static canBanish() {
		return this.effectiveLevel("angel") >= 4 && V.angelBanish >= 1;
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
	 * @param id
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
	 * @param id
	 */
	static descriptionComboLabel(id) {
		const phrase = this.descriptionPhrase(id);
		if (!phrase) return "";
		return `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
	}

	/**
	 * Capitalised phrase for the mirror listbox, e.g. "Hellhound", "Fallen cat". "" if not a combo.
	 *
	 * @param id
	 */
	static descriptionComboMenuLabel(id) {
		const phrase = this.descriptionPhrase(id);
		if (!phrase) return "";
		return phrase.charAt(0).toUpperCase() + phrase.slice(1);
	}
}

window.Transformations = Transformations;
window.effectiveTransformationLevel = name => Transformations.effectiveLevel(name);
window.effectiveTransformationBuild = name => Transformations.effectiveBuild(name);
window.canAngelBanish = () => Transformations.canBanish();
