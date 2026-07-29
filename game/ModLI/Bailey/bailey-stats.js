/* globals baileyWeeksMissed, formatMoney */
function baileyRevealed() {
	return V.stockholm_active === true;
}

window.baileyMaxRent = function () {
	const modifier = (V.settings && V.settings.rentCostModifier) || 1;
	return Math.floor(200000 * modifier);
};

/*   "leaving" 05:30–06:30  heading out
"away"    06:30–19:00  at the orphanage
"asleep"  02:00–05:30  there but won't come to the door
"home"    19:00–02:00  home and reactive */
window.baileyFlatState = function () {
	const t = Time.hour * 60 + Time.minute; // minutes since midnight
	if (t >= 330 && t < 390) return "leaving"; // 05:30–06:30
	if (t >= 390 && t < 1140) return "away"; // 06:30–19:00
	if (t >= 120 && t < 330) return "asleep"; // 02:00–05:30
	return "home"; // 19:00–02:00 (wraps midnight)
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
	}
	if (typeof V.bailey_weekend_closed !== "number") return 0;
	return Math.max(0, (baileyDateToDay(Time.getPreviousWeekdayDate(1)) - V.bailey_weekend_closed) / 7);
};
window.baileyStraying = function () {
	return baileyWeeksMissed() >= 2;
};

/* Bailey-specific Stockholm indicator */
Macro.add("gbaileystock", {
	handler() {
		if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
		const label = baileyRevealed() ? "Stockholm Syndrome" : "???";
		this.output.append(statDisplay.statChange(label, 1, "bailey-stockholm"));
	},
});

/* Brat Tax feedback, e.g. "+ £50 Brat Tax". */
Macro.add("gbrattax", {
	handler() {
		if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
		if (typeof formatMoney !== "function") return;
		const pennies = Number(this.args[0]);
		if (!pennies || pennies < 0) return;
		this.output.append(statDisplay.statChange(formatMoney(pennies) + " Brat Tax", 1, "pink"));
	},
});

