/* eslint-disable dot-notation */
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
		warning_label:
			"Warning: Severe side effects upon exceeding the maximum dose prescribed per day. Not to be associated with any other hormonal treatment.",
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
		icon: "img/misc/icon/pillbottom.png",
		frontIcon: "img/misc/icon/smalldownarrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["bottom growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["bottom blocker"].doseTaken === 0
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
		icon: "img/misc/icon/pillbottom.png",
		frontIcon: "img/misc/icon/smalluparrow.png",
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
		icon: "img/misc/icon/pillbottom.png",
		frontIcon: "img/misc/icon/smallcross.png",
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
		icon: "img/misc/icon/pillbreast.png",
		frontIcon: "img/misc/icon/smalldownarrow.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["breast growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["breast blocker"].doseTaken === 0
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
		icon: "img/misc/icon/pillbreast.png",
		frontIcon: "img/misc/icon/smalluparrow.png",
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
		icon: "img/misc/icon/pillbreast.png",
		frontIcon: "img/misc/icon/smallcross.png",
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
		icon: "img/misc/icon/pillpenis.png",
		frontIcon: "img/misc/icon/smalldownarrow.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["penis growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["penis blocker"].doseTaken === 0
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
		icon: "img/misc/icon/pillpenis.png",
		frontIcon: "img/misc/icon/smalluparrow.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 2 &&
				V.sexStats.pills["pills"]["penis reduction"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["penis blocker"].doseTaken === 0
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
		icon: "img/misc/icon/pillpenis.png",
		frontIcon: "img/misc/icon/smallcross.png",
		display_condition() {
			return V.player.penisExist && this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 &&
				V.sexStats.pills["pills"]["penis growth"].doseTaken === 0 &&
				V.sexStats.pills["pills"]["penis reduction"].doseTaken === 0
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
				return (
					"Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "")
				);
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
		icon: "img/misc/icon/fertility_booster.png",
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
				return (
					"Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "")
				);
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
		icon: "img/misc/icon/contraceptive_pills.png",
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
				return (
					"Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "")
				);
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
		icon: "img/misc/icon/antiParasiteCream.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() === 0 ? 1 : 0;
		},
		effects: [],
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
		icon: "img/misc/icon/strong pills.png",
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
		description: "Antipsychotic medication.",
		onTakeMessage: "You take the pills Doctor Harper prescribed. You feel dizzy.",
		warning_label:
			"Warning: The side effects upon reaching maximum dosage have not undergone sufficient study. Proceed with caution. <span class='hpi_blur'></span>",
		indicators: ["<span class='hpi_indic_green'>+ Control</span>", "<span class='hpi_indic_blue'>- Awareness</span>"],
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
		icon: "img/misc/icon/pills.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return this.doseTaken() < 1 && V.medicated === 0 ? 1 : 0;
		},
		effects: [`<<awareness -1>>`, `<<control 10>>`, `<<set $medicated += 1>>`],
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
				return (
					"Effective for " + V.sexStats.pills["pills"][this.name].doseTaken + " day" + (V.sexStats.pills["pills"][this.name].doseTaken > 1 ? "s" : "")
				);
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
	{
		name: "X-Change Pink NOW",
		description:
			"A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours. And just like with Basic, it's impossible to get pregnant.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 0.25>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 0.25 "genderflip">>`],
	},
	{
		name: "X-Change Pink Basic",
		description:
			"X-Change's hallmark product. They're affordable and dosages typically last 24 hours or less, after which you turn back. It's impossible to get pregnant on Basic.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 1>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip">>`],
	},
	{
		name: "X-Change Pink Weekly",
		description:
			"A significantly more concentrated version of X-Change Basic. Intended for those wanting longer duration pills, but still not quite ready for the commitment and risks of an Xtra Strength. Last for about 7 days.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 7>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip">>`],
	},
	{
		name: "X-Change Pink Xtra Strength",
		description:
			"These are more expensive dosages that typically last 30 days. It is possible to become pregnant on Xtra Strength, but the chance of that happening is very low.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 30 "fertile">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 30 "genderflip" "fertile">>`],
	},
	{
		name: "X-Change Pink Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds an additional day to the duration. It is impossible to become pregnant while under the non-permanent effects of Continue.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: May become permanent upon climaxing if remaining duration ever exceeds 30 days. Certain parasitic infections may also result in permanence as well, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 3 "continue">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 3 "genderflip" "continue">>`],
	},
	{
		name: "X-Change X-Tend",
		description:
			"Genderswapping pill that grants you the opportunity to achieve your ever-dreamed penis endowment. With this pill, you'll temporarily transform into a woman with the uncanny ability to integrate superior genetic code from other human males. Get their big dick juice into your womb, and with every load you'll come closer to matching their size and girth.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well. | <span class='blue'>+1 X-Change X-Tend Cancel pill</span>",
		warning_label:
			"Warning: Orgasming while under the effects of this pill will cause your virile member to shrink. Beware that this pill offers no built-in protections against pregancy, which can result in genderswap permanency. Also, certain parasitic infections (in particular those affecting the genitalia) may prevent this pill from expiring naturally.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtend",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 7 "xtend" "fertile">>`, `<<set V.sexStats.pills["pills"]["X-Change X-Tend Cancel"].owned++>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "xtend" "fertile">>`, `<<set V.sexStats.pills["pills"]["X-Change X-Tend Cancel"].owned++>>`],
	},
	{
		name: "X-Change X-Tend Cancel",
		description:
			"This companion pill to the X-Change X-Tend allows you to end you transformation early, at the cost of forfeiting any gains.Its main purpose however is to let you cut your losses, if you happen to have orgasmed already while under the X-Tend's effects. Thus preventing you from suffering any further losses without the chance of any gains.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.",
		warning_label:
			"Warning: This pill will not negate any genital size losses already incurred pver the course of its companion pill's effect. Nor will it allow you to cash-in your gains early. If this pill is ingested to cancel the companion pill's effect, any prior size gains will be lost.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtend",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.xtendEffect
				? 1
				: 0;
		},
		effects: [`<<xchange-restore>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-xchange-restore>>`],
	},
	{
		name: "X-Change Pink Resistance",
		description:
			"Temporary pill but if you climax, there's a chance it becomes permanent. Each climax increases the likelihood of permanence. Pill effects may last upto 24 hours or less. It is impossible to become pregnant while under the non-permanent effects of Resistance.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: While there is no risk of conventional pregnancy, certain parasitic infections may result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 1 "resistance">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "resistance">>`],
	},
	{
		name: "X-Change Pink Breeder",
		description:
			"Temporary pill causing increased fertility and heightened pleasure during vaginal insemination. Pill effects may last upto a whole week.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia. Known to cause intense cravings for insemination",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink breeder",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 7 "breeder" "fertile">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "breeder" "fertile">>`],
	},
	{
		name: "X-Change Pink Innocence",
		description:
			"Temporary pill designed to wipe all sexual knowledge from the user's mind.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink innocence",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 1 "innocence">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "innocence">>`],
	},
	{
		name: "X-Change Pink Swell",
		description:
			"Temporary pill designed to transform the user into a curvy woman.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink swell",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 1 "swell">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "swell">>`],
	},
	{
		name: "X-Change Pink Bimbo",
		description:
			"Decreases your intelligence and increases your lewdness. Comes with a built-in swell effect.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink bimbo",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 1 "bimbo" "swell">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "bimbo" "swell">>`],
	},
	{
		name: "X-Change Pink CumCure",
		description:
			"Reduces the duration of your transformation every time cum is deposited inside you.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink cumcure",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink 7 "cumcure">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "cumcure">>`],
	},
	{
		name: "X-Change Sissy",
		description:
			"A variant of the X-Change Basic. The transforming effects of the standard formula are halted mid-way before the transformation is over, resulting on a body that looks feminine while still technically being male.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. Part way through, as your balls and penis shrink to their tiniest size, the transformation suddenly halts. Leaving yourself sporting most of the kinks and perks of a woman's body, while still being male.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well in a feminine way.",
		warning_label:
			"Warning: Side effect of the neutralising agent causes user to crave dressing up as the opposite sex, while also feeling stressed the longer they remain wearing clothes of their starting gender.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink crossdress",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 1 "crossdress">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "crossdress">>`],
	},
	{
		name: "X-Change Choice (F)",
		description:
			"Temporary genderswapping pill whose effects last indefinitely until its included reverse pill is ingested.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose the reversal pill included in this packaging. No other pill (not even of the same type) can reverse the effects of this Choice pill.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-choice>>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (F)"].owned++>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		// TODO: Revise how Choice pills work on NPCs
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "choice">>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (NPC)"].owned++>>`],
	},
	{
		name: "X-Change Choice Reversal (F)",
		description:
			"Genderswapping pill that reverses the effects of a previously consumed Choice pill.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.",
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose this pill. No other pill (not even of the same type) can reverse the effects of the Choice pill included in this packaging.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "f" && V.xchange.pill.choiceEffect 
				? 1 
				: 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.choiceEffect
				? 1
				: 0;
		},
		effects: [`<<xchange-restore>>`],
	},
	{
		name: "Suspicious Pink Pill",
		description:
			"An unlabelled pink pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.sex !== "f" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-pink random(1,3)>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "m") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "random">>`],
	},
	{
		name: "Suspicious Purple Pill",
		description:
			"An unlabelled purple pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange random(1,3) "herm" "random">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "herm" "random">>`],
	},
	{
		name: "X-Change Blue NOW",
		description:
			"A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 0.25>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 0.25 "genderflip">>`],
	},
	{
		name: "X-Change Blue Basic",
		description:
			"X-Change's hallmark product. They're affordable and dosages typically last 24 hours or less, after which you turn back.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 1>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip">>`],
	},
	{
		name: "X-Change Blue Weekly",
		description:
			"A significantly more concentrated version of X-Change Basic. Intended for those wanting longer duration pills, but still not quite ready for the commitment and risks of an Xtra Strength. Last for about 7 days.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 7>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip">>`],
	},
	{
		name: "X-Change Blue Xtra Strength",
		description:
			"These are more expensive dosages that typically last 30 days. After which you turn back.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 30>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 30 "genderflip">>`],
	},
	{
		name: "X-Change Blue Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds an additional day to the duration.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: May become permanent upon climaxing if remaining duration ever exceeds 30 days. Certain parasitic infections may also result in permanence as well, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 3 "continue">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 3 "genderflip" "continue">>`],
	},
	{
		name: "X-Change Blue Resistance",
		description:
			"Temporary pill but if you climax, there's a chance it becomes permanent. Each climax increases the likelihood of permanence. Pill effects may last upto 24 hours or less.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: CANNOT BE TAKEN DURING PREGNANCY. Certain parasitic infections may result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 1 "resistance">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "resistance">>`],
	},
	{
		name: "X-Change Blue Bull",
		description:
			"Temporary genderswap pill causing increased virility. Pill effects may last upto a whole week.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia. Known to cause intense cravings for insemination",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue bull",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 7 "bull">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "bull">>`],
	},
	{
		name: "X-Change Blue Innocence",
		description:
			"Temporary pill designed to wipe all sexual knowledge from the user's mind.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue innocence",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 1 "innocence">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "innocence">>`],
	},
	{
		name: "X-Change Blue Swell",
		description:
			"Temporary pill designed to transform the user into a hung man.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue swell",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 1 "swell">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "swell">>`],
	},
	{
		name: "X-Change Blue Himbo",
		description:
			"Decreases your intelligence and increases your lewdness. Comes with a built-in swell effect.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue himbo",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 1 "bimbo" "swell">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "bimbo" "swell">>`],
	},
	{
		name: "X-Change Blue CumCure",
		description:
			"Reduces the duration of your transformation every time cum is deposited inside you.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue cumcure",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue 7 "cumcure">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "cumcure">>`],
	},
	{
		name: "X-Change Butch",
		description:
			"A variant of the X-Change Basic. The transforming effects of the standard formula are halted mid-way before the transformation is over, resulting on a body that looks masculine while still technically being female.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. Part way through, as your breasts finish shrinking until they're flat, the transformation suddenly halts. Leaving you sporting most of the kinks and perks of a man's body, while still remaining female.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you look rough and chiselled. Making you seem quite attractive in a masculine way.",
		warning_label:
			"Warning: Side effect of the neutralising agent causes user to crave dressing up as the opposite sex, while also feeling stressed the longer they remain wearing clothes of their starting gender.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue crossdress",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 1 "crossdress">>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "crossdress">>`],
	},
	{
		name: "X-Change Choice (M)",
		description:
			"Temporary genderswapping pill whose effects last indefinitely until its included reverse pill is ingested.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose the reversal pill included in this packaging. No other pill (not even of the same type) can reverse the effects of this Choice pill.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-choice>>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (M)"].owned++>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		// TODO: Revise how choice works on NPCs
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "choice">>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (NPC)"].owned++>>`],
	},
	{
		name: "X-Change Choice Reversal (M)",
		description:
			"Genderswapping pill that reverses the effects of a previously consumed Choice pill.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.",
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose this pill. No other pill (not even of the same type) can reverse the effects of the Choice pill included in this packaging.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbreast.png",
		display_condition() {
			return this.owned() > 0 && V.player.gender !== "m" && V.xchange.pill.choiceEffect 
				? 1 
				: 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.choiceEffect
				? 1
				: 0;
		},
		effects: [`<<xchange-restore>>`],
	},
	{
		name: "X-Change Purple Basic",
		description:
			"X-Change's hallmark product. They're affordable and dosages typically last 24 hours or less, after which you turn back. It's impossible to get pregnant on Basic.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 1 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "herm">>`],
	},
	{
		name: "X-Change Purple Xtra Strength",
		description:
			"These are more expensive dosages that typically last 30 days. It is possible to become pregnant on Xtra Strength, but the chance of that happening is very low.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 30 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 30 "herm">>`],
	},
	{
		name: "X-Change Purple Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds an additional day to the duration.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 3 "herm" "continue">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 3 "herm" "continue">>`],
	},
	{
		name: "X-Change Purple Resistance",
		description:
			"Temporary pill but if you climax, there's a chance it becomes permanent. Each climax increases the likelihood of permanence. Pill effects may last upto 24 hours or less.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 1 "herm" "resistance">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 1 "herm" "resistance">>`],
	},
	{
		name: "X-Change Purple NOW",
		description:
			"A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 0.25 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 0.25 "herm">>`],
	},
	{
		name: "X-Change Purple Weekly",
		description:
			"A significantly more concentrated version of X-Change Basic. Intended for those wanting longer duration pills, but still not quite ready for the commitment and risks of an Xtra Strength. Last for about 7 days.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 7 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "herm">>`],
	},
	{
		name: "X-Change Purple Breeder",
		description:
			"Temporary pill causing increased fertility and heightened pleasure during vaginal insemination. Pill effects may last upto a whole week.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple breeder",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 7 "herm" "breeder" "fertile">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "herm" "breeder" "fertile">>`],
	},
	{
		name: "X-Change Purple Bull",
		description:
			"Temporary genderswap pill causing increased virility. Pill effects may last upto a whole week.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple bull",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillbottom.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null 
				? 1
				: 0;
		},
		effects: [`<<take-xchange 7 "herm" "bull">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange 7 "herm" "bull">>`],
	},
	{
		name: "Suspicious Blue Pill",
		description:
			"An unlabelled blue pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage: 
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpenis.png",
		display_condition() {
			return this.owned() > 0 && V.player.sex !== "m" ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-blue random(1,3)>>`],
		npc_display_condition() {
			return this.owned() > 0 && npcStartingSexIs($xchange.npcTargetNo, $xchange.npcTargetName, "f") && !npcIsXChanged($xchange.npcTargetNo ?? $xchange.npcTargetName) && !npcIsPregnant($xchange.npcTargetName)
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "random">>`],
	},
	{
		name: "X-Change Clone: Whitney",
		description:
			"Custom-tailored temporary pill, based upon the genetic material of subject Whitney. Pill effects last up to 24 hours or less. And regardless of target's gender, it remains impossible to become pregnant under this pill.",
		onTakeMessage: 
			"<span class=\"teal\">You down the pill in a single gulp.</span><br><br>As you close your eyes anticipating the change, the pill's characteristic heat starts to radiate into your body. Reaching every nook and cranny of your being. <span class=\"red\">A sudden wave of fury washes over you, as thoughts of rape, abuse, and self-loathing fill your mind. For a few moments, you're utterly enraged at the world.</span><br><br>Yet once the emotional maelstrom subsides, you look at yourself in the mirror, and there's only Whitney there to stare back at you. The pill has done its work.",
		warning_label:
			"Warning: EXTREMELY UNFINISHED CONTENT. May result in very silly situations. Cannot be taken during pregnancy. Certain parasitic infections may result in permanence, in particular those affecting the genitalia. Use with care.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "clone",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillpremium.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null
				? 1
				: 0;
		},
		effects: [`<<xchange-clone 3 "Whitney">>`],
	},
	{
		name: "SWP Anti-crossdress Pill",
		description:
			"A shady pill advertised to deal with sissifying / butchifying effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.genderflipEffect && V.xchange.pill.genderificationEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "crossdress">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-breeder Pill",
		description:
			"A shady pill advertised to deal with breeder effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting and body-altering effects.",
		warning_label:
			"Warning: Does not completely remove fertility. May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.breederEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "breeder">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-bull Pill",
		description:
			"A shady pill advertised to deal with bull effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting and body-altering effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.bullEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "bull">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-continue Pill",
		description:
			"A shady pill advertised to deal with continue effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with those awfully risky effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.continueEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "continue">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-resistance Pill",
		description:
			"A shady pill advertised to deal with resistance effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with those awfully risky effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.resistanceEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "resistance">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-portal Pill",
		description:
			"A shady pill advertised to deal with portal effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with those awfully risky effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.portalEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "portal">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-fertile Pill",
		description:
			"A shady pill advertised to deal with fertile effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with pregnancy risks.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.fertile && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "fertile">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-passion Pill",
		description:
			"A shady pill advertised to deal with passion effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with those awfully risky effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.passionEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "passion">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-dumb-bitch Pill",
		description:
			"A shady pill advertised to deal with dumb-bitch effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the knowledge you'll no longer have to deal with those awfully risky effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.dumbBitchEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "dumb-bitch">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-swell Pill",
		description:
			"A shady pill advertised to deal with swell effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting and body-altering effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.swellEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "swell">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-bimbo Pill",
		description:
			"A shady pill advertised to deal with bimbo (and himbo) effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting and body-altering effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.bimboEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "bimbo">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "SWP Anti-cumcure Pill",
		description:
			"A shady pill advertised to deal with cumcure effects, 100% satisfaction guaranteed.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>And... quite surprisingly, you feel nothing? But not snake-oil nothing. Rather, you feel a nothingness that can only feel like relief not too distinct from a silence after being stuck in a noisy room. It seems the pill may have done what it advertised. But it's still too early to tell.<br><br>Even so, you take a deep breath in, safe in the belief you'll no longer have to deal with those awful mind-afflicting and body-altering effects.",
		warning_label:
			"Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.cumcureEffect && V.xchange.pill.effectsKnown
				? 1
				: 0;
		},
		effects: [`<<xchange-removeeffect "cumcure">>`, "<<xchange-addsideeffect>>"],
	},
	{
		name: "X-Change Antidote",
		description:
			"An expensive solution for those who are willing and can afford it. A pill that reduces the remaining duration of your current pill by a single day, at the expense of some severe side-effects. If remaining duration reaches zero, your pill shall expire within the next hour.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation after having read the warning label.</span><br><br><span class=\"red\">Almost immediately you're overcome by a searing pain that brings you down to your knees. It burns and hurts like hell. A skull-splitting headache, nausea, sudden fever, shortness of breath. The list goes on. Words cannot even begin to describe how incredibly awful you feel.</span><<gggpain>><<ggstress>><br><br>After several minutes of this, you're bent over on the floor. Clasping your head with one hand, and your chest with the other. Almost blacking out multiple times. Until it finally starts to subside.<<gpain>><<gstress>><br><br>Once your body finally settles down, you manage to stand up despite the grueling experience. Who in their right mind would willingly subject themselves to this kind of pain unless they really had to?<<gstress>>",
		warning_label:
			"Warning: Will cause severe pain and nausea. Not recommended while under stress. May only be taken while under the effects of a non-permanent pill. Has no effect for pregnant takers or those genitally afflicted by parasites. Releases a biological agent that targets X-Change compounds embedded all across the body. Does not self replicate.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "antidote",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && !(pillIsPermanent() || pillTimerPaused())
				? 1
				: 0;
		},
		effects: [`<<xchange-antidote 1>>`],
	},
	{
		name: "X-Change Antidote Forte",
		description:
			"An very expensive solution for those who are willing and can afford it. A pill that reduces the remaining duration of your current pill by a whole week, at the expense of some extreme side-effects. If remaining duration reaches zero, your pill shall expire within the next hour.",
		onTakeMessage: 
			"<span class=\"purple\">You down the pill with some hesitation after having read the warning label.</span><br><br><span class=\"red\">Almost immediately you're overcome by a searing pain that brings you down to your knees. It burns and hurts like hell. A skull-splitting headache, nausea, sudden fever, shortness of breath. The list goes on. Words cannot even begin to describe how incredibly awful you feel.</span><<gggpain>><<gggstress>><br><br>After several minutes of this, you're bent over on the floor. Clasping your head with one hand, and your chest with the other. Almost blacking out multiple times. Until it finally starts to subside.<<ggpain>><<ggstress>><br><br>Once your body finally settles down, you manage to stand up despite the grueling experience. Who in their right mind would willingly subject themselves to this kind of pain unless they really had to?<<gstress>>",
		warning_label:
			"Warning: Will cause grueling pain and nausea. Not recommended while under any kind of stress. May only be taken while under the effects of a non-permanent pill. Has no effect for pregnant takers or those genitally afflicted by parasites. Releases a biological agent that targets X-Change compounds embedded all across the body. Does not self replicate.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills["pills"][this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills["pills"][this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "antidote",
		shape: "pill",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && !(pillIsPermanent() || pillTimerPaused())
				? 1
				: 0;
		},
		effects: [`<<xchange-antidote 7>>`],
	},
	{
		name: "X-Change Test",
		description:
			"A single-use test that helps you determine what kind of X-Change pill was ingested. To make it work, simply expose the tip to the user's urine and await the message on the display.",
		onTakeMessage: 
			"You do as instructed by the product manual, and await for a moment as the display begins to blink.",
		warning_label:
			"Warning: Do not re-use. Readings will not be accurate.",
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
			return "Take test";
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "test",
		shape: "spray",
		overdose() {
			return V.sexStats.pills["pills"][this.name].overdose;
		},
		icon: "img/misc/icon/pregnancy_test.gif",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return (V.xchange.pill && V.xchange.pill.active)
				? 1
				: 0;
		},
		effects: [`<<set V.xchange.pill.testPending to true>>`],
	},
];
// ToDo: figure out a means to allow applying the Hair Growth Formula to pubic hair as well

function generateHomePillsInventory() {
	$(function () {
		T.disableGridClick = false;
		for (const item of setup.pills) {
			if (item.display_condition() == 1) window.addElementToGrid(item);
		}
	});
}
window.generateHomePillsInventory = generateHomePillsInventory;

function addElementToGrid(item) {
	$(function () {
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
	});
}
window.addElementToGrid = addElementToGrid;

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
						<div>
							<a id="hpi_take_pills" onclick="window.onTakeClick(${itemName}, ${itemType})">Take pill</a>
						</div>
						<div>
							<a id="hpi_take_every_morning" onclick="window.onAutoTakeClick(${itemName}, ${itemType})">Take every morning</a>
						</div>
					</div>
				</div>`;
				window.initPillContextButtons(item);
				document.getElementById("hpi_desc_img").innerHTML =
					(item.frontIcon
						? `<img${item.shape === "galenic" ? ` style="margin-left: 17%;"` : ""} class="icon infront" src="${item.frontIcon}"/>`
						: "") +
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

	// special case if pill type is "asylum" or "harper"
	if (item.type === "asylum" || item.type === "harper") {
		document.getElementById("hpi_take_every_morning").className = "hidden"; // prevent 'Take every Morning' option to be displayed for those type of pills
		document.getElementById("hpi_take_pills").classList.add("hpi_take_me_single"); // readapt css since there's only one button now
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

	switch (itemName) {
		case "Anti-Parasite Cream":
			V.sexStats.pills["pills"][itemName].doseTaken += 14;
			break;
		case "Hair Growth Formula":
			V.sexStats.pills["pills"][itemName].doseTaken += 3;
			break;
		default:
			// Stat for total pills consumption
			V.pillsConsumed = (V.pillsConsumed || 0) + 1;
			V.sexStats.pills["pills"][itemName].doseTaken += 1;
			break; // Stat for specific pill consumptionbreak;
	}

	for (const item of setup.pills) {
		if (item.name === itemName) {
			for (const widget of item.effects) // run the widgets associated with a pill
				Wikifier.wikifyEval(typeof widget === "function" ? widget() : widget);
			V.sexStats.pills.lastTaken[item.type] = item.subtype; // keep track of the category of pill we last took
			V.sexStats.pills.mostTaken[item.type] = window.redetermineMostTaken(item.type, item.subtype);
			if (item.doseTaken() > 1 && !item.name.includes("blocker")) {
				switch (item.type) {
					case "parasite":
					case "hair":
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
			V.lastPillTakenDescription = item.onTakeMessage;
		}
	}
	Engine.play("Take Pill From Medicine Drawer");
}
window.onTakeClick = onTakeClick;

function onAutoTakeClick(itemName, itemType) {
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

function backCompPillsInventory() {
	/* Return immediately if $sexStats doesn't exist. */
	if (typeof V.sexStats === "undefined") return;
	const oPills = V.sexStats.pills;
	const pills = {};
	if (typeof oPills === "object") {
		/* If our $sexStats.pills is an object and has this property, it is ready for production. */
		/* Man on the internet said this is right */
		if (typeof oPills.mostTaken === "object") return;
		try {
			pillsObjectRepair(oPills, pills);
		} catch (error) {
			Errors.report("Compatibility patch for pills object failed: " + error, { oPills, pills });
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
		"X-Change Pink Basic": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Weekly": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink NOW": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Xtra Strength": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change X-Tend": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Resistance": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Continue": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Breeder": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Innocence": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Swell": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink Bimbo": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Pink CumCure": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Basic": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Weekly": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue NOW": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Xtra Strength": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Resistance": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Continue": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Bull": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Innocence": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Swell": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue Himbo": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Blue CumCure": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Bull": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Breeder": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Basic": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Weekly": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple NOW": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Xtra Strength": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Resistance": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Purple Continue": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Clone: Whitney": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Antidote": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Antidote Forte": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
		"X-Change Test": { autoTake: false, doseTaken: 0, owned: 0, overdose: 0},
	});
	if (typeof oPills === "undefined") {
		/* If our $sexStats.pills was empty, simply set the object in preparation to assign. */
		V.sexStats.pills = {};
	}
	Object.assign(V.sexStats.pills, {
		boughtOnce: pills.boughtOnce === true,
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
