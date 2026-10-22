(() => {
	"use strict";
	const paths = [
		"M18 24 Q7 31 10 48 Q16 61 32 61 Q48 61 54 48 Q57 31 46 24Z",
		"M23 21 L19 57 Q32 64 45 57 L41 21Z",
		"M12 26 H52 V57 Q32 62 12 57Z",
		"M32 20 Q8 40 13 53 Q32 70 51 53 Q56 40 32 20Z",
		"M24 20 V31 L10 54 Q8 61 32 61 Q56 61 54 54 L40 31 V20Z",
		"M19 24 Q5 33 16 43 Q4 59 22 60 H42 Q60 59 48 43 Q59 33 45 24Z",
		"M14 34 Q32 24 50 34 V54 Q32 63 14 54Z",
		"M22 23 L10 39 L17 59 H47 L54 39 L42 23Z",
	];
	const hues = {
		floral: 334,
		"fresh floral": 322,
		fruity: 18,
		citrus: 48,
		green: 99,
		herbal: 126,
		aquatic: 183,
		woody: 30,
		earthy: 42,
		resinous: 38,
		spicy: 19,
		powdery: 278,
		musky: 273,
		amber: 40,
		sweet: 35,
		creamy: 47,
		gourmand: 28,
		roasted: 22,
		smoky: 217,
		savoury: 71,
	};
	const cache = new Map();
	function descriptor(fingerprint, p) {
		const key = fingerprint;
		if (cache.has(key)) return cache.get(key);
		const h = setup.perfumeryIdentity.hash(key);
		const h2 = setup.perfumeryIdentity.hash(key + "ornament");
		const d = {
			version: 1,
			shape: h % 8,
			hue: ((hues[p.dominant] ?? 210) + (h2 % 25) - 12 + 360) % 360,
			cap: (h >>> 3) % 5,
			label: (h >>> 6) % 4,
			ornament: h2 % 65536,
			motif: ["floral", "powdery"].includes(p.dominant)
				? "flower"
				: ["woody", "earthy", "green", "herbal"].includes(p.dominant)
				? "leaf"
				: ["roasted", "smoky"].includes(p.dominant)
				? "smoke"
				: p.dominant === "fruity"
				? "fruit"
				: p.dominant === "aquatic"
				? "drop"
				: "star",
			finish: p.stability < 0.5 ? "layered" : p.offNotes?.some(n => n.name === "muddy") ? "cloudy" : h2 % 3 === 0 ? "shimmer" : "clear",
		};
		if (cache.size >= 256) cache.delete(cache.keys().next().value);
		cache.set(key, Object.freeze(d));
		return d;
	}
	function forBottle(b) {
		if (b.icon) return b.icon;
		const p = setup.perfumeryModel.calculate(b.formula, b.blending ?? 0.5, b.formula.age, b.identityVersion || 1);
		return descriptor(p.fingerprint, p);
	}
	function render(d, label = "Perfume bottle") {
		const ns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(ns, "svg");
		svg.setAttribute("viewBox", "0 0 64 70");
		svg.setAttribute("role", "img");
		svg.setAttribute("aria-label", String(label));
		svg.classList.add("perf-icon");
		const add = (tag, attrs) => {
			const n = document.createElementNS(ns, tag);
			for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
			svg.append(n);
			return n;
		};
		// Only whitelisted templates and bounded numbers reach SVG attributes; never parse supplied markup.
		const shape = paths[Number.isInteger(d.shape) && d.shape >= 0 && d.shape < 8 ? d.shape : 0];
		const hue = Number.isFinite(d.hue) ? Math.max(0, Math.min(360, d.hue)) : 330;
		add("path", { d: shape, fill: `hsl(${hue}, 48%, ${d.finish === "cloudy" ? 35 : 49}%)`, stroke: "#bdd1ce", "stroke-width": 2 });
		add("path", { d: "M21 29 L18 44", stroke: "#fff", opacity: 0.5, "stroke-width": 2 });
		add("rect", { x: 23, y: 13, width: 18, height: 11, rx: Number(d.cap) % 5 || 0, fill: "#ad9864", stroke: "#ddd0a7" });
		add("rect", { x: 20, y: 38, width: 24, height: 16, rx: Number(d.label) % 4 || 0, fill: "#eee0bd", opacity: 0.9 });
		const motif = {
			flower: "M32 41 Q21 34 28 47 Q21 57 32 51 Q43 57 36 47 Q43 34 32 41Z",
			leaf: "M25 50 Q23 39 39 41 Q38 52 25 50 M26 49 L36 43",
			smoke: "M27 51 Q38 47 29 43 Q24 39 36 36",
			fruit: "M32 43 Q21 38 25 50 Q32 57 39 50 Q43 38 32 43 M32 43 L35 38",
			drop: "M32 39 Q20 52 32 53 Q44 52 32 39Z",
			star: "M32 40 L34 45 L40 46 L35 49 L36 54 L32 51 L27 54 L28 49 L24 46 L30 45Z",
		};
		add("path", { d: motif[d.motif] || motif.star, fill: "none", stroke: "#3d493d", "stroke-width": 1.5 });
		const bits = Number(d.ornament) >>> 0;
		for (let i = 0; i < 16; i++)
			if (bits & (1 << i)) add("circle", { cx: 17 + (i % 8) * 4, cy: 29 + Math.floor(i / 8) * 28, r: d.finish === "shimmer" ? 1.1 : 0.7, fill: "#fff2c8" });
		if (d.finish === "layered") add("path", { d: "M17 55 Q32 51 47 55", fill: "none", stroke: "#d4c4a5", "stroke-width": 3 });
		return svg;
	}
	setup.perfumeryIcons = { descriptor, forBottle, render, signature: d => JSON.stringify(d), cacheSize: () => cache.size };
	if (Macro.has("perfumeryIcon")) Macro.delete("perfumeryIcon");
	Macro.add("perfumeryIcon", {
		handler() {
			const b = this.args[0];
			if (b?.formula) this.output.append(render(forBottle(b), b.name || "Recorded perfume"));
		},
	});
})();

