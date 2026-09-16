// Too much console log noises, I gate it behind `$debug is 1` - D.N.A.

function baileyRevealed() {
	return V.syndromebailey === true;
}

window.baileyMaxRent = function () {
	const modifier = (V.settings && V.settings.rentCostModifier) || 1;
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
	if (!V.bailey_monogamous) return 0;
	if (typeof V.bailey_weekend_closed !== "number" && typeof V.bailey_weekend_lastvisit === "number") {
		V.bailey_weekend_closed = window.baileyWeekendClose(V.bailey_weekend_lastvisit);
		delete V.bailey_weekend_lastvisit;
	}
	if (typeof V.bailey_weekend_closed !== "number") return 0;
	return Math.max(0, (baileyDateToDay(Time.getPreviousWeekdayDate(1)) - V.bailey_weekend_closed) / 7);
};

window.baileyStraying = function () {
	return window.baileyWeeksMissed() >= 2;
};

/* Scenes that each grant a Stockholm point, keyed as they are stored on $stockholm_points. */
const BAILEY_STOCKHOLM_SCENES = ["temple", "kylar", "cafe", "whitney", "gwylan", "kick", "avery", "halloween", "eden"];

/* Minimum $syndromebaileybuild justified by scenes the player has seen.
   Used on load and by the cheat menu to prevent invalid lower values. */
window.baileyStockholmFloor = function () {
	const pts = V.stockholm_points;
	if (!pts || typeof pts !== "object" || Array.isArray(pts)) return 0;
	let floor = pts.offer_defeat === true ? 3 : pts.offer === true ? 1 : 0;
	BAILEY_STOCKHOLM_SCENES.forEach(function (k) {
		if (pts[k] === true) floor += 1;
	});
	return floor;
};

/* Highest floor a save can reach: offer_defeat plus every scene. The cheat stepper caps here. */
window.baileyStockholmFloorMax = function () {
	return 3 + BAILEY_STOCKHOLM_SCENES.length;
};

/* Vanilla has <<gstockholm>>. This one hides the name behind ??? until Bailey is revealed. */
Macro.add("gbaileystock", {
	handler() {
		if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
		const label = baileyRevealed() ? "Stockholm Syndrome" : "???";
		this.output.append(statDisplay.statChange(label, 1, "bailey-stockholm"));
	},
});

/* Brat Tax feedback, e.g. "+ 50 Brat Tax". */
Macro.add("gbrattax", {
	handler() {
		if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
		if (typeof window.formatMoney !== "function") return;
		const pennies = Number(this.args[0]);
		if (!pennies || pennies < 0) return;
		this.output.append(statDisplay.statChange(window.formatMoney(pennies) + " Brat Tax", 1, "pink"));
	},
});

/* Halloween gala mood */
Macro.add("gbaileyMood", {
	handler() {
		if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
		const amount = Number(this.args[0]);
		if (!amount) return;
		this.output.append(statDisplay.statChange("Mood", amount, amount > 0 ? "green" : "red"));
	},
});

const BAILEY_EXPANSION_VERSION = "0.6.1.1";

