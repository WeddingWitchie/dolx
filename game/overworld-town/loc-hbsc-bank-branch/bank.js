setup.hbsc = setup.hbsc || {};

setup.hbsc.savingsTiers = {
	1: { name: "Basic", depositLimit: 500000000, interestAER: 2.50, minimumBalance: 0, fixedTermFeeDiscount: 0 },
	2: { name: "Silver", depositLimit: 2500000000, interestAER: 2.00, minimumBalance: 100000000, fixedTermFeeDiscount: 0 },
	3: { name: "Gold", depositLimit: 10000000000, interestAER: 1.25, minimumBalance: 1000000000, fixedTermFeeDiscount: 0, priorityService: true },
	4: { name: "Platinum", depositLimit: 50000000000, interestAER: 0.75, minimumBalance: 5000000000, fixedTermFeeDiscount: 5 },
	5: { name: "Black", depositLimit: Infinity, interestAER: 0.25, minimumBalance: 25000000000, fixedTermFeeDiscount: 10 }
};

setup.hbsc.fixedTermPlans = {
	1: {
		months: 1,
		bands: [{ min: 10000, max: Infinity, aer: 2.50 }],
		earlyPenalty: { full: 20 }
	},
	3: {
		months: 3,
		bands: [{ min: 10000, max: Infinity, aer: 3.25 }],
		earlyPenalty: { full: 30 }
	},
	6: {
		months: 6,
		bands: [
			{ min: 10000, max: 999999900, aer: 3.75 },
			{ min: 1000000000, max: 4999999900, aer: 4.25 },
			{ min: 5000000000, max: 9999999900, aer: 5.00 },
			{ min: 10000000000, max: Infinity, aer: 6.00 }
		],
		earlyPenalty: { half: 25, full: 40 }
	},
	12: {
		months: 12,
		bands: [
			{ min: 10000, max: 999999900, aer: 5.50 },
			{ min: 1000000000, max: 4999999900, aer: 6.25 },
			{ min: 5000000000, max: 9999999900, aer: 7.25 },
			{ min: 10000000000, max: Infinity, aer: 8.50 }
		],
		earlyPenalty: { half: 30, full: 50 }
	}
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
	return `<input id="${setup.hbsc.escapeHtml(id)}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${setup.hbsc.escapeHtml(displayValue)}">`;
};

setup.hbsc.submitAmountFromField = function (fieldId, mode, targetPassage) {
	const V = State.variables;
	setup.hbsc.ensureState();
	const raw = setup.hbsc.captureFieldValue(fieldId);
	if (mode === "fixedTerm") {
		V.hbsc.ftAmountInput = raw;
		V.hbsc.ftAmount = setup.hbsc.parseMoneyInput(raw);
	}
	else {
		V.hbsc.transactionInput = raw;
		V.hbsc.transactionAmount = setup.hbsc.parseMoneyInput(raw);
	}
	Engine.play(targetPassage);
	return false;
};

setup.hbsc.makeActionLink = function (label, fieldId, mode, targetPassage) {
	const safeLabel = setup.hbsc.escapeHtml(label);
	return `<a href="javascript:void(0)" onclick="return setup.hbsc.submitAmountFromField(${JSON.stringify(fieldId)}, ${JSON.stringify(mode)}, ${JSON.stringify(targetPassage)});">${safeLabel}</a>`;
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
	const penalty = setup.hbsc.roundMoney(V.hbsc.account.deposit * 0.10);
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
		banUntilDay: V.hbsc.banUntilDay
	});
	result.applied = true;
	result.penalty = penalty;
	result.banDays = setup.hbsc.getBanRemainingDays();
	return result;
};

setup.hbsc.captureFieldValue = function (id) {
	if (typeof document === "undefined" || !id) return "";

	const readValue = (el) => {
		if (!el) return "";
		return typeof el.value === "string" ? el.value : String(el.value ?? "");
	};

	const passages = document.getElementById("passages");
	if (passages) {
		const escaped = (typeof CSS !== "undefined" && typeof CSS.escape === "function") ? CSS.escape(id) : id;
		const matches = passages.querySelectorAll(`#${escaped}`);
		for (let i = matches.length - 1; i >= 0; i--) {
			const el = matches[i];
			if (el && el.isConnected) return readValue(el);
		}
	}

	return readValue(document.getElementById(id));
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
};

setup.hbsc.getSavingsTier = function (level) {
	return setup.hbsc.savingsTiers[level] || setup.hbsc.savingsTiers[1];
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
		maturedReadyTotal: 0
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
		maturedReadyTotal: 0
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
				: setup.hbsc.calcFixedTermMaturity(
					Number.isFinite(term.principal) ? term.principal : 0,
					Number.isFinite(term.months) ? term.months : 0
				).total;
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
	return principal * (Math.pow(1 + (aerPercent / 100), fractionOfYear) - 1);
};

setup.hbsc.calcSavingsMonthInterest = function (balance, accountLevel) {
	const tier = setup.hbsc.getSavingsTier(accountLevel);
	if (!(balance > 0) || balance < (tier.minimumBalance || 0)) return 0;
	return setup.hbsc.compoundInterestFromAER(balance, tier.interestAER, 1 / 12);
};

