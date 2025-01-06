

function playerIsXChanged() {
	return (
		V.xchange.pill && V.xchange.pill.active
	);
}
window.playerIsXChanged = playerIsXChanged;

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
	return V.xchange.nonconEnabled === 1 && !playerIsXChanged() && !playerIsPregnant();
}
window.playerMayBeSpiked = playerMayBeSpiked;

function genderIsIgnored() {
	return V.xchange.disregardGender === 1;
}
window.genderIsIgnored = genderIsIgnored;

function xchangeDailyCheck() {
	const fragment = document.createDocumentFragment();

	if ((V.hourlyFemininity > 0 && V.player.gender === "f") || (V.hourlyFemininity < 0 && V.player.gender === "m"))
		fragment.append(wikifier("genderidentity", 1));
	else if ((V.hourlyFemininity > 0 && V.player.gender === "m") || (V.hourlyFemininity < 0 && V.player.gender === "f"))
		fragment.append(wikifier("genderidentity", -1));

	if (playerIsXChanged())
		fragment.append(wikifier("genderidentity", -2));

	fragment.append(wikifier("genderidentity-text", V.hourlyFemininity > 0? "f": (V.hourlyFemininity < 0? "m": 0)));
	V.hourlyFemininity = 0;

	fragment.append(wikifier("blackmail-daypassed"));

	V.recentmolest = Math.max(V.recentmolest - 1, 0);
	V.recentrape = Math.max(V.recentrape - 1, 0);

	if (V.robinbreakupCooldown > 0) {
		V.robinbreakupCooldown -= 1;
	}

	V.xchange.blackmailHalt = Math.max(0, V.xchange.blackmailHalt - 1);

	return fragment;
}
window.xchangeDailyCheck = xchangeDailyCheck;

function xchangeHourlyCheck() {
	const fragment = document.createDocumentFragment();

	const pill = V.xchange.pill;
	if (pill?.active)
	{
		// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
		// then, the change becomes permanent 
		if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
			fragment.append(wikifier("xchange-setpermanent"));
	
		// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
		// then, the change becomes permanent
		if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration > 30 * 24)
			fragment.append(wikifier("xchange-setpermanent"));

		// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
		pill.duration = Math.min(pill.duration, 30*24);

		// Stop the timer from ticking if PC is vaginally pregnant or the ear slime has grown past its point of no return
		if (!pillTimerPaused() && pill.duration >= 0) {
			pill.duration = Math.max(pill.duration-1, 0);
			if (pill.duration == 0)
			{
				if (pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) fragment.append(wikifier("xchange-setpermanent"));
					else {
						pill.duration += 30 * 24;
						pill.resistanceEffect = false;
						pill.fertile = true;
					}
				}
				else if (V.xchange.pill.clone === "none") {
					fragment.append(wikifier("xchange-restore"));
				} 
				else {
					fragment.append(wikifier("xchange-restore", "nosave"));
				}
			} 
		}
		// Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
		else if (V.xchange.pillPermanence !== 1 && pillIsPermanent()) {
			pill.duration = 0;
			if (!pillTimerPaused()) {
				if (V.xchange.pill.clone === "none") {
					fragment.append(wikifier("xchange-restore"));
				} 
				else {
					fragment.append(wikifier("xchange-restore", "nosave"));
				}
			}
		}
	}

	// Apply hour-random passion effect
	if (pill?.passionEffect && random(0,8) == 0) {
		fragment.append(wikifier("drugs", 300)); 
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

	return fragment;
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
		V.effectsmessage = 1;
		if (V.player.gender === "m" && currentWornFemininity < 0) {
			wikifier("stress",800,1);
			V.genderificationStressMessage = 1;
		}
		else if (V.player.gender === "m" && currentWornFemininity > 0) {
			wikifier("stress",-10);
			V.tiredness -= 200;
			V.genderificationStressMessage = 2;
		}
		if (V.player.gender === "f" && currentWornFemininity > 0) {
			wikifier("stress",800,1);
			V.genderificationStressMessage = 3;
		}
		else if (V.player.gender === "f" && currentWornFemininity < 0) {
			wikifier("stress",-10);
			V.tiredness -= 200;
			V.genderificationStressMessage = 4;
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
		element("span", "You didn't turn back. Your pill's effects have become permanent", "red"); br();
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
			element("span", "You have an urge to feel cute.", "purple");
			// element("span", "This outfit is stressing you out.", "red"); 
			fragment.append(wikifier("gstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 2:
			element("span", "You are feeling cute and refreshed with your outfit.", "light-pink");
			// element("span", "This outfit makes you happy.", "green"); br();
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You have an urge to feel manly.", "purple");
			// element("span", "This outfit is stressing you out.", "red"); br();
			fragment.append(wikifier("gstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You are feeling manly and vigourous with your fit.", "blue");
			// element("span", "This outfit makes you happy.", "red"); br();
			fragment.append(wikifier("llstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		default:
			break;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;