import { test, expect } from "@playwright/test";
import { navigateTo, waitForPassage, getVar, wikifyEval, assertNoErrors, FILE_URL, type Page } from "./helpers.js";

async function openGameWithFeats(page: Page, dolFeats?: object) {
	await page.addInitScript(
		featsJson => {
			localStorage.setItem("verifiedAge", "true");
			if (featsJson) {
				localStorage.setItem("dolFeats", featsJson);
			} else {
				localStorage.removeItem("dolFeats");
			}
		},
		dolFeats ? JSON.stringify(dolFeats) : null
	);
	await page.goto(FILE_URL);
	await waitForPassage(page);
}

test.describe("Feats Boosts", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("are all locked when no feats earned (0 Vrelcoins)", async ({ page }) => {
		await openGameWithFeats(page);
		await navigateTo(page, "Start2");

		const featsBoosts = await getVar(page, "featsBoosts");
		expect(featsBoosts).not.toBeNull();
		expect(typeof featsBoosts).toBe("object");

		// Boosts should be unavailable with no feats unlocked (max 0)
		const details = featsBoosts.upgradeDetails;
		for (const [key, detail] of Object.entries(details) as [string, any][]) {
			// randomClothing is an exception (max 20)
			if (key === "randomClothing") {
				expect(detail.max).toBe(20);
			} else if (key === "hopelessEndings") {
				// Always available (max 1); per-ending VrelCoin costs are handled in the boost UI.
				expect(detail.max).toBe(1);
			} else if (key === "xchangePremiumPills") {
				// No feat requirement; gated by VrelCoin cost per upgrade instead.
				expect(detail.max).toBe(5);
			} else if (key === "xchangePurityTrait") {
				// Permanent pill immunity is always offered for its full VrelCoin price.
				expect(detail.max).toBe(1);
			} else {
				expect(detail.max).toBe(0);
			}
		}

		const feats = await getVar(page, "feats");
		expect(feats.allSaves.points).toBe(0);
	});

	test("groups related feat boosts into their own menus", async ({ page }) => {
		const dolFeats = {
			"Pocket Change": new Date().toJSON(),
			"Perfect Record": new Date().toJSON(),
			"A Special Trait": new Date().toJSON(),
			"Sex Specialist": new Date().toJSON(),
			Seductress: new Date().toJSON(),
			Thief: new Date().toJSON(),
			"May I have this Dance?": new Date().toJSON(),
			Aquanaut: new Date().toJSON(),
			Swift: new Date().toJSON(),
			"Green Fingered": new Date().toJSON(),
			Majordomo: new Date().toJSON(),
			Angel: new Date().toJSON(),
			"Fallen Angel": new Date().toJSON(),
			Demon: new Date().toJSON(),
			Neko: new Date().toJSON(),
			Wolf: new Date().toJSON(),
			"Unstoppable Force": new Date().toJSON(),
			"Immovable Object": new Date().toJSON(),
			"Agent 47": new Date().toJSON(),
			"Can't Touch This": new Date().toJSON(),
			Atlantean: new Date().toJSON(),
			"Ludicrous Speed": new Date().toJSON(),
			"Grass Toucher": new Date().toJSON(),
			"Demolisher of Filth": new Date().toJSON(),
			"Smarter than Einstein": new Date().toJSON(),
			"Human Calculator": new Date().toJSON(),
			"Twisted Desire": new Date().toJSON(),
			"No More Control": new Date().toJSON(),
			points: 160,
		};
		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			(window as any).SugarCube.Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			(window as any).SugarCube.State.variables.feats.allSaves.points = 160;
			const container = document.createElement("div");
			container.id = "feat-settings-test";
			document.body.append(container);
			Reflect.construct((window as any).SugarCube.Wikifier, [container, "<<featSettings>>"]);
		});

		const jumpMenu = page.locator("#feat-settings-test #featsPointsMenu > select.macro-listbox");
		const optionLabels = await jumpMenu.locator("option").allTextContents();
		expect(optionLabels.slice(0, 7)).toEqual([
			"Starting Money",
			"Core Characteristic Grades",
			"Basic Skill Grades",
			"Sex Skill Grades",
			"School Performance Grades",
			"Special Advanced Traits",
			"Sex-Rape Traits",
		]);
		expect(optionLabels).toContain("Transformation");
		expect(optionLabels).toContain("Sado-Maso");
		for (const trait of ["Orgasm Addict", "Asphyxiophilia", "Cum Dump", "Plaything", "Fucktoy", "Bitch", "Prey", "Critter Magnet", "Milk Addict"]) {
			expect(optionLabels).not.toContain(trait);
		}
		const sexSkills = ["Seduction", "Oral", "Chest", "Hands", "Buttocks", "Penile", "Anal", "Vaginal", "Feet", "Thighs"];
		for (const skill of sexSkills) {
			expect(optionLabels).not.toContain(skill);
		}
		const basicSkills = ["Skulduggery", "Dancing", "Swimming", "Athletics", "Tending", "Housekeeping"];
		for (const skill of basicSkills) {
			expect(optionLabels).not.toContain(`${skill} Grade`);
		}
		const advancedTraits = ["X-Change Purity", "Green Thumb", "Transcendence", "Adaptive Genes", "Daily Purity Boost", "Daily Impurity Boost"];
		for (const trait of advancedTraits) {
			expect(optionLabels).not.toContain(trait);
		}
		const transformations = ["Divine Transformations", "Animal Transformations"];
		for (const transformation of transformations) {
			expect(optionLabels).not.toContain(transformation);
		}
		const sadoMasoOptions = ["Sadism", "Masochism", "Sadist Trait", "Masochist Trait"];
		for (const option of sadoMasoOptions) {
			expect(optionLabels).not.toContain(option);
		}
		const coreCharacteristics = ["Physique", "Willpower", "Promiscuity", "Exhibitionism", "Deviancy"];
		for (const characteristic of coreCharacteristics) {
			expect(optionLabels).not.toContain(characteristic);
		}

		await jumpMenu.selectOption({ label: "Sex-Rape Traits" });
		const traitCheckboxes = page.locator('#feats-sexRapeTraits input[type="checkbox"][data-trait]');
		await expect(traitCheckboxes).toHaveCount(9);
		const traitDescriptions = {
			orgasmTrait:
				"So many orgasms have had a physiological effect. Cumming is more difficult but pleasurable orgasms relieve more stress and painful orgasms no longer increase stress.",
			chokeTrait: "You've come to love the feeling of lack of oxygen. Getting choked makes sex more pleasurable.",
			ejacTrait:
				"You've become accustomed to the scent of ejaculate and can take advantage of its calming effect. Your stress is reduced hourly depending on how much slime and semen covers you.",
			molestTrait: "You've learned to better cope with psychological trauma. Being molested no longer removes your sense of control (rape still does).",
			rapeTrait: "You've been raped so much that you've learned how to cope. Trauma increases more slowly.",
			bestialityTrait: "Animals have tried to breed with you so often that you're used to it. Trauma increases more slowly when attacked by animals.",
			tentacleTrait: "Many tentacles have had their way with your body. Trauma increases more slowly when attacked by tentacles.",
			critterMagnetTrait:
				"You cannot resist swarms and small creatures. You strip and submit to them, gaining relief from critter sex while other sex causes stress and trauma.",
			milkDrankTrait: "You take full advantage of the nutrition in fresh breast milk. Drinking it invigorates your body, improving physique.",
		};
		for (const [trait, description] of Object.entries(traitDescriptions)) {
			await expect(page.locator(`#feats-sexRapeTraits mouse[data-trait-tooltip="${trait}"] span`)).toHaveText(description);
		}

		await page.locator('#feats-sexRapeTraits input[data-trait="orgasmTrait"]').evaluate(element => (element as HTMLInputElement).click());
		let purchase = await page.evaluate(() => {
			const boosts = (window as any).SugarCube.State.variables.featsBoosts;
			return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.orgasmTrait, purchased: boosts.upgradeDetails.orgasmTrait.purchased };
		});
		expect(purchase).toEqual({ pointsUsed: 20, spent: 20, purchased: 1 });

		await page.locator('#feats-sexRapeTraits input[data-trait="orgasmTrait"]').evaluate(element => (element as HTMLInputElement).click());
		purchase = await page.evaluate(() => {
			const boosts = (window as any).SugarCube.State.variables.featsBoosts;
			return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.orgasmTrait, purchased: boosts.upgradeDetails.orgasmTrait.purchased };
		});
		expect(purchase).toEqual({ pointsUsed: 0, spent: 0, purchased: 0 });

		await page.evaluate(() => {
			const boosts = (window as any).SugarCube.State.variables.featsBoosts;
			boosts.upgradeDetails.seduction.purchased = boosts.upgradeDetails.seduction.max;
			boosts.upgrades.seduction = boosts.upgradeDetails.seduction.cost * boosts.upgradeDetails.seduction.max;
		});
		await jumpMenu.selectOption({ label: "Sex Skill Grades" });
		const groupedSexSkills = page.locator("#feats-sexSkills [data-sex-skill]");
		await expect(groupedSexSkills).toHaveCount(10);
		const groupedSexSkillNames = await groupedSexSkills.locator(".groupedFeatTitle").allTextContents();
		expect(groupedSexSkillNames.map(name => name.trim())).toEqual(sexSkills);
		const firstSexSkillBody = groupedSexSkills.first().locator(".groupedFeatBody");
		await expect(firstSexSkillBody).toContainText("You will start the game with seduction at level C+.");
		expect(await firstSexSkillBody.evaluate(element => getComputedStyle(element).display)).toBe("block");
		const desktopColumns = await page
			.locator("#feats-sexSkills .groupedFeatGrid")
			.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
		expect(desktopColumns).toBe(2);

		await jumpMenu.selectOption({ label: "Basic Skill Grades" });
		const groupedBasicSkills = page.locator("#feats-basicSkills [data-basic-skill]");
		await expect(groupedBasicSkills).toHaveCount(6);
		const groupedBasicSkillNames = await groupedBasicSkills.locator(".groupedFeatTitle").allTextContents();
		expect(groupedBasicSkillNames.map(name => name.trim())).toEqual(basicSkills);
		await expect(page.locator('#feats-basicSkills [data-basic-skill="tending"]')).not.toContainText("Green Thumb");

		await jumpMenu.selectOption({ label: "Special Advanced Traits" });
		const groupedAdvancedTraits = page.locator("#feats-advancedTraits [data-advanced-trait]");
		await expect(groupedAdvancedTraits).toHaveCount(6);
		const groupedAdvancedTraitNames = await groupedAdvancedTraits.locator(".groupedFeatTitle").allTextContents();
		expect(groupedAdvancedTraitNames.map(name => name.trim())).toEqual(advancedTraits);
		await page
			.locator('#feats-advancedTraits [data-advanced-trait="greenThumb"] .featButtonContainer button')
			.nth(3)
			.evaluate(element => (element as HTMLButtonElement).click());
		let greenThumbPurchase = await page.evaluate(() => {
			const boosts = (window as any).SugarCube.State.variables.featsBoosts;
			return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.greenThumb, purchased: boosts.upgradeDetails.greenThumb.purchased };
		});
		expect(greenThumbPurchase).toEqual({ pointsUsed: 40, spent: 40, purchased: 1 });
		await page
			.locator('#feats-advancedTraits [data-advanced-trait="greenThumb"] .featButtonContainer button')
			.nth(1)
			.evaluate(element => (element as HTMLButtonElement).click());
		greenThumbPurchase = await page.evaluate(() => {
			const boosts = (window as any).SugarCube.State.variables.featsBoosts;
			return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.greenThumb, purchased: boosts.upgradeDetails.greenThumb.purchased };
		});
		expect(greenThumbPurchase).toEqual({ pointsUsed: 0, spent: 0, purchased: 0 });
		await page
			.locator('#feats-advancedTraits [data-advanced-trait="purity"] .featButtonContainer button')
			.nth(3)
			.evaluate(element => (element as HTMLButtonElement).click());
		await expect(page.locator('#feats-advancedTraits [data-advanced-trait="impurity"]')).toContainText("Remove purity upgrades to make use of this upgrade.");
		await page
			.locator('#feats-advancedTraits [data-advanced-trait="purity"] .featButtonContainer button')
			.nth(1)
			.evaluate(element => (element as HTMLButtonElement).click());

		await jumpMenu.selectOption({ label: "Transformation" });
		const transformationCards = page.locator("#feats-transformations [data-transformation]");
		await expect(transformationCards).toHaveCount(2);
		expect((await transformationCards.locator(".groupedFeatTitle").allTextContents()).map(name => name.trim())).toEqual(transformations);
		for (const transformation of ["divineTFs", "animalTFs"]) {
			await page
				.locator(`#feats-transformations [data-transformation="${transformation}"] .featButtonContainer button`)
				.nth(3)
				.evaluate(element => (element as HTMLButtonElement).click());
			await expect(page.locator(`#feats-transformations [data-transformation="${transformation}"] select.macro-listbox`)).toHaveCount(1);
		}
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return { pointsUsed: boosts.pointsUsed, divine: boosts.upgrades.divineTFs, animal: boosts.upgrades.animalTFs };
			})
		).toEqual({ pointsUsed: 80, divine: 50, animal: 30 });
		for (const transformation of ["divineTFs", "animalTFs"]) {
			await page
				.locator(`#feats-transformations [data-transformation="${transformation}"] .featButtonContainer button`)
				.nth(1)
				.evaluate(element => (element as HTMLButtonElement).click());
		}

		await jumpMenu.selectOption({ label: "Sado-Maso" });
		const sadoMasoCards = page.locator("#feats-sadoMaso .groupedFeatCard");
		await expect(sadoMasoCards).toHaveCount(4);
		expect((await sadoMasoCards.locator(".groupedFeatTitle").allTextContents()).map(name => name.trim())).toEqual(sadoMasoOptions);
		expect(
			await page.evaluate(() => {
				const details = (window as any).SugarCube.State.variables.featsBoosts.upgradeDetails;
				return { sadism: details.sadism.cost, masochism: details.masochism.cost };
			})
		).toEqual({ sadism: 10, masochism: 10 });
		const sadismCard = page.locator('#feats-sadoMaso [data-sado-maso-boost="sadism"]');
		const sadismMax = await page.evaluate(() => (window as any).SugarCube.State.variables.featsBoosts.upgradeDetails.sadism.max);
		await sadismCard
			.locator(".featButtonContainer button")
			.nth(4)
			.evaluate(element => (element as HTMLButtonElement).click());
		await expect(sadismCard.locator(".featButtonContainer")).toContainText(`${sadismMax} / ${sadismMax}`);
		for (let click = 0; click < 3; click++) {
			await sadismCard
				.locator(".featButtonContainer button")
				.nth(4)
				.evaluate(element => (element as HTMLButtonElement).click());
		}
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return {
					purchased: boosts.upgradeDetails.sadism.purchased,
					max: boosts.upgradeDetails.sadism.max,
					spent: boosts.upgrades.sadism,
				};
			})
		).toEqual({ purchased: sadismMax, max: sadismMax, spent: sadismMax * 10 });
		await sadismCard
			.locator(".featButtonContainer button")
			.first()
			.evaluate(element => (element as HTMLButtonElement).click());
		for (const trait of ["sadistTrait", "masochistTrait"]) {
			await page.locator(`#feats-sadoMaso input[data-sado-maso-trait-choice="${trait}"]`).evaluate(element => (element as HTMLInputElement).click());
		}
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return {
					pointsUsed: boosts.pointsUsed,
					sadist: [boosts.upgrades.sadistTrait, boosts.upgradeDetails.sadistTrait.purchased],
					masochist: [boosts.upgrades.masochistTrait, boosts.upgradeDetails.masochistTrait.purchased],
				};
			})
		).toEqual({ pointsUsed: 46, sadist: [23, 1], masochist: [23, 1] });
		for (const trait of ["sadistTrait", "masochistTrait"]) {
			await page.locator(`#feats-sadoMaso input[data-sado-maso-trait-choice="${trait}"]`).evaluate(element => (element as HTMLInputElement).click());
		}

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.bodysize = 2;
			V.background.athlete = false;
			V.background.delinquent = false;
			V.physique = 107000;
			V.physiquesize = 77777;
			V.willpower = 600;
		});
		await jumpMenu.selectOption({ label: "Core Characteristic Grades" });
		const groupedCoreCharacteristics = page.locator("#feats-coreCharacteristics [data-core-characteristic]");
		await expect(groupedCoreCharacteristics).toHaveCount(5);
		const groupedCoreCharacteristicNames = await groupedCoreCharacteristics.locator(".groupedFeatTitle").allTextContents();
		expect(groupedCoreCharacteristicNames.map(name => name.trim())).toEqual(coreCharacteristics);
		const physiquePreview = page.locator('#feats-coreCharacteristics [data-core-characteristic="physique"]');
		const willpowerPreview = page.locator('#feats-coreCharacteristics [data-core-characteristic="willpower"]');
		await expect(physiquePreview).not.toContainText("107000");
		expect(await physiquePreview.locator(".groupedFeatBody > span").first().innerText()).toBe("4285");
		await expect(willpowerPreview).toContainText("willpower at 200.");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.physiquesize)).toBe(77777);
		await jumpMenu.selectOption({ label: "Sex Skill Grades" });

		await page.setViewportSize({ width: 390, height: 844 });
		const mobileLayout = await page.locator("#feats-sexSkills .groupedFeatGrid").evaluate(element => ({
			columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
			cardWidth: element.querySelector(".groupedFeatCard")?.getBoundingClientRect().width,
			buttonHeights: Array.from(element.querySelectorAll(".featButtonContainer button"), button => button.getBoundingClientRect().height),
		}));
		expect(mobileLayout.columns).toBe(1);
		expect(mobileLayout.cardWidth).toBeLessThanOrEqual(390);
		expect(new Set(mobileLayout.buttonHeights)).toEqual(new Set([44]));
	});
});

