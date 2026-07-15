$(document).one(":storyready", function () {
	function baileyRevealed() {
		return V.stockholm_active === true;
	}

	/* One-time compatibility repair for persistent RBE values that are read as objects or text. */
	if (!V.stockholm_points || typeof V.stockholm_points !== "object" || Array.isArray(V.stockholm_points)) V.stockholm_points = {};
	if (typeof V.bailey_title !== "string") V.bailey_title = "Bailey";
	V.bailey_title = V.bailey_title.replace(/[<>]/g, "").trim().slice(0, 15) || "Bailey";
	if (typeof V.bailey_title_unlocked !== "boolean") V.bailey_title_unlocked = false;

	/* Keep Bailey's dominance in sync. $bailey_dom is the source of truth; we mirror it
       onto C.npc.Bailey.dom every passage so the social panel matches, flooring dom at 100
       while Stockholm is active. Also self-heals saves where the two values drifted. */
	function syncBaileyDom() {
		if (!C.npc.Bailey) return;

		/* Heal NaN dom/love. `<<set $bailey_dom += 1>>` on an undefined var yields NaN, which
           silently fails every comparison and breaks dom-gated content (and would clobber the
           NPC stat below). Prefer the still-valid NPC value, else fall back: dom 100 if Stockholm
           else 50; love 25 (kept under the 30 the Title Organic scene needs). NaN only. */
		if (Number.isNaN(V.bailey_dom)) {
			const _npcDom = C.npc.Bailey.dom;
			const _hasNpcDom = typeof _npcDom === "number" && !Number.isNaN(_npcDom);
			const _healDom = _hasNpcDom ? _npcDom : baileyRevealed() ? 100 : 50;
			console.log("[BaileyExpansion] Healed $bailey_dom NaN \u2192 " + _healDom);
			V.bailey_dom = _healDom;
		}
		if (Number.isNaN(V.bailey_love)) {
			const _npcLove = C.npc.Bailey.love;
			const _hasNpcLove = typeof _npcLove === "number" && !Number.isNaN(_npcLove);
			const _healLove = _hasNpcLove ? _npcLove : 25;
			console.log("[BaileyExpansion] Healed $bailey_love NaN \u2192 " + _healLove);
			V.bailey_love = _healLove;
		}

		/* Mod installed mid-playthrough: a save that never ran "Orphanage Intro" leaves
           $bailey_dom undefined, so dom checks fail. Seed it to the baseline (100 if Stockholm
           else 50) and start love at 0, exactly as a fresh install would. */
		if (V.bailey_dom === undefined) {
			V.bailey_dom = baileyRevealed() ? 100 : 50;
			console.log("[BaileyExpansion] Initialized missing $bailey_dom -> " + V.bailey_dom);
		}
		if (V.bailey_love === undefined) V.bailey_love = 0;

		/* Same NaN trap as $bailey_dom above, but for $stockholm_bailey. Rebuild it
           from the $stockholm_points ledger (read-only) so earned points survive. */
		if (typeof V.stockholm_bailey !== "number" || Number.isNaN(V.stockholm_bailey)) {
			const _pts = V.stockholm_points || {};
			let _healStock = 0;
			if (_pts.offer_defeat === true) _healStock += 3;
			else if (_pts.offer === true) _healStock += 1;
			["temple", "kylar", "cafe", "whitney", "gwylan", "kick"].forEach(function (k) {
				if (_pts[k] === true) _healStock += 1;
			});
			console.log("[BaileyExpansion] Healed $stockholm_bailey (" + V.stockholm_bailey + ") \u2192 " + _healStock);
			V.stockholm_bailey = _healStock;
		}

		mirrorBaileyDom();
	}

	/* Lightweight mirror of $bailey_dom/$bailey_love onto the NPC card. Split out so :passageend
	   can reflect mid-passage changes in the sidebar without repeating syncBaileyDom's heavier
	   NaN/undefined healing, which only needs to run once per passage (on :passagestart). */
	function mirrorBaileyDom() {
		if (!C.npc.Bailey) return;
		if (typeof V.bailey_dom === "number" && !Number.isNaN(V.bailey_dom)) {
			if (baileyRevealed() && V.bailey_dom < 100) V.bailey_dom = 100;
			if (C.npc.Bailey.dom !== V.bailey_dom) C.npc.Bailey.dom = V.bailey_dom;
		}
		/* Some Bailey scenes bump $bailey_love but forget <<npcincr Bailey love>>, so without
		   this the Respect bar freezes while the real value keeps climbing. */
		if (typeof V.bailey_love === "number" && !Number.isNaN(V.bailey_love) && C.npc.Bailey.love !== V.bailey_love) {
			C.npc.Bailey.love = V.bailey_love;
		}
	}
	/* One start hook handles all lightweight passage bookkeeping. Keeping these together avoids
	   stacking several document listeners while preserving their original execution order. */
	$(document).on(":passagestart", function () {
		syncBaileyDom();

		/* If a scheduled date wasn't attended by midnight, mark it missed.
		   Covers both the Medium and All Night date tiers. */
		if (typeof Time !== "undefined" && typeof Time.hour !== "undefined" && Time.hour >= 0 && Time.hour < 7) {
			/* Only count a no-show once a real midnight has passed since booking, so scheduling
			   during the 0-6 night window doesn't instantly mark the date missed. */
			if (V.bailey_date_sched_day === undefined || Time.days > V.bailey_date_sched_day) {
				if (V.bailey_date_scheduled === 1) {
					if (V.bailey_date_attended !== 1) V.bailey_date_missed = 1;
					V.bailey_date_scheduled = 0;
					V.bailey_date_attended = 0;
				}
				if (V.bailey_date_allnight_scheduled === 1) {
					if (V.bailey_date_attended !== 1) V.bailey_date_missed = 1;
					V.bailey_date_allnight_scheduled = 0;
					V.bailey_date_attended = 0;
				}
			}
		}

		/* Once Stockholm is active, Bailey gains +1 lust per elapsed in-game day, clamped 0-100. */
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
						C.npc.Bailey.lust = Math.max(0, Math.min(100, C.npc.Bailey.lust + delta));
					}
				}
			}
		}

		/* Clear Bailey's per-year Christmas gift state once the season ends. */
		if (
			!V.christmas &&
			(V.christmas_gift_bailey !== undefined || V.christmas_gift_bailey_wrapped !== undefined || V.christmas_gift_bailey_given !== undefined)
		) {
			delete V.christmas_gift_bailey;
			delete V.christmas_gift_bailey_wrapped;
			delete V.christmas_gift_bailey_given;
		}

		/* Back-fill permanent lure ownership after the office display changes. */
		if (V.bailey_office_gift === "lure" && !V.bailey_lure_received) V.bailey_lure_received = true;
	});

	/* Bailey-only Stockholm indicator; does not override the global <<gstockholm>>. */
	Macro.add("gbaileystock", {
		handler() {
			if (typeof statDisplay === "undefined" || typeof statDisplay.statChange !== "function") return;
			const label = baileyRevealed() ? "Stockholm Syndrome" : "???";
			this.output.append(statDisplay.statChange(label, 1, "bailey-stockholm"));
		},
	});

	/* === Bailey Title System: "It's Bailey." -> "It's Daddy." ===
       Swaps the displayed name once $bailey_title_unlocked is set and the title isn't "Bailey".
       Stockholm deactivation resets the title, so the swap stops on its own. */
	$(document).on(":passageend", function () {
		mirrorBaileyDom();
		if (!V.stockholm_active) return;
		if (!V.bailey_title_unlocked || !V.bailey_title || V.bailey_title === "Bailey") return;

		const title = V.bailey_title;
		const passage = document.getElementById("passage-content") || document.querySelector(".passage");
		if (!passage) return;

		/* Find every .bailey-red element reading exactly "It's Bailey." and swap in the title. */
		const spans = passage.querySelectorAll(".bailey-red");
		for (let i = 0; i < spans.length; i++) {
			const span = spans[i];
			if (span.textContent.trim() === "It's Bailey.") {
				span.textContent = "It's " + title + ".";
			}
		}
	});

	/* === Mod Active Indicator (start screen) ===
       Drops a glowing line on the Start passage so players can confirm the mod loaded. Done
       inside :storyready because Start's :passageend fires before it would otherwise run. */
	const _indicatorContainer = document.getElementById("passage-content") || document.querySelector(".passage");
	if (_indicatorContainer && !_indicatorContainer.querySelector("#bailey-mod-indicator")) {
		const el = document.createElement("div");
		el.id = "bailey-mod-indicator";
		el.className = "bailey-stockholm";
		el.style.textAlign = "center";
		el.style.marginTop = "1em";
		el.style.marginBottom = "1em";
		el.textContent = "Reiyu's Bailey Expansion v0.4.13 for X-Change \u2014 Active";
		const firstChild = _indicatorContainer.firstChild;
		if (firstChild) {
			_indicatorContainer.insertBefore(el, firstChild);
		} else {
			_indicatorContainer.appendChild(el);
		}
	}

	/* === Bailey's Collar ===
       The collar item is registered with the native neckwear definitions. Keeping it out of
       this runtime hook ensures it exists before saves restore worn clothing. */

	/* === Bailey as Love Interest ===
       Adds Bailey to the love-interest dropdown, selectable only once Stockholm is active. */
	if (typeof setup !== "undefined" && setup.loveInterestNpc) {
		if (!setup.loveInterestNpc.includes("Bailey")) {
			/* unshift, not push: put Bailey at the front of the love-interest list so he leads the
               Attitudes picker instead of sitting below each fork's own LIs. */
			setup.loveInterestNpc.unshift("Bailey");
			console.log("[BaileyExpansion] Bailey added to start of loveInterestNpc list");
		}
	}

	/* Teach isPossibleLoveInterest about Bailey (valid only once Stockholm is active). */
	const _origIsPossibleLoveInterest = window.isPossibleLoveInterest;
	window.isPossibleLoveInterest = function (name) {
		if (name === "Bailey") {
			return V.stockholm_active === true;
		}
		return _origIsPossibleLoveInterest(name);
	};

	/* Bailey's virginities show pink (love interest), not green (just consensual).
       Newer DOL (vanilla / New World / X-Change) colors the PC's own virginity stats
       through isPossibleLoveInterestVirginity(), whose vanilla body calls a CLOSURE-LOCAL
       isPossibleLoveInterest -- so it never sees the window patch above, and Bailey fell
       through to the green branch. Wrap it too: Bailey counts once Stockholm is active,
       combined "X and Y" takers route through the patched window fn, everything else keeps
       vanilla behaviour. Guarded by typeof, so it's a no-op on DOLP/transmod, which call
       isPossibleLoveInterest directly and were already fine. */
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

	/* === Bailey as Sex-Shop Gift Recipient ===
       Vanilla's gift dropdown is built from a hardcoded name list, so registering Bailey as a
       love interest doesn't reach it. We wrap the function: run vanilla, then inject a Bailey
       option when he's unlocked. If he'd be the only recipient (vanilla returns ""), rebuild
       the dropdown around just him -- re-sync that markup if upstream changes it. */
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
				/* Vanilla built the dropdown; slot Bailey in as the first option. */
				return html.replace('id="recipientList">', 'id="recipientList">' + baileyOption);
			}
			/* html === "": either the money gate failed or Bailey is the only recipient. Re-check
               affordability (item cost + £15 wrap fee, money is stored x100); if affordable,
               Bailey is the sole recipient, so rebuild vanilla's wrapper around him. */
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

	/* === Mod Feats ===
       Register with setup.feats so earnFeat can show the popup and record them correctly. */
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

	console.log("[BaileyExpansion] stat display overrides + title system + love interest registered");
});
