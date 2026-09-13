/* globals foodBatchReconcile foodIsDish foodShelfLife pocketCheckSpoilage foodBatchCount foodBatchExpiryDay pocketFoodList pocketSyncBag */
/* Contents belong to the installed appliance, outside the kitchen and pocket stock.
 * Batch ages are frozen on deposit and restored on withdrawal. */
function refrigeneratorTransfer(location, key, takeOut, all = false) {
	const fridge = V.furniture?.[location]?.refrigenerator;
	if (!fridge) return;
	if (!takeOut) pocketCheckSpoilage();
	const keys = key == null ? (takeOut ? Object.keys(fridge.contents || {}).filter(foodIsDish) : pocketFoodList()) : [key].filter(foodIsDish);
	for (const key of keys) {
		if (!fridge.contents) fridge.contents = {};
		const contents = fridge.contents;
		if (takeOut) {
			const stored = contents[key];
			if (!stored?.length) continue;
			stored.sort((a, b) => b.age - a.age);
			/* Reconcile before adding stock, so thawed food is not duplicated as fresh. */
			const batches = foodBatchReconcile(key);
			let remaining = all ? stored.reduce((sum, batch) => sum + batch.n, 0) : 1;
			while (remaining > 0 && stored.length) {
				const batch = stored[0];
				const n = Math.min(remaining, batch.n);
				V.foodstuff[key].amount += n;
				const day = Time.days - batch.age;
				const matching = batches.find(other => other.day === day && other.own === batch.own);
				if (matching) matching.n += n;
				else batches.push({ n, day, own: batch.own });
				batch.n -= n;
				remaining -= n;
				if (!batch.n) stored.shift();
			}
			if (!stored.length) delete contents[key];
		} else {
			let remaining = all ? foodBatchCount(key) : Math.min(1, foodBatchCount(key));
			if (remaining <= 0) continue;
			const batches = foodBatchReconcile(key);
			batches.sort((a, b) => foodBatchExpiryDay(key, a) - foodBatchExpiryDay(key, b));
			if (!contents[key]) contents[key] = [];
			while (remaining > 0) {
				const batch = batches[0];
				const n = Math.min(remaining, batch.n);
				const age = Time.days - batch.day;
				const matching = contents[key].find(other => other.age === age && other.own === batch.own);
				if (matching) matching.n += n;
				else contents[key].push({ n, age, own: batch.own });
				V.foodstuff[key].amount -= n;
				batch.n -= n;
				remaining -= n;
				if (!batch.n) batches.shift();
			}
		}
	}
	pocketSyncBag();
}
window.refrigeneratorTransfer = refrigeneratorTransfer;

function refrigeneratorTransferAll(location, takeOut) {
	refrigeneratorTransfer(location, null, takeOut, true);
}
window.refrigeneratorTransferAll = refrigeneratorTransferAll;

/* Cooked food held outside the normal food inventory, for the Journal. */
function refrigeneratorFoodList() {
	const keys = [];
	["bedroom", "cottage", "avery_mansion"].forEach(location => {
		const contents = V.furniture?.[location]?.refrigenerator?.contents;
		if (!contents || typeof contents !== "object") return;
		Object.keys(contents).forEach(key => {
			if (foodIsDish(key) && Array.isArray(contents[key]) && contents[key].some(batch => Number(batch?.n) > 0)) keys.pushUnique(key);
		});
	});
	return keys;
}
window.refrigeneratorFoodList = refrigeneratorFoodList;

function refrigeneratorFoodRows(key) {
	if (!foodIsDish(key)) return [];
	const rows = [];
	[
		["bedroom", "Orphanage"],
		["cottage", "Farm cottage"],
		["avery_mansion", "Avery's mansion"],
	].forEach(([location, label]) => {
		const batches = V.furniture?.[location]?.refrigenerator?.contents?.[key];
		if (!Array.isArray(batches)) return;
		const grouped = new Map();
		batches.forEach(batch => {
			const amount = Number(batch?.n) || 0;
			if (amount <= 0) return;
			const age = Number(batch.age) || 0;
			const daysLeft = foodShelfLife(key) - age;
			grouped.set(daysLeft, (grouped.get(daysLeft) || 0) + amount);
		});
		grouped.forEach((amount, daysLeft) => rows.push({ amount, daysLeft, location: label }));
	});
	return rows.sort((a, b) => a.daysLeft - b.daysLeft);
}
window.refrigeneratorFoodRows = refrigeneratorFoodRows;

function refrigeneratorDayPassed(days = 1) {
	const fridge = V.furniture?.bedroom?.refrigenerator;
	if (!fridge) return;
	if (!fridge.contents) fridge.contents = {};
	if (!fridge.notes) fridge.notes = [];
	for (let day = 0; day < days; day++) {
		const keys = Object.keys(fridge.contents).filter(key => foodIsDish(key) && fridge.contents[key].length);
		if (keys.length && random(1, 100) <= 20) {
			const key = keys[random(0, keys.length - 1)];
			const batch = fridge.contents[key][0];
			batch.n--;
			if (!batch.n) fridge.contents[key].shift();
			if (!fridge.contents[key].length) delete fridge.contents[key];
			fridge.notes.push({ type: "taken", key });
			if (fridge.notes.length > 8) fridge.notes.shift();
		}
		if (random(1, 100) <= 15) {
			const key = "bread";
			if (!fridge.contents[key]) fridge.contents[key] = [];
			const matching = fridge.contents[key].find(batch => batch.age === 0 && !batch.own);
			if (matching) matching.n++;
			else fridge.contents[key].push({ n: 1, age: 0, own: false });
			fridge.notes.push({ type: "stored", key });
			if (fridge.notes.length > 8) fridge.notes.shift();
		}
	}
}
window.refrigeneratorDayPassed = refrigeneratorDayPassed;
