/* globals blackmailQuests */
function fameMax(...fameTypes) {
	let result = 0;
	for (const fameType of fameTypes) result = Math.max(V.fame[fameType], result);
	return result;
}
window.fameMax = fameMax;

function historicFameMax(...fameTypes) {
	if (fameTypes.length <= 0) fameTypes = ["bestiality", "sex", "prostitution", "impreg", "exhibitionism", "rape", "pregnancy"];
	let result = 0;
	for (const fameType of fameTypes) result = Math.max(V.xchange.blackmail.historicFame[fameType], result);
	return result;
}
window.historicFameMax = historicFameMax;

function penaltyFameSum(...fameTypes) {
	if (fameTypes.length <= 0) fameTypes = ["bestiality", "sex", "prostitution", "impreg", "exhibitionism", "rape", "pregnancy"];
	let result = 0;
	for (const fameType of fameTypes) result += V.xchange.blackmail.penaltyThreat[fameType];
	return result;
}
window.penaltyFameSum = penaltyFameSum;

function penaltyFameMax(...fameTypes) {
	if (fameTypes.length <= 0) fameTypes = ["bestiality", "sex", "prostitution", "impreg", "exhibitionism", "rape", "pregnancy"];
	let result = 0;
	for (const fameType of fameTypes) result = Math.max(V.xchange.blackmail.penaltyThreat[fameType], result);
	return result;
}
window.penaltyFameMax = penaltyFameMax;

function getStaticQuestData(quest) {
	if (!quest) return undefined;

	const questId = typeof quest === "object" ? quest.id : quest;
	const questIndex = typeof quest === "object" ? quest.index : undefined;
	const questLists = [blackmailQuests.low, blackmailQuests.mid, blackmailQuests.high];

	for (const list of questLists) {
		let match = list.find(template => template.id === questId);
		if (match) return match;

		if (questIndex !== undefined) {
			match = list.find(template => template.index === questIndex);
			if (match) return match;
		}
	}
}
window.getStaticQuestData = getStaticQuestData;

function restoreBlackmailQuest(quest) {
	if (!quest || typeof quest !== "object") return quest;

	const template = getStaticQuestData(quest);
	if (!template) return quest;

	const restored = Object.assign(clone(template), quest);
	for (const key of Object.keys(template)) {
		if (typeof template[key] === "function") restored[key] = template[key];
	}
	restored.instructions = clone(template.instructions);
	restored.alertMessage = template.alertMessage;

	if (typeof quest.includesItems !== "boolean") restored.includesItems = template.includesItems;

	// Saves from before pillLanded existed armed the pill-test fail off tookPill alone,
	// so a no-op quest spike (unspikeable player) plus a pre-existing known pill auto-failed the quest.
	// Backfill the flag and, while the quest is still running, clear such phantom fails.
	if ("pillLanded" in template && !("pillLanded" in quest)) {
		restored.pillLanded = !!(restored.tookPill && V.xchange?.pill?.active && !V.xchange?.pill?.effectsKnown);
		const pillFail = restored.pillLanded && V.xchange?.pill?.active && V.xchange?.pill?.effectsKnown;
		if (restored.failed && !V.xchange?.blackmail?.conclusionPending && !restored.failCondition() && !pillFail) {
			restored.failed = false;
		}
	}

	return restored;
}
window.restoreBlackmailQuest = restoreBlackmailQuest;

function restoreActiveBlackmailQuest() {
	const quest = V.xchange?.blackmail?.activeQuest;
	if (!quest || typeof quest !== "object") return;
	// Functions survive in-memory passage transitions; they only vanish on save serialization.
	if (typeof quest.failCheck === "function" && typeof quest.receiveItems === "function") return;
	if (!getStaticQuestData(quest)) {
		// The quest was removed from the game; drop it so method calls don't crash.
		delete V.xchange.blackmail.activeQuest;
		V.xchange.blackmail.conclusionPending = false;
		return;
	}
	V.xchange.blackmail.activeQuest = restoreBlackmailQuest(quest);
}
window.restoreActiveBlackmailQuest = restoreActiveBlackmailQuest;

function blackmailGiveDaisies(amount = 200) {
	const daisy = setup.foodstuff.daisy;
	V.foodstuff ??= {};

	if (V.foodstuff.daisy === undefined || V.foodstuff.daisy === null || typeof V.foodstuff.daisy !== "object") {
		V.foodstuff.daisy = { name: daisy.name, plural: daisy.plural, amount: 0 };
	} else {
		V.foodstuff.daisy.name ??= daisy.name;
		V.foodstuff.daisy.plural ??= daisy.plural;
		V.foodstuff.daisy.amount = Number(V.foodstuff.daisy.amount) || 0;
	}

	V.foodstuff.daisy.amount += amount;
	V.foodstuff.daisy.marketStall = true;
}
window.blackmailGiveDaisies = blackmailGiveDaisies;

function blackmailGrantStall() {
	V.daily ??= {};
	if (V.daily.stallRented === 1) return false;
	V.daily.stallRented = 1;
	V.stall_money = 0;
	if (!V.stall_stats) V.stall_stats = {};
	V.daily.stall_lewdity = 0;
	return true;
}
window.blackmailGrantStall = blackmailGrantStall;

/* Soft bad ends can keep the player away for several days, making the current task impossible to complete.
badEndTracking calls this to cancel the task without penalty.
The club keeps the blackmail material and can send another task after the cooldown. */
function blackmailCancelQuestForBadEnd() {
	const blackmail = V.xchange?.blackmail;
	if (!blackmail || !blackmail.activeQuest) return false;
	// The day's outcome is already locked in and its reward or penalty is waiting on the conclusion letter.
	// Cancelling here would throw that away, and blackmail-daypassed settles it on its own after a week.
	if (blackmail.conclusionPending) return false;

	delete blackmail.activeQuest;
	delete blackmail.conclusionDays;
	delete blackmail.passedOutRecently;
	delete blackmail.hasGenderswappedRecently;
	delete blackmail.gracePeriod;
	delete blackmail.paymentsRemoved;
	blackmail.hasReadLetter = false;
	blackmail.conclusionPending = false;
	blackmail.cooldown = Math.max(Number(blackmail.cooldown) || 0, 3);

	/* Keep the courier, but restart their week-long patience so the next letter isn't already stale on return.
	   A missing courier would leave held material with no way to deliver it, so fall back to the orphanage drop. */
	if (blackmail.hasMaterial) {
		if (blackmail.courier) {
			blackmail.courierReady = 7;
		} else {
			blackmail.courier = "orphanage";
			blackmail.courierAfk = true;
			blackmail.courierReady = 0;
		}
	}

	blackmail.effectmessage = 6;
	return true;
}
window.blackmailCancelQuestForBadEnd = blackmailCancelQuestForBadEnd;
