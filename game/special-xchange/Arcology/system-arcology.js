/* Arcology helpers: voyage length, the ballroom clock, guest authorization and the Colosseum redemption check.
   State lives in V.xchange.arcology (created by <<arcologyInit>>). */
setup.arcology = {
	/* Island currency, earned from courier encounters and spent at the hotel. */
	currencyName: "cipher",
	/* Cipher amounts are stored as whole thousandths of a Cipher, so every price and payout stays an integer. Shop prices are in arcology-prices.js. */
	cxN(units) {
		return ((units || 0) / 1000).toLocaleString("en-GB", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
	},
	cx(units) {
		return this.cxN(units) + " Cipher";
	},
	cxU(units) {
		return this.cxN(units) + " CIPHER";
	},

	now() {
		return Time.date.timeStamp;
	},

	/* Glitch-style effects (holo flicker and decode, Luchifen's name) follow the Text Animations settings. */
	glitchEnabled() {
		return V.options.textAnimsAll !== false && V.options.textAnimsGlitch !== false;
	},

	syncGlitch() {
		document.documentElement.classList.toggle("glitch-fx", setup.arcology.glitchEnabled());
	},

	reducedMotion: window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false },

	/* Moving lights in the island and ship sidebar scenes. Read by the location image conditions on every frame. */
	sceneMotion() {
		return !setup.arcology.reducedMotion.matches && setup.arcology.glitchEnabled();
	},

	/* Holo screens compose their text from raw data: each character waits as "_", scrambles briefly, then settles.
	   One animation-frame loop drives every running job, and glyphs change at most every 70ms, so nothing strobes. */
	composeProfiles: {
		id: { section: 120, stagger: 15, spread: 160, scramble: 120 },
		formal: { section: 0, stagger: 10, spread: 90, scramble: 70 },
		notice: { section: 0, stagger: 0, spread: 150, scramble: 100 },
		map: { section: 0, stagger: 20, spread: 300, scramble: 240 },
		quick: { section: 0, stagger: 8, spread: 80, scramble: 60 },
		/* The older left-to-right decode: symbols from the start, no placeholders. */
		decode: { section: 0, stagger: 0, spread: 385, scramble: 0, window: Infinity },
	},
	composeTargets:
		".holo-head, .holo-label, .holo-value, .holo-line, .holo-status, .holo-badge, .holo-id-issuer, .holo-id-kind, .holo-id-label, .holo-id-value, .holo-obj-title, .holo-big, .holo-amount, .holo-amount span, .holo-tile-name, .holo-tile-state, .holo-notice-title, .holo-empty",
	composeJobs: [],
	composeFrame: 0,

	animated() {
		return !setup.arcology.reducedMotion.matches && setup.arcology.glitchEnabled();
	},

	/* Text nodes a screen composes, in reading order. Link and button labels are left alone. */
	composeNodes(root) {
		const nodes = [];
		const els = root.matches?.(setup.arcology.composeTargets) ? [root] : [];
		els.push(...root.querySelectorAll(setup.arcology.composeTargets));
		els.forEach(el => {
			if (el.closest("a, button")) return;
			el.childNodes.forEach(n => {
				if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()) nodes.push(n);
			});
		});
		return nodes;
	},

	compose(root, profile = "formal", nodes) {
		const a = setup.arcology;
		if (!root) return;
		nodes ??= a.composeNodes(root);
		if (!nodes.length || !a.animated()) return;
		const p = a.composeProfiles[profile] || a.composeProfiles.formal;
		const sections = [];
		const counts = new Map();
		const start = performance.now();
		nodes.forEach(node => {
			const section = node.parentElement.closest(".holo") || root;
			if (!sections.includes(section)) sections.push(section);
			const nth = counts.get(section) || 0;
			counts.set(section, nth + 1);
			const text = node.nodeValue;
			const begin = start + sections.indexOf(section) * p.section + nth * p.stagger;
			const settle = text.split("").map((ch, j) => begin + p.scramble + (j / text.length) * p.spread + Math.random() * 60);
			a.composeJobs = a.composeJobs.filter(job => job.node !== node);
			a.composeJobs.push({ node, text, settle, window: p.window ?? p.scramble * 0.6, next: 0 });
			node.nodeValue = text.replace(/\S/g, p.window === Infinity ? "#" : "_");
		});
		if (!a.composeFrame) a.composeFrame = requestAnimationFrame(a.composeTick);
	},

	composeTick(now) {
		const a = setup.arcology;
		const GLYPHS = "0123456789ABCDEF#%&/<>=+";
		a.composeJobs = a.composeJobs.filter(job => {
			if (!job.node.isConnected) return false;
			if (now < job.next) return true;
			job.next = now + 70;
			let out = "";
			let done = true;
			for (let j = 0; j < job.text.length; j++) {
				const ch = job.text[j];
				if (ch === " " || now >= job.settle[j]) out += ch;
				else {
					done = false;
					out += now < job.settle[j] - job.window ? "_" : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
				}
			}
			job.node.nodeValue = out;
			return !done;
		});
		a.composeFrame = a.composeJobs.length ? requestAnimationFrame(a.composeTick) : 0;
	},

	/* Writes every running job's final text at once. */
	finishCompose() {
		const a = setup.arcology;
		a.composeJobs.forEach(job => (job.node.nodeValue = job.text));
		a.composeJobs = [];
		cancelAnimationFrame(a.composeFrame);
		a.composeFrame = 0;
	},

	/* Holo panels in a passage compose once per render, at a pace that suits the screen. */
	composePassage() {
		const a = setup.arcology;
		document.querySelectorAll("#passages .holo").forEach(panel => {
			const mode = panel.dataset.compose;
			// Transit screens keep the older look: only their status lines decode.
			if (mode === "lines")
				a.compose(
					panel,
					"decode",
					a.composeNodes(panel).filter(n => n.parentElement.matches(".holo-line"))
				);
			else if (mode !== "none") a.compose(panel, mode || (panel.classList.contains("holo-notice") ? "notice" : "formal"));
		});
	},

	/* The guest ID number is the registration time, written in base 36. It is the real record, not decoration. */
	guestId() {
		const fitted = V.xchange.arcology?.implant?.fitted;
		return fitted ? "G-" + Math.floor(fitted).toString(36).toUpperCase() : "";
	},

	/* "13.10.2026" */
	issueDate(ts) {
		const d = new DateTime(ts);
		return String(d.day).padStart(2, "0") + "." + String(d.month).padStart(2, "0") + "." + d.year;
	},

	/* The machine-readable line along the bottom of the card. Shown through CSS, so its "<" never reaches the wikifier. */
	mrz(handle, id) {
		const line = "ARC<<" + (handle || "GUEST").toUpperCase().replace(/[^A-Z0-9]/g, "<") + "<<" + (id || "").replace("-", "<");
		return (line + "<".repeat(44)).slice(0, 44);
	},

	/* Code 39 narrow/wide patterns: https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/Code39Reader.java */
	barcode(text) {
		const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-";
		const patterns = [
			0x034, 0x121, 0x061, 0x160, 0x031, 0x130, 0x070, 0x025, 0x124, 0x064, 0x109, 0x049, 0x148, 0x019, 0x118, 0x058, 0x00d, 0x10c, 0x04c, 0x01c, 0x103, 0x043,
			0x142, 0x013, 0x112, 0x052, 0x007, 0x106, 0x046, 0x016, 0x181, 0x0c1, 0x1c0, 0x091, 0x190, 0x0d0, 0x085,
		];
		if (!text || [...text].some(ch => !alphabet.includes(ch))) return "";
		let x = 10;
		let bars = "";
		for (const ch of `*${text}*`) {
			const code = ch === "*" ? 0x094 : patterns[alphabet.indexOf(ch)];
			for (let i = 0; i < 9; i++) {
				const w = code & (1 << (8 - i)) ? 3 : 1;
				if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="32"/>`;
				x += w;
			}
			x++;
		}
		return `<svg class="holo-id-barcode" viewBox="0 0 ${x + 9} 32" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">${bars}</svg>`;
	},

	/* The island drifts, so the trip length follows a slow cycle over the days (two to five days) with a little noise. Same day, same rough answer. */
	voyageHours() {
		const drift = Math.sin(Time.days / 4.3);
		return Math.clamp(Math.round(84 + drift * 30 + random(-6, 6)), 48, 120);
	},

	/* "tonight at 20:00", "tomorrow at 20:00", "on the 6th at 20:00" */
	when(ts) {
		const target = new DateTime(ts);
		const today = new DateTime(Time.date.year, Time.date.month, Time.date.day);
		const days = Math.floor((ts - today.timeStamp) / 86400);
		const clock = String(target.hour).padStart(2, "0") + ":" + String(target.minute).padStart(2, "0");
		if (days < 0) return String(target.day).padStart(2, "0") + "." + String(target.month).padStart(2, "0") + "." + target.year + " at " + clock;
		if (days === 0) return (target.hour >= 17 ? "tonight" : "today") + " at " + clock;
		if (days === 1) return "tomorrow at " + clock;
		return "in " + days + " days, at " + clock;
	},

	hoursUntil(ts) {
		return (ts - Time.date.timeStamp) / 3600;
	},

	/* Ballroom opens at 20:00 the next evening (the same evening if it is still small hours) and the doors close at 02:00. */
	scheduleParty() {
		const a = V.xchange.arcology;
		const day = new DateTime(Time.date.year, Time.date.month, Time.date.day, 20);
		if (Time.hour >= 6) day.addDays(1);
		a.party = { at: day.timeStamp, end: day.timeStamp + 6 * 3600, status: "invited", seen: [] };
	},

	partyPending() {
		const p = V.xchange.arcology?.party;
		return !!p && (p.status === "invited" || p.status === "attending");
	},

	partyOpen() {
		const p = V.xchange.arcology.party;
		if (!p) return false;
		const now = Time.date.timeStamp;
		return p.status === "invited" && now >= p.at - 3600 && now < p.end;
	},

	partyMissed() {
		const p = V.xchange.arcology.party;
		if (!p) return false;
		return p.status === "invited" && Time.date.timeStamp >= p.end;
	},

	/* A valid room: sponsored or paid, not revoked, not past its end. */
	hasRoom() {
		const g = V.xchange.arcology?.guest;
		return !!g && (g.status === "sponsored" || g.status === "paid") && Time.date.timeStamp < g.until;
	},

	/* Luchifen's guests always get 1207. A room the player pays for is rolled when they pay: any floor but the twelfth, and never the tenth. */
	newRoom() {
		let floor;
		do floor = random(2, 29);
		while (floor === 10 || floor === 12);
		return floor * 100 + random(1, 30);
	},
	roomNumber() {
		const g = V.xchange.arcology.guest;
		return g?.status === "paid" && g.room ? g.room : 1207;
	},
	/* The room's floor in words, for "the twelfth floor". */
	roomFloor() {
		const words =
			"- first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth twenty-first twenty-second twenty-third twenty-fourth twenty-fifth twenty-sixth twenty-seventh twenty-eighth twenty-ninth";
		return words.split(" ")[Math.floor(this.roomNumber() / 100)];
	},

	/* Whole hours of sleep that still wake the player an hour before the ballroom opens. */
	sleepBeforeParty() {
		if (V.xchange.arcology.party.status !== "invited") return Infinity;
		return Math.floor(this.hoursUntil(V.xchange.arcology.party.at - 3600));
	},

	/* "17H 24M" */
	duration(seconds) {
		const mins = Math.max(0, Math.round(seconds / 60));
		return Math.floor(mins / 60) + "H " + String(mins % 60).padStart(2, "0") + "M";
	},

	/* Everything the transit screen shows is derived from voyage.arriveAt and voyage.hours, so a refresh or a reload can never move the journey on. Only links that run <<pass>> advance it. */
	voyageStatus() {
		const v = V.xchange.arcology.voyage;
		const total = v.hours * 3600;
		const remaining = Math.max(0, v.arriveAt - Time.date.timeStamp);
		const elapsed = Math.min(total, total - remaining);
		const pct = Math.clamp(Math.floor((elapsed / total) * 100), 0, 100);
		let lines;
		if (v.escort === "loyalists") {
			lines = ["Transfer logged.", "Passenger cabin secured.", "Route held by security authority.", "No deviation permitted."];
		} else if (v.to === "arcology") {
			lines = [
				"Tracking moving destination...",
				"Adjusting navigation coordinates...",
				"Signal synchronized.",
				"Drift vector updated.",
				"Destination beacon reacquired.",
			];
		} else {
			lines = ["Mainland beacon locked.", "Route clear.", "Holding course.", "Arcology signal weakening..."];
		}
		return { total, remaining, elapsed, pct, line: lines[Math.floor(elapsed / 7200) % lines.length] };
	},

	/* Instant transit is a privilege of island authority that no visitor holds yet.
	   TODO: read the future rank or authorization state here when it exists; there is no threshold yet. */
	instantTransitAllowed() {
		return false;
	},

	/* Holo tab start-up. Presentation state only, kept in memory and cleared by resetHolo() when a save loads:
	   holoSeen holds the texts last shown. The first open after a load connects and composes the card in layers; later opens show it at once and only recompose the fields whose text changed. */
	holoSeen: null,
	holoTimers: [],

	holoOpen() {
		const a = setup.arcology;
		a.clearHoloTimers();
		/* Coming back from the news reader is the same session, so it stays quiet. */
		if (!a.holoQuiet) window.ArcologySfx?.play("holo");
		a.holoQuiet = false;
		a.holoTimers.push(
			setTimeout(() => {
				const card = document.querySelector(".holo-journal");
				const boot = document.getElementById("holoBoot");
				if (!card || !boot) return;
				const nodes = a.composeNodes(card);
				const texts = nodes.map(n => n.nodeValue);
				const prev = a.holoSeen;
				a.holoSeen = texts;
				if (prev || !a.animated()) {
					boot.remove();
					card.classList.add("authenticated", "holo-settled");
					if (prev && prev.length === texts.length)
						a.compose(
							card,
							"quick",
							nodes.filter((n, i) => texts[i] !== prev[i])
						);
					else if (prev) a.compose(card, "quick", nodes);
					return;
				}
				const line = boot.querySelector(".holo-boot-line").firstChild;
				const finish = () => {
					a.clearHoloTimers();
					if (!boot.isConnected) return;
					boot.remove();
					card.classList.add("authenticated");
					a.compose(card, "id", nodes);
				};
				a.holoTimers.push(
					setTimeout(() => {
						line.nodeValue = a.online() ? "CONNECTED" : "CACHE LOADED";
						a.compose(boot, "quick", [line]);
					}, 800),
					setTimeout(finish, 1200)
				);
			}, 0)
		);
	},

	socialHoloOpen() {
		window.ArcologySfx?.play("holo");
		setup.arcology.holoReveal(".holo-social");
	},

	/* A Holo screen opening: one scan line and its text composing in, or settled at once with reduced motion or glitch effects off.
	   Shares the Journal tab's timers and compose jobs, so a load or another screen cancels it cleanly. */
	holoReveal(selector) {
		const a = setup.arcology;
		a.clearHoloTimers();
		a.holoTimers.push(
			setTimeout(() => {
				const card = document.querySelector(selector);
				if (!card) return;
				if (!a.animated()) {
					card.classList.add("holo-settled");
					return;
				}
				card.classList.add("holo-scan");
				a.compose(card, "quick");
			}, 0)
		);
	},

	clearHoloTimers() {
		setup.arcology.holoTimers.forEach(clearTimeout);
		setup.arcology.holoTimers = [];
	},

	/* A loaded save starts with a clean screen: no timers, jobs or remembered texts from the previous one. */
	resetHolo() {
		const a = setup.arcology;
		clearTimeout(setup.arcologyNews.catchUp);
		setup.arcologyNews.catchUp = null;
		a.clearHoloTimers();
		a.finishCompose();
		a.holoSeen = null;
	},

	/* Island population. The generated NPC in slot 0 keeps its identity and pronouns; this record keeps its look and manner fixed for the whole interaction, and where to return afterwards.
	   Tier sets how visible the cybernetics are. */
	citizenMoods: {
		vip: ["arrogant", "secretive", "flirty", "friendly", "manipulative"],
		guest: ["friendly", "flirty", "secretive", "nervous", "manipulative", "suspicious"],
		worker: ["friendly", "suspicious", "nervous", "flirty"],
		under: ["dangerous", "suspicious", "manipulative", "flirty", "nervous"],
	},
	flirtChance: { friendly: 50, flirty: 85, suspicious: 10, arrogant: 35, secretive: 30, manipulative: 75, nervous: 20, dangerous: 55 },

	/* Cybernetic parts by body area, then by setting: staff (hotel/ship crew), vip, glass (Glasshouse), guest, worker, under. */
	cyberParts: {
		eyes: {
			staff: ["eyesGrey"],
			vip: ["eyesGold"],
			glass: ["eyesGlass", "eyesGold", "eyesViolet"],
			guest: ["eyesViolet"],
			worker: ["eyesRed"],
			under: ["eyesRed", "eyesCamera"],
		},
		arm: { vip: ["armBlack"], glass: ["armGlass"], guest: ["armBlack", "armChrome"], worker: ["armIndustrial"], under: ["armPatched", "armIndustrial"] },
		leg: { staff: ["legQuiet"], guest: ["legQuiet"], worker: ["legBrace"], under: ["legBrace"] },
		neural: {
			staff: ["neuralBadge"],
			vip: ["neuralJade"],
			glass: ["neuralCrown", "neuralJade"],
			guest: ["neuralStuds"],
			worker: ["neuralRaw"],
			under: ["neuralScar", "neuralRaw"],
		},
		skin: { vip: ["skinFlawless"], glass: ["skinPearl", "skinFlawless"], guest: ["skinPatch"], under: ["skinPatch"] },
		face: { glass: ["faceSymmetric"], worker: ["faceSeams"], under: ["facePlate", "faceSeams"] },
		acc: { staff: ["accVisor"], glass: ["accRings"], guest: ["accCable"], under: ["accCable"] },
	},
	cyberCount: { staff: [0, 2], vip: [0, 2], glass: [1, 3], guest: [0, 2], worker: [1, 2], under: [1, 3] },

	/* Rolled once when the NPC is generated and kept on the slot, which <<endevent>> resets. */
	cyberise(npc, style, role) {
		const a = setup.arcology;
		const [lo, hi] = a.cyberCount[style];
		const parts = a.cyberParts;
		const areas = Object.keys(parts)
			.filter(p => parts[p][style])
			.shuffle()
			.slice(0, random(lo, hi));
		npc.cyber = { style, mods: areas.map(p => parts[p][style].random()) };
		a.cyberCombat(npc, role);
	},

	/* Grade sets a fighter's baseline and the parts they actually have add to it. Health is fixed per grade, like the Colosseum's ranks,
	   and scaled once by the NPC health setting. */
	fighterRoles: {
		security: ["security guard", "bodyguard", "enforcer", "guard", "sergeant"],
		criminal: ["stranger", "gang leader", "lookout", "loader", "driver", "collector", "courier", "dealer"],
	},
	/* hp before implants and settings; dodge, hit and armour (share of a blow soaked); keep: dodge a skilled striker can't read away;
	   endure: scales the share of health one blow can take; toll: least share of a hit's pain that reaches the player. */
	gradeStats: {
		civilian: { hp: 360, dodge: 6, hit: 1.25, armour: 0.1, keep: 0, endure: 1, toll: 0 },
		criminal: { hp: 560, dodge: 14, hit: 1.5, armour: 0.1, keep: 0.3, endure: 0.65, toll: 0.12 },
		security: { hp: 950, dodge: 24, hit: 1.8, armour: 0.15, keep: 0.5, endure: 0.45, toll: 0.2 },
		elite: { hp: 1700, dodge: 28, hit: 2.2, armour: 0.15, keep: 0.6, endure: 0.55, toll: 0.28 },
		exceptional: { hp: 2700, dodge: 34, hit: 2.6, armour: 0.25, keep: 0.7, endure: 0.45, toll: 0.35 },
	},
	partTraits: {
		eyesRed: "vision",
		eyesCamera: "vision",
		eyesGrey: "vision",
		eyesGlass: "vision",
		accVisor: "vision",
		armIndustrial: "limbs",
		armChrome: "limbs",
		armBlack: "limbs",
		armPatched: "limbs",
		facePlate: "skeleton",
		faceSeams: "skeleton",
		legBrace: "legs",
		legQuiet: "legs",
		neuralRaw: "processor",
		neuralBadge: "processor",
		neuralJade: "dampener",
		neuralCrown: "dampener",
		neuralStuds: "dampener",
	},
	/* District tier plus how dangerous the city thinks the player is: 0 (quiet policed street) to 7. Only 7 brings out exceptional fighters. */
	threatLevel() {
		const a = V.xchange.arcology;
		const tier = this.districts[a.district]?.tier ?? 2;
		return tier + Math.min(3, Math.floor(this.threatScore() / 20));
	},
	/* How dangerous the city thinks the player is, 0 to 100: identity reads, an enforcer alert, and fights won in the last two weeks.
	   Wins are { t, w }, where w is the opponent's worth; a bare timestamp from an older save counts as 4. */
	threatScore() {
		const a = V.xchange?.arcology;
		if (!a) return 0;
		if (a.wins) a.wins = a.wins.filter(e => Time.date.timeStamp - (e.t ?? e) < 14 * 86400);
		const reads = Math.min(40, (Number(a.recognizable) || 0) * 8);
		const alert = !a.trouble ? 0 : a.trouble.source === "security" ? 20 : 12;
		let weak = 0;
		let strong = 0;
		for (const e of a.wins ?? []) {
			const w = e.w ?? 4;
			if (w <= 4) weak += w;
			else strong += w;
		}
		return Math.min(100, Math.round(reads + alert + Math.min(48, Math.min(14, weak) + strong)));
	},
	threatBands: [
		{ label: "LOW PROFILE", note: "Residents treat you like any other guest." },
		{ label: "WATCHED", note: "A few security scanners have your face on record. No one has acted on it yet." },
		{ label: "FLAGGED", note: "Security is sharing your profile and is more alert." },
		{ label: "DANGEROUS", note: "You are considered dangerous. Armed resistance is more likely." },
		{ label: "HUNTED", note: "People with money are paying others to find you." },
	],
	/* 0 to 4, an index into threatBands. */
	threatBand() {
		return Math.min(4, Math.floor(this.threatScore() / 20));
	},
	/* The vanilla skill chance, cut by what the opponents actually bring: training, working implants, numbers, and knowing the player.
	   Resistance is capped at 70%, and danger.counter records the countermeasure that decided a failure. */
	escape(kind, skill, lo, hi) {
		/* Running, talking and shouting for help leave an untrained player a desperate chance; locks and doors need the skill. */
		const base = Math.clamp((currentSkillValue(skill) - lo) / (hi - lo), ["run", "talk", "help"].includes(kind) ? 0.08 : 0, 1);
		const band = this.threatBand();
		const gradeRisk = { civilian: 0.05, criminal: 0.1, security: 0.2, elite: 0.3, exceptional: 0.4 };
		const crowd = (V.NPCList ?? []).map((n, i) => ({ i, c: this.cyberOf(i) })).filter(x => x.c);
		const has = trait => crowd.filter(x => this.cyberHas(x.i, trait));
		const legs = crowd.filter(x => this.cyberHas(x.i, "legs"));
		const factors = { grade: Math.max(0.05, ...crowd.map(x => gradeRisk[x.c.grade] ?? 0.05)) };
		if (kind === "run") {
			factors.vision = Math.min(0.14, has("vision").length * 0.07);
			factors.legs = Math.min(0.12, legs.length * 0.06);
			factors.group = Math.max(0, crowd.length - 1) * 0.04;
			factors.known = band * 0.04;
		} else if (kind === "talk") {
			factors.processor = has("processor").length ? 0.08 : 0;
			factors.dampener = has("dampener").length ? 0.08 : 0;
			factors.known = band * 0.06;
		} else if (kind === "lock") {
			factors.lock = 0.25 + band * 0.05;
		} else if (kind === "force") {
			factors.lock = 0.15;
		} else if (kind === "help") {
			factors.known = band * 0.05;
		} else if (kind === "stack") {
			/* The Stack's drones: always watching, and closer the more they remember the player. */
			factors.drones = 0.1 + (V.xchange.arcology.stack?.suspicion ?? 0) / 400;
		} else if (kind === "proof") {
			/* Real evidence: only a cold or well-briefed listener can wave it away, whatever the player's reputation. */
			factors.dampener = has("dampener").length ? 0.08 : 0;
		} else {
			factors.grade = 0;
		}
		/* Opponents underestimate an unknown outsider. */
		const resist = Math.clamp(Object.values(factors).reduce((t, v) => t + v, 0) - (band === 0 ? 0.05 : 0), 0, 0.7);
		const ok = Math.random() < base * (1 - resist);
		/* The line shown after a failure names one countermeasure, picked in proportion to how much each one mattered. */
		const live = Object.entries(factors).filter(f => f[1] > 0);
		let pick = Math.random() * live.reduce((t, f) => t + f[1], 0);
		const top = live.find(f => (pick -= f[1]) <= 0) ?? ["grade", 0];
		const slot = { vision: has("vision")[0]?.i, legs: legs[0]?.i, processor: has("processor")[0]?.i, dampener: has("dampener")[0]?.i }[top[0]];
		if (V.xchange.arcology.danger) V.xchange.arcology.danger.counter = ok || top[1] <= 0 ? null : { kind: top[0], slot: slot ?? 0, check: kind };
		return ok;
	},
	/* A fight on the island ended with the player standing. Worth more for tougher opponents, and half as much with no one around to see it. */
	noteWin() {
		const worth = { civilian: 1, criminal: 3, security: 6, elite: 9, exceptional: 12 };
		const best = Math.max(1, ...(V.NPCList ?? []).map((n, i) => worth[this.cyberOf(i)?.grade] ?? 0));
		const unseen = V.xchange.arcology.danger?.isolated;
		(V.xchange.arcology.wins ??= []).push({ t: Time.date.timeStamp, w: unseen ? best / 2 : best });
		if (!unseen && best >= 6) setup.arcologyNews.report("brawl");
	},
	cyberCombat(npc, role) {
		const a = setup.arcology;
		const c = npc.cyber;
		let grade = Object.keys(a.fighterRoles).find(g => a.fighterRoles[g].includes(role)) ?? "civilian";
		if (grade !== "civilian") {
			const threat = a.threatLevel();
			let steps = threat >= 7 ? 3 : threat >= 6 ? 2 : threat >= 5 || (threat >= 3 && random(1, 2) === 1) ? 1 : 0;
			/* The one in charge is picked for the job; the people they bring along are a step behind. */
			const follower = npc !== V.NPCList?.[0];
			if (follower) steps = Math.max(0, steps - 1);
			const order = ["criminal", "security", "elite", "exceptional"];
			grade = order[Math.min(follower ? 1 : order.length - 1, order.indexOf(grade) + steps)];
			if (grade === "exceptional" && threat < 7) grade = "elite";
		}
		const top = grade === "elite" || grade === "exceptional";
		/* Professionals carry visible combat hardware; it is added here so every later description matches. */
		const has = area => c.mods.some(m => m.startsWith(area));
		if (grade === "security" && !has("eyes") && !c.mods.includes("accVisor")) c.mods.push("accVisor");
		if (top) {
			if (!has("arm")) c.mods.push("armIndustrial");
			if (!has("eyes")) c.mods.push("eyesCamera");
		}
		/* Fighters sent after a known troublemaker come better equipped: tracking optics, then reinforced arms and plating, and neural dampeners against a demon's pull. */
		if (grade !== "civilian") {
			const band = a.threatBand();
			if (band >= 2 && !has("eyes") && !c.mods.includes("accVisor")) c.mods.push("accVisor");
			if (band >= 3 && !has("arm")) c.mods.push("armIndustrial");
			if (band >= 3 && !has("neural") && window.effectiveTransformationLevel?.("demon") >= 1) c.mods.push("neuralStuds");
			if (band >= 4 && !has("face")) c.mods.push("facePlate");
		}
		const traits = [...new Set(c.mods.map(m => a.partTraits[m]).filter(Boolean))];
		/* Security and stronger fighters carry internal reinforcement and reflex chips that leave no visible mark. */
		if (grade !== "civilian" && grade !== "criminal") traits.pushUnique("processor");
		if (top) traits.pushUnique("skeleton");
		c.grade = grade;
		c.traits = traits;
		c.moves = a.movesFor(grade, traits);
		const g = a.gradeStats[grade];
		const setting = Math.clamp(Number(V.npcHealthMult) || 100, 25, 300) / 100;
		const hp = Math.round(g.hp * (0.9 + Math.random() * 0.2) * (traits.includes("skeleton") ? 1.15 : 1) * setting);
		npc.healthmax = hp;
		npc.health = hp;
		npc.dodgeChance = g.dodge + (traits.includes("vision") ? 5 : 0) + (traits.includes("processor") ? 6 : 0);
	},

	/* Music. The island city has its own themes; the launch and ship stay on the sea theme. */
	inCity() {
		const loc = String(V.location ?? "");
		return loc.startsWith("arcology") && !["arcology_launch", "arcology_leisure", "arcology_deck"].includes(loc);
	},
	/* An open street under the dome. Streets are flagged indoors for weather (the dome keeps rain off), so this asks the district list instead. */
	isStreet(loc = V.location) {
		return Object.values(this.districts).some(d => d.loc === loc);
	},
	/* Hostile and lawless districts play the danger theme, indoors included. */
	cityTheme() {
		const tier = this.districts[V.xchange?.arcology?.district]?.tier ?? 0;
		return tier >= 3 ? "arcology-danger" : "arcology";
	},
	/* A street robbery, criminal approach, enforcer stop or hostile fight on the island. */
	inEncounter() {
		if (!this.inCity()) return false;
		if (V.combat === 1) return V.consensual !== 1;
		return !!V.xchange?.arcology?.danger || passage().startsWith("Arcology Enforcers");
	},

	/* Combat queries. Every one returns the vanilla answer for NPCs without island implants. */
	cyberOf(slot) {
		const npc = V.NPCList?.[slot];
		return npc && npc.active !== "inactive" && npc.cyber?.traits ? npc.cyber : null;
	},
	/* A part counts while it works: integrity below 20 takes it offline for the rest of the fight. */
	cyberHas(slot, trait) {
		const c = this.cyberOf(slot);
		return !!c?.traits.includes(trait) && (c.integrity?.[trait] ?? 100) >= 20;
	},
	cyberAny(trait) {
		return this.cyberSlot(trait) >= 0;
	},
	cyberSlot(trait) {
		return (V.NPCList ?? []).findIndex((n, i) => n && n.stance !== "defeated" && this.cyberHas(i, trait));
	},
	/* The visible part behind a trait, so the writing names the implant the NPC really has; null for internal hardware. */
	cyberPart(slot, trait) {
		return this.cyberOf(slot)?.mods.find(m => this.partTraits[m] === trait) ?? null;
	},
	/* A reinforced skeleton can't be knocked out by a single impact, however hard. */
	resistsKnockout(slot) {
		return this.cyberHas(slot, "skeleton");
	},
	/* How much harder island fighters hit. */
	fightPainMult() {
		return Math.max(
			1,
			this.fightAverage((c, i) => this.gradeStats[c.grade].hit * (this.cyberHas(i, "limbs") ? (this.impaired(i, "limbs") ? 1.075 : 1.15) : 1))
		);
	},
	/* Hits aren't tagged with who threw them, so a group's pain settings are the average of its standing fighters: one elite doesn't make
	   the people with them hit like elites. */
	fightAverage(value) {
		const vals = (V.NPCList ?? [])
			.map((n, i) => ({ n, i, c: this.cyberOf(i) }))
			.filter(x => x.c && x.n.stance !== "defeated")
			.map(x => value(x.c, x.i));
		return vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : 0;
	},
	/* Fixed at generation so nothing changes mid-fight. Each move needs its implant (see moveTrait); street criminals only learn
	   the basics in rough districts or once the player is flagged. */
	movesFor(grade, traits) {
		if (grade === "civilian") return [];
		const band = this.threatBand();
		const rough = (this.districts[V.xchange?.arcology?.district]?.tier ?? 2) >= 3;
		const basic = grade !== "criminal" || band >= 2 || rough;
		const advanced = ["elite", "exceptional"].includes(grade) || (grade === "security" && (band >= 1 || rough)) || (grade === "criminal" && band >= 3);
		const moves = [];
		if (basic && traits.includes("limbs")) moves.push("grip");
		if (basic && traits.includes("skeleton")) moves.push("brace");
		if (basic && traits.includes("legs")) moves.push("burst");
		if (advanced && traits.includes("vision")) moves.push("target");
		if (advanced && traits.includes("processor") && (grade !== "security" || band >= 3)) moves.push("counter");
		return moves;
	},
	moveTrait: { grip: "limbs", brace: "skeleton", burst: "legs", target: "vision", counter: "processor" },
	moveCooldown: { grip: 4, brace: 4, burst: 5, target: 3, counter: 3 },
	/* Below half integrity a part still works, at reduced effect, and can't power a special action. */
	impaired(slot, trait) {
		return (this.cyberOf(slot)?.integrity?.[trait] ?? 100) < 50;
	},
	/* A landed blow wears down one exposed part. Eyes and arms take hits directly; internal processors and dampeners sit behind the skull and
	   plating, so ordinary blows barely reach them. Returns the part that crossed into impaired or offline this blow, for the narration. */
	wear(slot, damage, focus) {
		const c = this.cyberOf(slot);
		const npc = V.NPCList?.[slot];
		if (!c || !(damage > 0) || !(npc.healthmax > 0)) return null;
		const exposure = { vision: 0.6, limbs: 0.7, legs: 0.5, skeleton: 0.35, processor: 0.15, dampener: 0.15 };
		const parts = c.traits.filter(t => exposure[t] && (c.integrity?.[t] ?? 100) > 0);
		if (!parts.length) return null;
		const part = focus && parts.includes(focus) ? focus : parts.random();
		const shielded = ["processor", "dampener"].includes(part) && c.traits.includes("skeleton") ? 0.5 : 1;
		c.integrity ??= {};
		const before = c.integrity[part] ?? 100;
		const after = Math.max(0, Math.round(before - (damage / npc.healthmax) * 100 * 1.6 * exposure[part] * shielded));
		c.integrity[part] = after;
		if (before >= 20 && after < 20) return { part, state: "offline" };
		if (before >= 50 && after < 50) return { part, state: "impaired" };
		return null;
	},
	/* Dodge this turn: the working share of the implant bonuses baked in at generation, plus any active technique. */
	turnDodge(slot, base) {
		const c = this.cyberOf(slot);
		if (!c) return base;
		let dodge = base;
		for (const [trait, bonus] of [
			["vision", 5],
			["processor", 6],
		]) {
			if (!c.traits.includes(trait)) continue;
			if (!this.cyberHas(slot, trait)) dodge -= bonus;
			else if (this.impaired(slot, trait)) dodge -= bonus / 2;
		}
		const st = c.state ?? {};
		if (st.focus === 1 && this.cyberHas(slot, "vision")) dodge += st.varied ? 7 : 15;
		if (st.burst === 1 && this.cyberHas(slot, "legs")) dodge += 25;
		if (st.brace === 1 && this.cyberHas(slot, "skeleton")) dodge /= 2;
		return Math.round(dodge);
	},
	/* Counter roll threshold this turn: lower is more counters. */
	turnCounterCheck(slot, check) {
		const st = this.cyberOf(slot)?.state ?? {};
		return st.primed === 1 && this.cyberHas(slot, "processor") ? check - 20 : check;
	},
	/* The attack the player just aimed at this NPC, so processors and eyes can learn a pattern. */
	noteAttack(slot, kind) {
		const c = this.cyberOf(slot);
		if (!c) return;
		const st = (c.state ??= {});
		st.varied = !!st.last && st.last !== kind;
		st.last = kind;
		st.repeat = st.varied ? 0 : (st.repeat ?? 0) + 1;
	},
	/* A player feint pulls tracking eyes off them. */
	breakFocus(slot) {
		const st = this.cyberOf(slot)?.state;
		if (st?.focus === 1) {
			st.focus = 0;
			return true;
		}
		return false;
	},
	/* Once per enemy turn: techniques primed last turn expire or resolve, then at most one fighter starts a new one, giving the player a turn to see
	   it coming. Returns the lines to narrate: { slot, kind } where kind is a move name for a new cue or "grip-hit"/"grip-miss" for a resolved grab. */
	cyberTurn() {
		const out = [];
		const fighters = (V.NPCList ?? [])
			.map((n, i) => ({ n, i, c: this.cyberOf(i) }))
			.filter(x => x.c?.moves?.length && x.n.stance !== "defeated" && x.n.active === "active");
		const pros = fighters.filter(x => ["security", "elite", "exceptional"].includes(x.c.grade)).length;
		for (const { i, c } of fighters) {
			const st = (c.state ??= {});
			st.cd ??= {};
			for (const k of Object.keys(st.cd)) if (st.cd[k] > 0) st.cd[k]--;
			if (st.grip === 1) {
				const evade = this.gripEvade(pros >= 2);
				out.push({ slot: i, kind: this.cyberHas(i, "limbs") && !evade ? "grip-hit" : "grip-miss" });
			}
			for (const k of ["focus", "brace", "burst", "grip"]) if (st[k] === 1) st[k] = 0;
			if (st.primed === 1) st.primed = 0;
		}
		const ready = fighters.flatMap(({ i, c }) =>
			c.moves
				.filter(m => !c.state.cd[m] && this.cyberHas(i, this.moveTrait[m]) && !this.impaired(i, this.moveTrait[m]))
				.filter(m => m !== "counter" || (c.state.repeat ?? 0) >= 1)
				.map(m => ({ i, c, m }))
		);
		if (ready.length && random(1, 100) <= 45) {
			const { i, c, m } = ready.random();
			c.state.cd[m] = this.moveCooldown[m];
			if (m === "grip") c.state.grip = 1;
			if (m === "brace") c.state.brace = 1;
			if (m === "burst") c.state.burst = 1;
			if (m === "target") c.state.focus = 1;
			if (m === "counter") c.state.primed = 1;
			out.push({ slot: i, kind: m });
		}
		return out;
	},
	/* Chance to slip a telegraphed hydraulic grab: footwork and dodging help, blocking helps a little, a second professional cutting off the space hurts. */
	gripEvade(covered) {
		const ce = V.combatExtended ?? {};
		let chance = 25 + Math.min(25, (window.combatExtendedSkillValue?.("footwork") ?? 0) / 80);
		if (ce.activeDodgingActive === 1) chance += 35;
		if (ce.blockingActive >= 1) chance += 15;
		if (ce.stabilityLost === 1) chance -= 15;
		if (covered) chance -= 10;
		return random(1, 100) <= Math.clamp(chance, 5, 90);
	},
	/* Pain floor for the fight: the standing fighters' average toll, or 0 without island fighters.
	   A group already lands more hits each turn, so the floor eases while more than one of them is standing. */
	fightPainFloor() {
		const standing = (V.NPCList ?? []).filter((n, i) => this.cyberOf(i) && n.stance !== "defeated").length;
		return this.fightAverage(c => this.gradeStats[c.grade].toll) * (standing > 1 ? 0.8 : 1);
	},
	/* Extra pain multiplier so physique and masochism together can't cut a hit below the floor. Mirrors the reductions in pain(). */
	painFloorMult(floor) {
		const resist = Math.max(0.01, (1 - Math.min(V.physique / 20000, 0.9)) * (V.masochism >= 100 ? 1 - V.masochism / 1200 : 1));
		return resist >= floor ? 1 : floor / resist;
	},
	/* Lowest dodge chance a skilled striker can push an island fighter to; no floor for anyone else. */
	dodgeFloor(slot) {
		const c = this.cyberOf(slot);
		return c ? Math.round(V.NPCList[slot].dodgeChance * this.gradeStats[c.grade].keep) : -Infinity;
	},
	/* Share of a landed blow soaked by an island body, more with bone plating. */
	armourShare(slot) {
		const c = this.cyberOf(slot);
		if (!c) return 0;
		const plating = this.cyberHas(slot, "skeleton") ? 0.15 * (this.impaired(slot, "skeleton") ? 0.5 : 1) : 0;
		return Math.min(0.5, this.gradeStats[c.grade].armour + plating + (c.state?.brace === 1 && this.cyberHas(slot, "skeleton") ? 0.2 : 0));
	},
	/* Demon seduction doubles arousal gain; neural dampeners blunt it, and an elite's shuts it out. */
	seduceMult() {
		let mult = 2;
		(V.NPCList ?? []).forEach((n, i) => {
			const c = this.cyberOf(i);
			if (c && n.stance !== "defeated" && this.cyberHas(i, "dampener")) {
				const dampened = ["elite", "exceptional"].includes(c.grade) ? 1 : 1.5;
				mult = Math.min(mult, this.impaired(i, "dampener") ? (2 + dampened) / 2 : dampened);
			}
		});
		return mult;
	},
	/* One short line per turn describing what an implant physically did. Kept in temporary state so it never persists. */
	cyberNote(slot, kind) {
		const t = State.temporary;
		if (!t.cyberNote && this.cyberOf(slot)) t.cyberNote = { slot, kind };
	},

	newCitizen(tier, back, where) {
		const moods = where === "hotel" ? this.citizenMoods[tier] : this.citizenMoods[tier].filter(m => !["dangerous", "manipulative", "suspicious"].includes(m));
		const c = { tier, mood: moods.random(), back, where, talked: false, drank: false, warm: false };
		(V.daily.arcologyCitizens ??= {})[back] = true;
		setup.arcology.cyberise(V.NPCList[0], tier);
		V.xchange.arcology.citizen = c;
		return c;
	},

	rollEvent() {
		if (["arcology_launch", "arcology_leisure", "arcology_deck"].includes(V.location)) return "none";
		/* One roll per half hour; each event is then limited by its own daily or weekly flag. */
		const now = Time.date.timeStamp;
		if (now - (V.xchange.arcology.eventChecked ?? -Infinity) < 1800) return "none";
		V.xchange.arcology.eventChecked = now;
		const pool = ["scan", "case"].filter(kind => this.eventAvailable(kind) && (kind !== "scan" || this.threatBand() < 3));
		if (!pool.length || random(1, 100) > 35) return "none";
		const kind = pool.random();
		this.recordEvent(kind);
		return kind;
	},

	/* Danger the player has collected on the island: being seen in their own face, having their ID read, getting caught. */
	expose(n = 1) {
		const a = V.xchange.arcology;
		a.recognizable = (Number(a.recognizable) || 0) + n;
	},

	/* Stress and trauma relief on the island works once a day per activity. relief() spends it; reliefLeft() only checks. */
	relief(key) {
		V.daily.arcologyRelief ??= {};
		if (V.daily.arcologyRelief[key]) return false;
		V.daily.arcologyRelief[key] = true;
		return true;
	},
	reliefLeft(key) {
		return !V.daily.arcologyRelief?.[key];
	},

	/* Party mistakes: "nosy" for prying, "blunder" for being caught or giving offence. */
	partySlip(kind) {
		const party = V.xchange.arcology.party;
		const key = kind === "nosy" ? "nosy" : "blunders";
		party[key] = (party[key] || 0) + 1;
	},

	/* Two blunders give an even chance of being waylaid on the way out; three make it certain. */
	partyAmbush() {
		const b = V.xchange.arcology.party.blunders || 0;
		return b >= 3 || (b === 2 && random(0, 1) === 1);
	},

	/* The player has already seen Luchifen's umbrella holder at the docks. */
	umbrellaKnown() {
		const a = V.xchange.arcology;
		return !!a.umbrella || !!a.shun?.ignored || ["arena", "invited", "done"].includes(a.redeem?.stage);
	},

	/* While Luchifen's sponsorship lasts, their umbrella holder follows the player and steps in when they get into trouble. */
	guarded() {
		const a = V.xchange.arcology;
		const g = a?.guest;
		const voyage = a?.voyage;
		const sponsored = !!g && g.status === "sponsored" && g.sponsor === "Luchifen" && Time.date.timeStamp < g.until;
		if (["arcology_launch", "arcology_leisure", "arcology_deck"].includes(V.location)) {
			return (voyage?.escort === "luchifen" && (g?.status !== "revoked" || a.redeem?.stage === "invited")) || (voyage?.escort !== "loyalists" && sponsored);
		}
		return this.online() && sponsored;
	},

	/* The street network. Each district is one street passage with buildings off it.
	   loc: $location, which picks the sidebar scene. area: key in dangerAreas. tier: 0 (policed) to 4 (lawless), shown in Holo.
	   hidden: never listed in Holo until visited. Links are two-way and listed on one side only.
	   map: position on the Holo city map, in street units. bus: has a shuttle stop. */
	districts: {
		pier: { map: [0, 3], name: "Arcology Pier", passage: "Arcology Pier", loc: "arcology_pier", icon: "pier", area: "pier", tier: 2, time: 5 },
		relay: { map: [1.3, 3], bus: true, name: "Relay Street", passage: "Arcology Street", loc: "arcology", icon: "street", area: "street", tier: 2, time: 5 },
		breakwater: {
			map: [1.3, 5],
			bus: true,
			name: "Breakwater Road",
			passage: "Arcology Breakwater Road",
			loc: "arcology_coast",
			icon: "coast",
			area: "breakwater",
			tier: 2,
			time: 5,
		},
		flats: {
			map: [2.2, 6.4],
			bus: true,
			name: "Dockside Flats",
			passage: "Arcology Dockside Flats",
			loc: "arcology_flats",
			icon: "flats",
			area: "flats",
			tier: 3,
			time: 5,
		},
		exchange: {
			map: [3.4, 3],
			bus: true,
			name: "Exchange Square",
			passage: "Arcology Exchange Square",
			loc: "arcology_exchange",
			icon: "exchange",
			area: "exchange",
			tier: 1,
			time: 5,
		},
		market: {
			map: [3.4, 5.2],
			bus: true,
			name: "Market Street",
			passage: "Arcology Market Street",
			loc: "arcology_market",
			icon: "market",
			area: "market",
			tier: 2,
			time: 5,
		},
		neon: {
			map: [2.8, 7.6],
			bus: true,
			name: "Neon Strip",
			passage: "Arcology Neon Strip",
			loc: "arcology_neon",
			icon: "neon",
			area: "neon",
			tier: 3,
			time: 5,
		},
		underpass: {
			map: [4.3, 7],
			name: "Underpass",
			passage: "Arcology Underpass",
			loc: "arcology_underpass",
			icon: "underpass",
			area: "underpass",
			tier: 4,
			time: 8,
		},
		forge: {
			map: [4.7, 4.3],
			bus: true,
			name: "Forge Lane",
			passage: "Arcology Forge Lane",
			loc: "arcology_forge",
			icon: "forge",
			area: "forge",
			tier: 2,
			time: 5,
		},
		ironworks: {
			map: [5.6, 6],
			bus: true,
			name: "Ironworks",
			passage: "Arcology Ironworks",
			loc: "arcology_ironworks",
			icon: "ironworks",
			area: "ironworks",
			tier: 3,
			time: 8,
		},
		stronghold: {
			map: [6.7, 7.2],
			name: "Stronghold Quarter",
			passage: "Arcology Stronghold Quarter",
			loc: "arcology_stronghold",
			icon: "stronghold",
			area: "stronghold",
			tier: 4,
			time: 8,
		},
		commerce: {
			map: [3.4, 1.3],
			bus: true,
			name: "Commerce Walk",
			passage: "Arcology Commerce Walk",
			loc: "arcology_commerce",
			icon: "commerce",
			area: "commerce",
			tier: 1,
			time: 3,
		},
		civic: {
			map: [5.4, 2.6],
			bus: true,
			name: "Civic Boulevard",
			passage: "Arcology Civic Boulevard",
			loc: "arcology_civic",
			icon: "civic",
			area: "civic",
			tier: 0,
			time: 5,
		},
		medtech: {
			map: [6.8, 3.6],
			bus: true,
			name: "Medtech Street",
			passage: "Arcology Medtech Street",
			loc: "arcology_medtech",
			icon: "clinic",
			area: "medtech",
			tier: 2,
			time: 5,
		},
		signal: {
			map: [6.8, 1.8],
			bus: true,
			name: "Signal Avenue",
			passage: "Arcology Signal Avenue",
			loc: "arcology_signal",
			icon: "signal",
			area: "signal",
			tier: 1,
			time: 5,
		},
		skyline: {
			map: [5.4, 1],
			bus: true,
			name: "Skyline Avenue",
			passage: "Arcology Skyline Avenue",
			loc: "arcology_skyline",
			icon: "skyline",
			area: "skyline",
			tier: 0,
			time: 8,
		},
		crown: {
			map: [6.8, 0],
			name: "Crown Avenue",
			passage: "Arcology Crown Avenue",
			loc: "arcology_crown",
			icon: "crown",
			area: "crown",
			tier: 0,
			time: 10,
			hidden: true,
		},
		stillwater: {
			map: [8.1, 0],
			name: "Stillwater Court",
			passage: "Arcology Stillwater Court",
			loc: "arcology_stillwater",
			icon: "stillwater",
			area: "stillwater",
			tier: 0,
			time: 5,
			hidden: true,
		},
	},
	streetLinks: [
		["pier", "relay"],
		["relay", "breakwater"],
		["relay", "exchange"],
		["breakwater", "flats"],
		["flats", "market"],
		["exchange", "market"],
		["exchange", "forge"],
		["exchange", "commerce"],
		["exchange", "civic"],
		["market", "neon"],
		["market", "underpass"],
		["underpass", "ironworks"],
		["forge", "ironworks"],
		["ironworks", "stronghold"],
		["civic", "medtech"],
		["civic", "signal"],
		["civic", "skyline"],
		["skyline", "crown"],
		["crown", "stillwater"],
	],
	tierNames: ["POLICED", "MONITORED", "CONTESTED", "HOSTILE", "LAWLESS"],

	neighbours(id) {
		return this.streetLinks.filter(link => link.includes(id)).map(link => (link[0] === id ? link[1] : link[0]));
	},

	/* Called by every street and building; feeds the Holo district list and the danger area of a passout. */
	visit(id) {
		const a = V.xchange.arcology;
		a.district = id;
		(a.found ??= []).pushUnique(id);
	},

	/* Crown Avenue's checkpoint lets through residents' guests; Luchifen's guests count while the sponsorship lasts. */
	eliteAccess() {
		const g = V.xchange.arcology?.guest;
		return !!g && g.status === "sponsored" && g.sponsor === "Luchifen" && Time.date.timeStamp < g.until;
	},

	/* Island savings, kept out of reach of wallet thieves. */
	vault() {
		return V.xchange.arcology.vault || 0;
	},

	/* Shuttle stops reachable from a stop: every other public stop. Minutes grow with the street hops between them. */
	shuttleTime(from, to) {
		const seen = { [from]: 0 };
		const queue = [from];
		while (queue.length) {
			const id = queue.shift();
			for (const next of this.neighbours(id)) {
				if (seen[next] === undefined) {
					seen[next] = seen[id] + 1;
					queue.push(next);
				}
			}
		}
		return 4 + 2 * (seen[to] || 1);
	},

	/* Luchifen's guests ride on the sponsor's account. */
	shuttleFare() {
		return this.eliteAccess() ? 0 : 1000;
	},

	/* Clearance ranks in order. Only "guest" is granted so far; later progression raises $xchange.arcology.clearance. */
	clearanceRanks: ["guest", "resident", "citizen", "authority"],
	hasClearance(level) {
		const a = V.xchange.arcology;
		if (!a || a.guest?.status === "revoked") return false;
		return this.clearanceRanks.indexOf(a.clearance || "guest") >= this.clearanceRanks.indexOf(level);
	},

	/* The full city map needs more than guest clearance. Nothing grants that yet. */
	mapAccess() {
		return this.hasClearance("resident");
	},

	dangerAreas: {
		breakwater: { floor: 7200, mod: 1, pool: ["transport", "gang", "robbery", "scan"] },
		flats: { floor: 6000, mod: 1.4, pool: ["robbery", "robbery", "gang", "abduction", "transport"] },
		exchange: { floor: 8200, mod: 0.7, pool: ["scan", "blackmail", "partsMarket", "security", "clinicOffer"] },
		market: { floor: 7000, mod: 1.1, pool: ["robbery", "partsMarket", "partsMarket", "transport", "gang", "scan"] },
		neon: { floor: 6200, mod: 1.35, pool: ["robbery", "gang", "salon", "blackmail", "transport", "abduction"] },
		underpass: { floor: 5000, mod: 1.7, pool: ["gang", "gang", "robbery", "abduction", "transport", "clinic"] },
		forge: { floor: 7400, mod: 1, pool: ["gang", "transport", "partsMarket", "robbery"] },
		ironworks: { floor: 5600, mod: 1.5, pool: ["gang", "transport", "robbery", "abduction"] },
		stronghold: { floor: 4200, mod: 2, pool: ["gang", "gang", "gang", "abduction", "transport"] },
		commerce: { floor: 8400, mod: 0.6, pool: ["scan", "blackmail", "clinicOffer", "contract"] },
		civic: { floor: 9400, mod: 0.35, pool: ["security", "blackmail", "scan"] },
		medtech: { floor: 7600, mod: 1, pool: ["clinicOffer", "clinicOffer", "clinic", "scan", "partsMarket"] },
		signal: { floor: 8800, mod: 0.5, pool: ["scan", "blackmail", "security"] },
		skyline: { floor: 9200, mod: 0.4, pool: ["blackmail", "contract", "salon"] },
		crown: { floor: 9800, mod: 0.25, pool: ["contract", "blackmail"] },
		stillwater: { floor: 10000, mod: 0, pool: [] },
		street: { floor: 6500, mod: 1.25, pool: ["robbery", "gang", "gang", "transport", "blackmail", "clinicOffer", "partsMarket"] },
		pier: { floor: 7800, mod: 1, pool: ["gang", "transport", "clinicOffer", "blackmail", "security", "partsMarket"] },
		hotel: { floor: 9600, mod: 0.35, pool: ["blackmail", "contract", "salon"] },
		glass: { floor: 9000, mod: 0.5, pool: ["contract", "blackmail", "security", "salon"] },
		ship: { floor: 10000, mod: 0, pool: [] },
		deck: { floor: 10000, mod: 0, pool: [] },
	},
	opportunists: ["robbery", "scan", "contract", "clinic", "clinicOffer"],
	criminalPassages: {
		gang: "Arcology Gang Approach",
		clinicOffer: "Arcology Clinic Offer",
		blackmail: "Arcology Blackmail Offer",
		transport: "Arcology Transport Offer",
		salon: "Arcology Salon Offer",
		partsMarket: "Arcology Market Offer",
		raid: "Arcology Raid",
		fraud: "Arcology Fraud",
	},
	/* Areas Enforcement actually patrols: a call for help is answered there. */
	lawful(where) {
		return (this.dangerAreas[where]?.mod ?? 1) <= 0.7;
	},
	/* What a financial crisis looks like on this street: a crowd at a closed office in policed areas, open theft elsewhere. */
	raidKind(where) {
		if (this.lawful(where)) return "crowd";
		return (setup.arcologyPrice.stress() >= 3 ? ["shop", "attack", "supplies"] : ["shop", "attack"]).random();
	},
	/* Calls to Enforcement from a danger event: two a day across every event. Only a call that is actually placed counts,
	   and its result is kept on the event so re-rendering or reloading can't call again. Victor's protection is separate. */
	policeLeft() {
		return Math.max(0, 2 - (V.daily.arcologyPolice ?? 0));
	},
	/* "arrive" or "late" for an ordinary guest; from FLAGGED up there is no rescue: "verify" (identity check), "suspect"
	   (the call is treated as suspicious) or "hunted" (a patrol is sent for the caller). */
	policeCall(where) {
		const d = V.xchange.arcology.danger;
		if (d?.police) return d.police;
		if (!this.policeLeft()) return null;
		V.daily.arcologyPolice = (V.daily.arcologyPolice ?? 0) + 1;
		const band = this.threatBand();
		let out;
		if (band >= 2) {
			out = ["verify", "suspect", "hunted"][band - 2];
			this.expose();
			if (band === 4 && !V.xchange.arcology.trouble) V.xchange.arcology.trouble = { source: "security" };
		} else {
			/* Patrols cover the policed districts; a crisis pulls them back to Exchange Square and the Civic Boulevard. */
			const chance = (this.lawful(where) ? 0.85 : 0.45) - 0.1 * setup.arcologyPrice.stress() - 0.1 * band;
			out = Math.random() < chance ? "arrive" : "late";
			if (band === 1) this.expose();
		}
		if (d) d.police = out;
		return out;
	},
	/* What the dispatcher's answer sounds like, for each policeCall() result except "arrive", which each event describes itself. */
	policeText(out) {
		return (
			{
				late: "The dispatcher logs the call, but says no patrol is free to come now. You'll have to keep yourself safe until one is available.",
				verify:
					"The dispatcher asks you to hold still for an identity check before anyone is sent. The check runs, the line stays open, and no patrol is sent.",
				suspect:
					"Your record comes up, and the dispatcher's tone changes. \"Stay where you are. We'll want to talk to you about this.\" No patrol comes to help.",
				hunted: 'The line goes quiet for a moment. "Remain where you are," the dispatcher says. You realise the patrol being sent is coming for you.',
			}[out] ?? ""
		);
	},
	/* Organised fraud goes after wealthy or notorious guests; street scams take anyone. */
	scamKind() {
		const a = V.xchange.arcology;
		const rich = (a.cipher ?? 0) + this.vault() >= 5000 || V.money >= 500000;
		if ((rich || this.threatBand() >= 2) && random(1, 2) === 1) return "staff";
		return ["terminal", "recovery", "debt"].random();
	},
	/* The heavy events come back once a week; the rest once a day. */
	weeklyEvents: ["clinicOffer", "blackmail", "abduction", "clinic", "contract"],

	eventAvailable(kind) {
		return !V.daily.arcologyEvents?.[kind] && !(this.weeklyEvents.includes(kind) && V.weekly.arcologyEvents?.[kind]);
	},

	recordEvent(kind) {
		(V.daily.arcologyEvents ??= {})[kind] = true;
		if (this.weeklyEvents.includes(kind)) (V.weekly.arcologyEvents ??= {})[kind] = true;
	},

	passoutOutcome(area, guarded, privateRoom, ship) {
		if (guarded) return "guarded";
		if (privateRoom || ship) return "safe";
		const risk = this.dangerAreas[area];
		if (risk.mod === 0) return "safe";
		const pool = ["robbed", "captive", "attacker", "transport"].filter(outcome =>
			this.eventAvailable(outcome === "robbed" ? "robbery" : outcome === "transport" ? "transport" : "abduction")
		);
		if (!pool.length || !dangerEvent(risk.mod, risk.floor - 1000, V.allure + (V.drunk > 0 ? 1000 : 0))) return "safe";
		const outcome = pool.random();
		this.recordEvent(outcome === "robbed" ? "robbery" : outcome === "transport" ? "transport" : "abduction");
		return outcome;
	},

	rollDanger(where, back, attention = false) {
		const a = V.xchange.arcology;
		if (a.party?.status === "attending" && V.location === "arcology_glasshouse") return false;
		if (a.danger) return true;
		if (a.scene) return false;
		if (["ship", "deck", "room"].includes(where)) return false;
		const now = Time.date.timeStamp;
		const previous = a.dangerChecked;
		if (previous === undefined) a.dangerChecked = now;
		if (!attention && (previous === undefined || now - previous < 300)) return false;
		a.dangerChecked = now;
		if (V.eventskip || V.combat || V.possessed || a.trouble || (this.partyPending() && this.partyMissed())) return false;
		if (["arcology_launch", "arcology_leisure", "arcology_deck"].includes(V.location) && (a.voyage?.escort === "loyalists" || a.voyage?.arriveAt <= now))
			return false;
		const area = this.dangerAreas[where];
		const band = this.threatBand();
		const news = setup.arcologyNews.dangerAdjust(where, area?.pool ?? []);
		if (!area || !dangerEvent(area.mod * news.mod * (band >= 2 ? 1 + 0.1 * band : 1) * (attention ? 1.5 : 1), area.floor - (attention ? 1500 : 0)))
			return false;
		/* However easily the player draws attention, at most a little under half of the checks turn into an event. */
		if (!attention && random(1, 100) > 45) return false;
		/* Criminals hold back from a dangerous guest while Luchifen's people might be nearby. */
		if (band >= 2 && this.guarded() && random(1, 100) <= 40) return false;
		let pool = news.pool.slice();
		if (!window.playerHasXChangeBody()) pool.push("blackmail", "blackmail");
		if (a.recognizable > 0) pool.push("blackmail");
		if (["street", "pier", "breakwater", "flats", "market", "neon", "forge"].includes(where) && Time.dayState === "night") pool.push("gang", "transport");
		pool = pool.filter(kind => this.eventAvailable(kind));
		if (!pool.length) return false;
		let kind = pool.random();
		/* Street scammers avoid a guest known to be dangerous unless there is real money to take. */
		if (kind === "fraud" && band >= 2 && (a.cipher ?? 0) + this.vault() < 5000 && random(1, 2) === 1) {
			State.temporary.arcologyPassedOver = true;
			return false;
		}
		/* A dangerous player puts off con artists and petty thieves, and draws gangs and private security instead. */
		if (band >= 2 && random(1, 4) <= band - 1) {
			if (this.opportunists.includes(kind)) {
				State.temporary.arcologyPassedOver = true;
				return false;
			}
			kind = pool.filter(k => ["gang", "security"].includes(k)).random() ?? kind;
		}
		a.danger = { kind, where, back, stage: "approach" };
		this.recordEvent(kind);
		return true;
	},

	/* The implant only reaches the city network on the island itself. */
	online() {
		const loc = V.location || "";
		return loc.startsWith("arcology") && !["arcology_launch", "arcology_leisure", "arcology_deck", "arcology_stack"].includes(loc);
	},

	/* Luchifen's love needed for them to buy the player out of the Stack (love runs 0-100). */
	stackRescueLove: 60,

	/* Redemption: the player is a Colosseum champion, or won the bout Luchifen arranged. */
	arenaQualified() {
		const c = V.xchange.colosseum;
		if (V.xchange.arcology?.redeem?.boutWon) return true;
		return !!c && ["champion", "inside"].includes(c.ending);
	},

	/* The normal road to champion is shut: banned, walked out, or the championship offer has already been spent. */
	arenaBlocked() {
		const c = V.xchange.colosseum;
		if (!c || !(c.joined >= 1)) return false;
		if (c.banUntil > Time.date.timeStamp) return true;
		if (["walked", "disrupted"].includes(c.ending)) return true;
		return c.story >= 6 && !["champion", "inside"].includes(c.ending);
	},
};

$(document).on(":onloadsave.arcologyHolo", (_event, { save }) => {
	setup.arcology.resetHolo();
	// Saves from the original Stack can resume in the bunks or an escape scene without visiting its hub.
	for (const frame of save.state.history) {
		const stack = frame.variables.xchange?.arcology?.stack;
		if (stack && stack.day === undefined) {
			Object.assign(stack, { day: 0, jobs: [], crew: 0, chips: 0, net: 0, favor: 0, revolt: {} });
		}
	}
});

$(document).on(":oncloseoverlay.arcologyHolo :passagestart.arcologyHolo", () => {
	setup.arcology.clearHoloTimers();
	setup.arcology.finishCompose();
});

$(document).on(":passagedisplay.arcologyGlitch", () => {
	setup.arcology.syncGlitch();
	// The sidebar overlay for the dome only shows on the island itself.
	const online = setup.arcology.online();
	document.documentElement.classList.toggle("in-arcology", online);
	// The implant syncs with the city network on every passage shown on the island.
	if (online && V.xchange.arcology) V.xchange.arcology.lastSync = Time.date.timeStamp;
});
