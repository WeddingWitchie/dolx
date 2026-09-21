setup.hbsc = setup.hbsc || {};

setup.hbsc.savingsTiers = {
	1: { name: "Basic", depositLimit: 500000000, interestAER: 2.5, minimumBalance: 0, fixedTermFeeDiscount: 0 },
	2: { name: "Silver", depositLimit: 2500000000, interestAER: 2.0, minimumBalance: 100000000, fixedTermFeeDiscount: 0 },
	3: { name: "Gold", depositLimit: 10000000000, interestAER: 1.25, minimumBalance: 1000000000, fixedTermFeeDiscount: 0, priorityService: true },
	4: { name: "Platinum", depositLimit: 50000000000, interestAER: 0.75, minimumBalance: 5000000000, fixedTermFeeDiscount: 5 },
	5: { name: "Black", depositLimit: Infinity, interestAER: 0.25, minimumBalance: 25000000000, fixedTermFeeDiscount: 10 },
};

setup.hbsc.fixedTermPlans = {
	1: {
		months: 1,
		bands: [{ min: 10000, max: Infinity, aer: 2.5 }],
		earlyPenalty: { full: 20 },
	},
	3: {
		months: 3,
		bands: [{ min: 10000, max: Infinity, aer: 3.25 }],
		earlyPenalty: { full: 30 },
	},
	6: {
		months: 6,
		bands: [
			{ min: 10000, max: 999999900, aer: 3.75 },
			{ min: 1000000000, max: 4999999900, aer: 4.25 },
			{ min: 5000000000, max: 9999999900, aer: 5.0 },
			{ min: 10000000000, max: Infinity, aer: 6.0 },
		],
		earlyPenalty: { half: 25, full: 40 },
	},
	12: {
		months: 12,
		bands: [
			{ min: 10000, max: 999999900, aer: 5.5 },
			{ min: 1000000000, max: 4999999900, aer: 6.25 },
			{ min: 5000000000, max: 9999999900, aer: 7.25 },
			{ min: 10000000000, max: Infinity, aer: 8.5 },
		],
		earlyPenalty: { half: 30, full: 50 },
	},
};

setup.hbsc.CURRENCY_SCALE = 100;
setup.hbsc.MIN_FIXED_TERM_OPEN = 100 * setup.hbsc.CURRENCY_SCALE;
setup.hbsc.MIN_HALF_WITHDRAW_PRINCIPAL = 200 * setup.hbsc.CURRENCY_SCALE;
setup.hbsc.MIN_REMAINING_FIXED_TERM_PRINCIPAL = 100 * setup.hbsc.CURRENCY_SCALE;

setup.hbsc.toInternalMoney = function (amount) {
	if (!Number.isFinite(amount)) return 0;
	return setup.hbsc.roundMoney(amount * setup.hbsc.CURRENCY_SCALE);
};

setup.hbsc.toWholePounds = function (amount) {
	return Math.floor(setup.hbsc.roundMoney(amount) / setup.hbsc.CURRENCY_SCALE);
};

setup.hbsc.formatInputAmount = function (amount) {
	const pounds = setup.hbsc.toWholePounds(amount);
	return pounds > 0 ? pounds.toLocaleString("en-GB") : "";
};

setup.hbsc.roundMoney = function (amount) {
	if (!Number.isFinite(amount)) return 0;
	return Math.max(0, Math.round(amount));
};

setup.hbsc.parseMoneyInput = function (value) {
	if (Number.isFinite(value)) return setup.hbsc.toInternalMoney(value);
	if (typeof value !== "string") return 0;
	const cleaned = value.replace(/[£,\s]/g, "").trim();
	if (!cleaned || !/^\d+$/.test(cleaned)) return 0;
	const parsed = Number(cleaned);
	if (!Number.isFinite(parsed)) return 0;
	return setup.hbsc.toInternalMoney(parsed);
};

setup.hbsc.newFieldId = function (prefix = "hbsc-field") {
	const V = State.variables;
	setup.hbsc.ensureState();
	V.hbsc.inputNonce = (Number.isFinite(V.hbsc.inputNonce) ? Math.floor(V.hbsc.inputNonce) : 0) + 1;
	return `${prefix}-${V.hbsc.inputNonce}`;
};

setup.hbsc.escapeHtml = function (value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
};

setup.hbsc.makeTextInput = function (id, value = "") {
	const displayValue = typeof value === "string" ? value : setup.hbsc.formatInputAmount(value);
	return `<input id="${setup.hbsc.escapeHtml(id)}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${setup.hbsc.escapeHtml(
		displayValue
	)}">`;
};

setup.hbsc.submitAmountFromField = function (fieldId, mode, targetPassage) {
	const V = State.variables;
	setup.hbsc.ensureState();
	const raw = setup.hbsc.captureFieldValue(fieldId);
	if (mode === "fixedTerm") {
		V.hbsc.ftAmountInput = raw;
		V.hbsc.ftAmount = setup.hbsc.parseMoneyInput(raw);
	} else {
		V.hbsc.transactionInput = raw;
		V.hbsc.transactionAmount = setup.hbsc.parseMoneyInput(raw);
	}
	Engine.play(targetPassage);
	return false;
};

setup.hbsc.getBanRemainingDays = function () {
	const V = State.variables;
	setup.hbsc.ensureState();
	if (!Number.isFinite(V.hbsc.banUntilDay) || V.hbsc.banUntilDay <= Time.days) return 0;
	return Math.max(0, Math.ceil(V.hbsc.banUntilDay - Time.days));
};

setup.hbsc.isBanned = function () {
	return setup.hbsc.getBanRemainingDays() > 0;
};

setup.hbsc.applySneakPenalty = function () {
	const V = State.variables;
	setup.hbsc.ensureState();
	const result = { applied: false, penalty: 0, banDays: 0 };
	if (V.hbsc.account.level < 1) return result;
	const penalty = setup.hbsc.roundMoney(V.hbsc.account.deposit * 0.1);
	if (penalty > 0) {
		V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit - penalty);
	}
	V.hbsc.banUntilDay = Math.max(Number(V.hbsc.banUntilDay) || 0, Time.days + 30);
	V.hbsc.lastPenaltyAmount = penalty;
	V.hbsc.penaltyWarningPending = true;
	V.hbsc.notices.push({
		type: "securityPenalty",
		day: Time.days,
		penalty,
		banUntilDay: V.hbsc.banUntilDay,
	});
	result.applied = true;
	result.penalty = penalty;
	result.banDays = setup.hbsc.getBanRemainingDays();
	return result;
};

setup.hbsc.captureFieldValue = function (id) {
	if (typeof document === "undefined" || !id) return "";
	const el = document.getElementById(id);
	if (!el) return "";
	return typeof el.value === "string" ? el.value : String(el.value ?? "");
};

