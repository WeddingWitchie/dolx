/* globals Tamagotchi */
/* Virtual pet artwork and animation. Never changes game state: battle rounds are observed by wrapping Tamagotchi's
 * battle calls and replayed once the next passage shows. Timeouts are cleared on every passage change. */
(() => {
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
		const k = {
			p,
			P: (d, fill) => `<path d="${d}" fill="${fill}"/>`,
			E: (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`,
			F: (d, fill, opacity) => `<path d="${d}" fill="${fill}"${opacity == null ? "" : ` opacity="${opacity}"`}/>`,
			FE: (cx, cy, rx, ry, fill, opacity) =>
				`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${opacity == null ? "" : ` opacity="${opacity}"`}/>`,
			L: (d, colour = p.o, width = 2.2) =>
				`<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
			g: (cls, origin, inner, delay) => `<g class="${cls}" style="transform-origin:${origin}${delay ? `;animation-delay:${delay}s` : ""}">${inner}</g>`,
			/* All forms use small dot eyes; the sentinel keeps its visor. */
			eye(x, y, r, o = {}) {
				r *= 0.55;
				const open = o.slit
					? `<rect x="${x - r * 1.3}" y="${y - r * 0.45}" width="${r * 2.6}" height="${r * 0.9}" rx="${r * 0.4}" fill="${p.eye}"/>`
					: k.FE(x, y, r, r * 1.1, p.eye);
				const shut = `<path class="pa-eye-shut" d="M${x - r} ${y} Q${x} ${y + r * 0.8} ${x + r} ${y}" fill="none" stroke="${
					p.o
				}" stroke-width="2" stroke-linecap="round"/>`;
				/* Happy eyes (healing, cheering): upturned arcs in place of the open eye. */
				const happy = o.slit
					? ""
					: `<path class="pa-eye-happy" d="M${x - r} ${y + r * 0.35} Q${x} ${y - r * 0.95} ${x + r} ${y + r * 0.35}" fill="none" stroke="${
							p.o
					  }" stroke-width="2.2" stroke-linecap="round"/>`;
				return `<g class="pa-eye" style="transform-origin:50% 50%"><g class="pa-eye-open">${open}</g>${shut}${happy}</g>`;
			},
		};
		return k;
	}

	/* ---- resolving a creature key ("pet:embit", "mirror:embit", "golem:fire", "wild:Tidemaw") ---- */
	function resolve(key) {
		const F = forms();
		const [kind, id] = String(key).split(":");
		if (kind === "golem") {
			const glow = Object.hasOwn(F.runeColour, id) ? F.runeColour[id] : F.runeColour.normal;
			return { def: F.golem, p: { ...F.golem.palette, rune: glow, eye: glow }, fx: Object.hasOwn(F.runeColour, id) ? id : "normal" };
		}
		if (kind === "wild") {
			const def = Object.hasOwn(F.wild, id) ? F.wild[id] : Object.values(F.wild)[0];
			return { def, p: def.palette, fx: def.type };
		}
		const def = Object.hasOwn(F.pets, id) ? F.pets[id] : F.pets.embit;
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
		return `<div class="${esc(cls.join(" "))}" data-pa="${esc(key)}" data-fx="${r.fx}"${scale} aria-hidden="true">${svg(key)}<div class="pa-fx"></div></div>`;
	}

	/* ---- keys for game objects ---- */
	const petKey = species => "pet:" + (Object.hasOwn(forms().pets, species) ? species : "embit");
	function enemyKey(e) {
		if (!e) return "wild:";
		if (e.kind === "boss") {
			const base = String(e.name || "").replace(/^Mirror /, "");
			const id = Object.keys(forms().pets).find(k => forms().pets[k].name === base) || (V.tamagotchi && V.tamagotchi.species);
			return "mirror:" + (Object.hasOwn(forms().pets, id) ? id : "embit");
		}
		if (e.kind === "miniboss") return "golem:" + e.type;
		if (Object.hasOwn(forms().wild, e.name)) return "wild:" + e.name;
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
			`<svg class="pa-habitat" viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 132Q90 85 190 128T390 115T600 127V220H0Z" fill="#294539"/><path d="M0 172Q150 145 310 174T600 162V220H0Z" fill="#3b5336"/><path d="M0 204Q140 178 300 201T600 194V220H0Z" fill="#486140"/><path d="M40 173l5-10 3 11m484-2 5-12 2 11M260 187l4-8 3 9" fill="none" stroke="#71865a" stroke-width="2"/></svg>` +
			(b.enemy.kind === "boss" ? `<div class="pa-moon"></div>` : "") +
			`<div class="pa-slot pa-slot--pet">${html(petKey(V.tamagotchi.species), { size: "battle", state: petState })}</div>` +
			`<div class="pa-slot pa-slot--foe">${html(enemyKey(b.enemy), { size: big ? "boss" : "battle", flip: true, state: foeState })}</div>` +
			`</div>` +
			Tamagotchi.battleHtml() +
			`</div>`
		);
	}

	/* The evolution: shown in its new form, and animated from the old one when motion is allowed. */
	function evolution() {
		const t = V.tamagotchi;
		const def = t && forms().pets[t.species];
		if (!def || !def.from) return "";
		return `<div class="pa-evolve" data-from="pet:${def.from}" data-to="pet:${t.species}">` + html("pet:" + t.species, { size: "evolve" }) + `</div>`;
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
		if (timers.length) {
			for (const id of timers) clearTimeout(id);
			timers = [];
			document.querySelectorAll("#passages .pa-burst, #passages .pa-impact").forEach(el => el.remove());
			const stage = document.querySelector("#passages .pa-busy");
			if (stage) lock(stage, false);
		}
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
		for (const cls of [...el.classList]) if (cls.startsWith("pa--f-")) el.classList.remove(cls);
		const [kind, id] = key.split(":");
		el.classList.add("pa--f-" + (kind === "golem" ? "golem" : id.toLowerCase()));
		el.classList.toggle("pa--mirror", kind === "mirror");
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
	function burst(el, kind, damage = 0) {
		const layer = el && el.querySelector(".pa-fx");
		if (!layer) return;
		if (damage > 0) {
			const number = document.createElement("span");
			number.className = "pa-impact";
			number.textContent = "−" + damage;
			number.setAttribute("aria-hidden", "true");
			layer.appendChild(number);
			at(800, () => number.remove());
		}
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
		at(800, () => box.remove());
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

	function holdMove(event) {
		event.preventDefault();
		event.stopImmediatePropagation();
	}
	function lock(stage, on) {
		const after = document.querySelector("#passages .pa-after");
		if (after) {
			after.inert = on;
			after.classList.toggle("pa-held", on);
			if (on) after.addEventListener("click", holdMove, true);
			else after.removeEventListener("click", holdMove, true);
		}
		stage.classList.toggle("pa-busy", on);
		if (!on) stage.onclick = null;
	}

	/* Plays a list of [ms, fn] steps, then finish(). Tapping the stage or pressing Escape jumps to finish(). */
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
		stage.onclick = () => {
			if (finishNow) finishNow();
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
					burst(foeEl, action.type, Math.max(0, B.ehp - foeMid));
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
					burst(petEl, type, hit);
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
		jQuery(document).on(":onloadsave", () => {
			cancel();
			lastRound = null;
			introShown = "";
		});
		jQuery(document).on(":passagedisplay", () => {
			const stage = document.querySelector("#passages .pa-stage");
			if (stage) playBattle(stage);
			else {
				lastRound = null;
				introShown = "";
			}
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
			head: { x: 68, y: 44, r: 25 },
			palette: { o: "#713e37", body: "#df865c", dark: "#b76446", belly: "#ffe0ae", eye: "#48303a", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"90% 85%",
					k.P("M43 101C22 110 8 99 12 81Q14 74 18 80C20 92 28 93 44 88Z", k.p.dark) +
						k.g(
							"pa-flame",
							"50% 100%",
							k.P("M15 83C3 74 10 65 13 60Q13 68 18 65C24 73 23 80 15 83Z", k.p.flame) + k.F("M15 80Q10 75 15 69Q22 77 15 80", k.p.flameIn)
						)
				) +
				k.E(47, 92, 23, 17, k.p.dark) +
				k.g("pa-breathe", "50% 100%", k.P("M44 63Q45 53 62 57Q83 60 84 88L81 107H44Q35 83 44 63", k.p.body) + k.P("M57 67Q68 60 77 68L75 101H55Z", k.p.belly)) +
				k.P("M49 80Q56 75 59 84L60 107H48Z", k.p.body) +
				k.P("M72 81Q78 77 82 84L85 107H73Z", k.p.body) +
				k.E(46, 106, 12, 4, k.p.belly) +
				k.E(78, 106, 8, 4, k.p.belly) +
				k.g(
					"pa-head",
					"50% 90%",
					k.P("M44 32L41 19L53 27M76 26L86 16L85 36", k.p.dark) +
						k.P("M38 43Q35 22 59 21Q84 19 91 39Q100 55 86 64Q63 76 44 62Q37 56 38 43", k.p.body) +
						k.P("M55 46Q68 40 80 44Q98 44 94 56Q92 67 74 67Q55 67 52 58Q49 51 55 46", k.p.belly) +
						k.eye(54, 41, 4.4) +
						k.eye(76, 39, 4.1) +
						k.FE(87, 47, 1.2, 1, k.p.o) +
						k.L("M64 57Q71 62 78 57", k.p.o, 1.2)
				),
		},
		blazilisk: {
			name: "Blazilisk",
			type: "fire",
			kind: "pet",
			from: "embit",
			head: { x: 70, y: 36, r: 26 },
			palette: { o: "#713e37", body: "#d97c55", dark: "#ad593e", belly: "#ffe0ae", eye: "#48303a", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"90% 90%",
					k.P("M43 103Q9 110 11 86Q11 76 19 78Q28 91 46 84Z", k.p.dark) +
						k.g("pa-flame", "50% 100%", k.P("M16 81Q3 74 10 59Q14 68 19 61Q29 75 16 81", k.p.flame) + k.F("M16 78Q11 72 16 67Q23 75 16 78", k.p.flameIn))
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M37 80Q36 72 32 65L47 72ZM46 71Q45 62 43 56L58 64Z", k.p.dark) +
						k.P("M40 73Q44 64 56 63L54 47L79 48Q75 72 86 82Q103 101 78 107H41Q24 103 30 88Q32 78 40 73", k.p.body) +
						k.P("M57 55L73 54Q65 74 78 88Q85 99 67 101H46Q36 97 42 91Q61 93 62 85Q53 69 57 55", k.p.belly) +
						k.P("M54 68Q47 67 45 74L43 80Q42 84 46 85Q51 84 55 79L58 72Z", k.p.body) +
						k.L("M45 76Q42 82 47 84Q51 83 54 79", k.p.dark, 1.2)
				) +
				k.g(
					"pa-head",
					"50% 90%",
					k.P("M44 28Q36 16 38 7L55 18M76 16L91 6Q94 19 86 31", k.p.belly) +
						k.P("M41 35Q37 16 62 15Q89 14 94 35Q103 55 82 62Q56 68 44 54Q39 47 41 35", k.p.body) +
						k.P("M55 39Q64 34 78 38Q99 37 98 49Q96 61 77 61Q56 63 52 51Q49 45 55 39", k.p.belly) +
						k.eye(55, 34, 4.4) +
						k.eye(79, 32, 4.4) +
						k.FE(91, 40, 1.4, 1, k.p.o) +
						k.L("M65 51Q73 57 81 51", k.p.o, 1.2)
				),
		},
		/* ---- Water line ---- */
		pudduck: {
			name: "Pudduck",
			type: "water",
			kind: "pet",
			head: { x: 67, y: 42, r: 25 },
			palette: { o: "#32566b", body: "#8ccbcf", dark: "#5fa5b6", belly: "#ecf5e8", beak: "#efc17c", eye: "#30475c", fx: "water", drop: "#81d8ef" },
			draw: k =>
				k.P("M39 100L27 109H54L59 102M68 102L65 109H90L81 99", k.p.beak) +
				k.g("pa-breathe", "50% 100%", k.P("M29 88Q27 66 51 62Q80 55 90 78Q101 106 68 107H48Q28 105 29 88", k.p.body) + k.FE(65, 87, 22, 18, k.p.belly)) +
				k.g("pa-wing", "65% 8%", k.P("M46 72Q35 73 32 82Q29 93 40 98Q52 97 57 87Q51 84 48 78Q49 74 46 72Z", k.p.dark)) +
				k.g(
					"pa-head",
					"50% 90%",
					k.P("M44 29Q40 18 48 13Q49 24 58 22Q62 16 68 18L63 25", k.p.dark) +
						k.P("M37 43Q36 23 61 22Q88 20 92 42Q98 61 80 68Q55 76 42 63Q35 56 37 43", k.p.body) +
						k.P("M52 42Q61 35 68 43Q76 35 85 42Q92 56 81 62Q64 68 53 60Q44 52 52 42", k.p.belly) +
						k.eye(56, 43, 4.1) +
						k.eye(77, 42, 4.1) +
						k.P("M63 49Q72 45 83 50Q88 54 81 58Q69 62 61 56Q58 52 63 49", k.p.beak) +
						k.L("M65 54Q73 56 80 53", k.p.o, 1)
				),
		},
		pondswan: {
			name: "Pondswan",
			type: "water",
			kind: "pet",
			from: "pudduck",
			head: { x: 87, y: 24, r: 15 },
			palette: {
				o: "#32566b",
				body: "#d9eeeb",
				dark: "#8fc4ca",
				feather: "#b9dbd9",
				belly: "#f7f7e9",
				beak: "#efc17c",
				eye: "#30475c",
				fx: "water",
				drop: "#81d8ef",
			},
			draw: k =>
				k.FE(60, 110, 47, 2.6, k.p.dark, 0.4) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.g("pa-wing", "12% 55%", k.P("M80 84Q97 78 103 60Q111 75 105 87Q98 98 83 99Z", k.p.feather)) +
						k.P("M28 92Q11 93 8 82Q21 87 29 81Z", k.p.feather) +
						k.P("M22 84Q26 70 54 74Q71 78 78 70Q81 63 73 53C57 34 70 13 86 15L91 29Q77 31 84 44C103 61 99 82 84 96Q71 109 43 106Q18 105 22 84", k.p.body) +
						k.P("M29 92Q55 93 80 83Q88 100 65 104H42Q31 103 29 92", k.p.belly) +
						k.g(
							"pa-wing",
							"85% 74%",
							k.P("M59 78Q66 92 54 99Q35 105 24 92Q12 73 11 35Q20 53 29 59Q25 43 29 28Q37 49 45 61Q46 48 51 44Q54 66 59 78Z", k.p.feather) +
								k.P("M16 52Q23 69 47 90Q30 85 23 74Q17 64 16 52Z", k.p.belly) +
								k.P("M30 46Q35 65 54 88Q40 81 34 67Q30 55 30 46Z", k.p.body) +
								k.P("M48 60Q51 74 58 87Q53 83 48 73Z", k.p.belly) +
								k.P("M34 88Q44 94 58 87Q62 95 51 99Q40 100 34 94Z", k.p.body)
						)
				) +
				k.g(
					"pa-head",
					"40% 85%",
					k.P("M78 16Q76 8 81 5L85 12Q91 7 94 9L92 17", k.p.dark) +
						k.P("M72 25Q71 12 86 12Q102 12 103 26Q104 39 88 40Q74 39 72 25", k.p.body) +
						k.FE(89, 30, 12, 8, k.p.belly) +
						k.eye(89, 23, 3.9) +
						k.P("M98 26Q108 26 115 31Q108 36 98 33Z", k.p.beak) +
						k.L("M101 31L110 32", k.p.o, 0.9)
				),
		},
		/* ---- Grass line ---- */
		sprout: {
			name: "Sprout",
			type: "grass",
			kind: "pet",
			head: { x: 60, y: 62, r: 26 },
			palette: { o: "#3a5e41", body: "#94bb79", dark: "#6b915e", face: "#e5edc8", leaf: "#6ba779", eye: "#35503c", fx: "grass", seed: "#9d7958" },
			draw: k =>
				k.P("M37 96Q45 94 51 99L51 104Q54 109 47 109H34Q28 107 34 103Z", k.p.seed) +
				k.P("M70 99Q76 94 84 96L87 103Q93 108 86 109H73Q67 109 70 104Z", k.p.seed) +
				k.g("pa-breathe", "50% 100%", k.P("M35 75Q34 57 50 55H73Q90 60 85 85L82 100Q74 107 61 107Q44 108 37 99Z", k.p.dark)) +
				k.g("pa-leaf", "100% 50%", k.P("M40 82Q28 74 21 80Q14 86 23 93Q30 98 40 91Z", k.p.leaf)) +
				k.g("pa-leaf", "0% 50%", k.P("M80 82Q92 74 99 80Q106 87 97 94Q90 98 80 91Z", k.p.leaf), -1) +
				k.g(
					"pa-head",
					"50% 90%",
					k.P("M30 57Q29 36 59 35Q88 33 91 57L87 79Q83 94 60 94Q35 95 32 80Z", k.p.body) +
						k.P("M41 58Q50 49 60 56Q72 48 80 59Q90 76 77 83Q61 91 45 82Q33 75 41 58", k.p.face) +
						k.eye(48, 65, 4.1) +
						k.eye(73, 65, 4.1) +
						k.L("M54 75Q60 80 67 75", k.p.o, 1.2) +
						k.g(
							"pa-leaf",
							"50% 100%",
							k.L("M60 38V26", k.p.dark, 3) + k.P("M60 29Q33 34 33 16Q49 10 60 29", k.p.leaf) + k.P("M60 29Q64 7 85 14Q85 32 60 29", k.p.leaf)
						)
				),
		},
		oakguard: {
			name: "Oakguard",
			type: "grass",
			kind: "pet",
			from: "sprout",
			head: { x: 60, y: 40, r: 26 },
			palette: {
				o: "#4b3a2d",
				body: "#a07c56",
				dark: "#795b40",
				plate: "#c39e70",
				moss: "#90b77d",
				leaf: "#6ba779",
				leafDark: "#528667",
				eye: "#354d3b",
				fx: "grass",
			},
			draw: k =>
				k.P("M33 90L28 109L40 106L48 109L48 92M73 91L72 109L82 106L92 109L86 89", k.p.dark) +
				k.g("pa-arm", "80% 10%", k.P("M37 62Q13 66 17 89Q21 101 28 94L35 77Z", k.p.body)) +
				k.g("pa-arm", "20% 10%", k.P("M83 62Q107 66 103 89Q99 101 92 94L85 77Z", k.p.body), -1) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M31 70Q31 55 60 55Q90 55 90 72L86 96Q61 108 34 96Z", k.p.body) +
						k.P("M44 70Q60 61 76 70L74 94Q60 101 46 94Z", k.p.plate) +
						k.L("M60 73V93", k.p.dark, 1.3)
				) +
				k.g(
					"pa-head",
					"50% 90%",
					k.P("M33 39Q32 22 58 22Q86 20 88 39L85 56Q80 69 60 69Q38 69 34 56Z", k.p.body) +
						k.FE(60, 48, 22, 16, k.p.plate) +
						k.eye(48, 44, 4.2) +
						k.eye(72, 44, 4.2) +
						k.L("M54 54Q60 59 66 54", k.p.o, 1.2) +
						k.g(
							"pa-leaf",
							"50% 100%",
							k.E(37, 27, 14, 10, k.p.leafDark) +
								k.E(83, 26, 14, 10, k.p.leafDark) +
								k.E(48, 19, 16, 12, k.p.leaf) +
								k.E(72, 18, 16, 12, k.p.leaf) +
								k.E(60, 12, 14, 10, k.p.moss)
						)
				),
		},
		/* ---- Electric line ---- */
		voltpup: {
			name: "Voltpup",
			type: "electric",
			kind: "pet",
			head: { x: 65, y: 39, r: 26 },
			palette: { o: "#435077", body: "#dfbd70", dark: "#aa854f", belly: "#faf0d7", mark: "#5b526e", eye: "#384260", fx: "electric", spark: "#9cdbeb" },
			draw: k =>
				k.g("pa-tail", "100% 80%", k.P("M39 101Q12 111 9 96L8 89L18 94L15 83Q24 85 25 95L42 91Z", k.p.dark)) +
				k.P("M43 78Q22 77 21 92Q18 104 33 107H45Q53 104 49 99L44 96Q53 89 43 78Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M46 61Q61 55 78 63Q91 79 85 107H43Q37 79 46 61", k.p.body) + k.P("M47 65Q61 58 80 65L74 88L62 82L53 88Z", k.p.belly)
				) +
				k.P("M51 83Q57 82 62 88L61 101L63 105Q65 109 59 109H49Q45 108 48 103Z", k.p.belly) +
				k.P("M68 84Q74 79 79 82L81 101L84 105Q86 109 80 109H70Q66 109 68 104Z", k.p.belly) +
				k.P("M32 100Q39 97 45 101L47 105Q50 110 42 110H30Q25 109 27 105Z", k.p.body) +
				k.g(
					"pa-head",
					"50% 90%",
					k.g("pa-ear", "60% 100%", k.P("M41 34Q32 21 36 9L58 21Z", k.p.mark) + k.F("M40 16L51 23L43 27Z", "#df9290")) +
						k.g("pa-ear", "40% 100%", k.P("M74 21L91 8Q96 24 87 36Z", k.p.mark) + k.F("M80 23L88 16L87 28Z", "#df9290"), -1.2) +
						k.P("M36 45Q33 20 62 20Q93 17 95 44L93 59Q91 72 65 72Q38 72 36 57Z", k.p.body) +
						k.P("M45 40Q49 30 59 37Q66 31 73 37L83 45Q98 48 92 61Q88 68 65 68Q42 69 40 58Q37 48 45 40", k.p.belly) +
						k.eye(52, 43, 4.1) +
						k.eye(75, 43, 4.1) +
						k.P("M59 49Q64 46 70 49Q73 53 65 57Q57 54 59 49", k.p.mark) +
						k.g("pa-pant", "50% 0%", k.P("M61 60H69L68 69Q65 74 62 69Z", "#d97c82")) +
						k.L("M65 57V60M55 60Q60 65 65 60Q70 65 75 60", k.p.o, 1.1)
				),
		},
		thundrover: {
			name: "Thundrover",
			type: "electric",
			kind: "pet",
			from: "voltpup",
			head: { x: 83, y: 36, r: 20 },
			palette: {
				o: "#435077",
				body: "#dbb45f",
				dark: "#b58b4e",
				belly: "#faf0d7",
				shade: "#e8d6b0",
				mark: "#625675",
				eye: "#384260",
				fx: "electric",
				spark: "#9cdbeb",
			},
			draw: k =>
				k.g(
					"pa-tail",
					"90% 90%",
					k.P("M42 88Q13 95 8 73L4 51Q17 58 24 55L18 36Q35 45 36 61L43 56Q51 72 42 88", k.p.body) +
						k.P("M4 51Q15 59 24 55L18 36Q24 39 28 44L30 59L20 64L26 76Q12 70 4 51", k.p.belly) +
						k.P("M29 65L36 62L33 70L39 68L34 79L29 81L31 73L26 75Z", k.p.mark)
				) +
				k.P("M40 80Q35 89 36 100L34 104Q32 109 39 109H47Q51 108 47 104L49 91L53 82ZM71 78L72 100L70 104Q70 109 77 109H85Q89 108 84 103L82 78Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M33 72Q35 56 54 57L74 61Q85 46 96 49Q105 58 101 76Q98 90 81 91L46 89Q31 87 33 72", k.p.body) +
						k.P("M45 63L54 68L49 75L58 80L52 84L42 75L47 69Z", k.p.mark)
				) +
				k.P("M49 80Q59 80 64 88L60 101L60 104Q65 109 59 109H49Q44 108 48 103L51 95Q46 90 49 80Z", k.p.body) +
				k.P("M87 75Q98 72 102 79L101 100L104 104Q108 109 101 109H91Q86 109 89 104L90 91Z", k.p.body) +
				k.P("M49 103Q54 105 61 103L60 104Q65 109 59 109H49Q44 108 48 103ZM90 103Q96 105 102 102L104 104Q108 109 101 109H91Q86 109 89 104Z", k.p.belly) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M66 44Q77 37 94 43L106 55L98 58L104 69L94 68L93 83L82 75L72 81L72 69L58 70L65 60L56 54Z", k.p.belly) +
						k.P("M68 53L75 60L69 65L81 64L83 75L90 66L98 68L91 57Z", k.p.shade)
				) +
				k.g(
					"pa-head",
					"35% 90%",
					k.g("pa-ear", "60% 100%", k.P("M66 30Q58 17 62 2Q76 9 80 25Z", k.p.body) + k.P("M66 10L74 25L68 24Z", k.p.mark)) +
						k.g("pa-ear", "40% 100%", k.P("M82 23Q86 8 98 0Q102 19 94 32Z", k.p.body) + k.P("M94 9L92 25L86 26Z", k.p.mark), -1) +
						k.P("M62 37Q60 23 79 22Q99 19 103 36L113 42Q119 47 109 53Q92 61 75 54Q62 51 62 37", k.p.body) +
						k.P("M84 39Q92 42 98 40L113 43Q119 47 109 53Q91 60 78 51Z", k.p.belly) +
						k.eye(78.5, 35.5, 4.6) +
						k.eye(93, 35, 3.7) +
						k.L("M73 31Q77 29 81 31M90.5 30.5Q93 29.5 96 31", k.p.mark, 1.3) +
						k.P("M110 41Q118 40 117 45L113 48L108 45Z", k.p.mark) +
						k.L("M97 50Q104 54 111 49", k.p.o, 1.2)
				),
		},
	};

	/* The miniboss. Its rune core and visor take the colour of its (random) element. */
	const runeColour = { fire: "#ff7a2a", water: "#4fc3ff", grass: "#7ee04f", electric: "#ffe23f", normal: "#e8e8e8" };
	const golem = {
		name: "Golem Sentinel",
		kind: "miniboss",
		head: { x: 60, y: 33, r: 21 },
		palette: { o: "#515b70", body: "#a7b2c4", dark: "#7c8ba3", light: "#d1d9df", moss: "#90ab89", eye: "#e9ca78", rune: "#e9ca78" },
		draw: k =>
			k.P("M34 84H52L53 100Q58 108 50 110H29Q25 109 28 104L30 96ZM68 84H86L90 97L92 104Q95 110 87 110H72Q65 109 67 103Z", k.p.dark) +
			k.P("M29 102Q40 104 52 101L54 105Q56 110 50 110H29Q25 109 28 104ZM68 101Q80 104 91 102L92 104Q95 110 87 110H72Q65 109 67 103Z", k.p.light) +
			k.g(
				"pa-arm",
				"80% 10%",
				k.P("M35 45Q17 42 13 57L10 78Q5 80 6 92Q11 101 28 96L32 78L38 63Z", k.p.dark) +
					k.P("M13 51Q22 43 34 48L32 66L10 64Z", k.p.body) +
					k.L("M11 84L24 86", k.p.o, 1.5)
			) +
			k.g(
				"pa-arm",
				"20% 10%",
				k.P("M85 45Q103 42 107 57L110 78Q115 80 114 92Q109 101 92 96L88 78L82 63Z", k.p.dark) +
					k.P("M86 48Q98 43 107 51L110 64L88 66Z", k.p.body) +
					k.L("M96 86L109 84", k.p.o, 1.5),
				-0.8
			) +
			k.g(
				"pa-breathe",
				"50% 100%",
				k.P("M29 53Q30 44 43 44H77Q90 44 91 54L87 89Q82 97 60 97Q37 96 33 89Z", k.p.body) +
					k.P("M30 52Q60 42 90 52L88 61H32Z", k.p.light) +
					k.P("M39 63L44 84L41 91L34 85ZM81 63L77 84L80 91L87 85Z", k.p.dark) +
					k.g("pa-rune", "50% 50%", k.P("M60 58L73 72L60 87L47 72Z", k.p.rune) + k.L("M60 65V80M54 72H66", k.p.o, 1.6)) +
					k.FE(38, 49, 8, 4, k.p.moss)
			) +
			k.g(
				"pa-bob",
				"50% 100%",
				k.P("M39 25Q39 15 49 15H71Q81 15 81 25V45H39Z", k.p.body) +
					k.P("M40 24Q60 18 80 24V29H40Z", k.p.light) +
					k.P("M43 31Q60 27 77 31V39H43Z", k.p.o) +
					k.eye(52, 34, 5, { slit: true }) +
					k.eye(68, 34, 5, { slit: true }) +
					k.L("M54 43H66", k.p.dark, 1.3)
			),
	};

	/* Wild and dungeon enemies, by the names the game gives them. */
	const wild = {
		Cinderbeast: {
			type: "fire",
			head: { x: 78, y: 54, r: 23 },
			palette: { o: "#503b3e", body: "#926d65", dark: "#715254", light: "#c3987d", crack: "#ffc16c", eye: "#ffe0a3", ...fire },
			draw: k =>
				k.P("M27 87Q23 102 28 108H42L47 91M72 90L74 108H90Q94 97 87 85", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.g("pa-flame", "50% 100%", k.P("M31 69Q17 47 28 31Q31 41 36 38Q47 55 31 69Z", k.p.flame)) +
						k.g("pa-flame", "50% 100%", k.P("M50 62Q34 38 47 21Q49 33 55 29Q65 48 50 62Z", k.p.flame), -0.7) +
						k.P("M21 77Q22 55 51 51Q82 49 91 73Q102 99 76 106H43Q18 102 21 77", k.p.body) +
						k.FE(55, 91, 22, 13, k.p.light) +
						k.L("M33 69L42 76L38 85M55 59L52 69L60 74", k.p.crack, 2.6)
				) +
				k.g(
					"pa-bob",
					"40% 90%",
					k.E(62, 37, 8, 8, k.p.dark) +
						k.E(91, 36, 8, 8, k.p.dark) +
						k.P("M53 51Q52 34 77 33Q101 32 103 53L103 65Q100 80 79 79Q55 78 53 63Z", k.p.body) +
						k.FE(86, 64, 19, 11, k.p.light) +
						k.eye(67, 52, 4.8) +
						k.eye(91, 50, 4.5) +
						k.L("M60 45L70 48M86 46L96 42", k.p.o, 2.1) +
						k.P("M88 58Q96 54 100 59Q98 65 92 64Z", k.p.o) +
						k.L("M78 70Q89 66 99 69", k.p.o, 1.5) +
						k.P("M80 69L83 76L87 68", "#fff1d7")
				),
		},
		Magmite: {
			type: "fire",
			head: { x: 96, y: 78, r: 17 },
			palette: { o: "#56424b", body: "#a0827b", dark: "#735d65", lava: "#ffc07a", leg: "#675261", eye: "#ffe5ad", ...fire },
			draw: k =>
				k.g(
					"pa-breathe",
					"50% 100%",
					k.L("M30 88Q22 92 20 99L24 108M47 90Q47 99 43 108M70 90Q72 100 77 108M87 86Q94 95 101 102L98 108", k.p.leg, 5) +
						k.P("M18 85Q17 53 42 47Q67 39 88 58Q102 70 96 94H29Q19 94 18 85", k.p.body) +
						k.L("M38 51L46 63L41 76L47 91M62 49L57 62L70 71L64 91M80 58L77 70L87 78", k.p.lava, 3) +
						k.P("M19 83Q54 91 97 83L96 91Q94 95 83 95H31Q20 94 19 88Z", k.p.dark)
				) +
				k.g(
					"pa-bob",
					"20% 85%",
					k.P("M82 73Q84 61 98 63Q113 65 112 82Q111 96 96 96Q80 94 82 73", k.p.dark) +
						k.L("M91 66L87 53M104 65L110 52", k.p.o, 2.4) +
						k.E(87, 51, 3, 4, k.p.flame) +
						k.E(111, 50, 3, 4, k.p.flame) +
						k.eye(91, 77, 4.4) +
						k.eye(105, 77, 4.4) +
						k.L("M87 71L94 73M102 73L108 70M93 88L103 86", k.p.o, 1.5)
				),
		},
		Ashfang: {
			type: "fire",
			head: { x: 85, y: 53, r: 23 },
			palette: { o: "#514555", body: "#aaa0ac", dark: "#817486", light: "#e6d8d2", fang: "#fff0d8", eye: "#ed9b62", ...fire },
			draw: k =>
				k.g(
					"pa-tail",
					"100% 80%",
					k.P("M36 89Q13 95 9 77Q7 68 10 61Q18 61 21 72Q22 81 40 74Z", k.p.dark) +
						k.g("pa-flame", "50% 100%", k.P("M12 69C4 65 2 53 8 41Q10 49 15 45Q25 58 16 69Z", k.p.flame))
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P(
						"M35 82Q31 86 33 95L31 103Q27 107 31 109H41Q45 108 44 104L45 92L49 84M74 80Q72 89 77 99L77 104Q74 109 80 109H89Q93 108 89 104L87 94L88 82",
						k.p.dark
					) +
						k.P("M26 76Q29 58 50 58L75 63Q91 59 96 76Q99 96 76 96H42Q22 94 26 76", k.p.body) +
						k.P(
							"M43 79Q54 77 58 87Q60 92 55 98L53 103Q61 107 55 109H44Q38 109 41 103L44 95Q36 88 39 83ZM86 76Q95 72 100 80L99 97L102 103Q109 109 102 109H91Q85 109 88 103L89 92L84 82Z",
							k.p.body
						)
				) +
				k.g(
					"pa-head",
					"30% 90%",
					k.P("M63 40L59 18Q73 20 78 32M85 31L101 14L101 45", k.p.dark) +
						k.P("M61 48Q60 32 81 31Q101 29 105 48L115 58Q118 68 103 71Q80 74 67 62Z", k.p.body) +
						k.P("M83 52Q93 48 104 54L115 58Q119 66 104 70Q86 72 80 61Z", k.p.light) +
						k.eye(77, 46, 4.6) +
						k.eye(96, 44, 3.8) +
						k.L("M71 40L80 43M92 41L99 38", k.p.o, 1.7) +
						k.E(113, 58, 4, 3, k.p.o) +
						k.L("M91 64L109 65", k.p.o, 1.4) +
						k.P("M94 64L97 73L101 65M105 65L107 71L110 65", k.p.fang)
				),
		},
		Drizzlefin: {
			type: "water",
			head: { x: 79, y: 66, r: 22 },
			palette: { o: "#365a73", body: "#7ebfcd", dark: "#5395b0", belly: "#d9efe8", cloud: "#eef4eb", eye: "#334963", fx: "water", drop: "#9cdaea" },
			draw: k =>
				k.g(
					"pa-float",
					"50% 50%",
					k.g("pa-tail", "100% 50%", k.P("M35 60Q18 59 8 48Q5 62 15 71Q7 80 9 88Q24 84 37 75Z", k.p.dark)) +
						k.E(57, 38, 10, 7, k.p.cloud) +
						k.E(68, 35, 12, 9, k.p.cloud) +
						k.E(80, 38, 10, 7, k.p.cloud) +
						k.P("M27 64Q30 44 60 43Q91 41 103 63Q109 83 83 93Q52 102 32 84Q25 77 27 64", k.p.body) +
						k.P("M35 76Q59 88 96 76Q90 94 65 96Q44 94 35 76", k.p.belly) +
						k.P("M53 86L46 101Q62 100 69 90Z", k.p.dark) +
						k.eye(79, 62, 5.2) +
						k.L("M72 55L82 58", k.p.o, 1.8) +
						k.P("M91 72Q103 66 103 75Q100 83 92 79Z", k.p.o) +
						k.P("M93 71L96 76L99 70", k.p.belly) +
						k.L("M62 59Q59 68 63 75", k.p.dark, 1.5)
				) + k.g("pa-drop", "50% 50%", k.P("M51 37Q44 47 51 48Q57 47 51 37", k.p.drop), -0.4),
		},
		Tidemaw: {
			type: "water",
			head: { x: 60, y: 67, r: 31 },
			palette: {
				o: "#384e72",
				body: "#7296bf",
				dark: "#455f87",
				belly: "#b7d5e4",
				mouth: "#394563",
				tooth: "#f9efdc",
				lure: "#d7f5e9",
				eye: "#354766",
				fx: "water",
				drop: "#9cdaea",
			},
			draw: k =>
				k.P("M30 78Q11 72 8 86Q16 99 33 95M90 78Q111 70 113 86Q107 100 88 95", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M23 77Q22 49 46 43Q80 34 96 64Q115 103 80 107H42Q18 105 23 77", k.p.body) +
						k.E(42, 46, 8, 7, k.p.body) +
						k.E(79, 44, 8, 7, k.p.body) +
						k.eye(42, 47, 4.6) +
						k.eye(79, 45, 4.6) +
						k.P("M30 76Q61 61 93 75Q101 97 63 101Q27 100 30 76", k.p.mouth) +
						k.P(
							"M34.97 73.79Q40.87 71.38 46.81 70.01L41 84ZM52.45 68.96Q58.72 68.05 65.03 68.29L59 82ZM73.26 69.11Q79.59 70.11 85.97 72.27L79 84ZM44.91 98.33L49 88L56.19 100.57Q49.77 99.91 44.91 98.33ZM63 101L70 90L79.13 97.88Q72.5 100 63 101Z",
							k.p.tooth
						) +
						k.L("M30 76Q61 61 93 75", k.p.belly, 2) +
						k.g("pa-leaf", "0% 100%", k.L("M70 44Q73 18 91 20", k.p.dark, 2.4) + k.g("pa-rune", "50% 50%", k.E(95, 21, 6, 6, k.p.lure)))
				),
		},
		Brinejaw: {
			type: "water",
			head: { x: 60, y: 72, r: 25 },
			palette: { o: "#36566c", body: "#71aabb", dark: "#4f839e", claw: "#91c6ce", spot: "#d8ece2", eye: "#34465b", fx: "water", drop: "#9cdaea" },
			draw: k =>
				k.L("M37 89L25 103M46 93L41 108M75 91L83 108M85 86L100 103", k.p.dark, 4.5) +
				k.g(
					"pa-arm",
					"100% 100%",
					k.L("M37 78Q27 74 23 64L20 52", k.p.dark, 5.5) + k.P("M20 58Q4 58 5 42Q6 31 13 28L18 43L25 27Q37 36 31 50Q28 57 20 58", k.p.claw)
				) +
				k.g(
					"pa-arm",
					"0% 100%",
					k.L("M84 78Q95 72 99 63L102 51", k.p.dark, 5.5) + k.P("M102 57Q88 55 89 40Q90 31 97 26L102 41L109 26Q121 37 114 50Q110 56 102 57", k.p.claw),
					-0.8
				) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M29 74Q30 58 58 57Q90 56 93 76L89 94Q59 108 31 94Z", k.p.body) +
						k.L("M44 65Q42 57 44 51M76 64Q79 56 76 49", k.p.dark, 4.5) +
						k.E(44, 49, 6, 6, k.p.claw) +
						k.E(76, 47, 6, 6, k.p.claw) +
						k.eye(44, 49, 4.4) +
						k.eye(76, 47, 4.4) +
						k.L("M39 44L46 46M72 44L79 41", k.p.o, 1.5) +
						k.P("M39 78Q60 72 83 78Q85 94 61 96Q38 97 39 78Z", k.p.dark) +
						k.P("M40 89Q45 97 60 98Q76 98 82 88L81 96Q59 106 39 96ZM45 96L49 86L55 99ZM64 99L69 85L76 97Z", k.p.spot)
				),
		},
		Thornbeast: {
			type: "grass",
			head: { x: 90, y: 75, r: 21 },
			palette: { o: "#4b5940", body: "#9cac70", dark: "#758655", thorn: "#c5d38b", tusk: "#f4e8cc", snout: "#c6ab82", eye: "#c86b53", fx: "grass" },
			draw: k =>
				k.P("M28 84L25 106H39L46 86M72 84L74 107H89L87 82", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M18 74Q19 51 53 49Q88 47 94 75Q101 101 72 103H42Q15 101 18 74", k.p.body) +
						k.P("M26 59Q18 47 29 39Q37 44 40 55M45 51Q43 35 54 29Q65 38 64 51M72 54Q75 40 84 39Q92 49 88 63", k.p.thorn) +
						k.L("M43 70L52 66M53 86L66 81", k.p.dark, 2)
				) +
				k.g(
					"pa-bob",
					"20% 90%",
					k.P("M75 65Q65 54 73 48L85 57M93 57Q99 48 106 53L103 67", k.p.dark) +
						k.P("M67 74Q67 57 87 56Q106 56 109 73L112 86Q106 99 88 98Q68 95 67 74", k.p.body) +
						k.P("M108 91Q116 85 113 78Q122 85 112 97Z", k.p.tusk) +
						k.P("M88 78Q95 73 106 76Q117 78 116 87Q114 96 102 97Q90 97 86 89Q83 83 88 78Z", k.p.snout) +
						k.eye(80, 71, 4.4) +
						k.eye(99, 70, 3.4) +
						k.L("M74 65L83 68M97 65L103 63", k.p.o, 1.7) +
						k.E(98, 84, 1.5, 2, k.p.o) +
						k.E(107, 83, 1.4, 2, k.p.o) +
						k.P("M89 91Q81 85 86 78Q75 85 86 97Z", k.p.tusk) +
						k.L("M93 93Q102 90 110 92", k.p.o, 1.1)
				),
		},
		Bramblil: {
			type: "grass",
			head: { x: 60, y: 69, r: 28 },
			palette: { o: "#37533d", body: "#86aa71", dark: "#60855e", vine: "#bfd18e", berry: "#ce7c79", eye: "#34473a", fx: "grass" },
			draw: k =>
				k.P("M37 96Q46 94 51 99L51 104Q56 109 48 109H32Q27 108 32 104Z", k.p.dark) +
				k.P("M73 99Q80 94 88 96L89 104Q95 108 88 109H73Q67 109 72 104Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P(
						"M28 85L16 81L24 69Q18 61 23 51L18 40L33 43Q41 30 54 33L62 23L70 35Q85 34 94 48L105 46L99 62Q108 75 100 86L105 97L90 96Q64 114 36 99L23 102Z",
						k.p.body
					) +
						k.P("M31 92Q61 103 97 88Q99 101 76 105Q49 111 34 100Z", k.p.dark) +
						k.L("M30 59Q37 39 53 45Q65 54 46 60M74 39Q91 46 85 56M40 88Q46 76 34 73M91 80Q74 77 78 92", k.p.vine, 2.5) +
						k.eye(47, 68, 4.9) +
						k.eye(74, 67, 4.9) +
						k.L("M39 60L49 64M71 63L81 58", k.p.o, 2) +
						k.L("M50 82L58 78L68 82L76 78", k.p.o, 1.8) +
						k.E(34, 45, 4, 4, k.p.berry) +
						k.E(88, 91, 4, 4, k.p.berry)
				),
		},
		Mosshorn: {
			type: "grass",
			head: { x: 85, y: 52, r: 22 },
			palette: { o: "#5b5342", body: "#b5aa8c", dark: "#8e836c", horn: "#e5d7b3", moss: "#86ab79", face: "#d3c6a4", eye: "#4a4b3b", fx: "grass" },
			draw: k =>
				k.P("M29 83L24 107H35L42 87M64 84L69 108H80L77 82", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M18 73Q20 54 48 54Q76 52 84 73Q94 98 66 99H38Q15 95 18 73", k.p.body) +
						k.P("M29 84L34 107H45L45 84M77 78L84 107H95L91 78", k.p.body) +
						k.P("M24 64Q32 53 39 59Q51 46 58 56Q74 54 77 66Q62 73 44 69Q30 73 24 64", k.p.moss)
				) +
				k.g(
					"pa-head",
					"25% 90%",

					k.P("M92 40Q109 36 111 24Q113 12 103 10Q95 9 93 17Q92 23 99 26Q104 26 104 22Q99 23 99 18Q99 15 103 16Q109 20 104 28Q101 32 91 33Z", k.p.horn) +
						k.P("M68 46L54 41Q51 49 68 55M96 45L111 40Q115 51 99 56", k.p.dark) +
						k.P("M66 49Q65 34 84 34Q103 34 105 54L105 69Q99 84 83 78Q67 70 66 49", k.p.body) +
						k.P("M70 35Q80 27 91 34L87 41L77 39Z", k.p.moss) +
						k.P(
							"M75 44Q61 45 56 33C50 18 63 8 75 14C87 20 84 36 73 36C64 36 62 27 68 22C73 19 78 24 76 28Q74 24 71 26Q68 30 73 31Q80 32 78 24C75 14 63 18 62 26Q59 37 76 38Z",
							k.p.horn
						) +
						k.FE(93, 67, 14, 10, k.p.face) +
						k.eye(78, 50, 4.3) +
						k.eye(96, 49, 3.8) +
						k.L("M72 44L80 47M93 45L100 42M87 71L100 69", k.p.o, 1.6)
				),
		},
		Boltfang: {
			type: "electric",
			head: { x: 60, y: 51, r: 20 },
			palette: {
				o: "#514768",
				body: "#a391bd",
				dark: "#75658e",
				wing: "#ddc776",
				mark: "#f1dd96",
				fang: "#fbefdb",
				eye: "#efd88a",
				fx: "electric",
				spark: "#a9d9e3",
			},
			draw: k =>
				k.g(
					"pa-float",
					"50% 50%",
					k.g(
						"pa-wing",
						"100% 50%",
						k.P("M48 57Q24 29 4 35Q10 52 3 70Q18 61 24 81Q35 68 48 77Z", k.p.dark) +
							k.P("M43 59Q25 40 12 40L23 59L11 65Q20 63 25 71Q34 64 43 70Z", k.p.wing) +
							k.L("M40 60L30 56L33 64L24 62", k.p.mark, 2)
					) +
						k.g(
							"pa-wing",
							"0% 50%",
							k.P("M72 57Q96 29 116 35Q110 52 117 70Q102 61 96 81Q85 68 72 77Z", k.p.dark) +
								k.P("M77 59Q95 40 108 40L97 59L109 65Q100 63 95 71Q86 64 77 70Z", k.p.wing) +
								k.L("M80 60L90 56L87 64L96 62", k.p.mark, 2),
							-0.7
						) +
						k.E(60, 75, 16, 22, k.p.dark) +
						k.P("M48 90L52 101L60 95L68 101L72 90", k.p.body) +
						k.g(
							"pa-head",
							"50% 90%",
							k.P("M43 46Q36 32 39 14Q49 18 56 35L55 45ZM65 44L65 35Q71 22 81 14Q86 32 77 46Z", k.p.dark) +
								k.P("M42 22Q43 31 48 36L51 32Q48 26 42 22ZM72 36L75 38Q80 29 79 24Q74 29 72 36Z", k.p.wing) +
								k.E(60, 53, 22, 21, k.p.body) +
								k.eye(50, 49, 4.5) +
								k.eye(70, 49, 4.5) +
								k.L("M44 42L52 46M68 46L76 42", k.p.o, 1.7) +
								k.P("M49 59Q60 55 72 59Q68 72 60 71Q52 70 49 59", k.p.o) +
								k.P("M52 59L55 67L58 58M63 58L67 67L70 59", k.p.fang)
						)
				),
		},
		Sparkmaw: {
			type: "electric",
			head: { x: 85, y: 31, r: 22 },
			palette: {
				o: "#3e4b70",
				body: "#8396bd",
				dark: "#5c729c",
				spot: "#eed68b",
				mouth: "#d79aa8",
				eye: "#f3dc95",
				fang: "#f7efd9",
				fx: "electric",
				spark: "#a9d9e3",
			},
			draw: k =>
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M15 106Q5 104 9 96Q18 86 44 88Q67 89 60 77Q44 57 57 36L75 44Q65 59 79 74Q96 96 73 105Q48 114 15 106Z", k.p.body) +
						k.P("M22 102Q46 107 70 100Q59 108 38 108Q26 108 22 102Z", k.p.dark) +
						k.P("M15 106Q5 104 9 96L6 86L17 89L15 78L27 90L24 96L29 98L25 107Z", k.p.spot) +
						k.L("M48 94L57 89L51 84M61 58L69 54L64 47", k.p.spot, 3)
				) +
				k.g(
					"pa-bob",
					"10% 90%",
					k.P("M58 32Q58 15 78 14Q101 13 110 30Q116 43 103 51Q84 59 66 47Q58 42 58 32", k.p.body) +
						k.P("M87 31L101 26L95 18L109 25L110 35Z", k.p.spot) +
						k.eye(78, 28, 4.8) +
						k.L("M70 21L80 25", k.p.o, 1.7) +
						k.P("M82 40Q95 35 110 37Q104 50 90 49Z", k.p.o) +
						k.P("M85 39L89 47L93 38M101 38L104 45L108 37", k.p.fang) +
						k.L("M102 47L109 52L116 49", k.p.mouth, 1.4)
				),
		},
		Voltbeast: {
			type: "electric",
			head: { x: 91, y: 72, r: 23 },
			palette: {
				o: "#4b5572",
				body: "#98a5bc",
				dark: "#71819e",
				light: "#bec9d7",
				band: "#e9ca78",
				coil: "#be976d",
				eye: "#f3dc95",
				fx: "electric",
				spark: "#a9d9e3",
			},
			draw: k =>
				k.P("M29 84Q27 91 28 100L25 105Q26 109 33 109H41L44 87ZM69 86Q70 96 73 104Q71 109 79 109H89Q93 108 89 103L86 83Z", k.p.dark) +
				k.g(
					"pa-breathe",
					"50% 100%",
					k.P("M18 76Q18 50 49 47Q81 44 94 67Q110 99 75 103H43Q14 101 18 76", k.p.body) +
						k.P("M33 51L44 48L43 66L53 62L48 87Q43 90 39 89L41 74L32 78ZM62 47L73 50L68 67L79 65L74 89Q70 92 65 91L67 77L57 80Z", k.p.band) +
						k.P("M23 91Q48 101 87 91Q83 101 58 102H43Q29 101 23 95Z", k.p.dark)
				) +
				k.g(
					"pa-bob",
					"20% 90%",
					k.E(78, 54, 8, 9, k.p.dark) +
						k.P("M71 73Q69 56 88 54Q108 53 113 75L116 85Q111 98 91 96Q73 93 71 73", k.p.body) +
						k.FE(102, 84, 15, 11, k.p.light) +
						k.P("M100 61Q98 48 107 41L109 51L115 48L109 64Z", k.p.coil) +
						k.eye(85, 70, 4.5) +
						k.L("M78 64L87 67", k.p.o, 1.8) +
						k.E(111, 81, 1.5, 1.5, k.p.o) +
						k.L("M97 91L110 89", k.p.o, 1.4)
				),
		},
	};

	setup.petForms = Object.freeze({ pets, golem, wild, runeColour });
})();
