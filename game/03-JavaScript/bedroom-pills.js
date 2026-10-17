/* eslint-disable dot-notation */
/* globals getSensitivityMedication sensitivityMedicationRemainingHours xchangePillNeutralised sleepAidPending sleepAidOtcStrongEnough pillDosesTodayByType pocketBagCapacity pocketBagName pocketAvailable pocketCarrying pocketSlotToggle xchangeVoluntaryDoseBegin xchangeVoluntaryDoseEnd AmbienceAudio */
/*
 * if display_condition is 1, item is displayed, else it's not
 * current max doses for Harper/Asylum pills is 1; 2 for every other pills
 * place the widgets that need to be run inside effects array
 * if you feel lost just ask away :)
 * take_condition == 1 means the "Take Pill" button is not greyed out and is clickable
 * display_condition controls whether or not pill should be displayed in the pill menu
 */

/*
--- Please change this comment as needed when the format of setup.pills changes ---
This is the setup.pills array.
It contains a list of all the possible pills.
A single pill object contains multiple 'properties' which define the pill.

 * name:'example pill' - The name displayed in the medicine drawer screen. Auto-capitalises first word. Capitalise other words if desired.
 * description: 'this pill is green.' - The description displayed when the pill is selected.
 * onTakeMessage: 'You swallow the green pill.' - Text displayed when a pill is taken.
 * warning_label: 'Warning: example pill may cause explosive decompression.' - Warning label displayed in text box. <span class="hpi_notice_label"> is used in several of these.
 * indicators: - Array of indicators. Example: `<span class="hpi_indic_green">+ Control</span>`
 * icon: 'img/misc...blahblah' - file path of the png icon for this pill.
 *
 * autoTake: - Code or statement that determines if this pill is set to auto-take ??? **
 * doseTaken: - Code or statement showing how many doses were taken already. **
 * owned: - Code or statement to determined the number owned. **
 * overdose: - Code or statement to determine overdose. **
 * display_condition: - Code or statement to determine if the pill displays in list. **
 * take_condition: - Code or statement to determine if the take button displays for this pill - can a dose currently be taken. **
 *
 * type: "various" - Type of pill. Pill code uses this to determine what the effects are and where they apply. Example: "bottom" or "breast"
 * subtype: "various" - Action the pill has on bodypart 'type'. Optional for the asylum & harper meds apparently. Example: "reduction" or "growth"
 * shape: "pill" or "galenic" - Helps to properly space the icon.
 * effects: - Array of effects - can be used to issue quick macros for setting results. Example: `<<control 25>>`
*/
setup.pills = [
	{
		name: "bottom reduction",
		description:
			"Each pill contains 500mg of Praberrhol, a derived molecule crafted specifically to attach to the triglyceride present in your buttocks and dissolve them over time.",
		onTakeMessage: "You take the pills intended to reduce your butt's size. You hope it will be as effective as advertised.",
		warning_label: "Warning: Severe side effects upon exceeding the maximum dose prescribed per day. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "bottom",
		subtype: "reduction",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-bottom.png",
		frontIcon: "img/misc/icon/small-down-arrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["bottom growth"].doseTaken === 0 && V.sexStats.pills["pills"]["bottom blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "bottom growth",
		description:
			"This pill contains the molecule Nynthroptechloxin, created by our eminent pharmaceutical scientist Dr Bancel's technological prowess. It increases the body's production of the particular hormone responsible for hip and buttock weight gains. 190mg of this molecule is present per pill.",
		onTakeMessage: "You take the pills intended to boost your butt's growth. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum doses per day. Refer to your doctor if in doubts. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "bottom",
		subtype: "growth",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-bottom.png",
		frontIcon: "img/misc/icon/small-up-arrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["bottom reduction"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["bottom blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "bottom blocker",
		description:
			"Each pill contains Praberrhol-NG2, a derived molecule crafted specifically to attach to triglycerides and dissolve them over time. Inactive ingredient Trinelca triggers strong binding with subcutaneous adipose tissues present in your buttocks. 200mg is the correct dosage allowing a balance between gained fat and dissolved fat.",
		onTakeMessage: "You take the pills intended to block your butt's growth. You hope it will be as effective as advertised.",
		warning_label:
			"<span class='hpi_notice_label'>Notice: No side effects were determined during the trials for this drug. Taking more than 1 pill per 24 hours is ineffective</span>",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "bottom",
		subtype: "blocker",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-bottom.png",
		frontIcon: "img/misc/icon/small-cross.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 &&
				V.sexStats.pills["pills"]["bottom growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["bottom reduction"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "breast reduction",
		description:
			"Each pill contains 500mg of Praberrhol-NG2, a derived molecule crafted specifically to attach to triglycerides and dissolve them over time. Inactive ingredient Abflutyx triggers strong binding with fatty tissues present in your breasts.",
		onTakeMessage: "You take the pills intended to reduce your breasts' size. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum doses per day. Refer to your doctor if in doubts. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "breast",
		subtype: "reduction",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-breast.png",
		frontIcon: "img/misc/icon/small-down-arrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["breast growth"].doseTaken === 0 && V.sexStats.pills["pills"]["breast blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "breast growth",
		description:
			"A hormonal mRNA-therapy pill. The 5mg of Dipardyn present aim to trigger natural secretion of the specific hormones responsible for causing breast growth, while the mRNA will help your cells produce a new kind of hormone to increase breast tissue production and their capability to store fat, effectively making your breasts grow faster.",
		onTakeMessage: "You take the pills intended to boost your breasts' growth. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum doses per day. Refer to your doctor if in doubts. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "breast",
		subtype: "growth",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-breast.png",
		frontIcon: "img/misc/icon/small-up-arrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["breast reduction"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["breast blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "breast blocker",
		description:
			"A selective oestrogen receptor modulator (SERM), blocking the protein receptors responsible for breast growth; supplemented by 269mg of Tetraozealpostigyl.",
		onTakeMessage: "You take the pills intended to block your breasts' growth. You hope it will be as effective as advertised.",
		warning_label:
			'<span class="hpi_notice_label">Notice: No side effects were determined during the trials for this drug. Taking more than 1 pill per 24 hours is ineffective</span>',
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "breast",
		subtype: "blocker",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-breast.png",
		frontIcon: "img/misc/icon/small-cross.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 &&
				V.sexStats.pills["pills"]["breast growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["breast reduction"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "penis reduction",
		description:
			"Each pill contains 50mg of Chliustose which has limited anti-androgen effects. Additionally, 450mg of Phirhyn will reduce the amount and thickness of the erectile tissue.",
		onTakeMessage: "You take the pills intended to reduce your penis' size. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum doses per day. Refer to your doctor if in doubts. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "penis",
		subtype: "reduction",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-penis.png",
		frontIcon: "img/misc/icon/small-down-arrow.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["penis growth"].doseTaken === 0 && V.sexStats.pills["pills"]["penis blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "penis growth",
		description:
			"Each pill contains 780mg of Cumnictondyl, 240mg of Iphopol, and 149mg of testosterone undecanoate. The two molecules enable and facilitate the action of the androgen, which has for effect the resumption of your penis' natural growth.",
		onTakeMessage: "You take the pills intended to boost your penis' growth. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum doses per day. Refer to your doctor if in doubts. Not to be associated with any other hormonal treatment.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "penis",
		subtype: "growth",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-penis.png",
		frontIcon: "img/misc/icon/small-up-arrow.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["penis reduction"].doseTaken === 0 && V.sexStats.pills["pills"]["penis blocker"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "penis blocker",
		description:
			"An anti-androgen hormonal treatment containing 370mg of Dynthryme aiming at blocking the production of androsterone and testosterone in your body, effectively blocking penile growth.",
		onTakeMessage: "You take the pills intended to block your penis' growth. You hope it will be as effective as advertised.",
		warning_label:
			'<span class="hpi_notice_label">Notice: No side effects were determined during the trials for this drug. Taking more than 1 pill per 24 hours is ineffective</span>',
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "penis",
		subtype: "blocker",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-penis.png",
		frontIcon: "img/misc/icon/small-cross.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 && V.sexStats.pills["pills"]["penis growth"].doseTaken === 0 && V.sexStats.pills["pills"]["penis reduction"].doseTaken === 0
				? 1
				: 0;
		},
		effects: [],
	},
	{
		name: "fertility booster",
		description:
			"Each pill contains 50mg of clomiphene citrate, a structural analogue of oestrogens. It also acts on your hypothalamus which secretes the hormones necessary to trigger ovulation. In some cases effectively inducing your ovary to release eggs.",
		onTakeMessage: "You take the pills intended to increase your fertility. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Mild side effects may occur with the prescribed dosage, including those that may mimic the signs of early pregnancy. Severe complications may occur if exceeding the maximum doses per day. If in doubt, please consult your doctor.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_doseTaken() {
			if (V.sexStats.pills["pills"][this.name].doseTaken) {
				return "Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "");
			} else {
				return "Not Applied";
			}
		},
		hpi_take_every_morning() {
			return this.autoTake() ? "Stop Taking them" : "Take when required";
		},
		type: "pregnancy",
		subtype: "fertility booster",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-fertility.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["contraceptive"].doseTaken === 0 ? 1 : 0;
		},
		effects: [],
	},
	{
		name: "contraceptive",
		description:
			"Estroprogestatifs associating 24mg of ethinylestradiol (synthetic oestrogen) and 31mg of a synthetic progestin for a near-perfect contraceptive effect.",
		onTakeMessage: "You take the contraceptive pill. You hope it will be as effective as advertised.",
		warning_label:
			"Warning: Mild side effects may occur with the prescribed dosage. Severe complications may occur if exceeding the maximum doses per day. If in doubt, please consult your doctor.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_doseTaken() {
			if (V.sexStats.pills["pills"][this.name].doseTaken) {
				return "Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "");
			} else {
				return "Not Applied";
			}
		},
		hpi_take_every_morning() {
			return this.autoTake() ? "Stop Taking them" : "Take when required";
		},
		type: "pregnancy",
		subtype: "contraceptive",
		shape: "galenic",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-contraceptive.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 && V.sexStats.pills["pills"]["fertility booster"].doseTaken === 0 ? 1 : 0;
		},
		effects: [],
	},
	{
		name: "Anti-Parasite Cream",
		description:
			"A parasite-repelling cream containing Permethrin. When applied, it prevents new parasitic infestation from occurring, although it has no effect on any ongoing parasitic infections. Effective for 14 days on application.",
		onTakeMessage: "You apply the cream around your genitals. You hope it prevents them from leaving any offspring behind.",
		warning_label:
			"Warning: Please consult your doctor if you have an allergic reaction shortly after application. Contact your doctor immediately if you get the cream in your mouth or eyes.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_pills() {
			return "Apply to skin";
		},
		hpi_doseTaken() {
			if (V.sexStats.pills["pills"][this.name].doseTaken) {
				return "Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "");
			} else {
				return "Not Applied";
			}
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "parasite",
		subtype: "Anti-Parasite Cream",
		shape: "cream",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/anti-parasite-cream.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 ? 1 : 0;
		},
		effects: [],
	},
	{
		name: "painkillers",
		description: "A bottle of strong painkillers. They relieve serious aches quickly, but cause considerable drowsiness.",
		onTakeMessage: "You swallow a painkiller. Before long, the pain eases, though your eyelids feel heavier.",
		warning_label: "Warning: May cause considerable drowsiness. Taking more than three doses in one day causes increasingly dangerous side effects.",
		indicators: ["<span class='hpi_indic_green'>-- Pain</span>", "<span class='hpi_indic_blue'>+++ Tiredness</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		type: "painkiller",
		subtype: "pain relief",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/infirmary.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return 1;
		},
		effects: [`<<pain -10>><<tiredness 18>><<llpain>><<gggtiredness>>`],
	},
	{
		name: "anti-anxiety tablets",
		description: "Fast-acting medicine that reduces trauma and stress. Taking more than one tablet in a day can cause serious side effects.",
		onTakeMessage() {
			const doses = Number(T.calmorylDose) || this.doseTaken();
			if (doses === 1) return "You swallow an anti-anxiety tablet. Your stress begins to ease.";
			if (doses === 2) return "You take a second tablet. Your stomach feels sick and you have trouble thinking clearly.";
			if (doses === 3) return "You take a third tablet. You feel detached from your surroundings and struggle to focus on what is happening around you.";
			return "You swallow another tablet. You become even less aware of what is happening around you.";
		},
		warning_label:
			"Warning: Take no more than one tablet per day. A second tablet causes side effects. Three or more tablets cause temporary dissociation and make it difficult to understand your surroundings. Each additional tablet makes the effect last longer.",
		indicators: ["<span class='hpi_indic_green'>--- Trauma</span>", "<span class='hpi_indic_green'>- Stress</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_doseTaken() {
			return `${this.doseTaken()}\u00A0taken`;
		},
		type: "calmoryl",
		subtype: "trauma suppressant",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pill.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return 1;
		},
		effects: [() => `<<run takeCalmoryl()>>`],
	},
	{
		name: "sleeping pills",
		description: "A mild over-the-counter sleep aid. Take one before bed to help you fall asleep. It may not work if your trauma is severe.",
		get onTakeMessage() {
			return sleepAidOtcStrongEnough()
				? "You swallow a sleeping pill. After a while, you begin to feel sleepy."
				: "You swallow a sleeping pill. You start to feel tired, but you still cannot relax. <span class='red'>The pill is not strong enough to help you sleep tonight.</span>";
		},
		warning_label: "Warning: Take one tablet before bed. Do not take a second dose. May make it harder to wake up.",
		indicators: ["<span class='hpi_indic_green'>- Insomnia</span>", "<span class='hpi_indic_blue'>+ Oversleeping</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_doseTaken() {
			return sleepAidPending()?.strength === "otc" ? "Active" : `${this.doseTaken()}\u00A0taken`;
		},
		type: "sleep",
		subtype: "otc",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/sharks-teeth.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return 1;
		},
		effects: [`<<run takeSleepAid("otc")>><<tiredness 5>>`],
	},
	{
		name: "prescription sleeping pills",
		description: "A strong sleeping pill. It helps you sleep even when stressed, but using it too often can make you dependent on it.",
		onTakeMessage: "You take a sleeping pill. You quickly begin to feel drowsy.",
		warning_label:
			"Warning: Take one tablet before bed. Taking a second dose will make you pass out. Frequent use can cause dependence and make it harder to sleep without the pills.",
		indicators: [
			"<span class='hpi_indic_green'>-- Insomnia</span>",
			"<span class='hpi_indic_blue'>++ Oversleeping</span>",
			"<span class='hpi_indic_red'>Dependence</span>",
		],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_doseTaken() {
			return sleepAidPending()?.strength === "prescription" ? "Active" : `${this.doseTaken()}\u00A0taken`;
		},
		type: "sleep",
		subtype: "prescription",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pill-strong.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return 1;
		},
		effects: [`<<run takeSleepAid("prescription")>><<tiredness 10>>`],
	},
	{
		name: "prescription painkillers",
		description: "Strong prescription painkillers. One dose greatly reduces pain, but makes you very tired.",
		onTakeMessage: "You swallow a prescription painkiller. Your pain quickly fades, but you begin to feel very sleepy.",
		warning_label: "Warning: Causes severe drowsiness. Taking more than two doses in one day can cause dangerous side effects.",
		indicators: ["<span class='hpi_indic_green'>--- Pain</span>", "<span class='hpi_indic_blue'>+++ Tiredness</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		type: "painkiller",
		subtype: "prescription pain relief",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/infirmary.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return 1;
		},
		effects: [`<<pain -20>><<tiredness 25>><<lllpain>><<gggtiredness>>`],
	},
	{
		name: "asylum's prescription",
		description: "A powerful antipsychotic.",
		onTakeMessage: "You take the pills prescribed in the asylum. You feel hazy.",
		warning_label:
			"<span class='hpi_notice_label'>Notice: No side effects could be determined during the experimental stage of this drug, and it passed all safety regulations. <span class='hpi_blur unselectable'>I think this drug company is about to be the end of me. No side effects ? Who do they think they're kidding ?!</span></span>",
		indicators: ["<span class='hpi_indic_green'>++ Control</span>", "<span class='hpi_indic_blue'>- Awareness</span>"],
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "asylum",
		shape: "galenic",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-strong.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 1 && V.asylummedicated === 0 ? 1 : 0;
		},
		effects: [`<<awareness -5>>`, `<<control 25>>`, `<<set $asylummedicated += 1>>`],
	},
	{
		name: "Dr Harper's prescription",
		/* Harper may add an antidepressant to the PC's regular medication. */
		get description() {
			return V.prescriptions?.antidepressant
				? "Antipsychotic medication with an added antidepressant. The antidepressant reduces daily stress gain, but makes you become tired faster."
				: "Antipsychotic medication.";
		},
		get onTakeMessage() {
			return V.prescriptions?.antidepressant
				? "You take the pills Doctor Harper prescribed. You feel dizzy, but calmer."
				: "You take the pills Doctor Harper prescribed. You feel dizzy.";
		},
		warning_label:
			"Warning: Intended for one dose per day. Daily use reduces awareness and may gradually distort your perception. The effects of the maximum dosage have not been fully studied. Take with caution. <span class='hpi_blur'></span>",
		get indicators() {
			const base = ["<span class='hpi_indic_green'>+ Control</span>", "<span class='hpi_indic_blue'>- Awareness</span>"];
			if (V.prescriptions?.antidepressant) {
				base.push("<span class='hpi_indic_green'>- Stress gain</span>", "<span class='hpi_indic_blue'>+ Tiredness gain</span>");
			}
			return base;
		},
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		type: "harper",
		shape: "galenic",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pill-collection.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 1 && V.medicated === 0 ? 1 : 0;
		},
		effects: [`<<awareness -1>>`, `<<control 10>>`, `<<set $medicated += 1>>`],
	},
	{
		name: "sensitivity-decreasing cream",
		description:
			"A fast-acting topical neural dampener that temporarily reduces tactile sensation throughout the body. One application remains effective for 16 hours.",
		onTakeMessage: "You rub the sensitivity-decreasing cream into your skin. The constant press of your clothes soon fades into the background.",
		warning_label: "Warning: Do not apply more than once per day. This cream replaces the effect of any active sensitivity-increasing cream.",
		indicators: ["<span class='hpi_indic_blue'>--- Sensitivity</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_doseTaken() {
			const medication = getSensitivityMedication();
			const hours = sensitivityMedicationRemainingHours();
			return medication?.type === this.subtype ? `Effective for ${hours} hour${hours === 1 ? "" : "s"}` : "Not active";
		},
		type: "sensitivity",
		subtype: "suppressant",
		shape: "cream",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/cream.png",
		hpi_take_pills() {
			return "Apply cream";
		},
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 && getSensitivityMedication()?.type !== this.subtype ? 1 : 0;
		},
		take_blocked_reason() {
			return this.doseTaken() > 0 ? "The label permits only one application per day." : "This cream is already active.";
		},
		effects: [`<<run applySensitivityCream("suppressant")>>`],
	},
	{
		name: "sensitivity-increasing cream",
		description: "A fast-acting topical neural stimulant that heightens tactile sensation throughout the body. One application remains effective for 16 hours.",
		onTakeMessage: "You rub the sensitivity-increasing cream into your skin. Before long, every brush against it feels vivid and distracting.",
		warning_label: "Warning: Do not apply more than once per day. This cream replaces the effect of any active sensitivity-decreasing cream.",
		indicators: ["<span class='hpi_indic_green'>+++ Sensitivity</span>"],
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_doseTaken() {
			const medication = getSensitivityMedication();
			const hours = sensitivityMedicationRemainingHours();
			return medication?.type === this.subtype ? `Effective for ${hours} hour${hours === 1 ? "" : "s"}` : "Not active";
		},
		type: "sensitivity",
		subtype: "stimulant",
		shape: "cream",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/cream.png",
		hpi_take_pills() {
			return "Apply cream";
		},
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 && getSensitivityMedication()?.type !== this.subtype ? 1 : 0;
		},
		take_blocked_reason() {
			return this.doseTaken() > 0 ? "The label permits only one application per day." : "This cream is already active.";
		},
		effects: [`<<run applySensitivityCream("stimulant")>>`],
	},
	{
		name: "Hair Growth Formula",
		description:
			"A spray containing Minoxidil and other ingredients to promote faster growth and healthier hair when applied directly to hair. Effective for 3 days on application.",
		onTakeMessage: "You apply the spray. You hope it helps grow your hair quickly.",
		warning_label:
			"Warning: Please consult your doctor if you have an allergic reaction shortly after application. Contact your doctor immediately if you get the spray in your mouth or eyes.",
		autoTake() {
			return V.sexStats.pills["pills"][this.name].autoTake;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_pills() {
			return "Apply to hair";
		},
		hpi_doseTaken() {
			if (V.sexStats.pills["pills"][this.name].doseTaken) {
				return "Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "");
			} else {
				return "Not Applied";
			}
		},
		hpi_take_every_morning() {
			return this.autoTake() ? "Stop Applying it" : "Apply when required";
		},
		type: "hair",
		subtype: "Hair Growth Formula",
		shape: "spray",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/hairspray.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 ? 1 : 0;
		},
		effects: [],
	},
];
// ToDo: figure out a means to allow applying the Hair Growth Formula to pubic hair as well

