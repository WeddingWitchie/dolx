/**
 * D.N.A. moved/split some reusable X-Change misc/helper widgets out of `xchange.twee` and into this file:
 * - `koztools.twee` is for shared utility widgets, small UI helpers, and misc glue
 * - Main X-Change pill/effect/body handling should remain in `xchange.twee`
 * - Gender-identity logic remains split across `identity.twee`, `identity.js`
 * - Any still-live compatibility helpers in `xchange.js`
 * =========================
 * Important!
 * If what you're looking for isn't defined here, check other files too.
**/

function kofiValidate(code) {
	let versionNumber = window.StartConfig.version;

	let versionMatch = versionNumber.match(/DoLX (\d+)\.(\d+)\.(\d+)\w{0,1}/);
	if (!versionMatch) {
		throw new Error("Version number doesn't match convention.");
	}
	
	let codeMatch = code.match(/(\d+)[A-Z]{3}(\w)[A-Z]{1}(\w)[A-Z]{1,3}(\d+)/);
	if (codeMatch === null) return 0;

	var verMajor = codeMatch[1];
	var codeMajor = codeMatch[2];
	var codeMinor = codeMatch[3];
	var verMinor = Math.sqrt(codeMatch[4]);

	var majorHash = String.fromCharCode( (verMajor << 11) % 25 + 65 );
	var minorHash = String.fromCharCode( (verMinor << 11) % 25 + 65 );

	let isValid = (versionMatch[1] >= verMajor && versionMatch[2] >= verMinor) && (codeMajor == majorHash && codeMinor == minorHash);

	if (isValid) {
		return +verMajor * 1000 + +verMinor;
	}
	else {
		return 0;
	}
}
window.kofiValidate = kofiValidate;

function wornSetupClothes(slot) {
	return setup.clothes[slot][clothesIndex(slot, V.worn[slot])];
}
window.wornSetupClothes = wornSetupClothes;

