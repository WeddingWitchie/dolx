/* Loft cooking minigame: external JS. Native $foodstuff ready-food stock support.
 * Requires SugarCube globals: setup, State, Engine.
 * Do not reassign window.setup. In some DoL/SugarCube builds the global
 * setup property is read-only; only attach functions to the existing object.
 */
(function () {
	"use strict";

	var scSetup = window.setup;
	if (!scSetup && typeof setup !== "undefined") {
		scSetup = setup;
	}
	if (!scSetup) {
		console.error("Loft cooking minigame could not find SugarCube setup.");
		return;
	}

	var raf = window.requestAnimationFrame || function (fn) { return window.setTimeout(fn, 16); };
	var caf = window.cancelAnimationFrame || window.clearTimeout;
	var activeMeters = Object.create(null);

	function clamp(value, min, max) {
		value = Number(value);
		if (!Number.isFinite(value)) value = min;
		return Math.max(min, Math.min(max, value));
	}

	function randomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function closestBurnRoot(el) {
		if (!el) return null;
		if (el.closest) return el.closest(".loftBurnWrap");
		while (el && (!el.classList || !el.classList.contains("loftBurnWrap"))) {
			el = el.parentNode;
		}
		return el || null;
	}

	function getId(root) {
		if (!root) return "";
		if (!root.id) {
			root.id = "loftBurn-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
		}
		return root.id;
	}

	function num(root, attr, fallback) {
		var value = Number(root.getAttribute(attr));
		return Number.isFinite(value) ? value : fallback;
	}

	function ensureDuration(root) {
		var duration = Number(root.getAttribute("data-duration"));
		if (!Number.isFinite(duration) || duration <= 0) {
			duration = randomInt(1500, 3000);
		}
		duration = clamp(duration, 1500, 3000);
		root.setAttribute("data-duration", String(duration));
		return duration;
	}

	function fillEl(root) {
		return root ? root.querySelector(".loftBurnFill") : null;
	}

	function zoneEl(root) {
		return root ? root.querySelector(".loftBurnZone") : null;
	}

	function scorchEl(root) {
		return root ? root.querySelector(".loftBurnScorch") : null;
	}

	function buttonEl(root) {
		return root ? root.querySelector(".loftBurnBtn") : null;
	}

	function setFill(root, pos) {
		var fill = fillEl(root);
		if (!fill) return;
		pos = clamp(pos, 0, 100);
		fill.style.width = "100%";
		fill.style.transform = "scaleX(" + (pos / 100).toFixed(4) + ")";
	}

	function prepareRoot(root) {
		if (!root) return;

		var width = clamp(num(root, "data-width", 22), 14, 30);
		var minStart = clamp(num(root, "data-min-start", 18), 8, 78);
		var maxEnd = clamp(num(root, "data-max-end", 88), minStart + width + 2, 96);
		var maxStart = Math.max(minStart, maxEnd - width);
		var start = num(root, "data-start", NaN);

		if (!Number.isFinite(start) || start < minStart || start > maxStart) {
			start = randomInt(minStart, maxStart);
		}

		var end = start + width;
		root.setAttribute("data-start", String(start));
		root.setAttribute("data-width", String(width));
		root.setAttribute("data-end", String(end));
		ensureDuration(root);

		var hasStarted = root.getAttribute("data-started") === "1";

		var zone = zoneEl(root);
		if (zone) {
			zone.style.left = start + "%";
			zone.style.width = width + "%";
			zone.style.display = hasStarted ? "block" : "none";
		}

		var scorch = scorchEl(root);
		if (scorch) {
			scorch.style.left = end + "%";
			scorch.style.width = Math.max(0, 100 - end) + "%";
			scorch.style.display = hasStarted ? "block" : "none";
		}

		setFill(root, num(root, "data-pos", 0));
	}

	function currentPos(root) {
		if (!root) return 100;
		var startedAt = num(root, "data-start-time", 0);
		var duration = ensureDuration(root);
		if (!startedAt || duration <= 0) return num(root, "data-pos", 0);
		return clamp(((Date.now() - startedAt) / duration) * 100, 0, 100);
	}

	function cancelMeter(root) {
		if (!root) return;
		var id = getId(root);
		if (activeMeters[id]) {
			caf(activeMeters[id]);
			delete activeMeters[id];
		}
		root.setAttribute("data-timer", "0");
	}

	function cancelAllMeters() {
		Object.keys(activeMeters).forEach(function (id) {
			caf(activeMeters[id]);
			delete activeMeters[id];
		});
	}

	function safePlay(passage) {
		if (typeof Engine !== "undefined" && Engine && typeof Engine.play === "function") {
			Engine.play(passage);
		}
	}

	function finish(root, result) {
		if (!root || root.getAttribute("data-done") === "1") return;

		var pos = currentPos(root);
		root.setAttribute("data-done", "1");
		root.classList.add("loftBurnDone");
		root.classList.remove("loftBurnReady");
		root.classList.remove("loftBurnLate");
		cancelMeter(root);

		root.setAttribute("data-pos", String(pos));
		setFill(root, pos);

		var button = buttonEl(root);
		if (button) button.disabled = true;

		if (typeof State !== "undefined" && State.variables && State.variables.loftCook) {
			State.variables.loftCook.result = result;
		}

		window.setTimeout(function () {
			safePlay(result === "perfect" ? "Loft Cook Taste" : "Loft Cook Fail");
		}, 0);
	}

	function tick(root) {
		if (!root || !document.body.contains(root)) {
			cancelMeter(root);
			return;
		}
		if (root.getAttribute("data-done") === "1" || root.getAttribute("data-started") !== "1") {
			cancelMeter(root);
			return;
		}

		if (!root.hasAttribute("data-end") || !root.hasAttribute("data-start")) {
			prepareRoot(root);
		}
		var pos = currentPos(root);
		var zoneStart = num(root, "data-start", 45);
		var zoneEnd = num(root, "data-end", zoneStart + num(root, "data-width", 22));
		root.setAttribute("data-pos", String(pos));
		setFill(root, pos);
		root.classList.toggle("loftBurnReady", pos >= zoneStart && pos <= zoneEnd);
		root.classList.toggle("loftBurnLate", pos > zoneEnd);

		var hint = root.querySelector(".loftBurnHint");
		if (hint) {
			if (pos >= zoneStart && pos <= zoneEnd) {
				hint.textContent = "Plate it now.";
			} else if (pos > zoneEnd) {
				hint.textContent = "It's starting to catch.";
			} else {
				hint.textContent = "The orphans crowd close, waiting for your nod.";
			}
		}

		if (pos >= 100) {
			finish(root, "burnt");
			return;
		}

		activeMeters[getId(root)] = raf(function () { tick(root); });
	}

	function start(root) {
		var button = buttonEl(root);
		root.classList.remove("loftBurnNeedsJs");
		root.classList.remove("loftBurnReady");
		root.classList.remove("loftBurnLate");
		root.classList.add("loftBurnStarted");
		root.setAttribute("data-started", "1");
		root.setAttribute("data-done", "0");
		ensureDuration(root);
		root.setAttribute("data-start-time", String(Date.now()));
		root.setAttribute("data-pos", "0");
		prepareRoot(root);
		setFill(root, 0);
		if (button) button.textContent = "Plate it!";
		cancelMeter(root);
		activeMeters[getId(root)] = raf(function () { tick(root); });
	}


	function storyVars(vars) {
		if (vars) return vars;
		if (typeof State !== "undefined" && State && State.variables) return State.variables;
		if (typeof V !== "undefined") return V;
		return {};
	}

	function foodDef(key) {
		return scSetup.foodstuff && scSetup.foodstuff[key] ? scSetup.foodstuff[key] : null;
	}

	/* ----- Canonical category split (single source of truth) ----------------
	 * LESSON  = raw things you cook with -> may appear as minigame pick choices.
	 * READY   = finished/edible things   -> kept aside, eaten via vignettes.
	 * Anything in either group is "stockable" (donatable to the loft).
	 */
	var LESSON_CATEGORIES = ["ingredient", "vegetable", "mushroom", "meat"];
	var READY_CATEGORIES  = ["dish", "fruit", "seafood"];

	function isLessonFood(key) {
		var def = foodDef(key);
		return !!def && LESSON_CATEGORIES.indexOf(def.category) !== -1;
	}

	function isReadyFood(key) {
		var def = foodDef(key);
		return !!def && READY_CATEGORIES.indexOf(def.category) !== -1;
	}

	function isStockableFood(key) {
		return isLessonFood(key) || isReadyFood(key);
	}

	function foodName(key, amount) {
		var def = foodDef(key);
		if (!def) return String(key || "").replace(/_/g, " ");
		if (amount === 1 && def.singular) return def.singular;
		return def.plural || def.name || String(key || "").replace(/_/g, " ");
	}

	function foodstuffInventory(vars) {
		vars = storyVars(vars);
		if (!vars.foodstuff || typeof vars.foodstuff !== "object") return {};
		return vars.foodstuff;
	}

	function foodstuffCount(key, vars) {
		var inv = foodstuffInventory(vars);
		var item = inv[key];
		var count = item && Number(item.amount);
		return Number.isFinite(count) ? count : 0;
	}

	function stockableKeys(vars) {
		var inv = foodstuffInventory(vars);
		var keys = Object.keys(inv).filter(function (key) {
			return isStockableFood(key) && foodstuffCount(key, vars) >= 1;
		});
		keys.sort(function (a, b) { return foodName(a).localeCompare(foodName(b)); });
		return keys;
	}

	/* Native DoL produce helpers.  Harvesting and wild picking write to
	 * State.variables.foodstuff[key].amount; journalInventory reads the same
	 * field, so stocking the loft kitchen must decrement that exact store.
	 */
	scSetup.loftCookFoodName = foodName;
	scSetup.loftCookInventoryKeys = stockableKeys;
	scSetup.loftCookIsLessonFood = isLessonFood;
	scSetup.loftCookIsReadyFood = isReadyFood;
	scSetup.loftCookIsStockableFood = isStockableFood;

	scSetup.loftCookInventoryCount = function (key, vars) {
		return foodstuffCount(key, vars);
	};

	scSetup.loftCookTakeInventory = function (key, amount, vars) {
		amount = Math.max(1, Math.trunc(Number(amount) || 1));
		var inv = foodstuffInventory(vars);
		var item = inv[key];
		var count = item && Number(item.amount);
		if (!Number.isFinite(count) || count < amount) return false;
		item.amount = Math.max(0, Math.trunc(count - amount));
		return true;
	};

	scSetup.loftCookBurnClick = function (button) {
		var root = closestBurnRoot(button);
		if (!root || root.getAttribute("data-done") === "1") return false;

		root.classList.remove("loftBurnNeedsJs");
		prepareRoot(root);

		if (root.getAttribute("data-started") !== "1") {
			start(root);
			return false;
		}

		var pos = currentPos(root);
		var zoneStart = num(root, "data-start", 45);
		var zoneEnd = num(root, "data-end", zoneStart + num(root, "data-width", 22));

		if (pos < zoneStart) {
			finish(root, "raw");
		} else if (pos <= zoneEnd) {
			finish(root, "perfect");
		} else {
			finish(root, "burnt");
		}
		return false;
	};

	scSetup.loftCookBurnCancelAll = cancelAllMeters;
	scSetup.loftCookBurnPrepare = prepareRoot;

	/* The meter prepares itself on the first tap (see loftCookBurnClick -> prepareRoot -> start),
	and the green zone stays hidden by CSS until then, so no pre-pass or DOM observer is needed. 
	We only clean up running timers when the player leaves the passage. */
	if (window.jQuery && jQuery(document).on) {
		jQuery(document).on(":passageinit", cancelAllMeters);
	}
}());