$(document).one(":storyready", function () {
	function migrateLegacyStockholm() {
		if (V.stockholm_active !== undefined) {
			const raw = V.stockholm_active;
			V.syndromebailey = !!raw && raw !== "0" && raw !== "false";
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Migrated $stockholm_active (" + raw + ") -> $syndromebailey (" + V.syndromebailey + ")");
			}
			delete V.stockholm_active;
		}

		if (V.stockholm_bailey !== undefined) {
			const build = Number(V.stockholm_bailey);
			V.syndromebaileybuild = Number.isFinite(build) ? Math.max(0, Math.round(build)) : 0;
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Migrated $stockholm_bailey (" + V.stockholm_bailey + ") -> $syndromebaileybuild (" + V.syndromebaileybuild + ")");
			}
			delete V.stockholm_bailey;
		}
	}

	function syncBaileyDom() {
		if (!V.stockholm_points || typeof V.stockholm_points !== "object" || Array.isArray(V.stockholm_points)) V.stockholm_points = {};
		if (typeof V.bailey_title !== "string") V.bailey_title = "Bailey";
		V.bailey_title = V.bailey_title.replace(/[<>]/g, "").trim().slice(0, 15) || "Bailey";
		if (typeof V.bailey_title_unlocked !== "boolean") V.bailey_title_unlocked = false;
		migrateLegacyStockholm();
		if (!C.npc.Bailey) return;
		if (C.npc.Bailey.sextoys == null) C.npc.Bailey.sextoys = {};

		["dom", "love"].forEach(function (stat) {
			const old = V["bailey_" + stat];
			if (old === undefined) return;
			if (typeof old === "number" && !Number.isNaN(old) && C.npc.Bailey[stat] !== old) {
				if (V.debug === 1) {
					console.log("[BaileyExpansion] Migrated $bailey_" + stat + " " + old + " -> C.npc.Bailey." + stat);
				}
				C.npc.Bailey[stat] = old;
			}
			delete V["bailey_" + stat];
		});

		/* A save made before RBE was added still has the baseNNPC default of 0, which reads as
        low dom forever. Correct it once only, so a player who lowers him to 0 later keeps it. */
		/* Old saves kept these as plain story variables with no ceiling, so they arrive past
        100. relationshipclamp owns the steady state (it runs at the end of every npcincr
        and again daily), but it has not run yet at load, so bring them in range once here. */
		["dom", "love"].forEach(function (stat) {
			if (typeof C.npc.Bailey[stat] === "number" && C.npc.Bailey[stat] > 100) {
				if (V.debug === 1) {
					console.log("[BaileyExpansion] Clamped C.npc.Bailey." + stat + " " + C.npc.Bailey[stat] + " -> 100");
				}
				C.npc.Bailey[stat] = 100;
			}
		});

		if (V.bailey_rbe_init !== true) {
			if (C.npc.Bailey.dom === 0) {
				C.npc.Bailey.dom = baileyRevealed() ? 100 : 50;
				if (V.debug === 1) {
					console.log("[BaileyExpansion] Initialized C.npc.Bailey.dom -> " + C.npc.Bailey.dom);
				}
			}
			/* initNNPCClothes only rebuilds the pool when outfits is missing, so an existing save
            keeps the vanilla list and never picks up Bailey's. */
			if (Array.isArray(C.npc.Bailey.outfits) && !C.npc.Bailey.outfits.includes("business")) {
				C.npc.Bailey.outfits.pushUnique("business", "maleFormal1", "femaleFormal1", "townBlazer", "townCoat");
				if (V.debug === 1) {
					console.log("[BaileyExpansion] Added Bailey outfit pool to an existing save");
				}
			}
			V.bailey_rbe_init = true;
		}

		/* NaN fails gte and lt both, so dom gates stop firing silently. */
		if (typeof C.npc.Bailey.dom !== "number" || Number.isNaN(C.npc.Bailey.dom)) {
			C.npc.Bailey.dom = baileyRevealed() ? 100 : 50;
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Healed C.npc.Bailey.dom -> " + C.npc.Bailey.dom);
			}
		}
		if (typeof C.npc.Bailey.love !== "number" || Number.isNaN(C.npc.Bailey.love)) {
			C.npc.Bailey.love = 0;
		}
		if (typeof V.syndromebaileybuild !== "number" || Number.isNaN(V.syndromebaileybuild)) V.syndromebaileybuild = 0;
		const floor = window.baileyStockholmFloor();
		if (V.syndromebaileybuild < floor) {
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Raised $syndromebaileybuild " + V.syndromebaileybuild + " -> " + floor);
			}
			V.syndromebaileybuild = floor;
		}

		enforceBaileyState();
	}

	function enforceBaileyState() {
		if (!C.npc.Bailey) return;

		if (baileyRevealed() && typeof C.npc.Bailey.dom === "number" && C.npc.Bailey.dom !== 100) {
			C.npc.Bailey.dom = 100;
		}

		/* Keep monogamous Bailey at 0 so he skips condoms. The game won't re-zero it once it drifts. */
		if (V.bailey_monogamous === true && C.npc.Bailey.pregnancyAvoidance !== 0) {
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Monogamous Bailey pregnancyAvoidance " + C.npc.Bailey.pregnancyAvoidance + " -> 0");
			}
			C.npc.Bailey.pregnancyAvoidance = 0;
		}
	}
	/* syncBaileyDom handles load-time migrations and one-off repairs; enforceBaileyState cheaply maintains state during play */
	function runSyncBaileyDom() {
		try {
			syncBaileyDom();
		} catch (e) {
			if (V.debug === 1) {
				console.error("[BaileyExpansion] syncBaileyDom", e);
			}
		}
	}
	runSyncBaileyDom();
	$(document).on(":onloadsave", runSyncBaileyDom);
	$(document).on(":passageend", enforceBaileyState);

	/* One :passagestart handler for all Bailey passage checks */
	$(document).on(":passagestart", function () {
		/* Stood-up check: date scheduled but not attended by midnight -> missed. */
		(function () {
			if (typeof Time === "undefined" || typeof Time.hour === "undefined") return;
			/* Mark missed only after midnight passes, or on the next night passage. */
			if (V.bailey_date_sched_day !== undefined && Time.days <= V.bailey_date_sched_day) return;
			if (V.bailey_date_scheduled === 1) {
				if (V.bailey_date_attended !== 1) {
					V.bailey_date_missed = 1;
					V.bailey_brat = V.bailey_brat || { points: 0, reasons: [] };
					V.bailey_brat.points = Math.clamp(V.bailey_brat.points + 2, 0, 20);
					if (!V.bailey_brat.reasons.includes("stoodup")) V.bailey_brat.reasons.push("stoodup");
				}
				V.bailey_date_scheduled = 0;
				V.bailey_date_attended = 0;
			}
			if (V.bailey_date_allnight_scheduled === 1) {
				if (V.bailey_date_attended !== 1) {
					V.bailey_date_missed = 1;
					V.bailey_brat = V.bailey_brat || { points: 0, reasons: [] };
					V.bailey_brat.points = Math.clamp(V.bailey_brat.points + 2, 0, 20);
					if (!V.bailey_brat.reasons.includes("stoodup")) V.bailey_brat.reasons.push("stoodup");
				}
				V.bailey_date_allnight_scheduled = 0;
				V.bailey_date_attended = 0;
			}
		})();

		/* +1 lust/day once Stockholm's active, +2 while monogamous. */
		(function () {
			if (typeof Time === "undefined" || typeof Time.days === "undefined") return;
			if (V.bailey_lust_lastday === undefined) {
				V.bailey_lust_lastday = Time.days;
				return;
			}
			const delta = Time.days - V.bailey_lust_lastday;
			if (delta <= 0) {
				if (delta < 0) {
					V.bailey_lust_lastday = Time.days;
				}
				return;
			}
			V.bailey_lust_lastday = Time.days;
			if (V.syndromebailey === true && C.npc.Bailey && typeof C.npc.Bailey.lust === "number") {
				const _perDay = V.bailey_monogamous ? 2 : 1;
				C.npc.Bailey.lust = Math.max(0, Math.min(100, C.npc.Bailey.lust + delta * _perDay));
			}
		})();

		/* Christmas gift reset. */
		(function () {
			if (V.christmas) return;
			if (V.christmas_gift_bailey === undefined && V.christmas_gift_bailey_wrapped === undefined && V.christmas_gift_bailey_given === undefined) return;
			delete V.christmas_gift_bailey;
			delete V.christmas_gift_bailey_wrapped;
			delete V.christmas_gift_bailey_given;
		})();

		/* Keeps the Christmas Fishing Lure Gift permanent. */
		(function () {
			if (V.bailey_office_gift === "lure" && !V.bailey_lure_received) {
				V.bailey_lure_received = true;
			}
		})();
	});

	/* Glowing "mod active" stamp on the Start screen.
	Injected here in :storyready because Start's :passageend fires before a handler could register. */
	const indicatorContainer = document.getElementById("passage-content") || document.querySelector(".passage");
	if (indicatorContainer && !indicatorContainer.querySelector("#bailey-mod-indicator")) {
		const stamp = document.createElement("div");
		stamp.id = "bailey-mod-indicator";
		stamp.className = "bailey-stockholm";
		stamp.textContent = "Reiyu's Bailey Expansion v" + BAILEY_EXPANSION_VERSION + " for X-Change — Active";
		indicatorContainer.insertBefore(stamp, indicatorContainer.firstChild);
	}

	if (typeof setup !== "undefined" && setup.loveInterestNpc) {
		if (!setup.loveInterestNpc.includes("Bailey")) {
			setup.loveInterestNpc.unshift("Bailey");
			if (V.debug === 1) {
				console.log("[BaileyExpansion] Bailey added to start of loveInterestNpc list");
			}
		}
	}

	if (V.debug === 1) {
		console.log("[BaileyExpansion] title system + love interest registered");
	}
});