// ==================================================
// GLOBAL MOD HELPER
// ==================================================
(() => {
	window.__statExploitFixesLoaded = true;

	// ---------- RUNTIME TOGGLES ----------
	// window.STAT_EXPLOIT_DISABLE = true   → script logs but never modifies stats
	// window.STAT_EXPLOIT_DEBUG = false    → silence verbose logs
	window.STAT_EXPLOIT_DISABLE = false;
	window.STAT_EXPLOIT_DEBUG = false;

  const log = (...args) => { if (window.STAT_EXPLOIT_DEBUG) console.log("[DoLP]", ...args); };
  const warn = (...args) => console.warn("[DoLP]", ...args);

  const EPS_MAX = 1e-6;

  // If in-game time advances by at least this many seconds between two
  // passage displays, treat any fatigue/stress drop as legitimate (sleep,
  // class, work, time-skip event). Cheats and reloads never advance time.
  const SIGNIFICANT_TIME_GAP_SECONDS = 15 * 60;

  let cheatOverlaySeen = false;

  function passageName() {
    try { return String(State.passage || ""); } catch (e) { return ""; }
  }
  function tagsLower() {
    try {
      const story = window.Story?.get ? Story.get(passageName()) : null;
      const tags = Array.isArray(story?.tags) ? story.tags : [];
      return tags.map(t => String(t).toLowerCase());
    } catch (e) { return []; }
  }
  function inContext(reWordBoundary) {
    const p = passageName().toLowerCase();
    const t = tagsLower().join(" ");
    return reWordBoundary.test(p) || reWordBoundary.test(t);
  }

  function excludedForRecoveryOrConsequences() {
    if (inContext(/\bcheats?\b/i) || inContext(/\bdebug\b/i)) return true;
    return (
      inContext(/\bpassout\b/i) || inContext(/\bsleep\b/i)  ||
      inContext(/\bnap\b/i)     || inContext(/\brest\b/i)   ||
      inContext(/\bbed\b/i)     || inContext(/\bwake\b/i)   ||
      inContext(/\bdream\b/i)   || inContext(/\basylum\b/i) ||
      inContext(/\bhospital\b/i)|| inContext(/\bclinic\b/i) ||
      inContext(/\btherapy\b/i) ||
      inContext(/\bpainting-snake\b/i)   || inContext(/\bhopelesscycle\b/i) ||
      inContext(/\bhopeless[_-]?cycle\b/i)|| inContext(/\bhopeless\s*cycle\b/i) ||
      inContext(/\bfayne\b/i)   || inContext(/\bgaoler\b/i)
    );
  }

  function numberOrNull(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  function getFatigueMax() {
    const m = window.C?.tiredness?.max;
    return (typeof m === "number" && Number.isFinite(m)) ? m : null;
  }
  function getStressMax() {
    const v = numberOrNull(State.variables.stressmax);
    if (v !== null) return v;
    const c = window.C?.stress?.max;
    if (typeof c === "number" && Number.isFinite(c)) return c;
    return null;
  }
  function getInGameTimestamp() {
    try {
      const T = window.Time;
      if (!T) return null;
      if (T.date && typeof T.date.timeStamp === "number" && Number.isFinite(T.date.timeStamp)) {
        return T.date.timeStamp;
      }
      if (T.date && typeof window.DateTime === "function") {
        const dt = new window.DateTime(T.date);
        if (typeof dt.timeStamp === "number" && Number.isFinite(dt.timeStamp)) return dt.timeStamp;
      }
      const d = numberOrNull(T.days)   ?? numberOrNull(T.day)    ?? 0;
      const h = numberOrNull(T.hour)   ?? 0;
      const m = numberOrNull(T.minute) ?? 0;
      return d * 86400 + h * 3600 + m * 60;
    } catch (e) { return null; }
  }

  function syncTrackers(why) {
    const V = State.variables;
    const t = numberOrNull(V.tiredness);
    if (t !== null) V.__fix_prev_tiredness = t;
    V.__fix_prevMax_tiredness = getFatigueMax() ?? V.__fix_prevMax_tiredness;
    const s = numberOrNull(V.stress);
    if (s !== null) V.__fix_prev_stress = s;
    V.__fix_prevMax_stress = getStressMax() ?? V.__fix_prevMax_stress;
    const ts = getInGameTimestamp();
    if (ts !== null) V.__fix_prev_timestamp = ts;
    log(`sync (${why}): tiredness=${V.tiredness}, stress=${V.stress}, ts=${ts}`);
  }

  // Core decision: should we revert this drop, and if so, to what value?
  // Returns { revert: bool, target: number, reason: string }
  function evaluateDrop(prev, prevMax, cur, statName) {
    if (prev === null || prevMax === null || cur === null) {
      return { revert: false, reason: "missing-data" };
    }

    // Over-max state: buffs have pushed the stat above the cap.
    // Any drop is a recompute/clamp fluctuation we want to suppress so the
    // displayed value stays stable.
    if (prev > prevMax + EPS_MAX) {
      if (cur < prev - EPS_MAX) {
        return { revert: true, target: prev, reason: `over-max-fluctuation (prev=${prev} > cap=${prevMax}, cur=${cur})` };
      }
      return { revert: false, reason: "over-max-no-drop" };
    }

    // At-max state: classic cheat/exploit detection.
    // A large drop (>=10% of cap) from exactly the cap is the console-edit
    // cheat signature.
    const prevWasAtMax = prev >= (prevMax - EPS_MAX);
    if (prevWasAtMax) {
      const largeDrop = cur <= (prevMax * 0.9);
      if (largeDrop) {
        return { revert: true, target: prevMax, reason: `at-max large-drop (prev=${prev}≈cap=${prevMax}, cur=${cur})` };
      }
    }

    return { revert: false, reason: "no-trigger" };
  }

  $(document).one(":storyready", () => {
    log("statExploitFixes loaded — DEBUG=" + window.STAT_EXPLOIT_DEBUG + ", DISABLE=" + window.STAT_EXPLOIT_DISABLE);

    try {
      const containsCheatsShown = (node) => {
        if (!node || node.nodeType !== 1) return false;
        if (node.id === "cheatsShown") return true;
        return !!(node.querySelector && node.querySelector("#cheatsShown"));
      };
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type !== "childList") continue;
          for (const node of m.addedNodes) {
            if (containsCheatsShown(node)) {
              cheatOverlaySeen = true;
              log("MutationObserver: #cheatsShown was inserted");
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (e) { warn("MutationObserver failed:", e); }

    $(document).on(":passagedisplay", () => {
      const V = State.variables;
      const passage = passageName();
      const curTime = getInGameTimestamp();
      const prevTime = numberOrNull(V.__fix_prev_timestamp);

      log(`--- :passagedisplay [${passage}] tiredness=${V.tiredness}/${getFatigueMax()} stress=${V.stress}/${getStressMax()} time=${curTime} prevTime=${prevTime}`);

      // Read & consume cheat signals (one-shot semantics).
      const cheatJustHappened = (V.cheatReload === true) || cheatOverlaySeen;
      cheatOverlaySeen = false;
      if (V.cheatReload === true) V.cheatReload = false;

      if (cheatJustHappened) {
        log("path=CHEAT (cheatReload or overlay seen) → sync & exit");
        syncTrackers("cheat");
        return;
      }

      if (excludedForRecoveryOrConsequences()) {
        log(`path=EXCLUDED (passage="${passage}") → sync & exit`);
        syncTrackers("excluded");
        return;
      }

      if (curTime !== null && prevTime !== null) {
        const delta = curTime - prevTime;
        if (delta >= SIGNIFICANT_TIME_GAP_SECONDS) {
          log(`path=TIME-GAP (delta=${delta}s ≥ ${SIGNIFICANT_TIME_GAP_SECONDS}s) → sync & exit`);
          syncTrackers("time-gap");
          return;
        }
        log(`time-gap delta=${delta}s (under threshold)`);
      }

      log("path=NORMAL — running checks");

      // ---- FATIGUE ----
      {
        const cur = numberOrNull(V.tiredness);
        const curMax = getFatigueMax();
        const prev = numberOrNull(V.__fix_prev_tiredness);
        const prevMax = numberOrNull(V.__fix_prevMax_tiredness);
        log(`  fatigue: cur=${cur}, prev=${prev}, prevMax=${prevMax}, curMax=${curMax}`);

        if (cur !== null) {
          const decision = evaluateDrop(prev, prevMax, cur, "fatigue");
          log(`  fatigue decision: ${decision.reason}${decision.revert ? ` → revert to ${decision.target}` : ""}`);

          if (decision.revert) {
            if (window.STAT_EXPLOIT_DISABLE) {
              warn(`WOULD HAVE reverted FATIGUE: ${decision.reason} → ${decision.target} (DISABLE=true, doing nothing). passage=${passage}`);
              V.__fix_prev_tiredness = cur;
              if (curMax !== null) V.__fix_prevMax_tiredness = curMax;
            } else {
              warn(`reverted FATIGUE: ${decision.reason} → ${decision.target}. passage=${passage}`);
              V.tiredness = decision.target;
              V.__fix_prev_tiredness = decision.target;
              if (curMax !== null) V.__fix_prevMax_tiredness = Math.max(curMax, V.__fix_prevMax_tiredness ?? 0);
            }
          } else {
            V.__fix_prev_tiredness = cur;
            if (curMax !== null) V.__fix_prevMax_tiredness = curMax;
          }
        }
      }

      // ---- STRESS ----
      {
        const cur = numberOrNull(V.stress);
        const curMax = getStressMax();
        const prev = numberOrNull(V.__fix_prev_stress);
        const prevMax = numberOrNull(V.__fix_prevMax_stress);
        log(`  stress: cur=${cur}, prev=${prev}, prevMax=${prevMax}, curMax=${curMax}`);

        if (cur !== null) {
          const decision = evaluateDrop(prev, prevMax, cur, "stress");
          log(`  stress decision: ${decision.reason}${decision.revert ? ` → revert to ${decision.target}` : ""}`);

          if (decision.revert) {
            if (window.STAT_EXPLOIT_DISABLE) {
              warn(`WOULD HAVE reverted STRESS: ${decision.reason} → ${decision.target} (DISABLE=true, doing nothing). passage=${passage}`);
              V.__fix_prev_stress = cur;
              if (curMax !== null) V.__fix_prevMax_stress = curMax;
            } else {
              warn(`reverted STRESS: ${decision.reason} → ${decision.target}. passage=${passage}`);
              V.stress = decision.target;
              V.__fix_prev_stress = decision.target;
              if (curMax !== null) V.__fix_prevMax_stress = Math.max(curMax, V.__fix_prevMax_stress ?? 0);
            }
          } else {
            V.__fix_prev_stress = cur;
            if (curMax !== null) V.__fix_prevMax_stress = curMax;
          }
        }
      }

      if (curTime !== null) V.__fix_prev_timestamp = curTime;
    });
  });
})();

(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {
		window.setup = {};
	}

	// Ensure Math.clamp exists (some forks have it, some don't)
	if (typeof Math.clamp !== "function") {
		Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));
	}

	// Valid bodysize values in build
	setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4];

	// Snap any number to nearest valid bodysize step
	setup.snapBodySize = function (v) {
		v = Number(v);
		if (!Number.isFinite(v)) return 2;

		let best = setup.bodySizeSteps[0];
		let bestD = Math.abs(v - best);

		for (const s of setup.bodySizeSteps) {
			const d = Math.abs(v - s);
			if (d < bestD) { best = s; bestD = d; }
		}
		return best;
	};

	// Move by N steps in the discrete list (prevents 1.5 / 3.5 etc)
	setup.stepBodySize = function (cur, stepDelta) {
		cur = setup.snapBodySize(cur);
		stepDelta = Math.trunc(Number(stepDelta) || 0);

		const arr = setup.bodySizeSteps;
		let idx = arr.indexOf(cur);
		if (idx < 0) idx = arr.indexOf(2);

		let next = idx + stepDelta;
		next = Math.clamp(next, 0, arr.length - 1);

		return arr[next];
	};
})();

