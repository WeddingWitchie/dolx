/* Pure, versioned fragrance model. Measures are fictional game units, not chemistry. */
(() => {
	"use strict";
	const materials = {
		// family, intensity, volatility, persistence, affinity, sweetness, freshness, earthiness, human, wildlife
		red_rose: ["floral", 1.2, 0.5, 0.6, "heart", 0.6, 0.3, 0.1, 0.8, 0.2],
		white_rose: ["floral", 0.8, 0.6, 0.5, "heart", 0.3, 0.7, 0.1, 0.7, 0.1],
		orchid: ["floral", 1.4, 0.3, 0.8, "base", 0.5, 0.1, 0.5, 0.8, 0.3],
		daisy: ["green", 0.6, 0.8, 0.2, "top", 0.1, 0.9, 0.3, 0.3, -0.2],
		tulip: ["green", 0.9, 0.6, 0.4, "heart", 0.1, 0.7, 0.4, 0.3, -0.2],
		lotus: ["floral", 0.8, 0.4, 0.7, "heart", 0.3, 0.8, 0.2, 0.7, -0.1],
		lily: ["floral", 1.7, 0.5, 0.7, "heart", 0.4, 0.3, 0.2, 0.9, 0.4],
		orange: ["citrus", 1.1, 0.9, 0.2, "top", 0.7, 0.8, 0, 0.6, 0.3],
		lemon: ["citrus", 1.3, 1, 0.15, "top", 0.1, 1, 0, 0.5, -0.4],
		apple: ["fruit", 0.7, 0.8, 0.3, "top", 0.7, 0.6, 0.1, 0.5, 0.6],
		peach: ["fruit", 1, 0.7, 0.4, "heart", 0.9, 0.3, 0.1, 0.7, 0.7],
		wild_honeycomb: ["sweet", 1.5, 0.2, 0.9, "base", 1, 0, 0.3, 0.6, 1],
		truffle: ["earthy", 1.9, 0.15, 1, "base", 0, 0, 1, -0.5, 0.9],
		plumeria: ["floral", 1.3, 0.4, 0.8, "base", 0.8, 0.3, 0.2, 0.8, 0.4],
	};
	const ingredients = Object.fromEntries(
		Object.entries(materials).map(([id, d]) => [
			id,
			{
				family: d[0],
				intensity: d[1],
				volatility: d[2],
				persistence: d[3],
				affinity: d[4],
				sweet: d[5],
				fresh: d[6],
				earth: d[7],
				human: d[8],
				animal: d[9],
			},
		])
	);
	const solvents = {
		soft: { name: "Soft perfumer's spirit", purity: 0.45, projection: 0.8, evaporation: 0.75, cost: 20 },
		clear: { name: "Clear perfumer's spirit", purity: 0.75, projection: 1.1, evaporation: 1, cost: 30 },
		bright: { name: "Bright perfumer's spirit", purity: 0.95, projection: 1.35, evaporation: 1.3, cost: 40 },
	};
	const layers = ["top", "heart", "base"];
	const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
	const copy = x => JSON.parse(JSON.stringify(x));
	function material(id) {
		return Object.hasOwn(ingredients, id) ? ingredients[id] : setup.perfumeryExtraction?.resolve(id)?.properties;
	}
	function source(id) {
		return id.startsWith("aroma~") ? id.split("~")[1] : id;
	}
	function name(id) {
		const base = setup.foodstuff[source(id)]?.name || source(id);
		if (!id.startsWith("aroma~")) return base;
		const p = setup.perfumeryExtraction.resolve(id);
		return `${base}: ${p.selected.slice(0, 2).join(" / ")} (${p.finish})`;
	}
	function validate(f) {
		if (
			!f ||
			f.version !== 1 ||
			!Object.keys(solvents).includes(f.solvent) ||
			![20, 40, 60].includes(f.capacity) ||
			!Number.isFinite(f.concentration) ||
			f.concentration < 10 ||
			f.concentration > 40 ||
			![0, 1, 3, 7, 14].includes(f.age)
		)
			throw new Error("Invalid liquid formulation.");
		const needed = {};
		for (const layer of layers) {
			if (!f[layer] || typeof f[layer] !== "object" || Array.isArray(f[layer])) throw new Error("Missing note layer.");
			for (const [id, n] of Object.entries(f[layer])) {
				if (!material(id) || !Number.isInteger(n) || n < 1 || n > 24) throw new Error("Invalid fragrance material quantity.");
				needed[id] = (needed[id] || 0) + n;
			}
		}
		const units = Object.values(needed).reduce((a, b) => a + b, 0);
		/* Empty notes are allowed: the imbalance term in calculate() already makes one- or two-note perfumes less balanced. */
		if (!units) throw new Error("Add at least one material.");
		const volume = (units * 100) / f.concentration;
		if (volume > f.capacity + 0.00001) throw new Error("This formula exceeds the bottle capacity. Remove material or raise concentration.");
		return { needed, units, volume, solvent: Math.ceil(volume - units) };
	}
	function compatibility(a, b) {
		if (a === b) return 0.95;
		const pair = [a, b].sort().join("/");
		return (
			{
				"citrus/floral": 0.95,
				"floral/green": 0.9,
				"floral/sweet": 0.85,
				"fruit/sweet": 0.9,
				"citrus/green": 0.9,
				"earthy/green": 0.85,
				"earthy/fruit": 0.25,
				"citrus/earthy": 0.35,
				"earthy/floral": 0.45,
			}[pair] ?? 0.7
		);
	}
	function contribution(id, layer, quantity, d = material(id)) {
		return quantity * d.intensity * (layer === "top" ? 0.75 + d.volatility * 0.5 : layer === "base" ? 0.75 + d.persistence * 0.5 : 1);
	}
	function calculate(f, blending = 0.5, age = f.age, identityVersion = 2, overrides = {}) {
		const cost = validate(f);
		const s = solvents[f.solvent];
		const totals = { sweet: 0, fresh: 0, earth: 0, human: 0, animal: 0, persistence: 0, volatility: 0 };
		const family = {};
		const layerWeights = {};
		const entries = [];
		let weight = 0;
		let affinity = 0;
		for (const layer of layers) {
			layerWeights[layer] = 0;
			for (const [id, n] of Object.entries(f[layer]).sort(([a], [b]) => a.localeCompare(b))) {
				const d = overrides[id] || material(id);
				// Top placement projects volatile materials; base placement retains heavy ones.
				const w = contribution(id, layer, n, d);
				weight += w;
				layerWeights[layer] += w;
				affinity += w * (d.affinity === layer ? 1 : 0.65);
				for (const [f, share] of Object.entries(d.families || { [d.family]: 1 })) family[f] = (family[f] || 0) + w * share;
				for (const key of Object.keys(totals)) totals[key] += w * d[key];
				totals.persistence += w * (layer === "base" ? 0.25 : layer === "top" ? -0.15 : 0);
				totals.volatility += w * (layer === "top" ? 0.2 : layer === "base" ? -0.1 : 0);
				for (const [f, share] of Object.entries(d.families || { [d.family]: 1 })) entries.push({ family: f, w: w * share });
			}
		}
		for (const key of Object.keys(totals)) totals[key] /= weight;
		let harmony = 0;
		let pairs = 0;
		for (let i = 0; i < entries.length; i++)
			for (let j = i + 1; j < entries.length; j++) {
				const w = entries[i].w * entries[j].w;
				harmony += w * compatibility(entries[i].family, entries[j].family);
				pairs += w;
			}
		harmony = pairs ? harmony / pairs : 0.9;
		const idealAge = 1 + totals.persistence * 6 + totals.earth * 3;
		const maturation = (1 - Math.exp(-age / idealAge)) * 12 - Math.max(0, age - idealAge) * totals.fresh * 1.4;
		const imbalance = layers.reduce((sum, l) => sum + Math.abs(layerWeights[l] / weight - 1 / 3), 0);
		const harsh = (Math.max(0, f.concentration - 23) * s.purity * (0.3 + totals.volatility)) / (1 + age / 3);
		const quality = clamp(30 + harmony * 30 + (affinity / weight) * 12 - imbalance * 10 - harsh + maturation + clamp(blending, 0, 1) * 12, 0, 100);
		const intensity = (((weight / cost.units) * f.concentration) / 20) * s.projection * (1 + totals.volatility * 0.15);
		const duration = clamp(((70 + totals.persistence * 210) * (0.6 + f.concentration / 30)) / s.evaporation, 45, 720);
		const families = Object.keys(family).sort((a, b) => family[b] - family[a]);
		const result = {
			...totals,
			family: families[0],
			families,
			quality,
			intensity,
			duration,
			harmony,
			idealAge,
			development: Object.fromEntries(layers.map(l => [l, layerWeights[l] / weight])),
			romance: clamp(((totals.human * quality) / 100) * (1 - Math.max(0, intensity - 1.8) / 3), 0, 1),
			attention: clamp(intensity * (0.25 + totals.sweet * 0.35 + (100 - quality) / 200), 0, 2),
			concealment: clamp(totals.fresh * 0.5 + totals.earth * 0.6 - totals.sweet * 0.7, -1, 1),
			applications: Math.max(1, Math.floor(cost.volume / 4)),
			volume: cost.volume,
			colour: `hsl(${Math.round(35 + totals.fresh * 70 - totals.sweet * 25)}, 48%, ${Math.round(42 + totals.fresh * 15)}%)`,
			name: `${families[0][0].toUpperCase() + families[0].slice(1)} ${totals.fresh > totals.sweet ? "Murmur" : "Embrace"}`,
		};
		if (!setup.perfumeryIdentity) return result;
		const identity = setup.perfumeryIdentity.analyze(f, result, blending, age, overrides);
		return {
			...result,
			...identity,
			identityVersion,
			name: identityVersion === 1 ? result.name : identity.name,
			romance: identityVersion === 1 ? result.romance : identity.socialAppeal,
			attention:
				identityVersion === 1
					? result.attention
					: clamp(result.intensity * (0.25 + identity.distinctiveness / 150 + (100 - identity.pleasantness) / 250), 0, 2),
		};
	}
	function blendStep(f, stage, technique) {
		if (!Number.isInteger(stage) || stage < 0 || stage > 2 || !["fold", "circle", "rest"].includes(technique))
			throw new Error("Choose a blending technique for this stage.");
		const p = calculate(f);
		const spirit = solvents[f.solvent];
		const fit =
			technique === "fold"
				? p.volatility * 0.25 + (stage === 0 ? 0.16 : 0) - p.earth * 0.08
				: technique === "circle"
				? p.persistence * 0.22 + p.earth * 0.12 + (stage === 1 ? 0.16 : 0)
				: p.persistence * 0.12 + spirit.purity * 0.08 + (stage === 2 ? 0.2 : 0);
		const score = clamp(0.48 + fit - Math.max(0, p.intensity - 2) * 0.04, 0.35, 0.95);
		let text;
		if (technique === "fold") {
			if (p.volatility > 0.6) {
				text = "You mix the ingredients gently. You can still smell the lighter scents clearly.";
			} else {
				text = "You mix the ingredients gently, but some of the heavier ingredients are not blending very well.";
			}
		} else if (technique === "circle") {
			if (p.persistence > 0.55) {
				text = "You stir the mixture in circles. The scents that last longer are still easy to notice.";
			} else {
				text = "You stir the mixture in circles, but the lighter ingredients were already mixing well. Stirring more doesn't seem to change much.";
			}
		} else if (stage === 2) {
			text = "You stop mixing for a moment. The small bubbles have disappeared, and you can smell the stronger scents more clearly.";
		} else {
			text = "You stop mixing for a moment. You can smell some of the ingredients separately, but they haven't completely blended together yet.";
		}
		return { score, text };
	}
	setup.perfumeryModel = {
		material,
		source,
		name,
		ingredients,
		solvents,
		layers,
		calculate,
		validate,
		copy,
		clamp,
		compatibility,
		contribution,
		blendStep,
		empty: () => ({ version: 1, top: {}, heart: {}, base: {}, solvent: "clear", concentration: 30, capacity: 40, age: 1 }),
	};
})();

