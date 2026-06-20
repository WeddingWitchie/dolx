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

	static effectiveLevel(name) {
		const definitions = {
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
		return sources[name].some(chimera => this.chimeraActive(chimera)) ? Math.max(Number(definition.value) || 0, definition.full) : Number(definition.value) || 0;
	}

	static canBanish() {
		return this.effectiveLevel("angel") >= 4 && V.angelBanish >= 1;
	}
}

window.Transformations = Transformations;
window.effectiveTransformationLevel = name => Transformations.effectiveLevel(name);
window.effectiveTransformationBuild = name => Transformations.effectiveBuild(name);
window.canAngelBanish = () => Transformations.canBanish();