function generateHomePillsInventory() {
	// Render before history navigation can remove the medicine drawer.
	$(document).one(":passageend", function () {
		T.disableGridClick = false;
		for (const item of setup.pills) {
			/* X-Change inventory belongs to the real player, not temporary historical/dream bodies. */
			if (item.type === "xchange" && V.statFreeze) continue;
			if (item.display_condition() === 1) window.addElementToGrid(item);
		}
	});
}
window.generateHomePillsInventory = generateHomePillsInventory;

function addElementToGrid(item) {
	const hpiGridContainer = document.getElementById("homeMainPillContainer");

	const itemName = item.name[0].toUpperCase() + item.name.slice(1);
	hpiGridContainer.innerHTML =
		hpiGridContainer.innerHTML +
		`
			<div class="hpi_item">
				<div class="hpi_icon">${item.frontIcon ? `<img class="icon infront" src="${item.frontIcon}"/>` : ""}<img class="icon" src="${item.icon}"/></div>
				<div class="hpi_name" id="hpi_name_${itemName}">
					${itemName}
					${item.autoTake() === true ? `<span class="hpi_auto_label"> [Auto]</span>` : ""}
				</div>
				<div class="hpi_count" onmouseenter="T.disableGridClick = true" onmouseleave="T.disableGridClick = false">${item.owned()}</div>
			</div>
			`;
	hpiGridContainer.lastElementChild.setAttribute("onclick", "window.onHomePillItemClick(" + "`" + item.name + "`" + ")");
}
window.addElementToGrid = addElementToGrid;

