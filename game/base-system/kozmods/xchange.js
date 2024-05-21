

function playerIsXChanged() {
	return (
		V.xchangePill && V.xchangePill.active
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
	return V.xchangePill.duration <= -1;
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


function xchangeHourlyCheck() {
	const fragment = document.createDocumentFragment();

	if (V.xchangePill && V.xchangePill.active)
	{
		const pill = V.xchangePill;
		// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
		// then, the change becomes permanent 
		if (V.xchange.pillPermanence === 1 && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
			fragment.append(wikifier("xchange-setpermanent"));
	
		// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
		// then, the change becomes permanent
		if (V.xchange.pillPermanence === 1 && pill.continueEffect && pill.duration > 30 * 24)
			fragment.append(wikifier("xchange-setpermanent"));

		// Stop the timer from ticking if PC is vaginally pregnant or the ear slime has grown past its point of no return
		if (!pillTimerPaused() && pill.duration > 0) {
			pill.duration = Math.max(pill.duration-1, 0);
			if (pill.duration == 0)
			{
				if (pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) fragment.append(wikifier("xchange-setpermanent"));
					else {
						pill.duration += 30 * 24;
						pill.resistanceEffect = false;
					}
				}
				else if (V.xchangePill.clone === "none") {
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
				if (V.xchangePill.clone === "none") {
					fragment.append(wikifier("xchange-restore"));
				} 
				else {
					fragment.append(wikifier("xchange-restore", "nosave"));
				}
			}
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
}
window.hourlyClothingFemininityCheck = hourlyClothingFemininityCheck;
