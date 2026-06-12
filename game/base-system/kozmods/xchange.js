/**
 * D.N.A. separated some X-Change misc/helper widgets from the main pill handling file:
 * - Core pill, body-save, effect, and transformation handling remains here or `xchange.twee`
 * - Misc/shared helper widgets are being moved/split into `koztools`
 * - JS-side logic may still live across `xchange.js`, `identity.js`, and related files
 * =========================
 * Important!
 * If what you're looking for isn't defined here, check other files too.
**/

function paramError(functionName = "", param = "", value, expectedValues = "") {
	if (typeof value === "object") value = JSON.stringify(value);
	/* Included both types of error reporting, since this often will only occur in a link */
	Errors.report(
		`Unexpected value for the function "${functionName}" in the passage "${V.passage}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
	throw new Error(
		`Unexpected value for the function "${functionName}". Param "${param}" had unexpected value of "${value}".${
			expectedValues ? ` ${expectedValues}` : ""
		}`
	);
}

/*
 * X-Change body-cache safety.
 * Old / cross-version saves can contain partial cached bodies.  
 * Loading those directly can write undefined/NaN into facestyle, bodyshape, breastsize, bottomsize, etc.
 * which breaks Characteristics and the body/face menus.
 */
function xChangeRepairNoticeOnce(id, message) {
	const clean = String(message ?? "").replace(/<[^>]*>/g, " ");
	try {
		const existing = (typeof setup !== "undefined") ? setup.xChangeRepairNoticeOnce : null;
		if (typeof existing === "function" && existing !== xChangeRepairNoticeOnce) {
			existing(id, message);
			return;
		}
		if (typeof window.xChangeQueueNotice === "function") {
			window.xChangeQueueNotice(id, message);
			return;
		}
		const SV = (typeof State !== "undefined" && State.variables) ? State.variables : window.V;
		if (SV) {
			SV.xChangeFlags ??= {};
			SV.xChangeNotices ??= [];
			if (!SV.xChangeFlags[id] && !SV.xChangeNotices.some(n => n?.id === id)) SV.xChangeNotices.push({ id, html: message });
			return;
		}
	} catch (e) {}
	console.warn(`[X-Change repair] ${id}: ${clean}`);
}
if (typeof window.setup !== "object" || window.setup === null) window.setup = {};
if (typeof setup.xChangeRepairNoticeOnce !== "function") setup.xChangeRepairNoticeOnce = xChangeRepairNoticeOnce;

function xChangeFiniteNumber(value, fallback) {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function xChangeString(value, fallback) {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function xChangeBodySnapshotUsable(body) {
	if (!body || typeof body !== "object" || Array.isArray(body)) return false;
	if (Object.keys(body).length === 0) return false;

	const requiredNumbers = ["bodysize", "breastsize", "bottomsize", "penissize", "ballssize"];
	if (!requiredNumbers.every(key => Number.isFinite(Number(body[key])))) return false;

	if (typeof body.facestyle !== "string" || body.facestyle.length === 0) return false;
	if (typeof body.facevariant !== "string" || body.facevariant.length === 0) return false;
	if (!["m", "f", "a"].includes(body.gender_body)) return false;
	if (typeof body.bodyshape !== "string" || body.bodyshape.length === 0) return false;
	if (!["m", "f"].includes(body.sex)) return false;

	return true;
}
window.xChangeBodySnapshotUsable = xChangeBodySnapshotUsable;

function xChangeSanitiseBodySnapshot(body, slotLabel = "body") {
	if (!body || typeof body !== "object" || Array.isArray(body)) return false;

	const player = V.player || {};
	const bad = [];
	const currentSex = ["m", "f"].includes(player.sex) ? player.sex : (["m", "f"].includes(player.gender) ? player.gender : "f");

	const setNumber = (key, fallback) => {
		const n = Number(body[key]);
		if (Number.isFinite(n)) {
			body[key] = n;
		} else {
			body[key] = fallback;
			bad.push(key);
		}
	};

	setNumber("bodysize", xChangeFiniteNumber(V.bodysize, 2));
	setNumber("breastsize", xChangeFiniteNumber(player.breastsize, 0));
	setNumber("bottomsize", xChangeFiniteNumber(player.bottomsize, 2));
	setNumber("penissize", xChangeFiniteNumber(player.penissize, 0));
	setNumber("ballssize", xChangeFiniteNumber(V.ballssize, 0));

	const setString = (key, fallback) => {
		if (typeof body[key] !== "string" || body[key].length === 0) {
			body[key] = fallback;
			bad.push(key);
		}
	};

	setString("facestyle", xChangeString(V.facestyle, "default"));
	setString("facevariant", xChangeString(V.facevariant, "default"));
	if (!["m", "f", "a"].includes(body.gender_body)) {
		body.gender_body = ["m", "f", "a"].includes(player.gender_body) ? player.gender_body : currentSex;
		bad.push("gender_body");
	}
	setString("bodyshape", xChangeString(player.bodyshape, body.gender_body === "f" ? "curvy" : "classic"));
	if (!["m", "f"].includes(body.sex)) {
		body.sex = currentSex;
		bad.push("sex");
	}

	if (typeof body.penisExist !== "boolean") body.penisExist = body.sex === "m" || body.penissize > 0;
	if (typeof body.ballsExist !== "boolean") body.ballsExist = body.penisExist && body.ballssize > 0;
	if (typeof body.vaginaExist !== "boolean") body.vaginaExist = body.sex === "f";

	body.penisuse = body.penisuse ?? V.penisuse ?? 0;
	body.penisstate = body.penisstate ?? V.penisstate ?? 0;
	body.vaginause = body.vaginause ?? V.vaginause ?? 0;
	body.vaginastate = body.vaginastate ?? V.vaginastate ?? 0;

	setString("leftEyeColour", xChangeString(V.leftEyeColour, "brown"));
	setString("rightEyeColour", xChangeString(V.rightEyeColour, body.leftEyeColour));
	setString("haircolour", xChangeString(V.haircolour, "brown"));
	body.hairColourGradient = body.hairColourGradient ?? V.hairColourGradient;
	body.hairColourStyle = body.hairColourStyle ?? V.hairColourStyle;
	setString("naturalhaircolour", xChangeString(V.naturalhaircolour, body.haircolour));
	setString("hairtype", xChangeString(V.hairtype, "short"));
	setString("hairfringecolour", xChangeString(V.hairfringecolour, body.haircolour));
	body.hairFringeColourGradient = body.hairFringeColourGradient ?? V.hairFringeColourGradient;
	body.hairFringeColourStyle = body.hairFringeColourStyle ?? V.hairFringeColourStyle;
	setString("fringetype", xChangeString(V.fringetype, "default"));
	setString("skinColor", xChangeString(player.skin?.color, "medium"));

	setNumber("hairlength", xChangeFiniteNumber(V.hairlength, 0));
	setNumber("fringelength", xChangeFiniteNumber(V.fringelength, 0));
	setNumber("semen_amount", xChangeFiniteNumber(V.semen_amount, 0));
	setNumber("milk_amount", xChangeFiniteNumber(V.milk_amount, 0));
	setNumber("semen_volume", xChangeFiniteNumber(V.semen_volume, 0));
	setNumber("milk_volume", xChangeFiniteNumber(V.milk_volume, 0));
	setNumber("beauty", xChangeFiniteNumber(V.beauty, 0));
	setNumber("penisgrowthtimer", xChangeFiniteNumber(V.penisgrowthtimer, 500));
	setNumber("bottomgrowthtimer", xChangeFiniteNumber(V.bottomgrowthtimer, 500));
	setNumber("breastgrowthtimer", xChangeFiniteNumber(V.breastgrowthtimer, 500));

	body.fame ??= V.fame ?? {};
	body.cool = xChangeFiniteNumber(body.cool, xChangeFiniteNumber(V.cool, 120));
	body.crime ??= V.crime ?? {};
	body.promiscuity = xChangeFiniteNumber(body.promiscuity, xChangeFiniteNumber(V.promiscuity, 0));
	body.exhibitionism = xChangeFiniteNumber(body.exhibitionism, xChangeFiniteNumber(V.exhibitionism, 0));
	body.deviancy = xChangeFiniteNumber(body.deviancy, xChangeFiniteNumber(V.deviancy, 0));

	if (bad.length) {
		xChangeRepairNoticeOnce(
			`repair_xchange_sanitise_body_${slotLabel}`,
			`<b>Save repair notice</b><br>X-Change repaired an incomplete cached body snapshot (<b>${slotLabel}</b>): ${bad.join(", ")}. This prevents undefined/NaN body values from breaking Characteristics, face, and body menus.<br><br><b>If you encounter any error after this, please report it with your save and steps.</b>`
		);
	}

	return true;
}
window.xChangeSanitiseBodySnapshot = xChangeSanitiseBodySnapshot;

function xChangeCachedBodyUsable(slotName) {
	const pill = V.xchange?.pill;
	if (!pill) return false;

	const prop = slotName === "genderswapped" ? "changedBody" : slotName === "herm" ? "hermBody" : slotName;
	const body = pill[prop];
	if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) return false;

	if (xChangeBodySnapshotUsable(body)) return true;

	// Transformed-body caches are expendable.  
	// If they are bad, regenerate them instead of loading a half-empty object over the current player body.
	if (prop === "changedBody" || prop === "hermBody") {
		pill[prop] = {};
		xChangeRepairNoticeOnce(
			`repair_xchange_discard_bad_${prop}`,
			`<b>Save repair notice</b><br>X-Change found an invalid cached transformed body (<b>${slotName}</b>) and discarded it. A fresh transformed body will be generated instead of loading broken size/face data.<br><br><b>If you encounter any error after this, please report it with your save and steps.</b>`
		);
		return false;
	}

	// Original-body cache cannot simply be thrown away during restore, so repair it.
	xChangeSanitiseBodySnapshot(body, slotName);
	return xChangeBodySnapshotUsable(body);
}
window.xChangeCachedBodyUsable = xChangeCachedBodyUsable;
setup.xChangeBodySnapshotUsable = xChangeBodySnapshotUsable;
setup.xChangeSanitiseBodySnapshot = xChangeSanitiseBodySnapshot;
setup.xChangeCachedBodyUsable = xChangeCachedBodyUsable;

function getAntiPillSensitivityBonus(part) {
	const anti = V.xchange?.antiPillSensitivity;
	if (!anti || typeof anti.hours !== "number" || anti.hours <= 0) return 0;

	const bonus = Number(anti.globalBonus);
	if (!Number.isFinite(bonus) || bonus <= 0) return 0;

	switch (part) {
		case "mouth":
			return bonus * 3;
		case "breast":
		case "breasts":
			return bonus * 3;
		case "bottom":
			return bonus * 3;
		case "anal":
		case "buttocks":
		case "genital":
		case "genitals":
			return bonus * 3;
		case "hands":
			return bonus * 3;
		case "thighs":
			return bonus * 3;
		case "feet":
			return bonus * 3;

		default:
			return 0;
	}
}
window.getAntiPillSensitivityBonus = getAntiPillSensitivityBonus;

function getGeneralSensitivity(part) {
	const antiPillMod = getAntiPillSensitivityBonus(part);
	return Math.clamp(1 + antiPillMod, 0.25, 6);
}
window.getGeneralSensitivity = getGeneralSensitivity;

function getSensitivity(part) {
	let purityMod = (1000 - V.purity) * V.xchange.impuritySensitivityBonus / 1000;
	const xchangeMod = playerIsXChanged()
		? (V.player.sex === "f" ? 1 : -1) * V.xchange.pillSensitivityChange
		: 0;
	const orgasmingMod = V.orgasmCum > 0 ? 1 : 0;
	const antiPillMod = getAntiPillSensitivityBonus(part);

	switch (part) {
		case "mouth":
			return Math.clamp(V.mouthsensitivity + antiPillMod, 0.25, 6);
		case "breast":
		case "breasts":
			return Math.clamp(V.breastsensitivity + purityMod + xchangeMod + orgasmingMod + antiPillMod, 0.25, 8);
		case "bottom":
			return Math.clamp(V.bottomsensitivity + purityMod + xchangeMod + orgasmingMod + antiPillMod, 0.25, 5);
		case "genital":
		case "genitals":
			return Math.clamp(V.genitalsensitivity + 2 * purityMod + xchangeMod + orgasmingMod + antiPillMod, 0.25, 12);
		default:
			paramError("getSensitivity", "part", part, "Expected a string, see function for accepted values");
			break;
	}
}
window.getSensitivity = getSensitivity;

function pleasure(amount, source) {
	if (isNaN(amount)) paramError("pleasure", "amount", amount, "Expected a number.");
		amount = Number(amount);
	const fragment = document.createDocumentFragment();

	if (amount) {
		let mod = 1; 

		// If currently under the refractory period post-orgasm, prevent arousal from raising.
		if (V.refractoryPeriod > 0 && amount > 0) {
			if (V.drugged > 0) {
				V.refractoryPeriod--;
				V.refractoryPeriodMessage = 2;
			}
			else {
				V.refractoryPeriodMessage = 1;
			}
			
			amount = 0;
			V.effectsmessage = 1;
		}

		// Trait checks & effects
		if (amount > 0 && V.orgasmtrait) mod *= 0.6;

		// adds up to +1 to the arousal modifier when suffocating
		if (V.choketrait) mod += (V.oxygenmax - V.oxygen) / V.oxygenmax;

		if (V.drugged > 0) {
			/*
				Multiplies the modifier by up to 2x at full bar
				Comment Akoz: I chose to make it multiply, rather than add to the modifier
				so that the aphrodisiacs become quite threatening during nonconsensual use,
				and more thrilling when used intentionally
			*/
			if (V.substanceRebalance == 1) {
				mod *= 1 + V.drugged / 250;
			} else {
				mod *= 1 + V.drugged / 1000;
			}
		}

		const beingPenetrated = ["penis", "penisdouble", "tentacle", "tentacledeep", "machine"];
		const penetrating = ["penetrated", "othervagina", "otheranus", "othermouth"];
		
		const playerIsBeingPenetrated =
			beingPenetrated.includes(V.vaginause) || beingPenetrated.includes(V.anususe) || [0,3].includes(V.portalPanties.state.vagina?.new) || [0,3].includes(V.portalPanties.state.anus?.new) || V.portalejacvagina || V.portalejacanus;

		const penisAddictionFulfilled = playerIsBeingPenetrated;
		const holeAddictionFulfilled = penetrating.includes(V.penisuse);

		// Apply effect according to source
		let sensitivity = 0;
		let pleasure;
		switch (source) {
			case undefined:
			case "masturbation":
			case "maso":
			case "other":
				// No modifier. The usual behaviour for this widget
				break;
			case "mouth":
			case "oral":
			case "lips":
			case "masturbationMouth":
			case "masturbationOral":
			case "kiss":
				sensitivity += getSensitivity("mouth"); 
				break;
			case "breast":
			case "breasts":
			case "chest":
			case "nipple":
			case "nipples":
			case "masturbationBreasts":
			case "masturbationNipples":
			case "chest_grope":
				sensitivity += getSensitivity("breast");
				fragment.append(wikifier("playWithBreasts"));
				if (playerIsPregnant()) sensitivity += 0.5;
				break;
			case "bottom":
			case "anus":
			case "anal":
			case "ass":
			case "butt":
			case "masturbationAnal":
			case "masturbationAss":
			case "bottom_grope":
				let analWetnessPenalty = 1;
				if (amount > 0 && beingPenetrated.includes(V.anusstate)) {
					statChange.pain(V.analPain || 0);
					analWetnessPenalty = Math.min(V.anusWetness/60, 1);
					if (V.penis_addict_trait === 1) sensitivity += 0.5;
				}
				sensitivity += getSensitivity("bottom");
				break;
			case "genital":
			case "genitals":
			case "penis":
			case "penile":
			case "pussy":
			case "vaginal":
			case "vagina":
			case "masturbationGenital":
			case "masturbationPenis":
			case "masturbationVagina":
			case "pussy_grope":
			case "penis_grope":
				let wetnessPenalty = 1;
				if (amount > 0 && V.player.vaginaExist === true && beingPenetrated.includes(V.vaginause)) {
					statChange.pain(V.vaginalPain);
					wetnessPenalty = Math.min(V.vaginaWetness/60, 1);
					if (V.penis_addict_trait === 1) sensitivity += 0.5;
				}
				sensitivity += getSensitivity("genital");
				if (playerIsPregnant()) sensitivity += 0.5;
				break;
			case "time":
				pleasure = Math.clamp(V.pleasure + amount * (amount > 0? mod : 1), 0, V.pleasuremax);
				if (V.trackedArousal.length > 4) {
					V.trackedArousal.deleteAt(0);
					V.trackedArousal[V.trackedArousal.length - 1] += (pleasure * pleasure) / (V.pleasuremax * 0.8);
				}
				V.trackedArousal.push(0);
				break;
			default:
				paramError("pleasure", "source", source, "Expected a string, see function for values");
				break;
		}

		// Adjusts modifier for body part sensitivity, if applicable
		if (amount > 0) {
			let sensitivityMod = (sensitivity - 1) ** 2 / 4;
			// Halve sensitivity boosts during chef job
			// todo: rebalance chef job better
			if (V.masturbation_bowl) sensitivityMod /= 2;
			mod += sensitivityMod;
		}

		if (amount > 0 && ((V.penis_addict_trait === 1 && !penisAddictionFulfilled) || (V.hole_addict_trait === 1 && !holeAddictionFulfilled))) {
			mod *= 0.6;
		}

		// Concentration reduces incoming arousal by half
		// Whilst failed concentration adds half a point of sensitivity to all incoming arousal
		if (V.xchange.resistCombatArousal === 1 && amount > 0) {
			mod *= 0.50;
		}
		else if (V.xchange.resistCombatArousal === -1 && amount > 0) {
			mod += 0.50;
		}

		// Reduce the mod if masturbating while in heat and/or rut
		if (source && source.includes("masturbation")) {
			mod *= 1 - Math.clamp(playerHeatMinArousal() + playerRutMinArousal(), 0, 4000) / 5000;
		}

		// Scale down stimulation according to current arousal
		mod *= V.arousal / V.arousalmax;

		let oldPleasure = V.pleasure;
		let pleasureChange = amount * (amount > 0? mod : 1) * (amount > 0? Weather.BodyTemperature.arousalModifier : 1);
		V.pleasure += pleasureChange;

		// Prevent orgasming unless addictions are fulfilled
		const addictionsUnmet =
			(V.penis_addict_trait === 1 && !penisAddictionFulfilled) ||
			(V.hole_addict_trait === 1 && !holeAddictionFulfilled);

		// If a breakthrough orgasm was already triggered, let it through until pleasure drops (orgasm processed).
		// Don't re-clamp.
		if (V.xchange.breakthroughOrgasm && V.pleasure >= V.pleasuremax * 4 / 5) {
			// Let it ride, orgasm processing will handle it
		} else if (V.xchange.breakthroughOrgasm && V.pleasure < V.pleasuremax * 4 / 5) {
			// Orgasm processed, clear the bypass
			delete V.xchange.breakthroughOrgasm;
		} else if (addictionsUnmet) {
			// Trait-aware toy detection: each addiction needs a DIFFERENT type of toy.
			// Penis addict ("getting railed") → insertive toys (things inside the player)
			// Hole addict ("get your cock into something") → enveloping toys (things around the penis)
			const usingSexToy = (() => {
				// Live action states from the masturbation system (actions.js):
				//   V.leftarm / V.rightarm  — current hand action ("mvaginadildo" = toy inside vagina, "mpenisstroker" = penis inside stroker, "mpickupdildo" = merely holding it)
				//   V.vaginause / V.anususe — "mdildopenetrate" = riding a toy on the floor
				//   V.penisuse              — "stroker" while the penis is inside a stroker
				// These only hold toy values while the toy is actually IN USE, so a toy that is merely carried in the inventory can never satisfy the check.

				// NOTE: deliberately NOT using V.currentToyLeft/Right/Vagina/Anus here those are indices into the carried-toys list,
				// are set the moment a toy is picked up, and can go stale; they don't prove anything is inserted.
				const arms = [V.leftarm, V.rightarm];

				// --- Penis Addict: needs something INSIDE the player ---
				if (V.penis_addict_trait === 1 && !penisAddictionFulfilled) {
					// Worn (inserted) butt plug
					try {
						if (typeof window.playerHasButtPlug === "function" && window.playerHasButtPlug()) return true;
						if (V.worn?.butt_plug?.name && !["none", "naked"].includes(String(V.worn.butt_plug.name).toLowerCase())) return true;
					} catch (e) {}

					// Worn insertive genital accessory (vibe/egg in the genitals slot)
					try {
						if (V.worn?.genitals?.name && !["none", "naked"].includes(String(V.worn.genitals.name).toLowerCase())) {
							if (/vibe|vibrator|bullet|egg/i.test(String(V.worn.genitals.name))) return true;
						}
					} catch (e) {}

					// Worn insertive toy from the sextoys inventory (worn = on/in the body; strap-ons are worn externally and excluded).
					// Carried alone never counts.
					try {
						const inv = V.player?.inventory?.sextoys;
						if (inv) {
							for (const category of Object.values(inv)) {
								if (!Array.isArray(category)) continue;
								for (const item of category) {
									if (!item?.worn || !Array.isArray(item.type)) continue;
									if (item.type.includes("strap-on")) continue;
									if (item.type.some(t => /vibrator|plug|bead|egg/i.test(String(t)))) return true;
								}
							}
						}
					} catch (e) {}

					// Hand-held toy actually inserted ("entrance" tease states don't count)
					if (arms.includes("mvaginadildo") || arms.includes("manusdildo")) return true;

					// Riding a toy placed on the floor
					if (V.vaginause === "mdildopenetrate" || V.anususe === "mdildopenetrate") return true;
				}

				// --- Hole Addict: needs the penis INSIDE something ---
				if (V.hole_addict_trait === 1 && !holeAddictionFulfilled && V.player?.penisExist) {
					if (V.penisuse === "stroker") return true;
					if (arms.includes("mpenisstroker")) return true;
				}

				return false;
			})();

			const cap = V.pleasuremax * 4 / 5 - 1;

			const showBlockedMsg = () => {
				V.effectsmessage = 1;
				V.sexual_addiction_message = 1;
			};

			if (usingSexToy) {
				// Soft gate: clamp to cap, with small chance of breakthrough orgasm
				if (V.pleasure > cap) V.pleasure = cap;

				if (V.pleasure >= cap) {
					const breakthroughChance = 10;
					const roll = Math.floor(Math.random() * 100) + 1;

					if (roll <= breakthroughChance) {
						// Real orgasm; hollow and unsatisfying, but it IS an orgasm.
						// Set bypass flag so subsequent pleasure() calls don't re-clamp.
						V.pleasure = V.pleasuremax;
						V.xchange = V.xchange || {};
						V.xchange.breakthroughOrgasm = true;
						V.effectsmessage = 1;
						V.sexual_addiction_toy_breakthrough_message = 1;
					} else {
						showBlockedMsg();
					}
				}
			} else {
				// Hard block without appropriate toy
				V.pleasure = Math.clamp(V.pleasure, 0, cap);
				if (V.pleasure === cap) showBlockedMsg();
			}
		}

		if (V.xchange.breederEdgingCount == null) V.xchange.breederEdgingCount = 0;
		if (V.xchange.breederEdgingStress == null) V.xchange.breederEdgingStress = 0;
	
		// Cannot orgasm under breeder unless there is actual internal semen, or a breeder-valid insemination event just occurred.
		const breederSatisfied = playerIsCreampied() || V.xchange.breederOrgasm || V.breederCreampied;
		if (playerIsXChanged() && V.xchange.pill?.breederEffect && !breederSatisfied && oldPleasure + pleasureChange >= V.pleasuremax * 4/5
		) {
			V.pleasure = Math.clamp(V.pleasure, 0, V.pleasuremax * 4/5 - 1); V.xchange.breederEdgingCount++;
		}

		if (V.xchange.breederEdgingCount > 10) {
			V.effectsmessage = 1;
			V.breederEdgingMessage = 1;
			V.xchange.breederDenial++;
			V.xchange.breederEdgingCount = 0;
			V.xchange.breederEdgingStress = Math.min(V.xchange.breederEdgingStress + 50, 800);
			fragment.append(wikifier("stress", V.xchange.breederEdgingStress, 1));
		}

		fragment.append(wikifier("arousal-moan", amount * (amount > 0? mod : 1) * (amount > 0? Weather.BodyTemperature.arousalModifier : 1), sensitivity));

		// Add to the tracker
		if (amount > 0) {
			V.trackedArousal[V.trackedArousal.length - 1] += Math.round(amount * (amount > 0? mod : 1));
			V.timeSinceArousal = 0;
		}

		V.pleasure = Math.max(V.pleasure, 0);

		return fragment;
	}
}
Macro.add("pleasure", {
	handler() {
		const fragment = pleasure(...this.args);
		this.output.append(fragment);
	},
});
window.pleasure = pleasure;

function getPleasure(passMinutes) {
	const minuteMultiplier = passMinutes * 10;
	let addedPleasure = 0;

	if (
		V.worn.genitals.name === "chastity parasite" ||
		(V.parasite.penis.name && V.parasite.penis.name === "parasite") ||
		(V.parasite.clit.name && V.parasite.clit.name === "parasite")
	) {
		if (!V.masturbating) {
			if (V.earSlime.corruption >= 100 && !V.earSlime.defyCooldown && !V.earSlime.vibration && !V.earSlime.event) {
				V.earSlime.lastVibration += passMinutes;
				if (V.earSlime.lastVibration > random(240, 720)) {
					V.earSlime.vibration = random(60, 120);
					V.earSlime.lastVibration = 0;
				}
			}
			if (V.earSlime.defyCooldown) {
				if (V.pain < 25) V.pain += Math.clamp(passMinutes, 0, 20 - Math.floor(V.pain));
				if (V.worn.genitals.name === "chastity parasite") {
					// Helps to reduce the penis size
					V.penisgrowthtimer += Math.floor(Math.clamp(passMinutes / 8, 0, (passMinutes * 60) / V.earSlime.defyCooldown));
				}
			} else if (V.earSlime.vibration > 0) {
				addedPleasure += Math.clamp(minuteMultiplier * 4, 0, V.earSlime.vibration * 40) * V.genitalsensitivity;
				V.earSlime.vibration -= Math.clamp(passMinutes, 0, V.earSlime.vibration);
				V.earSlime.lastVibration = Math.clamp(passMinutes - V.earSlime.vibration, 0, Infinity);
			}
		}
	} else {
		V.earSlime.vibration = 0;
		V.earSlime.lastVibration = 0;
	}

	return addedPleasure;
}

function updatePhysique() {
	// Vanilla physique ceiling per bodysize (indexed 0..4):
	//   -1: 3000 (extrapolated below),  0: 6000,  1: 8000,
	//    2: 10000, (2.5 -> 12000 via interpolation), 3: 14000, 4: 15000
	const physiquesizes = [6000, 8000, 10000, 14000, 15000];

	if (!V.xchange?.baseStats) return;
	if (typeof V.xchange.baseStats.physique !== "number") return;
	if (typeof V.xchange.baseStats.physiquesize !== "number") return;
	if (V.xchange.baseStats.physiquesize <= 0) return;

	const bs = V.bodysize;
	let ps = null;

	if (typeof bs === "number" && !Number.isNaN(bs)) {
		if (bs < 0) {
			// Vanilla anchors bs = -1 at 3000; extrapolate further-negative bs downward.
			const extraSteps = Math.max(0, Math.abs(Math.round(bs)) - 1);
			ps = Math.round(3000 * Math.pow(0.8, extraSteps));
		} else {
			const lastIdx = physiquesizes.length - 1;
			if (bs >= lastIdx) {
				// At or above top of the curve -> clamp (vanilla has no bs > 4 case).
				ps = physiquesizes[lastIdx];
			} else {
				const lo = Math.floor(bs);
				const hi = Math.ceil(bs);
				const t = bs - lo;
				ps = Math.round(physiquesizes[lo] + (physiquesizes[hi] - physiquesizes[lo]) * t);
			}
		}
	}

	if (typeof ps !== "number" || Number.isNaN(ps) || ps <= 0) return;
	V.physiquesize = ps;

	const pct = (typeof V.xchange.physiqueChangePercent === "number")
		? (V.xchange.physiqueChangePercent / 100)
		: 1;
	const genderMismatch =
		V.player?.gender != null && V.player?.sex != null && (V.player.gender !== V.player.sex);

	// Cheat target: convert desired final physique into baseStats.physique
	const target = V.xchange?.physiqueCheatTarget;
	if (typeof target === "number" && !Number.isNaN(target)) {
		const factor =
			(V.physiquesize / V.xchange.baseStats.physiquesize) *
			(genderMismatch ? pct : 1);

		if (factor > 0) {
			V.xchange.baseStats.physique = Math.max(0, Math.round(target / factor));
		}
	}

	V.physique = Math.round(
		V.xchange.baseStats.physique *
		(V.physiquesize / V.xchange.baseStats.physiquesize) *
		(genderMismatch ? pct : 1)
	);
}
window.updatePhysique = updatePhysique;

if (typeof updatePhysique === "function") updatePhysique();

function sumTalents() {
	return V.AMCTraits.skulduggery + V.AMCTraits.dancing + V.AMCTraits.swimming + V.AMCTraits.athletics + V.AMCTraits.tending + V.AMCTraits.housekeeping + V.AMCTraits.brawling + V.AMCTraits.footwork + V.AMCTraits.striking + V.AMCTraits.kicking + V.AMCTraits.science + V.AMCTraits.maths + V.AMCTraits.english + V.AMCTraits.history;
}
window.sumTalents = sumTalents;

function sumSexTalents() {
	return V.AMCTraits.seductionskill + V.AMCTraits.oralskill + V.AMCTraits.chestskill + V.AMCTraits.handskill + V.AMCTraits.bottomskill + V.AMCTraits.penileskill + V.AMCTraits.vaginalskill + V.AMCTraits.analskill + V.AMCTraits.thighskill + V.AMCTraits.feetskill;
}
window.sumSexTalents = sumSexTalents;

function playerIsXChanged() {
	return (
		V.xchange.pill && V.xchange.pill.active
	);
}
window.playerIsXChanged = playerIsXChanged;

function isNumber(value) {
	return typeof value == 'number' ||
	(isObjectLike(value) && baseGetTag(value) == numberTag);
}
window.isNumber = isNumber;

function pillTimerPaused() {
	let vaginalPregnancy = V.sexStats.vagina.pregnancy.type !== null;
	let earSlimeHasGrown = V.earSlime.growth > 50;
	return V.xchange.pillPermanence !== 1 && (vaginalPregnancy || earSlimeHasGrown);
}
window.pillTimerPaused = pillTimerPaused;

function pillIsPermanent() {
	return V.xchange.pill.duration <= -1;
}
window.pillIsPermanent = pillIsPermanent;

/* Hyper Fertility is an X-Change pill effect, not a separate medicine timer.
 * While $xchange.pill.hyperFertilityEffect is true, PC-carried pregnancies advance faster and PC-caused conceptions can roll twins/triplets/quads.
 */
setup.xchangeHyperFertility = Object.assign(
	{
		speedMultiplier: 6,
		twinChance: 80,
		tripletChance: 50,
		quadChance: 30,
		accelerateParasites: false,
	},
	setup.xchangeHyperFertility || {}
);

function xchangeHyperFertilityActive() {
	return !!(V.xchange?.pill?.active && V.xchange.pill.hyperFertilityEffect);
}
window.xchangeHyperFertilityActive = xchangeHyperFertilityActive;

// xchangeHyperFertilityActive() is whether the effect is on the pill (still true during a flashback / hopeless cycle).
// This gate decides whether the effect should *apply right now*: never during statFreeze or hopeless cycle, so those sequences can't trigger conception/acceleration. 
// The instant-conception roll fires at insemination and would otherwise bypass the time system that statFreeze halts. 
// Off if EITHER state is set.
function fertilityTreatmentActive() {
	return xchangeHyperFertilityActive() && !V.statFreeze && !V.hc;
}
window.fertilityTreatmentActive = fertilityTreatmentActive;

function takeFertilityTreatment() {
	if (V.xchange?.pill?.active) V.xchange.pill.hyperFertilityEffect = true;
	return true;
}
window.takeFertilityTreatment = takeFertilityTreatment;

function cancelFertilityTreatment() {
	if (V.xchange?.pill) V.xchange.pill.hyperFertilityEffect = false;
	return true;
}
window.cancelFertilityTreatment = cancelFertilityTreatment;

function fertilityTreatmentApplyMultiples(baseCount, max = 4) {
	if (!fertilityTreatmentActive()) return baseCount;
	const cfg = setup.xchangeHyperFertility;
	let count = baseCount;

	if (count >= 1 && count < 2 && random(1, 100) <= cfg.twinChance) count = 2;
	if (count >= 2 && count < 3 && random(1, 100) <= cfg.tripletChance) count = 3;
	if (count >= 3 && count < 4 && random(1, 100) <= cfg.quadChance) count = 4;

	return Math.min(count, max);
}
window.fertilityTreatmentApplyMultiples = fertilityTreatmentApplyMultiples;

function xchangePregnancyDailyRate(type) {
	const s = V.settings || {};
	switch (type) {
		case "human": {
			const months = Number(s.humanPregnancyMonths);
			return months > 0 ? 9 / months : 1;
		}
		case "wolf": {
			const weeks = Number(s.wolfPregnancyWeeks);
			return weeks > 0 ? 12 / weeks : 1;
		}
		default:
			return 1;
	}
}

function fertilityTreatmentDailyTick(days = 1) {
	if (!fertilityTreatmentActive()) return;
	const cfg = setup.xchangeHyperFertility;
	const extraFactor = Math.max(0, cfg.speedMultiplier - 1);
	const stats = V.sexStats;
	if (!stats) return;

	["vagina", "anus"].forEach(genital => {
		const preg = stats[genital]?.pregnancy;
		if (!preg?.type) return;

		if (preg.type === "parasite") {
			if (!cfg.accelerateParasites || !Array.isArray(preg.fetus)) return;
			preg.fetus.forEach(fetus => {
				if (typeof fetus?.daysLeft === "number") fetus.daysLeft = Math.max(0, fetus.daysLeft - extraFactor * days);
			});
			return;
		}

		if (typeof preg.timer === "number" && typeof preg.timerEnd === "number") {
			const extra = extraFactor * xchangePregnancyDailyRate(preg.type) * days;
			preg.timer = Math.min(preg.timer + extra, preg.timerEnd);
		}
	});
}
window.fertilityTreatmentDailyTick = fertilityTreatmentDailyTick;

function fertilityTreatmentDurationText() {
	return fertilityTreatmentActive() ? "Lasts with the X-Change pill" : "Not active";
}
window.fertilityTreatmentDurationText = fertilityTreatmentDurationText;

function wondersAboutPillEnd() {
	return V.xchange.pill.shouldHaveEnded === true && V.xchange.pill.countdown < 24; 
}
window.wondersAboutPillEnd = wondersAboutPillEnd;

function playerIsCreampied() {
	return V.sexStats.vagina.sperm.length > 0 || V.player.bodyliquid.vagina.semen > 0 || V.player.bodyliquid.vagina.nectar > 0;
}
window.playerIsCreampied = playerIsCreampied;

function playerMayBeSpiked() {
	return V.xchange.nonconEnabled === 1 && ((!playerIsXChanged() && !playerIsPregnant()) || playerIsXChanged());
}
window.playerMayBeSpiked = playerMayBeSpiked;

function updateRemoverPillCatalogue() {
	V.xchange ??= {}; const antiTypes = [];

	for (const pill of setup.pills ?? []) {
		if (!pill || pill.type !== "xchange" || pill.subtype !== "anti-pill") continue; if (typeof pill.name !== "string") continue;
		const match = pill.name.match(/^SWP Anti-(.+) Pill$/); if (!match) continue;
		const type = match[1]; antiTypes.push(type);
	}

	const filtered = antiTypes.filter(type => {if (type === "portal" && !V.portalPantiesEnabled) return false; return true;});
	const uniqueTypes = [...new Set(filtered)];
	const shownTypes = 2;
	const stockPerType = 1;

	V.xchange.removerPillCatalogue = [];

	const pool = [...uniqueTypes];
	const picks = Math.min(shownTypes, pool.length);

	for (let i = 0; i < picks; i++) {
		const type = pool.pluck(); // random unique pick
		for (let j = 0; j < stockPerType; j++) {V.xchange.removerPillCatalogue.push(type);}
	}
}
window.updateRemoverPillCatalogue = updateRemoverPillCatalogue;

function xchangeXtendGrowth(target, spermOwner, spermType) {
	if (target !== "pc" || spermType !== "human") return;

	const pill = V.xchange?.pill;
	if (!pill?.active || !pill.xtendEffect) return;
	if (!pill.originalBody || typeof pill.originalBody.penissize !== "number") return;
	if (!pill.xtendTracker || typeof pill.xtendTracker.penisSizeGains !== "number") return;
	if (!spermOwner || typeof spermOwner.penissize !== "number") return;

	if ((pill.originalBody.penissize - 2) + Math.floor(pill.xtendTracker.penisSizeGains / 1000) < spermOwner.penissize) {
		pill.xtendTracker.penisSizeGains += 250 + Math.random() * 250;
		V.xtendMessage = 1;
	}
	else {
		V.xtendMessage = 6;
	}
	V.effectsmessage = 1;
}
window.xchangeXtendGrowth = xchangeXtendGrowth;

function xchangeTimePassedCheck(minutes = 1) {
	
	if (V.arousal >= V.arousalmax * 2/5) 
		wikifier("willpower-spending", minutes * 0.5 * Math.ceil( (V.arousal - V.arousalmax*2/5) / (V.arousalmax/10) ));
	else if (V.xchange.willpowerPoints < V.willpower * 0.5) 
		wikifier("willpower-recovery", minutes * 0.5 * Math.ceil( (V.arousalmax*2/5 - V.arousal) / (V.arousalmax/10) ));
	
	if (V.drugged > 200 && V.arousal < V.arousalmax * 4/5) 
		wikifier("arousal", (V.drugged / 10) * 3 * minutes);
	else if (V.drugged > 100 && V.arousal < V.arousalmax * 3/5) 
		wikifier("arousal", (V.drugged / 10) * 2 * minutes);
	else if (V.drugged > 0 && V.arousal < V.arousalmax * 2/5)
		wikifier("arousal", (V.drugged / 10) * minutes);

	wikifier("blackmail-timepassed");

	// Portal Panties
	wikifier("portalPantiesPass", minutes);

	// Pub: pubtimer is valid only if it's >= 1; otherwise it should not exist.
	if (V.xchange) {
		const n = Number(V.xchange.pubtimer);

		// If it's missing, do nothing (inactive).
		if (V.xchange.pubtimer === undefined) {
			// no-op
		}
		// If it exists but isn't a valid number, delete it.
		else if (!Number.isFinite(n)) {
			delete V.xchange.pubtimer;
		}
		// Otherwise tick it down by minutes; delete when it expires.
		else {
			const next = n - minutes;
			if (next < 1) delete V.xchange.pubtimer;
			else V.xchange.pubtimer = next;
		}
	}
}
window.xchangeTimePassedCheck = xchangeTimePassedCheck;

function xchangeWeeklyCheck(weeks = 1) {
	if (!V.statFreeze) {
		if (V.xchange.pubGamblingEnabled && !V.weekly.gamblingUpkeepPaid) {
			V.xchange.gamblingUpkeepFailed = 1;
			V.xchange.pubGamblingEnabled = 0;
	
			if (V.location != "prison") {
				wikifier("crimeUp", 3000, "obstruction");
				wikifier("crimeUpFlat", V.xchange.gamblingEarnings, "thievery");
		
				V.gamblingUpkeepFailedMessage = 1;
				V.effectsmessage = 1;
			}
		}
	}

	// 1 - 0b001: Suspicious Pills Dealer
	// 2 - 0b010: Portal Pill Dealer
	// 4 - 0b100: Effect Remover Pill Dealer
	const dealerOdds = [1, 2, 4];
	V.xchange.weeklyShadyDealer = dealerOdds.pluck() | dealerOdds.pluck();
}
window.xchangeWeeklyCheck = xchangeWeeklyCheck;

function xchangeDailyCheck(days = 1) {
	if (!V.statFreeze) {
		const useIdentityMeterDrift = !!(V.xchange?.genderIdentityEnabled);
		if (!useIdentityMeterDrift) {
			if ((V.hourlyFemininity > 0 && V.player.gender === "f") || (V.hourlyFemininity < 0 && V.player.gender === "m"))
				wikifier("genderidentity", 1 * days);
			else if ((V.hourlyFemininity > 0 && V.player.gender === "m") || (V.hourlyFemininity < 0 && V.player.gender === "f"))
				wikifier("genderidentity", -1 * days);
		
			if (playerIsXChanged())
				wikifier("genderidentity", -2 * days);
		
			V.effectsmessage = 1;
			V.genderIdentityMessage = V.hourlyFemininity > 0 ? "f" : (V.hourlyFemininity < 0 ? "m" : 0);
		}
		V.hourlyFemininity = 0;
	
		wikifier("blackmail-daypassed");
	
		V.recentmolest = Math.max(V.recentmolest - 1 * days, 0);
		V.recentrape = Math.max(V.recentrape - 1 * days, 0);
	
		if (V.robinbreakupCooldown > 0) {
			V.robinbreakupCooldown -= 1 * days;
		}
	
		V.xchange.blackmailHalt = Math.max(0, V.xchange.blackmailHalt - 1 * days);
				
		wikifier("dailyIdentityEffects");

		const isTrans = !!(V.background && V.background.transgender);

		try {
			const refl = V.xchange?.permaReflection;
			const today = (typeof Time !== "undefined" && Time && typeof Time.days === "number") ? Time.days : 0;
			if (isTrans && refl && refl.pending && !refl.answer && pillIsPermanent() && today > (refl.lastShownDay ?? -1)) {
				V.xchangePermaReflectionMessage = 1;
				V.effectsmessage = 1;
			}
		} catch (e) { /* defensive: never let scheduling break the daily tick */ }

		try {
			const refl2 = V.xchange?.permaReflection;
			if (isTrans && refl2 && refl2.answer && pillIsPermanent()) {
				if (refl2.answer === "no") {
					wikifier("stress", 5 * days);
					wikifier("trauma", 5 * days);
				} else if (refl2.answer === "yes") {
					wikifier("stress", -5 * days);
				}
			}
		} catch (e) { /* defensive */ }
	}

	// Effect Remover Pill Dealer now restocks daily instead of weekly, but availability stays in weekly check.
	if (V.xchange?.weeklyShadyDealer & 4) {updateRemoverPillCatalogue();}

	// Hyper Fertility: accelerate PC-carried pregnancies while the X-Change effect is active.
	if (typeof fertilityTreatmentDailyTick === "function") fertilityTreatmentDailyTick(days);
}
window.xchangeDailyCheck = xchangeDailyCheck;

function xchangeHourlyCheck(hours = 1) {
	if (!V.statFreeze) {
		const pill = V.xchange.pill;
		if (pill?.active)
		{
			// Tick the pill's duration down if the pill isn't permanent
			if (!pillIsPermanent()) pill.duration = Math.max(pill.duration - 1 * hours, 0);
	
			// Clamp the pill duration to only ever save up to 30 days (in particular for Continue pills)
			if (pill.continueEffect)
				pill.duration = Math.min(pill.duration, 30*24);
			
			// If the pill has the continue effect, and a remaining duration of 30 days is accumulated
			// then, the change becomes permanent
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && pill.continueEffect && pill.duration >= 30 * 24)
				wikifier("xchange-setpermanent");

			// If got impregnated in the vagina, or allowed an ear slime to grow to a certain point
			// then, the change becomes permanent 
			if (V.xchange.pillPermanence === 1 && !pillIsPermanent() && (V.sexStats.vagina.pregnancy.type !== null || V.earSlime.growth > 50))
				wikifier("xchange-setpermanent");

			if (pill.innocenceEffect && (V.innocencestate !== 1 || V.awareness >= 0)) {
				pill.innocenceEffect = false;
			}

			// Check if the pill should expire
			if (pill.duration == 0)
			{
				pill.shouldHaveEnded = true;

				if (!pillIsPermanent() && !pillTimerPaused() && pill.resistanceEffect && random(0,100) > pill.resistanceChance) {
					if (V.xchange.pillPermanence === 1) wikifier("xchange-setpermanent");
					else {
						pill.duration += Math.max(1, V.xchange.resistanceDaysPenalty) * 24;
						pill.resistanceEffect = false;
						pill.fertile = true;
						pill.resistanceFakeout = true;
					}
				}
				else if (!pillIsPermanent() && !pillTimerPaused()) {
					if (V.xchange.pill.clone === "none") {
						wikifier("xchange-restore");
					} 
					else {
						wikifier("xchange-restore", "nosave");
					}
				}
			} 
			
			// Force the pill to expire if pill permanence is disabled, and no condition is preventing it from expiring
			else if (V.xchange.pillPermanence !== 1 && pillIsPermanent() && !V.xchange.pill.choiceEffect) {
				pill.duration = 0;
				if (!pillTimerPaused()) {
					if (V.xchange.pill.clone === "none") {
						wikifier("xchange-restore");
					} 
					else {
						wikifier("xchange-restore", "nosave");
					}
				}
			}

			// Progress the fakeout timer for as long as the "should have ended" flag stands, else reset it.
			if (pill.shouldHaveEnded) 
				pill.countdown += 1 * hours;
			else
				pill.countdown = 0;

			// Reveal that you didn't turn back
			if (pill.shouldHaveEnded && !wondersAboutPillEnd()) {
				V.xchangePermanenceMessage = 1;
				delete pill.shouldHaveEnded; 
			}

			// Drop the resistance facade when the uncertain period has expired
			if (pill.resistanceFakeout === true && !wondersAboutPillEnd()) {
				delete pill.resistanceFakeout;
				delete pill.shouldHaveEnded;
			}
		}

		// Tick hypersensitivity side-effect timer
		if (V.xchange?.antiPillSensitivity && typeof V.xchange.antiPillSensitivity.hours === "number") {
			V.xchange.antiPillSensitivity.hours = Math.max(V.xchange.antiPillSensitivity.hours - 1 * hours, 0);
			if (V.xchange.antiPillSensitivity.hours === 0) {
				const endSource = V.xchange.antiPillSensitivity.source || "generic";
				delete V.xchange.antiPillSensitivity;
				V.effectsmessage = 1;
				V.antiPillSensitivityEndMessage = endSource;
			}
		}		

		// Apply hour-random passion effect
		for (let i = 0; i < hours; i++) {
			if (pill?.passionEffect && ((V.substanceRebalance == 1 && random(0,10) == 0) || random(0,8) == 0)) {
				wikifier("drugs", V.substanceRebalance == 1? 120 : 200); 
				V.effectsmessage = 1;
				V.xchange_passion_message = 1;
			}
		}
		
		// Tick portal effect timer, and end the effect if timer lapses
		if (pill?.portalEffect && pill?.portalEffectTimer >= 0) {
			pill.portalEffectTimer = Math.max(pill.portalEffectTimer - 1 * hours, 0);
			if (pill.portalEffectTimer === 0) {
				pill.portalEffect = false;
			}
		}
		wikifier("hourlyIdentityEffects");
	}
	npcXChangeHourlyCheck(hours);
}
window.xchangeHourlyCheck = xchangeHourlyCheck;

function xchangeEffectsMessages() {
	const fragment = document.createDocumentFragment();
	const element = (element, text, colour) => {
		const result = document.createElement(element);
		if (colour) result.classList.add(colour);
		result.textContent = text + " ";
		fragment.append(result);
	};
	const br = () => fragment.append(document.createElement("br"));

	if (V.hermSaveWarningMessage) {
		element("span", "WARNING:", "yellow");
		element("span", "You've just loaded a save file featuring a character of unsupported sex or gender (quite likely a Vanilla herm). You've been forcefully turned into the available one to attempt to keep the mod's systems working, but proceeding from here onward is entirely ill-adviced and if you run into odd behaviour, that is expected.", "red"); br(); br();
		delete V.hermSaveWarningMessage;
	}

	if (V.identityWarningMessage) {
		if (V.identity.init < 2 && !(V.background && V.background.transgender)) {
			element("span", "WARNING:", "yellow");
			element("span", "You haven't locked in your identity preferences yet. Please, head to your room and into Gameplay Settings > Modded Settings > Identity Settings, and check the box at the bottom that says 'Lock Choices'. Make sure to review your character's identity preferences before saving your settings.", "red"); br(); br();
		}
		delete V.identityWarningMessage;
	}

	if (V.genderIdentityMessage) {
		fragment.append(wikifier("genderidentity-text", V.genderIdentityMessage));
		delete V.genderIdentityMessage;
	}

	if (V.gamblingUpkeepFailedMessage) {
		element("span", "The cops didn't receive their bribe this week. Your gambling ring has been raided.", "purple");
		fragment.append(wikifier("gggcrime", "thievery"));
		br();
		delete V.gamblingUpkeepFailedMessage;
	}

	if (V.xchange_passion_message) {
		element("span", `Aphrodisiacs have been released into your bloodstream.`, "pink"); br();
		delete V.xchange_passion_message;
	}

	if (V.xchangeFameMessage) {
		element("span", "People have been gossiping about your X-Change escapades, and even the law has fully caught on."); br();
		element("span", "You no longer benefit from having two identities.", "red");
		delete V.xchangeFameMessage;
	}

	if (V.antiPillSensitivityMessage) {
		switch (V.antiPillSensitivityMessage) {
			case "suspicious":
				element("span", "The suspicious pill goes wrong; it leaves your skin itchy to the point of pain and oversensitive.", "pink"); br();
				break;
			case "antipill":
				element("span", "The anti-pill reacts badly; your skin turns itchy to the point of pain and oversensitive.", "pink"); br();
				break;
			case "dumbbitch":
				element("span", "The pill does more than dull your wits; it leaves your skin itchy to the point of pain and oversensitive.", "pink"); br();
				break;
			default:
				element("span", "The pill goes wrong; it leaves your skin itchy to the point of pain and oversensitive.", "pink"); br();
		}
		delete V.antiPillSensitivityMessage;
	}

	if (V.antiPillSensitivityEndMessage) {
		switch (V.antiPillSensitivityEndMessage) {
			case "suspicious":
				element("span", "The suspicious pill's itchy, painful hypersensitivity finally fades.", "blue"); br();
				break;
			case "antipill":
				element("span", "The anti-pill's itchy, painful hypersensitivity finally fades.", "blue"); br();
				break;
			case "dumbbitch":
				element("span", "The pill's itchy, painful hypersensitivity finally fades.", "blue"); br();
				break;
			default:
				element("span", "The botched pill's itchy, painful hypersensitivity finally fades.", "blue"); br();
		}
		delete V.antiPillSensitivityEndMessage;
	}

	if (V.alcoholToleranceMessage) {
		switch (V.alcoholToleranceMessage) {
			case "developing":
				element("span", "Your body is starting to adapt to being drunk.", "pink"); br();
				break;
			case "moderate":
				element("span", "Drunkenness has become something your body recognises.", "blue"); br();
				break;
			case "high":
				element("span", "You've developed a strong tolerance to intoxication.", "green"); br();
				break;
			case "full":
				element("span", "Your body has fully adapted to being drunk.", "gold"); br();
				break;
			case "withdrawal":
				element("span", "Without anything fogging your head, your nerves feel restless.", "red"); br();
				break;
			case "fading":
				element("span", "Without getting drunk regularly, your body's adaptation is beginning to fade.", "blue"); br();
				break;
			case "recovered":
				element("span", "Your body has fully recovered from chronic drunkenness.", "green"); br();
				break;
		}
		delete V.alcoholToleranceMessage;
	}

	if (V.xchangePermanenceMessage) {
		const vaginalPregnancy = V.sexStats?.vagina?.pregnancy?.type !== null && V.sexStats?.vagina?.pregnancy?.type !== undefined;

		if (V.xchange.pillPermanence === 1) {
			element("span", "Seems you didn't turn back. Your pill's effects have become permanent", "red"); br();
		}
		else if (vaginalPregnancy && typeof pillTimerPaused === "function" && pillTimerPaused()) {
			element("span", "Seems you didn't turn back. The life growing inside you holds the changes in place.", "red"); br();
		}
		else {
			element("span", "Seems you didn't turn back...", "red"); br();
		}
		delete V.xchangePermanenceMessage;
	}

	if (V.xchangePermaReflectionMessage) {
		try {
			const isTrans = !!(V.background && V.background.transgender);
			if (isTrans && pillIsPermanent() && V.xchange?.permaReflection?.pending && !V.xchange.permaReflection.answer) {
				fragment.append(wikifier("perma-reflection-prompt"));
				if (V.xchange.permaReflection) {
					V.xchange.permaReflection.lastShownDay =
						(typeof Time !== "undefined" && Time && typeof Time.days === "number") ? Time.days : 0;
				}
			}
		} catch (e) { /* defensive */ }
		delete V.xchangePermaReflectionMessage;
	}

	try {
		const isTrans = !!(V.background && V.background.transgender);
		if (isTrans && pillIsPermanent() && V.xchange?.permaReflection?.answer) {
			fragment.append(wikifier("perma-reflection-daily-reminder"));
		}
	} catch (e) { /* defensive */ }

	switch (V.xchangeRestoreMessage) {
		case 1:
			element("span", "Your body twists and turns as it returns to its original form.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 2:
			element("span", "Despite having climaxed under the effects of Resistance, the pill did not become permanent.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		case 3:
			element("span", "The pill's effects should be running out right about now.", "blue"); br();
			delete V.xchangeRestoreMessage;
			break;
		default:
			break;
	}

	switch (V.genderificationStressMessage) {
		case 1:
			element("span", "You have an urge to dress cute.", "purple");
			fragment.append(wikifier("gggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 2:
			element("span", "You are feeling cute and refreshed with your outfit.", "light-pink");
			fragment.append(wikifier("lstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		case 3:
			element("span", "You have an urge to dress more manly.", "purple");
			fragment.append(wikifier("gggstress")); br();
			delete V.genderificationStressMessage;
			break;
		case 4:
			element("span", "You are feeling manly and vigourous in your fit.", "blue");
			fragment.append(wikifier("lstress")); fragment.append(wikifier("ltiredness")); br();
			delete V.genderificationStressMessage;
			break;
		default:
			break;
	}

	switch (V.genderStressMessage) {
		case 1:
			element("span", "You feel awkward dressed up girly like this.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderStressMessage;
			break;
		case 2:
			element("span", "You feel gross in these girly clothes.", "red");
			fragment.append(wikifier("gggstress")); br();
			delete V.genderStressMessage;
			break;
		case 3:
			element("span", "You feel awkward dressed up boyish like this.", "purple");
			fragment.append(wikifier("ggstress")); br();
			delete V.genderStressMessage;
			break;
		case 4:
			element("span", "You feel gross in these boyish clothes.", "red");
			fragment.append(wikifier("gggstress")); br();
			delete V.genderStressMessage;
			break;
		default:
			break;
	}

	if (V.giDriftMessage) {
		element("span", V.giDriftMessage, "purple"); br();
		delete V.giDriftMessage;
	}

	if (V.breastSensitiveRubMessage) {
		if (!V.worn.under_upper.type.includes("naked") && V.worn.under_upper.exposed < 2) {
			wikifier("breastsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}nipples are rubbing against your ${V.worn.under_upper.name}.`, "pink");
		}
		else {
			wikifier("breastsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}nipples are rubbing against your ${V.worn.upper.name}.`, "pink");
		}
		br();
		delete V.breastSensitiveRubMessage;
	}

	if (V.genitalSensitiveRubMessage) {
		if (!V.worn.under_lower.type.includes("naked") && V.worn.under_lower.exposed < 2) {
			wikifier("genitalsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}${V.player.penisExist? "penis" : "clit"} is rubbing against your ${V.worn.under_lower.name}.`, "pink");
		}
		else {
			wikifier("genitalsensitivity");
			element("span", `Your ${T.text_output2 ?? " "}${V.player.penisExist? "penis" : "clit"} is rubbing against your ${V.worn.lower.name}.`, "pink");
		}
		br();
		delete V.genitalSensitiveRubMessage;
	}

	if (V.breederEdgingMessage) {
		element("span", "Your body refuses to cum like this.", "purple"); 
		element("span", "You crave some thick gooey semen in your "+ either("pussy.","vagina."), "red");
		if ((V.xchange.breederEdgingStress ?? 0) > 400)
			fragment.append(wikifier("ggstress"));
		else
			fragment.append(wikifier("gstress")); 
		
		br();

		delete V.breederEdgingMessage;
	}

	if (V.sexual_addiction_toy_breakthrough_message) {
		element("span", "The toy pushes you over the edge, and your body finally gives in.", "purple");
		element("span", "The orgasm washes through you, but it feels hollow; your body craves the real thing.", "blue");
		fragment.append(wikifier("ggstress"));
		fragment.append(wikifier("stress", 15));
		br();

		delete V.sexual_addiction_toy_breakthrough_message;
	}

	if (V.sexual_addiction_message) {
		element("span", "Your body refuses to cum like this.", "purple"); 
		if (V.penis_addict_trait === 1 && V.hole_addict_trait === 1) 
			element("span", "You need real sex! Doesn't matter who does the fucking.", "red");
		else if (V.penis_addict_trait === 1)
			element("span", "You need dick, and you need it deep inside you. Now!", "red");
		else if (V.hole_addict_trait === 1 && V.player.penisExist)
			element("span", "Your dick craves some pussy, and it demands it now!", "red");
		else if (V.hole_addict_trait === 1 && !V.player.penisExist)
			element("span", "You miss the feeling of some pussy on your dick.", "red");
		
		br();

		delete V.sexual_addiction_message;
	}

	if (V.xtendMessage) {
		switch (V.xtendMessage) {
			case 1:
				element("span", "Your body accepts the new genetic code.", "gold");
				element("span", "Your penis will be larger when you turn back.", "green");
				break;
			case 2:
				element("span", "You just lost all your penis size gains! And your dick will be smaller when you turn back.", "red");
				break;
			case 3:
				element("span", "Your original body's dick just shrank even further.", "red");
				break;
			case 4:
				element("span", V.options.showExactMeasurements? `Your dick shrank by ${V.xtendMessageValue}cm.` : "Your dick is smaller than it used to be.", "red");
				break;
			case 5:
				element("span", V.options.showExactMeasurements? `Your dick grew by ${V.xtendMessageValue}cm.` : "Your dick is larger than it used to be.", "green");
				break;
			case 6:
				element("span", "That genetic material was of inferior quality.", "gold");
				element("span", "Your projected penis size remains unchanged.", "blue"); 
				break;
			default:
				break;
		}
		br();
		delete V.xtendMessage;
		delete V.xtendMessageValue;
	}

	if (V.dumbBitchOrgasmMessage) {
		element("span", "Your orgasm is frying your brain.", "red"); 
		fragment.append(wikifier("llstress"));
		fragment.append(wikifier("lwillpower"));
		if (V.dumbBitchOrgasmMessage === 1) {
			element("span", "|",);
			element("span", "- School Grades", "red");
			br();
		}
		if (V.dumbBitchOrgasmMessage === 2) {
			element("span", 
				either(
					"Lockpicking is now like... just so hard or something.",
					"Everyone seems like... so trustworthy now.",
					"Malice?... Like... what's that?"
				), 
			"red");
			fragment.append(wikifier("lskulduggery"));
			br();
		}
		else if (V.dumbBitchOrgasmMessage === 3) {
			element("span", 
				either(
					"Everyone's so nice... Like, you should totally fuck more.",
					"Sex is like... so yummy right now. You want it all.",
					"You want to, like... feel g- good-er? Better? Oh just fuck~"
				), 
			"lewd");
			element("span", "|",);
			element("span", "+ Lewdness", "lewd");
			br();
		}
		br();
		delete V.dumbBitchOrgasmMessage;
	}

	if (V.refractoryPeriodMessage) {
		element("span", "Your body is still recovering from your last orgasm.", "blue"); br();
		delete V.refractoryPeriodMessage;
	}

	if (V.dysphoriaReasonMessage) {
		const msgs = Array.isArray(V.dysphoriaReasonMessage)
			? V.dysphoriaReasonMessage
			: [V.dysphoriaReasonMessage];

		for (const msg of msgs) {
			if (typeof msg === "string" && msg.trim().length) {
				element("span", msg, "purple");
				br();
			}
		}

		delete V.dysphoriaReasonMessage;
	}

	if (V.dysphoriaMessage) {
		element("span", "You suffer from dysphoria.", "purple"); br();
		delete V.dysphoriaMessage;
	}

	if (V.dysphoriaProcessingMessage) {
		element("span", "You're slowly processing how you feel about your current self.", "blue"); 
		fragment.append(wikifier("lwillpower"));
		br();
		delete V.dysphoriaProcessingMessage;
	}

	if (V.identityAcceptanceMessage) {
		element("span", "You have learned to embrace a new aspect of yourself.", "green"); br();
		delete V.identityAcceptanceMessage;
	}
	if (Array.isArray(V.giBodyChangeMessages) && V.giBodyChangeMessages.length) {
		for (const msg of V.giBodyChangeMessages) {
			if (typeof msg === "string" && msg.trim().length) {
				element("span", msg, "gold");
				br();
			}
		}
		delete V.giBodyChangeMessages;
	}


	if (V.breakdownMessage) {
		element("span", "The dysphoria has become too much.", "purple"); 
		element("span", "You begrudgingly surrender yourself to being this way.", "red"); 
		fragment.append(wikifier("lllwillpower"));
		br();
		delete V.breakdownMessage;
	}

	if (V.breakdownEndMessage) {
		element("span", "You recover from your begrudging acceptance.", "green"); br();
		delete V.breakdownEndMessage;
	}

	if (V.suspiciousPillDebuffMessage) {
		const skills = V.suspiciousPillDebuffMessage;
		element("span", "Something went wrong with the suspicious pill.", "red"); br();
		element("span", `The botched transformation has weakened your ${skills.join(", ")}.`, "purple"); br();
		delete V.suspiciousPillDebuffMessage;
	}

	if (V.xchange?.chastityAdaptedMessage) {
		if (V.xchange.chastityAdaptedMessage === "feminize") {
			element("span", "You feel your chastity device shift and reshape around your new anatomy, enclosing your new sex tightly.", "teal"); br();
		} else if (V.xchange.chastityAdaptedMessage === "butchify") {
			element("span", "You feel your chastity device constrict and reform into a cage around your new anatomy, locking your new sex in place.", "teal"); br();
		}
		delete V.xchange.chastityAdaptedMessage;
	}

	return fragment;
}
window.xchangeEffectsMessages = xchangeEffectsMessages;