(() => {
	// Ensure setup exists
	if (typeof window.setup !== "object" || window.setup === null) {window.setup = {};}

	// Ensure Math.clamp exists
	if (typeof Math.clamp !== "function") {Math.clamp = (n, min, max) => Math.min(max, Math.max(min, n));}

	// Back-compat: old saves may be missing newer X-Change pill fields.
	// We only fill in missing fields; we don't wipe or "sanitise" existing data.
	setup.xchangeEnsurePillDefaults = function () {
		const V = State?.variables;
		const pill = V?.xchange?.pill;
		if (!pill) return;

		// effectsKnown was introduced later; if missing and the pill is active or any effect is present,
		// assume the player is aware (they'd notice the changes anyway).
		if (pill.effectsKnown === undefined) {
			const hasAnyEffect =
				!!pill.fertile ||
				!!pill.breederEffect ||
				!!pill.bullEffect ||
				!!pill.genderflipEffect ||
				!!pill.genderificationEffect ||
				!!pill.hermEffect ||
				!!pill.resistanceEffect ||
				!!pill.continueEffect ||
				!!pill.portalEffect;

			pill.effectsKnown = !!pill.active || hasAnyEffect;
		}
	};

	// Back-compat: older saves may be missing global X-Change fields that core game code expects.
	// We only initialise values when they're missing/invalid, to avoid wiping legitimate data.
	setup.xchangeEnsureCompatGlobals = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		V.xchange.heat ??= {};
		if (V.xchange.heat.permanentOn === undefined) {
			V.xchange.heat.permanentOn = 0;
		}
		
		// story-functions.js uses V.xchange.breederDenial in arithmetic.
		// If it's missing or non-numeric, it can turn risk into NaN and silently disable heat.
		const bd = Number(V.xchange.breederDenial);
		if (!Number.isFinite(bd)) {
			V.xchange.breederDenial = 0;
		} else {
			V.xchange.breederDenial = Math.clamp(bd, 0, 6);
		}

		// story-functions.js also gates heat when pregnant using V.pregnancyStats.heatStillEnabled
		V.pregnancyStats ??= {};
		if (typeof V.pregnancyStats.heatStillEnabled !== "boolean") {
			try {
				V.pregnancyStats.heatStillEnabled = (typeof playerIsPregnant === "function") ? !playerIsPregnant() : true;
			} catch (e) {
				V.pregnancyStats.heatStillEnabled = true;
			}
		}

		// Ensure $ballssize always exists (female-start characters may never have it initialised,
		// which causes NaN when save-body runs Number($ballssize)).
		if (V.ballssize === undefined || V.ballssize === null || !Number.isFinite(Number(V.ballssize))) {
			V.ballssize = 0;
		}
	};

	// GI safety: keep the Gender Identity drift system truly OFF unless explicitly enabled,
	// and prevent "armed" drift/stage from firing later.
	setup.xchangeEnsureGiSafety = function () {
		const V = State?.variables;
		if (!V) return;
		V.xchange ??= {};
		const x = V.xchange;

		const toStrictBool = (v) => (v === true || v === 1 || v === "true");

		if (x.genderIdentityEnabled === undefined) x.genderIdentityEnabled = true;
		x.genderIdentityEnabled = toStrictBool(x.genderIdentityEnabled);

		x.giAutoEnabled = toStrictBool(x.giAutoEnabled);
		x.giTransformEnabled = toStrictBool(x.giTransformEnabled);

		// Consent tracks the transform checkbox directly.
		// The checkbox IS the consent, there is no separate consent UI.
		// When transforms are enabled, consent is granted.
		// When transforms are disabled, consent is revoked and drift is cleared.
		x.giTransformConsent = x.giTransformEnabled;

		// Lock behind the same unlock the UI uses.
		// identityCap is NOT checked here — it controls how far the meter can drift,
		// not whether the system is enabled. The genderidentity widget already enforces
		// the cap floor when identityCap is true.
		const unlocked = (V.attitudesControl?.unlockGender === true);
		if (!unlocked) {
			x.giAutoEnabled = false;
			x.giTransformEnabled = false;
			x.giTransformConsent = false;
		}

		// If the system isn't fully enabled, clear queued drift/stage so it can't "fire later".
		if (x.giAutoEnabled !== true || x.giTransformEnabled !== true) {
			x.giDrift = 0;
			x.giShiftStage = 0;
			x.giShiftMode = "";
		}
	};

	// Run once now
	try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
	try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
	try { setup.xchangeEnsureGiSafety(); } catch (e) {}

	// Run again on every passage start
	if (typeof jQuery === "function") {
		jQuery(document).on(":passagestart", () => {
			try { setup.xchangeEnsurePillDefaults(); } catch (e) {}
			try { setup.xchangeEnsureCompatGlobals(); } catch (e) {}
			try { setup.xchangeEnsureGiSafety(); } catch (e) {}
		});
	}
})();