setup.hbsc.ensureState = function () {
	const V = State.variables;
	if (V.hbsc == null || typeof V.hbsc !== "object") V.hbsc = {};

	if (V.hbsc.account == null || typeof V.hbsc.account !== "object") V.hbsc.account = {};
	if (!Number.isFinite(V.hbsc.account.level)) V.hbsc.account.level = 0;
	if (!Number.isFinite(V.hbsc.account.deposit)) V.hbsc.account.deposit = 0;
	V.hbsc.account.level = Math.clamp(Math.floor(V.hbsc.account.level), 0, 5);
	V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit);

	if (!Array.isArray(V.hbsc.fixedTerms)) V.hbsc.fixedTerms = [];
	if (!Array.isArray(V.hbsc.notices)) V.hbsc.notices = [];

	if (!Number.isFinite(V.hbsc.phase)) V.hbsc.phase = 0;
	if (!Number.isFinite(V.hbsc.pendingUpgradeLevel)) V.hbsc.pendingUpgradeLevel = 0;
	if (!Number.isFinite(V.hbsc.pendingUpgradeAmount)) V.hbsc.pendingUpgradeAmount = 0;
	V.hbsc.phase = Math.max(0, Math.floor(V.hbsc.phase));
	V.hbsc.pendingUpgradeLevel = Math.max(0, Math.floor(V.hbsc.pendingUpgradeLevel));
	V.hbsc.pendingUpgradeAmount = setup.hbsc.roundMoney(V.hbsc.pendingUpgradeAmount);

	if (!Number.isFinite(V.hbsc.targetTier)) V.hbsc.targetTier = 0;
	if (!Number.isFinite(V.hbsc.upgradeTopUp)) V.hbsc.upgradeTopUp = 0;
	if (!Number.isFinite(V.hbsc.inputNonce)) V.hbsc.inputNonce = 0;
	if (!Number.isFinite(V.hbsc.banUntilDay)) V.hbsc.banUntilDay = 0;
	if (!Number.isFinite(V.hbsc.lastPenaltyAmount)) V.hbsc.lastPenaltyAmount = 0;
	if (typeof V.hbsc.penaltyWarningPending !== "boolean") V.hbsc.penaltyWarningPending = false;
	if (!Number.isFinite(V.hbsc.transactionAmount)) V.hbsc.transactionAmount = 0;
	if (typeof V.hbsc.transactionInput !== "string") V.hbsc.transactionInput = "";
	if (!Number.isFinite(V.hbsc.ftMonths)) V.hbsc.ftMonths = 0;
	if (!Number.isFinite(V.hbsc.ftAmount)) V.hbsc.ftAmount = 0;
	if (typeof V.hbsc.ftAmountInput !== "string") V.hbsc.ftAmountInput = "";
	if (typeof V.hbsc.ftSource !== "string") V.hbsc.ftSource = "";
	if (typeof V.hbsc.ftCloseKind !== "string") V.hbsc.ftCloseKind = "";
	if (typeof V.hbsc.ftCloseTarget !== "string") V.hbsc.ftCloseTarget = "";
	if (typeof V.hbsc.selectedFixedTermId !== "string") V.hbsc.selectedFixedTermId = "";
	if (!Number.isFinite(V.hbsc.lastSavingsInterest)) V.hbsc.lastSavingsInterest = 0;

	if (V.hbsc.account.level >= 1 && V.hbsc.averyAccountUnlockNoticeSeen !== true && V.hbsc.averyAccountUnlockPending !== true) {
		V.hbsc.averyAccountUnlockPending = true;
	}

	for (const term of V.hbsc.fixedTerms) {
		if (term == null || typeof term !== "object") continue;

		term.id ??= `hbsc-ftd-${random(100000, 999999)}-${Time.days}`;
		if (!Number.isFinite(term.principal)) term.principal = 0;
		if (!Number.isFinite(term.months)) term.months = 0;
		if (!Number.isFinite(term.elapsedDays)) term.elapsedDays = 0;
		if (!Number.isFinite(term.createdOnDay)) term.createdOnDay = Time.days;
		if (!Number.isFinite(term.matureOnDay)) term.matureOnDay = term.createdOnDay + Math.max(1, Math.round(term.months * 30));
		if (!Number.isFinite(term.accountLevelAtOpen)) term.accountLevelAtOpen = V.hbsc.account.level;
		if (!Number.isFinite(term.aer)) term.aer = setup.hbsc.getFixedTermAER(term.months, term.principal);
		if (typeof term.status !== "string") term.status = "active";

		term.principal = setup.hbsc.roundMoney(term.principal);
		term.months = Math.max(0, Math.floor(term.months));
		term.elapsedDays = Math.max(0, Math.floor(term.elapsedDays));
	}

	if (setup.hbsc.ensureLoanState) setup.hbsc.ensureLoanState();
};

setup.hbsc.getSavingsTier = function (level) {
	return setup.hbsc.savingsTiers[level] || setup.hbsc.savingsTiers[1];
};

setup.hbsc.getSavingsMinimumBalance = function (level) {
	const V = State.variables;
	if (level === 5 && V.xchange && V.xchange.bankHeist && V.xchange.bankHeist.landryReported) return 0;
	return setup.hbsc.getSavingsTier(level).minimumBalance || 0;
};

setup.hbsc.getTierName = function (level) {
	return setup.hbsc.getSavingsTier(level).name;
};

setup.hbsc.getUpgradeRequirement = function (level) {
	if (level <= 1) return 0;
	return setup.hbsc.getSavingsTier(level).minimumBalance || 0;
};

setup.hbsc.getDepositLimit = function (level) {
	return setup.hbsc.getSavingsTier(level).depositLimit;
};

setup.hbsc.getDepositRoom = function (level, currentBalance) {
	const limit = setup.hbsc.getDepositLimit(level);
	if (!Number.isFinite(limit)) return Infinity;
	return Math.max(0, limit - setup.hbsc.roundMoney(currentBalance));
};

setup.hbsc.getFixedTermPlan = function (months) {
	return setup.hbsc.fixedTermPlans[months] || null;
};

setup.hbsc.getFixedTermBand = function (months, principal) {
	const plan = setup.hbsc.getFixedTermPlan(months);
	if (!plan) return null;
	return plan.bands.find(band => principal >= band.min && principal <= band.max) || null;
};

setup.hbsc.getFixedTermAER = function (months, principal) {
	const band = setup.hbsc.getFixedTermBand(months, principal);
	return band ? band.aer : 0;
};

