/* School discipline escalation (DoLX).
 *
 * Vanilla tracks $delinquency 0-1000 but almost nothing reads it, so a delinquent PC pays no
 * price beyond the occasional detention. This layers three escalating consequences on top of the
 * existing $delinquency / $detention pair without replacing either:
 *
 *   tier 1 (late slip)   repeat offenders must collect a slip from Leighton's office before a
 *                        teacher will let them into a lesson they are late for.
 *   tier 2 (duty)        Leighton starts assigning cleaning duty instead of note-running.
 *   tier 3 (suspension)  barred from lessons for a few school days, but required to report for
 *                        community service each of those days. Skipping it extends the sentence.
 *
 * State lives in V.schoolDiscipline:
 *   suspended        0|1, currently serving a suspension
 *   daysLeft         school days of suspension still to serve
 *   serviceDone      community service sessions completed this suspension
 *   serviceRequired  sessions needed before readmission
 *   serviceMissed    school days of the suspension spent without reporting
 *   servedToday      0|1, completed a service session today
 *   leftToday        0|1, walked out on today's session — blocks re-reporting until tomorrow
 *   suspensions      lifetime count, used for flavour and for the final-warning scene
 *   cooldown         days before another suspension can be triggered
 *   absconded        1 when the player walked off a service session; becomes a "ran" notice the next day
 *   warned           0|1, Leighton has already given the final warning this suspension
 *   notice           "" | "warn" | "ran", a scene the school owes the player
 */

setup.schoolDiscipline = {
	/* $delinquency thresholds. */
	slipThreshold: 300,
	dutyThreshold: 500,
	suspendThreshold: 800,
	/* Length of a first suspension, in school days. Repeat suspensions add a day each, to a cap. */
	baseDays: 3,
	maxDays: 6,
	/* Days after a readmission before another suspension can trigger. */
	cooldown: 14,
	/* $delinquency removed per community service session, and the level the PC is readmitted at. */
	servicePayoff: 60,
	readmitLevel: 400,
};

function ensureSchoolDiscipline() {
	if (!V.schoolDiscipline || typeof V.schoolDiscipline !== "object") V.schoolDiscipline = {};
	const d = V.schoolDiscipline;
	if (d.suspended !== 1) d.suspended = 0;
	if (!Number.isFinite(d.daysLeft)) d.daysLeft = 0;
	if (!Number.isFinite(d.serviceDone)) d.serviceDone = 0;
	if (!Number.isFinite(d.serviceRequired)) d.serviceRequired = 0;
	if (!Number.isFinite(d.serviceMissed)) d.serviceMissed = 0;
	if (d.servedToday !== 1) d.servedToday = 0;
	if (d.leftToday !== 1) d.leftToday = 0;
	if (d.absconded !== 1) d.absconded = 0;
	if (d.warned !== 1) d.warned = 0;
	if (!Number.isFinite(d.suspensions)) d.suspensions = 0;
	if (!Number.isFinite(d.cooldown)) d.cooldown = 0;
	if (typeof d.notice !== "string") d.notice = "";
	d.daysLeft = Math.max(Math.trunc(d.daysLeft), 0);
	d.cooldown = Math.max(Math.trunc(d.cooldown), 0);
	return d;
}
window.ensureSchoolDiscipline = ensureSchoolDiscipline;

/* True while the PC is barred from lessons. */
function schoolSuspended() {
	return ensureSchoolDiscipline().suspended === 1;
}
window.schoolSuspended = schoolSuspended;

/* A repeat offender has to be signed in by the head before a teacher will admit them late. */
function schoolLateSlipRequired() {
	if (V.delinquency < setup.schoolDiscipline.slipThreshold) return false;
	/* Only once the PC has actually been late twice already this week, not on delinquency alone. */
	if ((V.weekly?.schoolLates || 0) < 2) return false;
	if (V.daily?.school?.lateSlip) return false;
	/* Leighton has to be at the school to sign anything. */
	if (V.pillory?.tenant?.special?.name === "Leighton") return false;
	if (C.npc.Leighton.init !== 1) return false;
	return true;
}
window.schoolLateSlipRequired = schoolLateSlipRequired;

/* Detention turns into manual labour once the PC is a known troublemaker. */
function schoolDutyEligible() {
	return V.delinquency >= setup.schoolDiscipline.dutyThreshold;
}
window.schoolDutyEligible = schoolDutyEligible;

/* Whether the school is about to hand down a suspension. Checked when the PC arrives at school. */
function schoolSuspensionDue() {
	const d = ensureSchoolDiscipline();
	if (d.suspended === 1 || d.cooldown > 0) return false;
	if (V.delinquency < setup.schoolDiscipline.suspendThreshold) return false;
	if (C.npc.Leighton.init !== 1) return false;
	if (V.pillory?.tenant?.special?.name === "Leighton") return false;
	return true;
}
window.schoolSuspensionDue = schoolSuspensionDue;