test.describe("Sado-Maso starting traits", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("applies the Sadist and Masochist traits independently", async ({ page }) => {
		await openGameWithFeats(page, { "Twisted Desire": new Date().toJSON(), points: 50 });
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.featsBoosts.upgrades.sadistTrait = 23;
			V.featsBoosts.upgrades.masochistTrait = 23;
			V.featsBoosts.upgradeDetails.sadistTrait.purchased = 1;
			V.featsBoosts.upgradeDetails.masochistTrait.purchased = 1;
		});
		await wikifyEval(page, "<<applyFeatBoosts>>");

		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				return {
					sadism: V.sadism,
					sadismLevel: V.sadism_level,
					masochism: V.masochism,
					masochismLevel: V.masochism_level,
				};
			})
		).toEqual({ sadism: 300, sadismLevel: 2, masochism: 300, masochismLevel: 2 });
	});
});

test.describe("Special clothing stage 3", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("unlocks selected route dialogue without inheriting Gwylan progress", async ({ page }) => {
		const now = new Date().toJSON();
		await openGameWithFeats(page, {
			"Curious Attire": now,
			"Wicked Wardrobe": now,
			Wildsong: now,
			points: 20,
		});
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");
		expect(await page.evaluate(() => (window as any).SugarCube.State.variables.featsBoosts.upgradeDetails.specialClothing.max)).toBe(3);
		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.feats.allSaves.points = 100;
			V.feats.allSaves.specialClothes = ["witch"];
			V.featsBoosts.upgradeDetails.specialClothing.purchased = 3;
			const container = document.createElement("div");
			container.id = "special-clothing-price-test";
			document.body.append(container);
			Reflect.construct((window as any).SugarCube.Wikifier, [container, "<<specialClothingFeatUI>>"]);
		});
		const witchSet = page.locator('#special-clothing-price-test input[type="checkbox"]').first();
		await expect(witchSet).toHaveAccessibleName(/Witch \(4/);
		await witchSet.evaluate(element => (element as HTMLInputElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.specialClothing };
			})
		).toEqual({ pointsUsed: 4, spent: 4 });
		await witchSet.evaluate(element => (element as HTMLInputElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return { pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.specialClothing };
			})
		).toEqual({ pointsUsed: 0, spent: 0 });

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.featsBoosts.upgradeDetails.specialClothing.purchased = 2;
			V.featsBoosts.specialClothesSets = { witch: true };
			V.featsBoosts.upgrades.specialClothing = 2;
			V.featsBoosts.pointsUsed = 2;
			const container = document.createElement("div");
			container.id = "special-clothing-rank-test";
			document.body.append(container);
			Reflect.construct((window as any).SugarCube.Wikifier, [
				container,
				'<<featsPointsMenuButtons "specialClothing" $featsBoosts.upgradeDetails.specialClothing>>',
			]);
		});
		const specialClothingRankButtons = page.locator("#special-clothing-rank-test .featButtonContainer button");
		await specialClothingRankButtons.nth(3).evaluate(element => (element as HTMLButtonElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return { rank: boosts.upgradeDetails.specialClothing.purchased, pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.specialClothing };
			})
		).toEqual({ rank: 3, pointsUsed: 4, spent: 4 });
		await specialClothingRankButtons.nth(1).evaluate(element => (element as HTMLButtonElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return { rank: boosts.upgradeDetails.specialClothing.purchased, pointsUsed: boosts.pointsUsed, spent: boosts.upgrades.specialClothing };
			})
		).toEqual({ rank: 2, pointsUsed: 2, spent: 2 });
		await specialClothingRankButtons.nth(1).evaluate(element => (element as HTMLButtonElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return {
					rank: boosts.upgradeDetails.specialClothing.purchased,
					pointsUsed: boosts.pointsUsed,
					spent: boosts.upgrades.specialClothing,
					selected: boosts.specialClothesSets.witch,
				};
			})
		).toEqual({ rank: 1, pointsUsed: 0, spent: 0, selected: false });
		await specialClothingRankButtons.first().evaluate(element => (element as HTMLButtonElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return {
					rank: boosts.upgradeDetails.specialClothing.purchased,
					pointsUsed: boosts.pointsUsed,
					spent: boosts.upgrades.specialClothing,
					selected: boosts.specialClothesSets.witch,
				};
			})
		).toEqual({ rank: 0, pointsUsed: 0, spent: 0, selected: false });

		await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			V.gwylanTalked = ["existing_story"];
			V.gwylanSeen = ["clothes_intro"];
			V.featsBoosts.upgradeDetails.specialClothing.purchased = 3;
			V.featsBoosts.upgrades.specialClothing = (window as any).SugarCube.setup.specialClothesSets.witch.featCost;
			V.featsBoosts.specialClothesSets = { witch: true };
		});
		await wikifyEval(page, "<<applyFeatBoosts>>");

		expect(
			await page.evaluate(() => {
				const { State, setup } = (window as any).SugarCube;
				const V = State.variables;
				const witchItems = setup.specialClothes.filter((item: any) => item.sets.includes("witch"));
				return {
					unlockLevels: witchItems.map((item: any) => V.specialClothes.find((clothing: any) => clothing.name === item.name).unlocked),
					routeAvailable: (window as any).getUnlockedSpecialSets().includes("witch"),
					gwylanTalked: V.gwylanTalked,
					gwylanSeen: V.gwylanSeen,
				};
			})
		).toEqual({
			unlockLevels: expect.arrayContaining([3]),
			routeAvailable: true,
			gwylanTalked: ["existing_story"],
			gwylanSeen: ["clothes_intro"],
		});
	});
});