/* X-CHANGE SAVE REPAIR NOTICE */
window.xChangeQueueNotice = function (id, html) {
	const V = (typeof State !== "undefined" && State.variables) ? State.variables : window.V;
	if (!V) return;

	V.xChangeFlags ??= {};
	if (V.xChangeFlags[id]) return;

	V.xChangeNotices ??= [];
	V.xChangeNotices.push({ id, html });
};

(function () {
	function renderNotices() {
		const V = (typeof State !== "undefined" && State.variables) ? State.variables : window.V;
		if (!V?.xChangeNotices?.length) return;

		V.xChangeFlags ??= {};

		const passEl = document.querySelector("#passage") || document.querySelector(".passage");
		if (!passEl) return;

		while (V.xChangeNotices.length) {
			const n = V.xChangeNotices.shift();
			if (!n || !n.id || V.xChangeFlags[n.id]) continue;

			V.xChangeFlags[n.id] = true;

			const box = document.createElement("div");
			box.innerHTML = n.html;
			box.style.cssText = [
				"border:2px solid #ff4d4d",
				"background:rgba(255,0,0,0.12)",
				"color:#ffb3b3",
				"padding:12px 12px",
				"border-radius:8px",
				"margin:0 0 14px 0",
				"font-size:1em",
				"line-height:1.4",
				"word-break:break-word",
				"overflow-wrap:anywhere",
				"box-sizing:border-box"
			].join(";");

			passEl.prepend(box);
		}
	}

	if (window.jQuery) {
		jQuery(document).on(":passagedisplay", renderNotices);
	} else {
		document.addEventListener(":passagedisplay", renderNotices);
	}
})();

