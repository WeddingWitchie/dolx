/* ==============================================================
 * POPPY CORE FUNCTIONS WERE MOVED HERE ON PURPOSE
 * ==============================================================
 * The core Poppy functions were separated into this file to:
 * 1. avoid overpopulating the vanilla named NPC system
 * 2. keep upstream merge conflicts smaller
 * 3. make mod-specific behaviour easier to find
 * 4. keep vanilla files cleaner and more readable
 * 5. reduce the chance of unrelated regressions in shared NPC code
 *
 * This means named-npc.js should only keep the minimum integration
 * points needed to recognise and route Poppy through the normal NPC
 * pipeline, while the actual Poppy-specific logic stays here.
 * ============================================================== */
function poppyStatusCheck(poppy = C.npc.Poppy) {
	if (!poppy) return (T.poppyStatus = []);

	const poppyStatus = [];

	// Strict validation only (no silent auto-initialization here)
	const missing =
		!V.daily || !V.daily.poppy ||
		!poppy.timer || poppy.timer.lastInteraction == null || poppy.timer.lastInteraction === "" ||
		typeof poppy.patience !== "number" || Number.isNaN(poppy.patience) ||
		!Array.isArray(V.poppySeen);
	if (missing) {
		console.warn("[Poppy] Missing/invalid LI data in status check", {
			daily: V.daily,
			poppyDaily: V.daily?.poppy,
			timer: poppy.timer,
			patience: poppy.patience,
			poppySeen: V.poppySeen,
		});
		T.poppyStatus = ["DataInvalid"];
		return T.poppyStatus;
	}

	// LI availability (used by decay + lust lock)
	T.poppyLIAvailable = typeof V.poppyromance === "number" && V.poppyromance >= 0;
	T.poppyLustUnlocked = T.poppyLIAvailable;

	// Patience is stored as a signed value (-100..100) in poppy.patience.
	// anger is a display-only mirror and is never read back.
	// This means "npcincr Poppy patience N" works correctly without a wrapper.
	{
		const _sp = Number(poppy.patience) || 0;
		const _sa = Number(poppy.anger)    || 0;
		if (_sp === 0 && _sa > 0) {
			// Old split-storage format detected — convert to signed.
			poppy.patience = -_sa;
		}
		// _sp < 0 : already signed (from npcincr or a previous run), no change.
		// _sp > 0 : positive patience, no change.
	}

	// Clamp signed value to -100..100
	poppy.patience = Math.max(-100, Math.min(100, Number(poppy.patience) || 0));

	// Signed source of truth for UI + logic
	T.poppyPatienceRaw = poppy.patience;

	// Split into UI-facing values (Sydney-style dual-face display)
	T.poppyPatience = Math.max(0, poppy.patience); T.poppyAnger = Math.max(0, -poppy.patience);

	// Patience stays signed, do NOT overwrite with the positive-only display value.
	// anger is a display-only mirror; it is never used for reconstruction.
	poppy.anger = T.poppyAnger;

	// Mood (based on signed value)
	if (T.poppyPatienceRaw >= 50) {
		T.poppyMood = "calm";
	} else if (T.poppyPatienceRaw >= 0) {
		T.poppyMood = "irritated";
	} else if (T.poppyPatienceRaw >= -50) {
		T.poppyMood = "angry";
	} else {
		T.poppyMood = "furious";
	}

	// Patience bands (still based on positive Patience side for gating)
	if (T.poppyPatience <= 33) {
		poppyStatus.push("LowPatience", "Restricted");
	} else if (T.poppyPatience <= 66) {
		poppyStatus.push("MidPatience");
	} else {
		poppyStatus.push("HighPatience");
	}

	// Love gating (unchanged logic: requires patience side)
	T.poppyLoveGainAllowed = T.poppyPatience >= 34;

	// Lust lock
	poppyStatus.push(T.poppyLustUnlocked ? "LustUnlocked" : "LustLocked");

	// Confession ready (Love + Patience at 100)
	const love = typeof poppy.love === "number" && !Number.isNaN(poppy.love) ? poppy.love : 0;
	T.poppyConfessionReady = love >= 100 && T.poppyPatience === 100 && T.poppyLIAvailable;
	if (T.poppyConfessionReady) poppyStatus.push("ConfessionReady");

	// TF visibility (based on existing logic)
	T.poppyTF = { ears: "hidden", tail: "hidden", known: false };

	if (V.settings?.transformAnimalEnabled) {
		if (V.poppySeen.includes("poppy_tf_revealed")) {
			if (V.hallucinations >= 1) {
				T.poppyTF.ears = "revealed";
				T.poppyTF.tail = "revealed";
			} else {
				T.poppyTF.ears = "fake";
				T.poppyTF.tail = "fake";
			}
			T.poppyTF.known = true;
		} else if (V.awarelevel >= 5) {
			T.poppyTF.ears = "visible";
			T.poppyTF.tail = "visible";
		}
	}

	return (T.poppyStatus = poppyStatus);
}
window.poppyStatusCheck = poppyStatusCheck;

