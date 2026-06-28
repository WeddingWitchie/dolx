/**
 * X-Change "Inflation" economy feature.
 * ======================================
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
 * Tune the tiers to taste.
 *
 * Three integration points keep displayed prices and actual charges in sync:
 * - General price hook in `money()` (game/base-system/stat-changes.js): any negative (spend) amount is run through `price()`, except sources in EXCLUDED_SOURCES.
 * - Rent scaling in the `rentmod` widget (game/overworld-town/loc-home/rent.twee).
 * - The `<<printprice base [class]>>` widget (game/base-system/widgets.twee) shows a base price already adjusted for inflation, so blatant "£x" labels can respect it.
 *
 * If what you're looking for isn't here, check those spots too.
**/

(() => {
	"use strict";

	setup.inflation = setup.inflation || {};

	/* Tiered inflation.
	Each tier: the minimum net wealth (in pennies) to enter it, and the price increase as a percentage.
	Highest qualifying tier wins; below the lowest threshold there is no inflation.
	Listed high-to-low for the lookup. */
	setup.inflation.TIERS = [
		{ min: 10000000000, pct: 5000 }, // Parody spiral:  £100,000,000+ -> x51.00
		{ min: 1500000000,  pct: 300 },  // Extreme crisis: £15,000,000+  -> x4.00
		{ min: 500000000,   pct: 150 },  // Crisis:         £5,000,000+   -> x2.50
		{ min: 200000000,   pct: 70 },   // Bad economy:    £2,000,000+   -> x1.70
		{ min: 50000000,    pct: 20 },   // Onset:          £500,000+     -> x1.20
	];

	/* Inflation percentage at or above which Bailey turns aggressive (rent unavoidable + street hunt).
	   Set this to one of the tier `pct` values above. 20 = onset, 70 = bad economy, 150 = crisis, 300 = extreme, 5000 = parody spiral. */
	setup.inflation.CRISIS_PCT = 150;

	/* `money()` spend sources that must NOT be auto-inflated.
	Rent is handled at its own source so the shown price matches; loan repayments are fixed-value debt. */
	setup.inflation.EXCLUDED_SOURCES = ["baileyRent", "bankLoan", "tailorDeposit"];

	setup.inflation.isEnabled = function () {
		/* Default on. Can be force-disabled with `$settings.inflationEnabled = false`. */
		return !(typeof V !== "undefined" && V.settings && V.settings.inflationEnabled === false);
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
	 */
	setup.inflation.multiplier = function (wealth) {
		if (!setup.inflation.isEnabled()) return 1;
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		for (const tier of setup.inflation.TIERS) {
			if (total >= tier.min) return 1 + tier.pct / 100;
		}
		return 1;
	};

	/**
	 * Convert a base price (pennies) into the inflation-adjusted price.
	 * Single source of truth so the money() charge and the displayed label agree.
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
		return V.money >= setup.inflation.spendPrice(base, source);
	};

	setup.inflation.affordableBase = function (base, source) {
		if (typeof V === "undefined" || !Number.isFinite(V.money) || !Number.isFinite(base)) return 0;
		const limit = Math.max(0, Math.floor(base));
		if (!setup.inflation.appliesToSpend(source)) return Math.min(limit, Math.max(0, Math.floor(V.money)));
		let affordable = Math.min(limit, Math.floor(V.money / setup.inflation.multiplier()));
		while (affordable > 0 && setup.inflation.spendPrice(affordable, source) > V.money) affordable--;
		while (affordable < limit && setup.inflation.spendPrice(affordable + 1, source) <= V.money) affordable++;
		return affordable;
	};

	/**
	 * Rent multiplier. Unlike prices (which use the STEPPED tier multiplier), rent is SMOOTH:
	 * it interpolates linearly between the tier points and keeps climbing past the top tier.
	 * The stepped price multiplier made rent lurch (e.g. 3.0 <-> 6.0) whenever the player's wealth crossed a tier boundary (including just by paying the rent) so the demand fluctuated week to week.
	 * Interpolating removes those jumps; rent now changes gradually.
	 */
	setup.inflation.rentMultiplier = function (wealth) {
		if (!setup.inflation.isEnabled()) return 1;
		const total = typeof wealth === "number" ? wealth : setup.inflation.totalWealth();
		/* Ascending (wealth, multiplier) points built from the tiers (which are stored high-to-low). */
		const pts = [];
		for (let i = setup.inflation.TIERS.length - 1; i >= 0; i--) {
			pts.push({ w: setup.inflation.TIERS[i].min, m: 1 + setup.inflation.TIERS[i].pct / 100 });
		}
		if (total < pts[0].w) return 1;                 // below onset: no rent inflation
		for (let i = 1; i < pts.length; i++) {
			if (total <= pts[i].w) {
				const a = pts[i - 1], b = pts[i];
				return a.m + ((total - a.w) / (b.w - a.w)) * (b.m - a.m);
			}
		}
		/* Above the top point: keep climbing with the slope of the final segment. */
		const a = pts[pts.length - 2], b = pts[pts.length - 1];
		const slope = (b.m - a.m) / (b.w - a.w);
		return b.m + (total - b.w) * slope;
	};

	/** Whether a given <<money>> spend source should be inflated by the central hook. */
	setup.inflation.appliesToSpend = function (source) {
		if (!setup.inflation.isEnabled()) return false;
		if (source && setup.inflation.EXCLUDED_SOURCES.includes(source)) return false;
		return true;
	};

	/* Bailey's rent demand, tiered by Bailey-visible wealth (all thresholds in pennies):
	     < £1,000,000  : scaled rent, capped at £30,000
	     £1M - £10M    : scaled rent, capped at £70,000
	     £10M - £100M  : flat £150,000 a week ("don't fool me, I want more")
	     >= £100M      : flat £500,000 a week ("my best investment")
	   "Scaled rent" is the base rent times the uncapped rentMultiplier. */
	setup.inflation.RENT_WEALTH_LOW = 100000000;     // £1,000,000
	setup.inflation.RENT_WEALTH_JUMP = 1000000000;   // £10,000,000
	setup.inflation.RENT_WEALTH_INVESTMENT = 10000000000; // £100,000,000
	setup.inflation.RENT_CAP_LOW = 3000000;          // £30,000
	setup.inflation.RENT_CAP_HIGH = 7000000;         // £70,000
	setup.inflation.RENT_JUMP_DEMAND = 15000000;     // £150,000
	setup.inflation.RENT_INVESTMENT_DEMAND = 50000000; // £500,000
	setup.inflation.RENT_INFLATION_PCT = 70;         // Bailey rent only starts climbing at bad-economy inflation.
	/* Vanilla rent stops climbing at stage 6 (base £2,000).
	Past that, add this much base per week so the demand keeps ratcheting upward toward the cap instead of plateauing. */
	setup.inflation.RENT_STAGE_STEP = 50000;         // +£500 of base per week beyond stage 6

	setup.inflation.rentSettingModifier = function () {
		if (typeof V === "undefined" || !V.settings) return 1;
		const modifier = Number(V.settings.rentCostModifier);
		return Number.isFinite(modifier) && modifier > 0 ? modifier : 1;
	};

	setup.inflation.scaleRentSetting = function (amount) {
		return Math.round(amount * setup.inflation.rentSettingModifier());
	};

	setup.inflation.rentDemand = function (baseRent) {
		if (!Number.isFinite(baseRent)) return baseRent;
		/* Bailey only demands against money he can see (liquid), not locked fixed terms. */
		const wealth = setup.inflation.baileyWealth();
		if (setup.inflation.percent(wealth) < setup.inflation.RENT_INFLATION_PCT) return baseRent;
		if (wealth >= setup.inflation.RENT_WEALTH_INVESTMENT) return setup.inflation.scaleRentSetting(setup.inflation.RENT_INVESTMENT_DEMAND);
		if (wealth >= setup.inflation.RENT_WEALTH_JUMP) return setup.inflation.scaleRentSetting(setup.inflation.RENT_JUMP_DEMAND);
		/* Keep the base climbing each week past the vanilla stage-6 plateau so rent ratchets up. */
		let base = baseRent;
		const stage = typeof V !== "undefined" && Number.isFinite(V.rentstage) ? V.rentstage : 0;
		if (stage > 6) base += setup.inflation.scaleRentSetting((stage - 6) * setup.inflation.RENT_STAGE_STEP);
		const scaled = Math.round(base * setup.inflation.rentMultiplier(wealth));
		const baseCap = wealth < setup.inflation.RENT_WEALTH_LOW ? setup.inflation.RENT_CAP_LOW : setup.inflation.RENT_CAP_HIGH;
		const cap = setup.inflation.scaleRentSetting(baseCap);
		return Math.min(scaled, cap);
	};

	/** Which special rent-demand tier the player is in: "" (normal), "jump" (>=£10M), "investment" (>=£100M). */
	setup.inflation.rentDemandTier = function () {
		const wealth = setup.inflation.baileyWealth();
		if (wealth >= setup.inflation.RENT_WEALTH_INVESTMENT) return "investment";
		if (wealth >= setup.inflation.RENT_WEALTH_JUMP) return "jump";
		return "";
	};

	/** Apply Bailey's tiered demand to a base rent amount (pennies). Called by the `rentmod` widget. */
	setup.inflation.applyToRent = function (amount) {
		return setup.inflation.rentDemand(amount);
	};

	/** Convenience for UI: current inflation as a percentage above base (0 when inactive). */
	setup.inflation.percent = function (wealth) {
		return Math.round((setup.inflation.multiplier(wealth) - 1) * 100);
	};

	/** True once inflation has reached the crisis threshold (CRISIS_PCT). Gates aggressive Bailey. */
	setup.inflation.isCrisis = function (wealth) {
		return setup.inflation.percent(wealth) >= setup.inflation.CRISIS_PCT;
	};

	/** Whether the player currently owes the bank anything. */
	setup.inflation.hasLoanDebt = function () {
		if (typeof setup.hbsc === "undefined" || !setup.hbsc.ensureLoanState) return false;
		return setup.hbsc.ensureLoanState().owed > 0;
	};

	/**
	 * Bailey turns aggressive (rent becomes unavoidable, he hunts the streets) once the economy reaches the crisis threshold (CRISIS_PCT) OR the player owes the bank.
	 * He calms back to the normal system when there's no loan and inflation is back below CRISIS_PCT.
	 * Returns "" (calm), "inflation", "loan", or "both".
	 */
	setup.inflation.baileyAggressionReason = function () {
		/* Judge "crisis" on the wealth Bailey can actually see (liquid), so money hidden in an active fixed term never tips him into aggression until it matures into savings. */
		const crisis = setup.inflation.isCrisis(setup.inflation.baileyWealth());
		const loan = setup.inflation.hasLoanDebt();
		if (crisis && loan) return "both";
		if (loan) return "loan";
		if (crisis) return "inflation";
		return "";
	};

	setup.inflation.baileyAggressive = function () {
		return setup.inflation.baileyAggressionReason() !== "";
	};

	/* ------------------------------------------------------------------ *
	 * Parody money-cap event.
       Self-gating: it re-fires whenever wealth crosses the cap again, so there is no "seen" flag.
	 * ------------------------------------------------------------------ */
	setup.inflation.PARODY_WEALTH = 300000000000; // £3,000,000,000 displayed
	setup.inflation.PARODY_LEFTOVER = 100000000000; // £1,000,000,000 left in hand
	setup.inflation.PARODY_PASSAGES = ["Money Parody Intro", "Money Parody Take", "Money Parody Take 2"];

	/** Whether loading into `dest` should be hijacked by the parody event. */
	setup.inflation.moneyParodyDue = function (dest) {
		if (typeof V === "undefined" || !setup.inflation.isEnabled()) return false;
		if (setup.inflation.PARODY_PASSAGES.includes(dest)) return false;
		/* Never yank the player out of combat or a scripted scene. */
		if (V.combat || (V.enemyno > 0) || V.fightstart || V.molestationstart || V.sexstart) return false;
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
