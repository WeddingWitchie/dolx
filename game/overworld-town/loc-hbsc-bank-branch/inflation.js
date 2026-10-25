/**
 * X-Change "Inflation" economy feature.
 * Premise: once the player is rich the city is far too cheap.
 * This makes wealth have a cost: as the player's net wealth climbs through tiers, market prices (and Bailey's rent) scale up.
 * It is fully dynamic with spend down and prices fall back through the tiers, so getting poor makes things cheap again.
 *
 * "Wealth" = cash on hand + HBSC savings balance + principal in fixed-term deposits + refundable Bailey deposit, MINUS any outstanding HBSC loan principal.
 * So stashing money in the bank (even in a locked fixed term) does NOT dodge inflation, but borrowed "rent money" does NOT inflate prices either
 * (the cash you borrow is cancelled out by the principal you owe).
 * Fixed-term deposits DO count toward wealth/inflation, but they are NOT liquid: while a term is active Bailey cannot reach it for
 * rent (see rentPayable, which uses liquidBankFunds = savings only). When a fixed term matures, its principal+interest is automatically
 * swept into the regular savings balance (see setup.hbsc.processDay), and from then on Bailey can detect and collect it.
 *
 * All money values in this game are stored in PENNIES (the raw $money units), so the tier thresholds below are raw $money values.
 * e.g. 100000 = £1,000 displayed.
 * Tune the live percentages and Bailey pressure from Rebalance Settings; the constants here are current-preset defaults and compatibility fallbacks.
 *
 * Three integration points keep displayed prices and actual charges in sync:
 * - General price hook in `money()` (game/base-system/stat-changes.js): any negative (spend) amount is run through `price()`, except sources in EXCLUDED_SOURCES.
 * - Rent scaling in the `rentmod` widget (game/overworld-town/loc-home/rent.twee).
 * - The `<<printprice base [class]>>` widget (game/base-system/widgets.twee) shows a base price already adjusted for inflation, so blatant "£x" labels can respect it.
 *
 * If what you're looking for isn't here, check those spots too.
 */

