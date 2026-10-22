/* globals V, C */
(() => {
	"use strict";
	let abort;
	let mountedHost;
	const m = () => setup.perfumeryModel;
	const e = () => setup.perfumeryExtraction;
	const a = () => setup.perfumery;
	const presetSources = {
		"Balanced floral": ["red_rose", "white_rose", "orchid"],
		"Fresh citrus": ["lemon", "daisy", "lotus"],
		"Rich gourmand": ["choc_chip_cookie", "chocolate", "honey"],
		"Soft woody": ["scottish_bog_myrtle", "mushroom", "orchid"],
		"Sweet romantic": ["red_rose", "wild_honeycomb", "plumeria"],
		"Earthy mushroom": ["truffle", "mushroom", "hen_of_the_woods"],
		"Fermented fruit": ["white_wine", "jam", "red_wine"],
		"Strong savoury": ["beef", "cheese", "mushroom"],
		"Bitter medicinal": ["scottish_bog_myrtle", "lemon", "onion"],
		"Smoky resinous": ["cocoa_powder", "scottish_bog_myrtle", "chocolate"],
		Rancid: ["butter", "cheese", "cream"],
		Sour: ["white_wine", "lemon", "red_wine"],
		Musty: ["mushroom", "truffle", "hen_of_the_woods"],
		Burnt: ["choc_chip_cookie", "cocoa_powder", "chocolate"],
		Overpowering: ["lily", "lily", "lily"],
		"Conflicting accords": ["lemon", "truffle", "garlic_bulb"],
	};
	function preset(name) {
		if (!Object.hasOwn(presetSources, name)) throw new Error("Unknown testing preset.");
		const f = m().empty();
		f.age = ["Musty", "Rancid"].includes(name) ? 14 : 3;
		if (["Burnt", "Overpowering"].includes(name)) {
			f.concentration = 40;
			f.solvent = "bright";
			f.age = 0;
		}
		presetSources[name].forEach((source, i) => {
			let mask = 63;
			if (name === "Rich gourmand") mask = source === "choc_chip_cookie" ? 3 : 7;
			if (name === "Rancid") mask = source === "cheese" ? 5 : 17;
			if (name === "Musty") mask = source === "truffle" ? 17 : 19;
			if (name === "Burnt") mask = source === "choc_chip_cookie" ? 24 : 3;
			if (name === "Smoky resinous") mask = source === "scottish_bog_myrtle" ? 9 : 3;
			const key = e().calculate(source, "balanced", mask, "stability").key;
			f[m().layers[i]][key] = name === "Overpowering" ? 3 : 1;
		});
		return f;
	}
	function candidates(count, seed = 20261022) {
		if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error("Use 1–1000 candidates.");
		let state = seed >>> 0;
		const random = n => {
			state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
			return Math.floor((state / 4294967296) * n);
		};
		const ids = Object.keys(e().registry()).sort();
		const masks = Array.from({ length: 63 }, (_, i) => i + 1).filter(n => n.toString(2).replaceAll("0", "").length >= 2);
		const results = [];
		for (let i = 0; i < count; i++) {
			const f = m().empty();
			f.capacity = [40, 60][random(2)];
			f.concentration = [20, 25, 30, 35, 40][random(5)];
			f.solvent = ["soft", "clear", "bright"][random(3)];
			f.age = [0, 1, 3, 7, 14][random(5)];
			for (const layer of m().layers) {
				const source = ids[random(ids.length)];
				const methods = e().registry()[source].methods;
				const p = e().calculate(source, methods[random(methods.length)], masks[random(masks.length)], ["purity", "yield", "stability"][random(3)]);
				f[layer][p.key] = 1;
			}
			const layer = m().layers[random(3)];
			const key = Object.keys(f[layer])[0];
			f[layer][key] += random(3);
			results.push({ formula: f, blending: random(101) / 100 });
		}
		return results;
	}
	function accumulator() {
		const identities = new Set();
		const icons = new Set();
		const descriptions = {};
		const names = {};
		const families = {};
		const quality = {};
		const pleasantness = {};
		const defects = {};
		const reached = new Set();
		let unpleasant = 0;
		let unstable = 0;
		let excellentUnpleasant = 0;
		let imperfectAppealing = 0;
		let invalid = 0;
		let reproductionErrors = 0;
		const examples = [];
		let count = 0;
		return {
			add(sample) {
				count++;
				try {
					const p = m().calculate(sample.formula, sample.blending);
					const icon = setup.perfumeryIcons.descriptor(p.fingerprint, p);
					if (JSON.stringify(p) !== JSON.stringify(m().calculate(JSON.parse(JSON.stringify(sample.formula)), sample.blending))) reproductionErrors++;
					if ([p.quality, p.pleasantness, p.intensity, p.duration, p.stability, p.distinctiveness].some(n => !Number.isFinite(n))) invalid++;
					identities.add(JSON.stringify([p.dominant, p.secondary, p.nuances.slice(0, 4), p.phases]));
					icons.add(setup.perfumeryIcons.signature(icon));
					descriptions[p.description] = (descriptions[p.description] || 0) + 1;
					names[p.name] = (names[p.name] || 0) + 1;
					families[p.dominant] = (families[p.dominant] || 0) + 1;
					for (const [k, n] of Object.entries(p.descriptorStrengths)) if (n > 0.12) reached.add(k);
					for (const n of p.offNotes) defects[n.name] = (defects[n.name] || 0) + 1;
					const q = Math.floor(p.quality / 10) * 10;
					const pleasant = Math.floor(p.pleasantness / 10) * 10;
					quality[q] = (quality[q] || 0) + 1;
					pleasantness[pleasant] = (pleasantness[pleasant] || 0) + 1;
					if (p.pleasantness < 35) unpleasant++;
					if (p.stability < 0.5) unstable++;
					if (p.quality >= 75 && p.pleasantness < 35) excellentUnpleasant++;
					if (p.quality < 65 && p.pleasantness > 65) imperfectAppealing++;
					if (examples.length < 20)
						examples.push({
							name: p.name,
							profile: p.nuances,
							description: p.description,
							quality: p.quality,
							pleasantness: p.pleasantness,
							fingerprint: p.fingerprint,
							formula: sample.formula,
							blending: sample.blending,
						});
				} catch {
					invalid++;
				}
			},
			finish() {
				return {
					count,
					meaningfulIdentities: identities.size,
					uniqueNames: Object.keys(names).length,
					repeatedNames: Object.entries(names)
						.sort((a, b) => b[1] - a[1])
						.slice(0, 5),
					iconSignatures: icons.size,
					families,
					quality,
					pleasantness,
					defects,
					unpleasant,
					unstable,
					excellentUnpleasant,
					imperfectAppealing,
					invalid,
					reproductionErrors,
					unreachable: setup.perfumeryIdentity.descriptors.filter(k => !reached.has(k)),
					neverDominant: setup.perfumeryIdentity.descriptors.filter(k => !Object.hasOwn(setup.perfumeryIdentity.negative, k) && !families[k]),
					repeatedDescriptions: Object.entries(descriptions)
						.sort((a, b) => b[1] - a[1])
						.slice(0, 5),
					examples,
				};
			},
		};
	}
	function diagnostics(samples) {
		const d = accumulator();
		for (const sample of samples) d.add(sample);
		return d.finish();
	}
	function dispose() {
		abort?.abort();
		abort = null;
		if (mountedHost) {
			const overlay = mountedHost.closest("#debugOverlay");
			mountedHost.replaceChildren();
			mountedHost.classList.remove("perf-lab");
			if (overlay) setup.debugMenu.cacheDebugDiv.debugOverlay = overlay.outerHTML;
			mountedHost = null;
		}
	}
	function open(container) {
		if (V.debug !== 1) return;
		dispose();
		abort = new AbortController();
		const signal = abort.signal;
		const host = container.querySelector(".perf-lab-host");
		mountedHost = host;
		host.replaceChildren();
		host.classList.add("perf-lab");
		const el = (tag, text, parent = host) => {
			const n = document.createElement(tag);
			if (text !== undefined) n.textContent = text;
			parent.append(n);
			return n;
		};
		const button = (text, action, parent = host) => {
			const b = el("button", text, parent);
			b.type = "button";
			b.dataset.lab = action;
			return b;
		};
		const section = title => {
			const d = el("details");
			el("summary", title, d);
			return d;
		};
		const input = (label, value, type, parent, min, max) => {
			const l = el("label", label, parent);
			const n = el("input", undefined, l);
			n.type = type;
			n.value = value;
			if (min !== undefined) n.min = min;
			if (max !== undefined) n.max = max;
			n.step = type === "number" ? "any" : "1";
			return n;
		};
		const select = (label, entries, parent) => {
			const l = el("label", label, parent);
			const n = el("select", undefined, l);
			n.setAttribute("aria-label", label);
			for (const [key, text] of entries) {
				const o = el("option", text, n);
				o.value = key;
			}
			return n;
		};
		el("h3", "Perfumery laboratory");
		el("p", "Preview tools do not change your save. Buttons labelled Apply to save are deliberate mutations. Simulated candidates live only in this panel.");
		const status = el("p", "Ready.");
		status.setAttribute("role", "status");
		const overview = section("Overview (read only)");
		const s = V.perfumery;
		el(
			"pre",
			JSON.stringify(
				{
					schema: s?.version ?? "not initialized",
					identityModel: 2,
					skill: s?.skill ?? 0,
					lesson: s?.lesson ?? 0,
					advanced: s?.extraction?.lesson,
					session: s?.session,
					collaborations: s?.collaborations?.length ?? 0,
					gourmandCollaborationUnlocked: !!s?.extraction?.lesson?.complete,
					extractionProfiles: s?.extraction?.profiles.length ?? 0,
					extractMeasures: Object.values(s?.extraction?.stock || {}).reduce((a, b) => a + b, 0),
					bottles: s?.bottles.length ?? 0,
					formulas: s?.journal.length ?? 0,
					active: a().scent(),
					social: { Poppy: a().socialPreview("Poppy"), Robin: a().socialPreview("Robin") },
					wildlife: ["wolf", "boar", "bear"].map(k => [k, a().wildlife(k)]),
				},
				null,
				2
			),
			overview
		);
		const extraction = section("Ingredients and extraction");
		const source = select(
			"Source",
			Object.entries(setup.foodstuff).map(([id, item]) => [id, item.name]),
			extraction
		);
		const method = select(
			"Approach",
			Object.entries(e().methods).map(([id, p]) => [id, p.name]),
			extraction
		);
		const mask = input("Fragment mask (1–63; retain two or more)", 63, "number", extraction, 1, 63);
		const finish = select(
			"Finish",
			["purity", "yield", "stability"].map(k => [k, k]),
			extraction
		);
		const measures = input("Stock measures (0–240)", 12, "number", extraction, 0, 240);
		const purity = input("Isolated purity preview (0–1)", 0.8, "number", extraction, 0, 1);
		const stability = input("Isolated stability preview (0–1)", 0.8, "number", extraction, 0, 1);
		const yieldPreview = input("Isolated yield preview", 4, "number", extraction, 1, 6);
		button("Simulate extraction", "extractPreview", extraction);
		button("Apply to save: set extract stock", "stock", extraction);
		button("Apply to save: unlock Quick Extraction", "studies", extraction);
		button("Apply to save: reset this study", "resetStudy", extraction);
		const extractOutput = el("pre", "", extraction);
		const form = section("Formula generator and inspection");
		form.open = true;
		const presets = select(
			"Preset",
			Object.keys(presetSources).map(k => [k, k]),
			form
		);
		button("Load preset", "preset", form);
		const material = select(
			"Material",
			Object.keys(e().registry()).map(id => [id, setup.foodstuff[id].name]),
			form
		);
		const layer = select(
			"Note",
			m().layers.map(k => [k, k]),
			form
		);
		const quantity = input("Quantity", 1, "number", form, 1, 24);
		button("Add chosen extract to layer", "add", form);
		button("Add simulated extraction to selected note", "addExtract", form);
		button("Add isolated tuned extract to preview", "tunedExtract", form);
		button("Discard isolated tuning", "clearTuning", form);
		button("Clear layers", "clear", form);
		const solvent = select(
			"Solvent",
			Object.entries(m().solvents).map(([k, v]) => [k, v.name]),
			form
		);
		const concentration = input("Concentration", 30, "number", form, 10, 40);
		const capacity = select(
			"Capacity",
			[20, 40, 60].map(n => [String(n), String(n)]),
			form
		);
		const age = select(
			"Maturation days",
			[0, 1, 3, 7, 14].map(n => [String(n), String(n)]),
			form
		);
		const blending = input("Craftsmanship (0–1)", 0.7, "number", form, 0, 1);
		const raw = el("textarea", "", form);
		raw.setAttribute("aria-label", "Full editable formula JSON");
		raw.rows = 8;
		button("Read formula JSON", "parse", form);
		button("Preview formula", "preview", form);
		button("Increase a proportion", "variation", form);
		button("Pin comparison A", "pin", form);
		button("Compare A with current B", "compare", form);
		const owned = select("Owned perfume", [["", "Choose an owned bottle"], ...(s?.bottles || []).map(b => [String(b.id), b.name])], form);
		button("Inspect owned perfume", "owned", form);
		button("Apply to save: store matured preview bottle", "store", form);
		button("Apply to save: wear selected owned bottle", "wear", form);
		const visual = el("div", "", form);
		const inspection = el("pre", "", form);
		const effects = section("Gameplay effects (isolated preview or explicit action)");
		const elapsed = input("Simulated elapsed minutes / remaining duration", 30, "number", effects, 0, 720);
		button("Preview normal fading", "fade", effects);
		button("Preview rain fading", "rain", effects);
		button("Preview bathing removal", "bathPreview", effects);
		button("Apply to save: set remaining duration", "duration", effects);
		button("Apply to save: remove fragrance / wash", "wash", effects);
		button("Apply to save: advance scent only", "tick", effects);
		const effectOutput = el("pre", "", effects);
		const progression = section("Poppy progression (isolated test context)");
		const skill = input("Perfumery skill (0–100)", s?.skill || 0, "number", progression, 0, 100);
		button("Apply to save: set Perfumery skill", "skill", progression);
		button("Apply to save: unlock independent workstation", "workstation", progression);
		const lesson = select(
			"Completed lesson count",
			[0, 1, 2, 3, 4].map(n => [String(n), String(n)]),
			progression
		);
		button("Preview unlocks and Poppy reaction", "reaction", progression);
		button("Apply to save: set perfumery lessons", "lessons", progression);
		button("Reset isolated progression sandbox", "sandbox", progression);
		button("Apply to save: reset perfumery lessons only", "resetLessons", progression);
		const progressOutput = el("pre", "", progression);
		const stress = section("Seeded diagnostics and icon gallery");
		button("Generate 100 candidates / 50-icon gallery", "stress100", stress);
		button("Analyze 1,000 candidates (seed 20261022)", "stress1000", stress);
		button("Export diagnostic JSON", "export", stress);
		const reportOutput = el("pre", "", stress);
		const gallery = el("div", "", stress);
		gallery.className = "perf-gallery";
		let overrides = {};
		let formula = preset("Balanced floral");
		let pinned;
		let selectedBottle;
		let report;
		let busy = false;
		let sandbox = { lesson: s?.lesson || 0, advanced: m().copy(s?.extraction?.lesson || null) };
		function sync() {
			solvent.value = formula.solvent;
			concentration.value = formula.concentration;
			capacity.value = formula.capacity;
			age.value = formula.age;
			raw.value = JSON.stringify(formula, null, 2);
		}
		function current() {
			formula.solvent = solvent.value;
			formula.concentration = Number(concentration.value);
			formula.capacity = Number(capacity.value);
			formula.age = Number(age.value);
			const b = Number(blending.value);
			if (!Number.isFinite(b) || b < 0 || b > 1) throw new Error("Craftsmanship must be 0–1.");
			return m().calculate(formula, b, formula.age, overrides);
		}
		function preview() {
			const p = current();
			visual.replaceChildren(setup.perfumeryIcons.render(setup.perfumeryIcons.descriptor(p.fingerprint, p), p.name));
			inspection.textContent = JSON.stringify(
				{
					...p,
					formula,
					icon: setup.perfumeryIcons.descriptor(p.fingerprint, p),
					social: { Poppy: a().socialPreview("Poppy", p), Robin: a().socialPreview("Robin", p) },
				},
				null,
				2
			);
			raw.value = JSON.stringify(formula, null, 2);
			return p;
		}
		function extracted() {
			return e().calculate(source.value, method.value, Number(mask.value), finish.value);
		}
		host.addEventListener(
			"click",
			async event => {
				const action = event.target.closest("button[data-lab]")?.dataset.lab;
				if (!action || V.debug !== 1) return;
				try {
					if (action === "extractPreview") {
						const metadata = e().registry()[source.value];
						if (!metadata) {
							extractOutput.textContent = JSON.stringify(
								{
									source: source.value,
									supported: false,
									reason: e().excluded.has(source.value)
										? "Explicit scentless, weak, toxic, bodily or story-sensitive exclusion."
										: "No aromatic category, override or supported recipe source.",
								},
								null,
								2
							);
							return;
						}
						const p = extracted();
						const tuning = { purity: Number(purity.value), stability: Number(stability.value), yield: Number(yieldPreview.value) };
						if (
							Object.values(tuning).some(n => !Number.isFinite(n)) ||
							tuning.purity < 0 ||
							tuning.purity > 1 ||
							tuning.stability < 0 ||
							tuning.stability > 1 ||
							tuning.yield < 1 ||
							tuning.yield > 6
						)
							throw new Error("Use bounded isolated finishing values.");
						extractOutput.textContent = JSON.stringify(
							{
								metadata,
								suitability: Object.fromEntries(
									Object.keys(e().methods).map(k => [
										k,
										metadata.methods.includes(k)
											? ["purity", "yield", "stability"].map(finish => {
													const r = e().calculate(source.value, k, Number(mask.value), finish);
													return { finish, purity: r.purity, yield: r.yield, stability: r.stability, strength: r.strength };
											  })
											: "Not suitable: cooked food can only be captured or rebuilt.",
									])
								),
								facets: e().puzzle(source.value),
								actual: p,
								isolatedFinishing: {
									...tuning,
									strength: (p.strength * (0.7 + tuning.purity * 0.3)) / (0.7 + p.purity * 0.3),
									persistence: (p.properties.persistence * (0.7 + tuning.stability * 0.3)) / (0.7 + p.stability * 0.3),
									note: "Isolated numerical sensitivity preview. Stock actions use the reproducible actual profile above.",
								},
							},
							null,
							2
						);
					}
					if (action === "stock") a().debugAction("extract", extracted().key, Number(measures.value));
					if (["studies", "resetStudy"].includes(action)) a().debugAction("studies", extracted().key, action === "studies");
					if (action === "preset") {
						overrides = {};
						formula = preset(presets.value);
						selectedBottle = null;
						sync();
						preview();
					}
					if (action === "parse") {
						formula = JSON.parse(raw.value);
						m().validate(formula);
						sync();
						preview();
					}
					if (action === "add") {
						const key = e().calculate(material.value, "balanced", 63, "stability").key;
						formula[layer.value][key] = Number(quantity.value);
						sync();
						preview();
					}
					if (action === "addExtract") {
						formula[layer.value][extracted().key] = Number(quantity.value);
						sync();
						preview();
					}
					if (action === "clear") {
						overrides = {};
						formula = m().empty();
						sync();
						inspection.textContent = "Layers cleared. Add material to all three.";
					}
					if (action === "tunedExtract") {
						const p = extracted();
						const q = Number(purity.value);
						const stable = Number(stability.value);
						const yieldUnits = Number(yieldPreview.value);
						if (![q, stable, yieldUnits].every(Number.isFinite) || q < 0 || q > 1 || stable < 0 || stable > 1 || yieldUnits < 1 || yieldUnits > 6)
							throw new Error("Use bounded isolated finishing values.");
						overrides[p.key] = {
							...p.properties,
							purity: q,
							stability: stable,
							intensity: (p.strength * (0.7 + q * 0.3)) / (0.7 + p.purity * 0.3),
							persistence: (p.properties.persistence * (0.7 + stable * 0.3)) / (0.7 + p.stability * 0.3),
						};
						formula[layer.value][p.key] = Number(quantity.value);
						sync();
						preview();
						status.textContent = `Isolated tuning active (${yieldUnits} hypothetical measures). It changes the real calculation but cannot be stored as a reproducible bottle.`;
					}
					if (action === "clearTuning") {
						overrides = {};
						preview();
					}
					if (action === "preview") preview();
					if (action === "variation") {
						const l = layer.value;
						const id = Object.keys(formula[l])[0];
						if (!id) throw new Error("Add a material first.");
						formula[l][id]++;
						sync();
						preview();
					}
					if (action === "pin") {
						pinned = { formula: m().copy(formula), properties: current() };
						status.textContent = "Comparison A pinned in temporary memory.";
					}
					if (action === "compare") {
						if (!pinned) throw new Error("Pin comparison A first.");
						const p = current();
						inspection.textContent = JSON.stringify(
							{
								A: pinned.formula,
								B: formula,
								changedInputs: {
									notes: m().layers.filter(l => JSON.stringify(pinned.formula[l]) !== JSON.stringify(formula[l])),
									solvent: pinned.formula.solvent !== formula.solvent,
									concentration: pinned.formula.concentration !== formula.concentration,
									maturation: pinned.formula.age !== formula.age,
								},
								deltas: Object.fromEntries(
									["quality", "pleasantness", "intensity", "stability", "duration", "distinctiveness"].map(k => [k, p[k] - pinned.properties[k]])
								),
								ADescription: pinned.properties.description,
								BDescription: p.description,
							},
							null,
							2
						);
					}
					if (action === "owned") {
						selectedBottle = V.perfumery?.bottles.find(b => b.id === Number(owned.value));
						if (!selectedBottle) throw new Error("Select a bottle.");
						formula = m().copy(selectedBottle.formula);
						blending.value = selectedBottle.blending;
						sync();
						preview();
						visual.replaceChildren(setup.perfumeryIcons.render(setup.perfumeryIcons.forBottle(selectedBottle), selectedBottle.name));
						inspection.textContent = JSON.stringify(
							{ bottle: selectedBottle, actual: a().properties(selectedBottle), fallbackIcon: setup.perfumeryIcons.forBottle(selectedBottle) },
							null,
							2
						);
					}
					if (action === "store") {
						if (Object.keys(overrides).length) throw new Error("Discard isolated tuning before storing a reproducible bottle.");
						current();
						const b = a().debugAction("bottle", formula, Number(blending.value));
						b.made -= b.formula.age * 86400;
						const o = el("option", b.name, owned);
						o.value = String(b.id);
						owned.value = String(b.id);
						selectedBottle = b;
						status.textContent = "Preview bottle explicitly added to your save, matured for inspection.";
					}
					if (action === "wear") {
						if (!selectedBottle) throw new Error("Inspect an owned bottle first.");
						a().apply(selectedBottle.id);
					}
					if (["fade", "rain", "bathPreview"].includes(action)) {
						const p = current();
						const active = { properties: p, remaining: p.duration, total: p.duration };
						const worn = action === "bathPreview" ? null : a().previewWear(active, Number(elapsed.value), action === "rain");
						effectOutput.textContent = JSON.stringify(
							{
								worn,
								social: { Poppy: a().socialPreview("Poppy", worn), Robin: a().socialPreview("Robin", worn) },
								nativeContentSettings: V.settings,
								forest: Object.fromEntries(["wolf", "boar", "bear"].map(k => [k, a().wildlifePreview(k, worn, true)])),
								note: "Preview only. Forest category multipliers remain bounded 0.7–1.3; actual settings/context are authoritative.",
							},
							null,
							2
						);
					}
					if (action === "duration") a().debugAction("duration", Number(elapsed.value));
					if (action === "wash") a().wash();
					if (action === "tick") {
						if (!Number.isFinite(Number(elapsed.value)) || Number(elapsed.value) < 0 || Number(elapsed.value) > 720) throw new Error("Use 0–720 minutes.");
						a().tick(Number(elapsed.value));
					}
					if (action === "reaction") {
						sandbox.lesson = Number(lesson.value);
						progressOutput.textContent = JSON.stringify(
							{
								sandbox,
								actualCanTeach: a().canTeach(),
								actualCanVisit: a().canVisit(),
								signatureTrust: C.npc.Poppy?.love >= 60,
								advancedEligible: sandbox.lesson >= 4,
								reaction: a().feedback({ formula, blending: Number(blending.value), made: V.timeStamp - formula.age * 86400 }),
							},
							null,
							2
						);
					}
					if (action === "sandbox") {
						sandbox = { lesson: 0, advanced: null };
						progressOutput.textContent = JSON.stringify(sandbox);
					}
					if (action === "lessons") a().debugAction("lessons", Number(lesson.value));
					if (action === "skill") a().debugAction("skill", Number(skill.value));
					if (action === "workstation") a().debugAction("workstation");
					if (action === "resetLessons") a().debugAction("resetLessons");
					if (action.startsWith("stress") && !busy) {
						busy = true;
						const count = action === "stress1000" ? 1000 : 100;
						const samples = candidates(count);
						gallery.replaceChildren();
						const d = accumulator();
						for (let i = 0; i < count; i += 20) {
							if (signal.aborted || !host.isConnected) return;
							for (const sample of samples.slice(i, i + 20)) d.add(sample);
							status.textContent = "Evaluating " + Math.min(i + 20, count) + "/" + count;
							await new Promise(resolve => setTimeout(resolve, 0));
						}
						report = d.finish();
						report.seed = 20261022;
						reportOutput.textContent = JSON.stringify(report, null, 2);
						for (const sample of samples.slice(0, 50)) {
							const p = m().calculate(sample.formula, sample.blending);
							const card = el("figure", "", gallery);
							card.append(setup.perfumeryIcons.render(setup.perfumeryIcons.descriptor(p.fingerprint, p), p.name));
							el("figcaption", `${p.name}: ${p.nuances.slice(0, 3).join(", ")}`, card);
						}
						busy = false;
						status.textContent = "Diagnostics complete. No inventory or NPC state changed.";
					}
					if (action === "export") {
						if (!report) throw new Error("Run diagnostics first.");
						const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
						const link = document.createElement("a");
						link.href = url;
						link.download = "perfumery-diagnostics.json";
						link.click();
						setTimeout(() => URL.revokeObjectURL(url), 0);
					}
				} catch (error) {
					busy = false;
					status.textContent = error.message;
				}
			},
			{ signal }
		);
		setup.perfumeryCharacters.lab({ host, el, button, section, select, signal, current: () => ({ ...current(), formula: m().copy(formula) }) });
		sync();
		preview();
	}
	setup.perfumeryLab = { preset, presets: Object.keys(presetSources), candidates, diagnostics, open, dispose };
})();