function poppyDailyPatienceDecay(daysPassed = 1, poppy = C.npc.Poppy) {
	if (!poppy || poppy.init !== 1) return;
	if (!V.daily || !V.daily.poppy || !Array.isArray(V.poppySeen) || !poppy.timer) return;
	if (typeof poppy.patience !== "number" || Number.isNaN(poppy.patience)) return;

	// Decay policy:
	//   • Non-LI no decay at all.
	//     Patience is a relationship-pressure stat; without a romantic stake
	//     there is nothing to slip from, so we leave it untouched.
	//   • LI
	//       – interacted that day  → 0 decay (the check is passed)
	//       – missed that day      → 2 decay (the check is failed)
	const isLI = typeof V.poppyromance === "number" && V.poppyromance >= 0;
	if (!isLI) {
		// Still stamp the decay timer so the date-roll bookkeeping moves on,
		// otherwise the same days could be "re-processed" if the player later becomes an LI.
		poppy.timer.lastPatienceDecay = Time.date.timeStamp;
		return;
	}

	const processedDays = Math.max(0, Number(daysPassed) || 0);
	if (processedDays <= 0) return;

	const lastInteractionDay =
		typeof poppy.timer.lastInteractionDay === "number"
			? poppy.timer.lastInteractionDay
			: -999999;

	/*
		We are currently on Time.days.
		If daysPassed is 2 and Time.days is 10, the ended days being scored are 8 and 9.
	*/
	for (let i = 0; i < processedDays; i++) {
		const endedDay = Time.days - processedDays + i;
		// Pass = interaction stamped on (or after) the day being scored.
		const passed = lastInteractionDay >= endedDay;
		const decay = passed ? 0 : 2;

		if (decay !== 0) {
			poppy.patience -= decay;
			poppy.patience = Math.max(-100, Math.min(100, Number(poppy.patience) || 0));
			poppy.anger = Math.max(0, -poppy.patience);
		}
	}

	poppy.timer.lastPatienceDecay = Time.date.timeStamp;
}
window.poppyDailyPatienceDecay = poppyDailyPatienceDecay;

function markPoppyInteraction(poppy = C.npc.Poppy) {
	if (!poppy || poppy.init !== 1) return;
	poppy.timer ||= {}; poppy.timer.lastInteraction = Time.date.timeStamp; poppy.timer.lastInteractionDay = Time.days;
}
window.markPoppyInteraction = markPoppyInteraction;

