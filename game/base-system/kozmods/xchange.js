
function hasGenderIdentity(stage) {
	switch (stage) {
		case 8:
			return V.genderidentity === 1000;
		case 7:
			return V.genderidentity >= 875;
		case 6:
			return V.genderidentity >= 750;
		case 5:
			return V.genderidentity >= 625;
		case 4:
			return V.genderidentity >= 375;
		case 3:
			return V.genderidentity >= 250;
		case 2:
			return V.genderidentity >= 125;
		case 1:
			return V.genderidentity >= 1;
		case 0:
			return V.genderidentity === 0;
		default:
			return false;
	}
}
window.hasGenderIdentity = hasGenderIdentity;

function playerFeelsManlike() {
	return (V.player.gender === "m" && hasGenderIdentity(5)) || (V.player.gender === "f" && !hasGenderIdentity(4));
}
window.playerFeelsManlike = playerFeelsManlike;

function playerFeelsGirllike() {
	return (V.player.gender === "f" && hasGenderIdentity(5)) || (V.player.gender === "m" && !hasGenderIdentity(4));
}
window.playerFeelsGirllike = playerFeelsGirllike;

function playerIsXChanged() {
	return (
		V.xchange.pill && V.xchange.pill.active
	);
}
window.playerIsXChanged = playerIsXChanged;

/* 
	@args:
	 - path: type string, representing the relative path to an 'img' asset.
*/
function getGenderedPath(path) {
	if (typeof path === 'string' && V.options?.useAltImg === 1 && V.player?.sex === V.options?.altImgGender)
		return 'img2/' + path.substring(4);
	else 
		return path;
}
window.getGenderedPath = getGenderedPath;

function pillTimerPaused() {
	let vaginalPregnancy = V.sexStats.vagina.pregnancy.type !== null;
	let earSlimeHasGrown = V.earSlime.growth > 50;
	return V.xchange.pillPermanence !== 1 && (vaginalPregnancy || earSlimeHasGrown);
}
window.pillTimerPaused = pillTimerPaused;

function pillIsPermanent() {
	return V.xchange.pill.duration <= -1;
}
window.pillIsPermanent = pillIsPermanent;

function pillShouldHaveEnded() {
	return V.xchange.pill.duration - V.xchange.pill.countdown >= 24; 
}
window.pillShouldHaveEnded = pillShouldHaveEnded;