function schoolSuspensionBegin() {
	const d = ensureSchoolDiscipline();
	d.suspensions++;
	d.suspended = 1;
	d.daysLeft = Math.min(setup.schoolDiscipline.baseDays + d.suspensions - 1, setup.schoolDiscipline.maxDays);
	d.serviceRequired = d.daysLeft;
	d.serviceDone = 0;
	d.serviceMissed = 0;
	d.servedToday = 0;
	d.leftToday = 0;
	d.absconded = 0;
	d.warned = 0;
	d.notice = "";
	return d;
}
window.schoolSuspensionBegin = schoolSuspensionBegin;

/* If the player leaves a work session, the school is notified the next day.
Either way the day's muster is over — you can't walk off and then queue up again an hour later. */
function schoolServiceAbscond() {
	const d = ensureSchoolDiscipline();
	d.absconded = 1;
	d.servedToday = 0;
	d.leftToday = 1;
	return d;
}
window.schoolServiceAbscond = schoolServiceAbscond;

/* Slipping away unnoticed still costs the session, but nothing is written down. */
function schoolServiceSlipAway() {
	const d = ensureSchoolDiscipline();
	d.servedToday = 0;
	d.leftToday = 1;
	return d;
}
window.schoolServiceSlipAway = schoolServiceSlipAway;

/* The extra session Leighton adds the morning after a walk-off, under the same cap the daily
miss uses so the sentence stays finishable. Returns the sessions still owed. */
function schoolServiceAbscondPenalty() {
	const d = ensureSchoolDiscipline();
	if (d.serviceRequired < setup.schoolDiscipline.maxDays + 3) d.serviceRequired++;
	return Math.max(d.serviceRequired - d.serviceDone, 0);
}
window.schoolServiceAbscondPenalty = schoolServiceAbscondPenalty;

/* Community service has one nine-o'clock muster on each school day, and can only be completed once a day. */
function schoolServiceAvailable() {
	const d = ensureSchoolDiscipline();
	if (d.suspended !== 1 || d.servedToday === 1 || d.leftToday === 1) return false;
	if (!Time.schoolDay) return false;
	if (d.serviceDone >= d.serviceRequired) return false;
	return Time.hour === 9;
}
window.schoolServiceAvailable = schoolServiceAvailable;

/* Record one completed session. Returns true if that was the last one owed. */
function schoolServiceComplete() {
	const d = ensureSchoolDiscipline();
	if (d.servedToday === 1 || d.serviceDone >= d.serviceRequired) return d.serviceDone >= d.serviceRequired;
	d.servedToday = 1;
	d.serviceDone++;
	statChange.delinquency(-setup.schoolDiscipline.servicePayoff / 4);
	return d.serviceDone >= d.serviceRequired;
}
window.schoolServiceComplete = schoolServiceComplete;

/* Readmission: the sentence is over and every session was served. */
function schoolReadmissionDue() {
	const d = ensureSchoolDiscipline();
	return d.suspended === 1 && d.daysLeft <= 0 && d.serviceDone >= d.serviceRequired;
}
window.schoolReadmissionDue = schoolReadmissionDue;

function schoolReadmit() {
	const d = ensureSchoolDiscipline();
	d.suspended = 0;
	d.daysLeft = 0;
	d.serviceDone = 0;
	d.serviceRequired = 0;
	d.serviceMissed = 0;
	d.servedToday = 0;
	d.leftToday = 0;
	d.absconded = 0;
	d.warned = 0;
	d.cooldown = setup.schoolDiscipline.cooldown;
	d.notice = "";
	V.delinquency = Math.min(V.delinquency, setup.schoolDiscipline.readmitLevel);
	return d;
}
window.schoolReadmit = schoolReadmit;

/* Daily suspension update. Reduces the sentence, checks missed community service,
and removes truancy penalties for days the PC could not attend school. */
function schoolDisciplineDayPassed() {
	const d = ensureSchoolDiscipline();
	if (d.cooldown > 0) d.cooldown--;
	const servedYesterday = d.servedToday === 1;
	d.servedToday = 0;
	d.leftToday = 0;
	if (d.suspended !== 1) {
		d.absconded = 0;
		return;
	}
	/* Walking off a session is reported to the school overnight, so the reckoning is the next day. */
	if (d.absconded === 1) {
		d.absconded = 0;
		d.notice = "ran";
	}
	if (!Time.isSchoolDay(Time.yesterday)) return;

	/* Missing community service counts as truancy. Attended service was already excluded by dailySchoolEffects(). */
	if (!servedYesterday && d.serviceDone < d.serviceRequired) {
		/* Skipping service lowers goodwill and adds another session.
		The added sessions are capped so the sentence can still be completed. */
		d.serviceMissed++;
		if (d.serviceRequired < setup.schoolDiscipline.maxDays + 3) d.serviceRequired++;
		statChange.delinquency(20 / 4);
	}
	/* Leighton's final warning, once per suspension. It waits for a morning when notice is free:
	an abscond report already sitting there would otherwise swallow it for good. */
	if (d.warned !== 1 && d.serviceMissed >= 3 && d.serviceDone < d.serviceRequired && d.notice === "") {
		d.notice = "warn";
		d.warned = 1;
	}
	if (d.daysLeft > 0) d.daysLeft--;
}
window.schoolDisciplineDayPassed = schoolDisciplineDayPassed;
