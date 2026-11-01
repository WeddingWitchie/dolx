const BAILEY_EXPANSION_VERSION = "0.6.3.1";

function baileyRevealed() {
	return V.syndromeBailey === true;
}

function baileyLog(message, vars = V) {
	if (vars.debug === 1) console.log("[BaileyExpansion] " + message);
}

const BAILEY_STOCKHOLM_SCENES = ["temple", "kylar", "cafe", "whitney", "gwylan", "kick", "avery", "halloween", "eden"];

window.baileyStockholmFloor = function () {
	const pts = V.baileyStockholmPoints;
	let floor = pts.offerDefeat === true ? 3 : pts.offer === true ? 1 : 0;
	BAILEY_STOCKHOLM_SCENES.forEach(function (k) {
		if (pts[k] === true) floor += 1;
	});
	return floor;
};

window.baileyStockholmFloorMax = function () {
	return 3 + BAILEY_STOCKHOLM_SCENES.length;
};

window.baileyMaxRent = function () {
	const modifier = V.settings.rentCostModifier || 1;
	return Math.floor(200000 * modifier);
};

const BAILEY_PRICE_RATES = { spank: 0.25, short: 0.5, medium: 1, allNight: 2.5, catEars: 1 };
window.baileyPrice = function (kind) {
	return Math.floor(window.baileyMaxRent() * BAILEY_PRICE_RATES[kind]);
};

window.baileyFlatState = function () {
	const t = Time.hour * 60 + Time.minute;
	if (t >= 330 && t < 390) return "leaving"; // 05:30 to 06:30, heading out
	if (t >= 390 && t < 1140) return "away"; // 06:30 to 19:00, at the orphanage
	if (t >= 120 && t < 330) return "asleep"; // 02:00 to 05:30, there but won't come to the door
	return "home"; // 19:00 to 02:00, active
};

function baileyDayToDate(day) {
	return new DateTime(Time.startDate.timeStamp + day * TimeConstants.secondsPerDay);
}
function baileyDateToDay(date) {
	return Math.floor((date.timeStamp - Time.startDate.timeStamp) / TimeConstants.secondsPerDay);
}
window.baileyWeekendClose = function (day) {
	const date = baileyDayToDate(day);
	if (date.weekDay === 7) return day + 1;
	if (date.weekDay === 1) return day;
	return baileyDateToDay(date.getPreviousWeekdayDate(1));
};

window.baileyWeeksMissed = function () {
	if (!V.baileyMonogamous || V.baileyWeekendClosed === undefined) return 0;
	return Math.max(0, (baileyDateToDay(Time.getPreviousWeekdayDate(1)) - V.baileyWeekendClosed) / 7);
};

window.baileyStraying = function () {
	return window.baileyWeeksMissed() >= 2;
};

window.baileySafeWordIsName = function (word) {
	return V.NPCNameList.some(name => name.toLowerCase() === word.toLowerCase());
};