function poppySchedule() {
	const poppy = C.npc.Poppy;
	if (!poppy) return "nowhere";

	const clearSchedule = () => {
		T.poppy_location = "nowhere"; T.poppy_location_message = ""; T.poppy_night_active = 0;
		// Reset flat presence so stale home/room/meal state cannot leak into the flat UI.
		if (V.poppyFlat) { V.poppyFlat.home = false; V.poppyFlat.room = ""; V.poppyFlat.meal = ""; }
		return T.poppy_location;
	};

	/* Intro guard */
	if (poppy.init !== 1 || !Array.isArray(V.poppySeen) || !V.poppySeen.includes("talk_intro")) {
		return clearSchedule();
	}

	// Refresh derived flags (patience bands, etc.) before location gating.
	poppyStatusCheck(poppy);

	// If data is invalid, fail safely instead of running a half-broken schedule.
	if (T.poppyStatus?.includes("DataInvalid")) { return clearSchedule(); }

	// Blood Moon override: Poppy stays home all day (cancels all outside activities).
	if (Time.isBloodMoon()) {
		T.poppy_location = "flatApartment"; T.poppy_location_message = "apartment"; T.poppy_night_active = 0;
		if (!V.poppyFlat) V.poppyFlat = {};
		V.poppyFlat.home = true; V.poppyFlat.room = "living_room"; V.poppyFlat.meal = "";
		return T.poppy_location;
	}

	// Time.minutesSinceMidnight is defined in time.js as Time.hour*60 + Time.minute.
	// Several twee scenes also rely on this same property (e.g. the lake event), 
	// so we use the canonical name here for consistency.
	const mins = Time.minutesSinceMidnight;
	const isWeekend = Time.isWeekEnd();
	const isSchoolDay = Time.schoolDay;
	// weekDay convention from time.js: 1 = Sunday ... 7 = Saturday.
	// Tuesday = 3, Thursday = 5 to matches housekeeping.twee's [3, 5] check.
	const isLessonDay = isSchoolDay && (Time.weekDay === 3 || Time.weekDay === 5); // Tue + Thu
	// School holiday = any day outside the school term. 
	// During holidays Poppy is not running her housekeeping schedule, 
	// so route those days through the weekend timetable
	// otherwise the player has no way to bump into her at the lake / cafe / soup kitchen during the weeks-long holiday breaks.
	const onHoliday = !Time.schoolTerm;
	const useWeekendTimetable = isWeekend || onHoliday;

	const at = (start, end) => mins >= start && mins < end;
	let loc = "flatApartment"; let msg = "apartment"; let nightActive = 0;

	// ---------- Shared daily timetable (applies every day) ----------
	if (at(1380, 1440) || at(0, 60)) {
		// 11PM–midnight  and  midnight–1AM: nightly activities (streets / pub)
		loc = "nightly"; msg = "night";
		nightActive = 1;
	} else if (at(60, 360)) {
		// 1AM–6AM: sleep
		loc = "flatApartment"; msg = "sleep";
	} else if (at(360, 420)) {
		// 6AM–7AM: breakfast (both weekday and weekend)
		loc = "flatKitchen"; msg = "breakfast";
	} else if (at(1080, 1260)) {
		// 6PM–9PM: charity / soup kitchen (both weekday and weekend)
		loc = "soupKitchen"; msg = "charity";
	} else if (at(1260, 1320)) {
		// 9PM–10PM: dinner (both weekday and weekend)
		loc = "flatKitchen"; msg = "dinner";
	}
	// ---------- School-day timetable ----------
	else if (isSchoolDay) {
		if (at(420, 540) || at(720, 780) || at(900, 960)) {
			// 7–9AM, 12–1PM, 3–4PM: prep in housekeeping classroom
			loc = "housekeepingClassroom"; msg = "prep";
		} else if (isLessonDay && at(600, 660)) {
			// 10–11AM on Tue/Thu: housekeeping lesson
			loc = "housekeepingLesson"; msg = "lesson";
		} else if (at(540, 900)) {
			// 9AM–3PM (gaps not covered by prep/lesson): skipping / hallways
			loc = "schoolHallways"; msg = "skipping";
		}
		// 4PM–6PM on school days: no explicit slot → stays at flatApartment (home after prep)
	}
	// ---------- Weekend / school-holiday timetable ----------
	// Same slots whether it's a normal weekend day or a weekday during a school holiday 
	// Poppy isn't at school either way, so their routine is the same.
	else if (useWeekendTimetable) {
		if (at(420, 540)) {
			// 7–9AM: visiting Bailey's office
			loc = "baileyOffice"; msg = "bailey";
		} else if (at(540, 720)) {
			// 9AM–12PM: nature time at the lake, unless weather cancels it
			if (["rain", "snow"].includes(Weather.precipitation)) {
				loc = "flatApartment"; msg = "lounging";
			} else {
				loc = "lake"; msg = "lake";
			}
		} else if (at(780, 900)) {
			// 1–3PM: tea time at the café
			loc = "cafe"; msg = "tea";
		} else if (at(960, 1020)) {
			// 4–5PM: lounging at home
			loc = "flatApartment"; msg = "lounging";
		}
		// 12–1PM, 3–4PM, 5–6PM gaps: no explicit slot → flatApartment (transitioning/resting)
	}

	// ---------- Low patience restriction ----------
	// If patience is low, Poppy only appears at locations where she can ignore the PC or stay at home behind a locked door
	if (T.poppyStatus?.includes("LowPatience")) {
		const allowed = ["lake", "housekeepingClassroom", "housekeepingLesson", "schoolHallways", "flatApartment", "flatKitchen"];
		if (!allowed.includes(loc)) { return clearSchedule(); }
	}

	// ---------- Commit location to temp vars ----------
	T.poppy_location = loc; T.poppy_location_message = msg; T.poppy_night_active = nightActive;

	// ---------- Update flat presence state ----------
	// These drive $poppyFlat.home / .room / .meal checks in the flat passages.
	if (!V.poppyFlat) V.poppyFlat = {};
	const atFlat = loc === "flatApartment" || loc === "flatKitchen";
	V.poppyFlat.home = atFlat;
	V.poppyFlat.room  = atFlat ? (msg === "sleep" ? "bedroom" : "living_room") : "";
	// Only set meal during actual cooking windows; empty string = no meal happening.
	V.poppyFlat.meal  = msg === "breakfast" ? "breakfast" : msg === "dinner" ? "dinner" : "";

	return T.poppy_location;
}
window.poppySchedule = poppySchedule;
DefineMacro("poppySchedule", poppySchedule);
DefineMacro("poppyRefreshSchedule", poppySchedule); 