/* Sensory model v2. Extraction v1 and its material properties remain unchanged. */
(() => {
	"use strict";
	const vectors = {
		petal: { floral: 1, powdery: 0.25 },
		leaf: { green: 1, herbal: 0.4, bitter: 0.25 },
		pollen: { powdery: 0.8, musky: 0.45, floral: 0.5 },
		peel: { citrus: 1, bitter: 0.5, sour: 0.4 },
		juice: { fruity: 1, sour: 0.25, aquatic: 0.2 },
		jam: { fruity: 0.8, sweet: 0.8, amber: 0.2 },
		butter: { creamy: 1, gourmand: 0.6, greasy: 0.5 },
		crumb: { gourmand: 0.8, woody: 0.3, stale: 0.3 },
		caramel: { sweet: 1, amber: 0.6, gourmand: 0.7 },
		cocoa: { roasted: 1, bitter: 0.6, woody: 0.4 },
		spice: { spicy: 1, herbal: 0.6, resinous: 0.4, medicinal: 0.35 },
		root: { earthy: 1, woody: 0.65, musty: 0.4 },
		umami: { savoury: 1, musky: 0.25, sweaty: 0.35, decaying: 0.3 },
		sharp: { sulfurous: 1, pungent: 0.8, acrid: 0.3, metallic: 0.25 },
		ferment: { fermented: 1, sour: 0.6, rancid: 0.4, moldy: 0.25 },
		toast: { roasted: 0.8, smoky: 0.6, bitter: 0.25, burnt: 0.35 },
	};
	const familyVectors = { fruit: "fruity", bakery: "gourmand", sulphurous: "sulfurous" };
	const negative = {
		sour: 0.4,
		bitter: 0.25,
		fermented: 0.65,
		musty: 0.55,
		moldy: 1,
		rancid: 1,
		greasy: 0.5,
		burnt: 0.65,
		acrid: 0.85,
		medicinal: 0.35,
		metallic: 0.4,
		sulfurous: 1,
		sweaty: 0.8,
		stale: 0.65,
		overpowering: 0.7,
		muddy: 0.6,
		decaying: 1,
		pungent: 0.6,
	};
	const nouns = {
		floral: ["Blossom", "Petals", "Bouquet", "Bloom"],
		fruity: ["Orchard", "Harvest", "Nectar"],
		citrus: ["Grove", "Zest", "Sunrise"],
		green: ["Garden", "Meadow", "Fern"],
		herbal: ["Herbarium", "Leaves", "Thicket"],
		aquatic: ["Lagoon", "Rain", "Tide"],
		woody: ["Woods", "Bark", "Timber"],
		earthy: ["Cellar", "Loam", "Forest"],
		resinous: ["Resin", "Incense", "Balsam"],
		spicy: ["Spice", "Ember", "Pepper"],
		powdery: ["Veil", "Silk", "Dust"],
		musky: ["Musk", "Velvet", "Skin"],
		amber: ["Amber", "Lantern", "Dusk"],
		sweet: ["Sugar", "Honey", "Confection"],
		creamy: ["Cream", "Ivory", "Butter"],
		gourmand: ["Pantry", "Pastry", "Hearth"],
		roasted: ["Toast", "Cocoa", "Grain"],
		smoky: ["Smoke", "Ash", "Cinder"],
		savoury: ["Supper", "Broth", "Harvest"],
	};
	const adjectives = {
		sour: "Sour",
		bitter: "Bitter",
		fermented: "Fermented",
		musty: "Damp",
		moldy: "Mouldering",
		rancid: "Rancid",
		greasy: "Oily",
		burnt: "Scorched",
		acrid: "Acrid",
		medicinal: "Medicinal",
		metallic: "Iron",
		sulfurous: "Sulfurous",
		sweaty: "Salted",
		stale: "Forgotten",
		overpowering: "Unbridled",
		muddy: "Clouded",
		decaying: "Decaying",
		pungent: "Sharp",
		floral: "Velvet",
		fruity: "Orchard",
		citrus: "Sunlit",
		green: "Rainwashed",
		herbal: "Wild",
		aquatic: "Tidal",
		woody: "Evening",
		earthy: "Woodland",
		resinous: "Midnight",
		spicy: "Warm",
		powdery: "Silken",
		musky: "Intimate",
		amber: "Golden",
		sweet: "Honeyed",
		creamy: "Soft",
		gourmand: "Buttered",
		roasted: "Toasted",
		smoky: "Ashen",
		savoury: "Strange",
		"fresh floral": "Dewlit",
	};
	const descriptors = [...Object.keys(nouns), ...Object.keys(negative), "fresh floral"];
	function canonical(f) {
		return JSON.stringify([
			f.version,
			...["top", "heart", "base"].map(l => Object.entries(f[l]).sort(([a], [b]) => a.localeCompare(b))),
			f.solvent,
			f.concentration,
			f.capacity,
			f.age,
		]);
	}
	function hash(text) {
		let h = 2166136261;
		for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
		return h >>> 0;
	}
	function fingerprint(f, blending = 0.5) {
		const key = canonical(f) + ":" + Math.round(blending * 10000);
		return `p2-${hash(key).toString(36)}-${hash(key.split("").reverse().join("")).toString(36)}`;
	}
	function materialVector(id, override) {
		const m = setup.perfumeryModel;
		const d = override || m.material(id);
		const source = m.source(id);
		const category = setup.foodstuff?.[source]?.category;
		const v = {};
		const purity = d.purity ?? 0.85;
		const stability = d.stability ?? 0.8;
		if (id.startsWith("aroma~")) {
			const p = setup.perfumeryExtraction.profile(id);
			const puzzle = setup.perfumeryExtraction.puzzle(p.source);
			let sum = 0;
			puzzle.forEach((facet, i) => {
				if (!(p.mask & (1 << i))) return;
				const w = facet.intensity * (p.method === "capture" ? 0.5 + facet.volatility : p.method === "deep" ? 0.5 + facet.persistence : 1);
				sum += w;
				for (const [k, n] of Object.entries(vectors[facet.name])) v[k] = (v[k] || 0) + n * w;
			});
			for (const k of Object.keys(v)) v[k] /= sum;
			if (p.finish === "purity") for (const k of Object.keys(negative)) if (v[k]) v[k] *= 0.55;
		} else {
			v[familyVectors[d.family] || d.family] = 1;
			v.powdery = category === "flower" ? d.persistence * 0.4 : 0;
			v.woody = d.earth * 0.65;
			v.musky = d.persistence * d.earth * 0.35;
			if (category === "mushroom") {
				v.musty = 0.5;
				v.earthy = 1;
			}
		}
		// Source character remains even after separation, without turning every food into fruit.
		if (category === "vegetable") {
			v.green = (v.green || 0) + 0.2;
			v.pungent = (v.sulfurous || 0) * 0.4;
		}
		if (category === "mushroom") {
			v.musty = (v.musty || 0) + 0.2;
			v.earthy = (v.earthy || 0) + 0.2;
		}
		if (["meat", "seafood"].includes(category)) {
			v.savoury = (v.savoury || 0) + 0.3;
			v.metallic = (v.metallic || 0) + 0.15;
		}
		if (["lotus", "bog_orchid", "marsh_saxifrage"].includes(source)) v.aquatic = (v.aquatic || 0) + 0.5;
		if (source === "scottish_bog_myrtle") v.resinous = (v.resinous || 0) + 0.6;
		return { vector: v, purity, stability };
	}
	function analyze(f, p, blending, age, overrides = {}) {
		const m = setup.perfumeryModel;
		const scores = {};
		const phase = {};
		const contributions = [];
		let total = 0;
		let purity = 0;
		let stability = 0;
		let crowded = 0;
		for (const layer of m.layers) {
			const local = {};
			const items = Object.entries(f[layer]).sort(([a], [b]) => a.localeCompare(b));
			let subtotal = 0;
			crowded += Math.max(0, items.filter(([id]) => m.material(id).intensity > 1).length - 2);
			for (const [id, quantity] of items) {
				const d = materialVector(id, overrides[id]);
				const w = m.contribution(id, layer, quantity, overrides[id]);
				total += w;
				subtotal += w;
				purity += d.purity * w;
				stability += d.stability * w;
				contributions.push({ id, layer, quantity, weight: w, purity: d.purity, stability: d.stability });
				for (const [k, n] of Object.entries(d.vector)) {
					scores[k] = (scores[k] || 0) + n * w;
					local[k] = (local[k] || 0) + n * w;
				}
			}
			phase[layer] = subtotal ? Object.fromEntries(Object.entries(local).map(([k, n]) => [k, n / subtotal])) : {};
		}
		for (const k of Object.keys(scores)) scores[k] /= total;
		purity /= total;
		stability /= total;
		const defects = [];
		const add = (name, n, cause) => {
			n = m.clamp(n, 0, 1);
			if (n > 0.08) {
				scores[name] = (scores[name] || 0) + n;
				const layer = ["acrid", "sour", "overpowering", "pungent"].includes(name) ? "top" : ["muddy", "medicinal"].includes(name) ? "heart" : "base";
				phase[layer][name] = (phase[layer][name] || 0) + n;
				defects.push({ name, severity: n, cause });
			}
		};
		const harshness = ((Math.max(0, f.concentration - 23) / 17) * m.solvents[f.solvent].purity * (0.4 + p.volatility)) / (1 + age / 4);
		const decay = (Math.max(0, age - p.idealAge) / 9) * (1 - stability);
		add("overpowering", Math.max(0, p.intensity - 2.2) * 0.4, "The perfume is too strong, making it difficult to smell the lighter scents.");
		add("acrid", harshness * 0.65, "The perfume smells unpleasantly sharp when you first smell it.");
		add(
			"muddy",
			crowded * 0.12 + Math.max(0, 0.7 - p.harmony) * 0.7 + (1 - blending) * (1 - stability) * 0.5,
			"Too many strong smells are mixed together, making it difficult to tell them apart."
		);
		add(
			"stale",
			decay + (scores.stale || 0) * (1 - stability),
			"Some ingredients lose their smell too quickly, or the perfume has been left unused for too long. It no longer smells fresh."
		);
		add(
			"rancid",
			(scores.greasy || 0) * ((scores.fermented || 0) + decay) * 2,
			"Oily and fermented smells mix together, making the perfume smell like spoiled food."
		);
		add(
			"moldy",
			(scores.musty || 0) * ((scores.fermented || 0) + decay) * 1.6,
			"The perfume develops an unpleasant smell similar to damp clothes that have been left wet for too long."
		);
		add(
			"decaying",
			(scores.savoury || 0) * ((scores.fermented || 0) + decay) * 1.5,
			"Some ingredients mix together and make the perfume smell like rotting food."
		);
		add(
			"burnt",
			(scores.roasted || 0) * harshness * 0.8 + (scores.burnt || 0) * Math.max(0, p.intensity - 1),
			"The roasted smell becomes too strong, making the perfume smell like something that has been burned."
		);
		add(
			"medicinal",
			(scores.herbal || 0) * ((scores.bitter || 0) + harshness) * 0.6,
			"The strong, bitter smell of the herbs makes the perfume smell like medicine."
		);
		add("sour", (scores.sour || 0) * (1 - purity) + (scores.fermented || 0) * 0.3, "The sour smell becomes too strong and covers the sweeter smells.");
		add("pungent", (scores.sulfurous || 0) * p.intensity * 0.35, "A strong smell similar to rotten eggs makes the perfume unpleasant.");
		if ((scores.floral || 0) > 0.25 && p.fresh > 0.3) scores["fresh floral"] = scores.floral * p.fresh;
		const penalty = Object.entries(negative).reduce((sum, [k, n]) => sum + (scores[k] || 0) * n, 0);
		const pleasantness = m.clamp(77 + p.human * 14 + p.harmony * 8 - penalty * 58 - harshness * 12, 0, 100);
		const distinctive = m.clamp(15 + penalty * 30 + Object.values(scores).filter(n => n > 0.15).length * 4 + (1 - p.harmony) * 20, 0, 100);
		const stable = m.clamp(stability * 0.65 + blending * 0.25 + Math.min(age / p.idealAge, 1) * 0.1 - decay * 0.15, 0, 1);
		const ranked = Object.keys(scores)
			.filter(k => scores[k] > 0.12)
			.sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
		const conventional = ranked.filter(k => !Object.hasOwn(negative, k));
		const challenging = ranked.filter(k => Object.hasOwn(negative, k));
		const dominant = conventional[0] || ranked[0] || p.family;
		const secondary = conventional[1] || dominant;
		const mainDefect = challenging.find(k => scores[k] > 0.32);
		const simulationOnly = Object.keys(overrides).length > 0;
		const fp =
			fingerprint(f, blending) +
			(simulationOnly ? `-simulation-${hash(JSON.stringify(Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b))))}` : "");
		const h = hash(fp);
		const noun = nouns[dominant] || ["Accord", "Trail", "Study"];
		const generatedName = `${adjectives[mainDefect || secondary] || "Strange"} ${noun[h % noun.length]}`;
		const phaseText = (layer, label) => {
			const keys = Object.keys(phase[layer])
				.filter(k => phase[layer][k] > 0.16)
				.sort((a, b) => phase[layer][b] - phase[layer][a])
				.slice(0, 3);
			return `${label}: ${keys.join(", ") || dominant}`;
		};
		const phases = { opening: phaseText("top", "Opening"), heart: phaseText("heart", "Heart"), drydown: phaseText("base", "Base") };
		const phasePleasantness = Object.fromEntries(
			Object.entries(phase).map(([layer, vector]) => [
				layer,
				/* An empty note smells of whatever is still there, so it borrows the whole perfume's pleasantness. */
				!Object.keys(vector).length
					? pleasantness
					: m.clamp(77 + p.human * 14 + p.harmony * 8 - Object.entries(negative).reduce((sum, [k, n]) => sum + (vector[k] || 0) * n, 0) * 58, 0, 100),
			])
		);
		for (const k of Object.keys(negative))
			if ((scores[k] || 0) > 0.3 && !defects.some(n => n.name === k)) {
				const sources = contributions.filter(c => (materialVector(c.id).vector[k] || 0) > 0.2).map(c => m.source(c.id));
				defects.push({
					name: k,
					severity: m.clamp(scores[k], 0, 1),
					cause: `The ${k} parts you kept from ${[...new Set(sources)].join(", ") || "your accords"} are still noticeable.`,
				});
			}
		const sensory = {
			bitter: "There is a bitter smell mixed with the sweeter scents.",
			fermented: "It smells a little like overripe fruit or alcohol.",
			musty: "There is a damp, earthy smell, like wet soil or old clothes.",
			greasy: "The perfume has a heavy, oily smell that makes the lighter scents harder to notice.",
			metallic: "There is a faint smell of metal, similar to coins.",
			sulfurous: "There is an unpleasant smell, similar to rotten eggs.",
			sweaty: "After a while, the perfume starts to smell like sweat.",
			sour: "There is a sour smell mixed with the sweeter scents.",
			acrid: "The first smell is very sharp and unpleasant, almost enough to make your nose sting.",
			rancid: "There is an unpleasant smell, like cooking oil that has gone bad.",
			moldy: "The perfume smells damp and old, like food that has started growing mold.",
			decaying: "There is a smell similar to rotting food, which becomes stronger over time.",
			burnt: "The roasted ingredients leave behind a burnt smell.",
			medicinal: "The perfume smells like herbs and medicine, with a little bitterness.",
			overpowering: "One smell is so strong that you can barely notice the others.",
			muddy: "Several strong smells mix together, making it difficult to tell them apart.",
			stale: "After the first scents fade, the perfume starts to smell like old grain or cereal.",
			pungent: "The smell is very strong, and people can notice it even when they aren't close to you.",
		};
		const join = text => text.slice(text.indexOf(":") + 2).replace(/, ([^,]+)$/, " and $1");
		const description = `A ${p.intensity > 2.3 ? "far-reaching" : p.intensity < 1 ? "close" : "clear"} ${join(phases.opening)} opening gives way to ${join(
			phases.heart
		)}, while ${join(phases.drydown)} stays underneath. ${
			defects.length
				? sensory[defects.sort((a, b) => b.severity - a.severity)[0].name]
				: stable > 0.7
				? "It changes smoothly from one note to the next."
				: "The impression shifts as the lighter material fades."
		}`;
		return {
			identityVersion: 2,
			simulationOnly,
			fingerprint: fp,
			name: generatedName,
			dominant,
			secondary,
			nuances: ranked.slice(0, 8),
			descriptorStrengths: scores,
			familyStrengths: Object.fromEntries(conventional.map(k => [k, scores[k]])),
			phases,
			phasePleasantness,
			phaseStrengths: phase,
			description,
			offNotes: defects,
			technicalQuality: p.quality,
			pleasantness,
			distinctiveness: distinctive,
			stability: stable,
			extractionPurity: purity,
			socialAppeal: m.clamp((pleasantness / 100) * (0.4 + p.human * 0.6) - Math.max(0, p.intensity - 2) * 0.2, 0, 1),
			contributions,
		};
	}
	setup.perfumeryIdentity = { analyze, canonical, fingerprint, hash, materialVector, descriptors, negative };
})();
