function fameMax(...fameTypes) {
	let result = 0;
	fameTypes.forEach(fameType => result = Math.max(V.fame[fameType], result));
	return result;
}
window.fameMax = fameMax;

function historicFameMax(...fameTypes) {
	if (fameTypes.length <= 0) 
		fameTypes = ["bestiality","sex","prostitution","impreg","exhibitionism","rape","pregnancy"];
	let result = 0;
	fameTypes.forEach(fameType => result = Math.max(V.xchange.blackmail.historicFame[fameType], result));
	return result;
}
window.historicFameMax = historicFameMax;

function penaltyFameSum(...fameTypes) {
	if (fameTypes.length <= 0) 
		fameTypes = ["bestiality","sex","prostitution","impreg","exhibitionism","rape","pregnancy"]; 
	let result = 0;
	fameTypes.forEach(fameType => result += V.xchange.blackmail.penaltyThreat[fameType]);
	return result;
}
window.penaltyFameSum = penaltyFameSum;

function penaltyFameMax(...fameTypes) {
	if (fameTypes.length <= 0) 
		fameTypes = ["bestiality","sex","prostitution","impreg","exhibitionism","rape","pregnancy"]; 
	let result = 0;
	fameTypes.forEach(fameType => result = Math.max(V.xchange.blackmail.penaltyThreat[fameType], result));
	return result;
}
window.penaltyFameMax = penaltyFameMax;

function getStaticQuestData(quest) {
	if (!quest) return undefined;

	const questId = typeof quest === "object" ? quest.id : quest;
	const questIndex = typeof quest === "object" ? quest.index : undefined;
	const questLists = [blackmailQuests.low, blackmailQuests.mid, blackmailQuests.high];

	for (const list of questLists) {
		let match = list.find((template) => template.id === questId);
		if (match) return match;

		if (questIndex !== undefined) {
			match = list.find((template) => template.index === questIndex);
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
	}
	else {
		V.foodstuff.daisy.name ??= daisy.name;
		V.foodstuff.daisy.plural ??= daisy.plural;
		V.foodstuff.daisy.amount = Number(V.foodstuff.daisy.amount) || 0;
	}

	V.foodstuff.daisy.amount += amount;
	V.foodstuff.daisy.marketStall = true;
}
window.blackmailGiveDaisies = blackmailGiveDaisies;
