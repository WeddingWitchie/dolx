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
		!V.daily ||
		!V.daily.poppy ||
		!poppy.timer ||
		poppy.timer.lastInteraction == null ||
		poppy.timer.lastInteraction === "" ||
		typeof poppy.patience !== "number" ||
		Number.isNaN(poppy.patience) ||
		!Array.isArray(V.poppySeen);
	if (missing) {
		T.poppyStatus = ["DataInvalid"];
		return T.poppyStatus;
	}

	// LI availability (used by decay + lust lock)
	const liAvailable = typeof V.poppyromance === "number" && V.poppyromance >= 0;
	T.poppyLIAvailable = liAvailable;
	T.poppyLustUnlocked = liAvailable;

	// Patience is stored as a signed value (-100..100) in poppy.patience.
	// anger is a display-only mirror and is never read back.
	// This means "npcincr Poppy patience N" works correctly without a wrapper.
	let sp = Number(poppy.patience) || 0;
	// Old (pre-signed) split-storage format migration: only ever needed once, for saves made before patience became signed.
	if (!poppy._legacyAngerMigrated) {
		const sa = Number(poppy.anger) || 0;
		if (sp === 0 && sa > 0) sp = -sa;
		poppy._legacyAngerMigrated = true;
	}
	// Clamp signed value to -100..100 (single branch chain, no Math.* calls)
	if (sp > 100) sp = 100;
	else if (sp < -100) sp = -100;
	if (poppy.patience !== sp) poppy.patience = sp;

	// Signed source of truth for UI + logic
	T.poppyPatienceRaw = sp;

	// Split into UI-facing values (Sydney-style dual-face display)
	const pos = sp > 0 ? sp : 0;
	const neg = sp < 0 ? -sp : 0;
	T.poppyPatience = pos;
	T.poppyAnger = neg;

	// anger is a display-only mirror; it is never used for reconstruction.
	if (poppy.anger !== neg) poppy.anger = neg;

	// Mood (based on signed value)
	if (sp >= 50) T.poppyMood = "calm";
	else if (sp >= 0) T.poppyMood = "irritated";
	else if (sp >= -50) T.poppyMood = "angry";
	else T.poppyMood = "furious";

	// Patience bands (still based on positive Patience side for gating)
	if (pos <= 33) poppyStatus.push("LowPatience", "Restricted");
	else if (pos <= 66) poppyStatus.push("MidPatience");
	else poppyStatus.push("HighPatience");

	// Love gating (unchanged logic: requires patience side)
	T.poppyLoveGainAllowed = pos >= 34;

	// Lust lock
	poppyStatus.push(liAvailable ? "LustUnlocked" : "LustLocked");

	// Confession ready (Love + Patience at 100)
	const love = typeof poppy.love === "number" && !Number.isNaN(poppy.love) ? poppy.love : 0;
	T.poppyConfessionReady = love >= 100 && pos === 100 && liAvailable;
	if (T.poppyConfessionReady) poppyStatus.push("ConfessionReady");

	// TF visibility (based on existing logic)
	const tf = { ears: "hidden", tail: "hidden", known: false };

	if (V.settings?.transformAnimalEnabled) {
		if (V.poppySeen.includes("poppy_tf_revealed")) {
			if (V.hallucinations >= 1) {
				tf.ears = "revealed";
				tf.tail = "revealed";
			} else {
				tf.ears = "fake";
				tf.tail = "fake";
			}
			tf.known = true;
		} else if (V.awarelevel >= 5) {
			tf.ears = "visible";
			tf.tail = "visible";
		}
	}
	T.poppyTF = tf;

	return (T.poppyStatus = poppyStatus);
}
window.poppyStatusCheck = poppyStatusCheck;

/**
 * Checks whether a past day overlapped with a bad end.
 *
 * Bad ends use seconds, while decay uses day numbers, so the day is converted
 * to its matching time range before checking.
 *
 * @param {number} endedDay The past day to check.
 * @param {number} today The current day.
 * @returns {boolean} true if a bad end was active during that day.
 */
