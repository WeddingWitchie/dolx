/* globals ensureRobinStand, fameTotal */
/* Naked advertising for Robin's stand (DoLX).
 *
 * Nude advertising replaces the sign/tray round. Longer runs increase both payout and risk.
 * Earnings go to $robinmoney (£).
 * V.robinNudeAd: venue, rounds, earned
 * V.robinStand.nudeRounds: lifetime completed rounds
 */

setup.robinStandNude = {
	/* Naked advertising pulls this many times the crowd a sign does. */
	multiplier: 3,
	/* Each completed round adds this much again, as the crowd gathers. */
	crowdGrowth: 0.3,
	/* Cap on that growth, reached after six rounds. */
	crowdGrowthMax: 1.2,
	/* Lifetime rounds needed for the full reputation bonus, and the size of that bonus. */
	reputationRounds: 50,
	reputationBonus: 0.25,
	/* Hard ceilings, so a beautiful famous player can't turn a weekend into a fortune. */
	roundCap: 120,
	runCap: 400,
	/* Chance of the round going wrong, as a percentage, rising with each round already done. */
	riskBase: 10,
	riskPerRound: 12,
	/* Rounds completed before a groper becomes a possible outcome instead of only an official warning. */
	roundsBeforeMolestation: 3,
};

function ensureRobinNudeAd() {
	if (!V.robinNudeAd || typeof V.robinNudeAd !== "object" || Array.isArray(V.robinNudeAd)) {
		V.robinNudeAd = { venue: "beach", rounds: 0, earned: 0 };
	}
	const run = V.robinNudeAd;
	if (run.venue !== "park") run.venue = "beach";
	if (!Number.isFinite(run.rounds) || run.rounds < 0) run.rounds = 0;
	if (!Number.isFinite(run.earned) || run.earned < 0) run.earned = 0;
	return run;
}
window.ensureRobinNudeAd = ensureRobinNudeAd;

/**
 * Whether the player is willing to advertise the stand naked.
 * Requires exhibitionism 5 and enough nerve to flirt with strangers.
 *
 * @returns {boolean} True if the option should be offered.
 */
function robinStandNudeEligible() {
	if (!hasSexStat("exhibitionism", 5) || !hasSexStat("promiscuity", 2)) return false;
	if (pcAreArmsBound("any")) return false;
	return true;
}
window.robinStandNudeEligible = robinStandNudeEligible;

/**
 * Starts a run, forgetting any stale one.
 *
 * @param {string} venue "beach" or "park".
 */
function robinStandNudeStart(venue) {
	V.robinNudeAd = { venue: venue === "park" ? "park" : "beach", rounds: 0, earned: 0 };
}
window.robinStandNudeStart = robinStandNudeStart;

/**
 * The draw the player's looks and name have on a crowd. The stand's ordinary advertising uses the same figure.
 *
 * @returns {number} A multiplier, 1 at its lowest.
 */
function robinStandCrowdPull() {
	return 1 + V.beauty / 5000 + fameTotal() / 2000;
}
window.robinStandCrowdPull = robinStandCrowdPull;

/**
 * What the next naked round is worth, in £.
 *
 * @returns {number} Whole pounds, never more than the round cap or what is left under the run cap.
 */
function robinStandNudeRoundIncome() {
	const rules = setup.robinStandNude;
	const stand = ensureRobinStand();
	const run = ensureRobinNudeAd();

	let income = 5 * robinStandCrowdPull() * rules.multiplier;
	/* The crowd builds while the player keeps going. */
	income *= 1 + Math.min(run.rounds * rules.crowdGrowth, rules.crowdGrowthMax);
	/* A stand already known for this draws people who came looking. */
	const lifetime = Number.isFinite(stand.nudeRounds) ? stand.nudeRounds : 0;
	income *= 1 + (Math.min(lifetime, rules.reputationRounds) / rules.reputationRounds) * rules.reputationBonus;
	/* A bigger stand can actually serve the queue the player brings it. */
	income *= 1 + (stand.tier - 1) * 0.15;

	income = Math.min(Math.round(income), rules.roundCap);
	return Math.max(Math.min(income, rules.runCap - run.earned), 0);
}
window.robinStandNudeRoundIncome = robinStandNudeRoundIncome;

/**
 * Whether another round is worth running, or the crowd has been wrung dry.
 *
 * @returns {boolean} True if the player can keep going.
 */
function robinStandNudeCanContinue() {
	return ensureRobinNudeAd().earned < setup.robinStandNude.runCap;
}
window.robinStandNudeCanContinue = robinStandNudeCanContinue;

/**
 * Banks a completed round.
 *
 * @returns {number} The £ earned by that round.
 */
function robinStandNudeRound() {
	const stand = ensureRobinStand();
	const run = ensureRobinNudeAd();
	const income = robinStandNudeRoundIncome();

	run.rounds++;
	run.earned += income;
	V.robinmoney += income;
	stand.nudeRounds = (Number.isFinite(stand.nudeRounds) ? stand.nudeRounds : 0) + 1;
	return income;
}
window.robinStandNudeRound = robinStandNudeRound;

/**
 * Chance of the round in progress drawing the wrong kind of attention.
 *
 * @returns {number} A percentage.
 */
function robinStandNudeRisk() {
	const rules = setup.robinStandNude;
	return Math.min(rules.riskBase + ensureRobinNudeAd().rounds * rules.riskPerRound, 90);
}
window.robinStandNudeRisk = robinStandNudeRisk;

/**
 * Rolls for how the round in progress goes.
 *
 * @returns {string} "safe", "caught" for an official moving the player on, or "molested".
 */
function robinStandNudeOutcome() {
	if (random(1, 100) > robinStandNudeRisk()) return "safe";
	const run = ensureRobinNudeAd();
	if (run.rounds >= setup.robinStandNude.roundsBeforeMolestation && random(1, 100) <= 60) return "molested";
	return "caught";
}
window.robinStandNudeOutcome = robinStandNudeOutcome;