test.describe("X-Change Purity Trait", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("permanently neutralises X-Change pills without hiding that the player was dosed", async ({ page }) => {
		await openGameWithFeats(page, { points: 150 });
		await navigateTo(page, "Start2");
		await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			SC.Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			SC.State.variables.feats.allSaves.points = 150;
			const container = document.createElement("div");
			container.id = "xchange-purity-test";
			document.body.append(container);
			Reflect.construct(SC.Wikifier, [container, '<<featsPointsMenuButtons "xchangePurityTrait" $featsBoosts.upgradeDetails.xchangePurityTrait>>']);
		});

		await page
			.locator("#xchange-purity-test .featButtonContainer button")
			.nth(3)
			.evaluate(element => (element as HTMLButtonElement).click());
		expect(
			await page.evaluate(() => {
				const boosts = (window as any).SugarCube.State.variables.featsBoosts;
				return {
					cost: boosts.upgradeDetails.xchangePurityTrait.cost,
					max: boosts.upgradeDetails.xchangePurityTrait.max,
					spent: boosts.upgrades.xchangePurityTrait,
					pointsUsed: boosts.pointsUsed,
				};
			})
		).toEqual({ cost: 150, max: 1, spent: 150, pointsUsed: 150 });

		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			const baseSex = V.player.sex;
			const timesTaken = V.xchange.timesTaken.player;
			SC.Wikifier.wikifyEval("<<applyFeatBoosts>>");
			V.xchange.nonconEnabled = 1;
			SC.Wikifier.wikifyEval('<<take-xchange 7 "genderflip">>');
			return {
				trait: V.xchange.pillPurityTrait,
				protected: (window as any).xchangePillProtectionActive(),
				therapyActive: (window as any).xchangeTherapyActive(),
				mayStillBePilled: (window as any).playerMayBeSpiked(),
				everConsumed: V.xchange.everConsumed,
				timesTaken: V.xchange.timesTaken.player - timesTaken,
				pillActive: V.xchange.pill.active,
				sexUnchanged: V.player.sex === baseSex,
			};
		});

		expect(result).toEqual({
			trait: true,
			protected: true,
			therapyActive: false,
			mayStillBePilled: true,
			everConsumed: true,
			timesTaken: 1,
			pillActive: false,
			sexUnchanged: true,
		});
	});

	test("neutralises Premium harm and Suspicious skill loss while still recording both doses", async ({ page }) => {
		await openGameWithFeats(page, { points: 150 });
		await navigateTo(page, "Start2");
		const result = await page.evaluate(() => {
			const SC = (window as any).SugarCube;
			const V = SC.State.variables;
			SC.Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			V.featsBoosts.upgrades.xchangePurityTrait = 150;
			V.featsBoosts.upgradeDetails.xchangePurityTrait.purchased = 1;
			SC.Wikifier.wikifyEval("<<applyFeatBoosts>>");

			V.pain = 0;
			V.stress = 0;
			V.trauma = 0;
			const premium = SC.setup.pills.find((pill: any) => pill.name === "X-Change Premium");
			V.sexStats.pills.lastTaken ??= {};
			V.sexStats.pills.mostTaken ??= {};
			V.sexStats.pills.pills[premium.name].owned = 1;
			const premiumTaken = (window as any).onTakeClickSilent(premium.name);

			V.physique = 1200;
			const beforeSuspicious = V.xchange.timesTaken.player;
			const originalRandom = (window as any).random;
			(window as any).random = () => 1;
			try {
				SC.Wikifier.wikifyEval("<<xchange-suspicious-pill>>");
			} finally {
				(window as any).random = originalRandom;
			}

			return {
				premiumTaken,
				pain: V.pain,
				stress: V.stress,
				trauma: V.trauma,
				premiumMenuOpened: !!V.xchange.premium?.originPassage,
				premiumDoseComplete: V.xchange.pill.done,
				physique: V.physique,
				suspiciousDoseRecorded: V.xchange.timesTaken.player - beforeSuspicious,
				everConsumed: V.xchange.everConsumed,
			};
		});

		expect(result).toEqual({
			premiumTaken: true,
			pain: 0,
			stress: 0,
			trauma: 0,
			premiumMenuOpened: false,
			premiumDoseComplete: true,
			physique: 1200,
			suspiciousDoseRecorded: 1,
			everConsumed: true,
		});
	});

	test("removes the obsolete X-Change debug history when a save loads", async ({ page }) => {
		await openGameWithFeats(page);
		await navigateTo(page, "Start2");
		expect(
			await page.evaluate(() => {
				const V = (window as any).SugarCube.State.variables;
				V.xchange._debugEffectHistory = ["genderflip", "unknown"];
				(window as any).jQuery(document).trigger(":onloadsave");
				return Object.hasOwn(V.xchange, "_debugEffectHistory");
			})
		).toBe(false);
	});
});

