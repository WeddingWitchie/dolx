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