// ---------- Other functional helper ----------
function pruneNPCName() {
  const V = State.variables;
  if (!Array.isArray(V.NPCName) || !Array.isArray(V.NPCNameList)) return;

  const allowed = new Set(setup.NPCNameList);
  for (let i = V.NPCName.length - 1; i >= 0; i--) {
    const nam = V.NPCName[i]?.nam;
    if (typeof nam !== "string" || !allowed.has(nam)) V.NPCName.splice(i, 1);
  }

  const have = new Set(V.NPCName.map(n => n?.nam).filter(n => typeof n === "string"));
  for (let i = V.NPCNameList.length - 1; i >= 0; i--) {
    if (!have.has(V.NPCNameList[i])) V.NPCNameList.splice(i, 1);
  }
}
window.pruneNPCName = pruneNPCName;

function updateDynamicStatCaps() {
	const V = State.variables; if (!window.C || !C.tiredness) return;
	if (V.tirednessMaxScalingToggle && typeof currentSkillValue === "function") {
		C.tiredness.max = 2000 + Math.floor(currentSkillValue("physique", 0, 1) / 32);
	} else {
		C.tiredness.max = 2000;
	}
	if (V.stressMaxScalingToggle && typeof currentSkillValue === "function") {
		V.stressmax = 10000 + Math.floor(currentSkillValue("willpower", 0, 1) * 5);
	} else {
		V.stressmax = 10000;
	}
}
window.updateDynamicStatCaps = updateDynamicStatCaps;

function dolxRepairMissingJewelleryWornSlots(context = "clothing render") {
	if (!V?.worn || !setup?.clothes) return;

	const warn = typeof window.dolxWarnOnce === "function"
		? (key, msg, value) => window.dolxWarnOnce(key, msg, value)
		: (_key, msg, value) => console.warn(msg, value);

	for (const slot of ["earrings", "rings"]) {
		if (V.worn[slot] && typeof V.worn[slot] === "object") continue;

		const fallback = setup.clothes[slot]?.[0];
		if (!fallback) continue;

		warn(
			`missing-worn-jewellery:${slot}`,
			`[DoLX] Missing $worn.${slot} during ${context}; repairing with default naked ${slot}.`,
			V.worn[slot]
		);

		V.worn[slot] = clone(fallback);
	}
}
window.dolxRepairMissingJewelleryWornSlots = dolxRepairMissingJewelleryWornSlots;

if (Array.isArray(V.NPCList)) {
	V.NPCList.forEach(npc => {if (npc && typeof npc === "object") {delete npc.orgasms; delete npc.maxOrgasms;}});
}
if (!V.npcOrgasmState || typeof V.npcOrgasmState !== "object" || Array.isArray(V.npcOrgasmState)) {
	V.npcOrgasmState = {};
}