function poppyDayInBadEnd(endedDay, today) {
	if (!Array.isArray(V.badEndStats) || !V.badEndStats.length) return false;

	const day = TimeConstants.secondsPerDay;
	const offset = today - endedDay;
	if (offset < 1) return false;

	const now = Time.date.timeStamp;
	const dayStart = now - offset * day;
	const dayEnd = now - (offset - 1) * day;

	// Only recent bad ends can affect the current score, and only a few days are checked at once.
	for (let i = V.badEndStats.length - 1; i >= 0 && i >= V.badEndStats.length - 5; i--) {
		const badEnd = V.badEndStats[i];
		if (!badEnd || !Number.isFinite(badEnd.trackedStart)) continue;
		// An unfinished bad end is still running, so it has no upper bound yet.
		const end = Number.isFinite(badEnd.trackedEnd) ? badEnd.trackedEnd : Infinity;
		if (badEnd.trackedStart <= dayEnd && end >= dayStart) return true;
		// Entries are chronological: once one ends before the day began, older ones do too.
		if (end < dayStart) break;
	}
	return false;
}
window.poppyDayInBadEnd = poppyDayInBadEnd;

function poppyDailyPatienceDecay(daysPassed = 1, poppy = C.npc.Poppy) {
	if (!poppy || poppy.init !== 1) return;
	if (!V.daily || !V.daily.poppy || !Array.isArray(V.poppySeen) || !poppy.timer) return;
	if (typeof poppy.patience !== "number" || Number.isNaN(poppy.patience)) return;

	// Decay policy:
	//   • Non-LI no decay at all.
	//     Patience is a relationship-pressure stat; without a romantic stake
	//     there is nothing to slip from, so we leave it untouched.
	//   • LI
	//       – interacted that day  → 0 decay
	//       – missed that day      → 2 decay
	//   • After the post-bad-end talk, days spent in a bad end no longer count as missed days.
	// 	   Normal decay resumes once the player returns, with no retroactive refund.
	const isLI = typeof V.poppyromance === "number" && V.poppyromance >= 0;
	if (!isLI) {
		// Still stamp the decay timer so the date-roll bookkeeping moves on,
		// otherwise the same days could be re-processed if the player later becomes an LI.
		poppy.timer.lastPatienceDecay = Time.date.timeStamp;
		return;
	}

	const processedDays = Math.max(0, Number(daysPassed) || 0);
	if (processedDays <= 0) return;

	const lastInteractionDay = typeof poppy.timer.lastInteractionDay === "number" ? poppy.timer.lastInteractionDay : -999999;

	/*
		We are currently on Time.days.
		If daysPassed is 2 and Time.days is 10, the ended days being scored are 8 and 9.
	*/
	const today = Time.days;
	const comfortAgreed = V.poppySeen.includes("bad_end_comfort");
	let patience = Number(poppy.patience) || 0;
	let dirty = false;

	for (let i = 0; i < processedDays; i++) {
		const endedDay = today - processedDays + i;

		// Pass = interaction stamped on or after the day being scored.
		if (lastInteractionDay >= endedDay) continue;

		// Pass = the player was locked in a bad end for the day, as Poppy expected.
		if (comfortAgreed && poppyDayInBadEnd(endedDay, today)) continue;

		patience -= 2;

		// Keep the original per-day clamp behaviour.
		if (patience > 100) patience = 100;
		else if (patience < -100) patience = -100;

		dirty = true;
	}

	if (dirty) {
		poppy.patience = patience;
		poppy.anger = patience < 0 ? -patience : 0;
	}

	poppy.timer.lastPatienceDecay = Time.date.timeStamp;
}
window.poppyDailyPatienceDecay = poppyDailyPatienceDecay;

function markPoppyInteraction(poppy = C.npc.Poppy) {
	if (!poppy || poppy.init !== 1) return;
	if (!poppy.timer || typeof poppy.timer !== "object" || Array.isArray(poppy.timer)) poppy.timer = {};
	poppy.timer.lastInteraction = Time.date.timeStamp;
	poppy.timer.lastInteractionDay = Time.days;
}
window.markPoppyInteraction = markPoppyInteraction;

/**
 * Whether the player can currently let themselves into Poppy's flat.
 * Mirrors the gate in the "Flats Poppy Enter" passage; kept here so the Christmas wrapping options and the journal cannot drift away from the real door check.
 *
 * @returns {boolean} true when the flat is open to the player.
 */
