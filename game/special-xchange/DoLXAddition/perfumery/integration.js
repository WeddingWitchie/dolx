/* globals V, C, Time, Weather, Wikifier, modLISelected, poppyDismissed, poppySchedule, poppyFlatAccessible, markPoppyInteraction */
(() => {
	"use strict";
	const model = () => setup.perfumeryModel;
	const now = () => V.timeStamp;
	const enabled = () => V.perfumery?.enabled !== false;
	const composition = f => JSON.stringify(model().layers.map(l => Object.entries(f[l]).sort(([a], [b]) => a.localeCompare(b))));
	const formulaKey = f =>
		JSON.stringify({
			version: f.version,
			notes: JSON.parse(composition(f)),
			solvent: f.solvent,
			concentration: f.concentration,
			capacity: f.capacity,
			age: f.age,
		});
	const notes = f =>
		model()
			.layers.map(
				l =>
					`${l === "heart" ? "Heart" : l[0].toUpperCase() + l.slice(1)}: ${Object.entries(f[l])
						.map(([id, n]) => `${model().name(id)} × ${n}`)
						.join(", ")}`
			)
			.join(". ");
	function state() {
		// Initialize on first use; ordinary scent checks leave untouched saves alone.
		V.perfumery ??= {
			version: 1,
			extraction: { stock: {}, profiles: [], serial: 0, practice: 0, lesson: null },
			session: null,
			collaborations: [],
			learned: false,
			equipment: false,
			skill: 0,
			lesson: 0,
			lessonSample: null,
			kit: false,
			bottles: [],
			journal: [],
			solvent: { soft: 0, clear: 0, bright: 0 },
			containers: 0,
			serial: 0,
			active: null,
			social: {},
			giftDay: -1,
			gifts: [],
			invited: false,
		};
		return V.perfumery;
	}

	function extract(source, method, mask, finish, serial, quick = false) {
		const s = state();
		const e = s.extraction;
		if (V.perfumeryVenue === "poppy" && teacher()) poppySchedule();
		if (!access() || V.passage !== "Perfumery Workstation") throw new Error("Use an accessible perfumery workstation.");
		if (serial !== e.serial) throw new Error("This extraction has already been collected. Set out another sample.");
		const result = setup.perfumeryExtraction.calculate(source, method, mask, finish);
		const known = e.profiles.find(p => p.key === result.key);
		if (quick && (!known || known.runs < 2)) throw new Error("Study this exact profile twice before using Quick Extraction.");
		if ((V.foodstuff[source]?.amount || 0) < 1) throw new Error("You need one whole source item.");
		if (!Object.hasOwn(e.stock, result.key) && Object.keys(e.stock).length >= 80)
			throw new Error("Your extract case holds 80 profiles. Use or discard one first.");
		if ((e.stock[result.key] || 0) + result.yield > 240) throw new Error("This profile's vial is full (240 measures).");
		// This synchronous transaction is the only raw-material debit in perfumery.
		V.foodstuff[source].amount--;
		e.stock[result.key] = (e.stock[result.key] || 0) + result.yield;
		e.serial++;
		e.practice = Math.min(100, e.practice + (quick ? 0 : 1));
		if (known) known.runs = Math.min(255, known.runs + 1);
		if (e.lesson && !e.lesson.complete) {
			if (source === "red_rose") e.lesson.flower = result.key;
			if (source === "choc_chip_cookie") e.lesson.food = result.key;
		}
		Time.pass(result.minutes * 60);
		if (V.perfumeryVenue === "poppy" && V.modLIUnlocks?.Poppy) poppySchedule();
		return result;
	}
	function saveExtraction(key) {
		const e = state().extraction;
		if (!e.stock[key]) throw new Error("Collect the extract before recording its profile.");
		if (e.profiles.some(p => p.key === key)) return;
		if (e.profiles.length >= 48) throw new Error("Your extraction notebook holds 48 profiles.");
		const p = setup.perfumeryExtraction.profile(key);
		if (!p) throw new Error("Unknown extraction profile.");
		e.profiles.push({ key, name: model().name(key).slice(0, 80), runs: 1 });
	}
	function extractionLesson(action) {
		const s = state();
		if (teacher()) poppySchedule();
		if (!canTeach() || s.lesson < 4 || (s.session && s.session.stage !== "concluded"))
			throw new Error("Finish the apprenticeship experiment and meet Poppy when free.");
		if (action === "begin") {
			if (s.extraction.lesson) throw new Error("This comparison has already been started.");
			// Teaching samples are awarded once; they still require normal extraction.
			s.extraction.lesson = { flower: null, food: null, complete: false };
			for (const id of ["red_rose", "choc_chip_cookie"]) {
				V.foodstuff[id] ??= { amount: 0 };
				V.foodstuff[id].amount++;
			}
		} else if (action === "review") {
			const l = s.extraction.lesson;
			if (!l || l.complete || !l.flower || !l.food) throw new Error("Capture both comparison samples first.");
			l.complete = true;
			if (s.social.Poppy !== Time.days) {
				s.social.Poppy = Time.days;
				Wikifier.wikifyEval("<<npcincr Poppy love 1>>");
			}
		} else throw new Error("Choose a comparison action.");
		markPoppyInteraction();
		Time.pass(5 * 60);
	}
	function teacher() {
		return enabled() && !!V.modLIUnlocks?.Poppy && C.npc.Poppy?.init === 1 && !poppyDismissed() && (C.npc.Poppy.patience >= 34 || Number(V.poppyromance) >= 0);
	}
	function availableTeacher() {
		if (!teacher()) return false;
		return (
			V.poppyFlat?.home &&
			V.poppyFlat.room === "living_room" &&
			!Time.isBloodMoon() &&
			!(Number(V.poppyFlat.kickedUntilDay) >= Time.days) &&
			!(Time.month === 2 && Time.monthDay === 14 && V.valentines_poppy_flat_accept)
		);
	}
	function canTeach() {
		return V.location === "flats" && V.bus === "poppy_living_room" && availableTeacher() && C.npc.Poppy.love >= (V.perfumery?.lesson === 3 ? 60 : 15);
	}
	function canInvite() {
		return (
			teacher() &&
			C.npc.Poppy.love >= 15 &&
			((V.location === "lake" && T.poppy_location === "lake" && Time.hour >= 9 && Time.hour < 12 && !["rain", "snow"].includes(Weather.precipitation)) ||
				canTeach() ||
				// A partner can ask in Poppy's bedroom while Poppy is awake there.
				(V.bus === "poppy_bedroom" && V.poppyFlat?.bedroomUnlocked && Number(V.poppyromance) >= 0 && V.poppyFlat.home && !(Time.hour >= 1 && Time.hour < 6)))
		);
	}
	function canVisit() {
		if (!enabled() || !V.perfumery?.invited || !V.modLIUnlocks?.Poppy || poppyDismissed()) return false;
		if (!teacher() && Number(V.poppyromance) < 0) return false;
		if (Time.isBloodMoon() || Number(V.poppyFlat?.kickedUntilDay) >= Time.days || (Time.month === 2 && Time.monthDay === 14 && V.valentines_poppy_flat_accept))
			return false;
		return poppyFlatAccessible() || (teacher() && V.poppyFlat?.home && V.poppyFlat.room !== "bedroom");
	}
	function access() {
		return (
			enabled() &&
			V.perfumery?.learned &&
			(V.perfumeryVenue === "home"
				? V.perfumery.equipment && V.location === "home"
				: V.perfumeryVenue === "poppy" && V.location === "flats" && V.bus === "poppy_living_room" && canVisit())
		);
	}
	function buy(kind, type = "clear") {
		const s = state();
		if (!enabled() || V.passage !== "Perfumery Supplies" || V.location !== "shopping_centre")
			throw new Error("Buy equipment and supplies at the cosmetics shop.");
		const base = kind === "equipment" ? 15000 : kind === "manual" ? 5000 : kind === "container" ? 150 : model().solvents[type]?.cost * 20;
		const price = setup.inflation ? setup.inflation.price(base) : base;
		if (!Number.isFinite(price) || V.money < price) throw new Error("You cannot afford that purchase.");
		if (kind === "equipment" && (s.equipment || !s.learned)) throw new Error("Learn the basics before buying equipment.");
		if (kind === "manual" && (s.learned || modLISelected("Poppy"))) throw new Error("Poppy can teach you the basics.");
		if (!["equipment", "manual", "container", "solvent"].includes(kind)) throw new Error("Unknown supply.");
		statChange.money(-base, "cosmetics");
		if (kind === "equipment") s.equipment = true;
		else if (kind === "manual") {
			s.learned = true;
			s.equipment = true;
		} else if (kind === "container") s.containers++;
		else s.solvent[type] += 20;
	}
	function invite() {
		if (teacher()) poppySchedule();
		if (!canInvite()) throw new Error("Ask Poppy when there is time to talk.");
		state().invited = true;
		markPoppyInteraction();
		Time.pass(5 * 60);
	}
	function beginLesson(approach = "observe") {
		const s = state();
		if (teacher()) poppySchedule();
		if (!canTeach() || s.lesson >= 4) throw new Error("Poppy cannot teach the next lesson right now.");
		if (!s.invited) throw new Error("Ask Poppy about learning first.");
		if (s.session && s.session.stage !== "concluded") throw new Error("Finish or put aside your current experiment first.");
		if (!["observe", "familiar", "contrast", "quiet", "bold", "respect", "question"].includes(approach)) throw new Error("Choose a lesson approach.");
		s.session = { kind: "lesson", lesson: s.lesson, stage: "compose", approach, bottleId: null };
		s.invited = true;
		s.learned = true;
		if (!s.kit) {
			s.kit = true;
			for (const id of ["red_rose", "daisy", "orchid"]) {
				V.foodstuff[id] ??= { amount: 0 };
				V.foodstuff[id].amount += 6;
			}
			s.containers += 3;
			s.solvent.clear += 60;
		}
		markPoppyInteraction();
		Time.pass(5 * 60);
	}
	function lessonMatches(bottle) {
		const s = state();
		const f = bottle.formula;
		const p = properties(bottle);
		let complete = false;
		if (s.lesson === 0) complete = true;
		if (s.lesson === 1 && s.lessonSample) {
			const previous = model().validate(s.lessonSample).needed;
			const next = model().validate(f).needed;
			complete =
				Object.keys(previous).sort().join() === Object.keys(next).sort().join() &&
				composition(f) !== composition(s.lessonSample) &&
				(Object.keys(previous).length === 1 || model().layers.some(l => Object.keys(f[l]).length >= 2));
		}
		if (s.lesson === 2 && s.lessonSample)
			complete =
				composition(f) === composition(s.lessonSample) &&
				(f.concentration !== s.lessonSample.concentration || f.solvent !== s.lessonSample.solvent || f.age !== s.lessonSample.age);
		if (s.lesson === 3) complete = p.families.includes("floral") && p.persistence > 0.5 && p.quality >= 60;
		return complete;
	}
	/* Poppy's own entry for the friendly rivalry. Fixed so the comparison is fair across saves. */
	const rivalFormula = { version: 1, top: { daisy: 1 }, heart: { red_rose: 2 }, base: { orchid: 2 }, solvent: "soft", concentration: 26, capacity: 40, age: 3 };
	function startCollaboration(topic, demonstrated) {
		const s = state();
		if (teacher()) poppySchedule();
		if (!canTeach() || s.lesson < 4 || !["opening", "challenge", "gift", "demonstration", "rivalry", "rescue"].includes(topic))
			throw new Error("Poppy isn't available for that collaboration.");
		if (s.session && s.session.stage !== "concluded") throw new Error("Finish your current experiment first.");
		if ((topic === "demonstration" || topic === "rescue") && !demonstrated) throw new Error("Poppy needs a formula to follow.");
		if (topic === "rivalry" && !s.characters?.poppy?.rivalry) throw new Error("Poppy hasn't challenged you yet.");
		const previous = s.bottles[s.bottles.length - 1];
		let reference = demonstrated || (topic === "rivalry" ? rivalFormula : previous?.formula || s.lessonSample);
		if (topic === "gift") {
			if (!s.gifts.length) throw new Error("Poppy has not received a perfume to compare yet.");
			const gift = JSON.parse(s.gifts[s.gifts.length - 1]);
			reference = {
				version: gift.version,
				...Object.fromEntries(model().layers.map((layer, i) => [layer, Object.fromEntries(gift.notes[i])])),
				solvent: gift.solvent,
				concentration: gift.concentration,
				capacity: gift.capacity,
				age: gift.age,
			};
		}
		s.session = { kind: "collaboration", stage: "compose", approach: topic, reference: model().copy(reference), bottleId: null };
		markPoppyInteraction();
		Time.pass(5 * 60);
	}
	function sessionBottle() {
		return V.perfumery?.bottles.find(b => b.id === V.perfumery.session?.bottleId);
	}
	function smellSignature() {
		if (teacher()) poppySchedule();
		const session = V.perfumery?.session;
		if (!canTeach() || session?.kind !== "lesson" || session.lesson !== 3 || session.stage !== "compose" || V.poppySeen.includes("perfumery_signature_strip"))
			throw new Error("Poppy isn't offering another signature strip.");
		V.poppySeen.push("perfumery_signature_strip");
		// This is Poppy's own story-specific fragrance, never a player's manufactured perfume.
		Wikifier.wikifyEval("<<poppyOpiumPulse>>");
		markPoppyInteraction();
		Time.pass(5 * 60);
	}
	function review(response) {
		const s = state();
		const session = s.session;
		const b = sessionBottle();
		if (teacher()) poppySchedule();
		if (!canTeach() || session?.stage !== "review" || !b) throw new Error("Bring a completed sample to Poppy when there is time to talk.");
		if (session.kind === "lesson" && session.lesson === 2 && !ready(b)) throw new Error("Let the comparison bottle mature before evaluating it.");
		if (!["explain", "revise", "respect", "question"].includes(response)) throw new Error("Choose how to discuss your sample.");
		session.response = response;
		session.success = session.kind === "lesson" ? lessonMatches(b) : true;
		session.stage = "concluded";
		if (session.kind === "lesson" && session.success) {
			s.lesson++;
			s.lessonSample = model().copy(b.formula);
			Wikifier.wikifyEval("<<npcincr Poppy love 1>>");
		} else if (session.kind === "collaboration") {
			const key = formulaKey(b.formula);
			if (s.collaborations.length < 16 && !s.collaborations.includes(key)) {
				s.collaborations.push(key);
				if (s.social.Poppy !== Time.days && properties(b).quality >= 65) {
					s.social.Poppy = Time.days;
					Wikifier.wikifyEval("<<npcincr Poppy love 1>>");
				}
			}
		}
		markPoppyInteraction();
		Time.pass(5 * 60);
		return session.success;
	}
	function craft(formula, blending, expectedSerial) {
		const s = state();
		if (V.perfumeryVenue === "poppy" && teacher()) poppySchedule();
		if (!access() || V.passage !== "Perfumery Workstation") throw new Error("You need access to a perfumery workstation.");
		if (expectedSerial !== s.serial) throw new Error("This batch has already been bottled. Start a fresh draft.");
		if (!Number.isFinite(blending) || blending < 0 || blending > 1) throw new Error("Finish blending first.");
		const f = model().copy(formula);
		const cost = model().validate(f);
		if (s.bottles.length >= 24) throw new Error("Your cabinet holds 24 bottles. Use, gift, or discard one first.");
		if (s.containers < 1 || s.solvent[f.solvent] < cost.solvent) throw new Error("You need an empty bottle and enough of the selected spirit.");
		for (const [id, n] of Object.entries(cost.needed)) if ((s.extraction.stock[id] || 0) < n) throw new Error(`Extract more ${model().name(id)} first.`);
		const bottle = bottleRecord(f, Math.min(1, blending * 0.9 + s.skill / 1000), s.serial + 1);
		// All checks precede this synchronous commit. No passage navigation or await between debit and credit.
		for (const [id, n] of Object.entries(cost.needed)) {
			s.extraction.stock[id] -= n;
			if (s.extraction.stock[id] === 0) delete s.extraction.stock[id];
		}
		s.containers--;
		s.solvent[f.solvent] -= cost.solvent;
		s.serial++;
		s.bottles.push(bottle);
		const recorded = s.journal.find(e => formulaKey(e.formula) === formulaKey(f));
		if (recorded) {
			const quality = model().calculate(f, bottle.blending).quality;
			recorded.attempts++;
			recorded.best = Math.max(recorded.best, quality);
			recorded.results.push(Math.round(quality));
			recorded.results = recorded.results.slice(-4);
		}
		s.skill = Math.min(100, s.skill + 1);
		if (s.session?.stage === "compose" && V.perfumeryVenue === "poppy") {
			s.session.bottleId = bottle.id;
			s.session.stage = "review";
		} else setup.perfumeryCharacters.poppyCrafted(bottle);
		Time.pass(20 * 60);
		if (V.perfumeryVenue === "poppy" && V.modLIUnlocks?.Poppy) poppySchedule();
		return bottle;
	}
	function properties(bottle) {
		const age = Math.min(bottle.formula.age, Math.max(0, (now() - bottle.made) / 86400));
		return model().calculate(bottle.formula, bottle.blending, age);
	}
	function bottleRecord(formula, blending, id) {
		const p = model().calculate(formula, blending);
		return {
			id,
			formula: model().copy(formula),
			blending,
			made: now(),
			name: p.name,
			uses: p.applications,
			fingerprint: p.fingerprint,
			icon: setup.perfumeryIcons.descriptor(p.fingerprint, p),
		};
	}
	function debugAction(action, value, extra) {
		if (V.debug !== 1) throw new Error("Enable the native DEBUG menu first.");
		const s = state();
		if (action === "bottle") {
			model().validate(value);
			if (s.bottles.length >= 24 || !Number.isFinite(extra) || extra < 0 || extra > 1) throw new Error("Choose valid craftsmanship and free bottle space.");
			const b = bottleRecord(value, extra, s.serial + 1);
			s.serial++;
			s.bottles.push(b);
			return b;
		}
		if (action === "extract") {
			const p = setup.perfumeryExtraction.profile(value);
			if (!p || !Number.isInteger(extra) || extra < 0 || extra > 240) throw new Error("Choose a real profile and 0–240 measures.");
			if (!Object.hasOwn(s.extraction.stock, value) && Object.keys(s.extraction.stock).length >= 80) throw new Error("Extract case full.");
			if (extra) s.extraction.stock[value] = extra;
			else delete s.extraction.stock[value];
		}
		if (action === "studies") {
			const p = setup.perfumeryExtraction.profile(value);
			if (!p) throw new Error("Choose a profile.");
			s.extraction.profiles = s.extraction.profiles.filter(x => x.key !== value);
			if (extra) {
				if (s.extraction.profiles.length >= 48) throw new Error("Notebook full.");
				s.extraction.profiles.push({ key: value, name: model().name(value).slice(0, 80), runs: 2 });
			}
		}
		if (action === "duration") {
			if (!Number.isFinite(value) || value < 0 || value > 720) throw new Error("Use 0–720 minutes.");
			if (s.active) s.active.remaining = value;
		}
		if (action === "lessons") {
			if (!Number.isInteger(value) || value < 0 || value > 4) throw new Error("Use lesson 0–4.");
			s.lesson = value;
			s.session = null;
		}
		if (action === "workstation") {
			s.learned = true;
			s.equipment = true;
		}
		if (action === "skill") {
			if (!Number.isInteger(value) || value < 0 || value > 100) throw new Error("Use skill 0–100.");
			s.skill = value;
		}
		if (action === "resetLessons") {
			s.lesson = 0;
			s.lessonSample = null;
			s.session = null;
			s.extraction.lesson = null;
		}
	}
	function ready(bottle) {
		return now() >= bottle.made + bottle.formula.age * 86400;
	}
	function apply(id) {
		if (!enabled()) throw new Error("Perfumery is unavailable right now.");
		const s = state();
		const b = s.bottles.find(b => b.id === id);
		if (!b || b.uses < 1 || !ready(b)) throw new Error("That bottle is empty or still maturing.");
		b.uses--;
		const age = Math.min(b.formula.age, Math.max(0, (now() - b.made) / 86400));
		/* The worn scent keeps its recipe, not a copy of the calculation; activeProperties() rebuilds and caches it. */
		s.active = {
			name: b.name,
			icon: setup.perfumeryIcons.forBottle(b),
			formula: model().copy(b.formula),
			blending: b.blending,
			age,
		};
		const p = activeProperties(s.active);
		s.active.remaining = p.duration;
		s.active.total = p.duration;
		// Poppy's Opium carries the real scent, so wearing it counts like being close to Poppy.
		if (b.opium && typeof window.poppyOpiumPulse === "function") window.poppyOpiumPulse();
	}
	function tick(minutes) {
		const a = V.perfumery?.active;
		if (!a) return;
		a.remaining -= minutes * (V.outside && Weather.precipitation === "rain" ? 2 : 1);
		if (a.remaining <= 0) {
			V.perfumery.active = null;
			V.perfumeFadedMessage = a.name;
			V.effectsmessage = 1;
		}
	}
	function wash() {
		if (!V.perfumery?.active) return;
		V.perfumeFadedMessage = V.perfumery.active.name;
		V.perfumeWashedMessage = true;
		V.effectsmessage = 1;
		V.perfumery.active = null;
	}
	function scent() {
		const a = V.perfumery?.active;
		if (!a || !enabled()) return null;
		return { ...previewWear(a), name: a.name };
	}
	const activeCache = new Map();
	function activeProperties(a) {
		const key = JSON.stringify([a.formula, a.blending, a.age]);
		if (!activeCache.has(key)) {
			if (activeCache.size >= 8) activeCache.clear();
			activeCache.set(key, model().calculate(a.formula, a.blending, a.age));
		}
		return activeCache.get(key);
	}
	function previewWear(active, minutes = 0, rain = false) {
		if (!active) return null;
		if (!Number.isFinite(minutes) || minutes < 0 || minutes > 720) throw new Error("Preview 0–720 minutes.");
		const remaining = Math.max(0, active.remaining - minutes * (rain ? 2 : 1));
		const left = model().clamp(remaining / active.total, 0, 1);
		const p = activeProperties(active);
		const d = p.development;
		const layer = left > 0.7 ? "top" : left > 0.3 ? "heart" : "base";
		const pleasantness = p.phasePleasantness?.[layer] ?? p.pleasantness;
		return {
			...p,
			pleasantness,
			romance: model().clamp(p.romance * Math.min(1.2, pleasantness / Math.max(1, p.pleasantness)), 0, 1),
			remaining,
			strength: d.top * left ** 3 + d.heart * Math.sin((left * Math.PI) / 2) + d.base * Math.sqrt(left),
			phase: layer === "top" ? "opening" : layer === "heart" ? "heart" : "foundation",
		};
	}
	function effects() {
		const p = scent();
		if (!p) return [];
		const lines = [`Fades in ${Math.ceil(p.remaining)} min, faster in rain.`];
		if (p.attention * p.strength * 0.2 >= 0.05) lines.push("People in town notice you more.");
		if (V.settings.bestialityEnabled || V.monster === 1) {
			const pull = ["wolf", "boar", "bear"].map(animal => wildlifePreview(animal, p, true));
			if (pull.some(m => m >= 1.05)) lines.push("Forest animals find you more easily.");
			else if (pull.every(m => m <= 0.95)) lines.push("Forest animals find you less easily.");
		}
		if (["Poppy", "Robin"].some(npc => socialPreview(npc, p).score >= 0.2)) lines.push("Some people find it pleasant.");
		if (p.intensity * p.strength > 2.5) lines.push("Some people find it too strong.");
		return lines;
	}
	function wildlife(category) {
		return wildlifePreview(category, scent());
	}
	function wildlifePreview(category, p, outside = V.outside) {
		if (!p || !outside || !(V.settings.bestialityEnabled || V.monster === 1)) return 1;
		const sensory = p.descriptorStrengths;
		const interest =
			category === "bear" ? p.sweet : category === "boar" ? p.animal + (sensory?.savoury || 0) * 0.4 : p.animal - (sensory?.sulfurous || 0) * 0.5;
		return model().clamp(1 + (interest * 0.25 - p.concealment * 0.35) * p.strength, 0.7, 1.3);
	}
	function social(npc) {
		const p = scent();
		if (!p) return false;
		const s = state();
		if (!socialPreview(npc, p).eligible) return false;
		s.social[npc] = Time.days;
		Wikifier.wikifyEval(`<<npcincr ${npc} love 1>>`);
		return true;
	}
	function socialPreview(npc, p = scent()) {
		if (!p || !["Poppy", "Robin"].includes(npc)) return { preference: 0, score: 0, eligible: false };
		const preference = npc === "Poppy" ? p.sweet * 0.4 + p.persistence * 0.6 : Math.max(0, p.fresh - (p.descriptorStrengths?.smoky || 0) * 0.25);
		return {
			preference,
			score: p.romance * (p.strength ?? 1) * preference,
			eligible:
				p.romance * (p.strength ?? 1) * preference >= 0.2 &&
				!!C.npc[npc] &&
				C.npc[npc].love >= 10 &&
				V.perfumery?.social?.[npc] !== Time.days &&
				(npc !== "Poppy" || (teacher() && C.npc.Poppy.patience >= 40)) &&
				p.intensity * (p.strength ?? 1) <= 2.5,
		};
	}
	function saveFormula(id, name) {
		const s = state();
		const b = s.bottles.find(b => b.id === id);
		if (!b) throw new Error("Bottle missing.");
		const key = formulaKey(b.formula);
		const previous = s.journal.find(e => formulaKey(e.formula) === key);
		const quality = model().calculate(b.formula, b.blending).quality;
		const entry = { name: String(name || b.name).slice(0, 48), formula: model().copy(b.formula), best: quality, attempts: 1, results: [Math.round(quality)] };
		entry.blending = b.blending;
		entry.icon = setup.perfumeryIcons.forBottle(b);
		if (previous) {
			previous.name = entry.name;
			previous.best = Math.max(previous.best, entry.best);
		} else {
			if (s.journal.length >= 32) throw new Error("Your journal holds 32 formulas. Remove one first.");
			s.journal.push(entry);
		}
	}
	function outcome(b) {
		const p = properties(b);
		if (p.intensity > 2.6) return "intense";
		if (p.quality < 60) return "discordant";
		const s = V.perfumery || { skill: 0, gifts: [], collaborations: [] };
		const key = formulaKey(b.formula);
		if (p.quality > 85 && s.skill >= 20 && !s.gifts.includes(key) && !s.collaborations.includes(key)) return "original";
		if (p.families.includes("floral") && p.sweet > 0.45 && p.persistence > 0.65) return "familiar";
		if (p.sweet > 0.4 && p.persistence > 0.5 && p.quality > 72) return "preferred";
		return p.quality > 80 ? "elegant" : "beginner";
	}
	function feedback(b) {
		const p = properties(b);
		if (p.pleasantness < 30 && p.quality > 72)
			return 'Poppy smells the paper again, then looks at your notes. "You made this well, but it smells awful. Was that what you wanted?"';
		if (p.pleasantness < 25)
			return 'Poppy coughs and moves the paper away. "That smells terrible! Put the cap back on the bottle before the whole room smells like it."';
		if (p.extractionPurity < 0.55)
			return 'Poppy checks your notes about the ingredients. "I think the problem started when you extracted this one. Try making the extract again before changing how much you use."';
		if (p.distinctiveness > 60 && p.quality > 65)
			return 'Poppy smells the paper again. "I wouldn\'t wear this myself, but you made something interesting. How did you come up with it?"';
		if (p.nuances.includes("gourmand") && p.pleasantness > 65)
			return 'Poppy checks the page where you compared the perfume to cookies. "You were right about the sweet smell. I thought it would cover up the flowers, but I can still smell them."';
		return {
			intense: 'Poppy moves the paper away from the nose. "That\'s strong! I can smell it without bringing it close. Did you want it that strong?"',
			discordant:
				'Poppy smells the paper again and checks your ingredients. "One of these smells is covering up the others. Let\'s check how much of each ingredient you used."',
			original:
				'Poppy reads your ingredient list, then smells the paper again. "I didn\'t expect these ingredients to smell like that together. What did you change?"',
			familiar:
				'Poppy places your sample beside the original perfume bottle. "It reminds me of this one, but yours smells different enough. You should keep your version."',
			preferred: 'Poppy smells the paper again and smiles. "I like this one. The sweet smell comes first, but I can still smell the flowers afterwards."',
			elegant: 'Poppy waits a moment before smelling the paper again. "It still smells good. I don\'t think you need to add anything else yet."',
			beginner:
				'Poppy moves the scented paper away from the open bottles before smelling it again. "That\'s better. The other perfumes were making it difficult to smell yours properly."',
		}[outcome(b)];
	}
	function gift(id) {
		const s = state();
		if (teacher()) poppySchedule();
		const b = s.bottles.find(b => b.id === id);
		if (s.session?.stage === "review" && s.session.bottleId === id) throw new Error("Discuss this experiment before giving away the bottle.");
		if (V.perfumeryVenue !== "poppy" || V.location !== "flats" || !availableTeacher() || !b || !ready(b) || b.uses < 1)
			throw new Error("Offer a usable, matured bottle when Poppy is in the living room.");
		const key = formulaKey(b.formula);
		if (s.giftDay === Time.days || s.gifts.includes(key)) throw new Error("Poppy has already discussed this formula, or received a perfume today.");
		const response = feedback(b);
		const p = properties(b);
		s.giftDay = Time.days;
		s.gifts.push(key);
		// At most 32 rewarded discoveries, so alternating or slightly editing formulas cannot farm forever.
		if (s.gifts.length <= 32 && p.quality > 65 && p.sweet > 0.3 && p.persistence > 0.4 && (p.pleasantness >= 45 || (p.quality > 85 && p.distinctiveness > 65)))
			Wikifier.wikifyEval("<<npcincr Poppy love 2>>");
		if (s.gifts.length > 32) s.gifts.shift();
		s.bottles.splice(s.bottles.indexOf(b), 1);
		markPoppyInteraction();
		Time.pass(5 * 60);
		return `Poppy turns your handwritten label towards the light before accepting the bottle. ${
			p.sweet > 0.4 && p.persistence > 0.5
				? '"You made this for me? Keep a copy of those notes. I may want another when this runs out."'
				: "\"For me? I wouldn't have chosen this myself. That isn't a reason to put it away.\""
		} ${response}`;
	}
	setup.perfumery = {
		wildlifePreview,
		previewWear,
		activeProperties,
		debugAction,
		socialPreview,
		extract,
		saveExtraction,
		extractionLesson,
		state,
		enabled,
		teacher,
		availableTeacher,
		canTeach,
		canInvite,
		canVisit,
		access,
		buy,
		invite,
		beginLesson,
		startCollaboration,
		smellSignature,
		sessionBottle,
		review,
		lessonMatches,
		craft,
		properties,
		ready,
		apply,
		tick,
		wash,
		scent,
		effects,
		wildlife,
		social,
		saveFormula,
		feedback,
		outcome,
		gift,
		bottleRecord,
		composition,
		formulaKey,
		notes,
	};
})();
