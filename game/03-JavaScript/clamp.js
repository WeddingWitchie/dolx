function clampAlexRelations() {
	const alex = C.npc.Alex;
	alex.love = Math.clamp(alex.love, -50, 100);
	alex.dom = Math.clamp(alex.dom, -50, 100);
	alex.lust = Math.clamp(alex.lust, 0, 100);
	alex.trust = Math.clamp(alex.trust, -100, 300);
}

Macro.add("alexclamp", {
	handler: clampAlexRelations,
});

/*
 * Caps a stat based on its AMCTraits "Tempered" talent without removing progress already earned.
 *
 * If the stat is already above the current talent cap, keep its existing value but prevent it
 * from increasing further. The absolute maximum is always base * 2.
 *
 * Pass the value from before a gain as `previous` so a large gain cannot skip past the cap.
 *
 * @param {number} value value to cap
 * @param {number} base normal cap, e.g. 1000
 * @param {number} multiplier talent multiplier: 1 normal, 2 tempered
 * @param {number} [previous] value before the gain
 * @returns {number} capped value
 */
function amcClamp(value, base, multiplier, previous = value) {
	const val = Number(value);
	if (!Number.isFinite(val)) return 0;
	const baseCap = Number(base);
	/* A missing cap is a bug elsewhere; leave the stat alone rather than poisoning it with NaN. */
	if (!Number.isFinite(baseCap) || baseCap <= 0) return Math.max(val, 0);
	const mult = Number(multiplier);
	const cap = baseCap * (Number.isFinite(mult) && mult > 0 ? mult : 1);
	const prev = Number.isFinite(Number(previous)) ? Number(previous) : val;
	return Math.clamp(val, 0, prev > cap ? Math.min(prev, baseCap * 2) : cap);
}
window.amcClamp = amcClamp;

/*
 * Keep the display and cheat slider high enough for stats already above their talent cap,
 * so adjusting the slider does not lower them.
 */
function amcDisplayCap(value, base, multiplier) {
	const val = Number(value);
	const cap = Number(base) * (Number(multiplier) > 0 ? Number(multiplier) : 1);
	if (!Number.isFinite(cap)) return Number.isFinite(val) ? val : 0;
	return Number.isFinite(val) ? Math.max(cap, val) : cap;
}
window.amcDisplayCap = amcDisplayCap;