/* The pocket row in a medicine's detail panel. The PC has one personal slot even without a bag. */
function pillBagActionCell(item) {
	if (typeof pocketBagCapacity !== "function" || !pocketAvailable()) return "";
	const name = "`" + item.name + "`";
	return `
						<div class="hpi_action_cell">
							<a id="hpi_pocket_bag" onclick="window.onPillBagClick(${name})">${pillBagActionLabel(item)}</a>
						</div>`;
}
window.pillBagActionCell = pillBagActionCell;

function pillBagActionLabel(item) {
	if (pocketCarrying("pill", item.name)) return "Remove from bag";
	return "Put in bag";
}
window.pillBagActionLabel = pillBagActionLabel;

function onPillBagClick(itemName) {
	const item = setup.pills.find(pill => pill.name === itemName);
	if (!item) return;
	if (!pocketSlotToggle("pill", itemName)) {
		/* The only normal failure is a full carried container; say so instead of doing nothing. */
		const button = document.getElementById("hpi_pocket_bag");
		if (button) button.textContent = `Your ${pocketBagName()} is full`;
		return;
	}
	const button = document.getElementById("hpi_pocket_bag");
	if (button) button.textContent = pillBagActionLabel(item);
}
window.onPillBagClick = onPillBagClick;

function onHomePillItemClick(itemName) {
	if (!T.disableGridClick) {
		document.getElementById("homeDescPillContainer").style.display = "grid";
		for (const item of setup.pills) {
			if (item.name === itemName) {
				const itemName = "`" + item.name + "`";
				const itemType = "`" + item.type + "`";
				document.getElementById("hpi_desc").outerHTML = `
				<div id="hpi_desc">
					${item.description}
					<div class="hpi_warning_label">${item.warning_label}</div>
					<div id="hpi_desc_action">
						<div class="hpi_action_cell">
							<a id="hpi_take_pills" onclick="window.onTakeClick(${itemName}, ${itemType})">Take pill</a>
						</div>
						<div class="hpi_action_cell">
							<a id="hpi_take_every_morning" onclick="window.onAutoTakeClick(${itemName}, ${itemType})">Take every morning</a>
						</div>
						${pillBagActionCell(item)}
					</div>
				</div>`;
				window.initPillContextButtons(item);
				document.getElementById("hpi_desc_img").innerHTML =
					(item.frontIcon ? `<img${item.shape === "galenic" ? ` style="margin-left: 17%;"` : ""} class="icon infront" src="${item.frontIcon}"/>` : "") +
					`<img${item.shape === "galenic" ? ` style="margin-left: 17%;"` : ""} src="${item.icon}" />` +
					`<div id="hpi_indicator" class="hpi_indicator"></div>`;
				window.addIndicators(item);
			}
		}
	}
}
window.onHomePillItemClick = onHomePillItemClick;

