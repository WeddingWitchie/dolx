/* Dome Broadcast's world model. Island events advance one in-game day at a time and publish articles as they change.
   Saved as $xchange.arcology.news: open events, compact article records (28 days), a bounded history, reactions and comments.
   Wording lives in arcology-news-text.js and pictures in arcology-news-art.js; both are rebuilt from the saved records. */
setup.arcologyNews = {
	DAY: 86400,
	KEEP: 28,
	HISTORY: 80,
	mode: "journal",
	textCache: new Map(),
	copyCache: new WeakMap(),

	/* Compare meaning-bearing wording without treating a new name or number as new reporting. */
	normalize(text) {
		const raw = String(text);
		if (this.textCache.has(raw)) return this.textCache.get(raw);
		if (!this.namesPattern) {
			const names = [
				...Object.values(this.orgs).map(o => o.name),
				...Object.values(setup.arcology.districts).map(d => d.name),
				...Object.values(this.places).map(p => p.name),
				"the Glasshouse's host",
				"Luchifen",
			];
			this.namesPattern = new RegExp(
				names
					.sort((a, b) => b.length - a.length)
					.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
					.join("|"),
				"gi"
			);
		}
		const handle = V.xchange?.arcology?.handle;
		const unaddressed = handle && raw.startsWith(`@${handle} `) ? raw.slice(handle.length + 2) : raw;
		const normalized = unaddressed
			.replace(/^@\S+\s+/, "")
			.replace(this.namesPattern, " subject ")
			.toLowerCase()
			.replace(/\d+(?:[.:]\d+)*/g, " number ")
			.replace(/[^a-z\s]/g, " ")
			.replace(/\b(the|a|an|in|on|at|of|to|for|and|is|are|has|have)\b/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		if (this.textCache.size >= 4096) this.textCache.delete(this.textCache.keys().next().value);
		this.textCache.set(raw, normalized);
		return normalized;
	},

	/* Word sets for similar(); the same comments are compared thousands of times while a long absence catches up. */
	setCache: new Map(),
	wordSet(normalized) {
		let set = this.setCache.get(normalized);
		if (!set) {
			if (this.setCache.size >= 4096) this.setCache.delete(this.setCache.keys().next().value);
			this.setCache.set(normalized, (set = new Set(normalized.split(" "))));
		}
		return set;
	},

	similar(a, b) {
		const x = this.normalize(a);
		const y = this.normalize(b);
		if (x === y) return true;
		const left = this.wordSet(x);
		const right = this.wordSet(y);
		const common = [...left].filter(w => right.has(w)).length;
		return Math.min(left.size, right.size) >= 5 && common / (left.size + right.size - common) >= 0.78;
	},

	/* Events still advance when a report has nothing new to add. Publication never changes their effects. */
	publish(st, art) {
		const T = setup.arcologyNewsText;
		const copy = T.write(art, false);
		// Everything still in the archive, which can be a few hours past 28 days: expiry runs at the end of the day.
		const recent = st.arts.filter(x => x.at < art.at);
		if (["story", "notice"].includes(art.k)) {
			for (const old of recent.filter(x => ["story", "notice"].includes(x.k))) {
				const prior = this.copyCache.get(old) ?? T.write(old, false);
				this.copyCache.set(old, prior);
				const sameEvent = art.e && old.e === art.e;
				if (sameEvent && old.ph !== art.ph) continue;
				if (this.similar(copy.title, prior.title) || this.similar(copy.body.join(" "), prior.body.join(" "))) return false;
				if (art.k === "story" && old.f === art.f && old.s === art.s && (art.f !== "industry" || old.c === art.c) && old.ph === art.ph) return false;
			}
		}
		art.rc = T.discussion(art, [...(copy.residents ?? []), ...T.residents(art, copy)], st);
		art.rc.push(...T.thread(art, art.rc, st));
		art.th = 1;
		st.arts.push(art);
		return true;
	},

	/* Stable 0..1 number from a key. */
	seed(key) {
		let h = 2166136261;
		for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
		return ((h >>> 0) % 100000) / 100000;
	},

	/* A seeded generator for one decision. It never touches the game's own random(), so news can't shift other rolls. */
	rng(key) {
		let t = Math.floor(this.seed(this.state().seed + "|" + key) * 4294967296);
		const f = () => {
			t = (t + 0x6d2b79f5) | 0;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
		return {
			f,
			int: (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)),
			pick: list => list[Math.floor(f() * list.length)],
			weighted(list) {
				const total = list.reduce((s, x) => s + x[1], 0);
				let roll = f() * total;
				for (const x of list) if ((roll -= x[1]) < 0) return x[0];
				return list[list.length - 1]?.[0];
			},
		};
	},

	state() {
		const a = V.xchange.arcology;
		return (a.news ??= { seed: Math.floor(a.implant?.fitted ?? 1), n: 0, ev: [], arts: [], hist: [], terr: {}, reactions: {}, comments: {} });
	},

	/* What the feed can see: live on the island, the last sync elsewhere. */
	now() {
		const a = V.xchange.arcology;
		return setup.arcology.online() ? Time.date.timeStamp : Math.min(Time.date.timeStamp, a.lastSync ?? Time.date.timeStamp);
	},

	/* Organisations and people the news may name. Only what is listed here can appear in an article. */
	orgs: {
		enforcement: { name: "Island Enforcement", kind: "authority", home: "civic" },
		registry: { name: "the Civic Registry", kind: "authority", home: "civic" },
		transit: { name: "City Transit", kind: "authority", home: "civic" },
		halden: { name: "the Halden Trust", kind: "corp", home: "exchange" },
		unitx: { name: "the Unit Exchange", kind: "corp", home: "exchange" },
		kessler: { name: "Kessler Arms", kind: "corp", home: "forge" },
		printworks: { name: "the Printworks", kind: "corp", home: "forge" },
		foundry: { name: "Arcology Foundry", kind: "corp", home: "ironworks" },
		compute: { name: "Compute Floor management", kind: "corp", home: "commerce" },
		lumen: { name: "Lumen Clinic", kind: "corp", home: "medtech" },
		meridian: { name: "Hotel Meridian", kind: "corp", home: "relay" },
		tidewater: { name: "Tidewater Freight", kind: "corp", home: "pier" },
		wire: { name: "the Wire Gate crew", kind: "crew", home: "stronghold" },
		lowtide: { name: "Lowtide", kind: "crew", home: "flats" },
		gutterline: { name: "the Gutterline", kind: "crew", home: "underpass" },
		halcyon: { name: "Halcyon", kind: "venue", home: "neon" },
		pulse: { name: "Pulse", kind: "venue", home: "neon" },
		staticroom: { name: "the Static Room", kind: "venue", home: "neon" },
		afterimage: { name: "Afterimage", kind: "venue", home: "relay" },
		/* Public: hosts invitation-only gatherings at the Glasshouse. Never published: the residence, Victor, the player, the past.
		   Only the "host" role is written for them, and the name shows once the player knows it. */
		luchifen: { name: "the Glasshouse's host", kind: "person", pronoun: "they", home: "relay", roles: ["host"] },
	},

	orgName(key) {
		if (key === "luchifen" && V.xchange.silverStranger?.nameKnown) return "Luchifen";
		return this.orgs[key]?.name ?? "";
	},

	/* Workplaces an industrial story can affect. closable: the place really shuts while the story says so. */
	places: {
		foundry: { d: "ironworks", org: "foundry", closable: true, name: "the foundry" },
		scrap: { d: "ironworks", org: "foundry", name: "the scrap yard" },
		printworks: { d: "forge", org: "printworks", name: "the Printworks" },
		kessler: { d: "forge", org: "kessler", name: "Kessler Arms' workshop" },
		compute: { d: "commerce", org: "compute", closable: true, name: "the Compute Floor" },
	},

	/* Story families: where they happen, who takes part, and how each stage leads to the next.
	   A stage lasts `days`, applies `fx` while current, then moves to one of `next` ([stage or null to close, weight, condition]).
	   `out` records the outcome; `spun` marks stages whose article follows the spinning organisation's version. */
	families: {
		sweep: {
			cat: "SECURITY",
			weight: 3,
			cool: 7,
			places: ["pier", "relay", "breakwater", "flats", "market", "neon", "underpass", "forge", "ironworks", "medtech"],
			orgs: ["enforcement"],
			subtypes: ["patrol", "checkpoint", "drones"],
			causes: ["robberies", "crews", "complaints", "missing"],
			spin: { by: "enforcement", chance: 0.3 },
			start: "announce",
			stages: {
				announce: { days: [1, 1], next: [["active", 1]] },
				active: {
					days: [2, 3],
					fx: e => (e.s === "checkpoint" ? { checkpoint: 1 } : { patrol: 1 }),
					next: [
						["arrests", 2],
						["complaint", 1],
						["ends", 2],
					],
				},
				arrests: { days: [1, 2], fx: e => (e.s === "checkpoint" ? { checkpoint: 1 } : { patrol: 1 }), next: [["ends", 1]] },
				complaint: {
					days: [1, 2],
					fx: { patrol: 1 },
					next: [
						["ends", 2],
						["review", 1],
					],
				},
				review: { days: [1, 1], out: "reviewed", next: [[null, 1]] },
				/* A spun ending claims the district is clear while the crews come straight back. */
				ends: {
					days: [2, 2],
					fx: e => e.sp && { rough: 1 },
					spun: true,
					out: "ended",
					next: [
						["exposed", 1, e => e.sp],
						[null, 1],
					],
				},
				exposed: { days: [1, 1], fx: { rough: 1 }, out: "overstated", next: [[null, 1]] },
			},
		},
		idcheck: {
			cat: "SECURITY",
			weight: 2,
			cool: 10,
			places: ["exchange", "civic", "commerce", "signal", "relay"],
			orgs: ["registry"],
			subtypes: ["copies", "cloned", "backups"],
			causes: ["market", "insider", "unknown"],
			start: "found",
			stages: {
				found: { days: [1, 1], fx: { checkpoint: 1 }, next: [["tighten", 1]] },
				tighten: {
					days: [2, 3],
					fx: { checkpoint: 1 },
					next: [
						["traced", 2],
						["quiet", 1],
					],
				},
				traced: { days: [1, 1], out: "traced", next: [[null, 1]] },
				quiet: { days: [0, 0], out: "unresolved", next: [[null, 1]] },
			},
		},
		feud: {
			cat: "CRIME",
			weight: 3,
			cool: 6,
			places: ["neon", "underpass", "flats", "stronghold", "market", "ironworks"],
			orgs: ["wire", "lowtide", "gutterline"],
			subtypes: ["corner", "debt", "route"],
			causes: ["territory", "insult", "payment"],
			start: "clash",
			stages: {
				clash: {
					days: [1, 2],
					fx: { rough: 1 },
					next: [
						["retaliation", 2, (e, w) => !w.calmed(e)],
						["truce", 1],
						["enforcement", 1, e => e.d !== "stronghold"],
					],
				},
				retaliation: {
					days: [1, 2],
					fx: { rough: 1 },
					next: [
						["takeover", 1],
						["enforcement", 1, e => e.d !== "stronghold"],
						["truce", 1],
					],
				},
				enforcement: { days: [2, 3], fx: { patrol: 1 }, out: "broken up", next: [[null, 1]] },
				truce: { days: [1, 1], out: "truce", next: [[null, 1]] },
				takeover: { days: [2, 2], fx: { rough: 1 }, out: "takeover", next: [[null, 1]] },
			},
		},
		smuggle: {
			cat: "CRIME",
			weight: 2,
			cool: 9,
			places: ["pier", "breakwater", "flats", "market"],
			orgs: ["tidewater", "kessler", "lumen", "printworks"],
			crews: ["lowtide", "gutterline", "wire"],
			subtypes: ["crates", "parts", "medical"],
			causes: ["theft", "insider", "routing"],
			spin: { by: "owner", chance: 0.3 },
			start: "missing",
			stages: {
				missing: { days: [1, 2], fx: { smuggle: 1 }, next: [["statement", 1]] },
				statement: {
					days: [1, 2],
					fx: { smuggle: 1 },
					spun: true,
					next: [
						["found", 2],
						["unresolved", 1],
						["exposed", 2, e => e.sp],
					],
				},
				found: { days: [1, 1], out: "recovered", next: [[null, 1]] },
				unresolved: { days: [0, 0], out: "unresolved", next: [[null, 1]] },
				exposed: { days: [1, 1], out: "exposed", next: [[null, 1]] },
			},
		},
		industry: {
			cat: "INDUSTRY",
			weight: 3,
			cool: 7,
			subtypes: ["press", "power", "shortage", "walkout"],
			causes: ["wear", "overload", "supplier", "pay"],
			spin: { by: "operator", chance: 0.25 },
			start: "incident",
			stages: {
				incident: {
					days: [1, 2],
					fx: e => e.shut && { closed: e.p },
					spun: true,
					next: [
						["dispute", 1],
						["repair", 2],
						["exposed", 2, e => e.sp && e.shut],
					],
				},
				exposed: { days: [1, 1], fx: e => e.shut && { closed: e.p }, next: [["repair", 1]] },
				dispute: {
					days: [1, 2],
					fx: e => e.shut && { closed: e.p },
					next: [
						["inspection", 2],
						["repair", 1],
					],
				},
				inspection: { days: [1, 2], fx: e => Object.assign({ patrol: 1 }, e.shut && { closed: e.p }), next: [["reopen", 1]] },
				repair: { days: [1, 1], fx: e => e.shut && { closed: e.p }, next: [["reopen", 1]] },
				reopen: {
					days: [1, 2],
					out: "reopened",
					next: [
						["report", 1, e => e.path.includes("inspection")],
						[null, 1],
					],
				},
				report: { days: [0, 0], out: "fined", next: [[null, 1]] },
			},
		},
		transit: {
			cat: "TRANSIT",
			weight: 2,
			cool: 9,
			places: ["breakwater", "flats", "exchange", "market", "neon", "forge", "ironworks", "commerce", "medtech", "signal", "skyline"],
			orgs: ["transit"],
			subtypes: ["maintenance", "inspection", "interference"],
			causes: ["fault", "audit", "convoy"],
			spin: { by: "tidewater", chance: 0.5, only: "interference" },
			start: "out",
			stages: {
				out: { days: [1, 2], fx: e => Object.assign({ stop: 1 }, e.sp && { smuggle: 1 }), spun: true, next: [["statement", 1]] },
				statement: {
					days: [1, 1],
					fx: e => Object.assign({ stop: 1 }, e.sp && { smuggle: 1 }),
					spun: true,
					next: [
						["reopen", 2, e => e.s !== "interference"],
						["conflicting", 2, e => e.s === "interference"],
					],
				},
				conflicting: { days: [1, 2], fx: e => Object.assign({ stop: 1 }, e.sp && { smuggle: 1 }), spun: true, next: [["suspect", 1]] },
				suspect: {
					days: [1, 2],
					fx: { stop: 1 },
					next: [
						["exposed", 2, e => e.sp],
						["reopen", 1],
					],
				},
				exposed: { days: [1, 1], fx: { stop: 1, patrol: 1 }, next: [["reopen", 1]] },
				reopen: { days: [0, 0], out: "reopened", next: [[null, 1]] },
			},
		},
		business: {
			cat: "BUSINESS",
			weight: 3,
			cool: 4,
			orgs: ["halden", "unitx", "kessler", "printworks", "lumen", "meridian", "tidewater"],
			subtypes: ["expansion", "contract", "irregular", "recall", "stake", "wages", "leak"],
			causes: ["growth", "costs", "rival"],
			spin: { by: "self", chance: 0.35, only: "irregular" },
			start: "news",
			stages: {
				news: {
					days: [1, 3],
					fx: e => e.s === "recall" && { scams: 1 },
					next: [
						["response", 2],
						[null, 1, e => e.s === "expansion"],
					],
				},
				response: {
					days: [1, 3],
					fx: e => e.s === "recall" && { scams: 1 },
					spun: true,
					next: [
						["mediation", 2, e => ["wages", "contract"].includes(e.s)],
						["withdrawn", 2, e => ["stake", "expansion"].includes(e.s)],
						["audit", 2, e => e.s === "leak"],
						["outcome", 2],
						["exposed", 2, e => e.sp],
					],
				},
				exposed: { days: [1, 1], out: "exposed", next: [[null, 1]] },
				mediation: {
					days: [2, 3],
					next: [
						["outcome", 1],
						["unresolved", 1],
					],
				},
				withdrawn: { days: [1, 1], out: "withdrawn", next: [[null, 1]] },
				audit: {
					days: [2, 4],
					next: [
						["outcome", 1],
						["unresolved", 1],
					],
				},
				unresolved: { days: [1, 1], out: "unresolved", next: [[null, 1]] },
				outcome: { days: [0, 0], out: "settled", next: [[null, 1]] },
			},
		},
		implant: {
			cat: "CYBERNETICS",
			weight: 3,
			cool: 6,
			subtypes: ["malfunction", "backup", "unlicensed", "trial", "xchange"],
			causes: ["batch", "update", "cheap"],
			spin: { by: "lumen", chance: 0.35, only: "malfunction" },
			start: "report",
			stages: {
				report: {
					days: [1, 2],
					fx: e => ({ unlicensed: { scams: 1 }, trial: { trials: 1 } }[e.s]),
					next: [
						["response", 2],
						[null, 1, e => e.s === "xchange"],
					],
				},
				response: {
					days: [1, 3],
					fx: e => ({ unlicensed: { scams: 1 }, trial: { trials: 1 } }[e.s]),
					spun: true,
					next: [
						["fixed", 2],
						["exposed", 2, e => e.sp],
						["ongoing", 1],
					],
				},
				exposed: { days: [1, 1], out: "exposed", next: [["fixed", 1]] },
				fixed: { days: [0, 0], out: "fixed", next: [[null, 1]] },
				ongoing: { days: [0, 0], out: "unresolved", next: [[null, 1]] },
			},
		},
		nightlife: {
			cat: "SOCIETY",
			weight: 2,
			cool: 5,
			orgs: ["halcyon", "pulse", "staticroom", "afterimage"],
			subtypes: ["opening", "noise", "betting", "raid"],
			causes: ["season", "owner", "rival"],
			start: "notice",
			stages: {
				notice: { days: [1, 1], next: [["night", 1]] },
				night: {
					days: [1, 1],
					fx: e => ({ opening: { crowd: 1 }, noise: { crowd: 1 }, betting: { rough: 1 }, raid: { patrol: 1 } }[e.s]),
					next: [
						["after", 1],
						[null, 1],
					],
				},
				after: { days: [0, 0], out: "done", next: [[null, 1]] },
			},
		},
		/* Cipher trading. `mkt` is the stage's real pressure on the price ({ a: log move per severity, d: seconds,
		   o: share that overshoots and fades, v: volatility boost, h: herding, how strongly other traders follow the move }),
		   applied once when the stage is entered. A spun story's mkt follows what the organisation really does, not what
		   its statement claims. */
		market: {
			cat: "MARKETS",
			weight: 2,
			cool: 5,
			orgs: ["halden", "unitx", "tidewater", "kessler", "meridian", "lumen", "foundry"],
			crews: ["gutterline", "wire"],
			subtypes: ["accumulate", "selloff", "withdraw", "scandal", "pump"],
			causes: ["reserves", "contracts", "confidence"],
			/* What each organisation has reason to do with Cipher, its usual motive, and how large its orders run. */
			roles: {
				halden: { s: ["accumulate", "selloff", "scandal"], c: "reserves", sev: [2, 3] },
				unitx: { s: ["withdraw", "scandal"], c: "confidence", sev: [2, 3] },
				tidewater: { s: ["selloff", "withdraw", "accumulate"], c: "contracts", sev: [1, 3] },
				kessler: { s: ["accumulate", "selloff"], c: "contracts", sev: [1, 2] },
				meridian: { s: ["accumulate"], c: "confidence", sev: [1, 2] },
				lumen: { s: ["selloff"], c: "contracts", sev: [1, 2] },
				foundry: { s: ["selloff"], c: "contracts", sev: [1, 2] },
			},
			start: "first",
			stages: {
				first: {
					days: [1, 1],
					mkt: e =>
						({
							accumulate: { a: 0.02, d: 1200, o: 0.5, v: 1.3 },
							selloff: { a: -0.028, d: 1200, o: 0.4, v: 1.4, h: 0.1 },
							withdraw: { a: -0.04, d: 1800, o: 0.2, v: 2, wide: 1 },
							scandal: { a: -0.055, d: 1200, o: 0, v: 2, h: 0.15 },
							pump: { a: 0.055, d: 1200, o: 0.6, v: 1.8, h: 0.2 },
						}[e.s]),
					spun: true,
					next: [
						["announce", 2, e => e.s === "accumulate"],
						["denied", 1, e => e.s === "accumulate" || e.s === "pump"],
						["selling", 2, e => e.s === "selloff" && !e.sp],
						["deny", 1, e => e.s === "selloff" && e.sp],
						["intervene", 1, e => e.s === "withdraw" && e.sev > 1],
						["result", 1, e => e.s === "withdraw"],
						["audit", 1, e => e.s === "scandal"],
						["dump", 2, e => e.s === "pump"],
					],
				},
				announce: {
					days: [1, 2],
					mkt: { a: 0.04, d: 1800, o: 0.4, v: 1.5, h: 0.1 },
					spun: true,
					next: [
						["buying", 3, e => !e.sp],
						["scaled", 3, e => e.sp],
						["scaled", 1],
						["cancelled", 1],
					],
				},
				buying: { days: [1, 2], mkt: { a: 0.07, d: 3600, o: 0.3, v: 1.6, h: 0.25 }, next: [["result", 1]] },
				scaled: { days: [1, 1], mkt: { a: -0.04, d: 1800, o: 0.3, v: 1.5 }, out: "scaled", next: [["result", 1]] },
				cancelled: { days: [1, 1], mkt: { a: -0.07, d: 1200, o: 0.2, v: 1.8, h: 0.15 }, out: "cancelled", next: [[null, 1]] },
				/* The named company says it has no such plan. After a pump, the crew starts selling into the denial. */
				denied: {
					days: [1, 1],
					mkt: { a: -0.02, d: 1200, o: 0.3, v: 1.3 },
					out: "denied",
					next: [
						["dump", 1, e => e.s === "pump"],
						[null, 1, e => e.s !== "pump"],
					],
				},
				/* A holder denies selling while it keeps reducing its reserves. */
				deny: { days: [1, 2], mkt: { a: -0.04, d: 3600, o: 0.2, v: 1.3 }, spun: true, next: [["exposed", 1]] },
				exposed: {
					days: [1, 1],
					mkt: e => (e.s === "pump" ? { a: -0.015, d: 1200, o: 0.3, v: 1.3 } : { a: -0.04, d: 1200, o: 0.2, v: 1.8, h: 0.15 }),
					out: "exposed",
					next: [["result", 1]],
				},
				selling: {
					days: [1, 2],
					mkt: { a: -0.085, d: 1800, o: 0.35, v: 2, h: 0.3 },
					next: [
						["absorbed", 2],
						["intervene", 1, e => e.sev > 1],
						["rout", 2, (e, w) => e.sev === 3 && w.moved(e) < -6],
					],
				},
				rout: {
					days: [1, 1],
					mkt: { a: -0.04, d: 1200, o: 0.5, v: 2.5, h: 0.4 },
					next: [
						["intervene", 1],
						["result", 1],
					],
				},
				absorbed: { days: [1, 1], mkt: { a: 0.03, d: 3600, o: 0.5, v: 1.2 }, out: "absorbed", next: [[null, 1]] },
				intervene: { days: [1, 1], mkt: { a: 0.055, d: 3600, o: 0.3, v: 1.5, h: 0.1 }, out: "stabilised", next: [["result", 1]] },
				audit: {
					days: [2, 3],
					mkt: { a: 0, d: 3600, v: 1.5 },
					next: [
						["cleared", 1],
						["confirmed", 1],
					],
				},
				cleared: { days: [1, 1], mkt: { a: 0.04, d: 3600, o: 0.2, v: 1.3 }, out: "cleared", next: [[null, 1]] },
				confirmed: { days: [1, 1], mkt: { a: -0.085, d: 1800, o: 0.2, v: 2, h: 0.25 }, out: "confirmed", next: [["result", 1]] },
				dump: { days: [1, 1], mkt: { a: -0.1, d: 600, o: 0.3, v: 2.5, h: 0.3 }, next: [["exposed", 1]] },
				result: { days: [0, 0], out: "settled", next: [[null, 1]] },
				/* An unusual move with no story behind it in the news: reported from the exchange's own figures. */
				report: { days: [1, 1], out: "reported", next: [[null, 1]] },
			},
		},
		/* The rare collapse. `c` moves the crisis offset (fx.cr), which ordinary trading can't touch.
		   liquidity: market makers pull out (to about a tenth of normal value).
		   reserve: the Halden Trust's reserves turn out to be missing (to about £100).
		   counterfeit: Cipher minted outside the Registry through an issuance exploit (below £1).
		   The story then follows the city through the crisis to an outcome: a partial backstop, a lasting depression or a
		   full restoration. City consequences come from setup.arcologyFx.crisis(), not from these stages. */
		crash: {
			cat: "MARKETS",
			weight: 0.08,
			cool: 180,
			orgs: ["unitx", "halden", "wire"],
			subtypes: ["liquidity", "reserve", "counterfeit"],
			causes: ["withdrawal"],
			depth: { liquidity: 2.3, reserve: 5, counterfeit: 11.2 },
			start: "signs",
			stages: {
				signs: { days: [1, 1], mkt: { a: -0.06, d: 1800, v: 2, h: 0.2, fixed: 1 }, next: [["liquidity", 1]] },
				liquidity: { days: [1, 1], mkt: { c: -0.7, now: 0.5, d: 1800, v: 3, wide: 1, fixed: 1 }, spun: true, next: [["collapse", 1]] },
				collapse: {
					days: [1, 1],
					mkt: e => ({
						c: Math.min(0, -setup.arcologyNews.families.crash.depth[e.s] - setup.arcologyFx.sync().cr),
						now: 0.9,
						d: 2400,
						halt: 900,
						v: 4,
						wide: 1,
						ct: "hold",
						fixed: 1,
					}),
					next: [["statement", 1]],
				},
				statement: { days: [1, 1], spun: true, next: [["runs", 1]] },
				runs: { days: [1, 2], next: [["scams", 1]] },
				/* Fraud weighting in dangerAdjust starts with the crisis, so the warning describes something already happening. */
				scams: { days: [1, 1], next: [["probe", 1]] },
				probe: {
					days: [1, 2],
					next: [
						/* While the city really is in that state, the story covers it before any outcome. */
						["strain", 20, (e, w) => w.level() >= 2],
						["backstop", 2, e => e.s !== "counterfeit"],
						["depressed", 1],
					],
				},
				strain: {
					days: [1, 2],
					next: [
						["services", 20, (e, w) => w.level() >= 3],
						["backstop", 2],
						["depressed", 1],
					],
				},
				services: {
					days: [1, 2],
					next: [
						["raids", 20, (e, w) => w.level() >= 3],
						["backstop", 2],
						["depressed", 2],
						["restored", 1, e => e.s === "liquidity"],
					],
				},
				/* Raids enter the danger pools from crisis level 3 (setup.arcologyPrice.stress). */
				raids: {
					days: [1, 2],
					next: [
						["backstop", 2],
						["depressed", 2],
						["restored", 1, e => e.s === "liquidity"],
					],
				},
				backstop: {
					days: [2, 3],
					mkt: e => ({ c: setup.arcologyNews.families.crash.depth[e.s] * 0.6, d: 7200, v: 2.5, ct: "hold", fixed: 1 }),
					out: "backstopped",
					next: [
						["restored", 1, e => e.s !== "counterfeit"],
						["aftermath", 2],
					],
				},
				depressed: { days: [2, 4], mkt: { c: 0, d: 3600, v: 2, ct: "hold", fixed: 1 }, out: "depressed", next: [["aftermath", 1]] },
				restored: {
					days: [1, 2],
					mkt: e => ({ c: -setup.arcologyFx.state().cr, d: 21600, v: 1.8, ct: 0, fixed: 1 }),
					out: "restored",
					next: [["aftermath", 1]],
				},
				aftermath: { days: [0, 0], next: [[null, 1]] },
			},
		},
		glasshouse: {
			cat: "PEOPLE",
			weight: 1,
			cool: 14,
			orgs: ["luchifen"],
			subtypes: ["gathering", "absence"],
			causes: ["season"],
			start: "announce",
			stages: {
				announce: { days: [1, 1], next: [["held", 1]] },
				held: {
					days: [1, 1],
					fx: { crowd: 1 },
					next: [
						["gossip", 1],
						[null, 1],
					],
				},
				gossip: { days: [0, 0], out: "held", next: [[null, 1]] },
			},
		},
	},

	/* Lookups the stage conditions use. */
	world: {
		/* The player beat trained fighters in that district since the feud began: the crews pull back. */
		calmed(e) {
			const from = e.a * setup.arcologyNews.DAY;
			return setup.arcologyNews.state().arts.some(x => x.k === "break" && x.f === "brawl" && x.d === e.d && x.at >= from);
		},
		/* Percent change in Cipher's price since the story's first report. */
		moved(e) {
			return e.p0 ? (setup.arcologyFx.mid(setup.arcologyFx.sync()) / e.p0 - 1) * 100 : 0;
		},
		/* How far a currency crisis has reached into the city (setup.arcologyFx.crisis). */
		level() {
			return setup.arcologyFx.crisis();
		},
	},

	/* Advances the island to today. Cheap when nothing is due; every query calls it, so the world moves whether or not anyone reads. */
	sync() {
		// Meeting Luchifen creates the island state; nothing reads the news, or the market it drives, before the first arrival.
		if (!V.xchange?.arcology?.arrived || !setup.arcology.online()) return;
		const st = this.state();
		// Append to the overfiltered edition once; retain existing comments and player replies.
		let restored = false;
		const editions =
			st.discussionVersion !== 1 || st.threadVersion !== 3 || st.arts.some(art => !art.rc || !art.th) ? st.arts.slice().sort((a, b) => a.at - b.at) : [];
		for (const art of editions)
			if (!art.rc || st.discussionVersion !== 1) {
				const copy = setup.arcologyNewsText.write(art, false);
				art.rc = setup.arcologyNewsText.discussion(art, [...(copy.residents ?? []), ...setup.arcologyNewsText.residents(art, copy)], st);
				delete art.th;
				restored = true;
			}
		/* Articles saved before residents could reply to each other, or before the longer threads, get their replies once,
		   in publication order. Only resident replies are rebuilt; top-level comments and the player's own stay. */
		for (const art of editions)
			if (!art.th || st.threadVersion !== 3) {
				art.rc = art.rc.filter(c => c[3] === undefined);
				art.rc.push(...setup.arcologyNewsText.thread(art, art.rc, st));
				art.th = 1;
				restored = true;
			}
		st.discussionVersion = 1;
		st.threadVersion = 3;
		if (restored) this.viewCache.clear();
		const today = Math.floor(Time.date.timeStamp / this.DAY);
		if (st.day === undefined) st.day = today - 22;
		if (st.day >= today) {
			if (restored) {
				window.updateMoment?.();
			}
			return;
		}
		if (this.catchUp) return;
		/* A long absence: open stories wind down unreported, then the last month plays out normally. */
		if (today - st.day > 40) {
			for (const e of st.ev.slice()) {
				if (e.f === "crash" && e.ph === "liquidity") continue;
				this.close(st, e, "faded", today - 40);
			}
			st.day = today - 32;
		}
		/* Replaying weeks in one go froze slower phones on load: one day now, the rest a day at a time between frames. */
		const end = Math.min(today, st.day + 1);
		while (st.day < end) this.step(st, ++st.day);
		if (st.day < today && !this.catchUp)
			this.catchUp = setTimeout(() => {
				this.catchUp = null;
				this.sync();
			}, 30);
		/* Journal sync can publish replies after SugarCube has captured this passage's save moment. Recording it compresses
		   the whole state, so it waits for the last catch-up day; an earlier save simply resumes the catch-up when loaded. */
		if (st.day >= today) window.updateMoment?.();
	},

	/* One island day: advance open stories, start new ones, routine notices, the weekly review, then drop expired articles. */
	step(st, day) {
		let published = st.arts.filter(x => x.k === "story" && Math.floor(x.at / this.DAY) === day).length;
		for (const e of st.ev.slice()) {
			if (e.nx > day) continue;
			/* The exchange's live update starts the main collapse where the player can see it. */
			if (e.f === "crash" && e.ph === "liquidity") continue;
			if (published >= 5) {
				e.nx = day + 1;
				continue;
			}
			const r = this.rng(`${e.id}-${e.path.length}`);
			const options = this.families[e.f].stages[e.ph].next.filter(([, , cond]) => !cond || cond(e, this.world));
			const recentPaths = st.hist.filter(h => h.f === e.f && h.s === e.s && day - h.z < 60);
			const next = r.weighted(options.map(([k, w]) => [k, recentPaths.some(h => h.path?.[e.path.length] === k) ? w * 0.25 : w]));
			if (!next) {
				this.close(st, e, e.out ?? "ended", day);
				continue;
			}
			if (this.enter(st, e, next, day)) published++;
		}
		const r = this.rng("day" + day);
		const open = st.ev.length;
		if (open < 4 && published < 4 && r.f() < (open < 2 ? 0.8 : 0.45) && this.spawn(st, day)) published++;
		if (published < 4 && this.marketMove(st, day)) published++;
		const reminder = this.reminder(st, day, published);
		/* Notices only restate the city's state, so one a day at most: story events, which change the city, are never cut. */
		const notices = Math.max(0, (published === 0 ? 1 : r.f() < 0.3 ? 1 : 0) - (reminder ? 1 : 0));
		for (let i = 0; i < notices; i++) this.notice(st, day, i);
		if (day % 7 === 6) this.weekly(st, day);
		this.answer(st, day);
		if (st.said) st.said = st.said.filter(x => x[0] >= day - this.KEEP);
		/* An article whose comment still waits for, or has an unread, reply stays up to three days longer. */
		const from = (day - this.KEEP) * this.DAY;
		const waiting = x => st.comments[x.id] && (!st.comments[x.id].r || st.comments[x.id].u) && x.at >= from - 3 * this.DAY;
		const gone = st.arts.filter(x => x.at < from && !waiting(x)).map(x => x.id);
		if (gone.length) {
			st.arts = st.arts.filter(x => !gone.includes(x.id));
			for (const id of gone) {
				delete st.reactions[id];
				delete st.comments[id];
			}
		}
	},

	/* A story moves to a new stage and publishes about it. */
	enter(st, e, stage, day) {
		const def = this.families[e.f].stages[stage];
		const r = this.rng(`${e.id}-enter-${stage}`);
		e.ph = stage;
		e.path.push(stage);
		e.at = day * this.DAY;
		e.nx = day + r.int(def.days[0], def.days[1]);
		if (def.out) e.out = def.out;
		if (stage === "takeover") st.terr[e.d] = e.o2;
		const art = { id: `${e.id}-${e.path.length}`, e: e.id, k: "story", f: e.f, s: e.s, c: e.c, d: e.d, o: e.o, ph: stage, sev: e.sev };
		art.at = day * this.DAY + r.int(7, 19) * 3600 + r.int(0, 5) * 600;
		if (e.f === "crash" && stage === "collapse") art.at = Time.date.timeStamp;
		art.n = r.int(0, 999);
		for (const k of ["o2", "o3", "p", "prev", "hold", "shut"]) if (e[k] !== undefined) art[k] = e[k];
		if (e.sp && def.spun) art.sp = 1;
		if (e.sp && stage === "exposed") art.sp = 2;
		// Only already published accounts belong in a follow-up, never future stages or hidden causes.
		art.h = st.arts
			.filter(x => x.e === e.id && x.at < art.at)
			.slice(-6)
			.map(x => (x.q ? [x.ph, x.at, x.n, x.sp || 0, x.id, x.q] : [x.ph, x.at, x.n, x.sp || 0, x.id]));
		if (this.families[e.f].cat !== "MARKETS") return this.publish(st, art);
		const mkt = typeof def.mkt === "function" ? def.mkt(e) : def.mkt;
		/* Stages reached while catching up on missed days are already in the price; only today's and yesterday's push it. */
		const fresh = day >= Math.floor(Time.date.timeStamp / this.DAY) - 1;
		const push = () => setup.arcologyFx.impulse(art.id, mkt && Object.assign({}, mkt, { a: mkt.fixed ? mkt.a : (mkt.a ?? 0) * e.sev }), fresh);
		/* Market reports quote the real price at publication. An ordinary stage is reported before its pressure arrives;
		   a crash stage's immediate move (`now`) has already happened by the time it is reported. */
		if (mkt?.now) push();
		const fx = setup.arcologyFx.sync();
		const price = setup.arcologyFx.mid(fx);
		e.p0 ??= price;
		const pct = v => (v === null ? null : Math.round(v * 10) / 10);
		art.q = [Math.round(price), pct((price / e.p0 - 1) * 100), pct(setup.arcologyFx.change(fx, 86400))];
		if (e.f === "crash") art.cz = setup.arcologyFx.crisis();
		if (!mkt?.now) push();
		const published = this.publish(st, art);
		const move = (mkt?.a ?? 0) + (mkt?.c ?? 0);
		if (published && fresh && move) setup.arcologyFx.mark(setup.arcologyNewsText.write(art, false).title, move > 0);
		return published;
	},

	close(st, e, out, day) {
		st.ev = st.ev.filter(x => x !== e);
		st.hist.push({ f: e.f, s: e.s, c: e.c, d: e.d, o: e.o, o2: e.o2, p: e.p, path: e.path.slice(), out, sp: e.sp ? 1 : 0, a: e.a, z: day });
		if (st.hist.length > this.HISTORY) st.hist.splice(0, st.hist.length - this.HISTORY);
	},

	/* Starts a new story, if one fits: family cooldowns, one story per district and per organisation, no recent repeat of a combination. */
	spawn(st, day) {
		const r = this.rng("spawn" + day);
		const busyD = new Set(st.ev.map(e => e.d));
		const busyO = new Set(st.ev.flatMap(e => [e.o, e.o2, e.o3]).filter(Boolean));
		const last = f => Math.max(-1e9, ...st.hist.filter(h => h.f === f).map(h => h.a), ...st.ev.filter(e => e.f === f).map(e => e.a));
		const recent = (test, days) => st.hist.some(h => test(h) && day - h.a < days);
		const fams = Object.entries(this.families).filter(([k, fam]) => !st.ev.some(e => e.f === k) && day - last(k) >= fam.cool);
		for (let tries = 0; tries < 4 && fams.length; tries++) {
			const f = r.weighted(fams.map(([k, fam]) => [k, fam.weight]));
			const e = this.draft(f, r, day, st, busyD, busyO);
			const same = h => h.f === f && h.d === e.d && h.s === e.s && h.o === e.o && h.o2 === e.o2;
			const sameOrg = h => h.f === f && h.o === e.o && this.families[f].orgs?.length > 1;
			if (
				e &&
				!st.arts.some(
					x => x.k === "story" && x.f === f && x.s === e.s && (f !== "industry" || x.c === e.c) && day - Math.floor(x.at / this.DAY) <= this.KEEP
				) &&
				!recent(same, 75) &&
				!recent(h => h.f === f && h.s === e.s && h.c === e.c, 45) &&
				!recent(h => h.f === f && h.d === e.d, 18) &&
				!recent(sameOrg, 30)
			) {
				const prev = st.hist.filter(h => h.f === f && (e.p ? h.p === e.p : h.d === e.d)).pop();
				if (prev) e.prev = [day - prev.z, prev.out];
				e.id = "e" + ++st.n;
				st.ev.push(e);
				return this.enter(st, e, this.families[f].start, day) ? e : null;
			}
			fams.splice(
				fams.findIndex(([k]) => k === f),
				1
			);
		}
		return null;
	},

	/* A large move over the last real day with no market story to explain it gets a short report from the exchange's figures. */
	marketMove(st, day) {
		if (st.ev.some(e => this.families[e.f].cat === "MARKETS" || e.d === "exchange" || [e.o, e.o2, e.o3].includes("unitx"))) return false;
		if (st.hist.some(h => h.f === "market" && h.s === "move" && day - h.a < 3)) return false;
		const change = setup.arcologyFx.change(setup.arcologyFx.sync(), 86400);
		if (change === null || Math.abs(change) < 7) return false;
		const e = { f: "market", s: "move", c: change > 0 ? "up" : "down", a: day, path: [], sev: 1, o: "unitx", d: "exchange", id: "e" + ++st.n };
		st.ev.push(e);
		return this.enter(st, e, "report", day);
	},

	/* Picks who, where and why for a new story of family f, or null when nothing fits today. */
	draft(f, r, day, st, busyD, busyO) {
		const fam = this.families[f];
		const free = list => list.filter(x => !busyO.has(x));
		const e = { f, a: day, path: [], c: r.pick(fam.causes), s: r.pick(fam.subtypes), sev: r.int(1, 3) };
		if (f === "industry") {
			const p = r.pick(Object.keys(this.places).filter(k => !busyD.has(this.places[k].d) && !busyO.has(this.places[k].org)));
			if (!p) return null;
			Object.assign(e, { p, d: this.places[p].d, o: this.places[p].org });
			if (p === "scrap" || p === "kessler") e.s = r.pick(["shortage", "walkout"]);
			if (p === "compute") e.s = r.pick(["power", "walkout"]);
			e.c = { walkout: "pay", shortage: "supplier" }[e.s] ?? r.pick(["wear", "overload"]);
			e.shut = this.places[p].closable && e.s !== "shortage" ? 1 : 0;
		} else if (f === "feud") {
			e.d = r.pick(fam.places.filter(d => !busyD.has(d)));
			const holder = st.terr[e.d] ?? fam.orgs.find(o => this.orgs[o].home === e.d);
			const crews = free(fam.orgs);
			e.o = crews.includes(holder) ? holder : r.pick(crews);
			e.o2 = r.pick(crews.filter(o => o !== e.o));
			if (!e.o || !e.o2) return null;
			if (holder === e.o) e.hold = 1;
		} else if (f === "smuggle") {
			e.d = r.pick(fam.places.filter(d => !busyD.has(d)));
			e.o = r.pick(free(fam.orgs));
			e.o3 = r.pick(free(fam.crews));
			if (!e.o || !e.o3) return null;
			e.s = { kessler: "parts", lumen: "medical" }[e.o] ?? "crates";
		} else if (f === "business") {
			e.o = r.pick(free(fam.orgs));
			if (!e.o) return null;
			e.d = this.orgs[e.o].home;
			const only = { recall: ["kessler", "lumen"], irregular: ["halden", "unitx", "tidewater"], stake: ["tidewater", "halden"] };
			e.s = r.pick(fam.subtypes.filter(s => !only[s] || only[s].includes(e.o)));
			if (["contract", "stake"].includes(e.s)) {
				e.o2 = r.pick(free(fam.orgs.filter(o => o !== e.o)));
				if (!e.o2) return null;
			}
			if (e.s === "recall") e.d = "market";
		} else if (f === "implant") {
			const at = {
				malfunction: ["medtech", "lumen"],
				backup: ["civic", "registry"],
				unlicensed: ["underpass", "gutterline"],
				trial: ["medtech", "lumen"],
				xchange: ["relay"],
			};
			[e.d, e.o] = at[e.s];
			if (e.o && busyO.has(e.o)) return null;
			if (!e.o) delete e.o;
		} else if (f === "nightlife") {
			e.o = r.pick(free(fam.orgs));
			if (!e.o) return null;
			e.d = this.orgs[e.o].home;
			if (e.s === "betting" && e.o !== "staticroom") e.s = "noise";
		} else if (f === "market" || f === "crash") {
			/* One market story at a time, so their effects on the price stay readable. */
			if (st.ev.some(x => this.families[x.f].cat === "MARKETS")) return null;
			if (f === "crash") {
				if (busyO.has("unitx") || busyO.has("halden") || busyO.has("wire")) return null;
				/* Deeper collapses are rarer: below a pound needs Cipher minted outside the Registry. The organisation
				   at fault issues the misleading statement (sp). */
				e.s = r.weighted([
					["liquidity", 3],
					["reserve", 2],
					["counterfeit", 1],
				]);
				Object.assign(
					e,
					{
						liquidity: { o: "unitx", o2: "halden" },
						reserve: { o: "halden", o2: "unitx", sp: "halden" },
						counterfeit: { o: "wire", o2: "unitx", sp: "unitx" },
					}[e.s],
					{ sev: 3 }
				);
			} else if (e.s === "pump") {
				/* A crew buys first, then spreads claims that a named company is about to buy. */
				e.o = r.pick(free(fam.crews));
				e.o2 = r.pick(free(fam.orgs.filter(o => ["halden", "tidewater", "kessler"].includes(o))));
				if (!e.o || !e.o2) return null;
				e.sp = e.o;
			} else {
				/* Each organisation acts for its own reasons and at its own size. */
				e.o = r.pick(free(Object.keys(fam.roles).filter(o => fam.roles[o].s.includes(e.s))));
				if (!e.o) return null;
				const role = fam.roles[e.o];
				e.c = role.c;
				e.sev = r.int(role.sev[0], role.sev[1]);
				if (["accumulate", "selloff"].includes(e.s) && r.f() < 0.3) e.sp = e.o;
				if (e.s === "selloff" || e.s === "withdraw") {
					e.o2 = r.pick(free(["halden", "unitx"].filter(o => o !== e.o)));
					if (!e.o2) return null;
				}
			}
			e.d = f === "crash" ? "exchange" : this.orgs[e.o].home;
		} else if (f === "glasshouse") {
			if (setup.arcology.partyPending() || busyO.has("luchifen")) return null;
			e.o = "luchifen";
			e.d = "relay";
		} else {
			e.d = r.pick(fam.places.filter(d => !busyD.has(d)));
			e.o = fam.orgs[0];
			if (busyO.has(e.o)) return null;
		}
		if (!e.d || busyD.has(e.d)) return null;
		const spin = fam.spin;
		if (spin && (!spin.only || spin.only === e.s) && r.f() < spin.chance) {
			e.sp = ["owner", "operator", "self"].includes(spin.by) ? e.o : spin.by;
			if (f === "smuggle") e.o2 = r.pick(free(fam.crews).filter(o => o !== e.o3));
			if (f === "smuggle" && !e.o2) return null;
		}
		return e;
	},

	/* Routine notices built from real island data. Each kind waits a few days before it comes back. */
	reminderTopics: {
		identity: a => !!a.implant,
		dome: () => true,
		hotel: a => !!a.guest?.status,
		xchange: a => (a.found || []).includes("relay"),
		transit: a => (a.found || []).length >= 2,
		cipher: a => (a.found || []).includes("exchange") || a.cipher > 0 || a.vault > 0,
		forex: a => (a.found || []).includes("exchange"),
		safety: a => (a.found || []).length >= 3,
		assessment: a => a.recognizable > 0 || a.wins?.length > 0 || (a.found || []).length >= 4,
		cybernetics: a => (a.found || []).some(id => ["civic", "medtech"].includes(id)),
		shocks: a => (a.found || []).includes("exchange") || a.cipher > 0,
		streets: a => (a.found || []).length >= 2,
		prices: () => true,
		enforcement: a => (a.found || []).length >= 3,
		work: a => (a.found || []).some(id => ["commerce", "breakwater", "ironworks"].includes(id)),
	},
	/* Which never-published topic goes first: the city's basics, then the newer guides, then the rest. */
	reminderOrder: [
		"identity",
		"dome",
		"prices",
		"hotel",
		"streets",
		"xchange",
		"cipher",
		"shocks",
		"transit",
		"enforcement",
		"forex",
		"safety",
		"work",
		"assessment",
		"cybernetics",
	],

	/* Editions are ordinary archived articles. Snapshot their rules and service status so old issues never change with the world. */
	reminder(st, day, published) {
		const a = V.xchange.arcology;
		const at = day * this.DAY + 12 * 3600;
		if (!a.arrived || !a.implant || at < a.implant.fitted) return false;
		const editions = st.arts.filter(x => x.k === "reminder");
		const latest = editions.at(-1);
		const gap = latest ? day - Math.floor(latest.at / this.DAY) : Infinity;
		const interval = latest ? this.rng(latest.id + "-interval").int(2, 4) : 2;
		if (gap < interval || (published >= 4 && gap < 4)) return false;
		const last = topic => Math.max(-Infinity, ...editions.filter(x => x.f === topic).map(x => Math.floor(x.at / this.DAY)));
		const eligible = Object.keys(this.reminderTopics).filter(topic => this.reminderTopics[topic](a) && day - last(topic) > this.KEEP);
		eligible.sort((p, q) => last(p) - last(q) || this.reminderOrder.indexOf(p) - this.reminderOrder.indexOf(q));
		const topic = eligible[0];
		if (!topic) return false;
		const x = setup.arcologyNewsText.reminderEdition(topic, st);
		this.publish(st, { id: `r${day}`, k: "reminder", f: topic, at, n: this.rng("reminder" + day).int(0, 999), x });
		return true;
	},

	noticeKinds: { safety: 3, transit: 5, drift: 4, registry: 6, exchange: 9, dome: 5 },
	notice(st, day, slot) {
		const r = this.rng(`notice-${day}-${slot}`);
		const lastOf = k => Math.max(-99, ...st.arts.filter(x => x.k === "notice" && x.f === k).map(x => Math.floor(x.at / this.DAY)));
		const kinds = Object.entries(this.noticeKinds).filter(([k, cool]) => day - lastOf(k) >= cool);
		if (!kinds.length) return;
		const f = r.pick(kinds)[0];
		const art = { id: `n${day}-${slot}`, k: "notice", f, at: day * this.DAY + (slot ? 13 : 6) * 3600, n: r.int(0, 999) };
		if (f === "safety") {
			const ids = Object.keys(setup.arcology.districts).filter(d => !setup.arcology.districts[d].hidden);
			art.d = r.pick(ids);
			art.x = Object.keys(this.fxOf(st, art.d));
		} else if (f === "transit") {
			/* The operator's own bulletin: a spun closure is listed as running. */
			const crisis = setup.arcologyFx.crisis();
			art.x = Object.keys(setup.arcology.districts).filter(
				id =>
					setup.arcology.districts[id].bus &&
					this.stopClosed(id, st) &&
					((crisis >= 3 && ["breakwater", "flats", "signal"].includes(id)) ||
						!st.ev.some(e => e.f === "transit" && e.d === id && e.sp && this.families.transit.stages[e.ph].spun))
			);
		} else if (f === "drift") {
			art.x = [r.int(2, 11), r.int(0, 7)];
		}
		this.publish(st, art);
	},

	/* Sunday evening review: the week's biggest stories as they were published. Copies the records, since the originals expire first. */
	weekly(st, day) {
		const from = (day - 6) * this.DAY;
		const latest = {};
		for (const x of st.arts) if (x.k === "story" && x.at >= from) latest[x.e] = x;
		const top = Object.values(latest)
			.sort((a, b) => (b.sev ?? 1) - (a.sev ?? 1) || b.at - a.at)
			.slice(0, 4)
			.map(x => Object.assign({}, x, { rc: undefined }));
		const incidents = st.arts.filter(x => x.k === "break" && x.at >= from).length;
		this.publish(st, { id: `w${day}`, k: "weekly", at: day * this.DAY + 20 * 3600, x: top, i: incidents, n: this.rng("w" + day).int(0, 999) });
	},

	/* A public incident the player was part of. Called from the event passages; never names the player. */
	report(kind) {
		this.sync();
		const st = this.state();
		st.n++;
		this.publish(st, { id: "b" + st.n, k: "break", f: kind, d: V.xchange.arcology.district, at: Time.date.timeStamp, n: st.n % 1000 });
	},

	fxOf(st, district) {
		const out = {};
		for (const e of st.ev) {
			if (e.d !== district) continue;
			const def = this.families[e.f].stages[e.ph].fx;
			Object.assign(out, (typeof def === "function" ? def(e) : def) || {});
		}
		return out;
	},

	/* Effects of every story currently running in a district. */
	fx(district) {
		this.sync();
		return this.fxOf(this.state(), district);
	},

	/* What running stories do to a danger area's roll: a chance multiplier and pool changes. */
	dangerAdjust(where, pool) {
		let mod = 1;
		let out = pool.slice();
		for (const [id, d] of Object.entries(setup.arcology.districts)) {
			if (d.area !== where) continue;
			const fx = this.fx(id);
			if (fx.patrol) {
				mod *= 0.5;
				out = out.filter(k => !["gang", "robbery", "abduction"].includes(k));
			}
			if (fx.rough) {
				mod *= 1.35;
				out.push("gang", "gang");
			}
			if (fx.crowd) {
				mod *= 1.15;
				out.push("robbery");
			}
			if (fx.checkpoint) out.push("scan", "security");
			if (fx.scams) out.push("partsMarket", "partsMarket");
			if (fx.trials) out.push("clinicOffer", "clinicOffer");
			if (fx.smuggle) out.push("transport", "transport");
		}
		/* A spreading currency crisis brings scams and theft everywhere, and open fighting once it reaches its worst. */
		const crisis = setup.arcologyFx.crisis();
		if (crisis >= 2) {
			mod *= 1 + 0.15 * (crisis - 1);
			out.push("robbery", "partsMarket");
			if (crisis >= 4) out.push("gang", "gang");
		}
		/* Fraud follows a falling Cipher; raids need a real crisis, and reach policed streets only as crowds once it drags on. */
		const stress = setup.arcologyPrice.stress();
		const falling = crisis >= 1 || (setup.arcologyFx.change(setup.arcologyFx.sync(), 86400) ?? 0) < -10;
		if (stress >= 1 && falling) out.push("fraud");
		if (stress >= 2) {
			out.push("fraud");
			if (!setup.arcology.lawful(where)) out.push("raid");
		}
		if (stress >= 3) out.push("raid");
		return { mod, pool: out };
	},

	/* True while a story keeps a workplace shut: "foundry" or "compute". */
	closed(place) {
		/* A deep, lasting Cipher crisis leaves employers unable to pay, so paid work stops. */
		return this.fx(this.places[place].d).closed === place || (!!this.places[place].closable && setup.arcologyFx.crisis() >= 3);
	},

	/* True while a district's shuttle stop is out of service. */
	stopClosed(district, st) {
		/* City Transit cuts its least-used stops when fares lose their value. */
		return (
			!!(st ? this.fxOf(st, district) : this.fx(district)).stop || (["breakwater", "flats", "signal"].includes(district) && setup.arcologyFx.crisis() >= 3)
		);
	},

	/* What a visitor sees in the street right now. This is the truth, so it can contradict a spun article. */
	streetLine(district) {
		const fx = this.fx(district);
		const e = this.state().ev.find(x => x.d === district);
		return e && Object.keys(fx).length ? setup.arcologyNewsText.street(e, fx) : setup.arcologyNewsText.crisisStreet(district, setup.arcologyFx.crisis());
	},

	/* Every published article the Holo can see, newest first. */
	feed() {
		this.sync();
		const upTo = this.now();
		return this.state()
			.arts.filter(x => x.at <= upTo)
			.sort((a, b) => b.at - a.at)
			.map(x => this.view(x));
	},

	viewCache: new Map(),
	/* The pump's organizer is private until the Registry identifies it. Public metadata follows the named buyer. */
	publicSubject(rec) {
		return rec.f === "market" && rec.s === "pump" && rec.ph !== "exposed" ? { o: rec.o2, d: this.orgs[rec.o2]?.home } : rec;
	},
	/* The readable article: the saved record plus the text written from it. */
	view(rec) {
		const key = rec.id + "|" + rec.at + (V.xchange.silverStranger?.nameKnown ? "+" : "");
		const cached = this.viewCache.get(key);
		let v = cached?.record === rec ? cached.view : undefined;
		if (!v) {
			if (this.viewCache.size > 400) this.viewCache.clear();
			v = Object.assign({}, rec, setup.arcologyNewsText.write(rec));
			this.viewCache.set(key, { record: rec, view: v });
		}
		/* Loading an older save can restore an index-only player comment while article text remains cached. */
		if (rec.k !== "reminder") v.options = setup.arcologyNewsText.options(rec, v);
		return v;
	},

	find(id) {
		this.sync();
		const rec = this.state().arts.find(x => x.id === id);
		return rec && rec.at <= this.now() ? this.view(rec) : undefined;
	},

	/* Other published articles about the same story, oldest first. */
	related(id) {
		const rec = this.state().arts.find(x => x.id === id);
		if (!rec?.e) return [];
		const upTo = this.now();
		return this.state()
			.arts.filter(x => x.e === rec.e && x.id !== id && x.at <= upTo)
			.sort((a, b) => a.at - b.at)
			.map(x => this.view(x));
	},

	/* Reader sections and the article categories each one shows, in groups that share the front page fairly. */
	sections: [
		["latest", "Latest", null],
		[
			"city",
			"City",
			[
				["SECURITY", "CRIME", "BREAKING"],
				["INDUSTRY", "TRANSIT", "NOTICE"],
			],
		],
		["economy", "Economy", [["BUSINESS"], ["MARKETS"]]],
		["society", "Society", [["CYBERNETICS"], ["SOCIETY", "PEOPLE", "WEEKLY", "CITIZEN REMINDER"]]],
	],
	section: "latest",

	/* Article categories in a section, grouped; Latest groups by the other sections. */
	groups(key) {
		const sec = this.sections.find(s => s[0] === key);
		return sec?.[2] ?? this.sections.filter(s => s[2]).map(s => s[2].flat());
	},

	inSection(article, key) {
		return key === "latest" || !this.sections.some(s => s[0] === key) || this.groups(key).flat().includes(article.cat);
	},

	/* The front-page pick for a section: newest first, one card per continuing story, and no group taking more than its share
	   while another still has fresh reports. Everything not picked stays in the section's archive. */
	balanced(list, key, count) {
		const groups = this.groups(key);
		const seen = new Set();
		const fresh = list.filter(x => !x.e || (!seen.has(x.e) && seen.add(x.e)));
		const share = Math.ceil(count / groups.length) + 1;
		const taken = groups.map(() => 0);
		const out = [];
		for (const x of fresh) {
			if (out.length >= count) break;
			const g = groups.findIndex(cats => cats.includes(x.cat));
			if (g >= 0 && taken[g] >= share) continue;
			taken[g]++;
			out.push(x);
		}
		/* A quiet group leaves room: fill the rest from whatever is newest. */
		for (const x of fresh) if (out.length < count && !out.includes(x)) out.push(x);
		return out.sort((p, q) => q.at - p.at);
	},

	/* Drops n front-page cards, least useful first: echoes of the featured story, routine notices, the weekly review, then
	   the oldest. The two newest cards and anything breaking, developing, investigative or severe always stay. */
	trimFront(cards, top, n) {
		const newest = new Set(
			cards
				.slice()
				.sort((p, q) => q.at - p.at)
				.slice(0, 2)
		);
		const vital = x => newest.has(x) || ["breaking", "alert", "investigation"].includes(x.tone) || x.sev === 3;
		const echo = x =>
			!!top && ((x.e && x.e === top.e) || (x.d && x.d === top.d && x.f === top.f) || [x.o, x.o2].filter(Boolean).some(o => [top.o, top.o2].includes(o)));
		const out = cards.slice();
		let cut = 0;
		for (const test of [echo, x => x.k === "notice", x => x.k === "weekly", () => true])
			for (const x of out.slice().sort((p, q) => p.at - q.at)) {
				if (cut >= n) return out;
				if (!vital(x) && test(x)) {
					out.splice(out.indexOf(x), 1);
					cut++;
				}
			}
		return out;
	},

	reactionKinds: [
		["agree", "▲", "Agree"],
		["disagree", "▼", "Disagree"],
		["funny", "☺", "Funny"],
		["angry", "✕", "Angry"],
		["worried", "?", "Worried"],
	],

	/* Residents' counts are fixed per article and lean with its subject; the player's own reaction adds one. */
	reactionCount(article, kind) {
		const lean = article.lean?.[kind] ?? 1;
		const base = Math.floor(this.seed(article.id + kind) * 90 * (article.heat ?? 0.6) * lean);
		return base + (this.state().reactions[article.id] === kind ? 1 : 0);
	},

	reactionTotal(article) {
		return this.reactionKinds.reduce((sum, [kind]) => sum + this.reactionCount(article, kind), 0);
	},

	commentCount(article) {
		return this.threadView(article).length + (this.state().comments[article.id] ? 1 : 0);
	},

	/* Residents' comments in reading order: each comment followed by its replies. Replies posted on a later day stay
	   hidden until then. depth: 0 top level, 1 reply, 2 for anything deeper. */
	threadView(article) {
		const rc = article.residents ?? [];
		const upTo = this.now();
		const kids = rc.map(() => []);
		rc.forEach((c, i) => c[3] !== undefined && kids[c[3]]?.push(i));
		const out = [];
		const walk = (i, depth) => {
			const c = rc[i];
			if (c[3] !== undefined && article.at + (c[4] ?? 0) * this.DAY > upTo) return;
			out.push({ h: c[0], t: c[1], depth: Math.min(depth, 2), to: c[3] !== undefined ? rc[c[3]][0] : "" });
			for (const k of kids[i]) walk(k, depth + 1);
		};
		rc.forEach((c, i) => c[3] === undefined && walk(i, 0));
		return out;
	},

	/* Picks, changes or (picking the same again) removes the player's reaction. */
	react(id, kind) {
		const r = this.state().reactions;
		if (r[id] === kind) delete r[id];
		else r[id] = kind;
		/* The reader is an overlay, so write the change into the saved moment now. */
		window.updateMoment?.();
	},

	/* One comment per article. A comment flagged "watched" draws the city's attention to the commenter's identity, once. */
	comment(id, index) {
		const st = this.state();
		if (st.comments[id] !== undefined) return;
		const option = this.find(id)?.options[index];
		if (!option) return;
		st.comments[id] = { i: index, t: option[0], at: Time.date.timeStamp };
		if (option[1] === "watched") setup.arcology.expose(1);
		window.updateMoment?.();
	},

	/* Replies to the player's comments arrive the in-game day after posting. Written once and saved, so they never change.
	   A watched comment already cost its identity read when it was posted; the reply only shows what that attention looks like. */
	answer(st, day) {
		for (const [id, cm] of Object.entries(st.comments)) {
			if (cm.r || Math.floor(cm.at / this.DAY) >= day) continue;
			const rec = st.arts.find(x => x.id === id);
			if (!rec) continue;
			cm.r = setup.arcologyNewsText.reply(rec, cm, day);
			cm.u = 1;
			/* Who said what, kept 28 days even after the article itself expires, so a handle doesn't repeat itself. */
			st.said ??= [];
			for (const x of cm.r) st.said.push([day, x.h, Math.floor(this.seed(x.t.replace(/^@\S+ /, "")) * 1e5), Math.floor(this.seed(this.normalize(x.t)) * 1e5)]);
		}
	},

	/* Replies the Holo can show now and the player has not opened. */
	unread() {
		this.sync();
		const upTo = this.now();
		return Object.entries(this.state().comments)
			.filter(([, cm]) => cm.u && cm.r?.[0]?.at <= upTo)
			.map(([id]) => id);
	},

	/* Opening the discussion clears its new-reply mark. */
	markRead(id) {
		const cm = this.state().comments[id];
		if (!cm?.u || !(cm.r?.[0]?.at <= this.now())) return;
		delete cm.u;
		window.updateMoment?.();
	},

	/* An article or comment time, as the Holo shows it. */
	when(at) {
		return setup.arcology.when(at).toUpperCase();
	},
};

$(document).on(":passagedisplay.arcologyNews", () => setup.arcologyNews.sync());
