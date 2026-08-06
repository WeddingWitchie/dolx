/* globals npcStartingSexIs npcIsXChanged xchangePillProtectionActive */
/* ============================================================
   X-CHANGE PILL DEFINITIONS  (all of them)
   ============================================================
   This file now owns every X-Change pill object, migrated out of bedroom-pills.js so that file stays purely vanilla. 
   It contains:
     1. the gray (effect-only) pills, built from a factory + data table;
     2. the coloured / suspicious / utility pills, as literal objects (appended at the bottom via a second setup.pills.push).

   --- GRAY (effect-only) section ---
   This module contains ONLY the gray pill catalogue. 
   It relies on the surrounding X-Change system rather than re-declaring any of it:
     - Inventory records are created by ensurePillInventoryRecords(), which lives in bedroom-pills.js (it already loops over setup.pills, so the pills pushed below auto-register for new AND existing saves).
     - Effect names resolve through setup.xchangeEffectFlag() (xchange.js) and <<xchange-addeffect>> (xchange.twee).
*/

/* ---- coloured-pill body gate ----
   X-Change rewrites $player.sex (anatomy) and never touches $player.gender (identity),
   so suitability is judged on sex: cuntboys and dickgirls can take whatever their current body can actually be changed from.
   
   Pills always stay listed in the medicine drawer while owned, an unsuitable pill greys out for the player but can still be fed to NPCs.
   allowDualGenitals keeps the old Alpha/Omega/NOW exception where a body with both sets of genitals may take the pill regardless. */
function xchangePillSuitsBody(color, allowDualGenitals = false) {
	const redundantSex = color === "pink" ? "f" : "m";
	if (V.player.sex !== redundantSex) return true;
	return allowDualGenitals && !!(V.player.penisExist && V.player.vaginaExist);
}
window.xchangePillSuitsBody = xchangePillSuitsBody;

function xchangePillBlockedReason(color, allowDualGenitals = false) {
	if (xchangePillSuitsBody(color, allowDualGenitals)) return "";
	return "This formula has nothing to change on your current body, so swallowing it would be a waste. Someone else could still be made to take it.";
}
window.xchangePillBlockedReason = xchangePillBlockedReason;

/* ---- protection gate ----
   Harper's treatment and the permanent purity trait stop an X-Change pill taking hold, so the drawer reports the dose as neutralised.
   They only apply to pills that would start or extend a transformation. The support pills (antidotes, SWP anti-pills and the test strip)
   act on a session that is already running and keep working normally, so they must not claim to have dissolved to nothing. */
const xchangeSupportSubtypes = ["antidote", "anti-pill", "test"];
function xchangePillNeutralised(item) {
	if (!item || item.type !== "xchange" || xchangeSupportSubtypes.includes(item.subtype)) return false;
	return xchangePillProtectionActive();
}
window.xchangePillNeutralised = xchangePillNeutralised;

/* Sex of the body the player returns to when no pill is active.
Suspicious pills can only be taken untransformed, so sellers picking a colour for the player must use this instead of V.player.sex, which reflects the current (possibly X-Changed) body. */
function xchangePlayerBaseSex() {
	if (playerIsXChanged()) {
		const origSex = V.xchange?.pill?.originalBody?.sex;
		if (["m", "f"].includes(origSex)) return origSex;
	}
	return V.player.sex;
}
window.xchangePlayerBaseSex = xchangePlayerBaseSex;

function makeGrayXChangePill(cfg) {
	return {
		name: cfg.name,
		description: cfg.description,
		onTakeMessage: cfg.onTakeMessage,
		warning_label: cfg.warning_label,
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: cfg.subtype,
		color: "gray",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: cfg.icon || "img/misc/icon/xchange-gray.png",
		/* An owned pill always lists in the drawer (matching the coloured pills); it greys out when it can't currently be taken rather than vanishing. The old cfg.display gate hid stack-only pills like Resistance/Continue when no session was active, which made freshly-bought pills look lost. */
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return cfg.canTake() ? 1 : 0;
		},
		take_blocked_reason() {
			return cfg.canTake() ? "" : cfg.blockedReason || "";
		},
		effects: cfg.effects,
	};
}
window.makeGrayXChangePill = makeGrayXChangePill;

/* ---- shared gate helpers (read at click time) ---- */
const grayGate = {
	always: () => true,
	hasVagina: () => !!V.player.vaginaExist,
	canConceive: () => !!V.player.vaginaExist && V.sexStats.vagina.pregnancy.type === null,
	/* Omega (or another mpreg source) lets a vagina-less body conceive anally. */
	canConceiveAnally: () => typeof canBeMPregnant === "function" && canBeMPregnant() && V.sexStats.anus.pregnancy.type === null,
	canConceiveAnyHole: () => grayGate.canConceive() || grayGate.canConceiveAnally(),
	/* The fertility course also potentiates sperm, so a penis qualifies on its own. */
	fertilityCourse: () => grayGate.hasPenis() || grayGate.canConceiveAnyHole(),
	hasPenis: () => !!V.player.penisExist,
	/* xtend pays out on the body you RETURN to, so allow it if you currently have a penis or your saved base body did. */
	xtendEligible: () => !!V.player.penisExist || (V.xchange.pill?.baseGenitals && V.xchange.pill.baseGenitals.penis),
	portalEnabled: () => !!V.portalPantiesEnabled,
	/* Resistance & Continue act on the running session's duration/permanence, so any active session qualifies (stack-only). */
	activeSession: () => playerIsXChanged(),
};

/* ---- the data table: one row per effect ----
   duration is in days; it's the timer the pill starts/extends to. */