test.describe("Starting Money Boost", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("has max upgrades corresponding to acquired money feats", async ({ page }) => {
		const now = new Date().toJSON();
		// 4 money feats earned
		const dolFeats = {
			"Pocket Change": now,
			"Money Maker": now,
			Tycoon: now,
			Millionaire: now,
			points: 0,
		};
		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return {
				moneyMax: V.featsBoosts.upgradeDetails.money.max,
				moneyName: V.featsBoosts.name.money,
			};
		});

		// 4 money feats earned, maxMultiplier 2, max = 2*4 = 8
		expect(result.moneyMax).toBe(8);
		expect(result.moneyName).toBe("Starting Money");
	});

	test("purchase increases starting money", async ({ page }) => {
		// max money boosts = 4
		// (2 money feats earned, maxMultiplier 2, and 2*2 = 4)
		const dolFeats = {
			"Pocket Change": new Date().toJSON(),
			"Money Maker": new Date().toJSON(),
			points: 0,
		};

		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");

		const startMoney = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Wikifier = (window as any).SugarCube.Wikifier;

			Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			const moneyBefore = V.money;

			// purchase 1 money boost for 5 coins.
			V.featsBoosts.upgrades.money = 1 * 5;
			V.featsBoosts.upgradeDetails.money.purchased = 1;
			Wikifier.wikifyEval("<<applyFeatBoosts>>");

			return { before: moneyBefore, after: V.money };
		});

		// 1 (purchased) * max money boosts (4) * 2500 = 10000
		expect(startMoney.after - startMoney.before).toBe(10000);
	});
});