function poppyFlatAccessible() {
	if (poppyDismissed()) return false;
	const safeHouse = Number(V.poppySafeHouse) >= 1;
	const claimed = Number(V.poppyromance) >= 0 && Array.isArray(V.poppySeen) && V.poppySeen.includes("lake_postclaim_intro");
	return safeHouse || claimed;
}
window.poppyFlatAccessible = poppyFlatAccessible;

/**
 * Whether Poppy has been sold off in the dismissal event and is permanently gone.
 * Single choke point for every Poppy interaction gate outside her physical schedule (the schedule itself is closed off inside poppySchedule()).
 *
 * @returns {boolean} true once the dismissal abduction has resolved.
 */
function poppyDismissed() {
	return V.poppyFlat?.dismissed === true || V.poppyDismissalFired === 1;
}
window.poppyDismissed = poppyDismissed;

/**
 * Where the Christmas gift handover is taking place.
 * The menu link stamps V.poppyGiftVenue, because the flat's own passages never set V.location and so it cannot be inferred there.
 * V.location is only consulted as a fallback for a save loaded mid-scene, before the stamp existed.
 *
 * @returns {boolean} true when the handover is happening in Poppy's flat.
 */
function poppyGiftAtFlat() {
	if (V.poppyGiftVenue === "flat") return true;
	if (V.poppyGiftVenue === "lake") return false;
	return V.location !== "lake";
}
window.poppyGiftAtFlat = poppyGiftAtFlat;