function buildGrayXChangePills() {
	const teal = msg => `<span class="teal">You swallow the colourless pill.</span><br><br>${msg}`;
	const rows = [
		{
			name: "X-Change Breeder",
			subtype: "gray breeder",
			description:
				"A colourless X-Change capsule carrying only the Breeder agent: heightened fertility and intense cravings for insemination. Acts on whatever body you currently have.",
			onTakeMessage: teal(
				"At first, nothing dramatic happens. Then a thick, low warmth spreads through your abdomen as if your body has remembered a purpose it was never meant to forget. Your breathing turns shallow."
			),
			warning_label: "Warning: Requires a body that can conceive to take effect. Pregnancy may render any active transformation permanent.",
			canTake: grayGate.canConceiveAnyHole,
			blockedReason: "Needs a body that can currently conceive or a fertile womb. It stays in your drawer until you have one.",
			effects: [`<<xchange-gray 7 "breeder" "fertile">>`],
		},
		{
			name: "X-Change Bull",
			subtype: "gray bull",
			description: "A colourless X-Change capsule carrying only the Bull agent: a relentless, rutting urge to breed. Acts on whatever body you currently have.",
			onTakeMessage: teal(
				"Heat gathers heavily between your legs. Your pulse grows rougher, more demanding, as though some blunt animal certainty has shouldered its way into your thoughts. You feel ready to rut, to spend, to mark something with yourself."
			),
			warning_label: "Warning: Requires a penis to take effect.",
			canTake: grayGate.hasPenis,
			blockedReason: "Needs a penis to do anything on your current body. It stays in your drawer until then.",
			effects: [`<<xchange-gray 7 "bull">>`],
		},
		{
			name: "X-Change Omega",
			subtype: "gray omega",
			description:
				"A colourless X-Change capsule carrying only the Omega agent: anal pregnancy compatibility and insemination-triggered pleasure focused on your anus. Acts on whatever body you currently have.",
			onTakeMessage: teal(
				"A low warmth curls deep in your belly, then settles lower still, strange and insistent. Your body feels as if it has found a new place to hold life, and a new need it expects to be filled."
			),
			warning_label: "Warning: Enables anal pregnancy for the duration. Pregnancy may render any active transformation permanent.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 7 "omega">>`],
		},
		{
			name: "X-Change Alpha",
			subtype: "gray alpha",
			description:
				"A colourless X-Change capsule carrying only the Alpha agent: a knotted penis and a need to be buried inside a partner before release. Acts on whatever body you currently have.",
			onTakeMessage: teal(
				"Pressure builds in your cock, not as simple arousal but as shape, purpose, and a heavy need to lock in place. Your hips twitch with the sudden certainty that release will not come easily unless you are inside someone."
			),
			warning_label:
				"Warning: Requires a penis to take effect. Overrides normal inhibitions against initiating penetration and takes priority over receptive heat compulsions while the penis is usable.",
			canTake: grayGate.hasPenis,
			blockedReason: "Needs a penis to do anything on your current body. It stays in your drawer until then.",
			effects: [`<<xchange-gray 7 "alpha">>`],
		},
		{
			name: "X-Change Swell",
			subtype: "gray swell",
			description: "A colourless X-Change capsule carrying only the Swell agent: it inflates your most prominent assets to their maximum.",
			onTakeMessage: teal(
				"A taut pressure gathers beneath your skin. It starts as a faint prickling, then deepens into a slow ache as your body begins to fill out in all the places the compound favours. Every movement makes you newly aware of your own weight, softness, and shape."
			),
			warning_label: "Warning: Acts on whichever body you currently have.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 1 "swell">>`],
		},
		{
			name: "X-Change Hyper Fertility",
			subtype: "gray hyper fertility",
			description:
				"A colourless capsule carrying only the Hyper Fertility course: near-guaranteed conception, accelerated pregnancy, and a high chance of multiples. It reads whatever equipment your body currently offers: a womb conceives, the Omega agent (if active) lets you conceive anally instead, and a penis sires with supercharged seed.",
			onTakeMessage: teal(
				"The formula hits like a fever. Heat blooms in your belly, spreading outward until your whole body feels flushed, tuned, and dangerously ready to turn the smallest chance into something lasting."
			),
			warning_label:
				"Warning: Pregnancy will render any active transformation permanent. Multiple births are common and intended. On a body with a penis, greatly increases reproductive potency.",
			canTake: grayGate.fertilityCourse,
			blockedReason: "Needs a penis, or a body that can currently conceive.",
			effects: [`<<xchange-gray 7 "fertile" "fertility">>`],
		},
		{
			name: "X-Change Fertility",
			subtype: "gray fertility",
			description:
				"A colourless capsule that simply restores a normal fertility cycle for the duration, letting you conceive naturally. No cravings, no acceleration.",
			onTakeMessage: teal(
				"The change is subtler than you expected. A gentle warmth settles deep inside you as your body quietly readies itself. You feel your cycle shift."
			),
			warning_label: "Warning: Requires a fertile body. Pregnancy may render an active transformation permanent.",
			canTake: grayGate.canConceive,
			blockedReason: "Needs a fertile body that can currently conceive. It stays in your drawer until you have one.",
			effects: [`<<xchange-gray 7 "fertile">>`],
		},
		{
			name: "X-Change Passion",
			subtype: "gray passion",
			description: "A colourless capsule carrying only the Passion agent: unpredictable waves of arousal throughout the day.",
			onTakeMessage: teal(
				"A flush creeps over your skin. It leaves your nerves bright and restless, every brush of fabric and shift of air suddenly more interesting than it should be. Even standing still, you feel as though your body is waiting to be distracted with pleasure."
			),
			warning_label: "Warning: Causes spontaneous, hard-to-suppress arousal.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 7 "passion">>`],
		},
		{
			name: "X-Change Innocence",
			subtype: "gray innocence",
			description: "A colourless capsule carrying only the Innocence agent: it suspends your accumulated trauma and worldly awareness for the duration.",
			onTakeMessage: teal(
				"The weight of the world loosens all at once. Memories remain where they are, but their edges soften, their meanings growing distant and harmless, like words in a book you no longer understand. Your thoughts feel clean, open, and terribly easy to lead astray."
			),
			warning_label: "Warning: Suppressed trauma returns when the effect ends.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 1 "innocence">>`],
		},
		{
			name: "X-Change Bimbo",
			subtype: "gray bimbo",
			description:
				"A colourless capsule carrying the Bimbo agent: dulled wits and a swollen, eye-catching figure. (The same compound marketed as 'Himbo' for masculine bodies.)",
			onTakeMessage: teal(
				"A warm, pleasant fog rolls across your mind, smoothing over sharp thoughts before you can hold onto them. Worries scatter, replaced by an airy ease that makes thinking feel optional. At the same time, your body answers the pill with softness, swelling and rounding until you feel distractingly aware of every curve."
			),
			warning_label: "Warning: Temporarily lowers academic ability. Acts on whichever body you currently have.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 1 "bimbo" "swell">>`],
		},
		{
			name: "X-Change CumCure",
			subtype: "gray cumcure",
			description: "A colourless capsule carrying only the CumCure agent.",
			onTakeMessage: teal(
				"A strange medicinal sweetness clings to your tongue, followed by a hollow pull deep inside. It feels like your body has started listening for something specific. And you wonder... what that is?"
			),
			warning_label: "Warning: Acts on whichever body you currently have.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 7 "cumcure">>`],
		},
		{
			name: "X-Change Portal",
			subtype: "gray portal",
			description: "A colourless capsule carrying only the Portal agent, tied to the portal panties system.",
			onTakeMessage: teal(
				"For a moment, the air around you feels thin and badly stitched. The space near your underwear gives a faint, impossible shiver, as if reality has found a shortcut it was not supposed to have.<br><br>A cool tingle lingers against your skin. The Portal agent is active, and the world feels a little less certain than it did a moment ago."
			),
			warning_label: "Warning: Requires the portal panties system to be enabled.",
			canTake: grayGate.portalEnabled,
			blockedReason: "Requires the portal panties system to be enabled in the settings.",
			effects: [`<<xchange-gray 1 "portal">>`],
		},
		{
			name: "X-Change Dumb-Bitch",
			subtype: "gray dumb-bitch",
			description: "A colourless capsule carrying only the Dumb-Bitch agent: clouded judgement and a pliant, eager disposition.",
			onTakeMessage: teal(
				"Your thoughts stumble, then loosen, slipping out of reach before you can properly finish them. Complicated ideas feel heavy. Warnings feel distant. Bad decisions begin to sound much easier to understand."
			),
			warning_label: "Warning: Strongly impairs judgement for the duration.",
			canTake: grayGate.always,
			effects: [`<<xchange-gray 7 "dumb-bitch">>`],
		},
		{
			/* X-Tend pays out on the body you return to (penis-size gamble on orgasm),
			   so it grants its companion cancel pill exactly like the original. */
			name: "X-Change X-Tend (Gray)",
			subtype: "gray xtend",
			description:
				"A colourless capsule carrying only the X-Tend agent: the longer you hold out without orgasm, the more you gain when you turn back; orgasm and you lose. Comes with a companion Cancel pill.",
			onTakeMessage: teal(
				"A slow, stubborn tension takes root below your belly, coiling tighter with every breath. It feels like a wager written directly into your nerves: hold out, and be rewarded; give in, and pay for it.<br><br>You notice the companion pill still waiting in the packaging. | <span class='blue'>+1 X-Change X-Tend Cancel</span>"
			),
			warning_label: "Warning: Orgasming while active forfeits gains. Pays out on the body you return to.",
			canTake: grayGate.xtendEligible,
			blockedReason: "Pays out on a body with a penis; you need one now or on the body you return to. It stays in your drawer until then.",
			effects: [`<<xchange-gray 7 "xtend">>`, `<<set V.sexStats.pills["pills"]["X-Change X-Tend Cancel"].owned++>>`],
		},

		/* ---- stack-only: only useful layered onto an active X-Change session ---- */
		{
			name: "X-Change Resistance",
			subtype: "gray resistance",
			description: "A colourless capsule carrying only the Resistance agent: a chance that your current X-Change effects refuse to wear off when they should.",
			onTakeMessage: teal(
				"Your current transformation gives a strange shudder, then time seems to stretch around it. Every lingering pulse suggests the change could be fed, extended, and made harder to shake loose."
			),
			warning_label: "Warning: Has no effect without an active X-Change session. May extend the change against your will.",
			canTake: grayGate.activeSession,
			blockedReason: "Only works while an X-Change session is active. Take it during a session; it stays in your drawer until then.",
			effects: [`<<xchange-gray 1 "resistance">>`],
		},
		{
			name: "X-Change Continue",
			subtype: "gray continue",
			description:
				"A colourless capsule carrying only the Continue agent: each climax prolongs an active X-Change session by 16 hours. The optional duration cap burns Continue out and adds Fertile if the current body can become pregnant.",
			onTakeMessage: teal("Your current form warms from the inside out, the active X-Change chemistry brightening instead of fading."),
			warning_label: "Warning: Has no effect without an active X-Change session. With the duration cap disabled, prolonged use can lead to permanence.",
			canTake: grayGate.activeSession,
			blockedReason: "Only works while an X-Change session is active. Take it during a session; it stays in your drawer until then.",
			effects: [`<<xchange-gray 3 "continue">>`],
		},

		/* ---- the duration extender ---- */
		{
			name: "X-Change Weekly Extension",
			subtype: "gray extension",
			description: "A colourless concentrate that does nothing on its own. It simply prolongs an X-Change session already in progress by about a week.",
			onTakeMessage: teal(
				"The familiar X-Change warmth stirs again to deepen what is already there. The active formula settles into your body like a second dose of borrowed time. The countdown feels further away now."
			),
			warning_label: "Warning: Has no effect unless an X-Change pill is already active.",
			canTake: () => playerIsXChanged(),
			blockedReason: "Only works while an X-Change session is active. It stays in your drawer until then.",
			effects: [`<<xchange-extend 7>>`],
		},
	];
	return rows.map(makeGrayXChangePill);
}
window.buildGrayXChangePills = buildGrayXChangePills;