/* Each key -> img/clothes/neck/baileys_collar_<key>/full.png */
window.baileyCollarRegistry = [
	{ key: "reiyu_goose", pack: "Goose", label: "Goose by Reiyu" },
	{ key: "en_goose_colored", pack: "Goose", label: "Goose - Colored Lotus by En" },
	{ key: "en_goose_fullcolor", pack: "Goose", label: "Goose - Full Color Lotus by En" },
	{ key: "en_goose_gold", pack: "Goose", label: "Goose - Gold Lotus by En" },
	{ key: "en_goose_steel", pack: "Goose", label: "Goose - Steel Lotus by En" },
	{ key: "mj_goose", pack: "Goose", label: "Goose by MJ" },
	{ key: "snowy_vanilla", pack: "Vanilla", label: "Vanilla by Snowy" },
	{ key: "mj_vanilla", pack: "Vanilla", label: "Vanilla by MJ" },
	{ key: "rasu_mikili", pack: "Mikili", label: "Mikili by Rasu" },
	{ key: "weremane_mikili", pack: "Mikili", label: "Mikili by Weremane" },
	{ key: "anamink_au_masc", pack: "AU", label: "AU Masc by Anamink" },
	{ key: "anamink_au_fem", pack: "AU", label: "AU Fem by Anamink" },
	{ key: "anamink_au_andro", pack: "AU", label: "AU Andro by Anamink" },
	{ key: "mj_au_masc", pack: "AU", label: "AU Masc by MJ" },
	{ key: "mj_au_fem", pack: "AU", label: "AU Fem by MJ" },
	{ key: "mj_au_andro", pack: "AU", label: "AU Andro by MJ" },
	{ key: "reiyu_dmmm", pack: "DMMM", label: "DMMM by Reiyu" },
	{ key: "mj_dmmm", pack: "DMMM", label: "DMMM by MJ" },
	{ key: "mj_hikari", pack: "Hikari", label: "Hikari by MJ" },
	{ key: "mj_rayne", pack: "Rayne", label: "Rayne by MJ" },
	{ key: "dove_rayne", pack: "Rayne", label: "Rayne by Dove" },
	{ key: "mj_beeesss", pack: "Beeesss", label: "Beeesss by MJ" },
	{ key: "mj_rgraphics", pack: "R-Graphics", label: "R-Graphics by MJ" },
	{ key: "mj_goose_fem_pink", pack: "Goose", label: "Goose Fem Pink by MJ" },
	{ key: "mj_goose_fem_pink_alt", pack: "Goose", label: "Goose Fem Pink Alt by MJ" },
	{ key: "mj_goose_fem_pink_lite", pack: "Goose", label: "Goose Fem Pink Lite by MJ" },
	{ key: "mj_goose_fem_silver", pack: "Goose", label: "Goose Fem Silver by MJ" },
	{ key: "mj_goose_masc_pink", pack: "Goose", label: "Goose Masc Pink by MJ" },
	{ key: "mj_goose_masc_pink_alt", pack: "Goose", label: "Goose Masc Pink Alt by MJ" },
	{ key: "mj_goose_masc_pink_lite", pack: "Goose", label: "Goose Masc Pink Lite by MJ" },
	{ key: "mj_goose_masc_silver", pack: "Goose", label: "Goose Masc Silver by MJ" },
	{ key: "mj_vanilla_pink", pack: "Vanilla", label: "Vanilla Pink by MJ" },
	{ key: "mj_vanilla_silver", pack: "Vanilla", label: "Vanilla Silver by MJ" },
	{ key: "mj_mikili_pink", pack: "Mikili", label: "Mikili Pink by MJ" },
	{ key: "mj_mikili_pink_alt", pack: "Mikili", label: "Mikili Pink Alt by MJ" },
	{ key: "mj_mikili_pink_lite", pack: "Mikili", label: "Mikili Pink Lite by MJ" },
	{ key: "mj_mikili_silver", pack: "Mikili", label: "Mikili Silver by MJ" },
	{ key: "mj_au_andro_pink", pack: "AU", label: "AU Andro Pink by MJ" },
	{ key: "mj_au_andro_pink_alt", pack: "AU", label: "AU Andro Pink Alt by MJ" },
	{ key: "mj_au_andro_pink_lite", pack: "AU", label: "AU Andro Pink Lite by MJ" },
	{ key: "mj_au_andro_silver", pack: "AU", label: "AU Andro Silver by MJ" },
	{ key: "mj_au_fem_pink", pack: "AU", label: "AU Fem Pink by MJ" },
	{ key: "mj_au_fem_pink_alt", pack: "AU", label: "AU Fem Pink Alt by MJ" },
	{ key: "mj_au_fem_pink_lite", pack: "AU", label: "AU Fem Pink Lite by MJ" },
	{ key: "mj_au_fem_silver", pack: "AU", label: "AU Fem Silver by MJ" },
	{ key: "mj_au_masc_pink", pack: "AU", label: "AU Masc Pink by MJ" },
	{ key: "mj_au_masc_pink_alt", pack: "AU", label: "AU Masc Pink Alt by MJ" },
	{ key: "mj_au_masc_pink_lite", pack: "AU", label: "AU Masc Pink Lite by MJ" },
	{ key: "mj_au_masc_silver", pack: "AU", label: "AU Masc Silver by MJ" },
	{ key: "mj_dmmm_pink", pack: "DMMM", label: "DMMM Pink by MJ" },
	{ key: "mj_dmmm_pink_alt", pack: "DMMM", label: "DMMM Pink Alt by MJ" },
	{ key: "mj_dmmm_pink_lite", pack: "DMMM", label: "DMMM Pink Lite by MJ" },
	{ key: "mj_dmmm_silver", pack: "DMMM", label: "DMMM Silver by MJ" },
	{ key: "mj_rgraphics_pink", pack: "R-Graphics", label: "R-Graphics Pink by MJ" },
	{ key: "mj_rgraphics_pink_alt", pack: "R-Graphics", label: "R-Graphics Pink Alt by MJ" },
	{ key: "mj_rgraphics_pink_lite", pack: "R-Graphics", label: "R-Graphics Pink Lite by MJ" },
	{ key: "mj_rgraphics_silver", pack: "R-Graphics", label: "R-Graphics Silver by MJ" },
	{ key: "mj_rayne_pink", pack: "Rayne", label: "Rayne Pink by MJ" },
	{ key: "mj_rayne_pink_alt", pack: "Rayne", label: "Rayne Pink Alt by MJ" },
	{ key: "mj_rayne_pink_lite", pack: "Rayne", label: "Rayne Pink Lite by MJ" },
	{ key: "mj_rayne_silver", pack: "Rayne", label: "Rayne Silver by MJ" },
	{ key: "mj_beeesss_pink", pack: "Beeesss", label: "Beeesss Pink by MJ" },
	{ key: "mj_beeesss_silver", pack: "Beeesss", label: "Beeesss Silver by MJ" },
];