/* Poppy's Opium: a weekly talk at Poppy's perfumery table, and a guided session where you make the perfume together.
   Poppy brings the opium for the session only. Each step is recorded once from a link's setter, so re-rendering a step
   passage changes nothing. The finished bottle is marked `opium`, and wearing it counts as an opium pulse. */
(() => {
	const P = () => setup.perfumery;
	const M = () => setup.perfumeryModel;
	/* Poppy's own arrangement: daisy on top, rose in the heart, orchid in the base, with the opium under the orchid. */
	const formula = { version: 1, top: { daisy: 1 }, heart: { red_rose: 2 }, base: { orchid: 2 }, solvent: "soft", concentration: 26, capacity: 40, age: 1 };
	const right = { latex: "warm", layer: "base" };

	function available() {
		return P().canTeach() && V.perfumery?.lesson >= 4 && !V.weekly.poppyOpium && (!V.perfumery.session || V.perfumery.session.stage === "concluded");
	}
	/* Called from the talk option's setter. The weekly flag is spent only when the talk actually starts. */
	function talk() {
		if (!available()) return false;
		V.weekly.poppyOpium = true;
		return true;
	}
	function start() {
		const s = P().state();
		if (s.bottles.length >= 24) return false;
		const cost = M().validate(M().copy(formula));
		V.perfumeryOpium = {
			step: "latex",
			fixed: 0,
			blend: null,
			ownBottle: s.containers >= 1,
			ownSpirit: (s.solvent.soft || 0) >= cost.solvent,
		};
		Time.pass(5 * 60);
		return true;
	}
	/* Records a choice for the current step. A wrong choice means Poppy fixes it, which costs some quality. */
	function choose(step, choice) {
		const o = V.perfumeryOpium;
		if (!o || o.step !== step) return;
		o[step] = choice;
		if (choice !== right[step]) o.fixed++;
		o.step = step === "latex" ? "layer" : "blend";
		Time.pass(10 * 60);
	}
	function blend(score) {
		const o = V.perfumeryOpium;
		if (!o || o.step !== "blend" || o.blend !== null) return;
		o.blend = Math.max(0, Math.min(1, Number(score) || 0));
		if (o.blend < 0.4) o.fixed++;
		o.step = "bottle";
	}
	/* Makes the bottle. Uses your empty bottle and soft spirit when you have them, and Poppy's when you don't. */
	function finish() {
		const o = V.perfumeryOpium;
		if (!o || o.step !== "bottle" || o.result) return o?.result;
		const s = P().state();
		const f = M().copy(formula);
		const cost = M().validate(f);
		const blending = Math.max(0.45, Math.min(0.95, 0.55 + Math.max(0.4, o.blend) * 0.4 - o.fixed * 0.08));
		const b = P().bottleRecord(f, blending, s.serial + 1);
		b.name = "Opium";
		b.opium = true;
		if (o.ownBottle && s.containers >= 1) s.containers--;
		else o.ownBottle = false;
		if (o.ownSpirit && (s.solvent.soft || 0) >= cost.solvent) s.solvent.soft -= cost.solvent;
		else o.ownSpirit = false;
		s.serial++;
		s.bottles.push(b);
		s.skill = Math.min(100, s.skill + 1);
		o.result = { id: b.id, quality: Math.round(P().properties(b).technicalQuality), first: !V.poppySeen.includes("perfumery_opium_made") };
		V.poppySeen.pushUnique("perfumery_opium_made");
		Wikifier.wikifyEval("<<npcincr Poppy love 1>>");
		Time.pass(20 * 60);
		return o.result;
	}
	setup.perfumeryOpium = { formula, available, talk, start, choose, blend, finish };

	/* A Start/Stop timing bar. Stop records one score through blend(); the Continue link appears afterwards. */
	Macro.add("perfumeryOpiumBar", {
		handler() {
			const wrap = $("<div class='perfumery perf-timing'>").appendTo(this.output);
			const meter = $(
				"<div class='perf-meter' aria-hidden='true'><div class='perf-zone' style='left:40%;width:20%'>STOP</div><div class='perf-needle'></div></div>"
			).appendTo(wrap);
			const needle = meter.find(".perf-needle");
			const button = $("<button class='perf-button perf-primary perf-blend-go' type='button'>Start blending</button>").appendTo(wrap);
			const feedback = $("<p class='perf-timing-feedback' role='status'>Press Start, then Stop when the light marker crosses the gold band.</p>").appendTo(
				wrap
			);
			let frame = 0;
			let pos = 0;
			let start = 0;
			const speed = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.03 : 0.096;
			const step = now => {
				if (!needle[0].isConnected) return;
				pos = 100 - Math.abs(100 - (((now - start) * speed) % 200));
				needle.css("transform", `translateX(${pos}%)`);
				frame = requestAnimationFrame(step);
			};
			$(document).one(":passagestart", () => cancelAnimationFrame(frame));
			button.on("click", () => {
				if (!frame) {
					start = performance.now();
					wrap.addClass("perf-blending");
					button.text("Stop");
					feedback.text("Watch the marker. You can wait for another crossing.");
					frame = requestAnimationFrame(step);
					return;
				}
				cancelAnimationFrame(frame);
				wrap.removeClass("perf-blending");
				button.text("Blended").prop("disabled", true);
				feedback.text("Blending finished. Continue below to bottle the perfume.");
				setup.perfumeryOpium.blend(1 - Math.min(1, Math.abs(pos - 50) / 50));
				$("#poppy-opium-next").removeAttr("hidden");
			});
		},
	});
})();