setup.hbsc.summariseNotices = function (notices) {
	const summary = {
		savingsInterestCount: 0,
		savingsInterestTotal: 0,
		latestSavingsBalance: 0,
		maturedCount: 0,
		maturedReadyTotal: 0,
	};

	if (!Array.isArray(notices)) return summary;

	for (const notice of notices) {
		if (!notice || typeof notice !== "object") continue;
		if (notice.type === "savingsInterest") {
			summary.savingsInterestCount += 1;
			summary.savingsInterestTotal += Number.isFinite(notice.amount) ? notice.amount : 0;
			if (Number.isFinite(notice.balance)) summary.latestSavingsBalance = Math.max(summary.latestSavingsBalance, notice.balance);
		} else if (notice.type === "fixedTermMatured") {
			summary.maturedCount += 1;
			summary.maturedReadyTotal += Number.isFinite(notice.total) ? notice.total : 0;
		}
	}

	summary.savingsInterestTotal = setup.hbsc.roundMoney(summary.savingsInterestTotal);
	summary.latestSavingsBalance = setup.hbsc.roundMoney(summary.latestSavingsBalance);
	summary.maturedReadyTotal = setup.hbsc.roundMoney(summary.maturedReadyTotal);
	return summary;
};

setup.hbsc.summariseFixedTerms = function (terms) {
	const summary = {
		activeCount: 0,
		activePrincipalTotal: 0,
		nearestDaysRemaining: null,
		maturedCount: 0,
		maturedReadyTotal: 0,
	};

	if (!Array.isArray(terms)) return summary;

	for (const term of terms) {
		if (!term || typeof term !== "object") continue;
		if (term.status === "active") {
			summary.activeCount += 1;
			summary.activePrincipalTotal += Number.isFinite(term.principal) ? term.principal : 0;
			const daysLeft = Math.max(0, (Number.isFinite(term.matureOnDay) ? term.matureOnDay : Time.days) - Time.days);
			if (summary.nearestDaysRemaining == null || daysLeft < summary.nearestDaysRemaining) {
				summary.nearestDaysRemaining = daysLeft;
			}
		} else if (term.status === "matured") {
			summary.maturedCount += 1;
			const ready = Number.isFinite(term.maturityTotal)
				? term.maturityTotal
				: setup.hbsc.calcFixedTermMaturity(Number.isFinite(term.principal) ? term.principal : 0, Number.isFinite(term.months) ? term.months : 0).total;
			summary.maturedReadyTotal += ready;
		}
	}

	summary.activePrincipalTotal = setup.hbsc.roundMoney(summary.activePrincipalTotal);
	summary.maturedReadyTotal = setup.hbsc.roundMoney(summary.maturedReadyTotal);
	return summary;
};

setup.hbsc.getFixedTermPenaltyRate = function (accountLevel, months, withdrawalKind) {
	const plan = setup.hbsc.getFixedTermPlan(months);
	if (!plan) return 0;

	const key = withdrawalKind === "half" ? "half" : "full";
	let penalty = plan.earlyPenalty[key];
	if (penalty == null) penalty = plan.earlyPenalty.full || 0;

	const tier = setup.hbsc.getSavingsTier(accountLevel);
	return Math.max(0, penalty - (tier.fixedTermFeeDiscount || 0));
};

setup.hbsc.getFixedTermById = function (id) {
	const V = State.variables;
	setup.hbsc.ensureState();
	return V.hbsc.fixedTerms.find(term => term && term.id === id) || null;
};

setup.hbsc.canHalfWithdraw = function (term) {
	if (!term || term.status !== "active") return false;
	const plan = setup.hbsc.getFixedTermPlan(term.months);
	if (!plan || plan.earlyPenalty.half == null) return false;
	return term.principal >= setup.hbsc.MIN_HALF_WITHDRAW_PRINCIPAL;
};

setup.hbsc.compoundInterestFromAER = function (principal, aerPercent, fractionOfYear) {
	if (!(principal > 0) || !(aerPercent > 0) || !(fractionOfYear > 0)) return 0;
	return principal * (Math.pow(1 + aerPercent / 100, fractionOfYear) - 1);
};

/* Simple (pro-rata) interest: the yearly rate, scaled straight down by the fraction of a year the money is held.  
   This is the model players expect:
   one month = yearly rate / 12.  e.g. 300,000 at 2.50% for 1 month = 625.
   (We keep compoundInterestFromAER above in case you ever want the strict
   "true AER" behaviour back; just swap the calls below.) */
setup.hbsc.simpleInterestFromAER = function (principal, aerPercent, fractionOfYear) {
	if (!(principal > 0) || !(aerPercent > 0) || !(fractionOfYear > 0)) return 0;
	return principal * (aerPercent / 100) * fractionOfYear;
};

setup.hbsc.calcSavingsMonthInterest = function (balance, accountLevel) {
	const tier = setup.hbsc.getSavingsTier(accountLevel);
	if (!(balance > 0) || balance < setup.hbsc.getSavingsMinimumBalance(accountLevel)) return 0;
	return setup.hbsc.simpleInterestFromAER(balance, tier.interestAER, 1 / 12);
};

setup.hbsc.calcFixedTermMaturity = function (principal, months) {
	const aer = setup.hbsc.getFixedTermAER(months, principal);
	const fraction = months / 12;
	const interest = setup.hbsc.simpleInterestFromAER(principal, aer, fraction);
	return {
		principal,
		months,
		aer,
		interest,
		total: principal + interest,
	};
};

setup.hbsc.calcFixedTermEarnedInterest = function (principal, months, elapsedDays) {
	const aer = setup.hbsc.getFixedTermAER(months, principal);
	const totalDays = Math.max(1, Math.round(months * 30));
	const boundedElapsed = Math.max(0, Math.min(elapsedDays || 0, totalDays));
	return setup.hbsc.simpleInterestFromAER(principal, aer, boundedElapsed / 365);
};

setup.hbsc.calcFixedTermEarlyWithdrawal = function (principal, months, elapsedDays, accountLevel, withdrawalKind) {
	const earnedInterest = setup.hbsc.calcFixedTermEarnedInterest(principal, months, elapsedDays);
	const penaltyRate = setup.hbsc.getFixedTermPenaltyRate(accountLevel, months, withdrawalKind);
	const penalty = earnedInterest * (penaltyRate / 100);
	const principalReturned = withdrawalKind === "half" ? principal / 2 : principal;
	const netInterest = Math.max(0, earnedInterest - penalty);

	return {
		principalReturned: setup.hbsc.roundMoney(principalReturned),
		earnedInterest: setup.hbsc.roundMoney(earnedInterest),
		penaltyRate,
		penalty: setup.hbsc.roundMoney(penalty),
		netInterest: setup.hbsc.roundMoney(netInterest),
		totalReturned: setup.hbsc.roundMoney(principalReturned + netInterest),
	};
};