/* Once per loaded state: one-off repairs. */
function syncBaileyDom() {
	const bailey = C.npc.Bailey;

	["dom", "love"].forEach(function (stat) {
		const old = V["bailey_" + stat];
		if (old === undefined) return;
		if (Number.isFinite(old) && bailey[stat] !== old) {
			baileyLog("Migrated $bailey_" + stat + " " + old + " -> C.npc.Bailey." + stat);
			bailey[stat] = old;
		}
		delete V["bailey_" + stat];
	});

	/* Pre-0.6 saves stored these with no ceiling. */
	["dom", "love"].forEach(function (stat) {
		if (bailey[stat] > 100) {
			baileyLog("Clamped C.npc.Bailey." + stat + " " + bailey[stat] + " -> 100");
			bailey[stat] = 100;
		}
	});

	if (!Number.isFinite(bailey.dom)) bailey.dom = baileyRevealed() ? 100 : 50;
	if (!Number.isFinite(bailey.love)) bailey.love = 0;
	if (!Number.isFinite(V.syndromeBaileyBuild)) V.syndromeBaileyBuild = 0;

	/* A save that predates RBE has the baseNNPC dom of 0 and the vanilla outfit list. */
	if (V.baileyRbeInit !== true) {
		if (bailey.dom === 0) {
			bailey.dom = baileyRevealed() ? 100 : 50;
			baileyLog("Initialized C.npc.Bailey.dom -> " + bailey.dom);
		}
		if (bailey.outfits && !bailey.outfits.includes("business")) {
			bailey.outfits.pushUnique("business", "maleFormal1", "femaleFormal1", "townBlazer", "townCoat");
			baileyLog("Added Bailey outfit pool to an existing save");
		}
		V.baileyRbeInit = true;
	}

	if (bailey.sextoys == null) bailey.sextoys = {};

	const floor = window.baileyStockholmFloor();
	if (V.syndromeBaileyBuild < floor) {
		baileyLog("Raised $syndromeBaileyBuild " + V.syndromeBaileyBuild + " -> " + floor);
		V.syndromeBaileyBuild = floor;
	}

	enforceBaileyState();
}