/* 
 * ==============================================================
 * global V, T, C, Time, DefineMacro, statChange
 * ==============================================================
 */
(function () {
	"use strict";

	/*
		Set this to 1 if Pavlov to unlock only when Poppy is an actual lover.
		Leave at 0 if it as soon as Poppy is unlocked as a love interest.
	*/
	const POPPY_PAVLOV_ROMANCE_THRESHOLD = 0;

	function hasTrait(name) {
		return Array.isArray(V.backgroundTraits) && V.backgroundTraits.includes(name);
	}

	function addTrait(name) {
		if (!Array.isArray(V.backgroundTraits)) V.backgroundTraits = [];
		if (!V.backgroundTraits.includes(name)) V.backgroundTraits.push(name);
	}

	function removeTrait(name) {
		if (!Array.isArray(V.backgroundTraits)) return;
		const index = V.backgroundTraits.indexOf(name);
		if (index !== -1) V.backgroundTraits.splice(index, 1);
	}

	function detectScienceAKnowledge() {
		if (V.opium_knowledge === 1) return 1;
		return V.sciencetrait >= 8 ? 1 : 0;
	}

	function ensurePoppyTraitData() {
		if (!Array.isArray(V.backgroundTraits)) V.backgroundTraits = [];

		V.poppyDrug = V.poppyDrug || {};
		const data = V.poppyDrug;

		if (typeof data.addiction !== "number" || Number.isNaN(data.addiction)) data.addiction = Number(V.opium_addiction) || 0;
		if (typeof data.timer !== "number" || Number.isNaN(data.timer)) data.timer = Number(V.opium_timer) || 0;
		if (typeof data.knowledge !== "number" || Number.isNaN(data.knowledge)) data.knowledge = Number(V.opium_knowledge) || 0;
		if (typeof data.withdrawalStage !== "number" || Number.isNaN(data.withdrawalStage)) data.withdrawalStage = 0;
		if (typeof data.pendingMessage !== "string") data.pendingMessage = "";
		if (typeof data.pendingPavlov !== "boolean") data.pendingPavlov = false;
		if (typeof data.insomniaSuppress !== "boolean") data.insomniaSuppress = false;

		V.opium_addiction = data.addiction;
		V.opium_timer = data.timer;
		V.opium_knowledge = data.knowledge;

		return data;
	}

	function syncPoppyTraitMirrors() {
		const data = ensurePoppyTraitData();
		V.opium_addiction = data.addiction;
		V.opium_timer = data.timer;
		V.opium_knowledge = data.knowledge;
	}

	function updateOpiumKnowledge(forceKnown = null) {
		const data = ensurePoppyTraitData();

		if (forceKnown === 1 || forceKnown === true || forceKnown === "known") {
			data.knowledge = 1;
		} else if (detectScienceAKnowledge()) {
			data.knowledge = 1;
		}

		syncPoppyTraitMirrors();
		return data.knowledge;
	}

	function shouldGainPavlov() {
		return typeof V.poppyromance === "number" && V.poppyromance >= POPPY_PAVLOV_ROMANCE_THRESHOLD;
	}

	function grantPavlovIfNeeded() {
		const data = ensurePoppyTraitData();

		if (shouldGainPavlov() && !hasTrait("pavlovpoppy")) {
			addTrait("pavlovpoppy");
			data.pendingPavlov = true;
			V.effectsmessage = 1;
			return true;
		}

		return false;
	}

	function grantOpiumAddictIfNeeded() {
		const data = ensurePoppyTraitData();

		if (data.addiction >= 150 && !hasTrait("opiumaddict")) {
			addTrait("opiumaddict");
			data.timer = 21;
			data.withdrawalStage = 0;
			data.pendingMessage = data.knowledge ? "traitGainKnown" : "traitGainUnknown";
			V.effectsmessage = 1;
			syncPoppyTraitMirrors();
			return true;
		}

		return false;
	}

	function consumePendingOpiumMessage() {
		const data = ensurePoppyTraitData();
		const message = data.pendingMessage || "";
		data.pendingMessage = "";
		return message;
	}

	function consumePendingPavlovMessage() {
		const data = ensurePoppyTraitData();
		const pending = !!data.pendingPavlov;
		data.pendingPavlov = false;
		return pending;
	}

	/**
	 * Returns true (and clears the flag) if the player inhaled opium while an addict
	 * since the last daily tick, i.e. insomnia should be suppressed this sleep cycle.
	 * Retained as a utility for debugging / future use, but sleep passages do not need
	 * to call this; suppression is handled automatically inside statChange.trauma().
	 */
	function consumePendingInsomniaSuppress() {
		const data = ensurePoppyTraitData();
		const suppress = !!data.insomniaSuppress;
		data.insomniaSuppress = false;
		return suppress;
	}

	function poppyOpiumPulse(forceKnown = null) {
		const data = ensurePoppyTraitData();
		const wasKnown = data.knowledge === 1;

		const known = updateOpiumKnowledge(forceKnown) === 1;

		data.addiction = Math.clamp(data.addiction + 1, 0, 200);
		// Relief requires actual pain to relieve. Knowledge alone no longer forces
		// "relieved" when pain is 0; in that case the opium just makes PC drowsy,
		// whether they recognise the scent or not.
		const hasPain = typeof V.pain === "number" && V.pain > 0;
		const relieved = hasPain;

		if (hasTrait("opiumaddict")) {
			data.timer = 21;
			// Opium Addict: inhaling opium suppresses insomnia for the coming sleep cycle.
			data.insomniaSuppress = true;
		}

		const learnedKnowledge = !wasKnown && data.knowledge === 1;
		const traitGain = grantOpiumAddictIfNeeded();
		const pavlovGain = grantPavlovIfNeeded();

		syncPoppyTraitMirrors();

		return {
			relieved,
			drowsy: !relieved,
			known: data.knowledge === 1,
			learnedKnowledge,
			traitGain,
			pavlovGain,
			addiction: data.addiction,
			timer: data.timer,
		};
	}

	function poppyDailyTraits() {
		const data = ensurePoppyTraitData();

		// Pavlov: Poppy slows the daily addiction decay, making it harder to naturally quit.
		const dailyDecay = hasTrait("pavlovpoppy") ? 3 : 5;
		data.addiction = Math.clamp(data.addiction - dailyDecay, 0, 200);
		// Reset the insomnia-suppression flag each new day. It is read on every trauma() call
		// (in stat-changes.js), so it does not need to be consumed by the sleep passage
		// the daily tick is the correct expiry point.
		data.insomniaSuppress = false;

		if (hasTrait("opiumaddict")) {
			data.timer = Math.max(0, data.timer - 1);

			if (data.timer <= 0) {
				removeTrait("opiumaddict");
				data.addiction = 0;
				data.timer = 0;
				data.withdrawalStage = 0;
				data.pendingMessage = data.knowledge ? "traitLostKnown" : "traitLostUnknown";
				V.effectsmessage = 1;
			} else if (data.timer <= 11) {
				data.pendingMessage = data.knowledge ? "withdrawalsKnown" : "withdrawalsUnknown";
				V.effectsmessage = 1;
				data.withdrawalStage = 1;
			}
		} else if (data.addiction >= 150) {
			grantOpiumAddictIfNeeded();
		}

		grantPavlovIfNeeded();
		syncPoppyTraitMirrors();
		return data;
	}

	DefineMacro("poppyDailyTraits", () => poppyDailyTraits());

	window.ensurePoppyTraitData = ensurePoppyTraitData;
	window.poppyOpiumPulse = poppyOpiumPulse;
	window.poppyDailyTraits = poppyDailyTraits;
	window.poppyConsumePendingOpiumMessage = consumePendingOpiumMessage;
	window.poppyConsumePendingPavlovMessage = consumePendingPavlovMessage;
	window.poppyConsumePendingInsomniaSuppress = consumePendingInsomniaSuppress;
	window.poppyGrantPavlovIfNeeded = grantPavlovIfNeeded;
	window.poppyDetectScienceAKnowledge = detectScienceAKnowledge;
})();
