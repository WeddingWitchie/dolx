
// All quests part from the assumption that PC starts their day at the orphanage
const blackmailQuests = {
	low: [],
	mid: [],
	high: [],
	template: [
		{
			id: 1,
			prerequisites: function() { return true; },
			reward: function() { return V.rentmoney; },
			instructions: [
				". Complete this task before midnight.",
			],
			clearCondition: function() { return true; },
			failCondition: function() { return false; },
			alertMessage: ``,
			clearCheck: function() {
				if (this.clearCondition()) {
					this.cleared = true;
				}
			},
			failCheck: function() { 
				if (this.failCondition()) {
					this.failed = true;
				}
			},
			cleared: false,
			failed: false,
			failMessage: function() { },
			includesItems: false,
			receiveItems: function() { },
			onDayCleared: function() { },
			onDayFailed: function() { },
		}
	],
}
window.blackmailQuests = blackmailQuests;

/// ##################################################################################
/// ################################# QUEST LIST #####################################
/// ##################################################################################

blackmailQuests.low.push( // Generic wear no underwear
	{
		id: 1, // Implemented
		prerequisites: function() { return true; },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"Wear no underwear today.", 
			"You may not put on any upper or lower underwear.", 
			"Swimsuits and leotards will still count as underwear for the purposes of this task.",
			`<span class="red">Wearing any piece at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition: function() { return true; },
		failCondition: function() { 
			return (V.worn.under_upper.name != "naked" || V.worn.under_lower.name != "naked") && !V.xchange.blackmail.gracePeriod; 
		},
		alertMessage: 
			`You're wearing underwear items. Passing time will result in task failure.`,
		clearCheck: function() { 
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true; 
				this.worn = clone(V.worn);
			}
		},
		cleared: true,
		failed: false,
		failMessage: function() {
			let clothing = "";
			if (this.worn?.under_upper.name != "naked" && this.worn?.under_lower.name != "naked")
				clothing = `${this.worn.under_upper.name} and ${this.worn.under_lower.name}`;
			else if (this.worn?.under_upper.name != "naked")
				clothing = clone(this.worn.under_upper.name);
			else
				clothing = clone(this.worn.under_lower.name);

			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: false,
		receiveItems: function() {},
		onDayCleared: function() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed: function() {

		},
	}
);

blackmailQuests.low.push( // Drink and get wasted
	{
		id: 2, // Implemented
		prerequisites: function() { return true; },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"Go drink and get wasted.",
			"You can do so at the pub, but it's not mandatory.", 
			"Complete this task before midnight.",
		],
		clearCondition: function() { return V.drunk >= 480; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { V.xchange.blackmail.cooldown = 2; },
		onDayFailed: function() { },
	}
);

blackmailQuests.mid.push( // Take a pill and flirt with 3 people
	{
		id: 3, // Implemented. ID fixed. Do not alter value.
		prerequisites: function() { return !playerIsXChanged(); },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Take this pill we've happily provided for you on this envelope.",
			"You're not allowed to test this pill's effects.",
			"Afterwards, go flirt with at least 3 people at the pub.",
			"Getting approached and hit on doesn't count, so you may ignore those people.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.tookPill && this.flirtCount >= 5; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
			else if (V.xchangePill.active && V.xchangePill.effectsKnown) {
				this.failed = true;
			}
		},
		flirtCount: 0,
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: true,
		receiveItems: function() { 
			if (V.player.gender == "m") {
				wikifier("xchange-pink", 1, "spike", "passion");
				wikifier("drugs", 1000);
			}
			else {
				wikifier("xchange-blue", 1, "spike", "passion");
				wikifier("drugs", 1000);
			}
			this.tookPill = true;
		},
		onDayCleared: function() { V.xchange.blackmail.cooldown = 3; },
		onDayFailed: function() { },
	}
);