function enforceBaileyState() {
	const bailey = C.npc.Bailey;
	if (baileyRevealed() && bailey.dom !== 100) bailey.dom = 100;
	/* 0 = never uses condoms; nothing in vanilla resets it. */
	if (V.baileyMonogamous === true && bailey.pregnancyAvoidance !== 0) {
		baileyLog("Monogamous Bailey pregnancyAvoidance " + bailey.pregnancyAvoidance + " -> 0");
		bailey.pregnancyAvoidance = 0;
	}
}

function markStoodUp() {
	V.baileyDateMissed = true;
	V.baileyBrat.points = Math.clamp(V.baileyBrat.points + 2, 0, 20);
	if (!V.baileyBrat.reasons.includes("stoodup")) V.baileyBrat.reasons.push("stoodup");
}

/* Date booked but not attended by midnight. */
function checkStoodUp() {
	if (V.baileyDateSchedDay !== undefined && Time.days <= V.baileyDateSchedDay) return;
	if (V.baileyDateScheduled) {
		if (!V.baileyDateAttended) markStoodUp();
		V.baileyDateScheduled = false;
		V.baileyDateAttended = false;
	}
	if (V.baileyDateAllNightScheduled) {
		if (!V.baileyDateAttended) markStoodUp();
		V.baileyDateAllNightScheduled = false;
		V.baileyDateAttended = false;
	}
}

/* +1 lust/day once Stockholm's active, +2 while monogamous. */
function dailyLust() {
	if (V.baileyLustLastDay === undefined) {
		V.baileyLustLastDay = Time.days;
		return;
	}
	const delta = Time.days - V.baileyLustLastDay;
	if (delta <= 0) {
		if (delta < 0) V.baileyLustLastDay = Time.days;
		return;
	}
	V.baileyLustLastDay = Time.days;
	if (V.syndromeBailey === true) {
		const perDay = V.baileyMonogamous ? 2 : 1;
		C.npc.Bailey.lust = Math.clamp(C.npc.Bailey.lust + delta * perDay, 0, 100);
	}
}

function resetChristmasGift() {
	if (V.christmas) return;
	delete V.christmasGiftBailey;
	delete V.christmasGiftBaileyWrapped;
	delete V.christmasGiftBaileyGiven;
}

function keepLure() {
	if (V.baileyOfficeGift === "lure") V.baileySeen.pushUnique("lure");
}

/* Collar art. The uploaded image has no file on disk, so it is seeded into
Renderer.ImageCaches, which the renderer checks before it loads anything. */
window.baileyCollarImages = {};
window.baileyCollarImages.custom = (function () {
	try {
		return localStorage.getItem("baileyCollarCustom") || null;
	} catch (e) {
		return null;
	}
})();

const customCollarSrcs = ["full", "frayed", "torn", "tattered"].flatMap(function (n) {
	return ["img/clothes/neck/baileys_collar_custom/" + n + ".png", "img2/clothes/neck/baileys_collar_custom/" + n + ".png"];
});
let customCollarCanvas = null;

function sidebarModel() {
	const cache = Renderer.CanvasModelCaches.main;
	return cache && cache.sidebar ? cache.sidebar : null;
}

function redrawCollar() {
	const model = sidebarModel();
	if (model && model.canvas) Renderer.refreshLayer(model, "neck");
}

function seedCustomCollar() {
	if (!customCollarCanvas) return;
	customCollarSrcs.forEach(function (src) {
		Renderer.ImageCaches[src] = customCollarCanvas;
		delete Renderer.ImageErrors[src];
	});
}

function customCollarSeeded() {
	if (!customCollarCanvas) return true;
	return customCollarSrcs.every(function (src) {
		return Renderer.ImageCaches[src] === customCollarCanvas && !Renderer.ImageErrors[src];
	});
}

/* Same rescale as renderer.js rescaleImageToCanvasHeight, which is not exported. */
function decodeCustomCollar(dataUri, done) {
	const img = new Image();
	img.onload = function () {
		const height = Renderer.CanvasModels.main.height;
		const c = document.createElement("canvas");
		c.width = height * (img.width / img.height);
		c.height = height;
		const ctx = c.getContext("2d");
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(img, 0, 0, c.width, c.height);
		customCollarCanvas = c;
		seedCustomCollar();
		redrawCollar();
		if (done) done();
	};
	img.onerror = function () {
		console.log("[BaileyExpansion] Custom collar image failed to decode");
	};
	img.src = dataUri;
}

