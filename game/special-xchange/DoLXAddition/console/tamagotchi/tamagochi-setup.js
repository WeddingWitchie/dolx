/* globals Tamagotchi */
/* Virtual pet artwork and animation. Never changes game state: battle rounds are observed by wrapping Tamagotchi's
 * battle calls and replayed once the next passage shows. Timeouts are cleared on every passage change. */
(() => {
	const STROKE = 2.6;
	const cache = new Map();
	const forms = () => setup.petForms;

	/* ---- colour helpers (mirror bosses swap the palette rather than redrawing) ---- */
	function hexToHsl(hex) {
		const n = parseInt(hex.slice(1), 16);
		const r = ((n >> 16) & 255) / 255;
		const g = ((n >> 8) & 255) / 255;
		const b = (n & 255) / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2;
		if (max === min) return [0, 0, l];
		const d = max - min;
		const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
		return [h * 60, s, l];
	}
	function hslToHex(h, s, l) {
		const f = n => {
			const k = (n + h / 30) % 12;
			const a = s * Math.min(l, 1 - l);
			const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
			return Math.round(c * 255)
				.toString(16)
				.padStart(2, "0");
		};
		return "#" + f(0) + f(8) + f(4);
	}
	/* The blood-moon mirror: the same creature in shadowed violet, with crimson eyes. */
	function mirrorPalette(p) {
		const out = {};
		for (const [key, value] of Object.entries(p)) {
			if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
				out[key] = value;
				continue;
			}
			const [h, s, l] = hexToHsl(value);
			const hue = h + (((285 - h + 540) % 360) - 180) * 0.7;
			out[key] = hslToHex((hue + 360) % 360, s * 0.7, l * 0.5 + 0.06);
		}
		out.o = "#12061a";
		out.eye = "#ff2950";
		return out;
	}

	/* ---- the drawing kit handed to every form's draw() ---- */
	function kit(p) {
		const line = `stroke="${p.o}" stroke-width="${STROKE}" stroke-linejoin="round" stroke-linecap="round"`;
		const k = {
			p,
			P: (d, fill) => `<path d="${d}" fill="${fill}" ${line}/>`,
			E: (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${line}/>`,
			F: (d, fill, opacity) => `<path d="${d}" fill="${fill}"${opacity == null ? "" : ` opacity="${opacity}"`}/>`,
			FE: (cx, cy, rx, ry, fill, opacity) =>
				`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${opacity == null ? "" : ` opacity="${opacity}"`}/>`,
			L: (d, colour = p.o, width = 2.2) =>
				`<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
			g: (cls, origin, inner, delay) => `<g class="${cls}" style="transform-origin:${origin}${delay ? `;animation-delay:${delay}s` : ""}">${inner}</g>`,
			shine: (cx, cy, rx, ry) => k.FE(cx, cy, rx, ry, "#fff", 0.35),
			blush: (cx, cy) => k.FE(cx, cy, 4, 2.4, "#ff6f8a", 0.45),
			/* Eyes blink as a group. brow tilts a brow above: negative lowers its front end, positive its back end.
			 * glow: a bright eye with a dark pupil (wild things, Oakguard). slit: the golem's visor lights. */
			eye(x, y, r, o = {}) {
				let open;
				if (o.slit) open = `<rect x="${x - r * 1.3}" y="${y - r * 0.45}" width="${r * 2.6}" height="${r * 0.9}" rx="${r * 0.4}" fill="${p.eye}"/>`;
				else if (o.glow)
					open =
						k.FE(x, y, r, r * 1.1, p.eye) + k.FE(x + r * 0.15, y, r * 0.42, r * 0.62, "#140c10") + k.FE(x + r * 0.35, y - r * 0.4, r * 0.25, r * 0.25, "#fff");
				else
					open =
						k.FE(x, y, r, r * 1.18, p.eye) +
						k.FE(x + r * 0.32, y - r * 0.42, r * 0.42, r * 0.42, "#fff") +
						k.FE(x - r * 0.3, y + r * 0.42, r * 0.18, r * 0.18, "#fff");
				const brow = o.brow ? k.L(`M${x - r * 1.1} ${y - r * 1.55 + o.brow * 1.1} L${x + r * 1.1} ${y - r * 1.55 - o.brow * 1.1}`, p.o, 2) : "";
				const shut = `<path class="pa-eye-shut" d="M${x - r} ${y} Q${x} ${y + r * 0.8} ${x + r} ${y}" fill="none" stroke="${
					p.o
				}" stroke-width="2" stroke-linecap="round"/>`;
				/* Happy eyes (healing, cheering): upturned arcs in place of the open eye. */
				const happy = o.slit
					? ""
					: `<path class="pa-eye-happy" d="M${x - r} ${y + r * 0.35} Q${x} ${y - r * 0.95} ${x + r} ${y + r * 0.35}" fill="none" stroke="${
							p.o
					  }" stroke-width="2.2" stroke-linecap="round"/>`;
				return `<g class="pa-eye" style="transform-origin:50% 50%"><g class="pa-eye-open">${open}</g>${shut}${happy}</g>${brow}`;
			},
		};
		return k;
	}

	/* ---- resolving a creature key ("pet:embit", "mirror:embit", "golem:fire", "wild:Tidemaw") ---- */
	function resolve(key) {
		const F = forms();
		const [kind, id] = String(key).split(":");
		if (kind === "golem") {
			const glow = F.runeColour[id] || F.runeColour.normal;
			return { def: F.golem, p: { ...F.golem.palette, rune: glow, eye: glow }, fx: id in F.runeColour ? id : "normal" };
		}
		if (kind === "wild") {
			const def = F.wild[id] || Object.values(F.wild)[0];
			return { def, p: def.palette, fx: def.type };
		}
		const def = F.pets[id] || F.pets.embit;
		if (kind === "mirror") return { def, p: mirrorPalette(def.palette), fx: def.type, mirror: true };
		return { def, p: def.palette, fx: def.type };
	}

	/* Shared extras placed relative to the creature's head: sleep marks, a sick drop, and the mirror boss's horns. */
	function extras(def, p, mirror) {
		const h = def.head;
		const zx = Math.min(108, h.x + h.r * 0.6);
		const zy = Math.max(10, h.y - h.r * 1.1);
		let out =
			`<g class="pa-zzz"><path d="M${zx} ${zy} h7 l-7 7 h7" fill="none" stroke="#9fc4ff" stroke-width="2" stroke-linejoin="round"/>` +
			`<path d="M${zx + 9} ${zy - 9} h5 l-5 5 h5" fill="none" stroke="#9fc4ff" stroke-width="1.6" stroke-linejoin="round"/></g>` +
			`<path class="pa-sick" d="M${h.x - h.r * 0.75} ${h.y - h.r * 0.9} c-3 5 -3 8 0 8 c3 0 3 -3 0 -8 z" fill="#9fe0ff" stroke="${p.o}" stroke-width="1.4"/>`;
		if (mirror) {
			const x = h.x;
			const y = h.y - h.r * 0.75;
			/* Swept horns, curving outward from the brow. */
			const horn = side => {
				const bx = x + side * h.r * 0.42;
				return `<path d="M${bx - 4.5} ${y + 3} C${bx - 4} ${y - 6} ${bx + side * 3} ${y - 13} ${bx + side * 11} ${y - 18} C${bx + side * 7} ${y - 9} ${
					bx + side * 5
				} ${y - 4} ${bx + 4.5} ${y + 3} Z" fill="#d8c4e4" stroke="#12061a" stroke-width="1.8" stroke-linejoin="round"/>`;
			};
			out += horn(-1) + horn(1);
		}
		return out;
	}

	function svg(key) {
		if (cache.has(key)) return cache.get(key);
		const { def, p, mirror } = resolve(key);
		const aura = mirror
			? `<g class="pa-aura" style="transform-origin:50% 50%"><path d="M60 8 L70 30 L94 18 L88 44 L114 50 L92 66 L108 88 L82 86 L80 110 L60 94 L40 110 L38 86 L12 88 L28 66 L6 50 L32 44 L26 18 L50 30 Z" fill="#c4163a" opacity="0.28"/></g>`
			: "";
		const out =
			`<svg class="pa-svg" viewBox="-4 -6 128 128" aria-hidden="true" focusable="false">` +
			`<ellipse class="pa-shadow" cx="60" cy="109" rx="30" ry="4.5" fill="#000" opacity="0.18"/>${aura}` +
			`<g class="pa-rig"><g class="pa-mood" style="transform-origin:50% 100%">${def.draw(kit(p))}</g>${extras(def, p, mirror)}</g></svg>`;
		cache.set(key, out);
		return out;
	}

	const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

	/* A creature as HTML. size: icon, card, pick, battle, boss, evolve. state: a pa--<state> class (sleep, sick, down, cheer). */
	function html(key, o = {}) {
		const r = resolve(key);
		const cls = ["pa", "pa--" + (o.size || "card")];
		if (o.state) cls.push("pa--" + o.state);
		if (o.flip) cls.push("pa--flip");
		if (o.still) cls.push("pa--still");
		/* Which creature it is, for its own idle personality in pet-art.css (pa--f-embit, pa--f-golem, pa--f-tidemaw...). */
		const [kind, id] = String(key).split(":");
		cls.push("pa--f-" + (kind === "golem" ? "golem" : String(id || "").toLowerCase()));
		if (kind === "mirror") cls.push("pa--mirror");
		const scale = o.scale && o.scale !== 1 ? ` style="--pa-scale:${o.scale}"` : "";
		return `<div class="${cls.join(" ")}" data-pa="${esc(key)}" data-fx="${r.fx}"${scale} aria-hidden="true">${svg(key)}<div class="pa-fx"></div></div>`;
	}

	/* ---- keys for game objects ---- */
	const petKey = species => "pet:" + (forms().pets[species] ? species : "embit");
	function enemyKey(e) {
		if (!e) return "wild:";
		if (e.kind === "boss") {
			const base = String(e.name || "").replace(/^Mirror /, "");
			const id = Object.keys(forms().pets).find(k => forms().pets[k].name === base) || (V.tamagotchi && V.tamagotchi.species);
			return "mirror:" + (forms().pets[id] ? id : "embit");
		}
		if (e.kind === "miniboss") return "golem:" + e.type;
		const named = forms().wild[e.name];
		if (named) return "wild:" + e.name;
		return "wild:" + (Object.keys(forms().wild).find(k => forms().wild[k].type === e.type) || "");
	}

	/* ---- page pieces called from the passages ---- */
	const stageScale = { baby: 0.8, child: 0.87, teen: 0.94 };
	/* The status card's portrait: idle, asleep or unwell; starters grow a little with age. */
	function portrait(t) {
		if (!t) return "";
		const state = Tamagotchi.isSleeping() ? "sleep" : t.sick ? "sick" : "";
		const scale = t.evolved ? 1 : stageScale[Tamagotchi.stage()] || 1;
		return `<div class="tama-portrait">${html(petKey(t.species), { size: "card", state, scale })}</div>`;
	}
	const pick = id => html(petKey(id), { size: "pick" });
	const icon = id => html(petKey(id), { size: "icon", still: true });

	/* The battle: both creatures facing each other above the game's own HP and MP bars. */
	function battleStage() {
		install();
		const b = Tamagotchi.battleState();
		if (!b || !V.tamagotchi) return Tamagotchi.battleHtml();
		const big = b.enemy.kind === "boss" || b.enemy.kind === "miniboss";
		const petState = b.over ? (b.result === "win" ? "cheer" : "down") : "";
		const foeState = b.over && b.result === "win" ? "down" : "";
		return (
			`<div class="pa-battle"><div class="pa-stage pa-stage--${esc(b.enemy.kind || "wild")}">` +
			(b.enemy.kind === "boss" ? `<div class="pa-moon"></div>` : "") +
			`<div class="pa-slot pa-slot--pet">${html(petKey(V.tamagotchi.species), { size: "battle", state: petState })}</div>` +
			`<div class="pa-slot pa-slot--foe">${html(enemyKey(b.enemy), { size: big ? "boss" : "battle", flip: true, state: foeState })}</div>` +
			`<button type="button" class="pa-skip" hidden>Skip animation</button></div>` +
			Tamagotchi.battleHtml() +
			`</div>`
		);
	}

	/* The evolution: shown in its new form, and animated from the old one when motion is allowed. */
	function evolution() {
		const t = V.tamagotchi;
		const def = t && forms().pets[t.species];
		if (!def || !def.from) return "";
		return (
			`<div class="pa-evolve" data-from="pet:${def.from}" data-to="pet:${t.species}">` +
			html("pet:" + t.species, { size: "evolve" }) +
			`<button type="button" class="pa-skip" hidden>Skip animation</button></div>`
		);
	}

	/* ---- observing battle rounds ---- */
	let lastRound = null;
	let installed = false;
	function snap() {
		const b = Tamagotchi.battleState();
		const pet = V.tamagotchi;
		if (!b || !pet) return null;
		return {
			name: pet.name,
			species: pet.species,
			hp: b.hp,
			maxHp: b.maxHp,
			mp: b.mp,
			maxMp: b.maxMp,
			ehp: b.enemy.hp,
			emax: b.enemy.maxHp,
			heals: b.enemy.healsLeft || 0,
			eRevived: !!b.enemy.reviveUsed,
			revived: !!b.reviveUsed,
			backup: !!b.usedBackup,
			turn: b.turn,
			over: b.over,
			result: b.result,
			kind: b.enemy.kind,
			log: Array.isArray(b.log) ? b.log.slice() : [],
		};
	}
	function install() {
		if (installed || typeof Tamagotchi === "undefined") return;
		installed = true;
		const wrap = (name, describe) => {
			const fn = Tamagotchi[name];
			Tamagotchi[name] = function (...args) {
				const action = describe(...args);
				const before = snap();
				const result = fn.apply(this, args);
				const after = snap();
				lastRound = before && after && after.turn !== before.turn ? { action, before, after } : null;
				return result;
			};
		};
		wrap("battleAttack", () => ({ kind: "attack", type: "normal" }));
		wrap("battleGuard", () => ({ kind: "guard" }));
		wrap("battleRest", () => ({ kind: "heal" }));
		wrap("battleSkill", id => {
			const s = Tamagotchi.battleSkills().find(skill => skill.id === id);
			return s && s.heal ? { kind: "heal" } : { kind: "attack", type: s ? s.type : "normal" };
		});
	}

	/* An enemy move's element, read from its name in the battle log. */
	const moveTypes = {
		Ember: "fire",
		"Flame Burst": "fire",
		Inferno: "fire",
		Bubble: "water",
		"Aqua Pulse": "water",
		Tsunami: "water",
		"Vine Whip": "grass",
		"Leaf Storm": "grass",
		"Solar Beam": "grass",
		Spark: "electric",
		Thunderbolt: "electric",
		"Volt Crash": "electric",
	};
	function moveType(name) {
		const blast = /^(\w+) Blast$/.exec(name || "");
		if (blast) return blast[1].toLowerCase();
		return moveTypes[name] || "normal";
	}
	const firstNumber = (line, re) => {
		const m = re.exec(line || "");
		return m ? Number(m[1]) : 0;
	};

	/* ---- timelines ---- */
	let timers = [];
	let finishNow = null;
	const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
	function at(ms, fn) {
		timers.push(setTimeout(fn, ms));
	}
	function cancel() {
		for (const id of timers) clearTimeout(id);
		timers = [];
		finishNow = null;
	}
	const TRANSIENT = ["attack", "hurt", "charge", "revive", "enter", "boss-enter", "evolving", "evolved", "happy"];
	function state(el, name, ms) {
		if (!el) return;
		el.classList.add("pa--" + name);
		if (ms) at(ms, () => el.classList.remove("pa--" + name));
	}
	function clearStates(el) {
		if (el) el.classList.remove(...TRANSIENT.map(s => "pa--" + s), "pa--down", "pa--cheer");
	}
	function swapCreature(el, key) {
		if (!el) return;
		const svgEl = el.querySelector(".pa-svg");
		if (svgEl) svgEl.outerHTML = svg(key);
		el.dataset.pa = key;
		el.dataset.fx = resolve(key).fx;
	}

	/* A short burst of element particles over a creature. kind: fire, water, grass, electric, normal, heal, guard. */
	const particle = {
		fire: '<svg viewBox="0 0 10 14"><path d="M5 0 C9 5 10 9 5 14 C0 9 1 5 5 0Z" fill="#ff9a2a"/><path d="M5 6 C7 8 7 10 5 12 C3 10 3 8 5 6Z" fill="#fff07a"/></svg>',
		water:
			'<svg viewBox="0 0 10 14"><path d="M5 0 C9 6 10 9 5 14 C0 9 1 6 5 0Z" fill="#6cc8ff"/><path d="M3.5 8 C3.5 10 4 11 5 11.5" stroke="#e8f8ff" fill="none"/></svg>',
		grass: '<svg viewBox="0 0 14 10"><path d="M0 5 C4 -1 10 -1 14 5 C10 11 4 11 0 5Z" fill="#5fcf4a"/><path d="M1 5 L13 5" stroke="#2e7a22"/></svg>',
		electric: '<svg viewBox="0 0 10 14"><path d="M6 0 L1 8 L5 8 L3 14 L9 5 L5 5 Z" fill="#ffe23f" stroke="#8a6a00" stroke-width=".8"/></svg>',
		normal: '<svg viewBox="0 0 12 12"><path d="M6 0 L7.4 4.6 L12 6 L7.4 7.4 L6 12 L4.6 7.4 L0 6 L4.6 4.6Z" fill="#fff4c4"/></svg>',
		heal: '<svg viewBox="0 0 10 10"><path d="M3.5 0 H6.5 V3.5 H10 V6.5 H6.5 V10 H3.5 V6.5 H0 V3.5 H3.5Z" fill="#6ee08a"/></svg>',
		/* Grass pets heal with petals and leaves. */
		bloom:
			'<svg viewBox="0 0 12 12"><circle cx="6" cy="2.6" r="2.4" fill="#ffb3c8"/><circle cx="9.4" cy="6" r="2.4" fill="#ffb3c8"/><circle cx="6" cy="9.4" r="2.4" fill="#ffb3c8"/><circle cx="2.6" cy="6" r="2.4" fill="#ffb3c8"/><circle cx="6" cy="6" r="2" fill="#ffe36a"/></svg>',
	};
	function burst(el, kind) {
		const layer = el && el.querySelector(".pa-fx");
		if (!layer) return;
		const box = document.createElement("div");
		box.className = "pa-burst pa-burst--" + kind;
		if (kind === "guard") {
			box.innerHTML = "<i></i>";
		} else {
			const count = kind === "heal" || kind === "bloom" ? 5 : 7;
			for (let i = 0; i < count; i++) {
				const p = document.createElement("i");
				const angle = (360 / count) * i + (i % 2 ? 18 : -8);
				p.style.setProperty("--a", angle + "deg");
				p.style.setProperty("--d", 26 + (i % 3) * 8 + "px");
				p.innerHTML = kind === "bloom" && i % 2 ? particle.grass : particle[kind] || particle.normal;
				box.appendChild(p);
			}
		}
		layer.appendChild(box);
		setTimeout(() => box.remove(), 800);
	}

	function bars(stage) {
		const fighters = stage.parentElement.querySelectorAll(".tama-fighter");
		const pick = (i, j) => (fighters[i] ? fighters[i].querySelectorAll(".tama-bar")[j] || null : null);
		return { petHp: pick(0, 0), petMp: pick(0, 1), foeHp: pick(1, 0) };
	}
	function setBar(bar, cur, max) {
		if (!bar) return;
		const fill = bar.querySelector(".tama-bar-fill");
		const label = bar.querySelector(".tama-bar-label");
		cur = Math.max(0, Math.round(cur));
		if (fill) {
			fill.style.width = Math.max(0, Math.min(100, Math.round((cur / Math.max(1, max)) * 100))) + "%";
			if (!fill.classList.contains("mp")) {
				fill.classList.toggle("hp-low", cur <= max / 4);
				fill.classList.toggle("hp", cur > max / 4);
			}
		}
		if (label) label.textContent = cur + "/" + max;
	}

	function lock(stage, on) {
		const after = document.querySelector("#passages .pa-after");
		if (after) {
			after.inert = on;
			after.classList.toggle("pa-held", on);
		}
		stage.classList.toggle("pa-busy", on);
		const skip = stage.querySelector(".pa-skip");
		if (skip) skip.hidden = !on;
	}

	/* Plays a list of [ms, fn] steps, then finish(). Skipping (button, tap, Escape) jumps straight to finish(). */
	function run(stage, steps, end, finish) {
		cancel();
		lock(stage, true);
		const done = () => {
			cancel();
			finish();
			lock(stage, false);
		};
		finishNow = done;
		for (const [ms, fn] of steps) at(ms, fn);
		at(end, done);
		const skip = stage.querySelector(".pa-skip");
		if (skip) skip.onclick = () => finishNow && finishNow();
		stage.onclick = event => {
			if (event.target !== skip && finishNow) finishNow();
		};
	}

	/* Sound effects (console-sfx.js), played by the timeline at the moment each thing happens. */
	const sfx = name => setup.consoleSfx && setup.consoleSfx.play(name);
	const actionSound = action => (action.kind === "attack" ? "pet-hit-" + action.type : action.kind === "guard" ? "pet-guard" : "pet-heal");
	/* A round's sounds in order, for reduced motion (no timeline to hang them on). */
	function roundSounds(round, big) {
		const { before: B, after: A, action } = round;
		const list = [actionSound(action)];
		const foeLine = A.log.find(line => / uses .+ for \d+\./.test(line));
		if (!(A.over && A.result === "win")) {
			if (A.heals < B.heals) list.push("pet-heal");
			else if (foeLine) list.push(big ? "pet-boss-attack" : "pet-hit-" + moveType((/ uses (.+?) for \d+\./.exec(foeLine) || [])[1]));
		}
		if (A.over) list.push(A.result === "win" ? "pet-victory" : "pet-defeat");
		return list;
	}

	let introShown = "";
	function playBattle(stage) {
		const b = Tamagotchi.battleState();
		const round = lastRound && b && lastRound.after.turn === b.turn ? lastRound : null;
		lastRound = null;
		if (!b) return;
		const petEl = stage.querySelector(".pa-slot--pet .pa");
		const foeEl = stage.querySelector(".pa-slot--foe .pa");
		const big = b.enemy.kind === "boss" || b.enemy.kind === "miniboss";
		const introKey = b.enemy.name + "|" + b.enemy.maxHp + "|" + b.maxHp;
		const intro = !round && b.turn === 0 && !b.over && introShown !== introKey;
		if (intro) introShown = introKey;

		if (reduced()) {
			if (round && setup.consoleSfx) setup.consoleSfx.sequence(roundSounds(round, big), 300);
			else if (intro && big) sfx("pet-boss-appear");
			return;
		}

		if (!round) {
			if (!intro) return;
			const steps = [[0, () => state(foeEl, big ? "boss-enter" : "enter", big ? 800 : 550)]];
			if (big) steps.push([0, () => sfx("pet-boss-appear")]);
			run(stage, steps, big ? 850 : 600, () => clearStates(foeEl));
			return;
		}

		const { before: B, after: A, action } = round;
		const bar = bars(stage);
		const swapped = A.backup && !B.backup;
		const revived = A.revived && !B.revived && !swapped;
		const foeRevived = A.eRevived && !B.eRevived;
		const foeLine = A.log.find(line => / uses .+ for \d+\./.test(line)) || "";
		const foeHealLine = A.log.find(line => / mirrors .+ restoring \d+ HP/.test(line)) || "";
		const foeHealed = A.heals < B.heals;
		const hit = firstNumber(foeLine, / for (\d+)\./);
		const healed = action.kind === "heal" ? firstNumber(A.log[0], /(?:recovering|restoring) (\d+) HP/) : 0;
		const petMid = Math.min(B.maxHp, B.hp + healed);
		const foeMid = foeRevived ? 0 : foeHealed ? A.ehp - firstNumber(foeHealLine, /restoring (\d+) HP/) : A.ehp;
		/* The ending sound plays even when the round is skipped before reaching it. */
		let ended = false;
		const ending = () => {
			if (ended || !A.over) return;
			ended = true;
			sfx(A.result === "win" ? "pet-victory" : "pet-defeat");
		};
		const finalStates = () => {
			ending();
			clearStates(petEl);
			clearStates(foeEl);
			swapCreature(petEl, petKey(A.species));
			setBar(bar.petHp, A.hp, A.maxHp);
			setBar(bar.petMp, A.mp, A.maxMp);
			setBar(bar.foeHp, A.ehp, A.emax);
			if (A.over) state(A.result === "win" ? foeEl : petEl, "down");
			if (A.over && A.result === "win") state(petEl, "cheer");
		};

		setBar(bar.petHp, B.hp, B.maxHp);
		setBar(bar.petMp, B.mp, B.maxMp);
		setBar(bar.foeHp, B.ehp, B.emax);
		if (swapped) swapCreature(petEl, petKey(B.species));

		const steps = [];
		let t = 0;
		if (action.kind === "attack") {
			steps.push([t, () => state(petEl, "attack", 460)]);
			steps.push([
				t + 230,
				() => {
					burst(foeEl, action.type);
					sfx(actionSound(action));
					state(foeEl, "hurt", 380);
					setBar(bar.foeHp, foeMid, B.emax);
				},
			]);
			t += 680;
		} else {
			steps.push([
				t,
				() => {
					const grass = /^pet:(sprout|oakguard)$/.test(petEl.dataset.pa || "");
					burst(petEl, action.kind === "guard" ? "guard" : grass ? "bloom" : "heal");
					sfx(actionSound(action));
					if (action.kind === "heal") state(petEl, "happy", 700);
					setBar(bar.petHp, petMid, B.maxHp);
				},
			]);
			t += 560;
		}
		if (!swapped) steps.push([Math.max(0, t - 300), () => setBar(bar.petMp, A.mp, A.maxMp)]);

		if (foeRevived) {
			steps.push([t, () => state(foeEl, "down")]);
			steps.push([
				t + 500,
				() => {
					foeEl.classList.remove("pa--down");
					state(foeEl, "revive", 600);
					sfx("pet-heal");
					setBar(bar.foeHp, A.ehp, A.emax);
				},
			]);
			t += 1100;
		}

		if (A.over && A.result === "win") {
			steps.push([
				t,
				() => {
					state(foeEl, "down");
					if (big) burst(foeEl, "normal");
					ending();
				},
			]);
			steps.push([t + 450, () => state(petEl, "cheer")]);
			run(stage, steps, t + (big ? 1300 : 1000), finalStates);
			return;
		}

		if (foeHealed) {
			steps.push([
				t,
				() => {
					burst(foeEl, "heal");
					sfx("pet-heal");
					setBar(bar.foeHp, A.ehp, A.emax);
				},
			]);
			t += 600;
		} else if (foeLine) {
			if (big) {
				steps.push([
					t,
					() => {
						state(foeEl, "charge", 480);
						sfx("pet-boss-attack");
					},
				]);
				t += 480;
			}
			const type = moveType((/ uses (.+?) for \d+\./.exec(foeLine) || [])[1]);
			const left = swapped || revived || A.result === "lose" ? 0 : Math.max(0, petMid - hit);
			steps.push([t, () => state(foeEl, "attack", 460)]);
			steps.push([
				t + 230,
				() => {
					burst(petEl, type);
					sfx("pet-hit-" + type);
					at(110, () => sfx("pet-hurt"));
					state(petEl, "hurt", 380);
					setBar(bar.petHp, left, B.maxHp);
				},
			]);
			t += 680;
		}

		if (A.result === "lose") {
			steps.push([
				t,
				() => {
					state(petEl, "down");
					ending();
				},
			]);
			t += 600;
		} else if (revived) {
			steps.push([t, () => state(petEl, "down")]);
			steps.push([
				t + 450,
				() => {
					petEl.classList.remove("pa--down");
					state(petEl, "revive", 600);
					sfx("pet-heal");
					setBar(bar.petHp, A.hp, A.maxHp);
				},
			]);
			t += 1050;
		} else if (swapped) {
			steps.push([t, () => state(petEl, "down")]);
			steps.push([
				t + 500,
				() => {
					petEl.classList.remove("pa--down");
					swapCreature(petEl, petKey(A.species));
					state(petEl, "enter", 550);
					sfx("pet-select");
					setBar(bar.petHp, A.hp, A.maxHp);
					setBar(bar.petMp, A.mp, A.maxMp);
				},
			]);
			t += 1100;
		}
		run(stage, steps, t + 80, finalStates);
	}

	function playEvolution(box) {
		sfx("pet-evolve");
		if (reduced()) return;
		const el = box.querySelector(".pa");
		const to = box.dataset.to;
		swapCreature(el, box.dataset.from);
		const steps = [
			[0, () => state(el, "evolving")],
			[350, () => burst(el, "normal")],
			[850, () => burst(el, "normal")],
			[
				1400,
				() => {
					el.classList.remove("pa--evolving");
					swapCreature(el, to);
					state(el, "evolved", 550);
					burst(el, "normal");
				},
			],
		];
		run(box, steps, 2000, () => {
			clearStates(el);
			swapCreature(el, to);
		});
	}

	if (typeof jQuery !== "undefined") {
		jQuery(document).one(":storyready", install);
		jQuery(document).on(":passageinit", cancel);
		jQuery(document).on(":passagedisplay", () => {
			const stage = document.querySelector("#passages .pa-stage");
			if (stage) playBattle(stage);
			else lastRound = null;
			const evolve = document.querySelector("#passages .pa-evolve");
			if (evolve) playEvolution(evolve);
		});
		jQuery(document).on("keydown", event => {
			if (event.key === "Escape" && finishNow) finishNow();
		});
	}
	/* The page is hidden (app in the background, tab switched): idle motion pauses. */
	document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("pa-hidden", document.hidden));

	window.PetArt = Object.freeze({
		svg,
		html,
		petKey,
		enemyKey,
		portrait,
		pick,
		icon,
		battleStage,
		evolution,
		/* Every creature key the game can show, for checking every drawing. */
		keys: () => [
			...Object.keys(forms().pets).map(id => "pet:" + id),
			...Object.keys(forms().pets).map(id => "mirror:" + id),
			...Object.keys(forms().runeColour)
				.filter(t => t !== "normal")
				.map(t => "golem:" + t),
			...Object.keys(forms().wild).map(id => "wild:" + id),
		],
		busy: () => !!finishNow,
		skip: () => finishNow && finishNow(),
	});
})();

