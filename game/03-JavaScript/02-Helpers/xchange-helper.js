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

		// Repair corrupted cached body snapshots from older versions.
		// Old saves may have NaN penissize/ballssize/hair baked into the snapshot.
		const pill = V.xchange?.pill;
		if (pill) {
			const slots = ["originalBody", "changedBody", "hermBody"];
			for (const slot of slots) {
				const body = pill[slot];
				if (!body || typeof body !== "object" || !Object.keys(body).length) continue;

				// Fix penissize
				if ("penissize" in body && !Number.isFinite(Number(body.penissize))) {
					body.penissize = 0;
				}

				// Fix ballssize
				if ("ballssize" in body && !Number.isFinite(Number(body.ballssize))) {
					body.ballssize = 0;
				}

				// Fix breastsize
				if ("breastsize" in body && !Number.isFinite(Number(body.breastsize))) {
					body.breastsize = 0;
				}

				// Fix bottomsize
				if ("bottomsize" in body && !Number.isFinite(Number(body.bottomsize))) {
					body.bottomsize = 2;
				}

				// Fix undefined hair fields that cause image path errors
				if (body.hairtype === undefined) body.hairtype = V.hairtype ?? "default";
				if (body.hairlength === undefined || !Number.isFinite(Number(body.hairlength))) {
					body.hairlength = Number.isFinite(Number(V.hairlength)) ? V.hairlength : 200;
				}
				if (body.fringetype === undefined) body.fringetype = V.fringetype ?? "default";
				if (body.fringelength === undefined || !Number.isFinite(Number(body.fringelength))) {
					body.fringelength = Number.isFinite(Number(V.fringelength)) ? V.fringelength : 200;
				}
				if (body.haircolour === undefined) body.haircolour = V.haircolour ?? "brown";
				if (body.naturalhaircolour === undefined) body.naturalhaircolour = V.naturalhaircolour ?? body.haircolour ?? "brown";
				if (body.hairfringecolour === undefined) body.hairfringecolour = V.hairfringecolour ?? body.haircolour ?? "brown";
			}

			// Also repair cloned bodies if present
			if (pill.clonedBody && typeof pill.clonedBody === "object") {
				for (const [name, body] of Object.entries(pill.clonedBody)) {
					if (!body || typeof body !== "object") continue;
					if ("penissize" in body && !Number.isFinite(Number(body.penissize))) {
						body.penissize = 0;
					}
					if ("ballssize" in body && !Number.isFinite(Number(body.ballssize))) {
						body.ballssize = 0;
					}
				}
			}
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


/* Other functional helper */
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