setup.hbsc.processSavingsMonth = function () {
	const V = State.variables;
	setup.hbsc.ensureState();

	const delta = setup.hbsc.calcSavingsMonthInterest(V.hbsc.account.deposit, V.hbsc.account.level);
	if (!(delta > 0)) {
		V.hbsc.lastSavingsInterest = 0;
		return 0;
	}

	V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit + delta);
	V.hbsc.lastSavingsInterest = setup.hbsc.roundMoney(delta);
	V.hbsc.notices.push({
		type: "savingsInterest",
		day: Time.days,
		amount: V.hbsc.lastSavingsInterest,
		balance: V.hbsc.account.deposit,
	});
	return V.hbsc.lastSavingsInterest;
};

setup.hbsc.processDay = function () {
	const V = State.variables;
	setup.hbsc.ensureState();

	let maturedCount = 0;

	for (const term of V.hbsc.fixedTerms) {
		if (!term || term.status !== "active") continue;

		const totalDays = term.matureOnDay - term.createdOnDay;
		term.elapsedDays = Math.max(0, Math.min(Time.days - term.createdOnDay, totalDays));

		if (term.elapsedDays >= totalDays) {
			term.status = "matured";
			term.maturedOnDay = Time.days;
			const maturity = setup.hbsc.calcFixedTermMaturity(term.principal, term.months);
			term.maturityInterest = setup.hbsc.roundMoney(window.divineTfIncome(maturity.interest, "bankInterest"));
			term.maturityTotal = setup.hbsc.roundMoney(term.principal + term.maturityInterest);
			maturedCount++;
		}
	}

	/* A matured fixed term automatically transfers into the regular savings balance (overflowing to carried cash if the savings cap is reached).
	From this point the money is liquid again, so Bailey can detect it and collect it for rent.
	The term is then removed from the list. A notice is left for the bank journal so the player learns it matured. */
	if (maturedCount > 0) {
		const remaining = [];
		for (const term of V.hbsc.fixedTerms) {
			if (term && term.status === "matured") {
				const total = Number.isFinite(term.maturityTotal)
					? term.maturityTotal
					: setup.hbsc.roundMoney(setup.hbsc.calcFixedTermMaturity(term.principal, term.months).total);
				const moved = setup.hbsc.receiveExternalDeposit(total);
				V.hbsc.notices.push({
					type: "fixedTermMatured",
					id: term.id,
					day: Time.days,
					months: term.months,
					principal: term.principal,
					total,
					toDeposit: moved.toDeposit,
					toCash: moved.toCash,
				});
			} else {
				remaining.push(term);
			}
		}
		V.hbsc.fixedTerms = remaining;
	}

	setup.hbsc.processLoanDay();
	setup.hbsc.processCardDay();
	setup.hbsc.autoPayHotelRent();

	return maturedCount;
};

setup.hbsc.makeSavingsDeposit = function (amount) {
	const V = State.variables;
	setup.hbsc.ensureState();

	if (setup.hbsc.isBanned()) return { ok: false, reason: "banned", remaining: setup.hbsc.getBanRemainingDays() };
	if (V.hbsc.account.level < 1) return { ok: false, reason: "noAccount" };

	const requested = setup.hbsc.roundMoney(amount);
	if (!(requested > 0)) return { ok: false, reason: "invalidAmount" };
	if (V.money < requested) return { ok: false, reason: "insufficientMoney" };

	const room = setup.hbsc.getDepositRoom(V.hbsc.account.level, V.hbsc.account.deposit);
	if (room < requested) return { ok: false, reason: "depositLimit", availableRoom: room };

	V.money -= requested;
	V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit + requested);

	return { ok: true, amount: requested, balance: V.hbsc.account.deposit };
};

setup.hbsc.makeSavingsWithdrawal = function (amount) {
	const V = State.variables;
	setup.hbsc.ensureState();

	if (setup.hbsc.isBanned()) return { ok: false, reason: "banned", remaining: setup.hbsc.getBanRemainingDays() };
	if (V.hbsc.account.level < 1) return { ok: false, reason: "noAccount" };

	const requested = setup.hbsc.roundMoney(amount);
	if (!(requested > 0)) return { ok: false, reason: "invalidAmount" };
	if (V.hbsc.account.deposit < requested) return { ok: false, reason: "insufficientDeposit" };

	V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit - requested);
	V.money += requested;

	return { ok: true, amount: requested, balance: V.hbsc.account.deposit };
};

setup.hbsc.openFixedTerm = function (principal, months, source = "deposit") {
	const V = State.variables;
	setup.hbsc.ensureState();

	if (setup.hbsc.isBanned()) return { ok: false, reason: "banned", remaining: setup.hbsc.getBanRemainingDays() };
	if (V.hbsc.account.level < 1) return { ok: false, reason: "noAccount" };

	const plan = setup.hbsc.getFixedTermPlan(months);
	if (!plan) return { ok: false, reason: "invalidPlan" };

	const amount = setup.hbsc.roundMoney(principal);
	if (!(amount >= setup.hbsc.MIN_FIXED_TERM_OPEN)) return { ok: false, reason: "invalidAmount" };

	const aer = setup.hbsc.getFixedTermAER(months, amount);
	if (!(aer > 0)) return { ok: false, reason: "invalidBand" };

	/* Lock the money away.
	It leaves the source (cash or savings) and lives in the fixedTerms array until it matures, at which point processDay sweeps it back into savings.
	While locked it counts toward wealth/inflation (see inflation.bankFunds) but Bailey can't reach it for rent. */
	if (source === "money") {
		if (V.money < amount) return { ok: false, reason: "insufficientMoney" };
		V.money -= amount;
	} else if (source === "deposit") {
		if (V.hbsc.account.deposit < amount) return { ok: false, reason: "insufficientDeposit" };
		V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit - amount);
	} else {
		return { ok: false, reason: "invalidSource" };
	}

	const term = {
		id: `hbsc-ftd-${random(100000, 999999)}-${Time.days}`,
		principal: amount,
		months,
		aer,
		elapsedDays: 0,
		createdOnDay: Time.days,
		matureOnDay: Time.days + Math.max(1, Math.round(months * 30)),
		accountLevelAtOpen: V.hbsc.account.level,
		status: "active",
	};
	V.hbsc.fixedTerms.push(term);

	return { ok: true, amount, source, months, aer, term };
};