function poppySchedule() {
	const poppy = C.npc.Poppy;
	if (!poppy) return "nowhere";

	const clearSchedule = () => {
		T.poppy_location = "nowhere";
		T.poppy_location_message = "";
		T.poppy_night_active = 0;
		// Reset flat presence so stale home/room/meal state cannot leak into the flat UI.
		if (V.poppyFlat) {
			if (V.poppyFlat.home !== false) V.poppyFlat.home = false;
			if (V.poppyFlat.room !== "") V.poppyFlat.room = "";
			if (V.poppyFlat.meal !== "") V.poppyFlat.meal = "";
		}
		return T.poppy_location;
	};

	/* Intro guard */
	if (poppy.init !== 1 || !Array.isArray(V.poppySeen) || !V.poppySeen.includes("talk_intro")) {
		return clearSchedule();
	}

	// Refresh derived flags (patience bands, etc.) before location gating.
	poppyStatusCheck(poppy);

	// If data is invalid, fail safely instead of running a half-broken schedule.
	if (T.poppyStatus?.includes("DataInvalid")) {
		return clearSchedule();
	}

	// Dismissal: Poppy has been sold off and no longer keeps a schedule anywhere in town.
	if (poppyDismissed()) {
		return clearSchedule();
	}

	// Blood Moon override: Poppy stays home all day (cancels all outside activities).
	if (Time.isBloodMoon()) {
		T.poppy_location = "flatApartment";
		T.poppy_location_message = "apartment";
		T.poppy_night_active = 0;
		if (!V.poppyFlat) V.poppyFlat = {};
		if (V.poppyFlat.home !== true) V.poppyFlat.home = true;
		if (V.poppyFlat.room !== "living_room") V.poppyFlat.room = "living_room";
		if (V.poppyFlat.meal !== "") V.poppyFlat.meal = "";
		return T.poppy_location;
	}

	// Poppy birth handoff override: after Poppy gives birth to a PC-linked child,
	// keep her at the orphanage until the handoff scene fires.
	const handoffDay = poppy.pregnancy && poppy.pregnancy.handoffDay;
	const handoffMet = poppy.pregnancy && poppy.pregnancy.handoffMet;
	if (handoffDay !== undefined && !handoffMet && (Time.days === handoffDay || Time.days === handoffDay + 1)) {
		T.poppy_location = "orphanage";
		T.poppy_location_message = "orphanage";
		T.poppy_night_active = 0;
		if (V.poppyFlat) {
			if (V.poppyFlat.home !== false) V.poppyFlat.home = false;
			if (V.poppyFlat.room !== "") V.poppyFlat.room = "";
			if (V.poppyFlat.meal !== "") V.poppyFlat.meal = "";
		}
		return T.poppy_location;
	}

	// Hoist Time.* getters into locals. Each Time.* access walks the
	// DateTime instance and runs a getter; reading once is meaningfully
	// cheaper across a function that branches on the same value many times.
	const mins = Time.minutesSinceMidnight;
	const isWeekend = Time.isWeekEnd();
	const isSchoolDay = Time.schoolDay;
	const weekDay = Time.weekDay;
	const onHoliday = !Time.schoolTerm;
	// weekDay convention from time.js: 1 = Sunday ... 7 = Saturday.
	// Tuesday = 3, Thursday = 5 to matches housekeeping.twee's [3, 5] check.
	const isLessonDay = isSchoolDay && (weekDay === 3 || weekDay === 5);
	// School holiday = any day outside the school term.
	// During holidays Poppy is not running her housekeeping schedule,
	// so route those days through the weekend timetable
	// otherwise the player has no way to bump into her at the lake / cafe / soup kitchen during the weeks-long holiday breaks.
	const useWeekendTimetable = isWeekend || onHoliday;

	let loc = "flatApartment";
	let msg = "apartment";
	let nightActive = 0;

	// ---------- Shared daily timetable (applies every day) ----------
	if ((mins >= 1380 && mins < 1440) || (mins >= 0 && mins < 60)) {
		// 11PM–midnight  and  midnight–1AM: nightly activities (streets / pub)
		loc = "nightly";
		msg = "night";
		nightActive = 1;
	} else if (mins >= 60 && mins < 360) {
		// 1AM–6AM: sleep
		loc = "flatApartment";
		msg = "sleep";
	} else if (mins >= 360 && mins < 420) {
		// 6AM–7AM: breakfast (both weekday and weekend)
		loc = "flatKitchen";
		msg = "breakfast";
	} else if (mins >= 1080 && mins < 1260) {
		// 6PM–9PM: charity / soup kitchen (both weekday and weekend)
		if (Time.month === 2 && Time.monthDay === 14 && (V.valentines_poppy_flat_accept || V.valentines_poppy_flat_done)) {
			// Stay home to prepare for, attend, or wind down from the accepted date.
			loc = "flatKitchen";
			msg = "dinner";
		} else if (Time.month === 2 && Time.monthDay === 14 && V.valentines_poppy_flat_decline) {
			// The declined-date follow-up is encountered on Barb Street.
			loc = "barbStreet";
			msg = "dinner";
		} else {
			loc = "soupKitchen";
			msg = "charity";
		}
	} else if (mins >= 1260 && mins < 1320) {
		// 9PM–10PM: dinner (both weekday and weekend)
		if (Time.month === 2 && Time.monthDay === 14 && (V.valentines_poppy_flat_accept || V.valentines_poppy_flat_done)) {
			// An accepted Valentine date replaces Poppy's normal late dinner.
			loc = "flatApartment";
			msg = "sleep";
		} else {
			loc = "flatKitchen";
			msg = "dinner";
		}
	}
	// ---------- School-day timetable ----------
	else if (isSchoolDay) {
		if ((mins >= 420 && mins < 540) || (mins >= 720 && mins < 780) || (mins >= 900 && mins < 960)) {
			// 7–9AM, 12–1PM, 3–4PM: prep in housekeeping classroom
			loc = "housekeepingClassroom";
			msg = "prep";
		} else if (isLessonDay && mins >= 600 && mins < 660) {
			// 10–11AM on Tue/Thu: housekeeping lesson
			loc = "housekeepingLesson";
			msg = "lesson";
		} else if (mins >= 540 && mins < 900) {
			// 9AM–3PM (gaps not covered by prep/lesson): skipping / hallways
			loc = "schoolHallways";
			msg = "skipping";
		}
		// 4PM–6PM on school days: no explicit slot → stays at flatApartment (home after prep)
	}
	// ---------- Weekend / school-holiday timetable ----------
	// Same slots whether it's a normal weekend day or a weekday during a school holiday
	// Poppy isn't at school either way, so their routine is the same.
	else if (useWeekendTimetable) {
		if (mins >= 420 && mins < 540 && (V.daily.poppy.baileyVisitDuration ??= random(25, 60)) > mins - 420) {
			// From 7AM: visit Bailey's office for a daily-randomised 25–60 minutes.
			loc = "baileyOffice";
			msg = "bailey";
		} else if (mins >= 540 && mins < 720) {
			// 9AM–12PM: nature time at the lake, unless weather cancels it
			const precip = Weather.precipitation;
			if (precip === "rain" || precip === "snow") {
				loc = "flatApartment";
				msg = "lounging";
			} else {
				loc = "lake";
				msg = "lake";
			}
		} else if (mins >= 780 && mins < 900) {
			// 1–3PM: tea time at the café
			loc = "cafe";
			msg = "tea";
		} else if (mins >= 960 && mins < 1020) {
			// 4–5PM: lounging at home
			loc = "flatApartment";
			msg = "lounging";
		}
		// 12–1PM, 3–4PM, 5–6PM gaps: no explicit slot → flatApartment (transitioning/resting)
	}

	// ---------- Low patience restriction ----------
	// If patience is low, Poppy only appears at locations where she can ignore the PC or stay at home behind a locked door
	if (T.poppyStatus?.includes("LowPatience")) {
		// Inline the allow-list as a switch to avoids constructing an array and an indexOf call on every schedule pass.
		switch (loc) {
			case "lake":
			case "housekeepingClassroom":
			case "housekeepingLesson":
			case "schoolHallways":
			case "flatApartment":
			case "flatKitchen":
				break;
			case "barbStreet":
				if (V.valentines_poppy_flat_decline) break;
				return clearSchedule();
			default:
				return clearSchedule();
		}
	}

	// ---------- Commit location to temp vars ----------
	T.poppy_location = loc;
	T.poppy_location_message = msg;
	T.poppy_night_active = nightActive;

	// ---------- Update flat presence state ----------
	// These drive $poppyFlat.home / .room / .meal checks in the flat passages.
	if (!V.poppyFlat) V.poppyFlat = {};
	const atFlat = loc === "flatApartment" || loc === "flatKitchen";
	const room = atFlat ? (loc === "flatKitchen" ? "kitchen" : msg === "sleep" ? "bedroom" : "living_room") : "";
	const meal = msg === "breakfast" ? "breakfast" : msg === "dinner" ? "dinner" : "";
	if (V.poppyFlat.home !== atFlat) V.poppyFlat.home = atFlat;
	if (V.poppyFlat.room !== room) V.poppyFlat.room = room;
	// Only set meal during actual cooking windows; empty string = no meal happening.
	if (V.poppyFlat.meal !== meal) V.poppyFlat.meal = meal;

	return T.poppy_location;
}
window.poppySchedule = poppySchedule;
DefineMacro("poppySchedule", poppySchedule);

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

		if (!V.poppyDrug || typeof V.poppyDrug !== "object" || Array.isArray(V.poppyDrug)) V.poppyDrug = {};
		const data = V.poppyDrug;

		if (typeof data.addiction !== "number" || Number.isNaN(data.addiction)) data.addiction = Number(V.opium_addiction) || 0;
		if (typeof data.timer !== "number" || Number.isNaN(data.timer)) data.timer = Number(V.opium_timer) || 0;
		if (typeof data.knowledge !== "number" || Number.isNaN(data.knowledge)) data.knowledge = Number(V.opium_knowledge) || 0;
		if (typeof data.withdrawalStage !== "number" || Number.isNaN(data.withdrawalStage)) data.withdrawalStage = 0;
		if (typeof data.pendingMessage !== "string") data.pendingMessage = "";
		if (typeof data.pendingPavlov !== "boolean") data.pendingPavlov = false;
		if (typeof data.insomniaSuppress !== "boolean") data.insomniaSuppress = false;

		// Mirror writes only when the value actually differs — avoids writing
		// the same property back to the state proxy every call.
		if (V.opium_addiction !== data.addiction) V.opium_addiction = data.addiction;
		if (V.opium_timer !== data.timer) V.opium_timer = data.timer;
		if (V.opium_knowledge !== data.knowledge) V.opium_knowledge = data.knowledge;

		return data;
	}

	function syncPoppyTraitMirrors() {
		const data = V.poppyDrug;
		if (!data) return;
		if (V.opium_addiction !== data.addiction) V.opium_addiction = data.addiction;
		if (V.opium_timer !== data.timer) V.opium_timer = data.timer;
		if (V.opium_knowledge !== data.knowledge) V.opium_knowledge = data.knowledge;
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

	function poppyOpiumPulse(forceKnown = null) {
		const data = ensurePoppyTraitData();
		const wasKnown = data.knowledge === 1;

		updateOpiumKnowledge(forceKnown);

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

	window.poppyOpiumPulse = poppyOpiumPulse;
	window.poppyDailyTraits = poppyDailyTraits;
	window.poppyConsumePendingOpiumMessage = consumePendingOpiumMessage;
	window.poppyConsumePendingPavlovMessage = consumePendingPavlovMessage;
	window.poppyGrantPavlovIfNeeded = grantPavlovIfNeeded;
})();