$(document).one(":storyready", function () {
	/* One-time compatibility repair for persistent RBE values that are read as objects or text. */
	if (!V.stockholm_points || typeof V.stockholm_points !== "object" || Array.isArray(V.stockholm_points)) V.stockholm_points = {};
	if (typeof V.bailey_title !== "string") V.bailey_title = "Bailey";
	V.bailey_title = V.bailey_title.replace(/[<>]/g, "").trim().slice(0, 15) || "Bailey";
	if (typeof V.bailey_title_unlocked !== "boolean") V.bailey_title_unlocked = false;

	/* Bailey carries two dom values that must agree: $bailey_dom and C.npc.Bailey.dom.
	This runs every passage and mirrors $bailey_dom onto the NPC stat.
	NaN/undefined self-heals below, and the Stockholm floor of 100. */
	function syncBaileyDom() {
		if (!C.npc.Bailey) return;

		/* NaN fails gte and lt both, so dom gates stop firing silently. */
		if (Number.isNaN(V.bailey_dom)) {
			const _npcDom = C.npc.Bailey.dom;
			const _hasNpcDom = typeof _npcDom === "number" && !Number.isNaN(_npcDom);
			const _healDom = _hasNpcDom ? _npcDom : baileyRevealed() ? 100 : 50;
			if (V.debug === 1) console.log("[BaileyExpansion] Healed $bailey_dom NaN \u2192 " + _healDom);
			V.bailey_dom = _healDom;
		}
		if (Number.isNaN(V.bailey_love)) {
			const _npcLove = C.npc.Bailey.love;
			const _hasNpcLove = typeof _npcLove === "number" && !Number.isNaN(_npcLove);
			const _healLove = _hasNpcLove ? _npcLove : 25;
			if (V.debug === 1) console.log("[BaileyExpansion] Healed $bailey_love NaN \u2192 " + _healLove);
			V.bailey_love = _healLove;
		}

		/* If the mod is added mid-save: Orphanage Intro never ran,
		so $bailey_dom is undefined and dom checks fail silently. */
		if (V.bailey_dom === undefined) {
			V.bailey_dom = baileyRevealed() ? 100 : 50;
			if (V.debug === 1) console.log("[BaileyExpansion] Initialized missing $bailey_dom -> " + V.bailey_dom);
		}
		if (V.bailey_love === undefined) V.bailey_love = 0;

		/* Rebuild $stockholm_bailey from $stockholm_points */
		if (typeof V.stockholm_bailey !== "number" || Number.isNaN(V.stockholm_bailey)) {
			const _pts = V.stockholm_points || {};
			let _healStock = 0;
			if (_pts.offer_defeat === true) _healStock += 3;
			else if (_pts.offer === true) _healStock += 1;
			["temple", "kylar", "cafe", "whitney", "gwylan", "kick"].forEach(function (k) {
				if (_pts[k] === true) _healStock += 1;
			});
			if (V.debug === 1) console.log("[BaileyExpansion] Healed $stockholm_bailey (" + V.stockholm_bailey + ") \u2192 " + _healStock);
			V.stockholm_bailey = _healStock;
		}

		mirrorBaileyDom();
	}

	/* Lightweight mirror for :passageend, so mid-passage changes show without redoing the healing. */
	function mirrorBaileyDom() {
		if (!C.npc.Bailey) return;
		if (typeof V.bailey_dom === "number" && !Number.isNaN(V.bailey_dom)) {
			if (baileyRevealed() && V.bailey_dom < 100) V.bailey_dom = 100;
			if (C.npc.Bailey.dom !== V.bailey_dom) C.npc.Bailey.dom = V.bailey_dom;
		}
		if (typeof V.bailey_love === "number" && !Number.isNaN(V.bailey_love) && C.npc.Bailey.love !== V.bailey_love) {
			C.npc.Bailey.love = V.bailey_love;
		}

		/* Keep monogamous Bailey at 0 so he skips condoms; the game won't re-zero it once it drifts. */
		if (V.bailey_monogamous === true && C.npc.Bailey.pregnancyAvoidance !== 0) {
			if (V.debug === 1) console.log("[BaileyExpansion] Monogamous Bailey pregnancyAvoidance " + C.npc.Bailey.pregnancyAvoidance + " -> 0");
			C.npc.Bailey.pregnancyAvoidance = 0;
		}
	}
	/* Stood-up check: date scheduled but not attended by midnight -> missed. Medium + All Night. */
	$(document).on(":passagestart", function () {
		syncBaileyDom();

		if (typeof Time !== "undefined" && typeof Time.hour !== "undefined" && Time.hour >= 0 && Time.hour < 7) {
			/* Only after a midnight has actually passed, or booking at night marks it missed
			   on the very next passage. */
			if (V.bailey_date_sched_day === undefined || Time.days > V.bailey_date_sched_day) {
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
			}
		}

		/* +1 lust/day once Stockholm's active, +2 while monogamous. */
		if (typeof Time !== "undefined" && typeof Time.days !== "undefined") {
			if (V.bailey_lust_lastday === undefined) {
				V.bailey_lust_lastday = Time.days;
			} else {
				const delta = Time.days - V.bailey_lust_lastday;
				if (delta < 0) {
					V.bailey_lust_lastday = Time.days;
				} else if (delta > 0) {
					V.bailey_lust_lastday = Time.days;
					if (V.stockholm_active === true && C.npc.Bailey && typeof C.npc.Bailey.lust === "number") {
						const _perDay = V.bailey_monogamous ? 2 : 1;
						C.npc.Bailey.lust = Math.max(0, Math.min(100, C.npc.Bailey.lust + delta * _perDay));
					}
				}
			}
		}

		/* Christmas gift reset. Lotus + office display stay permanent — leave them. */
		if (
			!V.christmas &&
			(V.christmas_gift_bailey !== undefined || V.christmas_gift_bailey_wrapped !== undefined || V.christmas_gift_bailey_given !== undefined)
		) {
			delete V.christmas_gift_bailey;
			delete V.christmas_gift_bailey_wrapped;
			delete V.christmas_gift_bailey_given;
		}

		if (V.bailey_office_gift === "lure" && !V.bailey_lure_received) V.bailey_lure_received = true;
	});

	/* Title swap: "It's Bailey." -> "It's Daddy." (or whatever it's set to).
	Only while Stockholm's active, the title's unlocked, and it's not still "Bailey".
	Deactivating Stockholm resets it back to "Bailey". */
	$(document).on(":passageend", function () {
		mirrorBaileyDom();
		if (!V.stockholm_active) return;
		if (!V.bailey_title_unlocked || !V.bailey_title || V.bailey_title === "Bailey") return;

		const title = V.bailey_title;
		const passage = document.getElementById("passage-content") || document.querySelector(".passage");
		if (!passage) return;

		/* Find all elements with bailey-red class that contain "It's Bailey." */
		const spans = passage.querySelectorAll(".bailey-red");
		for (let i = 0; i < spans.length; i++) {
			const span = spans[i];
			if (span.textContent.trim() === "It's Bailey.") {
				span.textContent = "It's " + title + ".";
			}
		}
	});

	/* Glowing "mod active" line on the Start screen. Injected here in :storyready because
	Start's :passageend fires before a handler would register. */
	const _indicatorContainer = document.getElementById("passage-content") || document.querySelector(".passage");
	if (_indicatorContainer && !_indicatorContainer.querySelector("#bailey-mod-indicator")) {
		const el = document.createElement("div");
		el.id = "bailey-mod-indicator";
		el.className = "bailey-stockholm";
		el.style.textAlign = "center";
		el.style.marginTop = "1em";
		el.style.marginBottom = "1em";
		el.textContent = "Reiyu's Bailey Expansion v0.5.4 for X-Change \u2014 Active";
		const firstChild = _indicatorContainer.firstChild;
		if (firstChild) {
			_indicatorContainer.insertBefore(el, firstChild);
		} else {
			_indicatorContainer.appendChild(el);
		}
	}

	/* Add Bailey to the love-interest roster (selectable only while Stockholm's active). */
	if (typeof setup !== "undefined" && setup.loveInterestNpc) {
		if (!setup.loveInterestNpc.includes("Bailey")) {
			setup.loveInterestNpc.unshift("Bailey");
			if (V.debug === 1) console.log("[BaileyExpansion] Bailey added to start of loveInterestNpc list");
		}
	}

	/* Sidebar reminders for the times Bailey is waiting. */
	if (typeof setup !== "undefined" && Array.isArray(setup.events)) {
		if (
			!setup.events.some(function (ev) {
				return ev.name === "bailey date";
			})
		) {
			setup.events.push({
				name: "bailey date",
				condition() {
					return (V.bailey_date_scheduled === 1 || V.bailey_date_allnight_scheduled === 1) && V.renttime > 0 && V.bailey_date_attended !== 1;
				},
				starthour: 19,
				endhour: 19,
				priority: 4,
				text: "You have an arrangement with Bailey at the Orphanage at <<ampm 19 00>>.",
				failuretext: "You didn't show up for your arrangement with Bailey.",
			});
		}
		if (
			!setup.events.some(function (ev) {
				return ev.name === "bailey halloween gala";
			})
		) {
			setup.events.push({
				name: "bailey halloween gala",
				condition() {
					return (
						V.bailey_halloween_scheduled === Time.year &&
						Time.monthDay === 31 &&
						Time.monthName === "October" &&
						V.bailey_halloween_attended !== Time.year &&
						!V.possessed
					);
				},
				starthour: 18,
				endhour: 19,
				priority: 4,
				text: "You have an arrangement with Bailey at the Orphanage at <<ampm 18 30>>.",
				failuretext: "You didn't show up for your arrangement with Bailey.",
			});
		}
	}

	const _origIsPossibleLoveInterest = window.isPossibleLoveInterest;
	window.isPossibleLoveInterest = function (name) {
		if (name === "Bailey") {
			return V.stockholm_active === true;
		}
		return _origIsPossibleLoveInterest(name);
	};

	/* Make Bailey's virginities read pink (love interest), not green. */
	if (typeof window.isPossibleLoveInterestVirginity === "function") {
		const _origLoveInterestVirginity = window.isPossibleLoveInterestVirginity;
		window.isPossibleLoveInterestVirginity = function (taker) {
			if (typeof taker === "string") {
				if (taker === "Bailey") return V.stockholm_active === true;
				if (taker.includes(" and ")) {
					return taker.split(" and ").some(function (n) {
						return window.isPossibleLoveInterest(n.trim());
					});
				}
			}
			return _origLoveInterestVirginity(taker);
		};
	}

	/* Bailey as a sex-shop gift recipient. */
	if (typeof window.determineRecipient === "function") {
		const _origDetermineRecipient = window.determineRecipient;
		window.determineRecipient = function (index) {
			const html = _origDetermineRecipient(index);
			/* Only offer Bailey once he's an unlocked love interest. */
			if (typeof window.isPossibleLoveInterest !== "function" || !window.isPossibleLoveInterest("Bailey")) return html;
			if (typeof setup === "undefined" || !setup.sextoys || !setup.sextoys[index]) return html;
			if (html && html.indexOf('value="Bailey"') !== -1) return html; /* already present */
			const item = setup.sextoys[index];
			const baileyOption = '<option value="Bailey">Bailey</option>';
			if (html && html.indexOf('id="recipientList"') !== -1) {
				/* Vanilla built the dropdown - slot Bailey in as the first option. */
				return html.replace('id="recipientList">', 'id="recipientList">' + baileyOption);
			}
			const giftCost = setup.inflation ? setup.inflation.price(item.cost + 15 * 100) : item.cost + 15 * 100;
			if (V.money < giftCost) return html;
			return (
				'<br id="giftBr"><a id="ssmGiftButton" onclick="window.sexShopOnGiftClick(' +
				item.index +
				')" class="ssm_gift_button">\nMake a gift for :  </a><select name="recipient" id="recipientList">' +
				baileyOption +
				'</select>\n<div id="spanGift">(<span class="gold">£' +
				(giftCost / 100).toFixed(2) +
				"</span>)</div>"
			);
		};
	}

	/* Register mod feats with setup.feats so earnFeat can show the popup and record them. */
	if (typeof setup !== "undefined" && setup.feats) {
		if (!setup.feats["Caring for the Caretaker"]) {
			setup.feats["Caring for the Caretaker"] = {
				title: "Caring for the Caretaker",
				desc: "You brought Bailey a meal.",
				difficulty: 2,
				series: "",
				filter: ["All", "Social"],
			};
		}
	}

	if (V.debug === 1) console.log("[BaileyExpansion] stat display overrides + title system + love interest registered");
});