setup.hbsc.closeFixedTerm = function (id, withdrawalKind = "full", target = "deposit") {
	const V = State.variables;
	setup.hbsc.ensureState();

	const index = V.hbsc.fixedTerms.findIndex(term => term && term.id === id);
	if (index < 0) return { ok: false, reason: "notFound" };

	const term = V.hbsc.fixedTerms[index];
	let payout;
	let willClose = false;
	let remainingPrincipal = null;

	if (term.status === "matured") {
		if (withdrawalKind === "half") return { ok: false, reason: "halfNotAvailable" };
		const total = Number.isFinite(term.maturityTotal)
			? term.maturityTotal
			: setup.hbsc.roundMoney(setup.hbsc.calcFixedTermMaturity(term.principal, term.months).total);
		payout = {
			principalReturned: term.principal,
			earnedInterest: Number.isFinite(term.maturityInterest) ? term.maturityInterest : setup.hbsc.roundMoney(total - term.principal),
			penaltyRate: 0,
			penalty: 0,
			netInterest: Number.isFinite(term.maturityInterest) ? term.maturityInterest : setup.hbsc.roundMoney(total - term.principal),
			totalReturned: total,
		};
		willClose = true;
	} else {
		if (withdrawalKind === "half" && !setup.hbsc.canHalfWithdraw(term)) {
			return { ok: false, reason: "halfNotAvailable" };
		}

		payout = setup.hbsc.calcFixedTermEarlyWithdrawal(term.principal, term.months, term.elapsedDays, V.hbsc.account.level, withdrawalKind);

		if (withdrawalKind === "half") {
			remainingPrincipal = setup.hbsc.roundMoney(term.principal - payout.principalReturned);
			if (remainingPrincipal < setup.hbsc.MIN_REMAINING_FIXED_TERM_PRINCIPAL) return { ok: false, reason: "remainingPrincipalTooLow" };
		} else {
			willClose = true;
		}
	}

	if (target === "deposit") {
		const room = setup.hbsc.getDepositRoom(V.hbsc.account.level, V.hbsc.account.deposit);
		if (room < payout.totalReturned) {
			return { ok: false, reason: "depositCapExceeded", availableRoom: room, payout };
		}
	} else if (target !== "money") {
		return { ok: false, reason: "invalidTarget" };
	}

	if (target === "deposit") V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit + payout.totalReturned);
	else V.money += payout.totalReturned;

	if (term.status !== "matured" && withdrawalKind === "half") {
		term.principal = remainingPrincipal;
		term.elapsedDays = 0;
		term.createdOnDay = Time.days;
		term.matureOnDay = Time.days + Math.max(1, Math.round(term.months * 30));
		term.aer = setup.hbsc.getFixedTermAER(term.months, term.principal);
	} else if (willClose) {
		term.status = "closed";
		term.closedOnDay = Time.days;
		V.hbsc.fixedTerms.splice(index, 1);
	}

	return { ok: true, payout, term, target, closed: willClose };
};

/**
 * Receive money from an outside source (charity payout, NPC transfer, etc.) directly into the player's HBSC savings.
 *
 * @param {number} amount  Internal-currency amount to transfer.
 * @returns {{ok:boolean, toDeposit:number, toCash:number, overflow:boolean}}
 */
setup.hbsc.receiveExternalDeposit = function (amount) {
	const V = State.variables;
	setup.hbsc.ensureState();

	const requested = setup.hbsc.roundMoney(amount);
	if (!(requested > 0)) return { ok: false, toDeposit: 0, toCash: 0, overflow: false };

	if (V.hbsc.account.level < 1) {
		V.money += requested;
		return { ok: true, toDeposit: 0, toCash: requested, overflow: true };
	}

	const room = setup.hbsc.getDepositRoom(V.hbsc.account.level, V.hbsc.account.deposit);
	const toDeposit = Math.min(requested, Number.isFinite(room) ? room : requested);
	const toCash = requested - toDeposit;

	if (toDeposit > 0) {
		V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit + toDeposit);
	}
	if (toCash > 0) {
		V.money += toCash;
	}

	return { ok: true, toDeposit, toCash, overflow: toCash > 0 };
};

/* HBSC automatic payments */

/* The bills the bank is willing to handle. 
`id` is the key each bill's event code passes to canAutoPay()/tryAutoPay(). 
Array order = the order they appear on the management screen. */
setup.hbsc.AUTOPAY_BILLS = [
	{ id: "bailey", label: "Orphanage rent", blurb: "Bailey's weekly demand, including any childcare surcharge." },
	{ id: "farmGuard", label: "Farm tower guard wages", blurb: "The watchtower guard's outstanding wages." },
	{ id: "wrenSabotage", label: "Remy sabotage retainer", blurb: "Wren's fee to cripple Remy's next raid on the farm, settled after each attack." },
	{ id: "gamblingRing", label: "Gambling-ring upkeep", blurb: "Landry's weekly upkeep that keeps the cops away from the ring." },
	{ id: "hotelRent", label: "Seaspray Hotel room rent", blurb: "The front desk's weekly charge for room 112, including any arrears." },
];

setup.hbsc.getAutoPayBill = function (id) {
	return setup.hbsc.AUTOPAY_BILLS.find(b => b.id === id) || null;
};

/* Ensure the autoPay sub-object exists.  
Kept out of the main ensureState() so this file stays drop-in; every autoPay helper calls it first. */
setup.hbsc.ensureAutoPayState = function () {
	const V = State.variables;
	setup.hbsc.ensureState();
	if (V.hbsc.autoPay == null || typeof V.hbsc.autoPay !== "object") V.hbsc.autoPay = {};
	for (const bill of setup.hbsc.AUTOPAY_BILLS) {
		if (typeof V.hbsc.autoPay[bill.id] !== "boolean") V.hbsc.autoPay[bill.id] = false;
	}
	return V.hbsc.autoPay;
};

setup.hbsc.isAutoPayEnabled = function (id) {
	return setup.hbsc.ensureAutoPayState()[id] === true;
};

setup.hbsc.setAutoPay = function (id, on) {
	const auto = setup.hbsc.ensureAutoPayState();
	if (!setup.hbsc.getAutoPayBill(id)) return false;
	auto[id] = !!on;
	return auto[id];
};

setup.hbsc.toggleAutoPay = function (id) {
	return setup.hbsc.setAutoPay(id, !setup.hbsc.isAutoPayEnabled(id));
};

/* READ-ONLY check: would a standing order for `id` cover `amount` right now?
Use this to decide which path to show WITHOUT moving any money. */
setup.hbsc.canAutoPay = function (id, amount) {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	const due = setup.hbsc.roundMoney(amount);
	if (!(due > 0)) return false;
	if (V.hbsc.account.level < 1) return false;
	if (!setup.hbsc.isAutoPayEnabled(id)) return false;
	return V.hbsc.account.deposit >= due;
};