function addIndicators(item) {
	// Indicators are the "++Control" and "+Awareness" etc. We add them under the pill icon.
	if (item.indicators != null && item.indicators.length > 0 && !V.settings.blindStatsEnabled) {
		for (const indicator of item.indicators) document.getElementById("hpi_indicator").innerHTML += indicator;
	}
}
window.addIndicators = addIndicators;

function initPillContextButtons(item) {
	// create button to "Take everyone morning" / "Stop taking them" (every morning)
	if (item.hpi_take_every_morning) {
		document.getElementById("hpi_take_every_morning").innerHTML = item.hpi_take_every_morning();
	} else {
		document.getElementById("hpi_take_every_morning").innerHTML = item.autoTake() ? "Stop taking them" : "Take every morning";
	}

	// Hide auto-use for medication that must be taken manually.
	if (["asylum", "painkiller", "calmoryl", "sensitivity", "sleep", "xchange"].includes(item.type)) {
		document.getElementById("hpi_take_every_morning").className = "hidden"; // prevent 'Take every Morning' option to be displayed for those type of pills
		/* The bag button, when present, takes the freed column, so the panel is only "single" without it. */
		if (!document.getElementById("hpi_pocket_bag")) {
			document.getElementById("hpi_desc_action").classList.add("hpi_action_single"); // readapt css since there's only one button now
		}
	}
	//  Add 'Take pill' button
	document.getElementById("hpi_take_pills").innerHTML = item.hpi_take_pills ? item.hpi_take_pills() : "Take pill";

	// If the button doesn't exist, create it. If it exists, display the right dose Taken for that pill
	if (document.getElementById("hpi_doseTaken") != null) {
		if (item.hpi_doseTaken) {
			document.getElementById("hpi_doseTaken").outerHTML =
				"<span id='hpi_doseTaken' style='font-size: 0.88em;color: #979797;'> [" + item.hpi_doseTaken() + "]</span>";
		} else {
			// todo: replace style with a proper css class
			document.getElementById("hpi_doseTaken").outerHTML =
				"<span id='hpi_doseTaken' style='font-size: 0.88em;color: #979797;'> [" + item.doseTaken() + " Taken]</span>";
		}
		// Display today taken doses for specific pill
	} else {
		if (item.hpi_doseTaken) {
			document.getElementById("hpi_take_pills").outerHTML +=
				`<span id="hpi_doseTaken" style="font-size: 0.88em;color: #979797;"> [` + item.hpi_doseTaken() + `]</span>`; // Display today taken doses for specific pill
		} else {
			document.getElementById("hpi_take_pills").outerHTML +=
				`<span id="hpi_doseTaken" style="font-size: 0.88em;color: #979797;"> [` + item.doseTaken() + ` Taken]</span>`; // Display today taken doses for specific pill
		}
	}
	// Check if the player meets the criteria to take the pill.
	if (item.take_condition() === 0) {
		document.getElementById("hpi_take_pills").classList.add("hpi_greyed_out"); // grey the "Take Pill" button out
		document.getElementById("hpi_take_pills").onclick = ""; // disable "Take Pill" onclick event.
		/* Pills can self-report why they're blocked (e.g. X-Change body mismatch) so the grey button isn't unexplained. */
		let blockedReason = typeof item.take_blocked_reason === "function" ? item.take_blocked_reason() : "";
		/* X-Change pills have enough gates that a silent grey button reads as a bug; always say something. */
		if (!blockedReason && item.type === "xchange") blockedReason = "You can't take this pill in your current state.";
		if (blockedReason && document.getElementById("hpi_blocked_reason") == null) {
			document
				.getElementById("hpi_desc_action")
				.insertAdjacentHTML("beforebegin", `<div id="hpi_blocked_reason" class="hpi_notice_label">${blockedReason}</div>`);
		}
	}
}
window.initPillContextButtons = initPillContextButtons;