if (window.baileyCollarImages.custom) decodeCustomCollar(window.baileyCollarImages.custom);

function clearCustomCollar() {
	customCollarCanvas = null;
	customCollarSrcs.forEach(function (src) {
		delete Renderer.ImageCaches[src];
		delete Renderer.ImageErrors[src];
	});
}

function collarArtKey() {
	let key = V.baileyCollarArt || "reiyu_goose";
	if (key === "custom" && !window.baileyCollarImages.custom) key = "reiyu_goose";
	if (
		key !== "custom" &&
		!window.baileyCollarRegistry.some(function (e) {
			return e.key === key;
		})
	)
		key = "reiyu_goose";
	return key;
}

/* setup is rebuilt on page load and the sidebar keeps its own copy of the worn item. */
function applyCollarArt(key) {
	const target = "baileys_collar_" + key;
	let changed = false;
	setup.clothes.neck.forEach(function (c) {
		if (c.name === "Bailey's collar" && c.variable !== target) {
			c.variable = target;
			changed = true;
		}
	});
	if (V.worn.neck.name === "Bailey's collar" && V.worn.neck.variable !== target) {
		V.worn.neck.variable = target;
		changed = true;
	}
	const model = sidebarModel();
	const snap = model && model.options.worn ? model.options.worn.neck.setup : null;
	if (snap && snap.name === "Bailey's collar" && snap.variable !== target) {
		snap.variable = target;
		changed = true;
	}
	if (key === "custom" && !customCollarSeeded()) {
		seedCustomCollar();
		changed = true;
	}
	if (changed) redrawCollar();
}

function selectCollarArt(key) {
	V.baileyCollarArt = key;
	applyCollarArt(collarArtKey());
}

/* File picker -> base64 in localStorage -> $baileyCollarArt = "custom". 2 MB cap. */
window.baileyCollarUpload = function () {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = "image/png,image/webp,image/jpeg,image/gif";
	input.style.display = "none";
	input.addEventListener("change", function (ev) {
		const file = ev.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			alert("Image too large (max 2MB). Please pick a smaller file.");
			return;
		}
		const reader = new FileReader();
		reader.onload = function (e) {
			const dataUri = e.target.result;
			try {
				localStorage.setItem("baileyCollarCustom", dataUri);
			} catch (err) {
				alert("Couldn't save custom collar - localStorage is full or disabled.");
				return;
			}
			window.baileyCollarImages.custom = dataUri;
			decodeCustomCollar(dataUri, function () {
				selectCollarArt("custom");
				refreshCollarListbox();
			});
		};
		reader.onerror = function () {
			alert("Couldn't read that file. Try a different image.");
		};
		reader.readAsDataURL(file);
	});
	document.body.appendChild(input);
	input.click();
	setTimeout(function () {
		input.remove();
	}, 1000);
};

window.baileyCollarRemoveCustom = function () {
	try {
		localStorage.removeItem("baileyCollarCustom");
	} catch (e) {}
	window.baileyCollarImages.custom = null;
	clearCustomCollar();
	if (V.baileyCollarArt === "custom") selectCollarArt("reiyu_goose");
	refreshCollarListbox();
};

function refreshCollarListbox() {
	const box = document.querySelector("#collar-listbox");
	if (!box) return;
	$(box).empty();
	// eslint-disable-next-line no-new
	new Wikifier(box, "<<lotus_listbox>>");
}

$(document).on("change", "#collar-listbox select", function () {
	selectCollarArt(this.value);
});

let prepared = false;
let synced = false;
/* Every moment in the save, not just the current one. */
$(document).on(":onloadsave", function (event, { save }) {
	save.state.history.forEach(function (moment, index) {
		const moved = prepareBaileyVars(moment.variables);
		if (moved && index === save.state.index) baileyLog("Migrated " + moved + " old variables", moment.variables);
	});
	prepared = true;
	synced = false;
});