/* COMMIT a standing-order payment.  
This is what each bill's event code calls.  
If the order is enabled AND the deposit covers the full amount, the money is taken from savings and { paid:true } is returned.
Otherwise nothing is taken and { paid:false, reason } lets the caller fall back to the normal (cash / in-person) flow.
   reason: "invalidAmount" | "noAccount" | "disabled" | "insufficientDeposit" */
setup.hbsc.tryAutoPay = function (id, amount) {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();

	const result = { ok: false, paid: false, amount: 0, reason: "", balance: V.hbsc.account.deposit };
	const due = setup.hbsc.roundMoney(amount);

	if (!(due > 0)) {
		result.reason = "invalidAmount";
		return result;
	}
	if (V.hbsc.account.level < 1) {
		result.reason = "noAccount";
		return result;
	}
	if (!setup.hbsc.isAutoPayEnabled(id)) {
		result.reason = "disabled";
		return result;
	}
	if (V.hbsc.account.deposit < due) {
		result.reason = "insufficientDeposit";
		return result;
	}

	V.hbsc.account.deposit = setup.hbsc.roundMoney(V.hbsc.account.deposit - due);

	const bill = setup.hbsc.getAutoPayBill(id);
	V.hbsc.notices.push({
		type: "autoPay",
		day: Time.days,
		billId: id,
		label: bill ? bill.label : id,
		amount: due,
		balance: V.hbsc.account.deposit,
	});

	result.ok = true;
	result.paid = true;
	result.amount = due;
	result.balance = V.hbsc.account.deposit;
	return result;
};

/* Summarise autoPay notices, e.g. to greet the player at the branch with "your standing orders paid X across N payments since your last visit".
   Pass clear=true to remove the autoPay notices once you've shown them. */
setup.hbsc.summariseAutoPay = function (clear) {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	const summary = { count: 0, total: 0, byBill: {} };
	if (!Array.isArray(V.hbsc.notices)) return summary;

	for (const n of V.hbsc.notices) {
		if (!n || n.type !== "autoPay") continue;
		summary.count += 1;
		const amt = Number.isFinite(n.amount) ? n.amount : 0;
		summary.total += amt;
		const key = n.billId || "other";
		summary.byBill[key] = (summary.byBill[key] || 0) + amt;
	}
	summary.total = setup.hbsc.roundMoney(summary.total);

	if (clear) V.hbsc.notices = V.hbsc.notices.filter(n => !(n && n.type === "autoPay"));
	return summary;
};

setup.hbsc.cancelIfShort = function (id, amount) {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	const due = setup.hbsc.roundMoney(amount);
	if (!setup.hbsc.isAutoPayEnabled(id)) return false;
	if (V.hbsc.account.level < 1) return false;
	if (V.hbsc.account.deposit >= due) return false;

	setup.hbsc.setAutoPay(id, false);
	const bill = setup.hbsc.getAutoPayBill(id);
	V.hbsc.notices.push({
		type: "autoPayCancelled",
		day: Time.days,
		billId: id,
		label: bill ? bill.label : id,
		shortfall: due,
		balance: V.hbsc.account.deposit,
	});
	return true;
};

/* Weekly runner: call once per week from weekPassed() in time.js, before xchangeWeeklyCheck(). */
setup.hbsc.runStandingOrders = function () {
	setup.hbsc.ensureAutoPayState();
	setup.hbsc.autoPayFarmGuard();
	setup.hbsc.autoPayGamblingUpkeep();
};

/* Farm tower guard: clear the outstanding wages and run the same bookkeeping <<farm_guard_paid>> does, but on the persistent V.farm.tower_guard_skill (the guard NPC isn't loaded while away). */
setup.hbsc.autoPayFarmGuard = function () {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	if (!V.farm || !V.farm.tower_guard) return false;

	const unpaid = Number(V.farm.tower_guard_unpaid) || 0;
	if (unpaid < 1) return false;

	const baseOwed = setup.hbsc.roundMoney((Number(V.farm.tower_guard_wage) || 0) * unpaid);
	const owed = setup.inflation.spendPrice(baseOwed, "farm");
	const res = setup.hbsc.tryAutoPay("farmGuard", owed);
	if (!res.paid) {
		setup.hbsc.cancelIfShort("farmGuard", owed);
		return false;
	}

	const skill = Math.clamp((Number(V.farm.tower_guard_skill) || 0) + 20 * unpaid, 0, 1000);
	V.farm.tower_guard_skill = skill;
	V.farm.tower_guard_wage = 30000 + skill * 100;
	V.farm.tower_guard_unpaid = 0;
	/* Keep the stored guard in step, or the next in-person visit would recompute the wage from a stale skill and undo the raise. */
	if (V.per_npc && V.per_npc.farm_tower_guard && V.per_npc.farm_tower_guard.skills) {
		V.per_npc.farm_tower_guard.skills.security = skill;
	}
	return true;
};

/* Wren's Remy-sabotage retainer */
setup.hbsc.WREN_SABOTAGE_COST = 1500000; // £15,000 per attack cycle
setup.hbsc.autoPayWrenSabotage = function () {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	if (!V.farm || V.farm.wrenSabotage === undefined) return false;

	const due = setup.inflation.spendPrice(setup.hbsc.WREN_SABOTAGE_COST, "wrenSabotage");
	if (setup.hbsc.tryAutoPay("wrenSabotage", due).paid) {
		V.farm.wrenSabotage = 1;
		return true;
	}
	setup.hbsc.cancelIfShort("wrenSabotage", due);
	V.farm.wrenSabotage = 0;
	return false;
};

/* Seaspray Hotel room 112: the front desk charges every seven days, but only notices when the player walks through the lobby */
setup.hbsc.HOTEL_RENT_STAGES = [10000, 15000, 20000, 30000, 40000];
setup.hbsc.autoPayHotelRent = function () {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	if (!V.hotelRent) return false;
	if (!setup.hbsc.isAutoPayEnabled("hotelRent")) return false;
	const dayStarting = Time.days + 1;
	if (!(dayStarting >= V.hotelRent.due)) return false;

	const stage = Math.clamp((Number(V.hotelRent.stage) || 1) - 1, 0, 4);
	const amount = setup.hbsc.HOTEL_RENT_STAGES[stage];
	/* The desk's cash price runs through money(), which inflates "hotelRent"; charge savings the same. */
	const due = setup.inflation.spendPrice(amount + (Number(V.hotelRent.arrears) || 0), "hotelRent");
	if (!setup.hbsc.tryAutoPay("hotelRent", due).paid) {
		setup.hbsc.cancelIfShort("hotelRent", due);
		return false;
	}

	V.hotelRent.arrears = 0;
	V.hotelRent.due = dayStarting + 7;
	V.hotelRent.stage = Math.min((Number(V.hotelRent.stage) || 1) + 1, 5);
	return true;
};