(() => {
	// Ensure setup exists (defensive; other blocks in this file already do this)
	if (typeof window.setup !== "object" || window.setup === null) window.setup = {};
	// Internal helper, closure-scoped (not used outside this block).
	const stateInvalid = (...states) => states.some((state) => state === undefined);

	// Pain multiplier per bodysize step. 
	// Keyed by VALUE, not array index, so it stays aligned with setup.bodySizeSteps = [-1, 0, 1, 2, 2.5, 3, 4].
	// The old [2, 1, 0.5, 0] array silently returned undefined for bodysize -1, 2.5, and 4, which the `|| 0` then swallowed into zero pain.
	// Adjust the -1 / 2.5 / 4 entries if the game-design intent differs.
	const BODY_SIZE_PAIN_MODIFIER = new Map([
		[-1,  3],     // very small frame: extra pain
		[0,   2],
		[1,   1],
		[2,   0.5],
		[2.5, 0.25],  // between 2 and 3
		[3,   0],
		[4,   0],     // very large frame: no extra pain
	]);

	// Increase pain based on penetration states every turn in combat.
	setup.penetratedPain = function penetratedPain() {
		if (stateInvalid(V.vaginastate, V.anusstate, V.mouthstate, V.bodysize)) return;

		const painStates = {
			penetrated: 1.5,
			doublepenetrated: 4,
			tentacle: 1.5,
			tentacledeep: 3,
		};

		// Wetness eases penetration pain. Maps a hole's wetness (0-100) to a multiplier:
		//   dry (0)        -> WET_PAIN_MAX_MULT (full pain)
		//   drenched (100) -> WET_PAIN_MIN_MULT (reduced, but never zero; penetration still hurts)
		const WET_PAIN_MAX_MULT = 1;    // pain multiplier when completely dry
		const WET_PAIN_MIN_MULT = 0.4;  // pain multiplier when fully wet (floor: stays hurtful)
		const wetnessMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return WET_PAIN_MAX_MULT - w * (WET_PAIN_MAX_MULT - WET_PAIN_MIN_MULT);
		};

		// Size (stretch) pain: large penetrators add extra pain on top of the base.
		//   SIZE_PAIN_THRESHOLD = sizes at or below this add NO stretch pain (1=Mini ... 4=Normal).
		//   SIZE_PAIN_PER_STEP  = pain added per size step above the threshold (5=Large, 6=Enormous).
		// So with threshold 4 / step 2: size 5 -> +2, size 6 -> +4 (before wetness/body modifiers).
		const SIZE_PAIN_THRESHOLD = 4;
		const SIZE_PAIN_PER_STEP = 2;
		const sizePain = size => Math.max(0, (size ?? 0) - SIZE_PAIN_THRESHOLD) * SIZE_PAIN_PER_STEP;

		// Wetness only PARTIALLY eases stretch pain; a big penis still hurts even when fully wet.
		//   SIZE_WET_MIN_MULT = fraction of stretch pain that remains when fully wet (floor).
		const SIZE_WET_MIN_MULT = 0.7;
		const sizeWetMult = wetness => {
			const w = Math.clamp(wetness ?? 0, 0, 100) / 100;
			return 1 - w * (1 - SIZE_WET_MIN_MULT);
		};

		// Find the largest penis fully seated in a hole. Full penetration sets the NPC's
		// .penis to exactly the hole name (or holename+"double"); "entrance"/"imminent" don't count.
		// Scanning NPCList by .penis avoids relying on $vaginatarget/$anustarget indices,
		// where 0 ambiguously means both "NPC #0" and "none".
		const maxPenetratorSize = (...penisValues) => {
			if (!Array.isArray(V.NPCList)) return 0;
			let maxSize = 0;
			for (const npc of V.NPCList) {
				if (npc && penisValues.includes(npc.penis)) {
					const s = Number(npc.penissize);
					if (Number.isFinite(s) && s > maxSize) maxSize = s;
				}
			}
			return maxSize;
		};

		let pain = 0;
		if (V.vaginastate in painStates) {
			pain += painStates[V.vaginastate] * wetnessMult(V.vaginaWetness);
			pain += sizePain(maxPenetratorSize("vagina", "vaginadouble")) * sizeWetMult(V.vaginaWetness);
		}
		if (V.anusstate in painStates) {
			pain += painStates[V.anusstate] * wetnessMult(V.anusWetness);
			pain += sizePain(maxPenetratorSize("anus", "anusdouble")) * sizeWetMult(V.anusWetness);
		}
		// Mouth has no wetness stat (saliva assumed); keep its existing 0.5 weighting unchanged.
		if (V.mouthstate in painStates) {
			pain += painStates[V.mouthstate] * 0.5;
			pain += sizePain(maxPenetratorSize("mouth")) * 0.5;
		}

		const modifier = BODY_SIZE_PAIN_MODIFIER.get(V.bodysize) ?? 0;
		statChange.pain(pain * modifier);

		// --- Consensual vs non-consensual aftermath -------------------------------
		// V.consensual:  1 = consensual encounter, 0 = assault.
		// V.orgasmcount: the PC's orgasms this encounter (DoL's own per-scene counter, reset by combat init).
		if (V.consensual === 1) {
			// CONSENSUAL: after enough orgasms the PC acclimates and pain eases off each turn,
			// faster the wetter things are (can fully null pain over time). "How wet during the action."
			const ADAPT_ORGASM_THRESHOLD = 3;  // orgasms required before adaptation kicks in
			const ADAPT_BASE = 1;              // pain removed per turn once adapted, when dry
			const ADAPT_WET_BONUS = 4;         // extra removal that scales up to full wetness
			if ((V.orgasmcount || 0) >= ADAPT_ORGASM_THRESHOLD) {
				const wet = Math.clamp(Math.max(V.vaginaWetness ?? 0, V.anusWetness ?? 0), 0, 100) / 100;
				const adapt = ADAPT_BASE + wet * ADAPT_WET_BONUS;
				statChange.pain(-adapt, 1); // modifier 1 => removes exactly `adapt` pain
			}
		} else {
			// NON-CONSENSUAL: once pain is maxed it can't climb further, so it slowly converts to
			// trauma — 1 pain -> 1 trauma per turn (straighttrauma = raw 1:1, no control multiplier).
			const TRAUMA_CONVERT_RATE = 1;
			const PAIN_MAX = 200;
			if (V.pain >= PAIN_MAX) {
				statChange.pain(-TRAUMA_CONVERT_RATE, 1);
				statChange.straighttrauma(TRAUMA_CONVERT_RATE);
			}
		}
	};

	// Per-minute pain decay rate.
	// Used as the `modifier` arg to statChange.pain from time.js, so this returns a negative number (pain decreases over time).
	// Acclimation model: pain fades gently, speeding up the longer the PC has been hurting, within a fixed band.
	//   PAIN_DECAY_MIN  = decay during the first interval (per minute).
	//   PAIN_DECAY_MAX  = fastest decay once fully acclimated (per minute, hard cap).
	//   PAIN_DECAY_STEP = added to the rate at each adaptation step (capped at PAIN_DECAY_MAX).
	//   Steps trigger at 1h, 3h, 7h, 15h, 31h ... in pain (each gap doubles: 1, 2, 4, 8 ...).
	// V.painDuration (minutes spent continuously in pain) is maintained in time.js minutePassed().
	setup.painChangeByTime = function painChangeByTime(currentPain) {
		const PAIN_DECAY_MIN = 0.3;
		const PAIN_DECAY_MAX = 0.5;
		const PAIN_DECAY_STEP = 0.05;
		const hours = (V.painDuration || 0) / 60;
		const steps = Math.floor(Math.log2(hours + 1));
		return -Math.min(PAIN_DECAY_MIN + steps * PAIN_DECAY_STEP, PAIN_DECAY_MAX);
	};

	// Multiplier on tiredness gain due to pain. 
	// Used as a per-tick multiplier in stat-changes.js, where the fallback when this is missing is 1.
	// Floor of 1 is intentional: pain only ever amplifies tiredness gain, never reduces it.
	setup.tirednessChangeByPain = function tirednessChangeByPain(currentPain) {
		return Math.max(0.00181 * Math.pow(currentPain, 1.45), 1);
	};

	// Multiplier on badend escape amount. Lower = harder to escape.
	// Note: V.pain is clamped to [0, 200] by painClamp(), within which the painModifier quartic stays in roughly [0.05, 1].
	// If the pain cap is ever raised above ~440, wrap the polynomial in Math.clamp(..., 0, 1) to prevent negative values from flipping the multiplier sign.
	setup.escapeAmount = function escapeAmount() {
		if (stateInvalid(V.pain, V.tiredness)) return 1;
		const currentPain = V.pain;
		const currentTiredness = V.tiredness;
		const tirednessModifier = Math.min(
			-0.0000001 * currentTiredness * currentTiredness
				- 0.0002 * currentTiredness
				+ 1,
			1
		);
		const painModifier = Math.min(
			-0.000000001 * currentPain ** 4
				+ 0.0000007  * currentPain ** 3
				- 0.0001275  * currentPain ** 2
				+ 0.00075    * currentPain
				+ 1,
			1
		);
		return painModifier * tirednessModifier;
	};
})();