function playerBodyIsMale() {
	return (V.player.gender === "m" && !playerIsXChanged()) || (V.player.gender === "f" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;


function playerBodyIsFemale() {
	return (V.player.gender === "f" && !playerIsXChanged()) || (V.player.gender === "m" && playerIsXChanged());
}
window.playerBodyIsMale = playerBodyIsMale;

function playerIsCreampied() {
	return V.sexStats.vagina.sperm.length > 0;
}
window.playerIsCreampied = playerIsCreampied;

function playerMayBeSpiked() {
	return V.xchange.nonconEnabled === 1 && ((!playerIsXChanged() && !playerIsPregnant()) || playerIsXChanged());
}
window.playerMayBeSpiked = playerMayBeSpiked;

function playerCaresForGender() {
	return V.xchange.genderIdentityEnabled === 1;
}
window.playerCaresForGender = playerCaresForGender;

function genderIsIgnored() {
	return V.xchange.disregardGender === 1;
}
window.genderIsIgnored = genderIsIgnored;

function xchangeWeeklyCheck() {

	if (V.xchange.pubGamblingEnabled && !V.weekly.gamblingUpkeepPaid) {
		V.xchange.gamblingUpkeepFailed = 1;
		V.xchange.pubGamblingEnabled = 0;

		if (V.location != "prison") {
			wikifier("crimeUp", 3000, "obstruction");
			wikifier("crimeUpFlat", V.xchange.gamblingEarnings, "thievery");
	
			V.gamblingUpkeepFailedMessage = 1;
			V.effectsmessage = 1;
		}
	}
}
window.xchangeWeeklyCheck = xchangeWeeklyCheck;

function xchangeDailyCheck() {

	if ((V.hourlyFemininity > 0 && V.player.gender === "f") || (V.hourlyFemininity < 0 && V.player.gender === "m"))
		wikifier("genderidentity", 1);
	else if ((V.hourlyFemininity > 0 && V.player.gender === "m") || (V.hourlyFemininity < 0 && V.player.gender === "f"))
		wikifier("genderidentity", -1);

	if (playerIsXChanged())
		wikifier("genderidentity", -2);

	V.effectsmessage = 1;
	V.genderIdentityMessage = V.hourlyFemininity > 0? "f": (V.hourlyFemininity < 0? "m": 0);
	V.hourlyFemininity = 0;

	wikifier("blackmail-daypassed");

	V.recentmolest = Math.max(V.recentmolest - 1, 0);
	V.recentrape = Math.max(V.recentrape - 1, 0);

	if (V.robinbreakupCooldown > 0) {
		V.robinbreakupCooldown -= 1;
	}

	V.xchange.blackmailHalt = Math.max(0, V.xchange.blackmailHalt - 1);
}
window.xchangeDailyCheck = xchangeDailyCheck;

function xchangeHourlyCheck() {

	const pill = V.xchange.pill;
	if (pill?.active)
	{
		pill.countdown--;

		// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
		// then, the change becomes permanent 
		if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
			wikifier("xchange-setpermanent");
	
		// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
		// then, the change becomes permanent
		if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration > 30 * 24)
			wikifier("xchange-setpermanent");

		// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
		pill.duration = Math.min(pill.duration, 30*24);

		// Stop the timer from ticking if PC is vaginally pregnant or the ear slime has grown past its point of no return
		if (!pillTimerPaused() && pill.duration >= 0) {
			pill.duration = Math.max(pill.duration-1, 0);
			if (pill.duration == 0)
			{
				if (pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) wikifier("xchange-setpermanent");
					else {
						pill.duration += 30 * 24;
						pill.resistanceEffect = false;
						pill.fertile = true;
					}
				}
				else if (V.xchange.pill.clone === "none") {
					wikifier("xchange-restore");
				} 
				else {
					wikifier("xchange-restore", "nosave");
				}
			} 
		}
		// Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
		else if (V.xchange.pillPermanence !== 1 && pillIsPermanent() && !V.xchange.pill.choiceEffect) {
			pill.duration = 0;
			if (!pillTimerPaused()) {
				if (V.xchange.pill.clone === "none") {
					wikifier("xchange-restore");
				} 
				else {
					wikifier("xchange-restore", "nosave");
				}
			}
		}
	}

	// Apply hour-random passion effect
	if (pill?.passionEffect && random(0,8) == 0) {
		wikifier("drugs", 300); 
		V.effectsmessage = 1;
		V.xchange_passion_message = 1;
	}
	
	// Tick portal effect timer, and end the effect if timer lapses
	if (pill?.portalEffect && pill?.portalEffectTimer >= 0) {
		pill.portalEffectTimer = Math.max(pill.portalEffectTimer-1, 0);
		if (pill.portalEffectTimer === 0) {
			pill.portalEffect = false;
		}
	}
}
window.xchangeHourlyCheck = xchangeHourlyCheck;