blackmailQuests.high.push( // Masturbate in an empty classroom
	{
		id: 4, // Implemented. ID fixed. Do not alter value.
		prerequisites: function() { 
			return Time.schoolDay || (V.historytrait >= 1 && V.parktunnelintro >= 1) || currentSkillValue('skulduggery') >= 200;
		},
		reward: function() { return V.rentmoney; },
		instructions: [
			"Masturbate naked for 5 minutes, within an empty classroom.",
			`<span class="red">If you stop before the exact 5 minutes have lapsed, you must start over.</span>`,
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.masturbationtimer >= 30; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { },
		onDayFailed: function() { },
	}
);

blackmailQuests.mid.push( // Skinny dip into the school's pool
	{
		id: 5, // Implemented
		prerequisites: function() { 
			return Time.schoolDay || (V.historytrait >= 1 && V.parktunnelintro >= 1) || currentSkillValue('skulduggery') >= 200; 
		},
		reward: function() { return V.rentmoney; },
		instructions: [
			"Swim in the school's pool while naked.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.swamNaked; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { V.xchange.blackmail.cooldown = 3; },
		onDayFailed: function() { },
	}
);

blackmailQuests.low.push( // Go for a run in your underwear at park
	{
		id: 6, // Implemented.
		prerequisites: function() { return true; },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Go for a run at the park in your underwear. Spend at least 30 minutes on this activity.",
			"We recommend you wait until 9PM before doing so.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.timeSpent >= 30; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { 
			V.xchange.blackmail.penaltyThreat.exhibitionism += 100;
			V.xchange.blackmail.cooldown = 2; 
		},
		onDayFailed: function() { },
		timeSpent: 0,
	}
);

blackmailQuests.mid.push( // Go for a run naked at park
	{
		id: 7, // Implemented.
		prerequisites: function() { return true; },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Go for a run at the park while naked. Spend at least 1 hour on this activity.",
			"We recommend you wait until 9PM before doing so.", 
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.timeSpent >= 60; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() {V.xchange.blackmail.penaltyThreat.exhibitionism += 200; V.xchange.blackmail.cooldown = 3; },
		onDayFailed: function() { },
		timeSpent: 0,
	}
);

blackmailQuests.low.push( // Take a pill and wear a skirt
	{
		id: 8, // Implemented
		prerequisites: function() { return V.player.gender === "m" && !playerIsXChanged(); },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"Take the pill we've included in this envelope.",
			"You're not allowed to test its effects.", 
			"You will also either wear the skirt we've provided, or any other if you have one available.",
			"No other piece of lowerwear will be acceptable.",
			"You may also choose to not wear any lowerwear at all (meaning swimsuits at the pool are a-okay)",
			`<span class="red">Wearing any piece of lowerwear other than a skirt at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition: function() { return this.tookPill; },
		failCondition: function() { 
			return !wornSetupClothes("lower").skirt && V.worn.lower.name != "naked" && !V.xchange.blackmail.gracePeriod; 
		},
		alertMessage: 
			`You're wearing a non-skirt lowerwear item. Passing time will result in task failure.`,
		clearCheck: function() { 
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true; 
				this.worn = clone(V.worn);
			}
			else if (V.xchangePill.active && V.xchangePill.effectsKnown) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() {
			let	clothing = clone(this.worn.lower.name);
			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: true,
		receiveItems: function() {
			wikifier("generalWear", "lower", 27, "brown");
			wikifier("xchange-pink", 1, "spike");
			this.tookPill = true;
		},
		onDayCleared: function() {
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed: function() {

		},
	}
);

blackmailQuests.low.push( // Clean 3 chalets in uniform without underwear
	{
		id: 9, // Implemented
		prerequisites: function() { return Time.hour < 17; },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"Go clean 3 challets at the beach.",
			"Wear the uniform we've included with this envelope while doing so.",
			"You're not allowed underwear while wearing your uniform.",
			`<span class="red">If you wear underwear with your uniform you will fail automatically.</span>`,
			"You only need to wear your uniform while cleaning the chalets.",
			"Cleaning a chalet without your uniform will not count.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.chaletsCleaned >= 3; },
		failCondition: function() { return this.woreUnderwear; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		chaletsCleaned: 0,
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: true,
		receiveItems: function() { 
			if (V.player.sex == "m") {
				wikifier("generalWear", "upper", 53); // Waiter's shirt
				wikifier("generalWear", "lower", 131, "black"); // Suit trousers
				this.butlerSet = true;
			}
			else if (V.player.sex == "f") {
				wikifier("generalWear", "upper", 12); // Maid dress
				this.maidSet = true;
			}
			wikifier("generalWear", "handheld", 12); // Feather duster
		},
		onDayCleared: function() { 
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50; 
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed: function() { },
	},
);

blackmailQuests.mid.push( // Avoid defiance for a day
	{
		id: 10, // Implemented
		prerequisites: function() { return V.submissive <= 850; },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Since you're so strong-willed and prideful, we want to teach you how to be more honest with yourself.",
			"To that end, we won't allow you to behave defiantly today.",
			"That means, no violence. Do not be a brat.",
			"Do this until midnight and we'll consider you successful.",
		],
		clearCondition: function() { return true; },
		failCondition: function() { return this.behavedDefiantly; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { V.xchange.blackmail.cooldown = 3; },
		onDayFailed: function() { },
	},
);

blackmailQuests.low.push( // Wear no shirt if male
	{
		id: 11, // Implemented
		prerequisites: function() { return V.player.sex == "m"; },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"You're not allowed to wear a shirt today, nor any other clothing that covers your torso.", 
			"You may only cover your torso if you're within school grounds (does not include its pool).", 
			"The previous exemption only applies on schooldays.",
			`<span class="red">Wearing any torso-covering piece outside of school at any point of the day before midnight will result in failure.</span>`,
		],
		clearCondition: function() { return true; },
		failCondition: function() { 
			return (V.worn.under_upper.name != "naked" || V.worn.upper.name != "naked") && (V.location != "school" || !Time.schoolDay) && !V.xchange.blackmail.gracePeriod; 
		},
		alertMessage: 
			`You're wearing torso-covering items. Passing time will result in task failure.`,
		clearCheck: function() { 
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true; 
				this.worn = clone(V.worn);
			}
		},
		cleared: true,
		failed: false,
		failMessage: function() {
			let clothing = "";
			if (this.worn?.under_upper.name != "naked" && this.worn?.upper.name != "naked")
				clothing = `${this.worn.upper.name} and ${this.worn.under_upper.name}`;
			else if (this.worn?.under_upper.name != "naked")
				clothing = clone(this.worn.under_upper.name);
			else
				clothing = clone(this.worn.upper.name);

			delete this.worn;

			return `You thought we weren't watching you? We saw you wearing your ${clothing} today.`;
		},
		includesItems: false,
		receiveItems: function() {},
		onDayCleared: function() {
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed: function() {

		},
	}
);

// blackmailQuests.low.push( // Flash your underwear to at least 5 strangers
// 	{
// 		id: 12,
// 		prerequisites: function() { return hasSexStat("exhibitionism", 2); },
// 		reward: function() { return V.rentmoney / 3; },
// 		instructions: [
// 			"Flash at least 5 strangers on the street.",
// 			"We recommend you visit Connudatus Street to do this task."
// 			"Complete this task before midnight.",
// 		],
// 		clearCondition: function() { return this.flashedPeople >= 5; },
// 		failCondition: function() { return false; },
// 		alertMessage: ``,
// 		clearCheck: function() {
// 			if (this.clearCondition()) {
// 				this.cleared = true;
// 			}
// 		},
// 		failCheck: function() { 
// 			if (this.failCondition()) {
// 				this.failed = true;
// 			}
// 		},
// 		cleared: false,
// 		failed: false,
// 		flashedPeople: 0,
// 		failMessage: function() { },
// 		includesItems: false,
// 		receiveItems: function() { },
// 		onDayCleared: function() { 
// 			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
// 			V.xchange.blackmail.cooldown = 2;
// 		},
// 		onDayFailed: function() { },
// 	}
// );

blackmailQuests.low.push( // Sell flowers on a market stall, without any lower clothing (undies allowed)
	{
		id: 13,
		prerequisites: function() { return Time.dayState == "dawn"; },
		reward: function() { return V.rentmoney / 3; },
		instructions: [
			"Take this pill and these 200 flowers we've provided.", 
			"Drink the pill, and go sell flowers on Connadatus Street.",
			"If you sell over <<printmoney 25000>> in profits, we will boost your business fame on top of your normal payment.",
			`<span class="red">You're not allowed to test the effects of the pill</span>`,
			"Any sale made while wearing lowerwear (undies permited) won't be counted for your goal.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.tookPill && this.soldFlowers; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: true,
		tookPill: false,
		soldFlowers: false,
		profit: 0,
		receiveItems: function() { 
			wikifier("xchange-random-spike", "suppress");

			if (V.plants.daisy === undefined)
				V.plants.daisy = {"name": setup.plants.daisy.name, "plural": setup.plants.daisy.plural, "amount": 0};
			else if (V.plants.daisy.name === undefined)
				V.plants.daisy = {"name": setup.plants.daisy.name, "plural": setup.plants.daisy.plural, "amount": V.plants.daisy.amount};
			V.plants.daisy.amount += 200;

			this.tookPill = true;
		},
		onDayCleared: function() { 
			if (this.profit >= 25000) wikifier("famebusiness", 50);
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 2;
		},
		onDayFailed: function() { },
	}
);

blackmailQuests.mid.push( // Sell flowers on a market stall, without any lower clothing (undies allowed), and masturbate at least once
	{
		id: 14,
		prerequisites: function() { return Time.dayState == "dawn" && !V.penis_addict_trait && !V.hole_addict_trait; },
		reward: function() { return V.rentmoney / 2; },
		instructions: [
			"Masturbate (and orgasm) at least once while selling flowers at a market stall.",
			"Take this pill and these 200 flowers we've provided.", 
			"If you sell over <<printmoney 25000>> in profits, we will boost your business fame on top of your normal payment.",
			`<span class="red">You're not allowed to test the effects of the pill</span>`,
			"Any sale made while wearing lowerwear (undies permited) won't be counted for your goal.",
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.tookPill && this.soldFlowers && this.masturbatedOnce; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: true,
		tookPill: false,
		soldFlowers: false,
		masturbatedOnce: false,
		profit: 0,
		receiveItems: function() { 
			wikifier("xchange-random-spike", "suppress");

			if (V.plants.daisy === undefined)
				V.plants.daisy = {"name": setup.plants.daisy.name, "plural": setup.plants.daisy.plural, "amount": 0};
			else if (V.plants.daisy.name === undefined)
				V.plants.daisy = {"name": setup.plants.daisy.name, "plural": setup.plants.daisy.plural, "amount": V.plants.daisy.amount};
			V.plants.daisy.amount += 200;

			this.tookPill = true;
		},
		onDayCleared: function() { 
			if (this.profit >= 25000) wikifier("famebusiness", 50);
			V.xchange.blackmail.penaltyThreat.exhibitionism += 50;
			V.xchange.blackmail.cooldown = 3;
		},
		onDayFailed: function() { },
	}
);

blackmailQuests.high.push( // Go streaking naked at the park during the day
	{
		id: 15, // Implemented.
		prerequisites: function() { return Time.hour <= 16; },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Go streaking at the park naked during the day.", 
			"Complete this task before midnight.",
		],
		clearCondition: function() { return V.daily.parkStreak; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: false,
		receiveItems: function() { },
		onDayCleared: function() { V.xchange.blackmail.penaltyThreat.exhibitionism += 300; },
		onDayFailed: function() { },
		timeSpent: 0,
	}
);

blackmailQuests.high.push( // Go play air hockey at the arcade, and either fully strip, or be stripped by, the other player.
	{
		id: 16, // Implemented.
		prerequisites: function() { return Time.hour < 20; },
		reward: function() { return V.rentmoney; },
		instructions: [
			"Go to the arcade and play some air hockey.",
			"Play a stripping game with another player until either of you is fully naked.",
			"We're providing a free optional pill for this task.",
			`<span class="red">If you take the pill, you're not allowed to test it.</span>`, 
			"Complete this task before midnight.",
		],
		clearCondition: function() { return this.finishedGame; },
		failCondition: function() { return false; },
		alertMessage: ``,
		clearCheck: function() {
			if (this.clearCondition()) {
				this.cleared = true;
			}
		},
		failCheck: function() { 
			if (this.failCondition()) {
				this.failed = true;
			}
		},
		cleared: false,
		failed: false,
		failMessage: function() { },
		includesItems: true,
		receiveItems: function() { wikifier("xchange-random-spike", "supress"); },
		onDayCleared: function() { V.xchange.blackmail.penaltyThreat.exhibitionism += 300; },
		onDayFailed: function() { },
		finishedGame: false,
	}
);