setup.hbsc.autoPayGamblingUpkeep = function () {
	const V = State.variables;
	setup.hbsc.ensureAutoPayState();
	if (!V.xchange || !V.xchange.pubGamblingEnabled) return false;
	if (V.weekly && V.weekly.gamblingUpkeepPaid === 1) return false;

	const lvl = Math.clamp(Number(V.xchange.gamblingLvl) || 0, 0, 2);
	const baseDue = [200000, 400000, 1200000][lvl];
	const due = setup.inflation.spendPrice(baseDue, "pubGambling");
	const res = setup.hbsc.tryAutoPay("gamblingRing", due);
	if (!res.paid) {
		setup.hbsc.cancelIfShort("gamblingRing", due);
		return false;
	}

	if (V.weekly == null || typeof V.weekly !== "object") V.weekly = {};
	V.weekly.gamblingUpkeepPaid = 1;
	return true;
};

/*
 *    HBSC personal loan ("rent money").
 *    Borrowed in fixed chunks, capped by outstanding PRINCIPAL (not the interest-inflated balance).
 *    owed = principal * (1 + INTEREST), and repayments shrink owed (and thus principal) proportionally.
 *    Borrowed cash is neutral to the inflation calc (see inflation.js totalWealth()).
 *    If the player ignores the loan for a month, collection is handed to Bailey's rent (see rent.twee rentpay).
 *    All amounts are in pennies (raw $money units).
 */
setup.hbsc.LOAN_CHUNK = 30000000; // £300,000 advanced per request
setup.hbsc.LOAN_PRINCIPAL_MAX = 100000000; // £1,000,000 max outstanding principal
setup.hbsc.LOAN_INTEREST = 0.5; // repay 1.5x principal (£1,000 -> £1,500)
setup.hbsc.LOAN_RENT_SURCHARGE = 150000; // £1500/week collected via Bailey once overdue
setup.hbsc.LOAN_OVERDUE_DAYS = 25; // 25 in-game days with no payment

setup.hbsc.ensureLoanState = function () {
	const V = State.variables;
	if (V.hbsc == null || typeof V.hbsc !== "object") V.hbsc = {};
	if (V.hbsc.loan == null || typeof V.hbsc.loan !== "object") V.hbsc.loan = {};
	const loan = V.hbsc.loan;
	if (!Number.isFinite(loan.owed)) loan.owed = 0;
	loan.owed = setup.hbsc.roundMoney(loan.owed);
	if (!Number.isFinite(loan.lastPaymentDay)) loan.lastPaymentDay = Time.days;
	if (typeof loan.autoRepay !== "boolean") loan.autoRepay = false;
	if (typeof loan.baileyAnnouncePending !== "boolean") loan.baileyAnnouncePending = false;
	if (typeof loan.action !== "string") loan.action = "";
	return loan;
};

/* Outstanding borrowed principal (the part that counts against the lending limit). */
setup.hbsc.loanPrincipalOutstanding = function () {
	const loan = setup.hbsc.ensureLoanState();
	return setup.hbsc.roundMoney(loan.owed / (1 + setup.hbsc.LOAN_INTEREST));
};

/* How much can be advanced right now: the chunk size, capped to the remaining limit. */
setup.hbsc.loanBorrowable = function () {
	const remaining = setup.hbsc.LOAN_PRINCIPAL_MAX - setup.hbsc.loanPrincipalOutstanding();
	return Math.max(0, Math.min(setup.hbsc.LOAN_CHUNK, setup.hbsc.roundMoney(remaining)));
};

setup.hbsc.canBorrow = function () {
	if (setup.hbsc.isBanned && setup.hbsc.isBanned()) return false;
	return setup.hbsc.loanBorrowable() > 0;
};

/* Is there still an outstanding loan? */
setup.hbsc.hasLoan = function () {
	return setup.hbsc.ensureLoanState().owed > 0;
};

setup.hbsc.borrowLoan = function () {
	const V = State.variables;
	const loan = setup.hbsc.ensureLoanState();
	if (setup.hbsc.isBanned && setup.hbsc.isBanned()) return { ok: false, reason: "banned" };
	const amount = setup.hbsc.loanBorrowable();
	if (!(amount > 0)) return { ok: false, reason: "limit" };

	loan.owed = setup.hbsc.roundMoney(loan.owed + amount * (1 + setup.hbsc.LOAN_INTEREST));
	loan.lastPaymentDay = Time.days; // borrowing (re)starts the overdue clock
	if (typeof statChange !== "undefined" && statChange.money) statChange.money(amount, "bankLoan");
	else V.money += amount;
	return { ok: true, amount, owed: loan.owed };
};

setup.hbsc.repayLoan = function (amount) {
	const V = State.variables;
	const loan = setup.hbsc.ensureLoanState();
	let pay = setup.hbsc.roundMoney(amount);
	pay = Math.min(pay, loan.owed, V.money);
	if (!(pay > 0)) return { ok: false, reason: "invalid", paid: 0, owed: loan.owed };

	if (typeof statChange !== "undefined" && statChange.money) statChange.money(-pay, "bankLoan");
	else V.money -= pay;
	loan.owed = setup.hbsc.roundMoney(loan.owed - pay);
	loan.lastPaymentDay = Time.days;
	if (loan.owed <= 0) {
		loan.owed = 0;
		loan.autoRepay = false;
		loan.baileyAnnouncePending = false;
	}
	return { ok: true, paid: pay, owed: loan.owed };
};

setup.hbsc.loanRentSurchargeAmount = function () {
	if (typeof setup !== "undefined" && setup.inflation && setup.inflation.setting) {
		return setup.inflation.setting("inflationLoanRentSurcharge");
	}
	if (typeof State === "undefined" || !State.variables || !State.variables.settings) return setup.hbsc.LOAN_RENT_SURCHARGE;
	const amount = Number(State.variables.settings.inflationLoanRentSurcharge);
	if (!Number.isFinite(amount)) return setup.hbsc.LOAN_RENT_SURCHARGE;
	return Math.min(Math.max(Math.round(amount), 50000), 300000);
};

setup.hbsc.loanRentSurcharge = function () {
	const loan = setup.hbsc.ensureLoanState();
	if (!loan.autoRepay || loan.owed <= 0) return 0;
	return Math.min(setup.hbsc.loanRentSurchargeAmount(), loan.owed);
};

setup.hbsc.collectLoanFromRent = function (amount) {
	const loan = setup.hbsc.ensureLoanState();
	const collected = Math.min(setup.hbsc.roundMoney(amount), loan.owed);
	if (collected <= 0) return 0;
	loan.owed = setup.hbsc.roundMoney(loan.owed - collected);
	loan.lastPaymentDay = Time.days;
	if (loan.owed <= 0) {
		loan.owed = 0;
		loan.autoRepay = false;
		loan.baileyAnnouncePending = false;
	}
	return collected;
};

