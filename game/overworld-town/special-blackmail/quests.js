/* globals playerMayBeSpiked, blackmailGiveDaisies, blackmailGrantStall, hasSexStat, playerCannotSelfClimax */
// All quests part from the assumption that PC starts their day at the orphanage
function blackmailReward(rentShare = 1, scaleIncome = true) {
	let rent = Number(V.rentmoney) || 0;
	// Bailey's added rent pressure, especially the uncapped Relentless version, must not turn Club tasks into an escalating income source.
	if (setup.inflation?.rentBaseWithModifiers && Number.isFinite(V.rentstage)) {
		const baseRents = [10000, 30000, 50000, 70000, 100000, 150000, 200000];
		rent = setup.inflation.rentBaseWithModifiers(baseRents[Math.clamp(Math.floor(V.rentstage) - 1, 0, 6)]);
	}
	const rewardPercent = scaleIncome && setup.inflation?.setting ? setup.inflation.setting("inflationBlackmailRewardPct") : 100;
	return Math.round(rent * (Number(rentShare) || 0) * 5 * (rewardPercent / 100));
}
window.blackmailReward = blackmailReward;

const blackmailQuests = {
	low: [],
	mid: [],
	high: [],
	template: [
		{
			id: 1,
			prerequisites() {
				return true;
			},
			reward() {
				return blackmailReward();
			},
			instructions: [". Complete this task before midnight."],
			clearCondition() {
				return true;
			},
			failCondition() {
				return false;
			},
			alertMessage: ``,
			clearCheck() {
				if (this.clearCondition()) {
					this.cleared = true;
				}
			},
			failCheck() {
				if (this.failCondition()) {
					this.failed = true;
				}
			},
			cleared: false,
			failed: false,
			failMessage() {},
			includesItems: false,
			receiveItems() {},
			onDayCleared() {},
			onDayFailed() {},
		},
	],
};
window.blackmailQuests = blackmailQuests;

/// ##################################################################################
/// ################################# QUEST LIST #####################################
/// ##################################################################################