test.describe("Physique boost", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("increases physique", async ({ page }) => {
		const now = new Date().toJSON();
		// 2 physique boosts earned
		const dolFeats = {
			Powerful: now,
			"Unstoppable Force": now,
			points: 0,
		};
		await openGameWithFeats(page, dolFeats);
		await navigateTo(page, "Start2");

		const result = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			const Wikifier = (window as any).SugarCube.Wikifier;

			Wikifier.wikifyEval("<<setupFeatBoosts true>>");
			const physiqueBefore = V.physique;

			// purchase 1 money boost for 10 coins.
			V.featsBoosts.upgrades.physique = 10;
			V.featsBoosts.upgradeDetails.physique.purchased = 1;
			Wikifier.wikifyEval("<<applyFeatBoosts>>");

			return { before: physiqueBefore, after: V.physique };
		});

		// total gain = 1 (purchased) * 1500 (gain per purchase) = 1500
		expect(result.after - result.before).toBe(1500);
	});

	test("only offers whole-number upgrades", async ({ page }) => {
		const now = new Date().toJSON();
		await openGameWithFeats(page, {
			Powerful: now,
			points: 0,
		});
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");

		const max = await page.evaluate(() => {
			const V = (window as any).SugarCube.State.variables;
			return V.featsBoosts.upgradeDetails.physique.max;
		});

		expect(max).toBe(2);
	});
});