setup.hbsc.processLoanDay = function () {
	const loan = setup.hbsc.ensureLoanState();
	if (loan.owed > 0 && !loan.autoRepay && Time.days - loan.lastPaymentDay >= setup.hbsc.LOAN_OVERDUE_DAYS) {
		loan.autoRepay = true;
		loan.baileyAnnouncePending = true;
	}
};

// Card
setup.hbsc.CARD_REPLACEMENT_DAYS = 14;
setup.hbsc.CARD_REPLACEMENT_FEE = 1000;
setup.hbsc.cardSources = new Set([
	"supermarket",
	"shopping",
	"clothes",
	"cafe",
	"pub",
	"arcade",
	"bus",
	"furniture",
	"hairdressers",
	"tailor",
	"tattoo",
	"toyShop",
	"pharmacy",
	"pharmacyBreastPump",
	"pharmacyPregnancyTest",
	"pharmacyCream",
	"pharmacyLube",
	"pharmacyXChange",
	"pharmacyContacts",
	"pharmacyAfterPill",
	"pharmacyCondoms",
	"libraryBooks",
	"danceStudioSubscription",
	"danceStudioLessons",
	"mmaGymLessons",
	"hospitalDanceInjury",
	"hospitalPaternityTest",
	"hospitalBreastReduction",
	"hospitalBreastEnlargement",
	"hospitalPenisReduction",
	"hospitalPenisEnlargement",
	"hospitalTattooRemoval",
	"hospitalParasiteRemoval",
	"childbirthEpidural",
]);

setup.hbsc.theftPresets = {
	easy: { min: 1, max: 10, chance: 1, weekly: 25 },
	normal: { min: 1, max: 25, chance: 5, weekly: 100 },
	hard: { min: 10, max: 50, chance: 15, weekly: 250 },
};

setup.hbsc.setTheftPreset = function (name) {
	const preset = setup.hbsc.theftPresets[name];
	if (!preset) return;
	const V = State.variables;
	V.npcStealMoneyToggle = 1;
	V.npcStealMoneyRandomToggle = 1;
	V.npcStealMoneyMin = preset.min;
	V.npcStealMoneyMax = preset.max;
	V.npcStealCardChance = preset.chance;
	V.npcStealCardWeeklyLimit = preset.weekly;
};

setup.hbsc.stolenCashAmount = function () {
	const V = State.variables;
	const min = Math.clamp(V.npcStealMoneyMin ?? 1, 1, 100);
	const max = Math.clamp(V.npcStealMoneyMax ?? 25, 1, 100);
	const percentage = V.npcStealMoneyRandomToggle === 1 ? random(Math.min(min, max), Math.max(min, max)) : Math.clamp(V.npcStealMoneyPercentage ?? 10, 1, 100);
	return Math.min(V.money, Math.floor((V.money * percentage) / 100));
};

setup.hbsc.cardBalance = function (source) {
	const bank = State.variables.hbsc;
	if (!setup.hbsc.cardSources.has(source) || bank?.account?.level < 1 || !bank?.card?.preferred || bank.card.status !== "active") return 0;
	return bank.account.deposit;
};

setup.hbsc.paymentBalance = function (source) {
	return Math.max(State.variables.money, setup.hbsc.cardBalance(source));
};

setup.hbsc.issueCard = function () {
	const bank = State.variables.hbsc;
	if (!bank || bank.account.level < 1 || setup.hbsc.isBanned() || bank.card) return false;
	bank.card = { status: "active", preferred: true, losses: 0 };
	return true;
};

setup.hbsc.stealCard = function () {
	const V = State.variables;
	const card = V.hbsc?.card;
	if (V.npcStealMoneyToggle !== 1 || V.hbsc?.account?.level < 1 || card?.status !== "active") return false;
	if (random(1, 100) > Math.clamp(V.npcStealCardChance ?? 5, 0, 100)) return false;
	card.status = "stolen";
	card.stolenDay = Math.floor(Time.date.timeStamp / 86400);
	card.lastChargeDay = card.stolenDay;
	card.weekSpent = 0;
	card.week = 0;
	card.losses = 0;
	return true;
};

setup.hbsc.processCardDay = function () {
	const V = State.variables;
	const card = V.hbsc?.card;
	const today = Math.floor(Time.date.timeStamp / 86400);
	if (card?.status !== "stolen" || card.lastChargeDay >= today) return;
	// Anchor each seven-day allowance to the theft, so changing calendar weeks cannot double it.
	for (let day = card.lastChargeDay + 1; day <= today; day++) {
		const week = Math.floor((day - card.stolenDay - 1) / 7);
		if (card.week !== week) {
			card.week = week;
			card.weekSpent = 0;
		}
		if (V.npcStealMoneyToggle !== 1 || V.hbsc.account.level < 1) continue;
		const limit = Math.clamp(V.npcStealCardWeeklyLimit ?? 100, 0, 1000) * 100;
		const amount = Math.min(random(100, 2000), Math.max(0, limit - card.weekSpent), V.hbsc.account.deposit);
		if (amount > 0) {
			V.hbsc.account.deposit -= amount;
			card.weekSpent += amount;
			card.losses += amount;
			statChange.money(-amount, "stolenMoney", { recordOnly: true });
		}
	}
	card.lastChargeDay = today;
};

setup.hbsc.reportCard = function () {
	const card = State.variables.hbsc?.card;
	if (card?.status !== "stolen") return false;
	card.status = "blocked";
	delete card.stolenDay;
	delete card.lastChargeDay;
	delete card.weekSpent;
	delete card.week;
	return true;
};

setup.hbsc.orderReplacementCard = function () {
	const V = State.variables;
	const bank = V.hbsc;
	if (bank?.card?.status !== "blocked" || bank.account.level < 1 || setup.hbsc.isBanned()) return false;
	const fee = setup.hbsc.CARD_REPLACEMENT_FEE;
	if (bank.account.deposit >= fee) bank.account.deposit -= fee;
	else if (V.money >= fee) V.money -= fee;
	else return false;
	statChange.money(-fee, "bankCard", { recordOnly: true });
	bank.card.status = "replacement";
	bank.card.readyDay = Time.days + setup.hbsc.CARD_REPLACEMENT_DAYS;
	return true;
};

setup.hbsc.collectReplacementCard = function () {
	const bank = State.variables.hbsc;
	if (bank?.card?.status !== "replacement" || bank.card.readyDay > Time.days || bank.account.level < 1 || setup.hbsc.isBanned()) return false;
	bank.card.status = "active";
	delete bank.card.readyDay;
	return true;
};
