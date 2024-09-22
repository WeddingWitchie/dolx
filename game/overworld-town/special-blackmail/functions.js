function fameMax(...fameTypes) {
	let result = 0;
	fameTypes.forEach(fameType => result = Math.max(V.fame[fameType], result));
	return result;
}
window.fameMax = fameMax;

function historicFameMax(...fameTypes) {
	let result = 0;
	fameTypes.forEach(fameType => result = Math.max(V.xchange.blackmail.historicFame[fameType], result));
	return result;
}
window.historicFameMax = historicFameMax;

function penaltyFameSum(...fameTypes) {
	let result = 0;
	fameTypes.forEach(fameType => result += V.xchange.blackmail.penaltyThreat[fameType]);
	return result;
}
window.historicFameMax = historicFameMax;

function getStaticQuestData(quest) {
	let match = blackmailQuests.low.find((template) => template.index === quest.index);
	if (match) return match;

	match = blackmailQuests.mid.find((template) => template.index === quest.index);
	if (match) return match;

	match = blackmailQuests.high.find((template) => template.index === quest.index);
	if (match) return match;
}
window.getStaticQuestData = getStaticQuestData;