/*
 * ==============================================================
 * Bad end aftermath comfort talk
 * ==============================================================
 * After escaping a soft bad end, the player can talk with Poppy once.
 * This restores her patience to the middle of the scale.
 */
const POPPY_COMFORT_MIN_CAPTIVITY_DAYS = 3;
const POPPY_COMFORT_WINDOW_DAYS = 14;
const POPPY_COMFORT_PATIENCE_FLOOR = 50;

/**
 * Returns the recent bad end the player can talk to Poppy about.
 * Only includes long bad ends that ended recently and have not been discussed yet.
 *
 * @returns {object|undefined} The bad end entry, or undefined if none.
 */
function poppyBadEndComfortAvailable() {
	const poppy = C.npc.Poppy;
	if (!poppy || poppy.init !== 1 || poppyDismissed()) return undefined;
	if (!(typeof V.poppyromance === "number" && V.poppyromance >= 0)) return undefined;
	if (!poppy.timer || typeof poppy.timer !== "object" || Array.isArray(poppy.timer)) return undefined;
	if (!Array.isArray(V.badEndStats) || !V.badEndStats.length) return undefined;
	if (V.replayScene || V.statFreeze) return undefined;

	const badEnd = V.badEndStats.last();
	if (!badEnd || badEnd.source === "Poppy") return undefined;
	if (!Number.isFinite(badEnd.trackedStart) || !Number.isFinite(badEnd.trackedEnd)) return undefined;

	const day = TimeConstants.secondsPerDay;
	// Strictly longer than the minimum: a three day absence is not the crisis this talk is for.
	if (badEnd.trackedEnd - badEnd.trackedStart <= POPPY_COMFORT_MIN_CAPTIVITY_DAYS * day) return undefined;
	if (Time.date.timeStamp - badEnd.trackedEnd > POPPY_COMFORT_WINDOW_DAYS * day) return undefined;

	// One talk per bad end: the stamp is the trackedEnd of the bad end already discussed.
	if (Number(poppy.timer.lastBadEndComfort) === badEnd.trackedEnd) return undefined;

	return badEnd;
}
window.poppyBadEndComfortAvailable = poppyBadEndComfortAvailable;