function setLastTaken(type, subtype, fullname = null) {
	if (fullname != null) {
		for (const p of setup.pills) {
			if (p.name === fullname) {
				type = p.type;
				subtype = p.subtype;
			}
		}
	}
	V.sexStats.pills.lastTaken[type] = subtype;
}
window.setLastTaken = setLastTaken;

function redetermineMostTaken(type, subtype, fullname = null) {
	const result = { blocker: 0, growth: 0, reduction: 0 };
	if (fullname != null) {
		for (const p of setup.pills) {
			if (p.name === fullname) {
				type = p.type;
				subtype = p.subtype;
			}
		}
	}
	if (!["breast", "bottom", "penis"].includes(type)) return;
	for (const pill of setup.pills) {
		if (pill.type === type && ["blocker", "growth", "reduction"].includes(pill.subtype)) {
			result[pill.subtype] = pill.doseTaken();
		}
	}
	const ret = result.growth - result.reduction;
	if (ret === 0 && (result.growth > 0 || result.reduction > 0)) {
		// We enter here when growth and reduction pills neutralised each others
		if (result.blocker > 0) return (V.sexStats.pills.mostTaken[type] = "blocker");
		else return (V.sexStats.pills.mostTaken[type] = ["growth", "reduction"].random());
	} else if (ret === 0 && result.blocker > 0)
		// we enter here when player didn't take any growth/blocker but took blockers
		return (V.sexStats.pills.mostTaken[type] = "blocker");
	else if (ret !== 0) {
		// we enter here when there's unbalance between growth/reduction
		if (ret < 0)
			// if reduction won
			return ret + result.blocker >= 0 ? (V.sexStats.pills.mostTaken[type] = "blocker") : (V.sexStats.pills.mostTaken[type] = "reduction");
		// determine if blocker win
		else if (ret > 0)
			// if growth won
			return ret - result.blocker <= 0 ? (V.sexStats.pills.mostTaken[type] = "blocker") : (V.sexStats.pills.mostTaken[type] = "growth"); // determine if blocker win
	}
}
window.redetermineMostTaken = redetermineMostTaken;