/* $NPCName is created by the Start passage; init flips to 1 in Orphanage Intro. */
function baileyInGame() {
	return V.NPCName !== undefined && C.npc.Bailey.init === 1;
}

$(document).on(":passagestart", function () {
	if (V.NPCName === undefined) return;
	if (!prepared) {
		prepared = true;
		prepareBaileyVars(V);
	}
	if (!baileyInGame()) return;
	if (!synced) {
		synced = true;
		syncBaileyDom();
		const key = collarArtKey();
		if (key !== V.baileyCollarArt && V.baileyCollarArt !== undefined) V.baileyCollarArt = key;
		applyCollarArt(key);
	} else if (V.baileyCollarArt === "custom" && !customCollarSeeded()) {
		seedCustomCollar();
		redrawCollar();
	}
	/* Flashbacks, visions, replays and the Hopeless Cycle are frozen; lust catches up by days once they end. */
	if (V.statFreeze || V.frozenValues || V.replayScene || V.hc) return;
	checkStoodUp();
	dailyLust();
	resetChristmasGift();
	keepLure();
});
$(document).on(":passageend", function () {
	if (baileyInGame()) enforceBaileyState();
});

$(document).one(":storyready", function () {
	/* text.js loads after this file, so these can't be registered at script load. */
	statDisplay.create("gbaileystock", () => statDisplay.statChange(baileyRevealed() ? "Stockholm Syndrome" : "???", 1, "bailey-stockholm"));
	statDisplay.create("gbrattax", pennies => (pennies > 0 ? statDisplay.statChange(window.formatMoney(pennies) + " Brat Tax", 1, "pink") : ""));
	statDisplay.create("gbaileyMood", amount => statDisplay.statChange("Mood", amount, amount > 0 ? "green" : "red"));

	/* Start screen stamp. Start has already rendered by the time this runs. */
	const passage = document.querySelector(".passage");
	if (passage && State.passage === "Start") {
		const el = document.createElement("div");
		el.id = "bailey-mod-indicator";
		el.className = "bailey-stockholm";
		el.style.textAlign = "center";
		el.style.marginTop = "1em";
		el.style.marginBottom = "1em";
		el.textContent = "Reiyu's Bailey Expansion v" + BAILEY_EXPANSION_VERSION + " for X-Change — Active";
		passage.insertBefore(el, passage.firstChild);
	}

	if (!setup.loveInterestNpc.includes("Bailey")) {
		setup.loveInterestNpc.unshift("Bailey");
		baileyLog("Bailey added to start of loveInterestNpc list");
	}
});