/* One drawing per creature: 120 x 120 grid, facing right, ground at y = 108. Moving parts go in k.g("pa-<part>")
 * groups that pet-art.css animates; `head` is where sleep marks, sick drops and mirror horns attach. */
(() => {
	const fire = { fx: "fire", flame: "#ffb02e", flameIn: "#fff07a" };

	const pets = {
		/* ---- Fire line ---- */
		embit: {
			name: "Embit",
			type: "fire",
			kind: "pet",
			head: { x: 86, y: 58, r: 20 },
			palette: { o: "#5a1e0e", body: "#f26b3a", dark: "#c8461f", belly: "#ffd59a", eye: "#2a1410", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"100% 70%",
					k.P("M42 90 C27 94 12 88 10 74 C9 66 14 61 20 63 C24 65 22 70 22 74 C23 81 31 84 42 81 Z", k.p.body) +
						k.g(
							"pa-flame",
							"50% 100%",
							k.P("M19 64 C10 60 8 48 14 37 C16 44 20 44 21 37 C28 46 29 57 19 64 Z", k.p.flame) +
								k.F("M19 61 C15 58 14 51 17 46 C19 50 22 50 22 47 C24 52 23 58 19 61 Z", k.p.flameIn)
						)
				) +
				k.P("M37 92 C35 100 37 107 45 107 C51 107 52 101 50 95 Z", k.p.dark) +
				k.P("M40 75 L44 64 L50 73 Z", k.p.dark) +
				k.P("M51 71 L56 60 L61 70 Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.E(56, 87, 25, 17, k.p.body) +
						k.FE(63, 93, 14, 9, k.p.belly) +
						k.P("M65 94 C63 102 65 107 73 107 C79 107 80 101 78 95 Z", k.p.body) +
						k.L("M68 106 L68 103 M72 107 L72 104 M76 106 L76 103", k.p.belly, 1.6)
				) +
				k.g(
					"pa-bob",
					"30% 100%",
					k.P("M65 61 C64 47 77 41 89 43 C100 45 106 53 109 61 C111 70 105 77 94 77 C82 79 66 76 65 61 Z", k.p.body) +
						k.F("M84 72 C92 76 102 75 106 69 C104 75 98 78 90 77 C86 76 84 75 84 72 Z", k.p.belly) +
						k.P("M76 46 C76 40 80 38 83 42 Z", k.p.dark) +
						k.P("M85 44 C86 38 90 37 92 42 Z", k.p.dark) +
						k.eye(81, 57, 5.6, { brow: -1 }) +
						k.eye(95, 56, 4.6, { brow: 1 }) +
						k.L("M93 68 Q99 73 105 67") +
						k.F("M98 70 L100 74 L102 70 Z", "#fff") +
						k.FE(106, 61, 1.2, 1.2, k.p.o) +
						k.blush(86, 67)
				),
		},
		blazilisk: {
			name: "Blazilisk",
			type: "fire",
			kind: "pet",
			from: "embit",
			head: { x: 94, y: 28, r: 20 },
			palette: { o: "#4a1508", body: "#ec5a2c", dark: "#b8381a", belly: "#ffd08a", horn: "#fbe7c6", eye: "#2a1008", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"100% 100%",
					k.P("M28 99 C14 98 6 88 10 78 C12 72 18 72 20 77 C20 84 24 89 32 91 Z", k.p.body) +
						k.g(
							"pa-flame",
							"50% 100%",
							k.P("M15 76 C4 70 4 54 12 42 C13 51 18 51 19 44 C28 54 28 69 15 76 Z", k.p.flame) +
								k.F("M15 72 C10 68 10 59 14 53 C16 58 19 58 20 55 C22 61 21 68 15 72 Z", k.p.flameIn)
						)
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M20 96 C20 86 38 80 58 80 C80 80 96 86 96 96 C96 104 80 108 58 108 C36 108 20 104 20 96 Z", k.p.body) +
						k.F("M30 100 C40 104 76 104 88 99 C80 106 40 107 30 100 Z", k.p.dark) +
						k.P("M34 82 L38 73 L44 81 Z", k.p.dark) +
						k.P("M48 80 L53 70 L58 80 Z", k.p.dark) +
						k.P("M62 98 C84 94 90 80 80 66 C72 56 70 46 78 38 L92 44 C86 50 88 58 94 66 C106 82 100 100 76 106 Z", k.p.body) +
						k.F("M80 100 C92 94 98 84 94 72 C99 82 98 96 84 102 Z", k.p.belly) +
						k.L("M86 98 L83 94 M92 90 L88 87 M95 80 L91 79", k.p.dark, 1.6) +
						k.g(
							"pa-flame",
							"0% 50%",
							k.P("M77 42 C66 40 60 46 58 54 C64 50 68 52 70 56 C66 58 64 64 66 70 C70 64 74 66 78 64 Z", k.p.flame) +
								k.F("M74 47 C68 47 64 51 63 55 C67 53 70 55 71 58 Z", k.p.flameIn)
						) +
						k.P("M92 68 C100 66 106 70 105 76 L101 75 L102 79 L97 76 L96 80 L93 75 Z", k.p.body)
				) +
				k.g(
					"pa-bob",
					"20% 100%",
					k.P("M82 16 L66 4 L74 20 Z", k.p.horn) +
						k.P("M88 14 L78 2 L82 18 Z", k.p.horn) +
						k.P("M74 30 C73 18 86 12 98 14 C108 16 116 22 118 29 C119 36 110 41 99 41 C88 43 75 42 74 30 Z", k.p.body) +
						k.F("M92 37 C100 40 110 39 116 34 C114 40 106 43 98 42 C94 42 92 40 92 37 Z", k.p.belly) +
						k.eye(88, 26, 4.8, { brow: -2 }) +
						k.eye(101, 25, 3.8, { brow: 2 }) +
						k.L("M100 35 Q107 38 114 33") +
						k.F("M104 36 L105.5 40 L107 36 Z", "#fff") +
						k.F("M109 35 L110.5 38.5 L112 35 Z", "#fff") +
						k.FE(115, 28, 1.2, 1.2, k.p.o)
				),
		},

		/* ---- Water line ---- */
		pudduck: {
			name: "Pudduck",
			type: "water",
			kind: "pet",
			head: { x: 74, y: 50, r: 19 },
			palette: { o: "#17406b", body: "#62b6f0", dark: "#3d88cb", belly: "#dcf1ff", beak: "#ffa53a", eye: "#10213a", fx: "water", drop: "#9fdcff" },
			draw: k =>
				k.P("M42 108 C44 102 48 100 52 100 C56 100 60 102 62 108 C58 106 56 108 52 106 C48 108 46 106 42 108 Z", k.p.beak) +
				k.P("M60 108 C62 102 66 100 70 100 C74 100 78 102 80 108 C76 106 74 108 70 106 C66 108 64 106 60 108 Z", k.p.beak) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M37 76 C29 72 27 65 31 60 C34 66 38 69 41 70 Z", k.p.body) +
						k.E(60, 82, 27, 23, k.p.body) +
						k.FE(67, 89, 15, 13, k.p.belly) +
						k.g("pa-wing", "20% 15%", k.P("M44 72 C38 85 45 99 59 96 C55 90 55 82 51 73 Z", k.p.dark) + k.L("M48 84 L53 86 M49 90 L55 91", k.p.belly, 1.4))
				) +
				k.g(
					"pa-bob",
					"40% 100%",
					k.g("pa-leaf", "50% 100%", k.P("M71 34 C66 25 70 18 77 15 C75 21 79 26 77 33 Z", k.p.dark)) +
						k.E(73, 50, 19, 18, k.p.body) +
						k.P("M86 50 C94 47 103 49 106 54 C101 59 93 59 86 57 Z", k.p.beak) +
						k.L("M88 54 Q96 55 104 54", "#c46a10", 1.4) +
						k.eye(71, 46, 4.8) +
						k.eye(83, 45, 4) +
						k.blush(76, 56) +
						k.shine(64, 40, 5, 3)
				) +
				k.g("pa-drop", "50% 50%", k.P("M28 50 C24 56 24 60 28 60 C32 60 32 56 28 50 Z", k.p.drop), -0.4) +
				k.g("pa-drop", "50% 50%", k.P("M98 70 C95 75 95 78 98 78 C101 78 101 75 98 70 Z", k.p.drop), -1.5) +
				/* Now and then a couple of bubbles drift up from its beak. */
				k.g("pa-bubble", "50% 100%", k.E(108, 46, 2.6, 2.6, "rgb(200 238 255 / 70%)") + k.E(112, 38, 1.8, 1.8, "rgb(200 238 255 / 70%)")),
		},
		pondswan: {
			name: "Pondswan",
			type: "water",
			kind: "pet",
			from: "pudduck",
			head: { x: 95, y: 26, r: 12 },
			palette: {
				o: "#173a63",
				body: "#e4f4ff",
				wing: "#72baf2",
				dark: "#2f78c4",
				beak: "#ffa53a",
				eye: "#10213a",
				fx: "water",
				drop: "#9fdcff",
				water: "#5fb4ea",
			},
			draw: k =>
				k.L("M18 107 Q30 103 42 107 T66 107 T90 107 T112 107", k.p.water, 2) +
				k.g(
					"pa-bob",
					"50% 100%",
					k.g("pa-wing", "70% 90%", k.P("M44 82 C30 64 32 40 46 26 C50 42 58 56 70 74 Z", k.p.dark)) +
						k.P("M22 92 C22 78 40 70 60 72 C78 74 94 82 96 92 C96 100 84 104 60 104 C40 104 22 101 22 92 Z", k.p.body) +
						k.g(
							"pa-wing",
							"70% 90%",
							k.P("M42 86 C36 68 42 50 58 40 C60 54 68 66 80 82 Z", k.p.wing) + k.L("M48 76 L56 78 M50 68 L58 71 M54 60 L61 64", k.p.body, 1.5)
						) +
						k.P("M74 84 C86 76 88 64 82 54 C76 44 78 32 88 26 L97 31 C89 35 89 43 93 51 C99 63 97 79 86 89 Z", k.p.body) +
						k.g(
							"pa-leaf",
							"30% 100%",
							k.P("M90 19 C85 10 88 4 95 2 C93 8 95 13 94 19 Z", k.p.wing) +
								k.P("M86 21 C78 15 78 8 82 4 C83 11 86 15 89 19 Z", k.p.dark) +
								k.F("M93 4 C94 6 94 8 93 10 C92 8 92 6 93 4 Z", "#fff")
						) +
						k.E(95, 26, 10, 9, k.p.body) +
						k.P("M103 25 C110 25 116 27 118 30 C112 33 106 33 102 30 Z", k.p.beak) +
						k.FE(103, 23.5, 2.6, 2.2, k.p.o) +
						k.eye(96, 24, 3.4) +
						k.L("M93 21 L91 19", k.p.o, 1.2) +
						k.shine(50, 80, 9, 3)
				) +
				k.g("pa-drop", "50% 50%", k.P("M112 76 C109 81 109 84 112 84 C115 84 115 81 112 76 Z", k.p.drop), -0.8) +
				k.g("pa-drop", "50% 50%", k.P("M14 84 C11 89 11 92 14 92 C17 92 17 89 14 84 Z", k.p.drop), -1.9),
		},

		/* ---- Grass line ---- */
		sprout: {
			name: "Sprout",
			type: "grass",
			kind: "pet",
			head: { x: 60, y: 66, r: 24 },
			palette: { o: "#25501b", body: "#a9dc7a", dark: "#78b54d", face: "#e2f7c8", leaf: "#4fbf4a", eye: "#1a2a12", fx: "grass", seed: "#8a5a34" },
			draw: k =>
				k.P("M42 106 C42 100 48 99 52 102 C54 106 50 109 42 106 Z", k.p.seed) +
				k.P("M78 106 C78 100 72 99 68 102 C66 106 70 109 78 106 Z", k.p.seed) +
				k.g("pa-leaf", "100% 50%", k.P("M36 82 C26 76 20 82 20 89 C27 90 33 88 37 86 Z", k.p.leaf), -0.6) +
				k.g("pa-leaf", "0% 50%", k.P("M84 82 C94 76 100 82 100 89 C93 90 87 88 83 86 Z", k.p.leaf), -1.4) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M60 54 C80 54 88 72 86 88 C84 102 74 108 60 108 C46 108 36 102 34 88 C32 72 40 54 60 54 Z", k.p.body) +
						k.F("M38 92 C42 104 78 104 82 92 C80 102 72 107 60 107 C48 107 40 102 38 92 Z", k.p.dark) +
						k.FE(60, 80, 19, 15, k.p.face) +
						k.eye(52, 78, 5) +
						k.eye(68, 78, 5) +
						k.L("M56 87 Q60 90 64 87") +
						k.blush(45, 85) +
						k.blush(75, 85) +
						k.FE(44, 88, 0.9, 0.9, k.p.dark) +
						k.FE(76, 88, 0.9, 0.9, k.p.dark) +
						k.shine(48, 64, 6, 3)
				) +
				k.g(
					"pa-leaf",
					"0% 100%",
					k.L("M60 56 C60 47 60 41 62 34", k.p.o, 3) +
						k.P("M61 38 C50 26 38 30 36 37 C46 43 54 43 61 38 Z", k.p.leaf) +
						k.P("M62 36 C70 22 84 22 88 29 C80 37 70 39 62 36 Z", k.p.leaf) +
						k.L("M60 38 C52 36 46 35 40 36 M63 35 C70 31 78 29 85 29", k.p.dark, 1.4)
				),
		},
		oakguard: {
			name: "Oakguard",
			type: "grass",
			kind: "pet",
			from: "sprout",
			head: { x: 60, y: 34, r: 18 },
			palette: {
				o: "#2e1a0c",
				body: "#8b5b34",
				dark: "#6a4224",
				plate: "#b07a4c",
				moss: "#5fae4a",
				leaf: "#4fbf4a",
				leafDark: "#3a8f36",
				eye: "#d8ff6a",
				fx: "grass",
			},
			draw: k =>
				k.P("M35 90 L52 90 L54 106 L46 104 L40 108 L33 105 Z", k.p.dark) +
				k.P("M68 90 L85 90 L87 105 L80 108 L74 104 L66 106 Z", k.p.dark) +
				k.g(
					"pa-arm",
					"80% 10%",
					k.P("M32 52 C20 56 14 72 16 88 L25 89 C25 78 28 68 36 62 Z", k.p.body) +
						k.L("M18 88 L14 96 M21 89 L21 98 M24 89 L28 96", k.p.dark, 2.4) +
						k.FE(26, 56, 6, 4, k.p.moss)
				) +
				k.g(
					"pa-arm",
					"20% 10%",
					k.P("M88 52 C100 56 106 72 104 88 L95 89 C95 78 92 68 84 62 Z", k.p.body) +
						k.L("M102 88 L106 96 M99 89 L99 98 M96 89 L92 96", k.p.dark, 2.4) +
						k.FE(94, 56, 6, 4, k.p.moss),
					-1
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M30 60 C30 47 44 42 60 42 C76 42 90 47 90 60 L88 92 C80 98 40 98 32 92 Z", k.p.body) +
						k.P("M42 58 L60 52 L78 58 L76 74 L60 80 L44 74 Z", k.p.plate) +
						k.P("M46 76 L60 82 L74 76 L72 90 L60 94 L48 90 Z", k.p.plate) +
						k.L("M60 53 L60 79 M60 83 L60 93", k.p.dark, 1.6) +
						k.FE(36, 50, 9, 5, k.p.moss) +
						k.FE(84, 50, 9, 5, k.p.moss) +
						k.P("M80 44 C80 40 84 38 86 42 C88 40 92 42 90 45 Z", "#e05d5d")
				) +
				k.g(
					"pa-bob",
					"50% 100%",
					k.P("M44 46 C44 30 50 24 60 24 C70 24 76 30 76 46 Z", k.p.body) +
						k.F("M46 33 L74 33 L74 36 L46 36 Z", k.p.dark) +
						k.eye(54, 39, 3.4, { glow: true }) +
						k.eye(66, 39, 3.4, { glow: true }) +
						k.L("M55 45 L65 45", k.p.dark, 1.6) +
						k.g(
							"pa-leaf",
							"50% 100%",
							k.E(46, 22, 9, 6, k.p.leafDark) +
								k.E(74, 22, 9, 6, k.p.leafDark) +
								k.E(52, 16, 10, 7, k.p.leaf) +
								k.E(68, 16, 10, 7, k.p.leaf) +
								k.E(60, 12, 10, 7, k.p.leaf) +
								k.L("M60 10 C60 6 60 4 61 2", k.p.o, 2) +
								k.P("M61 4 C56 0 52 2 51 4 C55 6 58 6 61 4 Z", k.p.leafDark) +
								k.P("M61 3 C65 -1 70 0 71 2 C67 5 64 5 61 3 Z", k.p.leafDark)
						)
				),
		},

		/* ---- Electric line ---- */
		voltpup: {
			name: "Voltpup",
			type: "electric",
			kind: "pet",
			head: { x: 76, y: 54, r: 20 },
			palette: { o: "#5a3d06", body: "#ffd23f", dark: "#e0a516", belly: "#fff3b5", mark: "#3a3550", eye: "#1e1830", fx: "electric", spark: "#7fe6ff" },
			draw: k =>
				k.g("pa-tail", "100% 100%", k.P("M34 84 L20 74 L28 71 L14 56 L34 68 L26 70 L38 80 Z", k.p.body)) +
				k.E(41, 93, 12, 12, k.p.dark) +
				k.P("M33 102 C33 99 49 99 49 102 C49 108 33 108 33 102 Z", k.p.body) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M34 88 C34 74 46 68 60 70 C72 72 79 82 77 94 C75 104 65 107 52 107 C41 107 34 100 34 88 Z", k.p.body) +
						k.FE(63, 94, 9, 10, k.p.belly) +
						k.P("M60 92 L58 106 L67 106 L69 92 Z", k.p.body) +
						k.P("M71 90 L71 106 L79 106 L78 90 Z", k.p.body)
				) +
				k.g(
					"pa-bob",
					"30% 100%",
					k.g("pa-ear", "50% 100%", k.P("M62 42 L55 15 L73 33 Z", k.p.body) + k.F("M57.5 24 L55 15 L62.5 22.5 Z", k.p.mark)) +
						k.g("pa-ear", "50% 100%", k.P("M77 35 L82 9 L90 35 Z", k.p.body) + k.F("M80.5 18 L82 9 L85 18.5 Z", k.p.mark), -0.7) +
						k.E(75, 55, 20, 19, k.p.body) +
						k.E(91, 62, 10, 8, k.p.belly) +
						k.L("M70 37 L74 42 L70 45 L75 50", k.p.mark, 2.4) +
						k.FE(99, 58, 3.4, 2.6, k.p.mark) +
						k.L("M91 66 Q95 70 99 66") +
						k.P("M94 68 C94 73 98 73 98 68 Z", "#ff7a8a") +
						k.eye(73, 50, 5.2) +
						k.eye(86, 49, 4.4) +
						k.shine(66, 44, 5, 3)
				) +
				k.g("pa-spark", "50% 50%", k.L("M104 40 L99 46 L104 47 L99 53", k.p.spark, 2.2), -0.3) +
				k.g("pa-spark", "50% 50%", k.L("M24 40 L29 45 L24 46 L29 52", k.p.spark, 2.2), -1.1),
		},
		thundrover: {
			name: "Thundrover",
			type: "electric",
			kind: "pet",
			from: "voltpup",
			head: { x: 100, y: 38, r: 18 },
			palette: {
				o: "#4a3204",
				body: "#ffcf33",
				dark: "#d99d12",
				mark: "#34304a",
				cloud: "#8d9cba",
				cloudDark: "#66759a",
				eye: "#1e1830",
				fx: "electric",
				spark: "#7fe6ff",
			},
			draw: k =>
				k.g("pa-tail", "100% 100%", k.P("M28 62 L12 50 L20 46 L4 28 L26 42 L18 46 L32 56 Z", k.p.body) + k.F("M8 32 L4 28 L12 33 Z", k.p.mark)) +
				k.P("M34 72 L28 105 L39 105 L44 78 Z", k.p.dark) +
				k.P("M72 74 L70 105 L80 105 L80 72 Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M24 64 C24 53 38 49 56 49 C72 49 84 53 88 62 C90 72 84 80 70 80 L40 80 C30 80 24 74 24 64 Z", k.p.body) +
						k.L("M38 52 L42 60 L37 62 L41 70 M52 50 L55 58 L51 60 L54 68", k.p.mark, 2.4) +
						k.P("M44 74 L44 105 L53 105 L53 76 Z", k.p.body) +
						k.P("M80 70 L86 105 L95 105 L88 68 Z", k.p.body) +
						k.FE(48, 105, 6, 2.4, k.p.mark) +
						k.FE(90, 105, 6, 2.4, k.p.mark)
				) +
				k.g(
					"pa-float",
					"50% 50%",
					k.E(70, 50, 9, 8, k.p.cloudDark) +
						k.E(80, 58, 10, 9, k.p.cloud) +
						k.E(76, 42, 9, 8, k.p.cloud) +
						k.E(86, 46, 10, 9, k.p.cloud) +
						k.L("M78 50 L74 56 L79 57 L75 63", k.p.spark, 2)
				) +
				k.g(
					"pa-bob",
					"10% 100%",
					k.g("pa-ear", "50% 100%", k.P("M88 30 L84 6 L98 26 Z", k.p.body) + k.F("M85 13 L84 6 L89 13 Z", k.p.mark)) +
						k.g("pa-ear", "50% 100%", k.P("M98 27 L103 4 L108 28 Z", k.p.body) + k.F("M101.5 11 L103 4 L105 11 Z", k.p.mark), -0.6) +
						k.P("M84 40 C84 30 94 24 104 26 C111 28 116 33 118 39 C119 45 111 49 102 49 C92 51 84 48 84 40 Z", k.p.body) +
						k.L("M92 30 L96 34 L93 36 L97 40", k.p.mark, 2) +
						k.FE(117, 37, 2.6, 2, k.p.mark) +
						k.L("M104 45 Q110 47 115 44") +
						k.F("M108 46 L109.2 49 L110.4 46 Z", "#fff") +
						k.eye(99, 36, 4, { brow: -2 }) +
						k.eye(109, 35, 3.2, { brow: 2 })
				) +
				k.g("pa-spark", "50% 50%", k.L("M14 70 L19 75 L14 76 L19 82", k.p.spark, 2.2), -0.5) +
				k.g("pa-spark", "50% 50%", k.L("M60 30 L56 36 L61 37 L57 43", k.p.spark, 2.2), -1.3),
		},
	};

	/* The miniboss. Its rune core and visor take the colour of its (random) element. */
	const runeColour = { fire: "#ff7a2a", water: "#4fc3ff", grass: "#7ee04f", electric: "#ffe23f", normal: "#e8e8e8" };
	const golem = {
		name: "Golem Sentinel",
		kind: "miniboss",
		head: { x: 60, y: 30, r: 16 },
		palette: { o: "#1f2028", body: "#8d909e", dark: "#666a7a", light: "#b4b7c4", moss: "#6b8a4a", eye: "#ffe23f", rune: "#ffe23f" },
		draw: k =>
			k.g("pa-float", "50% 50%", k.P("M10 34 L20 30 L24 38 L16 44 Z", k.p.dark), -0.4) +
			k.g("pa-float", "50% 50%", k.P("M100 26 L110 28 L110 38 L100 36 Z", k.p.dark), -1.6) +
			k.P("M36 88 L52 88 L54 108 L32 108 Z", k.p.dark) +
			k.P("M68 88 L84 88 L88 108 L66 108 Z", k.p.dark) +
			k.g(
				"pa-arm",
				"70% 5%",
				k.P("M32 44 L16 48 L12 74 L28 78 L32 58 Z", k.p.body) + k.P("M8 72 L30 72 L32 92 L6 92 Z", k.p.dark) + k.L("M14 80 L28 80", k.p.o, 1.6)
			) +
			k.g(
				"pa-arm",
				"30% 5%",
				k.P("M88 44 L104 48 L108 74 L92 78 L88 58 Z", k.p.body) + k.P("M90 72 L112 72 L114 92 L88 92 Z", k.p.dark) + k.L("M92 80 L106 80", k.p.o, 1.6),
				-0.8
			) +
			k.g(
				"pa-breathe",
				"50% 100%",
				k.P("M24 44 L96 44 L88 92 L32 92 Z", k.p.body) +
					k.F("M24 44 L96 44 L94 54 L26 54 Z", k.p.light) +
					k.L("M40 60 L46 70 L42 80 M80 58 L76 66 L82 76", k.p.dark, 1.6) +
					k.FE(30, 46, 8, 4, k.p.moss) +
					k.g("pa-rune", "50% 50%", k.P("M60 56 L72 68 L60 80 L48 68 Z", k.p.rune) + k.L("M60 62 L60 74 M55 68 L65 68", k.p.o, 1.6))
			) +
			k.g(
				"pa-bob",
				"50% 100%",
				k.P("M44 24 L76 24 L78 44 L42 44 Z", k.p.body) +
					k.F("M44 24 L76 24 L76.6 30 L43.4 30 Z", k.p.light) +
					k.eye(53, 35, 3.4, { slit: true }) +
					k.eye(67, 35, 3.4, { slit: true })
			),
	};

	/* Wild and dungeon enemies, by the names the game gives them. */
	const wild = {
		Cinderbeast: {
			type: "fire",
			head: { x: 86, y: 58, r: 17 },
			palette: { o: "#1c1010", body: "#4a3a3a", dark: "#35292a", light: "#6e5a58", crack: "#ff8a2a", eye: "#ffb02e", ...fire },
			draw: k =>
				k.g("pa-flame", "50% 100%", k.P("M42 60 C36 52 38 44 44 38 C44 44 48 46 50 42 C54 50 52 58 42 60 Z", k.p.flame), -0.3) +
				k.g("pa-flame", "50% 100%", k.P("M58 56 C52 48 54 40 60 34 C60 40 64 42 66 38 C70 46 68 54 58 56 Z", k.p.flame), -0.9) +
				k.P("M34 92 L32 106 L46 106 L46 94 Z", k.p.dark) +
				k.P("M70 94 L70 106 L84 106 L82 92 Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.E(56, 80, 32, 24, k.p.body) + k.L("M38 74 L44 80 L40 88 M60 66 L56 74 L62 80 M72 86 L78 92", k.p.crack, 2.2) + k.FE(60, 92, 14, 7, k.p.light)
				) +
				k.g(
					"pa-bob",
					"30% 100%",
					k.E(78, 44, 6, 6, k.p.body) +
						k.E(96, 46, 6, 6, k.p.body) +
						k.E(86, 58, 17, 15, k.p.body) +
						k.E(97, 64, 9, 7, k.p.light) +
						k.FE(104, 61, 2.6, 2, k.p.o) +
						k.eye(83, 54, 3.6, { glow: true, brow: -2 }) +
						k.eye(94, 53, 3, { glow: true, brow: 2 }) +
						k.L("M96 68 Q100 70 104 67")
				),
		},
		Magmite: {
			type: "fire",
			head: { x: 98, y: 84, r: 10 },
			palette: { o: "#1c0e0a", body: "#5a4040", dark: "#3e2c2c", lava: "#ff7a1a", leg: "#2e2020", eye: "#ffe07a", ...fire },
			draw: k =>
				k.L("M34 96 L26 106 M46 98 L42 108 M58 98 L58 108 M70 98 L74 108", k.p.leg, 3.4) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M22 96 C22 68 42 54 62 54 C84 54 100 68 100 96 Z", k.p.body) +
						k.L("M34 92 C36 80 44 72 52 66 M58 60 C62 72 62 84 58 94 M70 62 C78 70 84 80 86 92", k.p.lava, 2.6) +
						k.F("M40 64 C46 58 56 56 62 57 C54 59 46 62 40 68 Z", "#7a5a58")
				) +
				k.g(
					"pa-bob",
					"0% 100%",
					k.E(98, 88, 11, 9, k.p.dark) +
						k.L("M96 80 C94 72 90 68 86 66 M102 80 C104 72 108 68 112 66", k.p.o, 1.8) +
						k.g(
							"pa-flame",
							"50% 100%",
							k.P("M86 66 C82 62 84 58 86 56 C88 58 90 62 86 66 Z", k.p.flame) + k.P("M112 66 C108 62 110 58 112 56 C114 58 116 62 112 66 Z", k.p.flame)
						) +
						k.eye(96, 87, 2.8, { glow: true }) +
						k.eye(104, 87, 2.4, { glow: true })
				),
		},
		Ashfang: {
			type: "fire",
			head: { x: 82, y: 52, r: 16 },
			palette: { o: "#241e24", body: "#8c8790", dark: "#6a6470", light: "#c9c3cc", fang: "#ff9a3a", eye: "#ff6a2a", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"100% 90%",
					k.P("M40 94 C22 96 10 84 14 70 C16 62 24 60 28 66 C24 72 26 82 40 86 Z", k.p.dark) +
						k.g("pa-flame", "50% 100%", k.P("M18 68 C12 62 14 54 20 50 C20 56 24 58 26 54 C28 60 26 66 18 68 Z", k.p.flame))
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.E(46, 95, 15, 12, k.p.dark) +
						k.P("M36 106 C36 100 44 98 52 101 L52 107 L36 107 Z", k.p.dark) +
						k.P("M58 62 C72 62 78 78 76 107 L52 107 C50 90 50 70 58 62 Z", k.p.body) +
						k.F("M62 66 C70 68 74 76 71 86 C66 80 62 74 62 66 Z", k.p.light) +
						k.L("M62 92 L62 106", k.p.o, 1.6)
				) +
				k.g(
					"pa-bob",
					"30% 100%",
					k.P("M70 42 L66 22 L80 36 Z", k.p.body) +
						k.P("M84 36 L90 18 L94 38 Z", k.p.body) +
						k.P("M66 52 C66 40 78 36 88 38 C98 40 110 46 114 52 C110 58 98 62 88 62 C76 64 66 60 66 52 Z", k.p.body) +
						k.F("M92 56 C100 58 108 56 113 53 C108 59 100 62 92 61 Z", k.p.light) +
						k.P("M100 60 L102 66 L104 60 Z", k.p.fang) +
						k.P("M107 58 L108.6 63 L110 58 Z", k.p.fang) +
						k.FE(113, 51, 2.2, 1.8, k.p.o) +
						k.eye(84, 48, 3.4, { glow: true, brow: -2 }) +
						k.eye(95, 47, 2.8, { glow: true, brow: 2 })
				),
		},
		Drizzlefin: {
			type: "water",
			head: { x: 78, y: 60, r: 14 },
			palette: { o: "#123c52", body: "#4fb0d8", dark: "#2f86b0", belly: "#c6ecfb", cloud: "#e9f2f8", eye: "#0e2030", fx: "water", drop: "#9fdcff" },
			draw: k =>
				k.FE(60, 107, 22, 3, "#000", 0.12) +
				k.g(
					"pa-float",
					"50% 50%",
					k.g("pa-tail", "100% 50%", k.P("M32 64 L12 50 L16 64 L12 78 Z", k.p.dark)) +
						k.P("M28 64 C28 52 44 46 60 46 C78 46 92 54 94 64 C92 74 78 82 60 82 C44 82 28 76 28 64 Z", k.p.body) +
						k.F("M40 72 C50 80 76 80 88 70 C82 80 70 82 60 82 C50 82 44 78 40 72 Z", k.p.belly) +
						k.P("M56 76 L50 88 L64 80 Z", k.p.dark) +
						k.E(48, 40, 9, 7, k.p.cloud) +
						k.E(60, 36, 11, 9, k.p.cloud) +
						k.E(72, 40, 9, 7, k.p.cloud) +
						k.eye(80, 60, 5.4) +
						k.L("M86 70 Q90 72 93 69") +
						k.L("M66 54 Q68 62 66 70", k.p.dark, 1.6)
				) +
				k.g("pa-drop", "50% 50%", k.P("M52 46 C49 51 49 54 52 54 C55 54 55 51 52 46 Z", k.p.drop), -0.3) +
				k.g("pa-drop", "50% 50%", k.P("M66 46 C63 51 63 54 66 54 C69 54 69 51 66 46 Z", k.p.drop), -1.2),
		},
		Tidemaw: {
			type: "water",
			head: { x: 62, y: 66, r: 30 },
			palette: {
				o: "#0f2240",
				body: "#2f5f9a",
				dark: "#22487a",
				belly: "#8fc0e8",
				tooth: "#f6f6f0",
				lure: "#bff7ff",
				eye: "#0b1626",
				fx: "water",
				drop: "#9fdcff",
			},
			draw: k =>
				k.g("pa-leaf", "0% 100%", k.L("M70 58 C72 40 86 30 98 34", k.p.o, 2.4) + k.g("pa-rune", "50% 50%", k.E(100, 36, 5, 5, k.p.lure))) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M18 96 C18 70 38 56 62 56 C86 56 104 70 104 96 C104 104 92 108 62 108 C32 108 18 104 18 96 Z", k.p.body) +
						k.P("M26 88 C40 98 84 98 100 86 C98 100 84 104 62 104 C40 104 28 100 26 88 Z", k.p.belly) +
						k.L("M26 88 C40 98 84 98 100 86", k.p.o, 2.4) +
						k.F("M34 92 L37 98 L40 93 Z M48 95 L51 101 L54 95.5 Z M66 95.5 L69 101 L72 95 Z M82 93 L85 98.5 L88 92 Z", k.p.tooth) +
						k.E(44, 58, 8, 7, k.p.body) +
						k.E(78, 58, 8, 7, k.p.body) +
						k.eye(44, 57, 4) +
						k.eye(78, 57, 4) +
						k.F("M30 70 C34 66 40 66 42 70 Z M80 74 C84 70 90 70 92 74 Z", k.p.dark)
				),
		},
		Brinejaw: {
			type: "water",
			head: { x: 60, y: 70, r: 22 },
			palette: { o: "#0f2c3c", body: "#3a8fb0", dark: "#2a6e8c", claw: "#5fb0d0", spot: "#b6e4f4", eye: "#0b1a24", fx: "water", drop: "#9fdcff" },
			draw: k =>
				k.L("M38 86 L24 98 L20 108 M42 90 L32 102 L30 108 M80 90 L90 102 L92 108 M84 86 L98 98 L102 108", k.p.dark, 3.2) +
				k.g("pa-arm", "90% 90%", k.P("M38 76 C28 70 20 60 24 50 C14 50 8 40 14 32 C20 40 28 40 32 46 C30 54 36 62 44 68 Z", k.p.claw)) +
				k.g(
					"pa-arm",
					"10% 90%",
					k.P("M82 76 C96 70 104 58 100 44 C112 44 118 32 110 22 C104 32 94 32 88 38 C90 48 86 58 78 66 Z", k.p.claw) +
						k.L("M100 44 C98 40 96 38 92 38", k.p.o, 1.6),
					-0.7
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.E(60, 80, 28, 17, k.p.body) +
						k.FE(48, 76, 4, 3, k.p.spot) +
						k.FE(70, 74, 3, 2.4, k.p.spot) +
						k.FE(60, 86, 5, 3, k.p.spot) +
						k.L("M52 88 Q60 92 68 88")
				) +
				k.g("pa-bob", "50% 100%", k.L("M52 66 L50 56 M68 66 L70 56", k.p.o, 2.4) + k.eye(50, 54, 4) + k.eye(70, 54, 4)),
		},
		Thornbeast: {
			type: "grass",
			head: { x: 88, y: 76, r: 16 },
			palette: { o: "#20280e", body: "#6b7a3a", dark: "#4e5a28", thorn: "#9ab84a", tusk: "#f4ecd2", snout: "#a88a6a", eye: "#ff5a3a", fx: "grass" },
			draw: k =>
				k.P("M30 90 L28 106 L40 106 L40 92 Z", k.p.dark) +
				k.P("M66 92 L66 106 L78 106 L76 90 Z", k.p.dark) +
				k.P("M26 66 L32 52 L38 64 Z M38 62 L46 46 L52 60 Z M52 60 L60 44 L66 58 Z M66 60 L74 48 L78 62 Z", k.p.thorn) +
				k.g("pa-breathe", "50% 100%", k.E(54, 80, 32, 20, k.p.body) + k.L("M36 74 L42 78 M50 70 L56 74 M64 72 L70 76", k.p.dark, 1.6)) +
				k.g(
					"pa-bob",
					"20% 100%",
					k.E(88, 76, 16, 14, k.p.body) +
						k.P("M76 64 L72 56 L82 62 Z", k.p.body) +
						k.E(102, 80, 7, 6, k.p.snout) +
						k.FE(104, 79, 1.2, 1.6, k.p.o) +
						k.FE(100, 79, 1.2, 1.6, k.p.o) +
						k.P("M96 86 C98 80 102 76 106 76 C104 80 102 84 98 88 Z", k.p.tusk) +
						k.eye(87, 72, 3.2, { glow: true, brow: -2 })
				),
		},
		Bramblil: {
			type: "grass",
			head: { x: 60, y: 78, r: 28 },
			palette: { o: "#152a10", body: "#3f7a35", dark: "#2c5a24", vine: "#6aa84f", berry: "#d8334a", eye: "#0e1a0c", fx: "grass" },
			draw: k =>
				k.FE(48, 107, 7, 3, k.p.dark) +
				k.FE(72, 107, 7, 3, k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M60 50 L64 54 C80 54 90 66 88 80 L92 84 L86 88 C82 100 72 106 60 106 C46 106 36 98 32 86 L28 82 L32 78 C32 62 44 52 56 52 Z", k.p.body) +
						k.L("M36 70 C46 62 58 66 62 76 C66 86 80 86 86 76 M38 92 C48 84 60 88 66 96 M50 56 C56 64 54 74 46 80", k.p.vine, 2.2) +
						k.P("M42 64 L36 58 L44 60 Z M80 62 L86 56 L84 64 Z M88 92 L94 96 L86 96 Z M34 96 L28 100 L34 92 Z", k.p.vine) +
						k.E(44, 90, 3.4, 3.4, k.p.berry) +
						k.E(78, 94, 3.4, 3.4, k.p.berry) +
						k.E(72, 60, 3, 3, k.p.berry) +
						k.eye(54, 78, 4.4) +
						k.eye(68, 78, 4.4) +
						k.L("M56 88 Q61 85 66 88")
				),
		},
		Mosshorn: {
			type: "grass",
			head: { x: 86, y: 54, r: 14 },
			palette: { o: "#26200e", body: "#9a8a6a", dark: "#76684c", horn: "#d8ccae", moss: "#5fae4a", eye: "#1a160c", fx: "grass" },
			draw: k =>
				k.L("M38 84 L36 106 M48 86 L48 106 M70 86 L72 106 M80 84 L84 106", k.p.dark, 4) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M28 74 C28 64 40 60 56 60 C72 60 84 64 86 74 C86 84 76 90 58 90 C40 90 28 84 28 74 Z", k.p.body) +
						k.FE(44, 64, 10, 5, k.p.moss) +
						k.FE(64, 62, 8, 4, k.p.moss) +
						k.L("M30 72 L22 66", k.p.o, 2.2)
				) +
				k.g(
					"pa-bob",
					"20% 100%",
					k.P("M82 46 C76 32 82 20 94 20 C102 22 104 30 98 34 C94 30 88 32 90 40 Z", k.p.horn) +
						k.FE(90, 24, 6, 3.4, k.p.moss) +
						k.P("M76 56 C76 48 84 44 92 46 C100 48 106 54 106 60 C102 66 94 66 86 64 C80 63 76 60 76 56 Z", k.p.body) +
						k.P("M92 64 C92 72 96 76 98 78 C94 76 88 72 88 64 Z", k.p.moss) +
						k.eye(88, 53, 3) +
						k.FE(104, 57, 1.4, 1.2, k.p.o)
				),
		},
		Boltfang: {
			type: "electric",
			head: { x: 60, y: 54, r: 14 },
			palette: {
				o: "#1c1630",
				body: "#5a4d7c",
				dark: "#7a68aa",
				wing: "#ffd84a",
				mark: "#ffe23f",
				fang: "#ffffff",
				eye: "#ffe23f",
				fx: "electric",
				spark: "#7fe6ff",
			},
			draw: k =>
				k.FE(60, 107, 20, 3, "#000", 0.12) +
				k.g(
					"pa-float",
					"50% 50%",
					k.g(
						"pa-wing",
						"100% 30%",
						k.P("M48 56 C36 40 20 36 6 42 L14 50 L8 58 L18 62 L14 72 C28 68 40 66 50 66 Z", k.p.dark) + k.L("M46 58 L28 48 M46 62 L22 60", k.p.wing, 1.6)
					) +
						k.g(
							"pa-wing",
							"0% 30%",
							k.P("M72 56 C84 40 100 36 114 42 L106 50 L112 58 L102 62 L106 72 C92 68 80 66 70 66 Z", k.p.dark) +
								k.L("M74 58 L92 48 M74 62 L98 60", k.p.wing, 1.6),
							-0.25
						) +
						k.P("M50 44 L46 30 L56 40 Z", k.p.body) +
						k.P("M70 44 L74 30 L64 40 Z", k.p.body) +
						k.E(60, 60, 14, 16, k.p.body) +
						k.L("M56 66 L60 70 L56 72 L60 76", k.p.mark, 2) +
						k.eye(55, 54, 3.4, { glow: true }) +
						k.eye(65, 54, 3.4, { glow: true }) +
						k.F("M55 63 L57 68 L59 63 Z M61 63 L63 68 L65 63 Z", k.p.fang)
				),
		},
		Sparkmaw: {
			type: "electric",
			head: { x: 90, y: 40, r: 14 },
			palette: { o: "#121a36", body: "#2e3f73", dark: "#1f2c56", spot: "#ffe23f", mouth: "#ffb0c0", eye: "#ffe23f", fx: "electric", spark: "#7fe6ff" },
			draw: k =>
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P(
						"M14 104 C14 92 30 86 46 92 C60 98 70 94 72 84 C74 72 64 64 66 54 L80 50 C80 62 88 72 86 86 C84 104 64 110 46 106 C34 104 24 108 14 104 Z",
						k.p.body
					) +
						k.P("M30 90 L34 84 L38 90 Z M46 92 L50 86 L54 94 Z M68 66 L74 62 L76 70 Z", k.p.dark) +
						k.FE(40, 100, 2.6, 2.6, k.p.spot) +
						k.FE(60, 100, 2.6, 2.6, k.p.spot) +
						k.FE(78, 80, 2.6, 2.6, k.p.spot)
				) +
				k.g(
					"pa-bob",
					"10% 100%",
					k.P("M64 50 C62 38 74 28 88 28 C102 28 114 34 116 40 L98 42 L116 46 C112 54 98 58 86 58 C74 58 66 56 64 50 Z", k.p.body) +
						k.P("M98 42 L116 40 L116 46 Z", k.p.mouth) +
						k.eye(84, 38, 4, { glow: true, brow: -2 }) +
						k.g("pa-spark", "50% 50%", k.L("M104 44 L110 40 L108 44 L114 42", k.p.spark, 1.8))
				) +
				k.g("pa-spark", "50% 50%", k.L("M24 78 L28 72 L24 72 L28 66", k.p.spark, 2), -0.9),
		},
		Voltbeast: {
			type: "electric",
			head: { x: 92, y: 72, r: 16 },
			palette: { o: "#1c1e2a", body: "#5a6178", dark: "#444a5e", band: "#ffd23f", coil: "#d8894a", eye: "#ffe23f", fx: "electric", spark: "#7fe6ff" },
			draw: k =>
				k.P("M32 90 L30 106 L44 106 L44 92 Z", k.p.dark) +
				k.P("M64 92 L64 106 L78 106 L76 90 Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.E(54, 78, 34, 22, k.p.body) +
						k.F("M40 58 L48 58 L48 99 L40 98 Z M58 56 L66 56 L66 100 L58 100 Z", k.p.band) +
						k.L("M40 58 L40 98 M48 58 L48 99 M58 56 L58 100 M66 56 L66 100", k.p.o, 1.4)
				) +
				k.g(
					"pa-bob",
					"10% 100%",
					k.P("M76 72 C76 62 86 58 96 60 C106 62 114 70 114 78 C112 86 102 88 92 88 C82 88 76 82 76 72 Z", k.p.body) +
						k.L("M104 62 L108 50 M106 60 L112 58 M107 55 L113 53 M108 50 L113 48", k.p.coil, 2.8) +
						k.g("pa-spark", "50% 50%", k.L("M110 44 L114 38 L111 38 L115 32", k.p.spark, 2)) +
						k.P("M80 64 L78 54 L88 60 Z", k.p.body) +
						k.eye(92, 70, 3.4, { glow: true, brow: -2 }) +
						k.FE(111, 78, 1.6, 1.4, k.p.o) +
						k.L("M100 82 Q106 84 110 82")
				),
		},
	};

	setup.petForms = Object.freeze({ pets, golem, wild, runeColour });
})();