test.describe("Sex skill boosts", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("only offers whole-number upgrades", async ({ page }) => {
		const now = new Date().toJSON();
		const sexSkills = ["oral", "chest", "hands", "buttocks", "penile", "anal", "vaginal", "feet", "thighs"];
		await openGameWithFeats(page, {
			"Sex Specialist": now,
			points: 0,
		});
		await navigateTo(page, "Start2");
		await wikifyEval(page, "<<setupFeatBoosts true>>");

		const firstFeatMaxes = await page.evaluate(skills => {
			const V = (window as any).SugarCube.State.variables;
			return skills.map(skill => V.featsBoosts.upgradeDetails[skill].max);
		}, sexSkills);
		expect(firstFeatMaxes).toEqual(sexSkills.map(() => 2));

		await page.evaluate(date => {
			const V = (window as any).SugarCube.State.variables;
			V.feats.allSaves["God of Lust"] = date;
		}, now);
		await wikifyEval(page, "<<setupFeatBoosts true>>");

		const bothFeatsMaxes = await page.evaluate(skills => {
			const V = (window as any).SugarCube.State.variables;
			return skills.map(skill => V.featsBoosts.upgradeDetails[skill].max);
		}, sexSkills);
		expect(bothFeatsMaxes).toEqual(sexSkills.map(() => 5));
	});
});