/* Pre-0.6.3 name -> current name */
const BAILEY_RENAMED_VARS = {
	syndromebailey: "syndromeBailey",
	syndromebaileybuild: "syndromeBaileyBuild",
	bailey_ambush_advantage: "baileyAmbushAdvantage",
	bailey_avery_rescue_active: "baileyAveryRescueActive",
	bailey_avery_resume_combat: "baileyAveryResumeCombat",
	bailey_brat: "baileyBrat",
	bailey_catears: "baileyCatEars",
	bailey_collar_art: "baileyCollarArt",
	bailey_collar_taken: "baileyCollarTaken",
	bailey_date_allnight: "baileyDateAllNight",
	bailey_date_allnight_scheduled: "baileyDateAllNightScheduled",
	bailey_date_attended: "baileyDateAttended",
	bailey_date_bill: "baileyDateBill",
	bailey_date_medium: "baileyDateMedium",
	bailey_date_missed: "baileyDateMissed",
	bailey_date_pc_paid: "baileyDatePcPaid",
	bailey_date_sched_day: "baileyDateSchedDay",
	bailey_date_scheduled: "baileyDateScheduled",
	bailey_date_short: "baileyDateShort",
	bailey_desk_offered: "baileyDeskOffered",
	bailey_fight_sex: "baileyFightSex",
	bailey_flat_dragged: "baileyFlatDragged",
	bailey_gala: "baileyGala",
	bailey_gift_toy: "baileyGiftToy",
	bailey_halloween_asked: "baileyHalloweenAsked",
	bailey_halloween_attended: "baileyHalloweenAttended",
	bailey_halloween_scheduled: "baileyHalloweenScheduled",
	bailey_handhold_weapon: "baileyHandholdWeapon",
	bailey_kick_returning: "baileyKickReturning",
	bailey_lust_lastday: "baileyLustLastDay",
	bailey_mathsphoto: "baileyMathsPhoto",
	bailey_monogamous: "baileyMonogamous",
	bailey_nightmare_restless: "baileyNightmareRestless",
	bailey_offered: "baileyOffered",
	bailey_office_gift: "baileyOfficeGift",
	bailey_office_mast_catch: "baileyOfficeMastCatch",
	bailey_office_mast_catcher: "baileyOfficeMastCatcher",
	bailey_office_seduced_this_cycle: "baileyOfficeSeducedThisCycle",
	bailey_rbe_init: "baileyRbeInit",
	bailey_sleep_config: "baileySleepConfig",
	bailey_spank_choice: "baileySpankChoice",
	bailey_spank_clean: "baileySpankClean",
	bailey_spank_count: "baileySpankCount",
	bailey_title: "baileyTitle",
	bailey_title_from: "baileyTitleFrom",
	bailey_vent_fight: "baileyVentFight",
	bailey_vent_seen: "baileyVentSeen",
	bailey_weekend_closed: "baileyWeekendClosed",
	bailey_weekend_round: "baileyWeekendRound",
	bailey_weekend_visits: "baileyWeekendVisits",
	bailey_whitney_dom_entry: "baileyWhitneyDomEntry",
	bailey_wraith_seen: "baileyWraithSeen",
	baileywhitneyoutcome: "baileyWhitneyOutcome",
	christmas_bailey_lotus_day: "christmasBaileyLotusDay",
	christmas_gift_bailey: "christmasGiftBailey",
	christmas_gift_bailey_given: "christmasGiftBaileyGiven",
	christmas_gift_bailey_wrapped: "christmasGiftBaileyWrapped",
	date_short_intimidated: "baileyDateShortIntimidated",
	date_short_leaned: "baileyDateShortLeaned",
	date_short_listened: "baileyDateShortListened",
	date_short_stole: "baileyDateShortStole",
	stockholm_points: "baileyStockholmPoints",
	bratTax: "baileyBratTax",
	safeWordEncounter: "baileySafeWordEncounter",
	wraithPool: "baileyWraithPool",
	wraithResisted: "baileyWraithResisted",
};
const BAILEY_RETIRED_VARS = [
	"date_short_npc",
	"date_medium_goon1",
	"date_medium_goon2",
	"date_medium_waiter",
	"baileywhitneyround",
	"bailey_catears_price",
	"bailey_spank_price",
	"bailey_date_medium_price",
	"bailey_date_allnight_price",
	"bailey_kick_return",
	"bailey_monogamy_unlocked",
	"bailey_title_unlocked",
	"date_short_position",
	"baileyQuestStage",
	"baileyFirstSeen",
	"baileywhitneysex",
	"bailey_allnight_early_sex",
	"bailey_allnight_masturbation_caught",
	"bailey_flat_known",
	"bailey_kept_photo",
	"bailey_photo_seen",
	"bailey_halloween_score",
	"bailey_halloween_topics",
	"bailey_halloween_cycle",
	"bailey_halloween_guests_met",
	"bailey_halloween_steal_caught",
];
/* Old flags -> $baileySeen entry */
const BAILEY_SEEN_FLAGS = {
	bailey_wolfsuit_seen: "wolfsuit",
	bailey_lure_received: "lure",
	baileycollar: "collar",
	bailey_lotus_seen: "lotus",
	bailey_papers_caught: "papersCaught",
};
/* Old flag objects -> $baileySeen, prefix + Key */
const BAILEY_SEEN_OBJECTS = {
	bailey_rent_seen: "rent",
	bailey_town: "town",
	bailey_gossip_seen: "gossip",
	bailey_offered_seen: "offer",
};
/* Were 1/0 before 0.6.3 */
const BAILEY_BOOLEAN_VARS = [
	"baileyAveryRescueActive",
	"baileyAveryResumeCombat",
	"baileyDateScheduled",
	"baileyDateAllNightScheduled",
	"baileyDateAttended",
	"baileyDateMissed",
	"baileyWatchingMasturbation",
	"christmasGiftBaileyGiven",
	"christmasGiftBaileyWrapped",
];
const BAILEY_DEFAULTS = {
	syndromeBailey: false,
	syndromeBaileyBuild: 0,
	baileyStockholmPoints: {},
	baileySeen: [],
	baileyTitle: "Bailey",
	baileyBrat: { points: 0, reasons: [] },
	baileyBratTax: 0,
	baileyOffered: 0,
	baileyMonogamous: false,
	baileyCatEars: 0,
	baileyDateShort: 0,
	baileyDateMedium: 0,
	baileyDateAllNight: 0,
	baileyDeskOffered: 0,
	baileyVentSeen: 0,
	baileyWraithSeen: 0,
	baileyWeekendVisits: 0,
	baileyCatchCounter: 0,
};