function onTakeClick(itemName) {
	V.sexStats.pills["pills"][itemName].owned -= 1;
	AmbienceAudio.effect("meds");

	switch (itemName) {
		case "Anti-Parasite Cream":
			V.sexStats.pills["pills"][itemName].doseTaken += 14;
			break;
		case "Hair Growth Formula":
			V.sexStats.pills["pills"][itemName].doseTaken += 3;
			break;
		case "sensitivity-decreasing cream":
		case "sensitivity-increasing cream":
			V.sexStats.pills["pills"][itemName].doseTaken += 1;
			break;
		default:
			// Stat for total pills consumption
			V.pillsConsumed = (V.pillsConsumed || 0) + 1;
			V.sexStats.pills["pills"][itemName].doseTaken += 1;
			break; // Stat for specific pill consumptionbreak;
	}

	for (const item of setup.pills) {
		if (item.name === itemName) {
			/* The player is swallowing this themselves, so the X-Change Gray Agent trait must not strip its body swap. */
			xchangeVoluntaryDoseBegin();
			try {
				for (const widget of item.effects) // run the widgets associated with a pill
					Wikifier.wikifyEval(typeof widget === "function" ? widget() : widget);
			} finally {
				xchangeVoluntaryDoseEnd();
			}
			V.sexStats.pills.lastTaken[item.type] = item.subtype; // keep track of the category of pill we last took
			V.sexStats.pills.mostTaken[item.type] = window.redetermineMostTaken(item.type, item.subtype);
			const dosesForOverdose =
				item.type === "calmoryl" ? Number(T.calmorylDose) : ["sleep", "painkiller"].includes(item.type) ? pillDosesTodayByType(item.type) : item.doseTaken();
			if (dosesForOverdose > 1 && !item.name.includes("blocker")) {
				switch (item.type) {
					case "parasite":
					case "hair":
						break;
					case "painkiller":
						if (dosesForOverdose > (item.subtype === "prescription pain relief" ? 2 : 3)) {
							V.overdosePillsTaken = item.name;
							Engine.play("PillCollectionPainkillerOverdose");
							return;
						}
						break;
					case "sleep":
						Engine.play("PillCollectionSleepOverdose");
						return;
					case "calmoryl":
						if (Number(T.calmorylDose) >= 5) {
							Engine.play("PillCollectionCalmorylPassOut");
							return;
						}
						break;
					case "pregnancy":
						V.overdosePillsTaken = item.name;
						Engine.play("PillCollectionSecondDosePregnancy");
						return;
					case "xchange":
						break;
					default:
						Engine.play("PillCollectionSecondDose");
						return;
				}
			}
			/* Temporary therapy and permanent X-Change purity neutralise the pill while still recording its consumption. */
			V.lastPillTakenDescription = xchangePillNeutralised(item)
				? "You swallow the pill, but it dissolves to nothing. Your resistance neutralises it before it can take hold, and your body stays exactly as it is."
				: typeof item.onTakeMessage === "function"
				? item.onTakeMessage()
				: item.onTakeMessage;
		}
	}
	Engine.play("Take Pill From Medicine Drawer");
}
window.onTakeClick = onTakeClick;

function onTakeClickSilent(itemName) {
	if (!setup.pills.find(pill => pill.name === itemName)) return;
	if (!V.sexStats?.pills?.pills?.[itemName]) return;
	if ((V.sexStats.pills.pills[itemName].owned || 0) <= 0) return false;

	V.sexStats.pills.pills[itemName].owned -= 1;

	switch (itemName) {
		case "Anti-Parasite Cream":
			V.sexStats.pills.pills[itemName].doseTaken += 14;
			break;
		case "Hair Growth Formula":
			V.sexStats.pills.pills[itemName].doseTaken += 3;
			break;
		case "sensitivity-decreasing cream":
		case "sensitivity-increasing cream":
			V.sexStats.pills.pills[itemName].doseTaken += 1;
			break;
		default:
			V.pillsConsumed = (V.pillsConsumed || 0) + 1;
			V.sexStats.pills.pills[itemName].doseTaken += 1;
			break;
	}

	for (const item of setup.pills) {
		if (item.name === itemName) {
			/* Deliberate dose: exempt from the X-Change Gray Agent trait, which only neuters pills forced on the player. */
			xchangeVoluntaryDoseBegin();
			try {
				for (const widget of item.effects) {
					Wikifier.wikifyEval(typeof widget === "function" ? widget() : widget);
				}
			} finally {
				xchangeVoluntaryDoseEnd();
			}

			V.sexStats.pills.lastTaken[item.type] = item.subtype;
			V.sexStats.pills.mostTaken[item.type] = window.redetermineMostTaken(item.type, item.subtype);
			/* Temporary therapy and permanent X-Change purity neutralise the pill while still recording its consumption. */
			V.lastPillTakenDescription = xchangePillNeutralised(item)
				? "You swallow the pill, but it dissolves to nothing. Your resistance neutralises it before it can take hold, and your body stays exactly as it is."
				: typeof item.onTakeMessage === "function"
				? item.onTakeMessage()
				: item.onTakeMessage;

			/* Reuse original daily notice path */
			V.pillsTaken = 1;

			return true;
		}
	}

	return false;
}
window.onTakeClickSilent = onTakeClickSilent;

function getCalmorylEffect() {
	if ((!V.calmoryl || typeof V.calmoryl !== "object") && V.calmorylDissociationUntil !== undefined) {
		const legacyEndsAt = Number(V.calmorylDissociationUntil);
		delete V.calmorylDissociationUntil;
		if (Number.isFinite(legacyEndsAt) && legacyEndsAt > V.timeStamp) {
			const dailyDoses = Number(V.sexStats?.pills?.pills?.["anti-anxiety tablets"]?.doseTaken) || 0;
			V.calmoryl = { endsAt: legacyEndsAt, doses: Math.max(3, dailyDoses) };
		}
	} else if (V.calmorylDissociationUntil !== undefined) {
		delete V.calmorylDissociationUntil;
	}

	const effect = V.calmoryl;
	if (!effect || typeof effect !== "object" || !Number.isFinite(Number(effect.endsAt)) || !Number.isFinite(Number(effect.doses))) return null;
	effect.endsAt = Number(effect.endsAt);
	effect.doses = Math.max(3, Math.floor(Number(effect.doses)));
	return effect;
}
window.getCalmorylEffect = getCalmorylEffect;

function calmorylDissociationActive() {
	const effect = getCalmorylEffect();
	return !!effect && effect.endsAt > V.timeStamp;
}
window.calmorylDissociationActive = calmorylDissociationActive;

function calmorylDissociationRemainingHours() {
	const effect = getCalmorylEffect();
	return effect && effect.endsAt > V.timeStamp ? Math.ceil((effect.endsAt - V.timeStamp) / 3600) : 0;
}
window.calmorylDissociationRemainingHours = calmorylDissociationRemainingHours;

function updateCalmorylDissociation() {
	const effect = getCalmorylEffect();
	if (effect && effect.endsAt > V.timeStamp) {
		V.dissociation = 2;
		return;
	}
	if (V.calmoryl !== undefined) {
		delete V.calmoryl;
		statChange.updatePlayerTraumaState();
	}
}
window.updateCalmorylDissociation = updateCalmorylDissociation;