/**
 * Handles the comfort talk and restores low patience.
 *
 * @returns {boolean} true if the talk happened.
 */
function poppyBadEndComfortResolve() {
	const badEnd = poppyBadEndComfortAvailable();
	if (!badEnd) return false;

	const poppy = C.npc.Poppy;
	poppy.timer.lastBadEndComfort = badEnd.trackedEnd;

	const patience = Number(poppy.patience) || 0;
	if (patience < POPPY_COMFORT_PATIENCE_FLOOR) {
		poppy.patience = POPPY_COMFORT_PATIENCE_FLOOR;
		poppy.anger = 0;
	}

	markPoppyInteraction(poppy);
	poppyStatusCheck(poppy);
	return true;
}
window.poppyBadEndComfortResolve = poppyBadEndComfortResolve;

/**
 * Returns how many whole days the player was gone.
 *
 * @param {object} badEnd The bad end data.
 * @returns {number} Whole days of captivity.
 */
function poppyBadEndComfortDays(badEnd) {
	if (!badEnd || !Number.isFinite(badEnd.trackedStart) || !Number.isFinite(badEnd.trackedEnd)) return 1;
	const days = Math.floor((badEnd.trackedEnd - badEnd.trackedStart) / TimeConstants.secondsPerDay);
	return days < 1 ? 1 : days;
}
window.poppyBadEndComfortDays = poppyBadEndComfortDays;