blackmailQuests.low.push(
	// Generic wear no underwear
	{
		id: 1, // Implemented
		summary: "Wear no underwear until midnight.",
		prerequisites() {
			/*
				Swimsuits count as underwear for this task. 
				On schooldays, that can make swimming lessons impossible for PCs whose exhibitionism is too low to swim naked.
				Only offer this demand on schooldays once the PC can handle nude swimming.
			*/
			return !Time.schoolDay || hasSexStat("exhibitionism", 4);
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"Wear no underwear today.",
			"You may not put on any upper or lower underwear.",
			"Swimsuits and leotards will still count as underwear for the purposes of this task.",
			`<span class="red">Wearing any piece at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition() {
			return true;
		},
		failCondition() {
			return (V.worn.under_upper.name !== "naked" || V.worn.under_lower.name !== "naked") && !V.xchange.blackmail.gracePeriod;
		},
		alertMessage: `You're wearing underwear items. Passing time will result in task failure.`,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
				this.worn = clone(V.worn);
			}
		},
		cleared: true,
		failed: false,
		failMessage() {
			if (!this.worn) return;
			let clothing = "";
			if (this.worn?.under_upper.name !== "naked" && this.worn?.under_lower.name !== "naked")
				clothing = `${this.worn.under_upper.name} and ${this.worn.under_lower.name}`;
			else if (this.worn?.under_upper.name !== "naked") clothing = clone(this.worn.under_upper.name);
			else clothing = clone(this.worn.under_lower.name);

			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.low.push(
	// Drink and get wasted
	{
		id: 2, // Implemented
		summary: "Get wasted before midnight.",
		// A knowingly-pregnant PC refuses all alcohol, making "get wasted" impossible. Don't assign it.
		prerequisites() {
			return !(playerIsPregnant() && playerAwareTheyArePregnant());
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: ["Go drink and get wasted.", "You can do so at the pub, but it's not mandatory.", "Complete this task before midnight."],
		clearCondition() {
			return V.drunk >= 480;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.mid.push(
	// Take a pill and flirt with 3 people
	{
		id: 3, // Implemented. ID fixed. Do not alter value.
		summary: "Flirt with three people at the pub before midnight.",
		prerequisites() {
			return !playerIsXChanged();
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Take this pill we've happily provided for you on this envelope.",
			"You're not allowed to test this pill's effects.",
			"Afterwards, go flirt with at least 3 people at the pub.",
			"Getting approached and hit on doesn't count, so you may ignore those people.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.tookPill && this.flirtCount >= 3;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			} else if (this.pillLanded && V.xchange.pill.active && V.xchange.pill.effectsKnown) {
				this.failed = true;
			}
		},
		flirtCount: 0,
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: true,
		tookPill: false,
		pillLanded: false,
		receiveItems() {
			// See quest 13/14/16:
			// a no-op spike (e.g. the player took and identified an unrelated pill between assignment and opening this envelope)
			// must not arm the pill-test fail off a pill this quest never actually landed.
			const landed = playerMayBeSpiked();
			if (V.player.sex === "m") {
				wikifier("xchange-pink", 1, "spike", "passion");
				wikifier("drugs", 1000);
			} else {
				wikifier("xchange-blue", 1, "spike", "passion");
				wikifier("drugs", 1000);
			}
			this.tookPill = true;
			this.pillLanded = landed;
		},
		onDayCleared() {
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed() {},
	}
);

blackmailQuests.high.push(
	// Masturbate in an empty classroom
	{
		id: 4, // Implemented. ID fixed. Do not alter value.
		summary: "Masturbate for five uninterrupted minutes in an empty classroom before midnight.",
		prerequisites() {
			return Time.schoolDay || (V.historytrait >= 1 && V.parktunnelintro >= 1) || currentSkillValue("skulduggery") >= 200;
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Masturbate naked for 5 minutes, within an empty classroom.",
			`<span class="red">If you stop before the exact 5 minutes have lapsed, you must start over.</span>`,
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.masturbationtimer >= 30;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {},
		onDayFailed() {},
		masturbationtimer: 0,
	}
);

blackmailQuests.mid.push(
	// Skinny dip into the school's pool
	{
		id: 5, // Implemented
		summary: "Swim naked in the school pool before midnight.",
		prerequisites() {
			return Time.schoolDay || (V.historytrait >= 1 && V.parktunnelintro >= 1) || currentSkillValue("skulduggery") >= 200;
		},
		reward() {
			return blackmailReward();
		},
		instructions: ["Swim in the school's pool while naked.", "Complete this task before midnight."],
		clearCondition() {
			return this.swamNaked;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed() {},
		swamNaked: false,
	}
);

blackmailQuests.low.push(
	// Go for a run in your underwear at park
	{
		id: 6, // Implemented.
		summary: "Run at the park in your underwear for thirty minutes before midnight.",
		prerequisites() {
			return true;
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Go for a run at the park in your underwear. Spend at least 30 minutes on this activity.",
			"We recommend you wait until 9PM before doing so.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.timeSpent >= 30;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 100;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
		timeSpent: 0,
	}
);

blackmailQuests.mid.push(
	// Go for a run naked at park
	{
		id: 7, // Implemented.
		summary: "Run naked at the park for an hour before midnight.",
		prerequisites() {
			return true;
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Go for a run at the park while naked. Spend at least 1 hour on this activity.",
			"We recommend you wait until 9PM before doing so.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.timeSpent >= 60;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 200;
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed() {},
		timeSpent: 0,
	}
);

blackmailQuests.low.push(
	// Take a pill and wear a skirt
	{
		id: 8, // Implemented
		summary: "Wear a skirt, or no lowerwear at all, until midnight.",
		prerequisites() {
			return V.player.sex === "m" && !playerIsXChanged();
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"Take the pill we've included in this envelope.",
			"You're not allowed to test its effects.",
			"You will also either wear the skirt we've provided, or any other if you have one available.",
			"No other piece of lowerwear will be acceptable.",
			"You may also choose to not wear any lowerwear at all (meaning swimsuits at the pool are a-okay)",
			`<span class="red">Wearing any piece of lowerwear other than a skirt at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition() {
			return this.tookPill;
		},
		failCondition() {
			return !wornSetupClothes("lower").skirt && V.worn.lower.name !== "naked" && !V.xchange.blackmail.gracePeriod;
		},
		alertMessage: `You're wearing a non-skirt lowerwear item. Passing time will result in task failure.`,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
				this.worn = clone(V.worn);
			} else if (this.pillLanded && V.xchange.pill.active && V.xchange.pill.effectsKnown) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {
			if (!this.worn) return;
			const clothing = clone(this.worn.lower.name);
			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: true,
		tookPill: false,
		pillLanded: false,
		receiveItems() {
			// See quest 13/14/16: a no-op spike must not arm the pill-test fail off a pill this quest never landed.
			const landed = playerMayBeSpiked();
			wikifier("generalWear", "lower", 27, "black");
			wikifier("xchange-pink", 1, "spike");
			this.tookPill = true;
			this.pillLanded = landed;
		},
		onDayCleared() {
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.low.push(
	// Clean 3 chalets in uniform without underwear
	{
		id: 9, // Implemented
		summary: "Clean three chalets at the beach in uniform, without underwear, before midnight.",
		prerequisites() {
			return Time.hour < 17;
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"Go clean 3 challets at the beach.",
			"Wear either a maid dress or a butler suit while doing so.",
			"We've included an outfit with this envelope for your convenience.",
			"You're not allowed underwear while wearing your uniform.",
			`<span class="red">If you wear underwear with your uniform you will fail automatically.</span>`,
			"You only need to wear your uniform while cleaning the chalets.",
			"Cleaning a chalet without your uniform will not count.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.chaletsCleaned >= 3;
		},
		failCondition() {
			return this.woreUnderwear;
		},
		woreUnderwear: false,
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		chaletsCleaned: 0,
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: true,
		receiveItems() {
			if (V.player.sex === "m") {
				wikifier("generalWear", "upper", "waiter's shirt");
				wikifier("generalWear", "lower", "suit trousers", "black");
			} else if (V.player.sex === "f") {
				wikifier("generalWear", "upper", "maid dress");
			}
			wikifier("generalWear", "handheld", "feather duster");
			wikifier("updatesidebarimg");
		},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.mid.push(
	// Avoid defiance for a day
	{
		id: 10, // Implemented
		summary: "Avoid behaving defiantly until midnight.",
		prerequisites() {
			return V.submissive <= 850;
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Since you're so strong-willed and prideful, we want to teach you how to be more honest with yourself.",
			"To that end, we won't allow you to behave defiantly today.",
			"That means, no violence. Do not be a brat.",
			"Do this until midnight and we'll consider you successful.",
		],
		clearCondition() {
			return true;
		},
		failCondition() {
			return this.behavedDefiantly;
		},
		behavedDefiantly: false,
		alertMessage: `You just acted defiantly.`,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed() {},
	}
);

blackmailQuests.low.push(
	// Wear no shirt if male
	{
		id: 11, // Implemented
		summary: "Wear nothing on your torso outside school until midnight.",
		prerequisites() {
			return V.player.sex === "m";
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"You're not allowed to wear a shirt today, nor any other clothing that covers your torso.",
			"You may only cover your torso if you're within school grounds (does not include its pool).",
			"The previous exemption only applies on schooldays.",
			`<span class="red">Wearing any torso-covering piece outside of school at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition() {
			return true;
		},
		failCondition() {
			return (
				(V.worn.under_upper.name !== "naked" || V.worn.upper.name !== "naked") &&
				(V.location !== "school" || !Time.schoolDay) &&
				!V.xchange.blackmail.gracePeriod
			);
		},
		alertMessage: `You're wearing torso-covering items. Passing time will result in task failure.`,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
				this.worn = clone(V.worn);
			}
		},
		cleared: true,
		failed: false,
		failMessage() {
			if (!this.worn) return;
			let clothing = "";
			if (this.worn?.under_upper.name !== "naked" && this.worn?.upper.name !== "naked") clothing = `${this.worn.upper.name} and ${this.worn.under_upper.name}`;
			else if (this.worn?.under_upper.name !== "naked") clothing = clone(this.worn.under_upper.name);
			else clothing = clone(this.worn.upper.name);

			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.low.push(
	// Flash your underwear to at least 5 strangers
	{
		id: 12,
		summary: "Flash five strangers on the street before midnight.",
		prerequisites() {
			return hasSexStat("exhibitionism", 2);
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"Flash at least 5 strangers on the street.",
			"We recommend you visit Connudatus Street to do this task.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.flashedPeople >= 5;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		flashedPeople: 0,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.low.push(
	// Sell flowers on a market stall, without any lower clothing (undies allowed)
	{
		id: 13,
		summary: "Sell flowers at your market stall on Connudatus Street, without lowerwear, before midnight.",
		prerequisites() {
			return Time.dayState === "dawn" && !playerIsXChanged();
		},
		reward() {
			return blackmailReward(1 / 3);
		},
		instructions: [
			"Swallow the pill we've provided, and take these 200 flowers to sell.",
			"Go sell flowers on Connudatus Street. <span class='green'>We've already settled today's stall rent for you.</span>",
			"If you sell over <<printmoney 25000>> in profits, we will boost your business fame on top of your normal payment.",
			`<span class="red">You're not allowed to test the effects of the pill</span>`,
			"Any sale made while wearing lowerwear (undies permited) won't be counted for your goal.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.tookPill && this.soldFlowers;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			} else if (this.pillLanded && V.xchange.pill.active && V.xchange.pill.effectsKnown) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: true,
		tookPill: false,
		pillLanded: false,
		soldFlowers: false,
		profit: 0,
		receiveItems() {
			// The spike no-ops when the player can't be spiked (noncon spiking disabled, therapy, pregnancy); only a landed spike can be "tested", so only that may fail.
			const landed = playerMayBeSpiked();
			blackmailGiveDaisies(200);
			blackmailGrantStall();
			wikifier("xchange-random-spike", "suppress");
			this.tookPill = true;
			this.pillLanded = landed;
		},
		onDayCleared() {
			if (this.profit >= 25000) wikifier("famebusiness", 25);
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed() {},
	}
);

blackmailQuests.mid.push(
	// Sell flowers on a market stall, without any lower clothing (undies allowed), and masturbate at least once
	{
		id: 14,
		summary: "Sell flowers at your market stall on Connudatus Street without lowerwear, and masturbate while doing so, before midnight.",
		prerequisites() {
			return Time.dayState === "dawn" && !playerIsXChanged() && !playerCannotSelfClimax();
		},
		reward() {
			return blackmailReward(1 / 2);
		},
		instructions: [
			"Masturbate (and orgasm) at least once while selling flowers at a market stall.",
			"Swallow the pill we've provided, and take these 200 flowers to sell. <span class='green'>We've already settled today's stall rent for you.</span>",
			"If you sell over <<printmoney 25000>> in profits, we will boost your business fame on top of your normal payment.",
			`<span class="red">You're not allowed to test the effects of the pill</span>`,
			"Any sale made while wearing lowerwear (undies permited) won't be counted for your goal.",
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.tookPill && this.soldFlowers && this.masturbatedOnce;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			} else if (this.pillLanded && V.xchange.pill.active && V.xchange.pill.effectsKnown) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: true,
		tookPill: false,
		pillLanded: false,
		soldFlowers: false,
		masturbatedOnce: false,
		profit: 0,
		receiveItems() {
			// See quest 13: a no-op spike (unspikeable player) must not arm the pill-test fail.
			const landed = playerMayBeSpiked();
			blackmailGiveDaisies(200);
			blackmailGrantStall();
			wikifier("xchange-random-spike", "suppress");
			this.tookPill = true;
			this.pillLanded = landed;
		},
		onDayCleared() {
			if (this.profit >= 25000) wikifier("famebusiness", 25);
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed() {},
	}
);

blackmailQuests.high.push(
	// Go streaking naked at the park during the day
	{
		id: 15, // Implemented.
		summary: "Streak naked at the park during the day.",
		prerequisites() {
			return Time.hour <= 16;
		},
		reward() {
			return blackmailReward();
		},
		instructions: ["Go streaking at the park naked during the day.", "Complete this task before midnight."],
		clearCondition() {
			return V.daily.parkStreak;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: false,
		receiveItems() {},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 300;
		},
		onDayFailed() {},
	}
);

blackmailQuests.high.push(
	// Go play air hockey at the arcade, and either fully strip, or be stripped by, the other player.
	{
		id: 16, // Implemented.
		summary: "Play a stripping game of air hockey at the arcade before midnight.",
		prerequisites() {
			return Time.hour < 20;
		},
		reward() {
			return blackmailReward();
		},
		instructions: [
			"Go to the arcade and play some air hockey.",
			"Play a stripping game with another player until either of you is fully naked.",
			"We're providing a free optional pill for this task.",
			`<span class="red">If you take the pill, you're not allowed to test it.</span>`,
			"Complete this task before midnight.",
		],
		clearCondition() {
			return this.finishedGame;
		},
		failCondition() {
			return false;
		},
		alertMessage: ``,
		clearCheck() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck() {
			if (this.failCondition()) {
				this.failed = true;
			} else if (this.pillLanded && V.xchange.pill.active && V.xchange.pill.effectsKnown) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage() {},
		includesItems: true,
		tookPill: false,
		pillLanded: false,
		receiveItems() {
			// This quest has no !playerIsXChanged prerequisite, so the player may already be on a knowingly-taken pill (effectsKnown true).
			// If the spike can't land it no-ops, and the old tookPill-based fail check then instantly failed the quest off that pre-existing pill.
			// Only a landed spike arms the pill-test fail.
			const landed = playerMayBeSpiked();
			wikifier("xchange-random-spike", "suppress");
			this.tookPill = true;
			this.pillLanded = landed;
		},
		onDayCleared() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 300;
		},
		onDayFailed() {},
		finishedGame: false,
	}
);