/* Append the gray pills to the catalogue. */
setup.pills.push(...buildGrayXChangePills());

/* ============================================================
   X-CHANGE COLOURED / SUSPICIOUS / UTILITY PILL DEFINITIONS
   Migrated out of bedroom-pills.js so the vanilla file stays vanilla.
   Inventory records auto-register via ensurePillInventoryRecords() (bedroom-pills.js), which loops over setup.pills.
   ============================================================ */
setup.pills.push(
	{
		name: "X-Change Pink Hyper Fertility",
		description:
			"Temporary pill causing extreme fertility and accelerated pregnancy progression. While active, conception is all but guaranteed from unprotected encounters, an existing pregnancy progresses markedly faster, and successful conception is far more likely to result in twins, triplets, or quadruplets.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>A deeper warmth settles low in your belly as the fertility formula takes hold.',
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Multiple births are common and intended. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink hyper fertility",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 7 "fertile" "fertility">>`],
	},

	{
		name: "X-Change Pink NOW",
		description:
			"A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours. And just like with Basic, it's impossible to get pregnant.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink", true)) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink", true);
		},
		effects: [`<<xchange-pink 0.25>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 0.25 "genderflip">>`],
	},

	{
		name: "X-Change Pink Basic",
		description:
			"X-Change's hallmark product. They're affordable and dosages typically last 24 hours or less, after which you turn back. It's impossible to get pregnant on Basic.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 1>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip">>`],
	},

	{
		name: "X-Change Pink Weekly",
		description:
			"A significantly more concentrated version of X-Change Basic. Intended for those wanting longer duration pills, but still not quite ready for the commitment and risks of an Xtra Strength. Last for about 7 days.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 7>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip">>`],
	},

	{
		name: "X-Change Pink Xtra Strength",
		description:
			"These are more expensive dosages that typically last 30 days. It is possible to become pregnant on Xtra Strength, but the chance of that happening is very low.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 30 "fertile">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 30 "genderflip" "fertile">>`],
	},

	{
		name: "X-Change Pink Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds 16 hours to the duration. The optional duration cap burns Continue out and adds Fertile when the current body and fertility settings allow it.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: With the duration cap disabled, repeated climaxes may make the change permanent once its remaining duration exceeds 30 days. Certain parasitic infections may also result in permanence, particularly those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 3 "continue">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 3 "genderflip" "continue">>`],
	},

	{
		name: "X-Change X-Tend",
		description:
			"Genderswapping pill that grants you the opportunity to achieve your ever-dreamed penis endowment. With this pill, you'll temporarily transform into a woman with the uncanny ability to integrate superior genetic code from other human males. Get their big dick juice into your womb, and with every load you'll come closer to matching their size and girth.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman's body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch. Looking in the mirror, you also realise you look exceedingly beautiful as well.<br><br>You look down, and a small pill still awaits in the packaging. | <span class='blue'>+1 X-Change X-Tend Cancel</span>",
		warning_label:
			"Warning: Orgasming while under the effects of this pill will cause your virile member to shrink. Beware that this pill offers no built-in protections against pregancy, which can result in genderswap permanency. Also, certain parasitic infections (in particular those affecting the genitalia) may prevent this pill from expiring naturally.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtend",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 7 "xtend" "fertile">>`, `<<set V.sexStats.pills["pills"]["X-Change X-Tend Cancel"].owned++>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "xtend" "fertile">>`, `<<set V.sexStats.pills["pills"]["X-Change X-Tend Cancel"].owned++>>`],
	},

	{
		name: "X-Change X-Tend Cancel",
		description:
			"This companion pill to the X-Change X-Tend allows you to end you transformation early, at the cost of forfeiting any gains.Its main purpose however is to let you cut your losses, if you happen to have orgasmed already while under the X-Tend's effects. Thus preventing you from suffering any further losses without the chance of any gains.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man\'s body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.',
		warning_label:
			"Warning: This pill will not negate any genital size losses already incurred pver the course of its companion pill's effect. Nor will it allow you to cash-in your gains early. If this pill is ingested to cancel the companion pill's effect, any prior size gains will be lost.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink xtend",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.xtendEffect ? 1 : 0;
		},
		effects: [`<<xchange-restore>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-xchange-restore>>`],
	},

	{
		name: "X-Change Pink Resistance",
		description:
			"Temporary pill but if you climax, there's a chance it becomes permanent. Each climax increases the likelihood of permanence. Pill effects may last upto 24 hours or less. It is impossible to become pregnant while under the non-permanent effects of Resistance.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: While there is no risk of conventional pregnancy, certain parasitic infections may result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 1 "resistance">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "resistance">>`],
	},

	{
		name: "X-Change Pink Breeder",
		description: "Temporary pill causing increased fertility and heightened pleasure during vaginal insemination. Pill effects may last upto a whole week.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia. Known to cause intense cravings for insemination",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink breeder",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 7 "breeder" "fertile">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "breeder" "fertile">>`],
	},

	{
		name: "X-Change Pink Omega",
		description:
			"Temporary pill that applies the Omega agent: anal pregnancy compatibility and heightened pleasure during anal insemination. Pill effects may last upto a whole week.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly.<br><br>A low warmth settles deep inside you, lower than the usual X-Change pull, leaving your anus sensitive, needy, and terribly aware of what the Omega formula wants from you.',
		warning_label:
			"Warning: Enables anal pregnancy. Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink omega",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink", true)) return 0;
			const isPregnantForXChange = playerIsPregnant() || (canBeMPregnant() && V.sexStats.anus.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink", true);
		},
		effects: [`<<if $xchange.omegaShrinkGenitals>><<take-xchange 7 "crossdress" "omega">><<else>><<xchange-pink 7 "omega">><</if>>`],
	},

	{
		name: "X-Change Pink Innocence",
		description: "Temporary pill designed to wipe all sexual knowledge from the user's mind.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink innocence",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 1 "innocence">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "innocence">>`],
	},

	{
		name: "X-Change Pink Swell",
		description: "Temporary pill designed to transform the user into a curvy woman.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink swell",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 1 "swell">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "swell">>`],
	},

	{
		name: "X-Change Pink Bimbo",
		description: "Decreases your intelligence and increases your lewdness. Comes with a built-in swell effect.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink bimbo",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 1 "bimbo" "swell">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "bimbo" "swell">>`],
	},

	{
		name: "X-Change Pink CumCure",
		description: "Reduces the duration of your transformation every time cum is deposited inside you.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the vagina.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink cumcure",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-pink 7 "cumcure">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "cumcure">>`],
	},

	{
		name: "X-Change Sissy",
		description:
			"A variant of the X-Change Basic. The transforming effects of the standard formula are halted mid-way before the transformation is over, resulting on a body that looks feminine while still technically being male.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. Part way through, as your balls and penis shrink to their tiniest size, the transformation suddenly halts. Leaving yourself sporting most of the kinks and perks of a woman\'s body, while still being male.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well in a feminine way.',
		warning_label:
			"Warning: Side effect of the neutralising agent causes user to crave dressing up as the opposite sex, while also feeling stressed the longer they remain wearing clothes of their starting gender.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink crossdress",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<take-xchange 1 "crossdress">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "crossdress">>`],
	},

	{
		name: "X-Change Choice (F)",
		description: "Temporary genderswapping pill whose effects last indefinitely until its included reverse pill is ingested.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose the reversal pill included in this packaging. No other pill (not even of the same type) can reverse the effects of this Choice pill.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-choice>>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (F)"].owned++>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		// TODO: Revise how Choice pills work on NPCs
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "choice">>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (NPC)"].owned++>>`],
	},

	{
		name: "X-Change Choice Reversal (F)",
		description: "Genderswapping pill that reverses the effects of a previously consumed Choice pill.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man\'s body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.',
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose this pill. No other pill (not even of the same type) can reverse the effects of the Choice pill included in this packaging.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 && V.xchange.pill.choiceEffect ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.choiceEffect ? 1 : 0;
		},
		effects: [`<<xchange-restore>>`],
	},

	{
		name: "Suspicious Pink Pill",
		description: "An unlabelled pink pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Your new body feels smaller, lighter, and strangely sensitive to the touch.<br><br>Looking in the mirror, you also realise you look exceedingly beautiful as well.',
		warning_label: "Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "pink unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("pink")) return 0;
			const isPregnantForXChange = playerIsPregnant() || (canBeMPregnant() && V.sexStats.anus.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("pink");
		},
		effects: [`<<xchange-suspicious-pill>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "m") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "random">>`],
	},

	{
		name: "Suspicious Purple Pill",
		description: "An unlabelled purple pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label: "Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			const isPregnantForXChange = playerIsPregnant() || (canBeMPregnant() && V.sexStats.anus.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		effects: [`<<xchange-suspicious-pill>>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "herm" "random">>`],
	},

	{
		name: "X-Change Blue Hyper Fertility",
		description:
			"Temporary genderswap pill causing extreme fertility and accelerated reproductive potency. While active, your sperm becomes much more likely to cause pregnancy and successful conception is far more likely to result in twins, triplets, or quadruplets.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man\'s body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>A deeper warmth settles through you as the fertility formula takes hold.',
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. The fertility formula greatly increases reproductive potency. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue hyper fertility",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 7 "fertile" "fertility">>`],
	},

	{
		name: "X-Change Blue NOW",
		description: "A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue", true)) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue", true);
		},
		effects: [`<<xchange-blue 0.25>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 0.25 "genderflip">>`],
	},

	{
		name: "X-Change Blue Basic",
		description: "X-Change's hallmark product. They're affordable and dosages typically last 24 hours or less, after which you turn back.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 1>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 7>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip">>`],
	},

	{
		name: "X-Change Blue Xtra Strength",
		description: "These are more expensive dosages that typically last 30 days. After which you turn back.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label: "Warning: Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 30>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 30 "genderflip">>`],
	},

	{
		name: "X-Change Blue Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds 16 hours to the duration. The optional duration cap burns Continue out once the limit is reached, allowing the timer to count down normally.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: With the duration cap disabled, repeated climaxes may make the change permanent once its remaining duration exceeds 30 days. Certain parasitic infections may also result in permanence, particularly those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 3 "continue">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 1 "resistance">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "resistance">>`],
	},

	{
		name: "X-Change Blue Bull",
		description: "Temporary genderswap pill causing increased virility. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence as well, in particular those affecting the genitalia. Known to cause intense cravings for insemination",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue bull",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 7 "bull">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 7 "genderflip" "bull">>`],
	},

	{
		name: "X-Change Blue Alpha",
		description:
			"Temporary genderswap pill that gives the user's penis a knot and a need to be inside a partner before release. Pill effects may last upto a whole week.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man\'s body.<br><br>Then pressure gathers in your cock, reshaping need into something heavier and more possessive. Your body wants to lock inside someone.',
		warning_label:
			"Warning: Requires a penis to matter. Known to cause intense urges to penetrate that override the user's normal inhibitions against initiating penetration. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue alpha",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue", true)) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue", true);
		},
		effects: [`<<xchange-blue 7 "alpha">>`],
	},

	{
		name: "X-Change Blue Omega",
		description:
			"Temporary genderswap pill that applies the Omega agent: anal pregnancy compatibility and heightened pleasure during anal insemination. Pill effects may last upto a whole week.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man\'s body.<br><br>A low warmth settles deep inside you, lower than the usual X-Change pull, leaving your anus sensitive, needy, and terribly aware of what the Omega formula wants from you.',
		warning_label:
			"Warning: Enables anal pregnancy. Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue omega",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue", true)) return 0;
			const isPregnantForXChange = playerIsPregnant() || (canBeMPregnant() && V.sexStats.anus.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue", true);
		},
		effects: [`<<xchange-blue 7 "omega">>`],
	},

	{
		name: "X-Change Blue Innocence",
		description: "Temporary pill designed to wipe all sexual knowledge from the user's mind.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue innocence",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 1 "innocence">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "innocence">>`],
	},

	{
		name: "X-Change Blue Swell",
		description: "Temporary pill designed to transform the user into a hung man.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue swell",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 1 "swell">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "swell">>`],
	},

	{
		name: "X-Change Blue Himbo",
		description: "Decreases your intelligence and increases your lewdness. Comes with a built-in swell effect.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue himbo",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 1 "bimbo" "swell">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "bimbo" "swell">>`],
	},

	{
		name: "X-Change Blue CumCure",
		description: "Reduces the duration of your transformation every time cum is deposited inside you.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as it slowly begins to twist and turn, rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue cumcure",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-blue 7 "cumcure">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue crossdress",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<take-xchange 1 "crossdress">>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange 1 "crossdress">>`],
	},

	{
		name: "X-Change Choice (M)",
		description: "Temporary genderswapping pill whose effects last indefinitely until its included reverse pill is ingested.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose the reversal pill included in this packaging. No other pill (not even of the same type) can reverse the effects of this Choice pill.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-choice>>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (M)"].owned++>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		// TODO: Revise how choice works on NPCs
		npcEffects: [`<<npc-take-xchange 1 "genderflip" "choice">>`, `<<set V.sexStats.pills["pills"]["X-Change Choice Reversal (NPC)"].owned++>>`],
	},

	{
		name: "X-Change Choice Reversal (M)",
		description: "Genderswapping pill that reverses the effects of a previously consumed Choice pill.",
		onTakeMessage:
			'<span class="teal">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a woman\'s body.<br><br>Being back in your old body feels rather nostalgic after having spent some time genderswapped.',
		warning_label:
			"Warning: Do not ingest while pregnant or infected by parasites. And do not lose this pill. No other pill (not even of the same type) can reverse the effects of the Choice pill included in this packaging.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue choice",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-pink.png",
		display_condition() {
			return this.owned() > 0 && V.xchange.pill.choiceEffect ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null && V.xchange.pill.choiceEffect ? 1 : 0;
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 1 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple xtra",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 30 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange 30 "herm">>`],
	},

	{
		name: "X-Change Purple Continue",
		description:
			"Temporary pill where every time you climax, the duration gets extended. Initial duration is 72 hours or less. Each climax adds 16 hours to the duration. The optional duration cap burns Continue out and adds Fertile when the current body and fertility settings allow it.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: With the duration cap disabled, repeated climaxes may make the change permanent once its remaining duration exceeds 30 days. Certain parasitic infections may also result in permanence, particularly those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple continue",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 3 "herm" "continue">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple resistance",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 1 "herm" "resistance">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange 1 "herm" "resistance">>`],
	},

	{
		name: "X-Change Purple NOW",
		description: "A significantly diluted version of X-Change Basic, intended for those on a tight schedule. Lasts about 6 hours.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 0.25 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
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
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple basic",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange 7 "herm">>`],
	},

	{
		name: "X-Change Purple Breeder",
		description: "Temporary pill causing increased fertility and heightened pleasure during vaginal insemination. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple breeder",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "breeder" "fertile">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange 7 "herm" "breeder" "fertile">>`],
	},

	{
		name: "X-Change Purple Bull",
		description: "Temporary genderswap pill causing increased virility. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Your new body feels distinctly different from your original, yet also strangely familiar. In many ways, alien. But still very much yours. Should you choose, you could probably pass as any gender you want as long as there's clothes on you.<br><br>Finally, you approach the mirror, and having a good look, you also realise you look exceedingly beautiful as well.",
		warning_label:
			"Warning: Mild discomfort might be incurred during transformation. Certain parasitic infections might result in permanence, in particular those affecting the genitals.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple bull",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "bull">>`],
		npc_display_condition() {
			return this.owned() > 0 && !npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) && !npcIsPregnant(V.xchange.npcTargetName);
		},
		npcEffects: [`<<npc-take-xchange 7 "herm" "bull">>`],
	},

	{
		name: "X-Change Purple Omega",
		description:
			"Temporary pill that grants a hermaphroditic body alongside the Omega agent: anal pregnancy compatibility and heightened pleasure during anal insemination. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>A low warmth settles deep inside you, lower than the usual X-Change pull, leaving your anus sensitive, needy, and terribly aware of what the Omega formula wants from you.",
		warning_label:
			"Warning: Enables anal pregnancy. Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple omega",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			const isPregnantForXChange = playerIsPregnant() || (V.sexStats.anus?.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "omega">>`],
	},

	{
		name: "X-Change Purple Alpha",
		description:
			"Temporary pill that grants a hermaphroditic body alongside the Alpha agent: a knotted penis and a need to be inside a partner before release. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>Then pressure gathers in your cock, reshaping need into something heavier and more possessive. Your body wants to lock inside someone.",
		warning_label:
			"Warning: Known to cause intense urges to penetrate that override normal inhibitions and receptive heat compulsions while the penis is usable. Certain parasitic infections might result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple alpha",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "alpha">>`],
	},

	{
		name: "X-Change Purple Alpha-Omega",
		description:
			"Temporary pill that applies the Alpha and Omega agents together, granting a hermaphroditic body, anal pregnancy compatibility, and a knotted penis with intense urges to penetrate. Pill effects may last upto a whole week.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>A low warmth settles deep inside you while pressure gathers in your cock. Your body wants to be filled, to fill, and to lock inside someone before release.",
		warning_label:
			"Warning: Enables anal pregnancy and requires a penis for the Alpha effect. Alpha's dominant urge takes priority over receptive heat compulsions while the penis is usable. Pregnancy will result in transformation becoming permanent. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple alpha-omega",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			const isPregnantForXChange = playerIsPregnant() || (V.sexStats.anus?.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "omega" "alpha">>`],
	},

	{
		name: "X-Change Purple Hyper Fertility",
		description:
			"Temporary genderswap pill that grants the body of a hermaphrodite alongside extreme fertility and accelerated reproductive potency. While active, both your womb and your sperm become far more potent: a single unprotected encounter is almost certain to cause pregnancy, gestation runs much faster, and successful conception is far more likely to result in twins, triplets, or quadruplets.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of both a man's and a woman's body.<br><br>A deep warmth settles through you as the fertility formula takes hold.",
		warning_label:
			"Warning: Pregnancy will result in transformation becoming permanent. The fertility formula greatly increases reproductive potency. Certain parasitic infections might also result in permanence, in particular those affecting the genitalia.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "purple hyper fertility",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-purple.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<take-xchange 7 "herm" "fertile" "fertility">>`],
	},

	{
		name: "Suspicious Blue Pill",
		description: "An unlabelled blue pill of unknown origin and manufacture. Unpredictable effects.",
		onTakeMessage:
			"<span class=\"teal\">You take the pill.</span><br><br>All of a sudden, you feel a heat coursing through your body, as your body begins to twist and turn rearranging itself seamlessly. When the transformation is finally over, you find yourself sporting all of the kinks and perks of a man's body.<br><br>Your new body feels larger, stronger, and quite ready to dish out and receive punishment.<br><br>And upon looking in the mirror, you realise you're quite handsome as well!",
		warning_label: "Warning: You do not know where this pill came from, nor what it does.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "blue unknown",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/xchange-blue.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			if (!xchangePillSuitsBody("blue")) return 0;
			const isPregnantForXChange = playerIsPregnant() || (canBeMPregnant() && V.sexStats.anus.pregnancy != null && V.sexStats.anus.pregnancy.type != null);
			return !playerIsXChanged() && !isPregnantForXChange ? 1 : 0;
		},
		take_blocked_reason() {
			return xchangePillBlockedReason("blue");
		},
		effects: [`<<xchange-suspicious-pill>>`],
		npc_display_condition() {
			return (
				this.owned() > 0 &&
				npcStartingSexIs(V.xchange.npcTargetNo, V.xchange.npcTargetName, "f") &&
				!npcIsXChanged(V.xchange.npcTargetNo ?? V.xchange.npcTargetName) &&
				!npcIsPregnant(V.xchange.npcTargetName)
			);
		},
		npcEffects: [`<<npc-take-xchange random(1,3) "random">>`],
	},

	{
		name: "X-Change Clone: Whitney",
		description:
			"Custom-tailored temporary pill, based upon the genetic material of subject Whitney. Pill effects last up to 24 hours or less. And regardless of target's gender, it remains impossible to become pregnant under this pill.",
		onTakeMessage:
			'<span class="teal">You down the pill in a single gulp.</span><br><br>As you close your eyes anticipating the change, the pill\'s characteristic heat starts to radiate into your body. Reaching every nook and cranny of your being. <span class="red">A sudden wave of fury washes over you, as thoughts of rape, abuse, and self-loathing fill your mind. For a few moments, you\'re utterly enraged at the world.</span><br><br>Yet once the emotional maelstrom subsides, you look at yourself in the mirror, and there\'s only Whitney there to stare back at you. The pill has done its work.',
		warning_label:
			"Warning: EXTREMELY UNFINISHED CONTENT. May result in very silly situations. Cannot be taken during pregnancy. Certain parasitic infections may result in permanence, in particular those affecting the genitalia. Use with care.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "clone",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillpremium.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: [`<<xchange-clone 3 "Whitney">>`],
	},

	{
		name: "SWP Anti-crossdress Pill",
		description:
			'A shady pill advertised to deal with sissifying / butchifying effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>At first, all you feel is a strange, hollow quietness spreading through you. Then the backlash hits. <span class="red">A prickling itch crawls over your skin</span>, and before long your whole body turns so oversensitive that even the brush of your clothes feels almost painful.<br><br>Gritting your teeth through the discomfort, you cling to the hope that at least you will not have to deal with those awful mind-afflicting effects any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.genderflipEffect && V.xchange.pill.genderificationEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "crossdress">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-breeder Pill",
		description: 'A shady pill advertised to deal with breeder effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>For a moment there is only relief as pressure inside you suddenly gone quiet. <span class="red">Then a hot itch starts under your skin</span>, spreading into a raw, full-body sensitivity that makes every brush and shift of fabric feel almost painful.<br><br>You draw a breath, trying to endure the backlash in the hope you will no longer have to deal with those awful mind-afflicting and body-altering breeder effects.',
		warning_label:
			"Warning: Does not completely remove fertility. May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.breederEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "breeder">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-omega Pill",
		description: 'A shady pill advertised to deal with omega effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>The needy warmth low in your body fades first, leaving a cold hollow in its place. Then the backlash hits: <span class="red">a prickling oversensitivity spreads under your skin</span>, harsh enough to make every brush of cloth feel like too much.<br><br>You breathe through it and hope the miserable comedown means the Omega pressure is gone.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.omegaEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "omega">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-bull Pill",
		description: 'A shady pill advertised to deal with bull effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>At first it feels like blessed relief, as though some feverish pressure has finally loosened its grip. <span class="red">But the calm quickly sours into a crawling itch and a raw hypersensitivity</span> that spreads through your whole body until even your own movements feel upsettingly intense.<br><br>You steady yourself and hope the miserable comedown means you are finally free of those awful mind-afflicting and body-altering bull effects.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.bullEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "bull">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-alpha Pill",
		description: 'A shady pill advertised to deal with alpha effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>The heavy pressure in your cock ebbs, leaving the sudden absence almost as distracting as the need itself. <span class="red">Then the comedown crawls across your skin</span>, turning every touch sharp and oversensitive.<br><br>You grit your teeth and hope that means the Alpha marker has been neutralised.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.alphaEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "alpha">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-continue Pill",
		description: 'A shady pill advertised to deal with continue effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>At first there is only a strange, muted relief, like finally stepping out of a room that had been too loud for too long. Then the side effect sets in: <span class="red">a restless itch under your skin and an oversensitivity</span> that turns every touch, every fold of cloth, into something upsettingly sharp and almost painful.<br><br>You bear it as best you can, hoping this miserable backlash means you will not have to deal with those awfully risky continue effects any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.continueEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "continue">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-resistance Pill",
		description:
			'A shady pill advertised to deal with resistance effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>The first sensation is relief. The second is much worse: <span class="red">a prickling itch racing over your skin, followed by a raw hypersensitivity</span> that makes even harmless contact feel upsetting and borderline painful.<br><br>You swallow hard and try to focus that once this backlash passes, you should no longer have to deal with those awfully risky resistance effects.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.resistanceEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "resistance">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-portal Pill",
		description: 'A shady pill advertised to deal with portal effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>Relief comes first, like some wrongness has finally been drained out of you. Then your nerves flare. <span class="red">An itchy heat spreads across your skin</span>, and before long your body feels so oversensitive that even light touch becomes upsetting.<br><br>You try to ride out the discomfort, trusting that at least you will no longer have to deal with those awfully risky portal effects.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.portalEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "portal">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-fertile Pill",
		description: 'A shady pill advertised to deal with fertile effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>For one brief moment you feel only relief, as though the risk hanging over you has quietly ebbed away. Then the comedown bites back: <span class="red">an insistent itch and a full-body oversensitivity</span> that makes even the brush of your clothes feel painful.<br><br>You breathe through it, telling yourself that if this worked, you will not have to deal with those pregnancy risks any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.fertile && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "fertile">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-passion Pill",
		description: 'A shady pill advertised to deal with passion effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>Relief hits first. Then your nerves seem to wake all at once. <span class="red">A maddening itch crawls across your skin</span> and leaves your body feeling so oversensitive that every touch becomes irritating, upsetting, and faintly painful.<br><br>You endure it in the hope you will no longer have to deal with those awfully risky passion effects.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.passionEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "passion">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-dumb-bitch Pill",
		description:
			'A shady pill advertised to deal with dumb-bitch effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>At first all you notice is the relief, like a fog lifting from somewhere inside your head. Then the rest of the side effects arrive together: <span class="red">itching skin, raw nerves, and a whole-body oversensitivity</span> that makes even small sensations feel upsetting and almost painful.<br><br>You grit your teeth and hold onto the thought that, with any luck, you will not have to deal with those awfully risky dumb-bitch effects any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.dumbBitchEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "dumb-bitch">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-swell Pill",
		description: 'A shady pill advertised to deal with swell effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>For a moment there is only relief, as though some invasive fullness is finally receding. Then <span class="red">a prickling itch blooms across your skin, followed by a raw hypersensitivity</span> that makes your own body feel tender, upset, and almost painful to move in.<br><br>You try to ignore the backlash and take comfort in the thought that you should not have to deal with those awful mind-afflicting and body-altering swell effects any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.swellEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "swell">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-bimbo Pill",
		description:
			'A shady pill advertised to deal with bimbo (and himbo) effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>The first sensation is relief. The second is <span class="red">a spreading itch and a raw full-body oversensitivity</span> that makes every touch feel aggravating, upsetting, and almost painful.<br><br>You force yourself to breathe through it, hoping the discomfort is the price of being rid of those awful mind-afflicting and body-altering bimbo effects.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.bimboEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "bimbo">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-cumcure Pill",
		description: 'A shady pill advertised to deal with cumcure effects, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>For a brief, there is only relief. <span class="red">Then your skin starts to prickle</span>. The itch deepens into a raw hypersensitivity that spreads through your whole body until even the slightest contact feels upsettingly sharp.<br><br>You ride out the miserable aftermath in the hope that you will not have to deal with those awful mind-afflicting and body-altering cumcure effects any longer.',
		warning_label: "Warning: May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.cumcureEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "cumcure">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "X-Change Premium",
		description: "A 'premium' X-Change pill of unknown origin and manufacture. It makes you feel like you're about to choose something you can't unchoose.",
		onTakeMessage:
			"You roll the premium pill between your fingers for a second too long... then down it anyway.<br><br><span class=\"red\">The reaction is almost instant. A spear of heat punches through your stomach and detonates outward, dragging you to your knees like a puppet with its strings cut. Your skin goes cold-sweat slick, your throat tightens, and your pulse slams hard enough to blur your vision.<<gggpain>><br><br>Every nerve lights up at once, like your body is being <i>rewritten</i> line by line while you're still inside it. For a stupid moment, you wonder if this is the price of something novel, or if you're indeed being played as a guinea pig? <<ggstress>><<gtrauma>><br><br></span>When it finally eases, you're left trembling, breathing shallowly but your body feel like it could become anything... if you tell it what to be.",
		warning_label: "Warning: Experimental formulation. Effects may vary.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_pills() {
			return "Take pill";
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "premium",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillpremium.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return !playerIsXChanged() && V.sexStats.vagina.pregnancy.type === null ? 1 : 0;
		},
		effects: ["<<if !xchangePillProtectionActive()>><<pain 180>><<stress 130>><<trauma 80>><<gpain>><<gstress>><<gtrauma>><</if>>", "<<xchange-premium 7>>"],
	},

	{
		name: "SWP Anti-fertility Pill",
		description:
			"An X-Change counter-agent to the Hyper Fertility course. It flushes the stimulant and accelerant from your system, returning any ongoing pregnancy to its natural pace and removing the boosted odds of multiples. It does not undo a pregnancy already conceived.",
		onTakeMessage:
			'<span class="purple">You take the counter-pill.</span><br><br>The lingering warmth in your body fades as the Hyper Fertility course is neutralised.',
		warning_label: "Warning: This pill only cancels the Hyper Fertility course. It is not a contraceptive and will not end or prevent a pregnancy.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.hyperFertilityEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "fertility">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "SWP Anti-feartoxin Pill",
		description: 'A shady pill advertised to deal with the fear toxin, 100% satisfaction guaranteed. <span class="red">Be aware of its side effects!</span>',
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation knowing the shady origins from whence it came.</span><br><br>The dread thins out first. Your heart slows, and your hands stop shaking. Then the backlash hits. <span class="red">A prickling itch crawls over your skin</span>, and soon your whole body is so oversensitive that even the brush of your clothes hurts.<br><br>You breathe through it. The fear the toxin forced on you is gone, but the harm it already did to your mind is still there, and it will only fade with time.',
		warning_label:
			"Warning: Cancels the toxin only. Your trauma and self-control are left where the toxin put them and recover at their normal pace. May cause some side-effects. Do not take unless you've tested positive for the respective effect.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "anti-pill",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() && V.xchange.pill.feartoxinEffect && V.xchange.pill.effectsKnown ? 1 : 0;
		},
		effects: [`<<xchange-removeeffect "feartoxin">>`, '<<xchange-addsideeffect "antipill">>'],
	},

	{
		name: "X-Change Antidote",
		description:
			"An expensive solution for those who are willing and can afford it. A pill that reduces the remaining duration of your current pill by a single day, at the expense of some severe side-effects. If remaining duration reaches zero, your pill shall expire within the next hour.",
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation after having read the warning label.</span><br><br><span class="red">Almost immediately you\'re overcome by a searing pain that brings you down to your knees. It burns and hurts like hell. A skull-splitting headache, nausea, sudden fever, shortness of breath. The list goes on. Words cannot even begin to describe how incredibly awful you feel.</span><<gggpain>><<ggstress>><br><br>After several minutes of this, you\'re bent over on the floor. Clasping your head with one hand, and your chest with the other. Almost blacking out multiple times. Until it finally starts to subside.<<gpain>><<gstress>><br><br>Once your body finally settles down, you manage to stand up despite the grueling experience. Who in their right mind would willingly subject themselves to this kind of pain unless they really had to?<<gstress>>',
		warning_label:
			"Warning: Will cause severe pain and nausea. Not recommended while under stress. May only be taken while under the effects of a non-permanent pill. Has no effect for pregnant takers or those genitally afflicted by parasites. Releases a biological agent that targets X-Change compounds embedded all across the body. Does not self replicate.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "antidote",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() ? 1 : 0;
		},
		take_blocked_reason() {
			return playerIsXChanged() ? "" : "You aren't under the effects of any X-Change pill. There's nothing for it to work on.";
		},
		effects: [`<<xchange-antidote 1>>`],
	},

	{
		name: "X-Change Antidote Forte",
		description:
			"A very expensive solution for those who are willing and can afford it. A pill that reduces the remaining duration of your current pill by a whole week, at the expense of some extreme side-effects. If remaining duration reaches zero, your pill shall expire within the next hour.",
		onTakeMessage:
			'<span class="purple">You down the pill with some hesitation after having read the warning label.</span><br><br><span class="red">Almost immediately you\'re overcome by a searing pain that brings you down to your knees. It burns and hurts like hell. A skull-splitting headache, nausea, sudden fever, shortness of breath. The list goes on. Words cannot even begin to describe how incredibly awful you feel.</span><<gggpain>><<gggstress>><br><br>After several minutes of this, you\'re bent over on the floor. Clasping your head with one hand, and your chest with the other. Almost blacking out multiple times. Until it finally starts to subside.<<ggpain>><<ggstress>><br><br>Once your body finally settles down, you manage to stand up despite the grueling experience. Who in their right mind would willingly subject themselves to this kind of pain unless they really had to?<<gstress>>',
		warning_label:
			"Warning: Will cause grueling pain and nausea. Not recommended while under any kind of stress. May only be taken while under the effects of a non-permanent pill. Has no effect for pregnant takers or those genitally afflicted by parasites. Releases a biological agent that targets X-Change compounds embedded all across the body. Does not self replicate.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
		},
		hpi_take_every_morning() {
			return "";
		},
		type: "xchange",
		subtype: "antidote",
		shape: "pill",
		overdose() {
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pillcure.png",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return playerIsXChanged() ? 1 : 0;
		},
		take_blocked_reason() {
			return playerIsXChanged() ? "" : "You aren't under the effects of any X-Change pill. There's nothing for it to work on.";
		},
		effects: [`<<xchange-antidote 7>>`],
	},

	{
		name: "X-Change Test",
		description:
			"A single-use test that identifies the X-Change pill's effects and gives a more precise estimate of its remaining duration. To make it work, simply expose the tip to the user's urine and await the message on the display.",
		onTakeMessage: "You do as instructed by the product manual, and wait for a moment as the display begins to blink.",
		warning_label: "Warning: Do not re-use. Readings will not be accurate.",
		autoTake() {
			return false;
		},
		doseTaken() {
			return V.sexStats.pills.pills[this.name].doseTaken;
		},
		owned() {
			return V.sexStats.pills.pills[this.name].owned;
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
			return V.sexStats.pills.pills[this.name].overdose;
		},
		icon: "img/misc/icon/pregnancy-test.gif",
		display_condition() {
			return this.owned() > 0 ? 1 : 0;
		},
		take_condition() {
			return V.xchange.pill && V.xchange.pill.active ? 1 : 0;
		},
		effects: [`<<set V.xchange.pill.testPending to true>>`],
	}
);
