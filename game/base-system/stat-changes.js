/* global statDisplay chastityConsensual calmorylDissociationActive antidepressantActive sleepAidSuppressesInsomnia sleepAidWithdrawal */

const statChange = (() => {
	function paramError(functionName = "", param = "", value, expectedValues = "") {
		if (typeof value === "object") value = JSON.stringify(value);
		/* Included both types of error reporting, since this often will only occur in a link */
		Errors.report(
			`Unexpected value for the function "${functionName}" in the passage "${V.passage}". Param "${param}" had unexpected value of "${value}".${
				expectedValues ? ` ${expectedValues}` : ""
			}`
		);
		throw new Error(
			`Unexpected value for the function "${functionName}". Param "${param}" had unexpected value of "${value}".${expectedValues ? ` ${expectedValues}` : ""}`
		);
	}
	// Overflow (Clamp) Code Section

	function getSpaBeautyBoost() {
		const spaBoost = V.beautyBoost?.spa;
		if (!spaBoost) return 0;

		// Compatibility with early experimental saves that stored the spa boost as a plain number.
		if (typeof spaBoost === "number") return Math.max(0, spaBoost);
		if (typeof spaBoost !== "object") return 0;

		const amount = Number(spaBoost.amount) || 0;
		const expires = Number(spaBoost.expires) || 0;
		if (amount <= 0) return 0;
		if (expires > 0 && typeof Time !== "undefined" && Time.days > expires) return 0;

		return amount;
	}

	/**
	 * Returns the total temporary beauty bonus from all active sources.
	 * Includes: bath, teeth, face, hands, hygiene (intimate), and makeup (dynamic).
	 * Use this wherever game mechanics read beauty to include temporary boosts.
	 */
	function getBeautyBoost() {
		let boost = 0;
		if (V.beautyBoost) {
			boost +=
				(V.beautyBoost.bath || 0) +
				(V.beautyBoost.teeth || 0) +
				(V.beautyBoost.face || 0) +
				(V.beautyBoost.hands || 0) +
				(V.beautyBoost.hygiene || 0) +
				(V.beautyBoost.tan || 0) +
				getSpaBeautyBoost();
		}
		// Makeup boost: calculated dynamically (350 per cosmetic, 170 for concealer, up to total of 1350)
		// No decay since it's consumed on use
		if (V.makeup) {
			if (V.makeup.lipstick && V.makeup.lipstick !== 0) boost += 350;
			if (V.makeup.eyeshadow && V.makeup.eyeshadow !== 0) boost += 350;
			if (V.makeup.mascara && V.makeup.mascara !== 0) boost += 350;
			if (V.makeup.blusher && V.makeup.blusher !== 0) boost += 350;
			if (V.makeup.concealer && V.makeup.concealer !== 0) boost += 170;
		}
		return boost;
	}

	/**
	 * Returns a breakdown of active beauty boost sources for UI display.
	 */
	function getBeautyBoostSources() {
		const sources = [];
		if (V.beautyBoost) {
			if (V.beautyBoost.bath > 0) sources.push("bathed");
			if (V.beautyBoost.teeth > 0) sources.push("clean teeth");
			if (V.beautyBoost.face > 0) sources.push("fresh face");
			if (V.beautyBoost.hands > 0) sources.push("clean hands");
			if (V.beautyBoost.hygiene > 0) sources.push("good hygiene");
			if (V.beautyBoost.tan > 0) sources.push("healthy glow");
			if (getSpaBeautyBoost() > 0) sources.push(V.beautyBoost.spa?.treatment || "spa treatment");
		}
		if (V.makeup) {
			const hasMakeup =
				(V.makeup.lipstick && V.makeup.lipstick !== 0) ||
				(V.makeup.eyeshadow && V.makeup.eyeshadow !== 0) ||
				(V.makeup.mascara && V.makeup.mascara !== 0) ||
				(V.makeup.blusher && V.makeup.blusher !== 0) ||
				(V.makeup.concealer && V.makeup.concealer !== 0);
			if (hasMakeup) sources.push("makeup");
		}
		return sources;
	}

	/**
	 * Returns effective beauty (base + temporary boosts), clamped to the true beauty cap.
	 * Respects AMCTraits.beauty multiplier (e.g. 2x for immutable double-cap saves).
	 */
	function getEffectiveBeauty() {
		const max = (V.beautymax || 1000) * (V.AMCTraits?.beauty || 1);
		return Math.clamp((V.beauty || 0) + getBeautyBoost(), 0, max);
	}

	function traumaClamp() {
		if (V.innocencestate === 1 && V.trauma > 0) {
			V.innocencetrauma += V.trauma;
			V.trauma = 0;
		}
		V.trauma = Math.clamp(V.trauma, 0, V.traumamax);
	}
	DefineMacro("traumaClamp", traumaClamp);
	/* Compatibility for X-Change passages that still use the legacy macro casing. */
	DefineMacro("traumaclamp", traumaClamp);

	function stressClamp() {
		const overflow = V.stress - V.stressmax;
		if (Number.isFinite(overflow) && overflow > 0) {
			const controlMod = 2 - V.control / V.controlmax;
			V.trauma += overflow * 0.01 * controlMod;
		}
		V.stress = Math.clamp(V.stress, 0, V.stressmax);
		traumaClamp();
	}
	DefineMacro("stressClamp", stressClamp);

	function fatigueClamp() {
		if (typeof updateDynamicStatCaps === "function") updateDynamicStatCaps();
		const tirednessMax = Number(C?.tiredness?.max) || 2000;
		const overflow = V.tiredness - tirednessMax;

		if (Number.isFinite(overflow) && overflow > 0) {
			if (V.xchange?.willpowerSystemEnabled && V.xchange.willpowerPoints > 0) {
				wikifier("willpower-spending", overflow);
			} else {
				/* Preserve X-Change's fatigue overflow rates. */
				stress(overflow, 16);
				straighttrauma(overflow / 3);
			}
		}

		V.tiredness = Math.clamp(V.tiredness, 0, tirednessMax);
		stressClamp();
	}
	DefineMacro("fatigueClamp", fatigueClamp);

	function alcoholClamp() {
		const overflow = V.drunk - 1000;
		if (Number.isFinite(overflow) && overflow > 0) {
			V.tiredness += overflow;
			const controlMod = 2 - V.control / V.controlmax;
			V.trauma += overflow * 0.25 * controlMod;
		}
		V.drunk = Math.clamp(V.drunk, 0, 1000);
		fatigueClamp();
	}
	DefineMacro("alcoholClamp", alcoholClamp);

	function alcohol(amount) {
		if (isNaN(amount)) paramError("alcohol", "amount", amount, "Expected a number.");
		amount = Number(amount);
		let mod = Number(V.alcoholMod);
		if (!Number.isFinite(mod)) {
			V.alcoholMod = 1;
			mod = 1;
			if (typeof updateMoment === "function") updateMoment();
		}
		if ((V.backgroundTraits.includes("plantlover") || V.backgroundTraits.includes("opiumaddict")) && amount > 0) mod *= 1.5;
		V.drunk += amount * mod;
		alcoholClamp();
	}
	DefineMacro("alcohol", alcohol);

	function tiredness(amount, source) {
		if (isNaN(amount)) paramError("tiredness", "amount", amount, "Expected a number.");
		amount = Number(amount);

		let fatigueMod = 1;
		if (amount > 0) {
			if ((V.worn.upper.type.includes("heavy") || V.worn.lower.type.includes("heavy")) && !V.statFreeze) fatigueMod += 0.5;

			const footSkill = currentSkillValue("feetskill");
			if (V.worn.feet.type.includes("heels") && V.worn.feet.reveal > footSkill) {
				fatigueMod += (V.worn.feet.reveal - footSkill) / 1000;
			}

			fatigueMod += Weather.BodyTemperature.fatigueModifier - 1;
			if (V.athleticsFitnessToggle === 1) fatigueMod *= 1 - (V.athletics * 5) / 40000;
			/* The antidepressant's side effect: everything tires the PC out faster. */
			if (typeof antidepressantActive === "function" && antidepressantActive()) fatigueMod *= 1.3;
			if (setup.tirednessChangeByPain) fatigueMod *= setup.tirednessChangeByPain(V.pain);
		}

		if (source === "pass") V.tiredness += amount * fatigueMod;
		else if (amount > 0) V.tiredness += amount * 15 * fatigueMod;
		else if (amount < 0) V.tiredness += amount * 20;

		fatigueClamp();
	}
	DefineMacro("tiredness", tiredness);

	function stress(amount, multiplierOverride) {
		if (isNaN(amount)) paramError("stress", "amount", amount, "Expected a number.");
		if (multiplierOverride && isNaN(multiplierOverride)) paramError("stress", "multiplierOverride", multiplierOverride, "Expected a number.");
		amount = Number(amount);
		multiplierOverride = Number(multiplierOverride);
		if (amount) {
			if (multiplierOverride) {
				V.stress += amount * multiplierOverride;
			} else if (amount < 0) {
				V.stress += amount * 80;
				/* Whatever calmed the PC also takes some load off the Autism Spectrum trait.
				Hanging this off stress going down covers every calming activity in the game without listing them. */
				if (typeof autismStressRecovered === "function") autismStressRecovered(-amount * 80);
			} else {
				let stressMod;
				if (V.drunk <= 0) {
					stressMod = 40;
				} else if (V.substanceRebalance === 1) {
					const drunkMod = Math.floor(V.drunk / 120);
					stressMod = Math.max(1 - 0.15 * (1 + drunkMod), 0);
				} else {
					const drunkMod = Math.clamp(V.drunk / 120, 0, 4);
					stressMod = 30 - drunkMod * 5;
				}

				if (
					!V.statFreeze &&
					playerIsXChanged() &&
					(((V.xchange.pill.breederEffect || V.xchange.pill.omegaEffect) && playerIsBreederCreampied()) ||
						V.xchange.pill.dumbBitchEffect ||
						V.xchange.pill.bimboEffect)
				) {
					stressMod *= 0.1;
				}
				if (V.crittermagnettrait >= 1 && ["swarm", "struggle"].includes(V.enemytype) && (V.rapeavoid === 0 || V.sexavoid === 0)) {
					stressMod *= 0.25;
				}
				/* Harper's antidepressant course flattens stress build-up while the PC keeps taking the prescription. */
				if (typeof antidepressantActive === "function" && antidepressantActive()) stressMod *= 0.6;
				V.stress += amount * stressMod;
			}
		}
		stressClamp();
	}
	DefineMacro("stress", stress);

	function trauma(amount, source) {
		if (isNaN(amount)) return paramError("trauma", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			let traumaMod = 1;
			if (amount >= 0) {
				// Reduce the PC's trauma gains by 0.7x if they have the "Fucktoy" / "Survivor" trait
				if (V.rapetrait) traumaMod *= 0.7;
				// Reduce the PC's trauma gains by 0.7x if they have the "Bitch" / "Tamer" trait while being fucked by beasts.
				if (V.bestialitytrait >= 1 && V.enemytype === "beast") traumaMod *= 0.7;
				// Reduce the PC's trauma gains by 0.7x if they have the "Prey" / "Witch" trait while being fucked by tentacles.
				if (V.tentacletrait >= 1 && V.enemytype === "tentacles") traumaMod *= 0.7;
				if (V.crittermagnettrait >= 1 && ["swarm", "struggle"].includes(V.enemytype) && (V.rapeavoid === 0 || V.sexavoid === 0)) {
					traumaMod *= 0.25;
				}
				if (V.drunk >= 1 && V.substanceRebalance === 1) traumaMod *= 1 - 0.1 * Math.round(V.drunk / 120);

				// Increase trauma gains by up to 2x if the player is at low control.
				const controlMod = 2 - V.control / V.controlmax;

				// +1 point of "amount" = +1.5 points of $trauma. Amplified by "traumaMod" and "controlMod".
				V.trauma += amount * 1.5 * traumaMod * controlMod;
			} else {
				// Increase the PC's trauma losses by 2x if they are at the Asylum or the Hospital, but not during combat.
				if (["asylum", "hospital"].includes(V.location) && source !== "combat") traumaMod *= 2;

				// Increase trauma losses by up to 2x if the player is at high control.
				const controlMod = 1 + V.control / V.controlmax;

				// -1 point of "amount" = -1.5 points of $trauma. Amplified by "traumaMod" and "controlMod".
				V.trauma += amount * 1.5 * traumaMod * controlMod;
			}
		}

		traumaClamp();
		if (source !== "combat") {
			updatePlayerTraumaState();
			updateHallucinations();
		}
	}
	DefineMacro("trauma", trauma);

	function combattrauma(amount) {
		if (isNaN(amount)) paramError("combattrauma", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (amount > 0) {
				trauma(amount / 2, "combat");
			} else {
				trauma(amount);
			}
		}
	}
	DefineMacro("combattrauma", combattrauma);

	function straighttrauma(amount) {
		if (isNaN(amount)) paramError("straighttrauma", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.trauma += amount;
			traumaClamp();
		}
	}
	DefineMacro("straighttrauma", straighttrauma);

	function updatePlayerTraumaState() {
		// Permanent Insanity trait: symptoms behave as if trauma were at least 70% (severe trauma), without touching the real trauma value.
		// Higher real trauma still stacks extra symptoms on top. Gwylan's Clarity hypnosis suppresses the floor while it holds.
		const effectiveTrauma = V.insanityPermanent && !V.hypnosis_traits?.clarity ? Math.max(V.trauma, (V.traumamax / 10) * 7) : V.trauma;
		// Opium Addict trait: inhaling opium suppresses insomnia for the current sleep cycle.
		/* Sleep aids suppress insomnia for one night; dependence on them causes it on its own once they're withheld. */
		const sleepAidSuppress = typeof sleepAidSuppressesInsomnia === "function" && sleepAidSuppressesInsomnia();
		const sleepAidRebound = typeof sleepAidWithdrawal === "function" && sleepAidWithdrawal();
		V.sleeptrouble = (effectiveTrauma >= 1 || sleepAidRebound) && !V.poppyDrug?.insomniaSuppress && !sleepAidSuppress ? 1 : 0;
		V.nightmares = effectiveTrauma >= (V.traumamax / 10) * 1 ? 1 : 0;

		if (effectiveTrauma >= (V.traumamax / 10) * 7) {
			V.anxiety = 2;
		} else if (effectiveTrauma >= (V.traumamax / 10) * 2) {
			V.anxiety = 1;
		} else {
			V.anxiety = 0;
		}

		V.flashbacks = effectiveTrauma >= (V.traumamax / 10) * 8 ? 1 : 0;

		if (effectiveTrauma >= (V.traumamax / 10) * 6) {
			V.panicattacks = 2;
		} else if (effectiveTrauma >= (V.traumamax / 10) * 4) {
			V.panicattacks = 1;
		} else {
			V.panicattacks = 0;
		}

		if (effectiveTrauma >= (V.traumamax / 10) * 9.5) {
			V.dissociation = 2;
		} else if (effectiveTrauma >= (V.traumamax / 10) * 8.5) {
			V.dissociation = 1;
		} else {
			V.dissociation = 0;
		}

		// Insanity (permanent or active temporary) always forces Dissociation. By default its special combat handling only paralyses the opening turns.
		// The optional disturbed-traits setting instead keeps normal severe Dissociation active, so its complete paralysis can persist like trauma-induced Dissociation.
		// Gwylan's Clarity hypnosis suppresses the forced Dissociation while it holds.
		if (V.backgroundTraits?.includes("insanity") && !V.hypnosis_traits?.clarity) {
			const insanityDissociationLucid = V.combat === 1 && V.insanityDissociationLucid && !V.xchange?.insanityDisturbedTraitsEnabled;
			V.dissociation = insanityDissociationLucid ? Math.max(V.dissociation, 1) : 2;
		}

		if (typeof calmorylDissociationActive === "function" && calmorylDissociationActive()) {
			V.dissociation = 2;
		}
	}
	DefineMacro("updatePlayerTraumaState", updatePlayerTraumaState);

	function updateHallucinations() {
		// Permanent Insanity trait: hallucinations behave as if trauma were at least 70% (see updatePlayerTraumaState). Suppressed by Gwylan's Clarity hypnosis.
		const effectiveTrauma = V.insanityPermanent && !V.hypnosis_traits?.clarity ? Math.max(V.trauma, (V.traumamax / 10) * 7) : V.trauma;
		if (
			effectiveTrauma >= (V.traumamax / 10) * 5 ||
			(V.awareness >= 400 && !(V.hypnosis_traits.insight && V.settings.hypnosisEnabled)) ||
			(V.awareness < 200 && V.hypnosis_traits.insight && V.settings.hypnosisEnabled) ||
			V.hallucinogen > 0 ||
			Time.isBloodMoon() ||
			Object.values(V.worn).find(c => c.type.includes("esoteric")) ||
			(V.transformationParts?.traits && !["disabled", "hidden"].includes(V.transformationParts.traits.dragonEyes))
		) {
			V.hallucinations = 2;
		} else if (
			effectiveTrauma >= (V.traumamax / 10) * 3 ||
			(V.awareness >= 300 && !(V.hypnosis_traits.insight && V.settings.hypnosisEnabled)) ||
			(V.awareness < 300 && V.hypnosis_traits.insight && V.settings.hypnosisEnabled)
		) {
			V.hallucinations = 1;
		} else {
			V.hallucinations = 0;
		}
	}
	DefineMacro("updateHallucinations", updateHallucinations);

	function control(amount, combat) {
		if (isNaN(amount)) paramError("control", "amount", amount, "Expected a number.");
		if (V.gamemode === "soft") {
			// everything is a consensual consensual roleplay
			V.control = V.controlmax;
			V.controlled = 1;
			return;
		}
		amount = Number(amount);

		// halve control gains outside of combat
		if (amount > 0 && !V.combat) amount /= 2;
		V.control += amount * 10;
		// if you're looking here to fix a bug where an action that should increase control in combat actually lowers it instead - check State.history/State.expired for the combat start passage and look for a missing <<controlloss>> that failed to set $controlstart to the right value
		if (combat && V.control >= V.controlstart) V.control = V.controlstart;
		else if (!combat) V.controlstart = Math.min(V.control, V.controlmax);
		const threshold = V.controltrait ? V.controlmax / 3 : V.controlmax / 2;
		V.controlled = V.control > threshold ? 1 : 0;
		// Permanent Insanity: a fractured mind can never keep its trauma under control, so the symptoms always manifest in their raw, severe form regardless of composure.
		// The temporary version is deliberately left alone as it simply mirrors the player's real trauma and adapts with it.
		// Gwylan's Clarity hypnosis suppresses this too, letting composure work normally while it holds.
		if (V.insanityPermanent && !V.hypnosis_traits?.clarity) V.controlled = 0;
		V.control = Math.clamp(V.control, 0, V.controlmax);
	}
	DefineMacro("control", amount => control(amount));
	DefineMacro("combatcontrol", amount => control(amount, true));

	function corruption(amount, dailyIncrease = false) {
		if (isNaN(amount)) paramError("corruption", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount && numberOfEarSlime()) {
			V.earSlime.corruption += amount;
			V.earSlime.corruption = Math.clamp(V.earSlime.corruption, V.earSlime.growth / 2, 100);

			if (amount > 0 && V.earSlime.growth > 50 && !dailyIncrease) submissive(1);

			if (V.earSlime.corruption >= 60 && !V.earSlime.startedThreats) V.earSlime.startedThreats = true;
		}
	}
	DefineMacro("corruption", corruption);

	function semenCapacityMax() {
		const multiplier = V.AMCTraits?.semen ?? 1;
		const pill = V.xchange?.pill?.active ? V.xchange.pill : null;
		const xChangeBonus = (pill?.bullEffect ? 1500 : 0) + (pill?.alphaEffect ? 1500 : 0);
		return Math.min(14000, Math.max(0, ((Number(V.semen_max) || 0) + xChangeBonus) * multiplier));
	}
	function semenvolume(amount) {
		if (isNaN(amount)) paramError("semenvolume", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (V.player.penisExist && amount) {
			amount *= 3;
			if (Transformations.effectiveLevel("cow") >= 6) amount *= 1.25;
			if (V.semen_volume >= V.semen_max || V.AMCTraits.halfGain === 1) amount /= 2;
			/* Prevents those who can only have natural "female climax" from increasing their cum volume. */
			if (V.player.penissize > 0 || amount <= 0) V.semen_volume += amount * (V.statGainMult / 100);

			V.semen_volume = Math.clamp(V.semen_volume, 0, semenCapacityMax());
		}
	}
	DefineMacro("semenvolume", semenvolume);

	function semenAmount(amount) {
		if (isNaN(amount)) paramError("semenAmount", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.semen_amount = Math.clamp(V.semen_amount + amount, 0, V.semen_volume);
		}
	}
	DefineMacro("semen_amount", semenAmount);

	function milkvolume(amount) {
		if (isNaN(amount)) paramError("milkvolume", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (amount > 0) lactationPressure(Transformations.effectiveLevel("cow") >= 6 ? 2 : 1);
			if (V.lactating) {
				if (Transformations.effectiveLevel("cow") >= 6) amount *= 1.25;
				if (V.milk_volume >= V.milk_max || V.AMCTraits.halfGain === 1) amount /= 2;
				V.milk_volume = Math.clamp(V.milk_volume + amount * (V.statGainMult / 100), 24, V.milk_max * V.AMCTraits.milk);
			}
		}
	}
	DefineMacro("milkvolume", milkvolume);

	function milkAmount(amount) {
		if (isNaN(amount)) paramError("milkAmount", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.milk_amount = Math.clamp(V.milk_amount + amount, 0, V.milk_volume);
		}
		if (!V.milkFullPain) {
			// Do nothing
		} else if (V.milkFullPain && between(V.milk_amount / V.milk_volume, 0, 0.8)) {
			V.milkFullPain = 0;
		} else if (V.milkFullPain > 225 && between(V.milk_amount / V.milk_volume, 0.85, 0.9)) {
			V.milkFullPain = 255;
		} else if (V.milkFullPain > 250 && between(V.milk_amount / V.milk_volume, 0.9, 0.95)) {
			V.milkFullPain = 250;
		} else if (V.milkFullPain > 275 && between(V.milk_amount / V.milk_volume, 0.95, 0.98)) {
			V.milkFullPain = 275;
		}
	}
	DefineMacro("milk_amount", milkAmount);

	function lactationPressure(amount) {
		if (isNaN(amount)) paramError("lactationPressure", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.lactation_pressure = Math.clamp(V.lactation_pressure + amount, 0, 100);
		}
	}
	DefineMacro("lactation_pressure", lactationPressure);

	/* See wolfDefiant in twee-config for information */
	function wolfDefiant(amount) {
		if (isNaN(amount)) paramError("wolfDefiant", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (Transformations.effectiveLevel("wolf") >= 6) {
				stress(-6);
				if (V.submissive > amount) {
					trauma(30);
					control(-10);
				}
			}
		}
	}
	DefineMacro("wolfDefiant", wolfDefiant);

	function sensitivity(amount, key) {
		if (isNaN(amount)) paramError("sensitivity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (typeof insanitySensitivityAdjustment === "function") amount = insanitySensitivityAdjustment(amount);
		const sens = V[key + "sensitivity"];
		if (!sens) paramError("sensitivity", "key", key + "sensitivity", "Expected an existing sensitivity.");

		V[key + "sensitivity"] = Math.clamp(sens + amount, 1, 4);
	}

	DefineMacro("breast_sensitivity", amount => sensitivity(amount, "breast"));
	DefineMacro("mouth_sensitivity", amount => sensitivity(amount, "mouth"));
	DefineMacro("genital_sensitivity", amount => sensitivity(amount, "genital"));
	DefineMacro("bottom_sensitivity", amount => sensitivity(amount, "bottom"));

	function arousal(amount, source) {
		if (isNaN(amount)) paramError("arousal", "amount", amount, "Expected a number.");
		amount = Number(amount);
		const fragment = document.createDocumentFragment();
		if (amount) {
			const sexModifier = V.player.sex === "m" && amount > 0 ? 2 : 1;
			let mod = 1;

			// adds up to +1 to the arousal modifier when suffocating
			if (V.choketrait) mod += (V.oxygenmax - V.oxygen) / V.oxygenmax;

			if (V.drugged > 0) {
				/*
					Multiplies the modifier by up to 2x at full bar
					Comment Akoz: I chose to make it multiply, rather than add to the modifier
					so that the aphrodisiacs become quite threatening during nonconsensual use,
					and more thrilling when used intentionally
				*/
				if (V.substanceRebalance === 1) {
					mod *= 1 + V.drugged / 250;
				} else {
					mod *= 1 + V.drugged / 1000;
				}
			}

			// Apply source-specific side effects. Sensitivity/arousal modifiers are handled by the <<pleasure>> widget below.
			switch (source) {
				case "maso":
					V.arousalmasochism += amount;
					break;
				case "time": {
					const trackedArousal = Math.clamp(V.arousal + amount, 0, V.arousalmax);
					if (V.trackedArousal.length > 4) {
						V.trackedArousal.deleteAt(0);
						V.trackedArousal[V.trackedArousal.length - 1] += (trackedArousal * trackedArousal) / (V.arousalmax * 0.8);
					}
					V.trackedArousal.push(0);
					break;
				}
			}

			// Long enough spent constantly horny or locked away, and being aroused stops being anything new - it just doesn't build the way it used to.
			const desensitizedMod = amount > 0 && V.arousalDesensitizedTrait === 1 ? 0.5 : 1;
			const arousalChange = amount * sexModifier * (amount > 0 ? mod : 1) * (amount > 0 ? Weather.BodyTemperature.arousalModifier : 1) * desensitizedMod;
			V.arousal += arousalChange;

			fragment.append(wikifier("pleasure", amount, source));
			fragment.append(wikifier("arousalclamp"));
			// fragment.append(wikifier("arousal-wetness"));
		}

		return fragment;
	}
	Macro.add("arousal", {
		handler() {
			const fragment = arousal(...this.args);
			this.output.append(fragment);
		},
	});
	DefineMacro("breastarousal", amount => arousal(amount, "breasts"));
	DefineMacro("genitalarousal", amount => arousal(amount, "genitals"));

	function arousalClamp() {
		V.arousal = Math.clamp(V.arousal, minArousal(), V.arousalmax);
	}
	DefineMacro("arousalclamp", arousalClamp);

	function minArousal() {
		let result = playerHeatMinArousal() + playerRutMinArousal();

		result += Object.values(V.worn).reduce((prev, curr) => {
			if (curr.type.includes("fetish")) return prev + 450;
			return prev;
		}, 0);

		// A cage that's actively shrinking you keeps you constantly on edge, on top of the ordinary chastity fade-guard - but only if it's locked against your will.
		if (V.worn.genitals.type.includes("shrinking") && !chastityConsensual()) result += 350;

		// Any parasite that's latched onto worn chastity keeps stimulating you enough to enforce a higher floor.
		if (V.penilechastityparasite || V.vaginalchastityparasite || V.analchastityparasite) result += 300;

		return Math.clamp(result, 0, V.arousalmax / 2);
	}

	function pain(amount, modifier = 4) {
		if (isNaN(amount)) paramError("pain", "amount", amount, "Expected a number.");
		if (isNaN(modifier)) paramError("pain", "modifier", amount, "Expected a number.");
		amount = Number(amount);
		modifier = Number(modifier);
		if (amount) {
			let pain = amount * modifier;

			if (pain > 0) {
				// physique reduction
				pain *= 1 - Math.min(V.physique / 20000, 0.9);

				if (V.drunk >= 360) pain *= Math.min(0.95, 0.95 - 0.1 * ((V.drunk - 360) / 640));

				// Including masochism effect for all pain NG v2.7
				if (V.masochism >= 100) {
					pain *= 1 - V.masochism / 1200;
				}

				// Pain reduces arousal until masoquism hits 100
				arousal((amount * (-100 + V.masochism)) / 6, "maso");
			}

			if (V.drunk >= 1 && V.substanceRebalance === 1) pain *= 1 - 0.075 * (1 + Math.round(V.drunk / 120));

			V.pain += pain * Weather.BodyTemperature.painModifier;
		}
		painClamp();
	}
	DefineMacro("pain", pain);

	function masopain(amount) {
		if (isNaN(amount)) paramError("masopain", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.pain += amount * (1 - V.masochism / 1200) * 4;
			arousal(amount * ((-100 + V.masochism) / 18) * 4);
			painClamp();
		}
	}
	DefineMacro("masopain", masopain);

	function painClamp() {
		if (V.gamemode === "soft") {
			V.pain = 0;
		} else {
			V.pain = Math.clamp(V.pain, minPain(), 200);
		}
	}
	DefineMacro("painclamp", painClamp);

	function minPain() {
		let result = 0;

		if (V.lactating && V.settings.breastFeedingEnabled === true && V.milkFullPain > 200) {
			result += Math.ceil((V.milkFullPain - 200) / 5);
			if (!V.daily.milkFullPainMessage) {
				V.daily.milkFullPainMessage = 1;
				V.effectsmessage = 1;
			}
		}

		if (
			V.earSlime.defyCooldown &&
			!V.hypnosis_traits.silence &&
			(V.worn.genitals.name === "chastity parasite" || V.parasite.penis.name === "parasite" || V.parasite.clit.name === "parasite")
		) {
			result += 25;
		}

		return Math.clamp(result, 0, 50);
	}

	function detention(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("detention", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (V.backgroundTraits.includes("delinquent")) {
				amount *= 1.25;
			}
			if (V.backgroundTraits.includes("nerd")) {
				amount *= 0.2;
			}
			if (amount > 0) V.detention += amount * 10;
			V.delinquency = Math.clamp(V.delinquency + amount * 4, 0, 1000);
		}
	}
	DefineMacro("detention", detention);

	function delinquency(amount, source) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("delinquency", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (V.backgroundTraits.includesAny("delinquent", "insanity")) {
				amount *= 1.25;
			}
			if (V.backgroundTraits.includes("nerd")) {
				amount *= 0.75;
			}
			if (source === "bonus") {
				// find how many visible, non-mandatory school clothes are equipped and add 1
				const multi = getVisibleClothesList().reduce(
					(mult, slot) => mult + (slot.type && slot.type.includes("school") && !["upper", "lower"].includes(slot.name)),
					1
				);
				V.delinquency += multi >= 1 ? amount * multi : 0;
			} else {
				V.delinquency += amount * 4;
			}
			V.delinquency = Math.clamp(V.delinquency, 0, 1000);
		}
	}
	DefineMacro("delinquency", delinquency);

	function status(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("status", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (V.backgroundTraits.includes("delinquent")) {
			amount *= 1.25;
		}
		if (V.backgroundTraits.includes("nerd")) {
			amount *= 0.75;
		}
		amount *= 1 + 0.5 * (getEffectiveBeauty() / V.beautymax);

		if (amount > 0) {
			V.cool += amount;

			// ind how many visible clothes have "cool" in their type (if they have type) and add 1
			const multi = getVisibleClothesList().reduce((mult, slot) => mult + (slot.type && slot.type.includes("cool")), 1);
			V.cool += amount * multi;
		} else if (amount < 0) {
			V.cool *= 1 + amount / 100;
			V.cool--;
		}
		V.cool = Math.clamp(V.cool, 0, V.coolmax);
	}
	DefineMacro("status", status);

	function spray(amount) {
		if (isNaN(amount)) paramError("spray", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount > 0) {
			V.spray += amount;
		} else if (amount && !V.infinitespray) {
			if (V.prof.spray >= random(1, 5000)) {
				V.effectsmessage = 1;
				V.prof_spray_message = 1;
			} else {
				V.spray += amount;
				prof("spray", amount * -5);
			}
		}
		V.spray = Math.clamp(V.spray, 0, V.spraymax);
	}
	DefineMacro("spray", spray);

	function awareness(amount) {
		if (isNaN(amount)) paramError("awareness", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (V.backgroundTraits.includesAny("promiscuous", "exhibitionist", "deviant")) {
			amount *= amount > 0 ? 1.25 : 0.5;
		}
		if (amount) {
			const mod = Object.values(V.worn).reduce((prev, item) => {
				if (item.type.includes("dark")) return prev + 1;
				return prev;
			}, 1);

			V.awareness = Math.clamp(V.awareness + amount * mod, -200, 1000);
		}
	}
	DefineMacro("awareness", awareness);

	function purity(amount) {
		if (isNaN(amount)) paramError("purity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			const mod = Object.values(V.worn).reduce((prev, item) => {
				if (item.type.includes("holy")) return prev + 1;
				return prev;
			}, 1);
			const stillVirgin =
				typeof window.playerCountsAsVirgin === "function"
					? window.playerCountsAsVirgin()
					: V.player.virginity.vaginal === true && V.player.virginity.penile === true;
			const max = V.virginityProtected || stillVirgin ? 1000 : 999;
			V.purity = Math.clamp(V.purity + amount * mod, 0, max);
		}
	}
	DefineMacro("purity", purity);

	function suspicion(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("suspicion", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.suspicion = (V.suspicion || 0) + amount;
		}
	}
	DefineMacro("suspicion", suspicion);

	function asylumstatus(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("asylumstatus", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.asylumstatus = (V.asylumstatus || 0) + amount;
		}
	}
	DefineMacro("asylumstatus", asylumstatus);

	function humiliation10() {
		stress(40, 1);
		trauma(1);
	}
	DefineMacro("humiliation10", humiliation10);

	function wolfpacktrust() {
		V.wolfpacktrust++;
		return statDisplay.statChange("The pack trusts you a little more.", 0, "green");
	}

	function wolfpackfear() {
		V.wolfpackfear++;
		return statDisplay.statChange("The pack fears you a little more.", 0, "green");
	}

	function ferocity(amount) {
		if (isNaN(amount)) paramError("ferocity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.wolfpackferocity = (V.wolfpackferocity || 0) + amount;
			if (amount > 0) {
				return statDisplay.statChange("Ferocity", Math.clamp(amount, 1, 3), "blue");
			} else if (amount < 0) {
				return statDisplay.statChange("Ferocity", Math.clamp(amount, -3, -1), "purple");
			}
		}
		return "";
	}

	function harmony(amount = 1) {
		if (isNaN(amount)) paramError("harmony", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.wolfpackharmony = (V.wolfpackharmony || 0) + amount;
			if (amount > 0) {
				return statDisplay.statChange("Harmony", Math.clamp(amount, 1, 3), "lblue");
			} else if (amount < 0) {
				return statDisplay.statChange("Harmony", Math.clamp(amount, -3, -1), "pink");
			}
		}
		return "";
	}

	function submissive(amount, modifier = 4) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("submissive", "amount", amount, "Expected a number.");
		if (isNaN(modifier)) paramError("submissive", "modifier", modifier, "Expected a number.");
		amount = Number(amount);
		modifier = Number(modifier);
		if (amount && modifier) {
			V.submissive = Math.clamp(V.submissive + amount * modifier, 0, 2000);
			subCheck();
		}
		if (V.xchange.blackmail.activeQuest?.id === 10 && amount < 0) {
			V.xchange.blackmail.activeQuest.behavedDefiantly = true;
		}
	}
	DefineMacro("sub", (amount, modifier) => submissive(amount, modifier));
	DefineMacro("def", (amount, modifier) => submissive(-amount, modifier));

	function subCheck() {
		/* if (V.speech_attitude === "bratty" && V.submissive >= 1150) {
			V.speech_attitude = "neutral";
			V.effectsmessage = 1;
			V.speech_attitude_bratty_message = 1;
		} else if (V.speech_attitude === "meek" && V.submissive <= 850) {
			V.speech_attitude = "neutral";
			V.effectsmessage = 1;
			V.speech_attitude_meek_message = 1;
		} */
	}
	DefineMacro("sub_check", subCheck);

	function gainPenisInsecurity(amount = 10) {
		if (V.statFreeze) return "";
		if (isNaN(amount)) paramError("gainPenisInsecurity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			switch (V.player.penissize) {
				case 6:
					insecurity("penis_big", amount);
					return statDisplay.ginsecurity("penis_big");
				case 5:
					if (V.player.gender !== "m") {
						insecurity("penis_big", amount);
						return statDisplay.ginsecurity("penis_big");
					}
					break;
				case 3:
					insecurity("penis_small", amount);
					return statDisplay.ginsecurity("penis_small");
				case 2:
					insecurity("penis_small", Math.floor(amount * 1.5));
					return statDisplay.ginsecurity("penis_small");
				case 1:
					insecurity("penis_small", Math.floor(amount * 2));
					return statDisplay.ginsecurity("penis_small");
				case 0:
					insecurity("penis_small", Math.floor(amount * 2.5));
					return statDisplay.ginsecurity("penis_small");
			}
		}
		return "";
	}

	function gainBreastInsecurity(amount = 5) {
		if (V.statFreeze) return "";
		if (isNaN(amount)) paramError("gainBreastInsecurity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (V.player.breastsize >= 8) {
				insecurity("breasts_big", amount);
				return statDisplay.ginsecurity("breasts_big");
			} else {
				insecurity("breasts_small", Math.floor(amount));
				return statDisplay.ginsecurity("breasts_small");
			}
		}
		return "";
	}

	function insecurityPossible(type) {
		if (!["penis_small", "penis_big", "breasts_small", "breasts_big", "pregnancy"].includes(type)) {
			paramError("insecurity", "type", type, 'Expected values include "penis_small", "penis_big", "breasts_small", "breasts_big", "pregnancy"');
		}
		if (V.player.gender === "m" && type === "breasts_small") type = "breasts_big";

		// A trait the player has explicitly Accepted in Gender Identity shouldn't generate vanilla insecurity, even if the gender-based remap above would otherwise force it.
		const identityAccepted = {
			breasts_small: chestIdentityAccepted,
			breasts_big: chestIdentityAccepted,
			penis_small: penisIdentityAccepted,
			penis_big: penisIdentityAccepted,
			pregnancy: pregnancyIdentityAccepted,
		}[type];
		if (identityAccepted?.()) {
			return [false, type];
		}

		return [
			{
				penis_small: V.player.penisExist && V.player.penissize <= 3,
				penis_big: V.player.penisExist && V.player.penissize >= (V.player.gender === "m" ? 6 : 5),
				breasts_small: V.player.gender === "f" && between(V.player.breastsize, 0, 4),
				breasts_big: V.player.breastsize >= (V.player.gender === "m" ? 1 : 8),
				pregnancy: playerBellySize() >= 8,
			}[type] && V["acceptance_" + type] < 1000,
			type,
		];
	}

	function insecurity(type, amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("insecurity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			let possible;
			[possible, type] = insecurityPossible(type);
			let insecurity = V["insecurity_" + type];
			if (possible || amount < 0) {
				insecurity = Math.clamp(insecurity + amount, 0, 1000);
				V["insecurity_" + type] = insecurity;

				if (amount > 0) {
					switch (Math.floor(insecurity / 200)) {
						case 5:
							stress(3);
							control(-3);
							break;
						case 4:
							stress(3);
							control(-2);
							break;
						case 3:
							stress(2);
							control(-2);
							break;
						case 2:
							stress(2);
							control(-1);
							break;
						case 1:
							stress(1);
							control(-1);
							break;
						case 0:
							stress(1);
							break;
					}
					// reduce acceptance by matching amount
					V["acceptance_" + type] = Math.clamp(V["acceptance_" + type] - amount, 0, 1000);
				}
			}
		}
	}
	DefineMacro("insecurity", insecurity);

	function acceptance(type, amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("acceptance", "amount", amount, "Expected a number.");
		if (!["penis_small", "penis_big", "breasts_small", "breasts_big", "pregnancy"].includes(type)) {
			paramError("acceptance", "type", type, 'Expected values include "penis_small", "penis_big", "breasts_small", "breasts_big", "pregnancy"');
			return;
		}
		amount = Number(amount);
		if (amount) {
			// Male players always gain insecurity when breast size is above 0
			if (V.player.gender === "m" && type === "breasts_small") type = "breasts_big";
			// eslint-disable-next-line prettier/prettier
			const insecurityMod = amount > 0 ? (Math.ceil(V["insecurity_" + type] / 200) + 1) : 1;

			// eslint-disable-next-line prettier/prettier
			V["acceptance_" + type] = Math.clamp(V["acceptance_" + type] + (amount * insecurityMod), 0, 1000);
		}
	}
	DefineMacro("acceptance", acceptance);

	function gainPenisAcceptance(amount) {
		if (V.statFreeze) return "";
		if (isNaN(amount)) paramError("gainPenisAcceptance", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount > 0) {
			let type;
			switch (V.player.penissize) {
				case 6:
					type = "penis_big";
					break;
				case 5:
					if (V.player.gender !== "m") type = "penis_big";
					break;
				case 3:
				case 2:
				case 1:
				case 0:
					type = "penis_small";
					break;
			}
			if (type && V["insecurity_" + type] > 0 && V["acceptance_" + type] < 1000) {
				acceptance(type, amount);
				if (V["acceptance_" + type] >= 1000) T.acceptanceAchieved = type;
				return statDisplay.gacceptance();
			}
		}
		return "";
	}

	function willpower(amount) {
		if (isNaN(amount)) paramError("willpower", "amount", amount, "Expected a number.");
		if (V.backgroundTraits.includes("nerd")) {
			amount *= 2;
		}
		// Insanity trait: a fractured mind struggles to build any mental grip, so willpower gains are cut by 75%. Losses are untouched.
		// Gwylan's Clarity hypnosis suppresses the penalty while it holds.
		if (amount > 0 && V.backgroundTraits.includes("insanity") && !V.hypnosis_traits?.clarity) {
			amount *= 0.25;
		}
		// Iron Will: a completed fallen-angel mind grips willpower more firmly, so gains (e.g. from meditation) are boosted by 35%. Losses are untouched.
		// An insane fallen angel clings to willpower even harder: the boost rises to 45%, partially offsetting the insanity gain cut.
		if (amount > 0 && Transformations.partActive("traits", "ironWill")) {
			amount *= V.backgroundTraits.includes("insanity") && !V.hypnosis_traits?.clarity ? 1.45 : 1.35;
		}
		if (amount > 0 && typeof autismStatGainMultiplier === "function") amount *= autismStatGainMultiplier("willpower", amount);

		if (V.willpower > 1000 || V.AMCTraits.halfGain === 1) amount = Number(amount) / V.AMCTraits.willpower;
		else amount = Number(amount);
		if (amount) {
			V.willpower = Math.clamp(V.willpower + amount * 2, 0, V.willpowermax * V.AMCTraits.willpower);
		}
	}
	DefineMacro("willpower", willpower);

	function hope(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("hope", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.orphan_hope = Math.clamp(V.orphan_hope + amount * 2, -50, 50);
		}
	}
	DefineMacro("hope", hope);

	function reb(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("reb", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.orphan_reb = Math.clamp(V.orphan_reb + amount * 2, -50, 50);
		}
	}
	DefineMacro("reb", reb);

	function grace(amount, expectedRank) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("grace", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			let modifyGrace = true;

			// Optional second variable is the rank of the NPC giving the order, or when the player is expected to meet a higher standard. Grace changes won't apply if the player's rank equals or exceeds the expected rank
			const ranks = ["prospective", "initiate", "monk", "priest", "bishop"];
			const playerRankValue = ranks.indexOf(V.temple_rank);
			const expectedRankValue = ranks.indexOf(expectedRank);
			if (expectedRankValue > 1) {
				if (playerRankValue >= expectedRankValue) modifyGrace = false;

				// Below might be a more interesting way to handle it, remove the above line and uncomment the below to enable. Lollipop Scythe
				// Allows the player to gain grace in events only if they are below a certain rank
				// if (amount > 0 && playerRankValue >= expectedRankValue) modifyGrace = false;

				// Allows the player to lose grace in events only if they are at or above a certain rank
				// if (amount < 0 && playerRankValue < expectedRankValue) modifyGrace = false;
			}

			if (modifyGrace) {
				V.grace = Math.clamp((V.grace || 0) + amount, -100, 100);
				if (amount > 0) V.daily.graceUp = true;
			}
		}
	}
	DefineMacro("grace", grace);

	function livestockObey(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("livestockObey", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.livestock.obey = Math.clamp((V.livestock.obey || 0) + amount, 0, 100);
		}
	}
	DefineMacro("livestock_obey", livestockObey);

	function shame(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("shame", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.shame = Math.clamp((V.shame || 0) + amount, 0, 100);
		}
	}
	DefineMacro("shame", shame);

	function farmYield(amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("farmYield", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.farm_yield = (V.farm_yield || 0) + amount;
		}
	}
	DefineMacro("farm_yield", farmYield);

	function skill(type, amount) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("skill", "amount", amount, "Expected a number.");
		if (
			![
				"oralskill",
				"vaginalskill",
				"penileskill",
				"handskill",
				"analskill",
				"feetskill",
				"bottomskill",
				"thighskill",
				"chestskill",
				"beauty",
				"seductionskill",
				"skulduggery",
			].includes(type)
		) {
			paramError(
				"skill",
				"type",
				type,
				'Expected values include "oralskill", "vaginalskill", "penileskill", "handskill", "analskill", "feetskill", "bottomskill", "thighskill", "chestskill", "beauty", "seductionskill" and "skulduggery"'
			);
			return;
		}
		if (type === "penileskill" && !(V.player.penisExist || playerHasStrapon())) return;
		amount = Number(amount);
		if (amount > 0 && typeof autismStatGainMultiplier === "function") amount *= autismStatGainMultiplier(type, amount);

		/* Background trait bonuses */
		if (
			["oralskill", "vaginalskill", "penileskill", "handskill", "analskill", "feetskill", "bottomskill", "thighskill", "chestskill", "seductionskill"].includes(
				type
			) &&
			V.backgroundTraits.includes("promiscuous")
		) {
			amount *= amount > 0 ? 1.25 : 0.25;
		} else if (type === "beauty" && V.backgroundTraits.includes("beautiful")) {
			amount *= amount > 0 ? 1.25 : 0.25;
		} else if (type === "skulduggery" && V.backgroundTraits.includes("delinquent")) {
			amount *= amount > 0 ? 1.25 : 0.25;
		}
		if (amount > 0 && type === "seductionskill" && V.backgroundTraits.includes("lustful")) {
			amount *= 1.15;
		}

		if (amount) {
			const maxValue = (type === "beauty" ? V.beautymax : V[type + "max"]) || 1000;
			const maxMultiplier = V.AMCTraits?.[type] || 1;
			if (V[type] >= maxValue || V.AMCTraits?.halfGain === 1) amount /= 2;
			V[type] = Math.clamp(V[type] + amount * (V.statGainMult / 100), 0, maxValue * maxMultiplier);
		}
	}
	DefineMacro("oralskill", amount => skill("oralskill", amount));
	DefineMacro("vaginalskill", amount => skill("vaginalskill", amount));
	DefineMacro("penileskill", amount => skill("penileskill", amount));
	DefineMacro("handskill", amount => skill("handskill", amount));
	DefineMacro("analskill", amount => skill("analskill", amount));
	DefineMacro("feetskill", amount => skill("feetskill", amount));
	DefineMacro("bottomskill", amount => skill("bottomskill", amount));
	DefineMacro("thighskill", amount => skill("thighskill", amount));
	DefineMacro("chestskill", amount => skill("chestskill", amount));
	DefineMacro("beauty", amount => skill("beauty", amount / 10.0));
	DefineMacro("seductionskill", amount => skill("seductionskill", amount));
	DefineMacro("skulduggery", amount => skill("skulduggery", amount));

	function prof(skill, amount) {
		if (isNaN(amount)) paramError("prof", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.prof[skill] = Math.clamp((V.prof[skill] || 0) + amount * 5 * (V.statGainMult / 100), 0, 1000);
		}
	}
	DefineMacro("prof", prof);

	function lockerSuspicion(amount = 1) {
		if (V.statFreeze) return;
		if (isNaN(amount)) paramError("lockerSuspicion", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.locker_suspicion = (V.locker_suspicion || 0) + amount;
		}
	}
	DefineMacro("locker_suspicion", lockerSuspicion);

	function drugs(amount) {
		if (isNaN(amount)) paramError("drugs", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			let mod = 1;
			if ((V.backgroundTraits.includes("plantlover") || V.backgroundTraits.includes("opiumaddict")) && amount > 0) mod = 1.5;
			V.drugged = Math.clamp(V.drugged + amount * mod, 0, 1000);
		}
	}
	DefineMacro("drugs", drugs);

	function hallucinogen(amount) {
		if (isNaN(amount)) paramError("hallucinogen", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			if (V.substanceRebalance === 1 && V.passage.includes("Gwylan")) amount /= 2;
			V.hallucinogen = Math.clamp(V.hallucinogen + amount, 0, 1000);
		}
	}
	DefineMacro("hallucinogen", hallucinogen);

	function lewdity(amount) {
		if (isNaN(amount)) paramError("lewdity", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (amount) {
			V.daily.stall_lewdity = Math.clamp((Number.isFinite(V.daily.stall_lewdity) ? V.daily.stall_lewdity : 0) + amount, 0, 4);
		}
	}
	DefineMacro("lewdity", lewdity);

	function wet(type, amount) {
		if (isNaN(amount)) paramError("wet", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (!["over_upper", "over_lower", "upper", "lower", "under_upper", "under_lower"].includes(type)) {
			paramError("wet", "type", type, 'Expected values include "over_upper", "over_lower", "upper", "lower", "under_upper" and "under_lower"');
			return;
		}
		if (!waterproofCheck(V.worn[type])) {
			type = type.replace(/_/g, "");
			if (amount) {
				V[type + "wet"] = Math.clamp(V[type + "wet"] + amount, 0, 200);
			}
		}
	}
	DefineMacro("upperwet", amount => wet("upper", amount));
	DefineMacro("lowerwet", amount => wet("lower", amount));
	DefineMacro("underupperwet", amount => wet("under_upper", amount));
	DefineMacro("underlowerwet", amount => wet("under_lower", amount));
	DefineMacro("overupperwet", amount => wet("over_upper", amount));
	DefineMacro("overlowerwet", amount => wet("over_lower", amount));

	function worldCorruption(type, amount) {
		if (isNaN(amount)) paramError("worldCorruption", "amount", amount, "Expected a number.");
		amount = Number(amount);
		if (!["hard", "soft"].includes(type)) {
			paramError("worldCorruption", "type", type, 'Expected values include "hard" and "soft"');
			return;
		}
		if (amount) {
			if (type === "hard") {
				V.world_corruption_hard = Math.clamp(V.world_corruption_hard + amount, -30, 30);
			} else {
				V.world_corruption_soft += amount;
				let overflow = 0;
				if (V.world_corruption_soft < 0) overflow = V.world_corruption_soft;

				// Unclamp or adjust upper limit once world corruption effects are added
				V.world_corruption_soft = Math.clamp(V.world_corruption_soft, 0, 100);

				if (amount < 0) {
					if (overflow) V.world_corruption_reduced -= overflow;
					V.world_corruption_reduced -= amount;
				}
			}
		}
	}
	DefineMacro("world_corruption", worldCorruption);

	function money(amount, source, optional = {}) {
		if (isNaN(amount)) paramError("money", "amount", amount, "Expected a number.");
		if (!(typeof source === "string" || source instanceof String || source === undefined))
			paramError("money", "source", source, "Expected a string or undefined.");
		if (!(typeof optional === "object" && optional !== null)) paramError("money", "optional", optional, "Expected an object.");
		amount = Number(amount);

		if (!Number.isFinite(amount)) {
			paramError("money", "amount", amount, "Expected a valid number.");
			return;
		}

		/* Refunds, reimbursements and transfers restore cash, but are not earned income.
		   `incomeType: "none"` is used by existing non-income credits whose source name is not a refund. */
		const nonIncomeCredit =
			amount > 0 &&
			(String(source || "")
				.toLowerCase()
				.includes("refund") ||
				optional.incomeType === "none");

		/* Full cat TF doubles cafe earnings. Callers that already applied a stacked TF bonus opt out. */
		if (amount > 0 && !optional.recordOnly && !optional.animalTfAdjusted && ["cafeWaiter", "cafeChef", "cafeBuns"].includes(source)) {
			amount = window.animalTfIncome(amount, "cat");
		}

		/* Full divine TFs boost income according to the kind of work.
		Transfers and reconstructed statistics either bypass <<money>> or use recordOnly, so they cannot create free cash. */
		if (amount > 0 && !optional.recordOnly && !optional.divineTfAdjusted) {
			amount = window.divineTfIncome(amount, source, optional.incomeType);
		}

		/* X-Change inflation: market purchases get pricier as the player's cash grows.
		   The surcharge can never overdraw the player or trigger the affordability error below. */
		if (amount < 0 && !optional.recordOnly && typeof setup !== "undefined" && setup.inflation && setup.inflation.appliesToSpend(source)) {
			const inflated = -setup.inflation.price(-amount);
			/* Only add the surcharge if the player can afford the base price.
			If they cannot afford the surcharge, charge the base price instead. price() matches the amount shown by printprice. */
			if (inflated < amount && V.money >= -amount && V.money + inflated >= 0) amount = inflated;
		}

		if (!optional.recordOnly) {
			if (amount < 0 && V.money + amount < 0) {
				/* Included both types of error reporting, since this often will only occur in a link */
				Errors.report(`Unexpected use for the function "money" in the passage "${V.passage}". Player doesn't have enough money to spend.`);
				throw new Error(`Unexpected use for the function "money". Player doesn't have enough money to spend.`);
			}

			V.money += amount;
		}
		if (nonIncomeCredit) return;

		if (!source || source === "prostitution") {
			const mod = source === "prostitution" ? "Prostitution" : "";
			switch (V.location) {
				case "farm":
				case "alex_farm":
				case "alex_cottage":
					source = "farm" + mod;
					break;
				case "dance_studio":
					source = "danceStudio" + mod;
					break;
				case "moor":
				case "bog":
				case "castle":
				case "tower":
					source = "moor" + mod;
					break;
				case "riding_school":
					source = "ridingSchool" + mod;
					break;
				case "strip_club":
					source = "stripClub" + mod;
					break;
				case "forest":
				case "lake":
				case "old_temple":
				case "lake_ruin":
				case "wolf_cave":
				case "cabin":
				case "forest_shop":
				case "catacombs":
				case "churchyard":
				case "sepulchre":
					source = "forest" + mod;
					break;
				case "dilapidated_shop":
				case "adult_shop":
					source = "adultShop" + mod;
					break;
				case "town":
				case "home":
				case "police_station":
				case "oak":
				case "night_monster_lair":
				case "industrial":
				case "estate":
				case "shopping_centre":
				case "alley":
				case "park":
				case "drain":
				case "sewers":
				case "beech":
				case "sea":
				case "kylarmanor":
					source = "town" + mod;
					break;
				case "studio":
					source = "photoStudio" + mod;
					break;
				case "pirate_ship":
					source = "pirates" + mod;
					break;
				case "school":
				case "school_rear_courtyard":
				case "pool":
					source = "school" + mod;
					break;
				case "office":
				case "office_building":
				case "officeBuilding":
				case "avery_skyscraper":
					source = "office" + mod;
					break;
				case "canal":
					source = "flatsCanal" + mod;
					break;
				default:
					source = V.location + mod;
					break;
			}
		}

		if (!source) source = "unknown"; // Should be unreachable, but there just in case
		// eslint-disable-next-line no-undef
		source = toCamelCase(source);

		const type = amount > 0 ? "earned" : "spent";
		amount = Math.abs(amount);

		if (!V.moneyStats[source]) V.moneyStats[source] = { earned: 0, earnedCount: 0, spent: 0, spentCount: 0 };
		V.moneyStats[source][type] += amount;
		V.moneyStats[source][type + "Count"]++;
		V.moneyStats[source][type + "TimeStamp"] = Time.date.timeStamp;
	}
	DefineMacro("money", money);

	/*
		Using a similar source to above, you'll be able to generate 'hourly rates' in the money statistics.
		See the 'Cafe' and 'Cafe Work' passages and `timeTrackingEndCafe` widget for example usage usage
	*/
	function timeTracking(source, startTracking) {
		if (!(typeof source === "string" || source instanceof String)) paramError("timeTracking", "source", source, "Expected a string.");

		if (!V.timeStats[source]) {
			V.timeStats[source] = { total: 0, trackedStart: 0 };
		}
		if (startTracking) {
			V.timeStats[source].trackedStart = Time.date.timeStamp;
		} else if (V.timeStats[source].trackedStart) {
			// Clamped to 24 hours to prevent crazy values from occurring
			V.timeStats[source].total += Math.clamp(Time.date.timeStamp - V.timeStats[source].trackedStart, 0, 3600 * 24);
			V.timeStats[source].trackedStart = 0;
		}
	}
	DefineMacro("timeTrackingStart", source => timeTracking(source, true));
	DefineMacro("timeTrackingEnd", source => timeTracking(source));

	function timeTrackingManual(source, amount, timeType = "hour") {
		if (isNaN(amount)) paramError("timeTrackingManual", "amount", amount, "Expected a number.");
		if (!(typeof source === "string" || source instanceof String)) paramError("timeTrackingManual", "source", source, "Expected a string.");
		if (!["hour", "minute", "second"].includes(timeType))
			paramError("timeTrackingManual", "timeType", timeType, "Expected a string of either 'hour', 'minute' or 'second'.");

		amount = Number(amount);
		if (Number.isFinite(amount)) {
			if (!V.timeStats[source]) {
				V.timeStats[source] = { total: 0, trackedStart: 0 };
			}
			if (timeType === "hour") amount *= 3600;
			if (timeType === "minute") amount *= 60;

			// Clamped to 24 hours to prevent crazy values from occurring
			V.timeStats[source].total += Math.clamp(amount, 0, 3600 * 24);
		}
	}
	DefineMacro("timeTrackingManual", (source, amount, timeType) => timeTrackingManual(source, amount, timeType));

	function timeTrackingTotal(source, timeType = "hour") {
		if (!(typeof source === "string" || source instanceof String)) paramError("timeTrackingTotal", "source", source, "Expected a string.");
		if (!["hour", "minute", "second"].includes(timeType))
			paramError("timeTrackingTotal", "timeType", timeType, "Expected a string of either 'hour', 'minute' or 'second'.");

		if (!V.timeStats[source]?.total || (T.timeTrackingSnapshotOveride && !V.moneyStatsSnapshot?.time[source])) return 0;

		let multiplier = 1;
		if (timeType === "hour") multiplier = 3600;
		if (timeType === "minute") multiplier = 60;

		// Override that returns a value when looking for the snapshot value
		if (T.timeTrackingSnapshotOveride && V.moneyStatsSnapshot?.time[source]) return V.moneyStatsSnapshot?.time[source].total / multiplier;

		return V.timeStats[source].total / multiplier;
	}

	function badEndTracking(source, optional = {}) {
		// Disabled during a replay
		if (V.replayScene) return false;
		const lastBadEnd = V.badEndStats.last();

		// Attempted to start tracking, but the previous tracking wasn't stopped
		if (lastBadEnd && !lastBadEnd.trackedEnd) {
			badEndTrackingEnd(lastBadEnd.source, {
				reason: "unknown",
				notes: `A bad end started in passage ${V.passage} while the previous bad end was still active. This is an error. Please report this to D.N.A.`,
			});
		}

		const newBadEnd = {
			source,
			trackedStart: Time.date.timeStamp,
			trackedEnd: undefined,
		};
		if (optional.reason) newBadEnd.reasonStart = optional.reason;
		if (optional.notes) newBadEnd.notesStart = optional.notes;
		V.badEndStats.push(newBadEnd);
	}
	DefineMacro("badEndTracking", (source, optional) => badEndTracking(source, optional));

	function badEndTrackingEnd(source, optional = {}) {
		// Disabled during a replay
		if (V.replayScene) return false;
		let lastBadEnd = V.badEndStats.last();

		// Attempted to end tracking, but either tracking doesn't exist, the trackingEnd has already been set or the source doesn't match
		if (!lastBadEnd || lastBadEnd.source !== source || lastBadEnd.trackedEnd) {
			badEndTracking(source, {
				reason: "unknown",
				notes: `No bad end was considered active in ${V.passage} when badEndTrackingEnd was called. This is
				 ${V.badEndStats.length ? "an error. Please report this to D.N.A." : "likely due to loading an old save"}.`,
			});
			lastBadEnd = V.badEndStats.last();
		}

		lastBadEnd.trackedEnd = Time.date.timeStamp;
		if (optional.reason) lastBadEnd.reasonEnd = optional.reason;
		if (optional.notes) lastBadEnd.notesEnd = optional.notes;
	}
	DefineMacro("badEndTrackingEnd", (source, optional) => badEndTrackingEnd(source, optional));

	return {
		alcoholClamp,
		fatigueClamp,
		stressClamp,
		traumaClamp,
		alcohol,
		tiredness,
		stress,
		trauma,
		combattrauma,
		straighttrauma,
		updatePlayerTraumaState,
		updateHallucinations,
		control,
		corruption,
		semenCapacityMax,
		semenvolume,
		semenAmount,
		milkvolume,
		milkAmount,
		lactationPressure,
		sensitivity,
		arousal,
		arousalClamp,
		minArousal,
		pain,
		masopain,
		painClamp,
		minPain,
		detention,
		delinquency,
		status,
		spray,
		awareness,
		purity,
		suspicion,
		asylumstatus,
		humiliation10,
		wolfpacktrust,
		wolfpackfear,
		ferocity,
		harmony,
		submissive,
		subCheck,
		gainPenisInsecurity,
		gainBreastInsecurity,
		insecurityPossible,
		insecurity,
		acceptance,
		gainPenisAcceptance,
		willpower,
		hope,
		reb,
		grace,
		livestockObey,
		shame,
		farmYield,
		skill,
		prof,
		lockerSuspicion,
		drugs,
		hallucinogen,
		wet,
		worldCorruption,
		money,
		timeTracking,
		timeTrackingManual,
		timeTrackingTotal,
		badEndTracking,
		badEndTrackingEnd,
		getBeautyBoost,
		getEffectiveBeauty,
		getBeautyBoostSources,
		getSpaBeautyBoost,
	};
})();
window.statChange = statChange;
window.semenCapacityMax = statChange.semenCapacityMax;
window.getBeautyBoost = statChange.getBeautyBoost;
window.getEffectiveBeauty = statChange.getEffectiveBeauty;
window.getBeautyBoostSources = statChange.getBeautyBoostSources;
window.getSpaBeautyBoost = statChange.getSpaBeautyBoost;
