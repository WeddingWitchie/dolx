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