// ==================================================
// MOVED FROM time.js to keeps vanilla time.js untouched
// ==================================================
/* Brothel vending state repair / defaults. Called from time.js (weekPassed, dayPassed, etc.). 
	Exported on window so those call sites continue to resolve after the move. */
function ensureBrothelVendingState() {
	if (V.brothelVending == null) return false;

	if (typeof V.brothelVending !== "object") {
		console.warn("[brothelVending] Repaired non-object state:", V.brothelVending);
		V.brothelVending = {};
	}

	if (typeof V.brothelVending.status !== "string") V.brothelVending.status = "idea";

	const numericDefaults = {
		products: 0,
		condoms: 0,
		lube: 0,
		condomsSold: 0,
		lubeSold: 0,
		weeksRent: 0,
		weeksEmpty: 0,
		total: 0,
	};

	for (const [key, fallback] of Object.entries(numericDefaults)) {
		if (!Number.isFinite(V.brothelVending[key])) {
			console.warn(`[brothelVending] Repaired invalid ${key}:`, V.brothelVending[key]);
			V.brothelVending[key] = fallback;
		}
	}

	V.brothelVending.products = Math.max(0, Math.floor(V.brothelVending.products));
	V.brothelVending.condoms = Math.max(0, Math.floor(V.brothelVending.condoms));
	V.brothelVending.lube = Math.max(0, Math.floor(V.brothelVending.lube));
	V.brothelVending.condomsSold = Math.max(0, Math.floor(V.brothelVending.condomsSold));
	V.brothelVending.lubeSold = Math.max(0, Math.floor(V.brothelVending.lubeSold));
	V.brothelVending.weeksRent = Math.max(0, Math.floor(V.brothelVending.weeksRent));
	V.brothelVending.weeksEmpty = Math.max(0, Math.floor(V.brothelVending.weeksEmpty));
	V.brothelVending.total = Math.max(0, Math.floor(V.brothelVending.total));

	V.brothelVending.condomsToRefill = Math.max(0, 200 - V.brothelVending.condoms);
	V.brothelVending.lubeToRefill = Math.max(0, 200 - V.brothelVending.lube);

	return true;
}
window.ensureBrothelVendingState = ensureBrothelVendingState;