(() => {
	"use strict";

	setup.inflation = setup.inflation || {};

	setup.inflation.PRESETS = {
		light: {
			inflationBlackmailRewardPct: 100,
			inflationOnsetPct: 11,
			inflationBadPct: 28,
			inflationCrisisPct: 56,
			inflationExtremePct: 113,
			inflationParodyPct: 450,
			inflationBaileyRentPct: 300,
			inflationBaileyCrisisPct: 400,
			inflationBaileyCrisisTier: "parody",
			inflationBaileyCapLow: 500000,
			inflationBaileyCapHigh: 1000000,
			inflationBaileyDemandJump: 2500000,
			inflationBaileyDemandInvestment: 5000000,
			inflationBaileyStep: 10000,
			inflationLoanRentSurcharge: 50000,
		},
		mid: {
			inflationBlackmailRewardPct: 100,
			inflationOnsetPct: 11,
			inflationBadPct: 30,
			inflationCrisisPct: 56,
			inflationExtremePct: 113,
			inflationParodyPct: 1500,
			inflationBaileyRentPct: 200,
			inflationBaileyCrisisPct: 200,
			inflationBaileyCrisisTier: "extreme",
			inflationBaileyCapLow: 1000000,
			inflationBaileyCapHigh: 2000000,
			inflationBaileyDemandJump: 5000000,
			inflationBaileyDemandInvestment: 12500000,
			inflationBaileyStep: 30000,
			inflationLoanRentSurcharge: 100000,
		},
		current: {
			inflationBlackmailRewardPct: 100,
			inflationOnsetPct: 11,
			inflationBadPct: 35,
			inflationCrisisPct: 75,
			inflationExtremePct: 150,
			inflationParodyPct: 1500,
			inflationBaileyRentPct: 35,
			inflationBaileyCrisisPct: 75,
			inflationBaileyCrisisTier: "crisis",
			inflationBaileyCapLow: 1500000,
			inflationBaileyCapHigh: 3500000,
			inflationBaileyDemandJump: 7500000,
			inflationBaileyDemandInvestment: 25000000,
			inflationBaileyStep: 50000,
			inflationLoanRentSurcharge: 150000,
		},
		hard: {
			inflationBlackmailRewardPct: 75,
			inflationOnsetPct: 20,
			inflationBadPct: 70,
			inflationCrisisPct: 150,
			inflationExtremePct: 300,
			inflationParodyPct: 3000,
			inflationBaileyRentPct: 20,
			inflationBaileyCrisisPct: 50,
			inflationBaileyCrisisTier: "bad",
			inflationBaileyCapLow: 3000000,
			inflationBaileyCapHigh: 7000000,
			inflationBaileyDemandJump: 15000000,
			inflationBaileyDemandInvestment: 50000000,
			inflationBaileyStep: 100000,
			inflationLoanRentSurcharge: 300000,
		},
		harsher: {
			inflationBlackmailRewardPct: 50,
			inflationOnsetPct: 30,
			inflationBadPct: 100,
			inflationCrisisPct: 200,
			inflationExtremePct: 400,
			inflationParodyPct: 3000,
			inflationBaileyRentPct: 3,
			inflationBaileyCrisisPct: 3,
			inflationBaileyCrisisTier: "onset",
			inflationBaileyCapLow: 5000000,
			inflationBaileyCapHigh: 10000000,
			inflationBaileyDemandJump: 25000000,
			inflationBaileyDemandInvestment: 100000000,
			inflationBaileyStep: 200000,
			inflationLoanRentSurcharge: 300000,
		},
	};

	setup.inflation.SETTING_RANGES = {
		inflationBlackmailRewardPct: { min: 0, max: 100, step: 5 },
		inflationOnsetPct: { min: 11, max: 30, step: 1 },
		inflationBadPct: { min: 28, max: 100, step: 1 },
		inflationCrisisPct: { min: 56, max: 200, step: 1 },
		inflationExtremePct: { min: 113, max: 400, step: 5 },
		inflationParodyPct: { min: 450, max: 3000, step: 50 },
		inflationBaileyRentPct: { min: 3, max: 300, step: 1 },
		inflationBaileyCrisisPct: { min: 3, max: 400, step: 1 },
		inflationBaileyCapLow: { min: 500000, max: 5000000, step: 50000 },
		inflationBaileyCapHigh: { min: 1000000, max: 10000000, step: 50000 },
		inflationBaileyDemandJump: { min: 2500000, max: 25000000, step: 50000 },
		inflationBaileyDemandInvestment: { min: 5000000, max: 100000000, step: 50000 },
		inflationBaileyStep: { min: 10000, max: 200000, step: 10000 },
		inflationLoanRentSurcharge: { min: 50000, max: 300000, step: 5000 },
	};

	setup.inflation.settingDefault = function (key) {
		return setup.inflation.PRESETS.current[key];
	};

	setup.inflation.BAILEY_CRISIS_TIER_IDS = ["onset", "bad", "crisis", "extreme", "parody"];

	setup.inflation.clampSetting = function (key, value) {
		const spec = setup.inflation.SETTING_RANGES[key];
		const fallback = setup.inflation.settingDefault(key);
		if (!spec) return fallback;
		let result = Number(value);
		if (!Number.isFinite(result)) result = fallback;
		result = Math.min(Math.max(result, spec.min), spec.max);
		if (spec.step > 0) result = Math.round(result / spec.step) * spec.step;
		return Math.min(Math.max(result, spec.min), spec.max);
	};

	setup.inflation.normalizeBaileyCrisisTier = function (tier) {
		return setup.inflation.BAILEY_CRISIS_TIER_IDS.includes(tier) ? tier : setup.inflation.settingDefault("inflationBaileyCrisisTier");
	};

	setup.inflation.baileyCrisisTierFromPct = function (pct) {
		pct = Number(pct);
		if (!Number.isFinite(pct)) return setup.inflation.settingDefault("inflationBaileyCrisisTier");
		if (pct <= setup.inflation.settingDefault("inflationOnsetPct")) return "onset";
		if (pct <= setup.inflation.settingDefault("inflationBadPct")) return "bad";
		if (pct <= setup.inflation.settingDefault("inflationCrisisPct")) return "crisis";
		if (pct <= setup.inflation.settingDefault("inflationExtremePct")) return "extreme";
		return "parody";
	};

	setup.inflation.ensureSettings = function () {
		if (typeof V === "undefined") return;
		if (!V.settings || typeof V.settings !== "object") V.settings = {};
		V.settings.inflationEnabled = true;
		/* Opt-in "relentless Bailey" toggle. Off by default; presets never touch it. */
		if (typeof V.settings.inflationBaileyRelentless !== "boolean") V.settings.inflationBaileyRelentless = false;
		for (const key of Object.keys(setup.inflation.SETTING_RANGES)) {
			if (V.settings[key] === undefined) V.settings[key] = setup.inflation.settingDefault(key);
			else V.settings[key] = setup.inflation.clampSetting(key, V.settings[key]);
		}
		if (!setup.inflation.BAILEY_CRISIS_TIER_IDS.includes(V.settings.inflationBaileyCrisisTier)) {
			V.settings.inflationBaileyCrisisTier = setup.inflation.baileyCrisisTierFromPct(V.settings.inflationBaileyCrisisPct);
		}
		V.settings.inflationBaileyCrisisPct = setup.inflation.baileyCrisisTierPercent();
	};

	setup.inflation.applyPreset = function (preset) {
		if (typeof V === "undefined") return;
		if (!V.settings || typeof V.settings !== "object") V.settings = {};
		const values = setup.inflation.PRESETS[preset] || setup.inflation.PRESETS.current;
		for (const [key, value] of Object.entries(values)) {
			if (key === "inflationBaileyCrisisTier") V.settings[key] = setup.inflation.normalizeBaileyCrisisTier(value);
			else V.settings[key] = setup.inflation.clampSetting(key, value);
		}
		V.settings.inflationBaileyCrisisPct = setup.inflation.baileyCrisisTierPercent();
	};

	setup.inflation.setting = function (key) {
		if (key === "inflationBaileyCrisisTier") {
			if (typeof V === "undefined" || !V.settings) return setup.inflation.settingDefault(key);
			return setup.inflation.normalizeBaileyCrisisTier(V.settings[key]);
		}
		if (typeof V === "undefined" || !V.settings) return setup.inflation.settingDefault(key);
		return setup.inflation.clampSetting(key, V.settings[key]);
	};

	/* Tiered inflation current-preset defaults.
	Each tier: the minimum net wealth (in pennies) to enter it, and the price increase as a percentage.
	Highest qualifying tier wins; below the lowest threshold there is no inflation.
	Listed high-to-low for the lookup. */
	setup.inflation.TIERS = [
		{ id: "parody", min: 10000000000, setting: "inflationParodyPct", pct: 1500 }, // Parody spiral:  £100,000,000+ -> x16.00
		{ id: "extreme", min: 1500000000, setting: "inflationExtremePct", pct: 150 }, // Extreme crisis: £15,000,000+  -> x2.50
		{ id: "crisis", min: 500000000, setting: "inflationCrisisPct", pct: 75 }, // Crisis:         £5,000,000+   -> x1.75
		{ id: "bad", min: 200000000, setting: "inflationBadPct", pct: 35 }, // Bad economy:    £2,000,000+   -> x1.35
		{ id: "onset", min: 50000000, setting: "inflationOnsetPct", pct: 10 }, // Onset:          £500,000+     -> x1.10
	];

	setup.inflation.tiers = function () {
		return setup.inflation.TIERS.map(tier => ({
			id: tier.id,
			min: tier.min,
			pct: setup.inflation.setting(tier.setting),
		}));
	};

	setup.inflation.tierForWealth = function (wealth) {
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		const tier = setup.inflation.TIERS.find(item => total >= item.min);
		return tier ? { id: tier.id, min: tier.min, pct: setup.inflation.setting(tier.setting) } : null;
	};

	setup.inflation.baileyCrisisTier = function () {
		return setup.inflation.setting("inflationBaileyCrisisTier");
	};

	setup.inflation.baileyCrisisTierData = function () {
		const tier = setup.inflation.baileyCrisisTier();
		return setup.inflation.TIERS.find(item => item.id === tier) || setup.inflation.TIERS.find(item => item.id === "crisis");
	};

	setup.inflation.baileyCrisisTierPercent = function () {
		const tier = setup.inflation.baileyCrisisTierData();
		return tier ? setup.inflation.setting(tier.setting) : setup.inflation.settingDefault("inflationCrisisPct");
	};

	/* Current-preset fallback for the inflation percentage at which Bailey turns aggressive.
	   Live saves read `$settings.inflationBaileyCrisisTier`. */
	setup.inflation.CRISIS_PCT = setup.inflation.settingDefault("inflationCrisisPct");

	/* Spend sources excluded from inflation. Bets use raw stakes for payouts, and debts use fixed values. */
	setup.inflation.EXCLUDED_SOURCES = [
		"stolenMoney",
		"bankCard",
		"baileyRent",
		"bankLoan",
		"tailorDeposit",
		"robinGift",
		"estateBetting",
		"colosseumBet",
		"colosseumDebt",
		"silverStrangerFavor",
	];

	setup.inflation.isEnabled = function () {
		/* Always enabled for now. `$settings.inflationEnabled` is kept reserved for a future UI toggle. */
		return true;
	};

	/**
	 * Liquid bank funds: just the regular HBSC savings balance.
	 * This is the money Bailey can reach (force a withdrawal from) when collecting rent.
	 * Active fixed terms are deliberately NOT here; they're locked until maturity.
	 * Returns 0 before the bank exists.
	 */
	setup.inflation.liquidBankFunds = function () {
		if (typeof V === "undefined" || !V.hbsc || typeof V.hbsc !== "object") return 0;
		if (V.hbsc.account && Number.isFinite(V.hbsc.account.deposit)) return V.hbsc.account.deposit;
		return 0;
	};

	/**
	 * ALL funds held in the bank: savings balance + principal locked in active/matured fixed terms.
	 * This is the wealth figure for inflation - locked money still makes the player "rich" in the eyes of the economy even though Bailey can't touch it yet.
	 * Returns 0 before the bank exists.
	 */
	setup.inflation.bankFunds = function () {
		if (typeof V === "undefined" || !V.hbsc || typeof V.hbsc !== "object") return 0;
		let total = setup.inflation.liquidBankFunds();
		if (Array.isArray(V.hbsc.fixedTerms)) {
			for (const term of V.hbsc.fixedTerms) {
				if (term && Number.isFinite(term.principal)) total += term.principal;
			}
		}
		return total;
	};

	/**
	 * Net wealth that drives inflation: liquid cash + ALL bank funds (savings AND fixed terms, locked or not) + refundable rent money prepaid to Bailey, minus the outstanding loan principal.
	 * Fixed terms and prepaid Bailey deposit count here so stashing money away can't dodge shop inflation.
	 * Loan cash is cancelled by the principal owed, so loans are neutral.
	 * Read defensively so it works before those systems exist.
	 */
	setup.inflation.totalWealth = function () {
		if (typeof V === "undefined") return 0;
		let total = (Number.isFinite(V.money) ? V.money : 0) + setup.inflation.bankFunds();
		if (Number.isFinite(V.baileyDeposit)) total += V.baileyDeposit;
		if (typeof setup.hbsc !== "undefined" && setup.hbsc.loanPrincipalOutstanding) {
			total -= setup.hbsc.loanPrincipalOutstanding();
		}
		return total;
	};

	/**
	 * What the player can actually be made to pay Bailey right now: cash on hand + LIQUID savings only, NOT money locked in active fixed terms and NOT loaned money.
	 * Used by rent affordability checks; if cash is short, Bailey marches the player to the bank to withdraw from savings (see <<baileyBankDraw>>).
	 * Active fixed terms shelter money from Bailey until they mature and the principal+interest is automatically swept into savings (see setup.hbsc.processDay).
	 */
	setup.inflation.rentPayable = function () {
		if (typeof V === "undefined") return 0;
		return (Number.isFinite(V.money) ? V.money : 0) + setup.inflation.liquidBankFunds();
	};

	/**
	 * Wealth as BAILEY perceives it: cash on hand + liquid savings only, minus any outstanding loan principal.
	 * Money locked in an ACTIVE fixed-term deposit is invisible here, so it never raises his rent demand, never bumps his rent tier, and never tips him into "you've been hoarding" aggression.
	 * (That money still counts toward general economy inflation, see totalWealth.)
	 * Once a fixed term matures it is swept into savings and becomes visible here, so Bailey finally notices it and can demand more.
	 * Loans stay neutral: borrowed cash cancels the principal owed.
	 */
	setup.inflation.baileyWealth = function () {
		if (typeof V === "undefined") return 0;
		let total = (Number.isFinite(V.money) ? V.money : 0) + setup.inflation.liquidBankFunds();
		if (typeof setup.hbsc !== "undefined" && setup.hbsc.loanPrincipalOutstanding) {
			total -= setup.hbsc.loanPrincipalOutstanding();
		}
		return total;
	};

	/**
	 * Current price multiplier (>= 1) based on the player's net wealth.
	 * Pass an explicit amount to preview the multiplier at a different wealth level.
	 *
	 * @param {number} [wealth] Net wealth in pennies; defaults to the player's current total.
	 */
	setup.inflation.multiplier = function (wealth) {
		if (!setup.inflation.isEnabled()) return 1;
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		for (const tier of setup.inflation.TIERS) {
			if (total >= tier.min) return 1 + setup.inflation.setting(tier.setting) / 100;
		}
		return 1;
	};

	/**
	 * Convert a base price (pennies) into the inflation-adjusted price.
	 * Single source of truth so the money() charge and the displayed label agree.
	 *
	 * @param {number} base Base price in pennies.
	 */
	setup.inflation.price = function (base) {
		if (!Number.isFinite(base)) return base;
		return Math.round(base * setup.inflation.multiplier());
	};

	setup.inflation.spendPrice = function (base, source) {
		if (!Number.isFinite(base)) return base;
		if (!setup.inflation.appliesToSpend(source)) return base;
		return setup.inflation.price(base);
	};

	setup.inflation.canAfford = function (base, source) {
		if (typeof V === "undefined" || !Number.isFinite(V.money)) return false;
		return setup.hbsc.paymentBalance(source) >= setup.inflation.spendPrice(base, source);
	};

	setup.inflation.affordableBase = function (base, source) {
		if (typeof V === "undefined" || !Number.isFinite(V.money) || !Number.isFinite(base)) return 0;
		const balance = setup.hbsc.paymentBalance(source);
		const limit = Math.max(0, Math.floor(base));
		if (!setup.inflation.appliesToSpend(source)) return Math.min(limit, Math.max(0, Math.floor(balance)));
		let affordable = Math.min(limit, Math.floor(balance / setup.inflation.multiplier()));
		while (affordable > 0 && setup.inflation.spendPrice(affordable, source) > balance) affordable--;
		while (affordable < limit && setup.inflation.spendPrice(affordable + 1, source) <= balance) affordable++;
		return affordable;
	};

	/**
	 * Rent multiplier. Unlike prices (which use the STEPPED tier multiplier), rent is SMOOTH:
	 * it interpolates linearly between the tier points and keeps climbing past the top tier.
	 * The stepped price multiplier made rent lurch (e.g. 3.0 <-> 6.0) whenever the player's wealth crossed a tier boundary (including just by paying the rent) so the demand fluctuated week to week.
	 * Interpolating removes those jumps; rent now changes gradually.
	 *
	 * @param {number} [wealth] Net wealth in pennies; defaults to the player's current total.
	 */
	setup.inflation.rentMultiplier = function (wealth) {
		if (!setup.inflation.isEnabled()) return 1;
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		/* Ascending (wealth, multiplier) points built from the tiers (which are stored high-to-low). */
		const pts = [];
		const tiers = setup.inflation.TIERS;
		for (let i = tiers.length - 1; i >= 0; i--) {
			pts.push({ w: tiers[i].min, m: 1 + setup.inflation.setting(tiers[i].setting) / 100 });
		}
		if (total < pts[0].w) return 1; // below onset: no rent inflation
		for (let i = 1; i < pts.length; i++) {
			if (total <= pts[i].w) {
				const a = pts[i - 1];
				const b = pts[i];
				return a.m + ((total - a.w) / (b.w - a.w)) * (b.m - a.m);
			}
		}
		/* Above the top point: keep climbing with the slope of the final segment. */
		const a = pts[pts.length - 2];
		const b = pts[pts.length - 1];
		const slope = (b.m - a.m) / (b.w - a.w);
		return b.m + (total - b.w) * slope;
	};

	/**
	 * Whether a given <<money>> spend source should be inflated by the central hook.
	 *
	 * @param {string} source The <<money>> spend source.
	 */
	setup.inflation.appliesToSpend = function (source) {
		if (!setup.inflation.isEnabled()) return false;
		if (source && setup.inflation.EXCLUDED_SOURCES.includes(source)) return false;
		return true;
	};

	/* Bailey's rent demand, tiered by Bailey-visible wealth (all thresholds in pennies):
	     < £1M         : rent pressure capped at £15,000
	     £1M - £10M    : rent pressure capped at £35,000
	     £10M - £100M  : rent pressure capped at £75,000 ("don't fool me, I want more")
	     >= £100M      : rent pressure capped at £250,000 ("my best investment")
	   Rent pressure rises by one step each paid week while Bailey-visible wealth is high enough, then resets once it falls below that threshold.
	   When the Relentless Bailey toggle is on, all of these caps are bypassed (rentCap returns Infinity) so rent climbs forever. */
	setup.inflation.RENT_WEALTH_LOW = 100000000; // £1,000,000
	setup.inflation.RENT_WEALTH_JUMP = 1000000000; // £10,000,000
	setup.inflation.RENT_WEALTH_INVESTMENT = 10000000000; // £100,000,000
	setup.inflation.RENT_CAP_LOW = setup.inflation.settingDefault("inflationBaileyCapLow"); // £15,000
	setup.inflation.RENT_CAP_HIGH = setup.inflation.settingDefault("inflationBaileyCapHigh"); // £35,000
	setup.inflation.RENT_JUMP_DEMAND = setup.inflation.settingDefault("inflationBaileyDemandJump"); // £75,000
	setup.inflation.RENT_INVESTMENT_DEMAND = setup.inflation.settingDefault("inflationBaileyDemandInvestment"); // £250,000
	setup.inflation.RENT_INFLATION_PCT = setup.inflation.settingDefault("inflationBaileyRentPct"); // Current-preset fallback.
	/* Extra Bailey pressure rises by this much per paid week while Bailey-visible wealth is at the rent-pressure setting or higher.
	The pressure is separate from vanilla $rentStage so it can fall back to normal when the player is poor again. */
	setup.inflation.RENT_STAGE_STEP = setup.inflation.settingDefault("inflationBaileyStep"); // +£500 per paid week

	setup.inflation.rentSettingModifier = function () {
		if (typeof V === "undefined" || !V.settings) return 1;
		const modifier = Number(V.settings.rentCostModifier);
		return Number.isFinite(modifier) && modifier > 0 ? modifier : 1;
	};

	setup.inflation.scaleRentSetting = function (amount) {
		return Math.round(amount * setup.inflation.rentSettingModifier());
	};

	setup.inflation.rentRobinModifier = function () {
		/* Once Robin's stand earns enough, they pay Bailey directly and the player's rent drops back to single. */
		if (typeof V !== "undefined" && V.robinStand && V.robinStand.selfSufficient === 1) return 1;
		return typeof V !== "undefined" && V.robinpaid === 1 ? 2 : 1;
	};

	setup.inflation.scaleRentFull = function (amount) {
		return setup.inflation.scaleRentSetting(amount) * setup.inflation.rentRobinModifier();
	};

	/**
	 * Player opt-in: when the "relentless Bailey" toggle is on, Bailey never accepts a refusal and rent climbs every paid week from the very start, regardless of wealth.
	 * Off by default.
	 */
	setup.inflation.baileyRelentless = function () {
		return typeof V !== "undefined" && V.settings && V.settings.inflationBaileyRelentless === true;
	};

	setup.inflation.rentInflationActive = function (wealth) {
		/* Relentless toggle forces weekly rent pressure on from wealth £0 up, so rent never sits stuck at the vanilla base (£2,000, or £4,000 with Robin). */
		if (setup.inflation.baileyRelentless()) return true;
		return setup.inflation.percent(wealth) >= setup.inflation.setting("inflationBaileyRentPct");
	};

	setup.inflation.rentCap = function (wealth) {
		/* Relentless Bailey removes the ceiling entirely: rent keeps climbing one step every paid week with no cap, regardless of wealth.
		The "Bailey Rent Limits" settings are ignored (and disabled in the UI) while this is on. */
		if (setup.inflation.baileyRelentless()) return Infinity;
		if (wealth >= setup.inflation.RENT_WEALTH_INVESTMENT) return setup.inflation.scaleRentFull(setup.inflation.setting("inflationBaileyDemandInvestment"));
		if (wealth >= setup.inflation.RENT_WEALTH_JUMP) return setup.inflation.scaleRentFull(setup.inflation.setting("inflationBaileyDemandJump"));
		const baseCap =
			wealth < setup.inflation.RENT_WEALTH_LOW ? setup.inflation.setting("inflationBaileyCapLow") : setup.inflation.setting("inflationBaileyCapHigh");
		return setup.inflation.scaleRentFull(baseCap);
	};

	setup.inflation.rentPressureSteps = function () {
		if (typeof V === "undefined" || !Number.isFinite(V.baileyRentInflationSteps)) return 0;
		return Math.max(0, Math.floor(V.baileyRentInflationSteps));
	};

	setup.inflation.setRentPressureSteps = function (steps) {
		if (typeof V === "undefined") return;
		steps = Math.max(0, Math.floor(Number(steps) || 0));
		if (steps > 0) V.baileyRentInflationSteps = steps;
		else delete V.baileyRentInflationSteps;
	};

	setup.inflation.rentPressureStep = function () {
		return setup.inflation.scaleRentFull(setup.inflation.setting("inflationBaileyStep"));
	};

	setup.inflation.rentBaseWithModifiers = function (rawBaseRent) {
		const setting = Math.floor(rawBaseRent * setup.inflation.rentSettingModifier());
		return setting * setup.inflation.rentRobinModifier();
	};

	setup.inflation.nextRentBase = function () {
		if (typeof V === "undefined") return setup.inflation.rentBaseWithModifiers(200000);
		const baseRents = [10000, 30000, 50000, 70000, 100000, 150000, 200000];
		const stage = Number.isFinite(V.rentStage) ? V.rentStage : 6;
		return setup.inflation.rentBaseWithModifiers(baseRents[Math.clamp(stage, 1, 6)]);
	};

	setup.inflation.rentPressureTarget = function (baseRent, wealth) {
		if (!setup.inflation.rentInflationActive(wealth)) return 0;
		return Math.max(0, setup.inflation.rentCap(wealth) - baseRent);
	};

	setup.inflation.advanceRentPressure = function () {
		if (typeof V === "undefined") return;
		const wealth = setup.inflation.baileyWealth();
		if (!setup.inflation.rentInflationActive(wealth)) {
			setup.inflation.setRentPressureSteps(0);
			return;
		}

		const step = setup.inflation.rentPressureStep();
		const target = setup.inflation.rentPressureTarget(setup.inflation.nextRentBase(), wealth);
		if (step <= 0 || target <= 0) {
			setup.inflation.setRentPressureSteps(0);
			return;
		}

		let steps = setup.inflation.rentPressureSteps();
		const current = steps * step;
		if (current < target) steps += 1;
		else if (current > target) steps = Math.floor(target / step);
		setup.inflation.setRentPressureSteps(steps);
	};

	setup.inflation.rentDemand = function (baseRent) {
		if (!Number.isFinite(baseRent)) return baseRent;
		/* Bailey only demands against money he can see (liquid), not locked fixed terms. */
		const wealth = setup.inflation.baileyWealth();
		const target = setup.inflation.rentPressureTarget(baseRent, wealth);
		if (target <= 0) {
			setup.inflation.setRentPressureSteps(0);
			return baseRent;
		}
		const step = setup.inflation.rentPressureStep();
		let steps = setup.inflation.rentPressureSteps();
		if (step > 0 && steps * step > target) {
			steps = Math.floor(target / step);
			setup.inflation.setRentPressureSteps(steps);
		}
		const pressure = Math.min(steps * step, target);
		return baseRent + pressure;
	};

	/** Which special rent-demand tier the player is in: "" (normal), "jump" (>=£10M), "investment" (>=£100M). */
	setup.inflation.rentDemandTier = function () {
		const wealth = setup.inflation.baileyWealth();
		if (wealth >= setup.inflation.RENT_WEALTH_INVESTMENT) return "investment";
		if (wealth >= setup.inflation.RENT_WEALTH_JUMP) return "jump";
		return "";
	};

	/**
	 * Apply Bailey's tiered demand to a base rent amount (pennies). Called by the `rentmod` widget.
	 *
	 * @param {number} amount Base rent in pennies.
	 */
	setup.inflation.applyToRent = function (amount) {
		return setup.inflation.rentDemand(amount);
	};

	/**
	 * Convenience for UI: current inflation as a percentage above base (0 when inactive).
	 *
	 * @param {number} [wealth] Net wealth in pennies; defaults to the player's current total.
	 */
	setup.inflation.percent = function (wealth) {
		return Math.round((setup.inflation.multiplier(wealth) - 1) * 100);
	};

	/**
	 * True once inflation has reached the Bailey crisis setting. Gates aggressive Bailey.
	 *
	 * @param {number} [wealth] Net wealth in pennies; defaults to the player's current total.
	 */
	setup.inflation.isCrisis = function (wealth) {
		const tier = setup.inflation.baileyCrisisTierData();
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		return tier ? total >= tier.min : false;
	};

	/** Whether the player currently owes the bank anything. */
	setup.inflation.hasLoanDebt = function () {
		if (typeof setup.hbsc === "undefined" || !setup.hbsc.ensureLoanState) return false;
		return setup.hbsc.ensureLoanState().owed > 0;
	};

	/**
	 * Bailey turns aggressive (rent becomes unavoidable, he hunts the streets) once the economy reaches the Bailey crisis setting OR the player owes the bank.
	 * He calms back to the normal system when there's no loan and inflation is back below that setting.
	 * Returns "" (calm), "inflation", "loan", or "both".
	 */
	setup.inflation.baileyAggressionReason = function () {
		/* The relentless toggle makes Bailey aggressive from the start; otherwise judge "crisis" on the wealth Bailey can actually see (liquid),
		so money hidden in an active fixed term never tips him into aggression until it matures into savings.
		When relentless is on but the player isn't genuinely rich, the reason is "relentless" (a plain bully squeeze) rather than "inflation" (which claims the player is hoarding a fortune). */
		const relentless = setup.inflation.baileyRelentless();
		const realCrisis = setup.inflation.isCrisis(setup.inflation.baileyWealth());
		const loan = setup.inflation.hasLoanDebt();
		if ((relentless || realCrisis) && loan) return "both";
		if (loan) return "loan";
		if (realCrisis) return "inflation";
		if (relentless) return "relentless";
		return "";
	};

	setup.inflation.baileyAggressive = function () {
		return setup.inflation.baileyAggressionReason() !== "";
	};

	/*
	 * Parody money-cap event.
	 *        Self-gating: it re-fires whenever wealth crosses the cap again, so there is no "seen" flag.
	 */
	setup.inflation.PARODY_WEALTH = 300000000000; // £3,000,000,000 displayed
	setup.inflation.PARODY_LEFTOVER = 100000000000; // £1,000,000,000 left in hand
	setup.inflation.PARODY_PASSAGES = ["Money Parody Intro", "Money Parody Take", "Money Parody Take 2"];

	/**
	 * Whether loading into `dest` should be hijacked by the parody event.
	 *
	 * @param {string} dest Passage being loaded into.
	 */
	setup.inflation.moneyParodyDue = function (dest) {
		if (typeof V === "undefined" || !setup.inflation.isEnabled()) return false;
		if (setup.inflation.PARODY_PASSAGES.includes(dest)) return false;
		/* Never yank the player out of combat or a scripted scene. */
		if (V.combat || V.enemyno > 0 || V.fightstart || V.molestationstart || V.sexstart) return false;
		/* Flashbacks, visions, replays and the Hopeless Cycle run on frozen stats; taking the money there would hit the real save. */
		if (V.statFreeze || V.frozenValues || V.replayScene || V.hc) return false;
		if (V.event !== undefined && typeof EventSystem !== "undefined" && EventSystem.any && EventSystem.any()) return false;
		const badEnd = Array.isArray(V.badEndStats) && V.badEndStats.length > 0 ? V.badEndStats[V.badEndStats.length - 1] : null;
		if (badEnd && badEnd.trackedStart && badEnd.trackedEnd === undefined) return false;
		return setup.inflation.totalWealth() > setup.inflation.PARODY_WEALTH;
	};

	/**
	 * Wipe every stash of money, leaving PARODY_LEFTOVER in hand:
	 * Cash, HBSC savings, locked fixed terms, the stale interest/maturity notices that drive the journal's "recent changes" line, and the prepaid Bailey rent deposit.
	 * The loan (debt) is deliberately left so it still shows in the bank journal. Used by the parody event.
	 */
	setup.inflation.takeAllMoney = function () {
		if (typeof V === "undefined") return;
		V.money = setup.inflation.PARODY_LEFTOVER;
		if (typeof setup.hbsc !== "undefined" && setup.hbsc.ensureState) setup.hbsc.ensureState();
		if (V.hbsc) {
			if (V.hbsc.account) V.hbsc.account.deposit = 0;
			V.hbsc.fixedTerms = [];
			V.hbsc.notices = [];
			V.hbsc.lastSavingsInterest = 0;
		}
		V.baileyDeposit = 0; // prepaid rent the man pockets too
	};
})();