function hourlyClothingFemininityCheck() {
	// Compute the sum of all clothing femininity
	let currentWornFemininity = 0;
	if (setup.clothes["over_head"][clothesIndex("over_head", V.worn.over_head)].femininity)
		currentWornFemininity += setup.clothes["over_head"][clothesIndex("over_head", V.worn.over_head)].femininity;
	if (setup.clothes["head"][clothesIndex("head", V.worn.head)].femininity)
		currentWornFemininity += setup.clothes["head"][clothesIndex("head", V.worn.head)].femininity;
	if (setup.clothes["face"][clothesIndex("face", V.worn.face)].femininity)
		currentWornFemininity += setup.clothes["face"][clothesIndex("face", V.worn.face)].femininity;
	if (setup.clothes["neck"][clothesIndex("neck", V.worn.neck)].femininity)
		currentWornFemininity += setup.clothes["neck"][clothesIndex("neck", V.worn.neck)].femininity;
	if (setup.clothes["over_upper"][clothesIndex("over_upper", V.worn.over_upper)].femininity)
		currentWornFemininity += setup.clothes["over_upper"][clothesIndex("over_upper", V.worn.over_upper)].femininity;
	if (setup.clothes["upper"][clothesIndex("upper", V.worn.upper)].femininity)
		currentWornFemininity += setup.clothes["upper"][clothesIndex("upper", V.worn.upper)].femininity;
	if (setup.clothes["under_upper"][clothesIndex("under_upper", V.worn.under_upper)].femininity)
		currentWornFemininity += setup.clothes["under_upper"][clothesIndex("under_upper", V.worn.under_upper)].femininity;
	if (setup.clothes["over_lower"][clothesIndex("over_lower", V.worn.over_lower)].femininity)
		currentWornFemininity += setup.clothes["over_lower"][clothesIndex("over_lower", V.worn.over_lower)].femininity;
	if (setup.clothes["lower"][clothesIndex("lower", V.worn.lower)].femininity)
		currentWornFemininity += setup.clothes["lower"][clothesIndex("lower", V.worn.lower)].femininity;
	if (setup.clothes["under_lower"][clothesIndex("under_lower", V.worn.under_lower)].femininity)
		currentWornFemininity += setup.clothes["under_lower"][clothesIndex("under_lower", V.worn.under_lower)].femininity;
	if (setup.clothes["legs"][clothesIndex("legs", V.worn.legs)].femininity)
		currentWornFemininity += setup.clothes["legs"][clothesIndex("legs", V.worn.legs)].femininity;
	if (setup.clothes["handheld"][clothesIndex("handheld", V.worn.handheld)].femininity)
		currentWornFemininity += setup.clothes["handheld"][clothesIndex("handheld", V.worn.handheld)].femininity;
	if (setup.clothes["feet"][clothesIndex("feet", V.worn.feet)].femininity)
		currentWornFemininity += setup.clothes["feet"][clothesIndex("feet", V.worn.feet)].femininity;

	// Add up the makeup femininity
	currentWornFemininity += V.makeup.lipstick ? 50 : 0;
	currentWornFemininity += V.makeup.mascara ? 50 : 0;
	currentWornFemininity += V.makeup.eyeshadow ? 50 : 0;
	
	// Tick the hourly counter
	V.hourlyFemininity += currentWornFemininity > 0 ? 1 : 0;
	V.hourlyFemininity += currentWornFemininity < 0 ? -1 : 0;

	if (V.xchange.pill.active && V.xchange.pill.genderificationEffect) {
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress",800,1);
			V.genderificationStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (V.player.gender === "m" && (V.genderidentity > 625 || !playerCaresForGender()) && currentWornFemininity > 0) {
			wikifier("stress",-10);
			V.tiredness -= 200;
			V.genderificationStressMessage = 2;
			V.effectsmessage = 1;
		}
		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress",800,1);
			V.genderificationStressMessage = 3;
			V.effectsmessage = 1;
		}
		else if (V.player.gender === "f" && (V.genderidentity > 625 || !playerCaresForGender()) && currentWornFemininity < 0) {
			wikifier("stress",-10);
			V.tiredness -= 200;
			V.genderificationStressMessage = 4;
			V.effectsmessage = 1;
		}
	}
	else if (playerCaresForGender()) {
		if (hasGenderIdentity(7) && V.player.gender === "m" && V.player.sex === "m" && currentWornFemininity > 0) {
			wikifier("stress",800,1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (hasGenderIdentity(5) && V.player.gender === "m" && currentWornFemininity > 0) {
			wikifier("stress",400,1);
			V.genderStressMessage = 1;
			V.effectsmessage = 1;
		}
		else if (!hasGenderIdentity(2) && V.player.gender === "f" && V.player.sex === "m" && currentWornFemininity > 0) {
			wikifier("stress",800,1);
			V.genderStressMessage = 2;
			V.effectsmessage = 1;
		}
		else if (!hasGenderIdentity(4) && V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress",400,1);
			V.genderStressMessage = 1;
			V.effectsmessage = 1;
		}
	}
	
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;

function xchangeEffectsMessages() {
	const fragment = document.createDocumentFragment();
	const element = (element, text, colour) => {
		const result = document.createElement(element);
		if (colour) result.classList.add(colour);
		result.textContent = text + " ";
		fragment.append(result);
	};
	const br = () => fragment.append(document.createElement("br"));

	if (V.genderIdentityMessage) {
		fragment.append(wikifier("genderidentity-text", V.genderIdentityMessage));
		delete V.genderIdentityMessage;
	}

	if (V.gamblingUpkeepFailedMessage) {
		element("span", "The cops didn't receive their bribe this week. Your gambling ring has been raided.", "purple");
		fragment.append(wikifier("gggcrime", "thievery"));
		br();
		delete V.gamblingUpkeepFailedMessage;
	}

	if (V.xchange_passion_message) {
		element("span", `Aphrodisiacs have been released into your bloodstream.`, "pink"); br();
		delete V.xchange_passion_message;
	}

	if (V.xchangeFameMessage) {
		element("span", "People have been gossiping about your X-Change escapades, and even the law has fully caught on."); br();
		element("span", "You no longer benefit from having two identities.", "red");
		delete V.xchangeFameMessage;
	}

	if (V.xchangePermanenceMessage) {
		// element("span", "You didn't turn back. Your pill's effects have become permanent", "red"); br();
		delete V.xchangePermanenceMessage;
	}

	switch (V.xchangeRestoreMessage) {
		case 1:
			element("span", "Your body twists and turns as it returns to its original form.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 2:
			element("span", "Despite having climaxed under the effects of Resistance, the pill did not become permanent.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 3:
			element("span", "The pill's effects should be running out right about now.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		default:
			break;
	}

	switch (V.genderificationStressMessage) {
		case 1:
			element("span", "You have an urge to dress cute.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 2:
			element("span", "You are feeling cute and refreshed with your outfit.", "light-pink");
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You have an urge to dress more manly.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You are feeling manly and vigourous in your fit.", "blue");
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		default:
			break;
	}

	switch (V.genderStressMessage) {
		case 1:
			element("span", "You feel awkward dressed up girly like this.", "purple");
			fragment.append(wikifier("gstress")); br();
			delete V.genderStressMessage;
			break;
		case 2:
			element("span", "You feel gross in these girly clothes.", "red");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderStressMessage;
			break;
		default:
			break;
	}

	if (V.breederEdgingMessage) {
		element("span", "Your body refuses to cum like this.", "purple"); 
		element("span", "You crave some thick gooey semen in your "+ either("pussy.","vagina."), "red");
		if (V.xchange.pill.breederEdgingStress > 400)
			fragment.append(wikifier("ggstress"));
		else
			fragment.append(wikifier("gstress")); 
		
		br();

		delete V.breederEdgingMessage;
	}

	if (V.dumbBitchOrgasmMessage) {
		element("span", "Your orgasm is frying your brain.", "red"); 
		fragment.append(wikifier("llstress"));
		fragment.append(wikifier("lwillpower"));
		element("span", "|",);
		element("span", "- Intelligence", "red");
		br();
		if (V.dumbBitchOrgasmMessage === 2) {
			element("span", 
				either(
					"Lockpicking is now like... just so hard or something.",
					"Everyone seems like... so trustworthy now.",
					"Malice?... Like... what's that?"
				), 
			"red");
			br();
		}
		else if (V.dumbBitchOrgasmMessage === 3) {
			element("span", 
				either(
					"Everyone's so nice... Like, you should totally fuck more.",
					"Sex is like... so yummy right now. You want it all.",
					"You want to, like... feel g- good-er? Better? Oh just fuck~"
				), 
			"lewd");
			br();
		}
		br();
		delete V.dumbBitchOrgasmMessage;
	}

	if (V.refractoryPeriodMessage) {
		element("span", "Your body is still recovering from your last orgasm.", "blue"); br();
		delete V.refractoryPeriodMessage;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;