/* globals $, V, pocketPerfumePack, pocketBagName */
(() => {
	"use strict";
	setup.perfumeryUI?.dispose();
	let cleanup = () => {};
	// The unspent draft survives passage changes in memory, outside SugarCube history.
	// Bottling or clearing the draft resets it.
	let draft = null;
	const freshDraft = () => ({
		formula: setup.perfumeryModel.empty(),
		pinned: null,
		layer: "heart",
		tab: null,
		undo: [],
		filters: { q: "", family: "", affinity: "", kind: "", owned: true, sort: "name" },
		page: 0,
	});
	const layerName = { top: "Top", heart: "Heart", base: "Base" };
	const layerHint = {
		top: "The first smell you notice when you apply the perfume. It usually fades within an hour.",
		heart: "The main smell of the perfume. You notice it more after the first smell starts to fade.",
		base: "The smell that lasts the longest. You can still notice it on your skin hours later.",
	};
	/* Nine tiles: three rows on every width, so the drawer never turns into a long scroll. */
	const PAGE = 9;
	const word = (n, steps) => steps.find(([limit]) => n < limit)?.[1] ?? steps[steps.length - 1][1];
	const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
	const clamp01 = n => Math.max(0, Math.min(1, n));
	const projectionWord = n =>
		word(n, [
			[1, "Stays close to the skin"],
			[1.8, "Noticeable at arm's length"],
			[2.4, "Fills a room"],
			[Infinity, "Carries well beyond you"],
		]);
	const concentrationWord = n =>
		word(n, [
			[18, "Light"],
			[26, "Moderate"],
			[34, "Strong"],
			[Infinity, "Very intense"],
		]);
	const scoreWord = n =>
		word(n, [
			[40, "Poor"],
			[60, "Uneven"],
			[75, "Pleasant"],
			[88, "Fine"],
			[Infinity, "Exceptional"],
		]);
	const meterWord = n =>
		word(n, [
			[0.2, "Faint"],
			[0.45, "Some"],
			[0.7, "Clear"],
			[Infinity, "Strong"],
		]);
	const hours = minutes => (minutes < 90 ? `about ${Math.round(minutes / 10) * 10} minutes` : `about ${Math.round(minutes / 30) / 2} hours`);
	/* Workflow order. "notes" keeps its id from earlier versions; players see it as Compose. */
	const stages = [
		["prepare", "Prepare", "Turn an ingredient into an aroma"],
		["notes", "Compose", "Place aromas in the perfume"],
		["blend", "Blend", "Mix it, then stop the marker in the gold band"],
		["bottle", "Bottle", "Seal it and name it"],
	];
	/* Where the gold band sits on each blending pass. */
	const zones = [52, 36, 64];
	const passes = [
		["Opening", "top"],
		["Heart", "heart"],
		["Base", "base"],
	];
	function mount(root) {
		cleanup();
		const api = setup.perfumery;
		const m = setup.perfumeryModel;
		const s = api.state();
		const abort = new AbortController();
		const signal = abort.signal;
		const station = root.dataset.mode === "station";
		let blending = null;
		let blended = "";
		let result = null;
		let serial = s.serial;
		let liquidOpen = false;
		/* Timing minigame state: one stop per pass. Lives only while this page is open. */
		const timing = { scores: [], running: false, raf: 0, start: 0, pos: 0, last: "" };
		cleanup = () => {
			abort.abort();
			cancelAnimationFrame(timing.raf);
		};
		if (station) draft ??= freshDraft();
		const d = draft;
		const el = (tag, text, parent, cls) => {
			const node = document.createElement(tag);
			if (text !== undefined) node.textContent = text;
			if (cls) node.className = cls;
			if (parent) parent.append(node);
			return node;
		};
		const button = (text, action, parent, id, extra = {}) => {
			const b = el("button", text, parent, extra.cls);
			b.type = "button";
			b.dataset.action = action;
			if (id !== undefined) b.dataset.id = id;
			if (extra.layer) b.dataset.layer = extra.layer;
			if (extra.label) b.setAttribute("aria-label", extra.label);
			return b;
		};
		const knowledge = Math.max(s.lesson + (s.session?.kind === "lesson" && s.session.stage === "compose" ? 1 : 0), Math.floor(s.skill / 10));
		const advanced = knowledge >= 2;
		const units = f => m.layers.reduce((sum, l) => sum + Object.values(f[l]).reduce((a, b) => a + b, 0), 0);
		const used = id => m.layers.reduce((sum, l) => sum + (d.formula[l][id] || 0), 0);
		const safe = fn => {
			try {
				return fn();
			} catch {
				return null;
			}
		};
		const iconOf = id => {
			const src = setup.foodstuff[m.source(id)];
			return src && V.options.images ? `img/misc/icon/${src.icon_path || "tending/" + src.icon}` : null;
		};
		/* Two-line readable identity for a material: "Mushroom" / "Root and umami · lasting". */
		function label(id) {
			const base = setup.foodstuff[m.source(id)]?.name || m.source(id);
			const title = base[0].toUpperCase() + base.slice(1);
			if (!id.startsWith("aroma~")) return { title, sub: "Raw material", full: title };
			const p = setup.perfumeryExtraction.resolve(id);
			const facets = p.selected.slice(0, 2).join(" and ");
			const finish = { stability: "lasting", purity: "clear", yield: "soft" }[p.finish] || p.finish;
			return { title, sub: `${facets[0].toUpperCase() + facets.slice(1)} · ${finish}`, full: m.name(id) };
		}
		const stockLeft = () => Object.entries(s.extraction.stock).reduce((n, [id, amount]) => n + Math.max(0, amount - used(id)), 0);
		/* First-time guidance: Poppy at Poppy's table, the manual elsewhere. Gone after the first bottle. */
		const firstTime = station && !s.bottles.length && !s.journal.length;
		const poppyHere = station && V.perfumeryVenue === "poppy" && api.availableTeacher();

		const title = el("h2", station ? "The perfumer's table" : "Your perfume cabinet", root);
		title.tabIndex = -1;
		/* Supplies are listed in the journal; the table only says what changed. */
		const status = el("p", "", root, "perf-status");
		status.setAttribute("role", "status");
		const notice = text => {
			status.textContent = text;
		};

		/* Lesson and collaboration briefs sit above the steps so they stay visible at every stage. */
		if (station) {
			const exercises = [
				"Lesson 1: Make your first perfume using the ingredients Poppy gave you. Choose your ingredients, mix them, and put the finished perfume into a bottle.",
				"Lesson 2: Load the perfume you made earlier. Use the same ingredients, but try changing how much of each one you use. You can also move ingredients between the top, middle, and base notes. Make sure at least two ingredients share the same note.",
				"Lesson 3: Load your previous perfume without changing its ingredients. Open the liquid settings in Blend and try changing the alcohol, perfume strength, or maturing time.",
				"Lesson 4: Make a floral perfume using different flowers. Try to make the scents work well together, with a base scent that lasts longer.",
				"You've finished Poppy's lessons! You can visit her at home to talk about the perfumes you've made.",
			];
			const brief = {
				opening: "Load Poppy's example perfume. One of its scents is too strong or too sweet. Change the recipe to make it smell better.",
				challenge: "Make a perfume based on what you personally like. Choose your favourite ingredients and try to make them work well together.",
				gift: "Load the perfume you gave Poppy earlier. Change one part of the recipe and see how it affects the result.",
				demonstration: "Load one of your saved perfumes. Change one ingredient or setting, then show Poppy what you changed.",
				rescue: "Load the failed perfume. Find out which ingredient is causing the problem and change the recipe to improve the smell.",
				rivalry: "Make a perfume with daisy in the top note, rose in the middle note, and orchid in the base note. Try to make a better perfume than Poppy's.",
			};
			if (s.session?.kind === "lesson" && s.session.stage === "compose") {
				const box = el("div", undefined, root, "perf-brief");
				el("p", exercises[s.lesson], box);
				if (s.lessonSample) button("Load last lesson's formula", "sample", box);
			}
			if (s.session?.kind === "collaboration" && s.session.stage === "compose") {
				const box = el("div", undefined, root, "perf-brief");
				el("p", brief[s.session.approach] || brief.gift, box);
				button("Load Poppy's reference formula", "reference", box);
			}
		}

		const results = el("section", undefined, null, "perf-results");
		const cabinet = el("section", undefined, null, "perf-cabinet");
		const journal = el("section", undefined, null, "perf-journal");
		let tabs, panels, coach;
		if (station) {
			const nav = el("div", undefined, root, "perf-stepper");
			nav.setAttribute("role", "tablist");
			nav.setAttribute("aria-label", "Perfume making steps");
			tabs = {};
			stages.forEach(([id, name], i) => {
				const t = button("", "tab", nav, id, { cls: "perf-step" });
				t.setAttribute("role", "tab");
				t.id = `perf-tab-${id}`;
				t.setAttribute("aria-controls", `perf-panel-${id}`);
				el("span", String(i + 1), t, "perf-step-num");
				el("strong", name, t);
				el("small", "", t, "perf-step-state");
				tabs[id] = t;
			});
			coach = el("p", "", root, "perf-coach");
			panels = {};
			for (const [id] of stages) {
				const p = el("section", undefined, root, "perf-panel");
				p.id = `perf-panel-${id}`;
				p.setAttribute("role", "tabpanel");
				p.setAttribute("aria-labelledby", `perf-tab-${id}`);
				panels[id] = p;
			}
			panels.bottle.append(results);
			if (!d.tab || !panels[d.tab]) d.tab = units(d.formula) || stockLeft() ? "notes" : "prepare";
		} else root.append(cabinet, journal);

		/* Everything still missing before bottling, each with the step that fixes it. */
		function check() {
			const n = units(d.formula);
			const cost = safe(() => m.validate(d.formula));
			const blendDone = blending !== null && blended === JSON.stringify(d.formula);
			const lacks = [];
			if (!n) lacks.push({ text: "Add at least one aroma to the perfume.", fix: ["Compose", "notes"] });
			if (n && !cost) lacks.push({ text: validateMessage(), fix: ["Change liquid settings", "liquid"] });
			if (n && cost && !blendDone) lacks.push({ text: "Blend the perfume.", fix: ["Blend it", "blend"] });
			if (s.containers < 1) lacks.push({ text: "You have no empty bottles. They're sold at the cosmetics shop." });
			if (cost && s.solvent[d.formula.solvent] < cost.solvent)
				lacks.push({
					text: `This needs ${cost.solvent} ${d.formula.solvent} spirit and you have ${
						s.solvent[d.formula.solvent]
					}. Choose another spirit or buy more at the cosmetics shop.`,
					fix: ["Choose another spirit", "liquid"],
				});
			if (s.bottles.length >= 24) lacks.push({ text: "Your cabinet is full (24 bottles). Discard one from the cabinet first." });
			return { n, cost, blendDone, lacks, ready: !lacks.length };
		}
		function validateMessage() {
			try {
				m.validate(d.formula);
				return null;
			} catch (e) {
				return e.message;
			}
		}
		function renderProgress() {
			const c = check();
			const left = stockLeft();
			const state = {
				prepare: left ? `${plural(left, "measure")} ready` : "No aromas yet",
				notes: c.n ? `${plural(c.n, "measure")} added` : "Empty",
				blend: c.blendDone ? "Blended" : c.n ? "Not blended" : "Needs aromas",
				bottle: result ? "Bottled" : c.ready ? "Ready" : "Not ready",
			};
			const done = { prepare: left > 0 || c.n > 0, notes: c.n > 0, blend: c.blendDone, bottle: !!result };
			for (const [id, name] of stages) {
				const on = d.tab === id;
				tabs[id].querySelector(".perf-step-state").textContent = state[id];
				tabs[id].classList.toggle("perf-step-done", done[id]);
				tabs[id].setAttribute("aria-selected", String(on));
				tabs[id].setAttribute("aria-label", `${name}: ${state[id]}`);
				tabs[id].tabIndex = on ? 0 : -1;
			}
			for (const id of Object.keys(panels)) panels[id].hidden = d.tab !== id;
			renderCoach(c);
		}
		function renderCoach(c) {
			coach.hidden = true;
			if (!firstTime || result) return;
			const lines = poppyHere
				? {
						prepare: '"First, choose a flower. You can remove parts of its scent that you don\'t want before collecting the aroma."',
						notes: c.n
							? '"You have added enough for your first perfume. Now go to Blend."'
							: '"Now choose the main scent for your perfume. Select Heart, then tap the aroma you collected to add it."',

						blend: '"Press Start and watch the moving marker. When it reaches the gold area, press Stop. You need to do this three times."',
						bottle: '"Your perfume is ready to be bottled. Finish bottling it, then let me smell it."',
				  }
				: {
						prepare: "Choose a flower and check its scent. Remove any scent parts you don't want before collecting the aroma.",
						notes: c.n ? "You have enough for your first perfume. Go to Blend." : "Select Heart, then tap the aroma you collected to add it to your perfume.",
						blend: "Press Start. When the moving marker reaches the gold area, press Stop. Repeat this three times.",
						bottle: "Check the ingredients you added, then bottle your perfume.",
				  };
			if (!lines[d.tab]) return;
			coach.hidden = false;
			coach.replaceChildren();
			el("strong", poppyHere ? "Poppy: " : "Manual: ", coach);
			coach.append(lines[d.tab]);
		}
		function head(panel, id, need) {
			const box = el("div", undefined, panel, "perf-stage-head");
			const [, name, what] = stages.find(x => x[0] === id);
			el("h3", name, box);
			el("p", what + ".", box);
			if (need) el("p", need, box, "perf-need");
			return box;
		}
		function foot(panel, back, next, nextLabel, enabled = true) {
			const row = el("div", undefined, panel, "perf-stage-foot");
			if (back) button(`Back to ${stages.find(x => x[0] === back)[1]}`, "tab", row, back);
			if (next) {
				const b = button(nextLabel, "tab", row, next, { cls: "perf-primary" });
				b.disabled = !enabled;
			}
		}

		// Bottle height shows fill; colour and meters come from the calculated scent.
		const svgNS = "http://www.w3.org/2000/svg";
		const svg = (tag, attrs, parent) => {
			const n = document.createElementNS(svgNS, tag);
			for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
			if (parent) parent.append(n);
			return n;
		};
		let stageId = 0;
		function bottleStage(parent, p = null) {
			const c = check();
			p ??= c.n ? safe(() => m.calculate(d.formula, blending ?? 0.5)) : null;
			const box = el("div", undefined, parent, "perf-stage");
			const art = el("div", undefined, box, "perf-bottle-art");
			const id = `perf-clip-${++stageId}`;
			const g = svg("svg", { viewBox: "0 0 220 300", "aria-hidden": "true", class: "perf-bottle-svg" }, art);
			const defs = svg("defs", {}, g);
			svg("rect", { x: 31, y: 84, width: 158, height: 200, rx: 30 }, svg("clipPath", { id }, defs));
			svg("rect", { x: 93, y: 22, width: 34, height: 50, rx: 6, fill: "#bdb39a", stroke: "#e3d4a3" }, g);
			svg("rect", { x: 78, y: 14, width: 64, height: 24, rx: 6, fill: "#d6c08e", stroke: "#eacb95", "stroke-width": 2 }, g);
			svg("rect", { x: 31, y: 84, width: 158, height: 200, rx: 30, fill: "#d6e4cd22", stroke: "#c2d1c2", "stroke-width": 3 }, g);
			const fill = c.n ? Math.min(1, ((c.n * 100) / d.formula.concentration / d.formula.capacity) * 1) : 0;
			const height = 18 + fill * 170;
			const clip = svg("g", { "clip-path": `url(#${id})` }, g);
			/* Three bands, base at the bottom, each as tall as that note's share. */
			let y = 284;
			for (const l of ["base", "heart", "top"]) {
				const share = c.n ? Object.values(d.formula[l]).reduce((a, b) => a + b, 0) / c.n : l === "base" ? 1 : 0;
				const h = height * share;
				y -= h;
				if (h > 0)
					svg(
						"rect",
						{ x: 31, y, width: 158, height: h, fill: p?.colour || "#8c9860", opacity: { base: 0.95, heart: 0.8, top: 0.62 }[l], class: "perf-liquid" },
						clip
					);
			}
			if (c.n) {
				const bubbles = svg("g", { class: "perf-bubbles", fill: "#f9edc6" }, clip);
				for (const [cx, r] of [
					[70, 3],
					[110, 2.4],
					[150, 3.4],
					[90, 2],
				])
					svg("circle", { cx, cy: 276, r }, bubbles);
			}
			svg("path", { d: "M46 103 Q39 131 46 248", fill: "none", stroke: "#fcffe6", "stroke-width": 8, opacity: 0.16, "stroke-linecap": "round" }, g);
			svg("rect", { x: 60, y: 170, width: 100, height: 46, rx: 3, fill: "#f0e2c2", opacity: 0.9 }, g);
			const name = svg("text", { x: 110, y: 198, "text-anchor": "middle", "font-size": 11, fill: "#3d493d" }, g);
			name.textContent = (p?.name || "Untitled").slice(0, 18);
			art.classList.toggle("perf-shaking", timing.running);
			const caption = el("div", undefined, box, "perf-stage-caption");
			el("strong", p ? p.name : c.n ? "Not ready" : "Empty bottle", caption);
			el(
				"small",
				p
					? `${plural(c.n, "measure")} · ${concentrationWord(d.formula.concentration).toLowerCase()} · ${d.formula.solvent} spirit`
					: c.n
					? c.lacks[0]?.text || ""
					: "Tap an aroma to add it.",
				caption
			);
			const meters = el("dl", undefined, box, "perf-meters");
			const meter = (k, v) => {
				const row = el("div", undefined, meters);
				el("dt", k, row);
				const dd = el("dd", undefined, row);
				const track = el("span", undefined, dd, "perf-track");
				track.setAttribute("aria-hidden", "true");
				el("i", undefined, track).style.width = `${Math.round(clamp01(v) * 100)}%`;
				el("b", p ? (advanced ? `${Math.round(clamp01(v) * 100)}` : meterWord(v)) : "-", dd);
			};
			meter("Reach", p ? p.intensity / 2.6 : 0);
			meter("Lasting", p ? p.duration / 720 : 0);
			meter("Sweetness", p ? p.sweet : 0);
			meter("Wildlife interest", p ? Math.max(0, p.animal) : 0);
			return box;
		}

		/* Prepare: the extraction minigame, mounted once per workstation visit. */
		let extractionUI = null;
		function renderPrepare() {
			const panel = panels.prepare;
			if (extractionUI) return;
			head(panel, "prepare", "Uses one ingredient from your stock. Nothing is spent until you collect.");
			extractionUI = setup.perfumeryExtractionUI.mount(
				panel,
				signal,
				next => {
					catalogue = buildCatalogue();
					if (next) {
						d.tab = next;
						d.filters.owned = true;
						renderAll();
						focusAfter(`#perf-tab-${next}`);
					} else renderProgress();
				},
				{ advanced }
			);
			if (stockLeft()) foot(panel, null, "notes", "Continue to Compose");
		}

		function renderNotes() {
			const panel = panels.notes;
			panel.replaceChildren();
			const total = units(d.formula);
			const ready = stockLeft();
			head(panel, "notes", `Choose a note, then tap an aroma to add one measure. You have ${plural(ready, "measure")} ready.`);
			const bench = el("div", undefined, panel, "perf-workbench");
			const drawer = el("section", undefined, bench, "perf-drawer");
			if (!ready && !catalogue.some(e => e.kind === "raw" && left(e) > 0)) {
				const empty = el("div", undefined, drawer, "perf-callout");
				el("p", total ? "You've used every aroma you prepared." : "You have no prepared aromas yet. Aromas are made from flowers and food.", empty);
				button("Prepare an aroma", "tab", empty, "prepare", { cls: "perf-primary" });
			} else renderBrowser(drawer);
			bottleStage(bench);
			const chambers = el("section", undefined, bench, "perf-chambers");
			for (const l of m.layers) chamber(chambers, l, total);
			const tools = el("div", undefined, panel, "perf-steps");
			if (d.undo.length) button("Undo", "undo", tools);
			foot(panel, "prepare", "blend", total ? "Continue to Blend" : "Add an aroma to continue", total > 0);
		}
		function chamber(parent, l, total) {
			const count = Object.values(d.formula[l]).reduce((a, b) => a + b, 0);
			const card = el("section", undefined, parent, `perf-chamber perf-${l}`);
			card.dataset.drop = l;
			const pick = button("", "layer", card, l, { cls: "perf-chamber-head" });
			pick.setAttribute("aria-pressed", String(d.layer === l));
			el("strong", `${layerName[l]} note`, pick);
			el("span", d.layer === l ? "Adding here" : plural(count, "measure"), pick, "perf-chamber-tag");
			el("small", layerHint[l], card);
			const list = el("ul", undefined, card, "perf-chips");
			if (!count) el("li", d.layer === l ? "Tap an aroma to add it here." : "Choose this note, then tap an aroma.", list, "perf-empty");
			for (const [id, n] of Object.entries(d.formula[l])) {
				const info = label(id);
				const chip = el("li", undefined, list, "perf-chip");
				const src = iconOf(id);
				if (src) Object.assign(el("img", undefined, chip, "icon"), { src, alt: "" });
				const name = el("span", info.title, chip, "perf-chip-name");
				name.title = info.full;
				button("−", "minus", chip, id, { layer: l, label: `One less ${info.full}`, cls: "perf-mini" });
				el("output", String(n), chip).setAttribute("aria-label", `${n} measures of ${info.full}`);
				button("+", "plus", chip, id, { layer: l, label: `One more ${info.full}`, cls: "perf-mini" });
				const moveLabel = el("label", undefined, chip, "perf-move");
				el("span", "Move to", moveLabel, "perf-sr");
				const move = el("select", undefined, moveLabel);
				move.dataset.move = id;
				move.dataset.from = l;
				move.setAttribute("aria-label", `Move ${info.full} to another note`);
				for (const note of m.layers) {
					const o = el("option", layerName[note], move);
					o.value = note;
				}
				move.value = l;
				button("✕", "remove", chip, id, { layer: l, label: `Remove ${info.full}`, cls: "perf-mini" });
			}
			const share = el("div", undefined, card, "perf-track");
			share.setAttribute("aria-hidden", "true");
			el("i", undefined, share).style.width = `${total ? (count / total) * 100 : 0}%`;
		}

		/* Owned extracts, legacy raw materials, and extractable sources. Rebuilt when an aroma is collected,
		   so a vial prepared during this visit shows up in Compose straight away. */
		const buildCatalogue = () =>
			station
				? (() => {
						const entries = [];
						const seen = new Set();
						for (const id of [...Object.keys(s.extraction.stock), ...Object.keys(m.ingredients)]) {
							if (seen.has(id) || !m.material(id)) continue;
							seen.add(id);
							const info = label(id);
							const mat = m.material(id);
							entries.push({
								id,
								kind: id.startsWith("aroma~") ? "extract" : "raw",
								...info,
								family: mat.family,
								affinity: mat.affinity,
								intensity: mat.intensity,
							});
						}
						const registry = setup.perfumeryExtraction.registry();
						for (const src of Object.keys(registry)) {
							const name = setup.foodstuff[src]?.name || src;
							entries.push({
								id: src,
								kind: "source",
								title: name[0].toUpperCase() + name.slice(1),
								sub: "Not prepared yet",
								full: name,
								family: "",
								affinity: "",
							});
						}
						for (const e of entries) e.search = `${e.full} ${e.sub} ${e.family}`.toLowerCase();
						return entries;
				  })()
				: [];
		let catalogue = buildCatalogue();
		function left(entry) {
			if (entry.kind === "source") return V.foodstuff[entry.id]?.amount || 0;
			return (s.extraction.stock[entry.id] || 0) - used(entry.id);
		}
		function renderBrowser(box) {
			const f = d.filters;
			el("h4", `Your aromas: adding to ${layerName[d.layer].toLowerCase()}`, box);
			const controls = el("div", undefined, box, "perf-filters");
			const search = el("label", undefined, controls, "perf-search");
			el("span", "Search", search, "perf-sr");
			const q = el("input", undefined, search);
			Object.assign(q, { type: "search", value: f.q, placeholder: "Search aromas", enterKeyHint: "search", autocomplete: "off" });
			q.setAttribute("aria-label", "Search your aromas");
			q.dataset.filter = "q";
			const more = el("details", undefined, controls, "perf-more-filters");
			more.open = !!(f.family || f.affinity || f.kind || f.sort !== "name" || !f.owned);
			el("summary", "Filter and sort", more);
			const extra = el("div", undefined, more, "perf-filters");
			const ownedLabel = el("label", undefined, extra, "perf-check");
			const owned = el("input", undefined, ownedLabel);
			owned.type = "checkbox";
			owned.checked = f.owned;
			owned.dataset.filter = "owned";
			ownedLabel.append(" Only what I have");
			const select = (labelText, key, options) => {
				const wrap = el("label", undefined, extra);
				el("span", labelText, wrap);
				const sel = el("select", undefined, wrap);
				sel.dataset.filter = key;
				for (const [v, t] of options) {
					const o = el("option", t, sel);
					o.value = v;
				}
				sel.value = f[key];
			};
			const families = [...new Set(catalogue.map(e => e.family).filter(Boolean))].sort();
			select("Scent family", "family", [["", "Any family"], ...families.map(x => [x, x])]);
			select("Suits note", "affinity", [["", "Any note"], ...m.layers.map(l => [l, layerName[l]])]);
			select("Show", "kind", [
				["", "Prepared aromas"],
				["extract", "Prepared aromas only"],
				["raw", "Raw materials"],
				["source", "Ingredients to prepare"],
			]);
			select("Sort", "sort", [
				["name", "Name"],
				["left", "Amount left"],
				["family", "Scent family"],
				["affinity", "Best for this note"],
			]);
			const list = el("ul", undefined, box, "perf-tiles");
			renderCards(list);
		}
		function renderCards(list) {
			const f = d.filters;
			const q = f.q.trim().toLowerCase();
			let rows = catalogue.filter(
				e =>
					(f.kind ? e.kind === f.kind : e.kind !== "source") &&
					(!f.family || e.family === f.family) &&
					(!f.affinity || e.affinity === f.affinity) &&
					(!q || e.search.includes(q)) &&
					(!f.owned || left(e) > 0)
			);
			const by = {
				name: (a, b) => a.title.localeCompare(b.title) || a.sub.localeCompare(b.sub),
				left: (a, b) => left(b) - left(a),
				family: (a, b) => a.family.localeCompare(b.family) || a.title.localeCompare(b.title),
				affinity: (a, b) => (b.affinity === d.layer) - (a.affinity === d.layer) || a.title.localeCompare(b.title),
			}[f.sort];
			rows = rows.sort(by);
			list.replaceChildren();
			list.dataset.count = String(rows.length);
			const pager = list.nextElementSibling?.classList.contains("perf-pager") ? list.nextElementSibling : null;
			pager?.remove();
			if (!rows.length) {
				el("li", "Nothing matches. Clear the search or change the filters.", list, "perf-empty perf-tiles-empty");
				return;
			}
			const pages = Math.ceil(rows.length / PAGE);
			d.page = Math.min(d.page, pages - 1);
			for (const e of rows.slice(d.page * PAGE, d.page * PAGE + PAGE)) {
				const li = el("li", undefined, list);
				const n = left(e);
				const source = e.kind === "source";
				const tile = button("", source ? "extractSource" : "add", li, e.id, {
					cls: "perf-tile",
					label: source ? `Prepare an aroma from ${e.full}` : `Add ${e.full} to the ${d.layer} note, ${n} left`,
				});
				if (!source) {
					tile.draggable = n > 0;
					tile.disabled = n <= 0;
				}
				const src = iconOf(e.id);
				if (src) Object.assign(el("img", undefined, tile, "icon"), { src, alt: "", draggable: false });
				el("strong", e.title, tile);
				el("small", source ? `${n} in stock` : `${n} left · ${e.family}`, tile);
				tile.title = source ? `Prepare ${e.full}` : `${e.full}. Best in the ${e.affinity} note.`;
			}
			if (pages > 1) {
				const nav = el("div", undefined, null, "perf-pager");
				list.after(nav);
				button("Previous", "page", nav, "-1").disabled = d.page === 0;
				el("span", `${d.page + 1} of ${pages}`, nav);
				button("Next", "page", nav, "1").disabled = d.page >= pages - 1;
			}
		}

		/* Liquid settings: a one-line recommended default, with the precise controls folded away. */
		function renderLiquid(panel, c) {
			const f = d.formula;
			const sv = m.solvents[f.solvent];
			const box = el("details", undefined, panel, "perf-liquid");
			box.open = liquidOpen || (c.n > 0 && !c.cost);
			box.dataset.liquid = "1";
			const sum = el("summary", undefined, box);
			el("strong", "Liquid: ", sum);
			sum.append(
				`${sv.name.replace(" perfumer's spirit", "").toLowerCase()} spirit, ${concentrationWord(f.concentration).toLowerCase()}, ${
					f.capacity
				}-measure bottle, ${f.age ? `matures ${plural(f.age, "day")}` : "ready at once"}`
			);
			el("p", "Recommended: clear spirit, moderate, 40-measure bottle, ready at once. Change it only if you want to.", box, "perf-hint");
			const isDefault = f.solvent === "clear" && f.concentration === 20 && f.capacity === 40 && f.age === 0;
			if (!isDefault) button("Use the recommended setting", "defaults", box);
			const fieldset = (legend, cls) => {
				const fs = el("fieldset", undefined, box, cls);
				el("legend", legend, fs);
				return fs;
			};
			const solvents = fieldset("Spirit", "perf-options");
			for (const [id, spirit] of Object.entries(m.solvents)) {
				const lab = el("label", undefined, solvents, "perf-option");
				const r = el("input", undefined, lab);
				Object.assign(r, { type: "radio", name: "perf-solvent", value: id, checked: f.solvent === id });
				r.dataset.control = "solvent";
				const body = el("span", undefined, lab);
				el("strong", spirit.name, body);
				el(
					"span",
					`${spirit.projection < 1 ? "Noticed up close" : spirit.projection > 1.2 ? "Noticed from far away" : "Noticed nearby"}; ${
						spirit.evaporation < 1 ? "lasts longer" : spirit.evaporation > 1.1 ? "fades sooner" : "average wear"
					}${spirit.purity > 0.9 ? "; turns sharp when very strong" : ""}.`,
					body
				);
				el("small", `You have ${s.solvent[id]}${c.cost && f.solvent === id ? `; this needs ${c.cost.solvent}` : ""}.`, body);
			}
			const conc = fieldset("Strength", "perf-range");
			const rangeLabel = el("label", undefined, conc);
			el("span", `${concentrationWord(f.concentration)} (${f.concentration}% aroma)`, rangeLabel, "perf-range-value");
			const range = el("input", undefined, rangeLabel);
			Object.assign(range, { type: "range", min: "10", max: "40", step: "1", value: String(f.concentration) });
			range.dataset.control = "concentration";
			range.setAttribute("aria-valuetext", `${concentrationWord(f.concentration)}, ${f.concentration}%`);
			el("small", "Stronger lasts longer and uses less spirit, so fewer aromas fit in the bottle.", conc, "perf-hint");
			const caps = fieldset("Bottle size", "perf-options perf-options-row");
			for (const n of [20, 40, 60]) {
				const lab = el("label", undefined, caps, "perf-option");
				const r = el("input", undefined, lab);
				Object.assign(r, { type: "radio", name: "perf-capacity", value: String(n), checked: f.capacity === n });
				r.dataset.control = "capacity";
				el("strong", `${n} measures`, el("span", undefined, lab));
			}
			if (c.cost)
				el(
					"small",
					`This makes ${c.cost.volume.toFixed(1)} measures of liquid: ${plural(Math.max(1, Math.floor(c.cost.volume / 4)), "application")}.`,
					caps,
					"perf-hint"
				);
			const ages = fieldset("Maturing", "perf-options perf-options-row");
			const base = c.n ? safe(() => m.calculate({ ...f, age: 0 }, 0.7, 0)) : null;
			for (const n of [0, 1, 3, 7, 14]) {
				const lab = el("label", undefined, ages, "perf-option");
				const r = el("input", undefined, lab);
				Object.assign(r, { type: "radio", name: "perf-age", value: String(n), checked: f.age === n });
				r.dataset.control = "age";
				const body = el("span", undefined, lab);
				el("strong", n ? plural(n, "day") : "None", body);
				const p = base && n ? safe(() => m.calculate({ ...f, age: n }, 0.7, n)) : null;
				if (p) {
					const dq = p.quality - base.quality;
					el(
						"small",
						advanced
							? `Balance ${dq >= 0 ? "+" : ""}${Math.round(dq)}, stability ${Math.round(p.stability * 100)}%`
							: dq > 2
							? "Rounds out"
							: dq < -1
							? "Fresh parts fade"
							: "Little change",
						body
					);
				}
			}
			el("small", "A maturing bottle can't be worn until the days have passed.", ages, "perf-hint");
			if (c.cost) {
				const cmp = el("details", undefined, box, "perf-compare");
				cmp.open = !!d.pinned;
				el("summary", "Compare with an earlier version", cmp);
				const row = el("div", undefined, cmp, "perf-steps");
				button("Remember this version", "pin", row);
				if (d.pinned) button("Swap with the remembered one", "swap", row);
				if (d.pinned) el("p", comparisonText(), cmp, "perf-comparison").setAttribute("aria-live", "polite");
			}
		}
		function comparisonText() {
			const now = safe(() => m.calculate(d.formula));
			const before = safe(() => m.calculate(d.pinned));
			if (!now || !before) return "Make the current formula valid to compare it.";
			const diff = (a, b, small, more, less, same) => (Math.abs(a - b) < small ? same : a > b ? more : less);
			return `Compared with the remembered version: ${diff(
				now.intensity,
				before.intensity,
				0.02,
				"stronger opening",
				"gentler opening",
				"similar opening"
			)}, ${diff(now.duration, before.duration, 2, "lasts longer", "fades sooner", "similar wear")}, ${diff(
				now.quality,
				before.quality,
				0.2,
				"smoother",
				"rougher",
				"similar balance"
			)}.${
				knowledge >= 3 ? ` Balance ${Math.round(before.quality)} to ${Math.round(now.quality)}; wear ${hours(before.duration)} to ${hours(now.duration)}.` : ""
			}`;
		}

		// Three timing passes set craftsmanship within the engine's 0.35 to 0.95 range.
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		function passScore(pos, pass) {
			return clamp01(1 - Math.max(0, Math.abs(pos - zones[pass]) - 9) / 38);
		}
		function renderBlend() {
			const panel = panels.blend;
			panel.replaceChildren();
			const c = check();
			head(panel, "blend", c.n ? "Better timing gives a better perfume. Nothing is spent until you bottle." : null);
			if (!c.n) {
				const empty = el("div", undefined, panel, "perf-callout");
				el("p", "There's nothing to blend yet.", empty);
				button("Compose a perfume first", "tab", empty, "notes", { cls: "perf-primary" });
				return;
			}
			const bench = el("div", undefined, panel, "perf-workbench perf-workbench-two");
			bottleStage(bench);
			const side = el("section", undefined, bench, "perf-blend");
			if (!c.cost) {
				renderLiquid(side, c);
				return foot(panel, "notes", null);
			}
			if (c.blendDone) {
				el("p", `Blended. Craftsmanship: ${scoreWord(blending * 100)}${advanced ? ` (${Math.round(blending * 100)}%)` : ""}.`, side, "perf-done");
				if (timing.last) el("p", timing.last, side);
				button("Blend again", "reblend", side);
				renderLiquid(side, c);
				return foot(panel, "notes", "bottle", "Continue to Bottle");
			}
			const pass = timing.scores.length;
			const track = el("ol", undefined, side, "perf-stage-track");
			passes.forEach(([name], i) => {
				const li = el("li", name, track);
				if (i < pass) li.className = "perf-stage-done";
				if (i === pass) {
					li.className = "perf-stage-now";
					li.setAttribute("aria-current", "step");
				}
			});
			const [passName, layer] = passes[pass];
			el("p", `${passName} pass: ${noteCharacter(layer)}`, side, "perf-need");
			const bar = el("div", undefined, side, "perf-meter");
			bar.setAttribute("aria-hidden", "true");
			const zone = el("i", undefined, bar, "perf-zone");
			zone.style.left = `${zones[pass] - 9}%`;
			const needle = el("b", undefined, bar, "perf-needle");
			needle.style.left = `${timing.pos}%`;
			const row = el("div", undefined, side, "perf-steps");
			button(timing.running ? "Stop" : pass ? "Start the next pass" : "Start blending", timing.running ? "stopBlend" : "startBlend", row, undefined, {
				cls: "perf-primary perf-blend-go",
			});
			if (!timing.running) button("Quick blend (average result)", "gentle", row);
			const feedback = el("p", timing.last || "Press Start, then press Stop when the marker is inside the gold band.", side, "perf-hint");
			feedback.setAttribute("aria-live", "polite");
			renderLiquid(side, c);
			foot(panel, "notes", null);
		}
		function noteCharacter(l) {
			const ids = Object.keys(d.formula[l]);
			if (!ids.length) return "this note is empty, so any timing works.";
			const v = ids.reduce((a, id) => a + m.material(id).volatility, 0) / ids.length;
			const p = ids.reduce((a, id) => a + m.material(id).persistence, 0) / ids.length;
			return `${ids.map(id => label(id).title).join(", ")}, ${v > 0.6 ? "light and quick" : p > 0.6 ? "rich and lasting" : "in between"}.`;
		}
		function startTiming() {
			timing.running = true;
			timing.start = performance.now();
			/* Each pass is a little faster. Reduced motion slows it right down instead of removing it. */
			const period = (reduced ? 1600 : 620) - timing.scores.length * 60;
			renderBlend();
			root.classList.add("perf-blending");
			const needle = panels.blend.querySelector(".perf-needle");
			const step = now => {
				if (!timing.running || !needle.isConnected) return;
				timing.pos = (Math.sin((now - timing.start) / period - Math.PI / 2) + 1) * 50;
				needle.style.left = `${timing.pos}%`;
				timing.raf = requestAnimationFrame(step);
			};
			timing.raf = requestAnimationFrame(step);
		}
		function stopTiming() {
			cancelAnimationFrame(timing.raf);
			timing.running = false;
			root.classList.remove("perf-blending");
			const pass = timing.scores.length;
			const score = passScore(timing.pos, pass);
			timing.scores.push(score);
			timing.last = `${passes[pass][0]}: ${score >= 0.85 ? "perfect timing" : score >= 0.5 ? "close" : "missed the band"}.`;
			if (timing.scores.length === 3) {
				blending = 0.35 + (timing.scores.reduce((a, b) => a + b, 0) / 3) * 0.6;
				blended = JSON.stringify(d.formula);
			}
		}

		/* Bottle: one checklist with a way to fix each gap, then a preview and the only spending button. */
		function renderBottle() {
			const panel = panels.bottle;
			for (const child of [...panel.children]) if (child !== results) child.remove();
			if (result) return;
			results.replaceChildren();
			const c = check();
			const top = el("div", undefined, null);
			panel.insertBefore(top, results);
			head(top, "bottle", null);
			if (c.lacks.length) {
				el("h4", c.lacks.length === 1 ? "One thing left before bottling" : "Before bottling", top);
				const list = el("ul", undefined, top, "perf-checklist");
				for (const lack of c.lacks) {
					const li = el("li", undefined, list, "perf-missing");
					el("span", lack.text, li, "perf-lack");
					if (lack.fix) button(lack.fix[0], lack.fix[1] === "liquid" ? "openLiquid" : "tab", li, lack.fix[1] === "liquid" ? "blend" : lack.fix[1]);
				}
				return;
			}
			const p = safe(() => m.calculate(d.formula, blending));
			const bench = el("div", undefined, top, "perf-workbench perf-workbench-two");
			bottleStage(bench, p);
			const side = el("div", undefined, bench);
			if (p?.description) el("p", p.description, side);
			if (p) {
				const facts = el("dl", undefined, side, "perf-facts");
				const fact = (k, v) => {
					el("dt", k, facts);
					el("dd", v, facts);
				};
				fact("Quality", scoreWord(p.quality));
				fact("Strength", projectionWord(p.intensity));
				fact("Wears", hours(p.duration));
				fact("Ready", d.formula.age ? `in ${plural(d.formula.age, "day")}` : "Straight away");
			}
			const cost = el("div", undefined, side, "perf-costs");
			el("h4", "Bottling uses", cost);
			const ul = el("ul", undefined, cost);
			el("li", `1 empty bottle (you have ${s.containers})`, ul);
			el("li", `${c.cost.solvent} ${d.formula.solvent} spirit (you have ${s.solvent[d.formula.solvent]})`, ul);
			for (const [id, n] of Object.entries(c.cost.needed)) el("li", `${n} × ${label(id).title} aroma`, ul);
			el("li", "20 minutes", ul);
			button("Bottle the perfume", "craft", side, undefined, { cls: "perf-primary perf-big" });
		}
		function renderResult(bottle) {
			const p = api.properties(bottle);
			const panel = panels.bottle;
			for (const child of [...panel.children]) if (child !== results) child.remove();
			results.replaceChildren();
			const head = el("div", undefined, results, "perf-result-head");
			head.append(setup.perfumeryIcons.render(bottle.icon, bottle.name));
			const nameBox = el("div", undefined, head);
			el("h3", bottle.name, nameBox);
			const rename = el("label", undefined, nameBox, "perf-rename");
			el("span", "Rename", rename);
			const input = el("input", undefined, rename);
			Object.assign(input, { value: bottle.name, maxLength: 48 });
			input.dataset.rename = bottle.id;
			const row = el("div", undefined, results, "perf-steps");
			const wear = button(api.ready(bottle) ? "Wear it now" : "Maturing, can't wear yet", "apply", row, bottle.id, { cls: "perf-primary" });
			wear.disabled = !api.ready(bottle) || !api.enabled();
			button("Save the formula", "save", row, bottle.id);
			button("Make another", "again", row);
			if (p.description) el("p", p.description, results);
			const facts = el("dl", undefined, results, "perf-facts");
			const fact = (k, v) => {
				el("dt", k, facts);
				el("dd", v, facts);
			};
			if (p.phases) {
				fact("Opening", p.phases.opening.replace(/^[^:]+: /, ""));
				fact("Heart", p.phases.heart.replace(/^[^:]+: /, ""));
				fact("Base", p.phases.drydown.replace(/^[^:]+: /, ""));
			}
			const good = (p.nuances || []).filter(k => !setup.perfumeryIdentity.negative[k]).slice(0, 3);
			const bad = (p.offNotes || []).map(o => o.name).slice(0, 2);
			if (good.length) fact("Strengths", good.join(", "));
			if (bad.length) fact("Flaws", bad.join(", "));
			fact("Pleasantness", `${scoreWord(p.pleasantness)}${knowledge >= 3 ? ` (${Math.round(p.pleasantness)})` : ""}`);
			fact("Quality", `${scoreWord(p.quality)}${knowledge >= 3 ? ` (${Math.round(p.quality)})` : ""}`);
			fact("Strength", projectionWord(p.intensity));
			fact("Wears", hours(p.duration));
			fact("Applications", String(bottle.uses));
			fact("Ready", api.ready(bottle) ? "Now" : `In ${Math.ceil((bottle.made + bottle.formula.age * 86400 - V.timeStamp) / 3600)} hours`);
			if (V.perfumeryVenue === "poppy" && api.availableTeacher()) el("p", api.feedback(bottle), results, "perf-poppy");
			if (V.perfumery.characters?.poppy?.pending?.bottleId === bottle.id) {
				el("p", "Poppy doesn't hand the strip back. It looks like there is something to talk about.", results, "perf-poppy");
				$(results).wiki("<<link [[Discuss this bottle|Poppy Perfumery Special]]>><</link>>");
			}
			if (s.session?.stage === "review" && s.session.bottleId === bottle.id) {
				el("p", "Keep this sample for your comparison with Poppy. If Poppy is busy, you can show it later.", results, "perf-poppy");
				$(results).wiki("<<link [[Discuss the sample|Poppy Perfumery Debrief]]>><</link>>");
			}
		}

		/* Cabinet and journal: their own page, reached by a link under the table. */
		function describe(p) {
			if (p.description) return `${p.description} ${projectionWord(p.intensity)}; wears ${hours(p.duration)}.`;
			return `${p.family} fragrance. ${projectionWord(p.intensity)}; wears ${hours(p.duration)}.`;
		}
		function renderInventory() {
			const teacherPresent = V.perfumeryVenue === "poppy" && api.availableTeacher();
			const canCompose = api.access();
			cabinet.replaceChildren();
			journal.replaceChildren();
			el("h3", `Bottles (${s.bottles.length}/24)`, cabinet);
			if (!s.bottles.length) el("p", "Your cabinet is empty. Bottled perfumes appear here.", cabinet);
			for (const b of s.bottles) {
				const row = el("details", undefined, cabinet, "perf-bottle");
				const sum = el("summary", undefined, row);
				sum.append(setup.perfumeryIcons.render(setup.perfumeryIcons.forBottle(b), b.name));
				el(
					"span",
					`${b.name} · ${plural(b.uses, "use")} · ${api.ready(b) ? "ready" : `${Math.ceil((b.made + b.formula.age * 86400 - V.timeStamp) / 3600)} h maturing`}`,
					sum
				);
				el("p", describe(api.properties(b)), row);
				const rename = el("label", undefined, row, "perf-rename");
				el("span", "Rename", rename);
				const name = el("input", undefined, rename);
				Object.assign(name, { value: b.name, maxLength: 48 });
				name.dataset.rename = b.id;
				const actions = el("div", undefined, row, "perf-steps");
				button("Wear", "apply", actions, b.id).disabled = !api.ready(b) || b.uses < 1 || !api.enabled();
				button("Save formula", "save", actions, b.id);
				if (canCompose) Wikifier.createInternalLink(actions, "Perfumery Workstation", "Copy into the draft", () => load(b.formula));
				if (typeof pocketPerfumePack === "function") button(b.packed ? "Leave it here" : `Put in your ${pocketBagName()}`, "carry", actions, b.id);
				if (teacherPresent) button("Offer to Poppy (5 min)", "gift", actions, b.id);
				button("Discard", "discard", actions, b.id).disabled = s.session?.stage === "review" && s.session.bottleId === b.id;
			}
			el("h3", `Formulas (${s.journal.length}/32)`, journal);
			if (!s.journal.length) el("p", "Save a bottle's formula to make it again later.", journal);
			s.journal.forEach((entry, i) => {
				const row = el("details", undefined, journal, "perf-bottle");
				const sum = el("summary", undefined, row);
				sum.append(setup.perfumeryIcons.render(setup.perfumeryIcons.forBottle(entry), entry.name));
				el("span", `${entry.name} · best ${scoreWord(entry.best).toLowerCase()}`, sum);
				el("p", api.notes(entry.formula), row);
				el(
					"p",
					`${entry.formula.concentration}% aroma, ${entry.formula.solvent} spirit, ${entry.formula.capacity}-measure bottle, ${plural(
						entry.formula.age,
						"day"
					)} maturing. Made ${plural(entry.attempts, "time")}.`,
					row
				);
				const rename = el("label", undefined, row, "perf-rename");
				el("span", "Rename", rename);
				const name = el("input", undefined, rename);
				Object.assign(name, { value: entry.name, maxLength: 48 });
				name.dataset.journalRename = i;
				const actions = el("div", undefined, row, "perf-steps");
				if (canCompose) Wikifier.createInternalLink(actions, "Perfumery Workstation", "Load as draft", () => load(entry.formula));
				button("Remove", "forget", actions, i);
			});
		}

		function renderAll() {
			if (!station) return renderInventory();
			renderProgress();
			if (d.tab === "prepare") renderPrepare();
			if (d.tab === "notes") renderNotes();
			if (d.tab === "blend") renderBlend();
			if (d.tab === "bottle" && !result) renderBottle();
		}
		function edited() {
			cancelAnimationFrame(timing.raf);
			Object.assign(timing, { scores: [], running: false, pos: 0, last: "" });
			root.classList.remove("perf-blending");
			blending = null;
			blended = "";
		}
		function remember() {
			d.undo.push(m.copy(d.formula));
			if (d.undo.length > 10) d.undo.shift();
		}
		/* Loading a formula from the cabinet page puts it in the draft and opens the table. */
		function load(f) {
			if (!station) {
				draft ??= freshDraft();
				draft.formula = m.copy(f);
				draft.tab = "notes";
				return;
			}
			remember();
			d.formula = m.copy(f);
			edited();
			notice("Formula loaded into your draft. Nothing has been used.");
			d.tab = "notes";
			renderAll();
		}
		function add(id, note) {
			if (!m.material(id) || !m.layers.includes(note)) return;
			if (used(id) >= (s.extraction.stock[id] || 0)) throw new Error("No more of that aroma left.");
			if (((units(d.formula) + 1) * 100) / d.formula.concentration > d.formula.capacity)
				throw new Error("The bottle is full at this strength. In Blend, choose a bigger bottle or a stronger mix.");
			remember();
			d.formula[note][id] = (d.formula[note][id] || 0) + 1;
			edited();
			notice(`Added ${label(id).title} to the ${note} note (${plural(d.formula[note][id], "measure")}).`);
		}
		const focusAfter = selector => root.querySelector(selector)?.focus({ preventScroll: true });

		root.addEventListener(
			"click",
			event => {
				const b = event.target.closest("button[data-action]");
				if (!b || !root.contains(b) || b.disabled) return;
				const action = b.dataset.action;
				const id = b.dataset.id;
				const layer = b.dataset.layer;
				let focus = null;
				try {
					if (action === "tab") {
						d.tab = id;
						focus = `#perf-tab-${id}`;
					}
					if (action === "openLiquid") {
						d.tab = "blend";
						liquidOpen = true;
						focus = "[data-liquid] summary";
					}
					if (action === "layer") {
						d.layer = id;
						focus = `[data-action="layer"][data-id="${id}"]`;
					}
					if (action === "add") {
						add(id, d.layer);
						focus = `.perf-tiles [data-action="add"][data-id="${CSS.escape(id)}"]`;
					}
					if (action === "plus") {
						add(id, layer);
						focus = `[data-action="plus"][data-id="${CSS.escape(id)}"][data-layer="${layer}"]`;
					}
					if (action === "minus" || action === "remove") {
						remember();
						if (action === "remove" || --d.formula[layer][id] <= 0) delete d.formula[layer][id];
						edited();
						focus = d.formula[layer][id]
							? `[data-action="minus"][data-id="${CSS.escape(id)}"][data-layer="${layer}"]`
							: `[data-action="layer"][data-id="${layer}"]`;
					}
					if (action === "undo" && d.undo.length) {
						d.formula = d.undo.pop();
						edited();
						notice("Undone.");
					}
					if (action === "page") {
						d.page += Number(id);
						focus = `.perf-pager [data-action="page"][data-id="${id}"]`;
					}
					if (action === "extractSource") {
						d.tab = "prepare";
						renderAll();
						extractionUI?.choose(id);
						return;
					}
					if (action === "sample") return load(s.lessonSample);
					if (action === "reference") return load(s.session.reference);
					if (action === "defaults") {
						Object.assign(d.formula, { solvent: "clear", concentration: 20, capacity: 40, age: 0 });
						edited();
						liquidOpen = true;
					}
					if (action === "pin") {
						m.validate(d.formula);
						d.pinned = m.copy(d.formula);
						notice("Remembered. Change something, then read the comparison.");
						liquidOpen = true;
					}
					if (action === "swap" && d.pinned) {
						const previous = m.copy(d.formula);
						d.formula = m.copy(d.pinned);
						d.pinned = previous;
						edited();
						liquidOpen = true;
					}
					if (action === "startBlend") {
						startTiming();
						return focusAfter(".perf-blend-go");
					}
					if (action === "stopBlend") {
						stopTiming();
						focus = blending === null ? ".perf-blend-go" : ".perf-stage-foot .perf-primary";
					}
					if (action === "gentle") {
						edited();
						blending = 0.55;
						blended = JSON.stringify(d.formula);
						timing.last = "Quick blend: a modest, even finish.";
						focus = ".perf-stage-foot .perf-primary";
					}
					if (action === "reblend") edited();
					if (action === "craft") {
						b.disabled = true;
						if (blending === null || blended !== JSON.stringify(d.formula)) throw new Error("Blend the current formula before bottling.");
						result = api.craft(d.formula, blending, serial);
						const kept = { ...freshDraft(), filters: d.filters, layer: d.layer };
						Object.assign(d, kept, { tab: "bottle" });
						renderProgress();
						renderResult(result);
						notice(`Bottled ${result.name}. The aromas, spirit and a bottle were used; 20 minutes passed.`);
						focusAfter(".perf-result-head h3");
						return;
					}
					if (action === "again") {
						result = null;
						serial = s.serial;
						edited();
						d.tab = stockLeft() ? "notes" : "prepare";
						notice("Fresh draft. Your last bottle is in the cabinet.");
					}
					if (action === "apply") {
						api.apply(Number(id));
						notice("You put on the perfume. It replaces any previous scent.");
						if (station) {
							b.disabled = true;
							return;
						}
					}
					if (action === "save") {
						api.saveFormula(Number(id));
						notice("Formula saved.");
						if (station) return;
					}
					if (action === "forget") s.journal.splice(Number(id), 1);
					if (action === "discard") {
						s.bottles = s.bottles.filter(x => x.id !== Number(id));
						notice("Bottle discarded.");
					}
					if (action === "gift") notice(api.gift(Number(id)));
					if (action === "carry") {
						const bottle = s.bottles.find(x => x.id === Number(id));
						const packing = !bottle.packed;
						if (!pocketPerfumePack(bottle.id, packing)) notice("There's no room for it. Each kind of thing takes one slot in your pocket or bag.");
						else notice(packing ? `${bottle.name} is in your ${pocketBagName()}. Wear it from the POCKET menu.` : `${bottle.name} is back in the cabinet.`);
					}
					renderAll();
					if (focus) focusAfter(focus);
				} catch (error) {
					notice(error.message);
					if (action === "craft") b.disabled = false;
				}
			},
			{ signal }
		);
		/* Search filters as you type without rebuilding the filter controls, so the mobile keyboard stays open. */
		root.addEventListener(
			"input",
			event => {
				const t = event.target;
				if (t.dataset.filter === "q") {
					d.filters.q = t.value;
					d.page = 0;
					renderCards(root.querySelector(".perf-tiles"));
				}
				if (t.dataset.control === "concentration") {
					d.formula.concentration = Number(t.value);
					edited();
					const label = t.closest("label").querySelector(".perf-range-value");
					label.textContent = `${concentrationWord(Number(t.value))} (${t.value}% aroma)`;
					t.setAttribute("aria-valuetext", `${concentrationWord(Number(t.value))}, ${t.value}%`);
					renderProgress();
				}
			},
			{ signal }
		);
		root.addEventListener(
			"change",
			event => {
				const t = event.target;
				try {
					if (t.dataset.filter && t.dataset.filter !== "q") {
						d.filters[t.dataset.filter] = t.type === "checkbox" ? t.checked : t.value;
						d.page = 0;
						renderCards(root.querySelector(".perf-tiles"));
						return;
					}
					if (t.dataset.move) {
						const id = t.dataset.move;
						const from = t.dataset.from;
						if (m.layers.includes(t.value) && t.value !== from) {
							remember();
							d.formula[t.value][id] = (d.formula[t.value][id] || 0) + d.formula[from][id];
							delete d.formula[from][id];
							edited();
							notice(`Moved ${label(id).title} to the ${t.value} note. It now shows at a different time.`);
							renderAll();
							focusAfter(`[data-move="${CSS.escape(id)}"][data-from="${t.value}"]`);
						}
						return;
					}
					if (t.dataset.control) {
						if (t.dataset.control !== "concentration") {
							d.formula[t.dataset.control] = t.dataset.control === "solvent" ? t.value : Number(t.value);
							edited();
						}
						liquidOpen = true;
						renderAll();
						focusAfter(t.dataset.control === "concentration" ? '[data-control="concentration"]' : `[name="${t.name}"][value="${t.value}"]`);
						return;
					}
					if (t.dataset.journalRename !== undefined) {
						const entry = s.journal[Number(t.dataset.journalRename)];
						if (entry) entry.name = t.value.trim().slice(0, 48) || "Untitled formula";
					}
					if (t.dataset.rename) {
						const bottle = s.bottles.find(x => x.id === Number(t.dataset.rename));
						if (bottle) bottle.name = t.value.trim().slice(0, 48) || m.calculate(bottle.formula).name;
						if (result && bottle === result) root.querySelector(".perf-result-head h3").textContent = bottle.name;
					}
				} catch (error) {
					notice(error.message);
				}
			},
			{ signal }
		);
		root.addEventListener(
			"toggle",
			event => {
				if (event.target.dataset?.liquid) liquidOpen = event.target.open;
			},
			{ signal, capture: true }
		);
		/* Arrow keys move between the steps, as screen-reader users expect from a tablist. */
		root.addEventListener(
			"keydown",
			event => {
				if (!event.target.matches?.(".perf-step") || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
				const order = stages.map(x => x[0]);
				const i = order.indexOf(d.tab) + (event.key === "ArrowRight" ? 1 : -1);
				d.tab = order[(i + order.length) % order.length];
				renderAll();
				focusAfter(`#perf-tab-${d.tab}`);
				event.preventDefault();
			},
			{ signal }
		);
		/* Desktop drag and drop is optional; tapping a tile does the same thing. */
		root.addEventListener(
			"dragstart",
			event => {
				const tile = event.target.closest(".perf-tile[draggable='true']");
				if (tile) event.dataTransfer.setData("text/plain", tile.dataset.id);
			},
			{ signal }
		);
		root.addEventListener(
			"dragover",
			event => {
				if (event.target.closest("[data-drop]")) event.preventDefault();
			},
			{ signal }
		);
		root.addEventListener(
			"drop",
			event => {
				const tray = event.target.closest("[data-drop]");
				if (!tray) return;
				event.preventDefault();
				try {
					add(event.dataTransfer.getData("text/plain"), tray.dataset.drop);
					renderAll();
				} catch (e) {
					notice(e.message);
				}
			},
			{ signal }
		);
		renderAll();
	}
	function dispose() {
		setup.perfumeryLab?.dispose();
		const run = cleanup;
		cleanup = () => {};
		run();
	}
	setup.perfumeryUI = {
		dispose,
		/* Bottling or "Make another" clears it; tests and the debug page can also reset it. */
		resetDraft: () => {
			draft = null;
		},
		draft: () => draft,
	};
	$(document).off(":passageinit.perfumery").on(":passageinit.perfumery", dispose);
	$(document).on(":onloadsave.perfumery", () => {
		dispose();
		draft = null;
	});
	if (Macro.has("perfumeryUI")) Macro.delete("perfumeryUI");
	Macro.add("perfumeryUI", {
		handler() {
			if (!setup.perfumery.enabled()) return;
			const root = document.createElement("div");
			root.className = "perfumery no-numberify";
			root.dataset.mode = this.args[0];
			this.output.append(root);
			queueMicrotask(() => {
				if (root.isConnected) mount(root);
			});
		},
	});
})();