function migrateRenamedVars(vars) {
	let moved = 0;
	if (!vars.baileySeen) vars.baileySeen = [];
	Object.entries(BAILEY_SEEN_FLAGS).forEach(function ([from, entry]) {
		if (vars[from] === undefined) return;
		if (vars[from]) vars.baileySeen.pushUnique(entry);
		delete vars[from];
		moved++;
	});
	Object.entries(BAILEY_SEEN_OBJECTS).forEach(function ([from, prefix]) {
		if (vars[from] === undefined) return;
		Object.keys(vars[from]).forEach(function (key) {
			if (vars[from][key]) vars.baileySeen.pushUnique(prefix + key.toUpperFirst());
		});
		delete vars[from];
		moved++;
	});
	Object.entries(BAILEY_RENAMED_VARS).forEach(function ([from, to]) {
		if (vars[from] === undefined) return;
		vars[to] = vars[from];
		delete vars[from];
		moved++;
	});
	BAILEY_RETIRED_VARS.forEach(function (name) {
		if (vars[name] === undefined) return;
		delete vars[name];
		moved++;
	});
	BAILEY_BOOLEAN_VARS.forEach(function (name) {
		if (typeof vars[name] === "number") vars[name] = vars[name] === 1;
	});
	if (vars.baileyStockholmPoints?.offer_defeat !== undefined) {
		vars.baileyStockholmPoints.offerDefeat = vars.baileyStockholmPoints.offer_defeat;
		delete vars.baileyStockholmPoints.offer_defeat;
	}
	if (vars.weekly?.baileyTFseen !== undefined) {
		vars.weekly.baileyTfSeen = vars.weekly.baileyTFseen;
		delete vars.weekly.baileyTFseen;
	}
	return moved;
}

function migrateLegacyStockholm(vars) {
	let moved = 0;
	if (vars.stockholm_active !== undefined) {
		vars.syndromeBailey = vars.stockholm_active === true;
		delete vars.stockholm_active;
		moved++;
	}
	if (vars.stockholm_bailey !== undefined) {
		const build = Number(vars.stockholm_bailey);
		vars.syndromeBaileyBuild = Number.isFinite(build) ? build : 0;
		delete vars.stockholm_bailey;
		moved++;
	}
	return moved;
}

/* Old save names first, then start values. Returns how many old variables were found. */
function prepareBaileyVars(vars) {
	const moved = migrateRenamedVars(vars) + migrateLegacyStockholm(vars);
	if (vars.bailey_weekend_lastvisit !== undefined) {
		if (vars.baileyWeekendClosed === undefined) vars.baileyWeekendClosed = window.baileyWeekendClose(vars.bailey_weekend_lastvisit);
		delete vars.bailey_weekend_lastvisit;
	}
	Object.entries(BAILEY_DEFAULTS).forEach(function ([name, value]) {
		if (vars[name] === undefined) vars[name] = clone(value);
	});
	vars.baileyTitle = vars.baileyTitle.replace(/[<>]/g, "").trim().slice(0, 15) || "Bailey";
	return moved;
}