setup.hbsc.calcFixedTermMaturity = function (principal, months) {
	const aer = setup.hbsc.getFixedTermAER(months, principal);
	const fraction = months / 12;
	const interest = setup.hbsc.compoundInterestFromAER(principal, aer, fraction);
	return {
		principal,
		months,
		aer,
		interest,
		total: principal + interest
	};
};

setup.hbsc.calcFixedTermEarnedInterest = function (principal, months, elapsedDays) {
	const aer = setup.hbsc.getFixedTermAER(months, principal);
	const totalDays = Math.max(1, Math.round(months * 30));
	const boundedElapsed = Math.max(0, Math.min(elapsedDays || 0, totalDays));
	return setup.hbsc.compoundInterestFromAER(principal, aer, boundedElapsed / 365);
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
		totalReturned: setup.hbsc.roundMoney(principalReturned + netInterest)
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
		balance: V.hbsc.account.deposit
	});
	return V.hbsc.lastSavingsInterest;
};

setup.hbsc.processDay = function () {
	const V = State.variables;
	setup.hbsc.ensureState();

	let maturedCount = 0;

	for (const term of V.hbsc.fixedTerms) {
		if (!term || term.status !== "active") continue;

		term.elapsedDays = Math.max(term.elapsedDays, Time.days - term.createdOnDay);
		if (term.elapsedDays < term.matureOnDay - term.createdOnDay) {
			term.elapsedDays += 1;
		}

		if (term.elapsedDays >= term.matureOnDay - term.createdOnDay) {
			term.elapsedDays = term.matureOnDay - term.createdOnDay;
			term.status = "matured";
			term.maturedOnDay = Time.days;
			const maturity = setup.hbsc.calcFixedTermMaturity(term.principal, term.months);
			term.maturityInterest = setup.hbsc.roundMoney(maturity.interest);
			term.maturityTotal = setup.hbsc.roundMoney(maturity.total);
			V.hbsc.notices.push({
				type: "fixedTermMatured",
				id: term.id,
				day: Time.days,
				months: term.months,
				principal: term.principal,
				total: term.maturityTotal
			});
			maturedCount++;
		}
	}

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

	if (source === "money") {
		if (V.money < amount) return { ok: false, reason: "insufficientMoney" };
		V.money -= amount;
	}
	else if (source === "deposit") {
		if (V.hbsc.account.deposit < amount) return { ok: false, reason: "insufficientDeposit" };
		V.hbsc.account.deposit -= amount;
	}
	else {
		return { ok: false, reason: "invalidSource" };
	}

	const term = {
		id: `hbsc-ftd-${random(100000, 999999)}-${Time.days}`,
		principal: amount,
		months,
		aer,
		status: "active",
		elapsedDays: 0,
		createdOnDay: Time.days,
		matureOnDay: Time.days + Math.max(1, Math.round(months * 30)),
		accountLevelAtOpen: V.hbsc.account.level,
		source
	};

	V.hbsc.fixedTerms.push(term);

	return {
		ok: true,
		term,
		maturity: setup.hbsc.calcFixedTermMaturity(amount, months)
	};
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
		const total = Number.isFinite(term.maturityTotal)
			? term.maturityTotal
			: setup.hbsc.roundMoney(setup.hbsc.calcFixedTermMaturity(term.principal, term.months).total);
		payout = {
			principalReturned: term.principal,
			earnedInterest: Number.isFinite(term.maturityInterest) ? term.maturityInterest : setup.hbsc.roundMoney(total - term.principal),
			penaltyRate: 0,
			penalty: 0,
			netInterest: Number.isFinite(term.maturityInterest) ? term.maturityInterest : setup.hbsc.roundMoney(total - term.principal),
			totalReturned: total
		};
		willClose = true;
	}
	else {
		if (withdrawalKind === "half" && !setup.hbsc.canHalfWithdraw(term)) {
			return { ok: false, reason: "halfNotAvailable" };
		}

		payout = setup.hbsc.calcFixedTermEarlyWithdrawal(
			term.principal,
			term.months,
			term.elapsedDays,
			V.hbsc.account.level,
			withdrawalKind
		);

		if (withdrawalKind === "half") {
			remainingPrincipal = setup.hbsc.roundMoney(term.principal - payout.principalReturned);
			if (remainingPrincipal < setup.hbsc.MIN_REMAINING_FIXED_TERM_PRINCIPAL) return { ok: false, reason: "remainingPrincipalTooLow" };
		}
		else {
			willClose = true;
		}
	}

	if (target === "deposit") {
		const room = setup.hbsc.getDepositRoom(V.hbsc.account.level, V.hbsc.account.deposit);
		if (room < payout.totalReturned) {
			return { ok: false, reason: "depositCapExceeded", availableRoom: room, payout };
		}
	}
	else if (target !== "money") {
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
	}
	else if (willClose) {
		term.status = "closed";
		term.closedOnDay = Time.days;
		V.hbsc.fixedTerms.splice(index, 1);
	}

	return { ok: true, payout, term, target, closed: willClose };
};