/* Daily speech-attitude roll for the "fickle" attitude.
 * Called from dayPassed() in time.js. Exported on window for the call site. */
function speechDailyCheck() {
	if (V.statFreeze) return;

	delete V.speechDailyMessage;
	delete V.speechDailyMessagePending;

	if (V.speech_attitude === "fickle") {
		const pool = ["meek", "shy", "neutral", "confident", "bratty"];
		V.speechDailyAttitude = pool[random(0, pool.length - 1)];
		V.speechDailyAttitudeDay = Time.days;
		V.speechDailyMessage = `Today you feel especially ${V.speechDailyAttitude}.`;
		V.speechDailyMessagePending = 1;
	} else {
		delete V.speechDailyAttitude;
		delete V.speechDailyAttitudeDay;
	}
}
window.speechDailyCheck = speechDailyCheck;

/* beautyBoost save-compat / expiry; relocated out of vanilla time.js's :passageinit handler.
Runs on every passage as before, behavior identical. */
$(document).on(":passageinit", () => {
	/* Ensure beautyBoost object exists (save compatibility) */
	V.beautyBoost ??= { bath: 0, teeth: 0, face: 0, hands: 0, hygiene: 0, tan: 0 };
	if (V.beautyBoost.bath == null) V.beautyBoost.bath = 0;
	if (V.beautyBoost.teeth == null) V.beautyBoost.teeth = 0;
	if (V.beautyBoost.face == null) V.beautyBoost.face = 0;
	if (V.beautyBoost.hands == null) V.beautyBoost.hands = 0;
	if (V.beautyBoost.hygiene == null) V.beautyBoost.hygiene = 0;
	if (V.beautyBoost.tan == null) V.beautyBoost.tan = 0;

	if (V.beautyBoost.spa == null || typeof V.beautyBoost.spa === "number") {
		V.beautyBoost.spa = {
			amount: Number.isFinite(V.beautyBoost.spa) ? V.beautyBoost.spa : 0,
			expires: 0,
			treatment: "spa treatment",
		};
	}
	if (typeof V.beautyBoost.spa !== "object") V.beautyBoost.spa = { amount: 0, expires: 0, treatment: "spa treatment" };
	if (!Number.isFinite(V.beautyBoost.spa.amount)) V.beautyBoost.spa.amount = 0;
	if (!Number.isFinite(V.beautyBoost.spa.expires)) V.beautyBoost.spa.expires = 0;
	if (typeof V.beautyBoost.spa.treatment !== "string") V.beautyBoost.spa.treatment = "spa treatment";
	if (V.beautyBoost.spa.amount > 0 && V.beautyBoost.spa.expires > 0 && Time.days > V.beautyBoost.spa.expires) {
		V.beautyBoost.spa.amount = 0; V.beautyBoost.spa.expiredNotice = true;
	}

	/* Salon manicure boost, parallel slot to spa */
	if (V.beautyBoost.nails == null || typeof V.beautyBoost.nails === "number") {
		V.beautyBoost.nails = {
			amount: Number.isFinite(V.beautyBoost.nails) ? V.beautyBoost.nails : 0,
			expires: 0,
			treatment: "salon manicure",
		};
	}
	if (typeof V.beautyBoost.nails !== "object") V.beautyBoost.nails = { amount: 0, expires: 0, treatment: "salon manicure" };
	if (!Number.isFinite(V.beautyBoost.nails.amount)) V.beautyBoost.nails.amount = 0;
	if (!Number.isFinite(V.beautyBoost.nails.expires)) V.beautyBoost.nails.expires = 0;
	if (typeof V.beautyBoost.nails.treatment !== "string") V.beautyBoost.nails.treatment = "salon manicure";
	if (V.beautyBoost.nails.amount > 0 && V.beautyBoost.nails.expires > 0 && Time.days > V.beautyBoost.nails.expires) {
		V.beautyBoost.nails.amount = 0; V.beautyBoost.nails.expiredNotice = true;
	}
});
