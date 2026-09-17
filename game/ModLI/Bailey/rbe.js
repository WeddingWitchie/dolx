const BAILEY_EXPANSION_VERSION = "0.6.1.2";

function baileyRevealed() {
	return V.syndromebailey === true;
}

function baileyLog(message) {
	if (V.debug === 1) console.log("[BaileyExpansion] " + message);
}

const BAILEY_STOCKHOLM_SCENES = ["temple", "kylar", "cafe", "whitney", "gwylan", "kick", "avery", "halloween", "eden"];

window.baileyStockholmFloor = function () {
	const pts = V.stockholm_points;
	let floor = pts.offer_defeat === true ? 3 : pts.offer === true ? 1 : 0;
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
	if (!V.bailey_monogamous || V.bailey_weekend_closed === undefined) return 0;
	return Math.max(0, (baileyDateToDay(Time.getPreviousWeekdayDate(1)) - V.bailey_weekend_closed) / 7);
};

window.baileyStraying = function () {
	return window.baileyWeeksMissed() >= 2;
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

function migrateLegacyStockholm() {
	if (V.stockholm_active !== undefined) {
		V.syndromebailey = V.stockholm_active === true;
		baileyLog("Migrated $stockholm_active (" + V.stockholm_active + ") -> $syndromebailey (" + V.syndromebailey + ")");
		delete V.stockholm_active;
	}

	if (V.stockholm_bailey !== undefined) {
		const build = Number(V.stockholm_bailey);
		V.syndromebaileybuild = Number.isFinite(build) ? build : 0;
		baileyLog("Migrated $stockholm_bailey (" + V.stockholm_bailey + ") -> $syndromebaileybuild (" + V.syndromebaileybuild + ")");
		delete V.stockholm_bailey;
	}
}

/* Once per loaded state: new-game defaults, legacy migrations, one-off repairs. */
function syncBaileyDom() {
	if (!V.stockholm_points) V.stockholm_points = {};
	if (V.syndromebaileybuild === undefined) V.syndromebaileybuild = 0;
	V.bailey_title =
		String(V.bailey_title || "")
			.replace(/[<>]/g, "")
			.trim()
			.slice(0, 15) || "Bailey";
	migrateLegacyStockholm();
	if (V.bailey_weekend_lastvisit !== undefined) {
		V.bailey_weekend_closed = window.baileyWeekendClose(V.bailey_weekend_lastvisit);
		delete V.bailey_weekend_lastvisit;
	}

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

	/* A save that predates RBE has the baseNNPC dom of 0 and the vanilla outfit list. */
	if (V.bailey_rbe_init !== true) {
		if (bailey.dom === 0) {
			bailey.dom = baileyRevealed() ? 100 : 50;
			baileyLog("Initialized C.npc.Bailey.dom -> " + bailey.dom);
		}
		if (bailey.outfits && !bailey.outfits.includes("business")) {
			bailey.outfits.pushUnique("business", "maleFormal1", "femaleFormal1", "townBlazer", "townCoat");
			baileyLog("Added Bailey outfit pool to an existing save");
		}
		V.bailey_rbe_init = true;
	}

	if (bailey.sextoys == null) bailey.sextoys = {};

	const floor = window.baileyStockholmFloor();
	if (V.syndromebaileybuild < floor) {
		baileyLog("Raised $syndromebaileybuild " + V.syndromebaileybuild + " -> " + floor);
		V.syndromebaileybuild = floor;
	}

	enforceBaileyState();
}

function enforceBaileyState() {
	const bailey = C.npc.Bailey;
	if (baileyRevealed() && bailey.dom !== 100) bailey.dom = 100;
	/* 0 = never uses condoms; nothing in vanilla resets it. */
	if (V.bailey_monogamous === true && bailey.pregnancyAvoidance !== 0) {
		baileyLog("Monogamous Bailey pregnancyAvoidance " + bailey.pregnancyAvoidance + " -> 0");
		bailey.pregnancyAvoidance = 0;
	}
}

function markStoodUp() {
	V.bailey_date_missed = 1;
	V.bailey_brat = V.bailey_brat || { points: 0, reasons: [] };
	V.bailey_brat.points = Math.clamp(V.bailey_brat.points + 2, 0, 20);
	if (!V.bailey_brat.reasons.includes("stoodup")) V.bailey_brat.reasons.push("stoodup");
}

/* Date booked but not attended by midnight. */
function checkStoodUp() {
	if (V.bailey_date_sched_day !== undefined && Time.days <= V.bailey_date_sched_day) return;
	if (V.bailey_date_scheduled === 1) {
		if (V.bailey_date_attended !== 1) markStoodUp();
		V.bailey_date_scheduled = 0;
		V.bailey_date_attended = 0;
	}
	if (V.bailey_date_allnight_scheduled === 1) {
		if (V.bailey_date_attended !== 1) markStoodUp();
		V.bailey_date_allnight_scheduled = 0;
		V.bailey_date_attended = 0;
	}
}

/* +1 lust/day once Stockholm's active, +2 while monogamous. */
function dailyLust() {
	if (V.bailey_lust_lastday === undefined) {
		V.bailey_lust_lastday = Time.days;
		return;
	}
	const delta = Time.days - V.bailey_lust_lastday;
	if (delta <= 0) {
		if (delta < 0) V.bailey_lust_lastday = Time.days;
		return;
	}
	V.bailey_lust_lastday = Time.days;
	if (V.syndromebailey === true) {
		const perDay = V.bailey_monogamous ? 2 : 1;
		C.npc.Bailey.lust = Math.clamp(C.npc.Bailey.lust + delta * perDay, 0, 100);
	}
}

function resetChristmasGift() {
	if (V.christmas) return;
	delete V.christmas_gift_bailey;
	delete V.christmas_gift_bailey_wrapped;
	delete V.christmas_gift_bailey_given;
}

function keepLure() {
	if (V.bailey_office_gift === "lure" && !V.bailey_lure_received) V.bailey_lure_received = true;
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

const customCollarSrcs = ["full", "frayed", "torn", "tattered"].map(function (n) {
	return "img/clothes/neck/baileys_collar_custom/" + n + ".png";
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
	let key = V.bailey_collar_art || "reiyu_goose";
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
	V.bailey_collar_art = key;
	applyCollarArt(collarArtKey());
}

/* File picker -> base64 in localStorage -> $bailey_collar_art = "custom". 2 MB cap. */
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
	if (V.bailey_collar_art === "custom") selectCollarArt("reiyu_goose");
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

let synced = false;
$(document).on(":onloadsave", function () {
	synced = false;
});

/* $NPCName is created by the Start passage; init flips to 1 in Orphanage Intro. */
function baileyInGame() {
	return V.NPCName !== undefined && C.npc.Bailey.init === 1;
}

$(document).on(":passagestart", function () {
	if (!baileyInGame()) return;
	if (!synced) {
		synced = true;
		syncBaileyDom();
		const key = collarArtKey();
		if (key !== V.bailey_collar_art && V.bailey_collar_art !== undefined) V.bailey_collar_art = key;
		applyCollarArt(key);
	} else if (V.bailey_collar_art === "custom" && !customCollarSeeded()) {
		seedCustomCollar();
		redrawCollar();
	}
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
		el.style.cursor = "pointer";
		el.title = "Mod credits";
		el.textContent = "Reiyu's Bailey Expansion v" + BAILEY_EXPANSION_VERSION + " for X-Change — Active";
		el.addEventListener("click", function () {
			Wikifier.wikifyEval('<<popup "Bailey Expansion Credits Display" "Reiyu\'s Bailey Expansion">>');
		});
		passage.insertBefore(el, passage.firstChild);
	}

	if (!setup.loveInterestNpc.includes("Bailey")) {
		setup.loveInterestNpc.unshift("Bailey");
		baileyLog("Bailey added to start of loveInterestNpc list");
	}
});