function takeCalmoryl() {
	const record = V.sexStats?.pills?.pills?.["anti-anxiety tablets"];
	if (!record) return;

	V.trauma *= 0.7;
	statChange.trauma(0);
	statChange.stress(-3);

	const currentEffect = getCalmorylEffect();
	const activeEffect = currentEffect && currentEffect.endsAt > V.timeStamp ? currentEffect : null;
	const doses = activeEffect ? activeEffect.doses + 1 : Number(record.doseTaken) || 0;
	T.calmorylDose = doses;
	if (doses >= 2) {
		statChange.tiredness(doses === 2 ? 10 : 18);
		statChange.awareness(doses === 2 ? -1 : -2);
	}

	if (doses >= 3) {
		V.calmoryl = {
			endsAt: Math.max(activeEffect ? activeEffect.endsAt : 0, V.timeStamp) + 3 * 3600,
			doses,
		};
		V.dissociation = 2;
	}
}
window.takeCalmoryl = takeCalmoryl;

function canAutoTakeDailyPills() {
	if (V.statFreeze || V.molestationstart === 1 || V.combat) return false;

	const badEnds = V.badEndStats;
	const latestBadEnd = Array.isArray(badEnds) && badEnds.length ? badEnds[badEnds.length - 1] : null;
	if (latestBadEnd && !latestBadEnd.trackedEnd) return false;
	if (
		["island", "pirate_ship"].includes(V.location) ||
		(V.location === "cabin" && V.syndromeeden >= 1) ||
		((V.waterdragonJourneyDay || 0) !== 0 && ["sea", "seabeach"].includes(V.location))
	)
		return false;

	return (
		["home", "alex_cottage", "asylum", "prison"].includes(V.location) ||
		(V.location === "temple" && V.wardrobes?.temple?.unlocked) ||
		(V.location === "avery_mansion" && !["fallen", "kicked"].includes(V.avery_fate)) ||
		(V.location === "flats" && V.bus === "poppy_bedroom")
	);
}
window.canAutoTakeDailyPills = canAutoTakeDailyPills;

function autoTakeDailyPills() {
	if (!setup?.pills || !V.sexStats?.pills?.pills || !canAutoTakeDailyPills()) return;

	const categories = ["bottom", "breast", "penis", "pregnancy", "parasite", "hair", "harper"];

	for (const category of categories) {
		let chosen = null;

		for (const pill of setup.pills) {
			if (!pill || pill.type !== category) continue;
			if (typeof pill.autoTake !== "function") continue;
			if (pill.autoTake() !== true) continue;

			chosen = pill;
			break;
		}

		if (!chosen) continue;
		if (typeof chosen.take_condition === "function" && chosen.take_condition() !== 1) continue;

		if (typeof chosen.owned === "function" && chosen.owned() <= 0) {
			V.sexStats.pills.pills[chosen.name].autoTake = false;
			continue;
		}

		if (!onTakeClickSilent(chosen.name)) continue;
		/* Stamp the day, or the per-passage check retakes the pill until take_condition blocks it (a daily overdose). */
		V.pillsTakenOn = Time.monthDay.toString() + Time.month + Time.year.toString();
		V.effectsmessage = 1;
		if (chosen.owned() <= 0) {
			V.sexStats.pills.pills[chosen.name].autoTake = false;
			V.pillsTakenLast = 1;
		}
	}
}
window.autoTakeDailyPills = autoTakeDailyPills;

function onAutoTakeClick(itemName, itemType) {
	if (itemType === "xchange") return;

	for (const item in setup.pills) {
		if (setup.pills[item].name === itemName) {
			V.sexStats.pills["pills"][itemName].autoTake = !V.sexStats.pills["pills"][itemName].autoTake; // toggle auto take
			window.initPillContextButtons(setup.pills[item]); // change "Take every morning" button to "Stop taking them"
		} else if (["breast", "penis", "bottom", "pregnancy"].includes(itemType) && setup.pills[item].type === itemType)
			V.sexStats.pills["pills"][setup.pills[item].name].autoTake = false; // disable auto takes for other similar pills(bottom/penis/breast etc)
	}
	window.syncAutoTakeDisplayedState();
}
window.onAutoTakeClick = onAutoTakeClick;

function syncAutoTakeDisplayedState() {
	// Add or remove [Auto] tag from pill names in the pills menu
	for (const item of setup.pills) {
		const capitalisedName = item.name[0].toUpperCase() + item.name.slice(1);
		if (document.getElementById("hpi_name_" + capitalisedName) != null) {
			document.getElementById("hpi_name_" + capitalisedName).innerHTML = capitalisedName;
			document.getElementById("hpi_name_" + capitalisedName).innerHTML += item.autoTake() === true ? "<span class='hpi_auto_label'> [Auto]</span>" : "";
		}
	}
}
window.syncAutoTakeDisplayedState = syncAutoTakeDisplayedState;

function onSecondDoseTakenSetVars() {
	// If player take two doses of anything but blocker/pregnancy/harper/asylum pills, determine the risk stat and
	let doseTaken = { bottom: 0, penis: 0, breast: 0 };

	T.risk = 0;
	T.pillAmountOfCategoriesUsed = 0;
	for (const item of setup.pills) {
		// determine how many pills of each have been taken.
		if (["bottom", "penis", "breast"].includes(item.type)) doseTaken[item.type] += item.doseTaken();
	}
	const sumValues = obj => Object.values(obj).reduce((a, b) => a + b); // count every doses
	let i = -1;
	const doseTakenSum = sumValues(doseTaken); // store the count in this variable
	while (++i < doseTakenSum)
		// for each dose count, increase the overall risk.
		T.risk += random(3, 10); // For each dose found, add 3-10 risk points.
	doseTaken = [
		["bottom", doseTaken["bottom"]],
		["penis", doseTaken["penis"]],
		["breast", doseTaken["breast"]],
	]; // Changed object to array as it's easier to sort.
	for (const array of doseTaken) {
		if (array[1] > 0) T.pillAmountOfCategoriesUsed += 1; // How many different categories of pills we took ?
	}
	i = -1;
	while (++i < doseTaken.length - 1) {
		// sort categories that got the most doses
		if (doseTaken[i][1] < doseTaken[i + 1][1]) {
			const tmp = doseTaken[i];

			doseTaken[i] = doseTaken[i + 1];
			doseTaken[i + 1] = tmp;
			i = -1;
		}
	}
	i = doseTaken[0][1] > doseTaken[1][1] ? 1 : doseTaken[0][1] === doseTaken[1][1] ? 2 : doseTaken[0][1] === doseTaken[2][1] ? 3 : 1; // determine how many have same value
	const chosen = random(0, i - 1);
	V.pillCat = doseTaken[chosen][0]; // select random category among the 1st ones
	T.secondaryPill = chosen > 0 ? doseTaken[chosen - 1][0] : doseTaken[chosen + 1][0]; // select second category
}
window.onSecondDoseTakenSetVars = onSecondDoseTakenSetVars;

