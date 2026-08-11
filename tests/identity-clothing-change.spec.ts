import { test, expect } from "@playwright/test";
import { openGame, navigateTo, assertNoErrors } from "./helpers";

/**
 * Clothing dysphoria is a reaction to getting changed, not a background hum. It fires once when the outfit's
 * overall reading changes, and hits harder for it, instead of charging a little every hour the clothes stay on.
 */
test.describe("clothing identity fires on a change of outfit", () => {
	test.beforeEach(async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start");

		// A player who accepts no clothing style at all, currently in a real feminine outfit, with that outfit
		// already established as the baseline - what she has on right now is not news.
		await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;

			/** Dresses the player in the given band's real starting outfit without touching their stated preference. */
			W.wearOutfitFor = (band: string) => {
				const preferred = V.identity.presentation.clothing.preferred;
				V.identity.presentation.clothing.preferred = band;
				SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
				V.identity.presentation.clothing.preferred = preferred;
			};

			V.xchange.genderIdentityEnabled = 1;
			V.xchange.disregardGender = 0;
			V.hypnosis_traits = V.hypnosis_traits || {};
			V.hypnosis_traits.crossdressing = 0;
			V.combat = 0;

			const clothing = V.identity.presentation.clothing;
			for (const side of ["masculine", "feminine", "neutral"]) {
				Object.assign(clothing[side], { acceptance: false, reject: false, dysphoria: 0, tolerance: 0, everAccepted: false });
			}
			clothing.preferred = "f";
			SC.Wikifier.wikifyEval("<<clothinginit>><<givestartclothing>>");
			clothing.preferred = "m";
			delete clothing.lastReading;
			W.clothingIdentityChangeCheck();
		});
	});

	test("a day in the same clothes costs nothing; changing into them costs once, and hard", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const wearOutfitFor = W.wearOutfitFor;
			const clothing = V.identity.presentation.clothing;
			const clothingDysphoria = () => [clothing.masculine.dysphoria, clothing.feminine.dysphoria, clothing.neutral.dysphoria];

			// A full day spent in clothes she already had on.
			for (let hour = 0; hour < 24; hour++) {
				SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
				W.hourlyClothingFemininityCheck(1);
				W.clothingIdentityChangeCheck();
			}
			const afterIdleDay = clothingDysphoria();

			// Stripped and put back in the very same outfit: still nothing new to react to.
			const outfit = JSON.parse(JSON.stringify(V.worn));
			SC.Wikifier.wikifyEval("<<clothinginit>>");
			W.clothingIdentityChangeCheck();
			V.worn = outfit;
			W.clothingIdentityChangeCheck();
			const afterRedressingTheSame = clothingDysphoria();

			// An actual change of style, though, is news.
			wearOutfitFor("m");
			const stressBefore = V.stress;
			delete V.dysphoriaReasonMessage;
			W.clothingIdentityChangeCheck();

			return {
				band: W.currentClothingBand(),
				afterIdleDay,
				afterRedressingTheSame,
				masculineDysphoria: clothing.masculine.dysphoria,
				stressGain: V.stress - stressBefore,
				reason: V.dysphoriaReasonMessage,
			};
		});

		expect(out.afterIdleDay).toEqual([0, 0, 0]);
		expect(out.afterRedressingTheSame).toEqual([0, 0, 0]);

		// One change lands as several of the old hourly ticks at once: weight 5 x a 3-point tick at zero tolerance.
		expect(out.band).toBe("m");
		expect(out.masculineDysphoria).toBe(15);
		expect(out.stressGain).toBeGreaterThan(0);
		expect(out.reason).toMatch(/boyish/);

		await assertNoErrors(page);
	});

	test("preferred clothing pays by the hour, and the change into it pays nothing", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const clothing = V.identity.presentation.clothing;

			// She wants masculine clothing and is at peace with it; feminine is merely tolerated, so wearing it
			// is neither a comfort nor a cost and makes a clean baseline to measure the preferred hour against.
			clothing.preferred = "m";
			Object.assign(clothing.masculine, { acceptance: true, reject: false, dysphoria: 0, tolerance: 100, everAccepted: true });
			Object.assign(clothing.feminine, { acceptance: true, reject: false, dysphoria: 0, tolerance: 100, everAccepted: true });
			V.control = 0; // pins the trauma multiplier, so the reading is the macro's flat 1.5 per point

			/** One hour of identity effects in the given band's outfit, as {stress, trauma} relieved. */
			const hourWearing = (band: string) => {
				W.wearOutfitFor(band);
				V.stress = 5000;
				V.trauma = 5000;
				SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");
				return { stress: 5000 - V.stress, trauma: 5000 - V.trauma };
			};
			/** Whatever the change itself hands out, on top of the hour. */
			const changeInto = (band: string) => {
				W.wearOutfitFor(band);
				V.stress = 5000;
				V.trauma = 5000;
				W.clothingIdentityChangeCheck();
				return { stress: 5000 - V.stress, trauma: 5000 - V.trauma };
			};

			// Everything the rest of her identity contributes in an hour, measured while clothing is silent.
			const baseline = hourWearing("f");
			const preferred = hourWearing("m");
			W.wearOutfitFor("f");
			W.clothingIdentityChangeCheck();

			const onChange = changeInto("m");
			return {
				band: W.currentClothingBand(),
				onChange,
				perHour: { stress: preferred.stress - baseline.stress, trauma: preferred.trauma - baseline.trauma },
			};
		});

		// Changing into them is not itself the reward - otherwise players would just swap outfits on a loop.
		expect(out.onChange).toEqual({ stress: 0, trauma: 0 });
		expect(out.band).toBe("m");
		// Staying in them is: 3 points an hour of each, trauma at the macro's 1.5x per point.
		expect(out.perHour.stress).toBe(3);
		expect(out.perHour.trauma).toBe(4.5);

		await assertNoErrors(page);
	});

	test("deciding you can't stand what you already have on counts as a change", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const clothing = V.identity.presentation.clothing;

			// At peace with the feminine outfit she's standing in, and settled - no pending reaction.
			Object.assign(clothing.feminine, { acceptance: true, reject: false, dysphoria: 0, tolerance: 100, everAccepted: true });
			delete clothing.lastReading;
			W.clothingIdentityChangeCheck();
			const settled = { reading: clothing.lastReading, dysphoria: clothing.feminine.dysphoria };

			// Render the Identity widget so its delegated control handler is installed, then reject the style
			// through the same bubbling change event as the real checkbox. No passage transition or manual call.
			SC.Wikifier.wikifyEval("<<identitySettings>>");
			const wrapper = document.createElement("div");
			wrapper.className = "identity-clothing-settings";
			const input = document.createElement("input");
			wrapper.append(input);
			document.body.append(wrapper);
			clothing.feminine.reject = true;
			input.dispatchEvent(new Event("change", { bubbles: true }));
			wrapper.remove();

			return { settled, afterRejecting: clothing.feminine.dysphoria, reading: clothing.lastReading };
		});

		expect(out.settled).toEqual({ reading: "f", dysphoria: 0 });
		// Being at odds with the clothes on your back is new information, even though the clothes didn't move.
		expect(out.reading).toBe("f!");
		expect(out.afterRejecting).toBeGreaterThan(0);

		await assertNoErrors(page);
	});

	test("dysphoria over clothes you're no longer in still fades hourly", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const wearOutfitFor = W.wearOutfitFor;
			const clothing = V.identity.presentation.clothing;

			clothing.feminine.dysphoria = 40;
			wearOutfitFor("m");
			W.clothingIdentityChangeCheck();
			SC.Wikifier.wikifyEval("<<hourlyIdentityEffects>>");

			return { band: W.currentClothingBand(), feminineDysphoria: clothing.feminine.dysphoria };
		});

		// Recovery is the one part of the clothing axis that still belongs on the clock.
		expect(out.band).toBe("m");
		expect(out.feminineDysphoria).toBe(35);

		await assertNoErrors(page);
	});

	test("a hypnotic wardrobe compulsion withholds the identity system's extra hit", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const SC = W.SugarCube;
			const V = SC.State.variables;
			const wearOutfitFor = W.wearOutfitFor;
			const clothing = V.identity.presentation.clothing;

			const measureChangeInto = (band: string) => {
				wearOutfitFor(band);
				const before = V.stress;
				W.clothingIdentityChangeCheck();
				return V.stress - before;
			};
			const reset = () => {
				for (const side of ["masculine", "feminine", "neutral"]) {
					Object.assign(clothing[side], { acceptance: false, reject: false, dysphoria: 0, tolerance: 0, everAccepted: false });
				}
			};

			const unhypnotised = measureChangeInto("m");
			reset();
			V.hypnosis_traits.crossdressing = 2;
			const hypnotised = measureChangeInto("f");

			return { unhypnotised, hypnotised, compulsion: W.clothingCompulsionActive(), dysphoria: clothing.feminine.dysphoria };
		});

		expect(out.compulsion).toBe(true);
		expect(out.hypnotised).toBeLessThan(out.unhypnotised);
		// The dysphoria itself still tracks; only the extra stress on top is withheld.
		expect(out.dysphoria).toBe(15);

		await assertNoErrors(page);
	});

	test("changing in a wardrobe and walking out reacts on the passage you land in", async ({ page }) => {
		await page.evaluate(() => {
			const W = window as any;
			const wearOutfitFor = W.wearOutfitFor;
			wearOutfitFor("m");

			// The effects panel is built while the passage renders, so record what it would have had to work with.
			W.__reasonAtRender = "not rendered";
			W.jQuery(document).one(":passagerender", () => {
				W.__reasonAtRender = W.SugarCube.State.variables.dysphoriaReasonMessage ?? null;
			});
		});

		// Nothing runs the check by hand here - leaving the passage has to be what triggers it.
		await navigateTo(page, "Start");

		const out = await page.evaluate(() => {
			const W = window as any;
			const V = W.SugarCube.State.variables;
			return {
				dysphoria: V.identity.presentation.clothing.masculine.dysphoria,
				lastReading: V.identity.presentation.clothing.lastReading,
				reasonAtRender: W.__reasonAtRender,
			};
		});

		expect(out.lastReading).toBe("m!");
		expect(out.dysphoria).toBe(15);
		expect(out.reasonAtRender).toBe("You feel awkward dressed up boyish like this.");

		await assertNoErrors(page);
	});

	test("being stripped and redressed in a fight doesn't count as changing clothes", async ({ page }) => {
		const out = await page.evaluate(() => {
			const W = window as any;
			const V = (window as any).SugarCube.State.variables;
			const wearOutfitFor = W.wearOutfitFor;
			const clothing = V.identity.presentation.clothing;

			V.combat = 1;
			wearOutfitFor("m");
			W.clothingIdentityChangeCheck();
			const during = { dysphoria: clothing.masculine.dysphoria, lastReading: clothing.lastReading };

			V.combat = 0;
			W.clothingIdentityChangeCheck();
			return { during, after: clothing.masculine.dysphoria };
		});

		expect(out.during).toEqual({ dysphoria: 0, lastReading: "f!" });
		// Once the fight is over, whatever she's left standing in registers normally.
		expect(out.after).toBe(15);

		await assertNoErrors(page);
	});
});