function ensurePillInventoryRecords(pills) {
	if (!pills || typeof pills !== "object") return;
	for (const item of setup.pills) {
		if (!pills[item.name] || typeof pills[item.name] !== "object") {
			pills[item.name] = { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 };
		} else {
			Object.assign(pills[item.name], {
				autoTake: pills[item.name].autoTake === true,
				doseTaken: Number.isFinite(Number(pills[item.name].doseTaken)) ? Number(pills[item.name].doseTaken) : 0,
				owned: Number.isFinite(Number(pills[item.name].owned)) ? Number(pills[item.name].owned) : 0,
				overdose: Number.isFinite(Number(pills[item.name].overdose)) ? Number(pills[item.name].overdose) : 0,
			});
		}
	}
}
window.ensurePillInventoryRecords = ensurePillInventoryRecords;

function backCompPillsInventory() {
	/* Return immediately if $sexStats doesn't exist. */
	if (typeof V.sexStats === "undefined") return;
	const oPills = V.sexStats.pills;
	const pills = {};
	if (typeof oPills === "object") {
		/* If our $sexStats.pills is an object and has this property, it is ready for production. */
		/* Man on the internet said this is right */
		if (typeof oPills.mostTaken === "object") {
			oPills.pills ??= {};
			ensurePillInventoryRecords(oPills.pills);
			return;
		}
	}
	Object.assign(pills, {
		"bottom reduction": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"bottom growth": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"bottom blocker": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"breast reduction": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"breast growth": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"breast blocker": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"penis reduction": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"penis growth": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"penis blocker": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"anti-parasite": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"fertility booster": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		contraceptive: { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"asylum's prescription": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"Dr Harper's prescription": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"Anti-Parasite Cream": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"sensitivity-decreasing cream": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
		"sensitivity-increasing cream": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0 },
	});
	if (typeof oPills === "object") {
		try {
			pillsObjectRepair(oPills, pills);
		} catch (error) {
			Errors.report("Compatibility patch for pills object failed: " + error, { oPills, pills });
		}
	}
	ensurePillInventoryRecords(pills);
	if (typeof oPills === "undefined") {
		/* If our $sexStats.pills was empty, simply set the object in preparation to assign. */
		V.sexStats.pills = {};
	}
	Object.assign(V.sexStats.pills, {
		boughtOnce: oPills?.boughtOnce === true,
		lastTaken: { bottom: "", breast: "", penis: "", pregnancy: "" },
		mostTaken: { bottom: "", breast: "", penis: "", pregnancy: "" },
		pills,
	});
}
window.backCompPillsInventory = backCompPillsInventory;

function pillsObjectRepair(oPills, pills) {
	/* if the variable already exist and is not of the new version(new version has "mostTaken" property that's why we check it),
	then we try to port the old one to the new one */
	if (typeof oPills.bottom === "object") {
		Object.assign(pills, {
			"bottom reduction": { autoTake: oPills.bottom.autoTake === "reduction", owned: oPills.bottom.owned.reduction },
			"bottom growth": { autoTake: oPills.bottom.autoTake === "growth", owned: oPills.bottom.owned.growth },
			"bottom blocker": { autoTake: oPills.bottom.autoTake === "blocker", owned: oPills.bottom.owned.blocker },
		});
		delete oPills.bottom;
	}
	if (typeof oPills.breast === "object") {
		Object.assign(pills, {
			"breast reduction": { autoTake: oPills.breast.autoTake === "reduction", owned: oPills.breast.owned.reduction },
			"breast growth": { autoTake: oPills.breast.autoTake === "growth", owned: oPills.breast.owned.growth },
			"breast blocker": { autoTake: oPills.breast.autoTake === "blocker", owned: oPills.breast.owned.blocker },
		});
		delete oPills.breast;
	}
	if (typeof oPills.penis === "object") {
		Object.assign(pills, {
			"penis reduction": { autoTake: oPills.penis.autoTake === "reduction", owned: oPills.penis.owned.reduction },
			"penis growth": { autoTake: oPills.penis.autoTake === "growth", owned: oPills.penis.owned.growth },
			"penis blocker": { autoTake: oPills.penis.autoTake === "blocker", owned: oPills.penis.owned.blocker },
		});
		delete oPills.penis;
	}
	if (typeof V.asylumpills === "number") {
		Object.assign(pills, {
			"asylum's prescription": { owned: Number.isInteger(V.asylumpills) ? V.asylumpills : 0 },
		});
		delete V.asylumpills;
	}
	if (typeof V.pills === "number") {
		Object.assign(pills, {
			"Dr Harper's prescription": { owned: Number.isInteger(V.pills) ? V.pills : 0 },
		});
		delete V.pills;
	}
}

function determineAutoTakePill(category) {
	T.autoTakeDetermined = null;
	if (category === "xchange") return;

	for (const pill of setup.pills) {
		if (pill.type === category && pill.autoTake() === true) {
			T.autoTakeDetermined = pill.name;
			return;
		}
	}
}
window.determineAutoTakePill = determineAutoTakePill;

function resetAllDoseTaken() {
	for (const pill in V.sexStats.pills["pills"]) {
		switch (pill) {
			case "Anti-Parasite Cream":
			case "fertility booster":
			case "contraceptive":
			case "Hair Growth Formula":
				if (V.sexStats.pills["pills"][pill].doseTaken > 0) {
					V.sexStats.pills["pills"][pill].doseTaken--;
				}
				break;
			default:
				V.sexStats.pills["pills"][pill].doseTaken = 0;
				break;
		}
	}
}
window.resetAllDoseTaken = resetAllDoseTaken;

function resetLastTaken() {
	V.sexStats.pills.lastTaken = { bottom: "", breast: "", penis: "", pregnancy: "" };
}
window.resetLastTaken = resetLastTaken;

function resetMostTaken() {
	V.sexStats.pills.mostTaken = { bottom: "", breast: "", penis: "", pregnancy: "" };
}
window.resetMostTaken = resetMostTaken;

function getAllPills() {
	for (const item of Object.keys(V.sexStats.pills.pills)) V.sexStats.pills.pills[item].owned = 14;
}
window.getAllPills = getAllPills;

function hasPillsTaken(type) {
	if (!setup.pills.find(pill => pill.name === type)) return Errors.report("Couldn't find pills", type);
	return V.sexStats.pills.pills?.[type]?.doseTaken || 0;
}
window.hasPillsTaken = hasPillsTaken;
