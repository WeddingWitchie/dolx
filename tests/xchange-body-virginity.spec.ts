import { test, expect } from "@playwright/test";
import { openGame, navigateTo } from "./helpers";

/**
 * X-Change keeps a separate virginity record per body: the player's real body, the genderflipped
 * X-Change body, and the herm body. Losing a virginity while transformed must not show up on the
 * real body when the pill wears off, and vice versa.
 *
 * The record a loss is filed under comes from setup.xChangeActiveBodyVirginityRole(), which reads the
 * live body rather than the pill's effect flags. Those flags can go stale: X-Change Premium re-runs
 * <<xchange-effects>> on a player who is already transformed, which used to reset genderflipEffect to
 * false even though the body had not reverted. Everything lost after that was written onto the real
 * body's record, so both bodies ended up reporting the same takers.
 */

type Snapshot = {
	sex: string;
	gender_body: string;
	role: string;
	virginity: Record<string, unknown>;
};

type Page = import("@playwright/test").Page;

/** Female player whose real body has a history, standing in the real body. */
async function startUsedFemale(page: Page) {
	await openGame(page);
	await navigateTo(page, "Start2");
	await page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		/* Start2 stops short of the full new-game pill inventory, so give the drawer its buckets. */
		V.sexStats.pills.lastTaken ??= {};
		V.sexStats.pills.mostTaken ??= {};

		V.player.sex = "f";
		V.player.gender_body = "f";
		V.player.vaginaExist = true;
		V.player.penisExist = false;
		V.player.virginity.vaginal = "Avery";
		V.player.virginity.anal = "large tentacle";
		V.player.virginity.oral = "rough tentacle";
	});
}

async function run(page: Page, macro: string) {
	await page.evaluate(m => (window as any).SugarCube.Wikifier.wikifyEval(m), macro);
}

/** Read the live state fresh every time — SugarCube swaps the variables object out under you. */
async function snap(page: Page): Promise<Snapshot> {
	return page.evaluate(() => {
		const SC = (window as any).SugarCube;
		const V = SC.State.variables;
		return {
			sex: V.player.sex,
			gender_body: V.player.gender_body,
			role: SC.setup.xChangeActiveBodyVirginityRole(),
			virginity: JSON.parse(JSON.stringify(V.player.virginity)),
		};
	});
}

/** Lose a virginity the way combat does: mutate it, then file it against the live body. */
async function loseVirginity(page: Page, type: string, taker: string) {
	await page.evaluate(
		({ t, who }) => {
			const SC = (window as any).SugarCube;
			SC.State.variables.player.virginity[t] = who;
			SC.setup.xChangeRecordActiveBodyVirginity();
		},
		{ t: type, who: taker }
	);
}

test("a fresh X-Change body starts intact and the real body keeps its history", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<take-xchange 3 "genderflip">>');
	const changed = await snap(page);
	expect(changed.role).toBe("xchange");
	expect(changed.virginity.vaginal).toBe(true);
	expect(changed.virginity.anal).toBe(true);
	expect(changed.virginity.oral).toBe(true);

	await loseVirginity(page, "penile", "Gwylan");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.role).toBe("real");
	expect(real.virginity.vaginal).toBe("Avery");
	expect(real.virginity.anal).toBe("large tentacle");
	expect(real.virginity.penile).toBe(true);
});

test("a second pill taken while transformed does not move losses onto the real body", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<take-xchange 3 "genderflip">>');
	/* X-Change Premium restacks by calling xchange-effects again, mid-session. */
	await run(page, '<<set _e to ["passion"]>><<xchange-effects 3 _e>>');

	const restacked = await snap(page);
	expect(restacked.sex).toBe("m");
	expect(restacked.role).toBe("xchange");

	await loseVirginity(page, "penile", "Gwylan");
	await loseVirginity(page, "oral", "a stranger");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.sex).toBe("f");
	expect(real.role).toBe("real");
	expect(real.virginity.penile).toBe(true);
	expect(real.virginity.oral).toBe("rough tentacle");
	expect(real.virginity.vaginal).toBe("Avery");
});

test("the X-Change body remembers its own losses when re-entered", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<take-xchange 3 "genderflip">>');
	await loseVirginity(page, "penile", "Gwylan");
	await run(page, "<<xchange-restore>>");
	await run(page, '<<take-xchange 3 "genderflip">>');

	const changedAgain = await snap(page);
	expect(changedAgain.virginity.penile).toBe("Gwylan");
	expect(changedAgain.virginity.vaginal).toBe(true);
	expect(changedAgain.virginity.anal).toBe(true);
});

test("the herm body keeps a third, separate record", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<take-xchange 3 "herm">>');
	const herm = await snap(page);
	expect(herm.gender_body).toBe("a");
	expect(herm.role).toBe("herm");
	expect(herm.virginity.vaginal).toBe(true);
	expect(herm.virginity.anal).toBe(true);

	await loseVirginity(page, "vaginal", "Whitney");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.virginity.vaginal).toBe("Avery");
});

test("a crossdress-only pill shares the real body's record", async ({ page }) => {
	await startUsedFemale(page);

	/* sissify/butchify restyle the body but leave sex and genitals alone, so it is still the real body. */
	await run(page, '<<take-xchange 3 "crossdress">>');
	const crossdressed = await snap(page);
	expect(crossdressed.sex).toBe("f");
	expect(crossdressed.role).toBe("real");
	expect(crossdressed.virginity.vaginal).toBe("Avery");

	await loseVirginity(page, "handholding", "Robin");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.virginity.handholding).toBe("Robin");
	expect(real.virginity.vaginal).toBe("Avery");
});

test("a cloned NPC body keeps a record of its own", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<xchange-clone 3 "Robin">>');
	const clone = await snap(page);
	expect(clone.role).toBe("clone:Robin");
	/* Wearing a copy of someone else's body does not come with your own history, or theirs. */
	expect(clone.virginity.vaginal).toBe(true);
	expect(clone.virginity.anal).toBe(true);

	await loseVirginity(page, "oral", "Whitney");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.role).toBe("real");
	expect(real.virginity.vaginal).toBe("Avery");
	expect(real.virginity.oral).toBe("rough tentacle");

	/* Back in your own body, nothing should still claim a clone is worn — story checks read pill.clone
	   to decide whether you are walking around as an NPC. */
	const cloneFlag = await page.evaluate(() => (window as any).SugarCube.State.variables.xchange.pill.clone);
	expect(cloneFlag).toBe("none");

	/* Re-entering the same clone brings back what happened in it, and leaves the other bodies alone. */
	await run(page, '<<xchange-clone 3 "Robin">>');
	const cloneAgain = await snap(page);
	expect(cloneAgain.virginity.oral).toBe("Whitney");
	expect(cloneAgain.virginity.vaginal).toBe(true);

	const stored = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return JSON.parse(JSON.stringify(V.xchange.pill.bodyVirginity));
	});
	expect(stored["clone:Robin"].v.oral).toBe("Whitney");
	expect(stored.real.v.oral).toBe("rough tentacle");
	/* Building a male clone routes through the genderflip path, which seeds the X-Change body's record.
	   That record must be left intact — the clone's losses belong to the clone. */
	expect(stored.xchange.v.oral).toBe(true);
	expect(stored.xchange.v.vaginal).toBe(true);
});

test("a second pill taken while cloned keeps the clone's record", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<xchange-clone 3 "Robin">>');
	/* The restack must not forget which body is being worn. pill.clone names the body, not the dose. */
	await run(page, '<<set _e to ["passion"]>><<xchange-effects 3 _e>>');

	const restacked = await snap(page);
	expect(restacked.role).toBe("clone:Robin");

	await loseVirginity(page, "oral", "Whitney");
	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.role).toBe("real");
	expect(real.virginity.oral).toBe("rough tentacle");
	expect(real.virginity.vaginal).toBe("Avery");

	const stored = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return JSON.parse(JSON.stringify(V.xchange.pill.bodyVirginity));
	});
	expect(stored["clone:Robin"].v.oral).toBe("Whitney");
	/* Ending the clone must not write the copied body over the player's own bodies. */
	expect(stored.xchange.v.oral).toBe(true);
	expect(stored.herm === undefined || stored.herm.v.oral === true).toBe(true);
});

test("a pill that transforms out of a clone banks the clone first", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<xchange-clone 3 "Robin">>');
	await loseVirginity(page, "oral", "Whitney");

	/* Cloning an NPC of the other gender routes through <<xchange-addeffect "genderflip">>, leaving the
	   flag set. The herm effect then skips its own flip branch, so hermify is what takes the player out
	   of the clone body — the exit path that used to file the clone's history under "xchange". */
	await page.evaluate(() => {
		(window as any).SugarCube.State.variables.xchange.pill.genderflipEffect = true;
	});

	/* Hermifying a clone leaves the clone body behind, so the clone has to be banked before the change. */
	await run(page, '<<set _e to ["herm"]>><<xchange-effects 3 _e>>');

	const herm = await snap(page);
	expect(herm.gender_body).toBe("a");
	expect(herm.role).toBe("herm");
	/* The herm body is its own body: it does not inherit what happened in the clone. */
	expect(herm.virginity.oral).toBe(true);

	await run(page, "<<xchange-restore>>");

	const stored = await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		return JSON.parse(JSON.stringify(V.xchange.pill.bodyVirginity));
	});
	expect(stored["clone:Robin"].v.oral).toBe("Whitney");
	expect(stored.herm.v.oral).toBe(true);
	expect(stored.real.v.oral).toBe("rough tentacle");
	/* The clone's history must not be filed against the player's own X-Change body on the way out. */
	expect(stored.xchange.v.oral).toBe(true);
});

test("an upgraded save with no real-body record keeps its shared history", async ({ page }) => {
	await startUsedFemale(page);

	await run(page, '<<take-xchange 3 "genderflip">>');
	await page.evaluate(() => {
		const V = (window as any).SugarCube.State.variables;
		/* A save from before virginity was split per body: no store, and both bodies shared one history. */
		delete V.xchange.pill.bodyVirginity;
		V.player.virginity.vaginal = "Avery";
		V.player.virginity.anal = "large tentacle";
		V.player.virginity.oral = "rough tentacle";
	});

	await run(page, "<<xchange-restore>>");

	const real = await snap(page);
	expect(real.virginity.vaginal).toBe("Avery");
	expect(real.virginity.anal).toBe("large tentacle");
	expect(real.virginity.oral).toBe("rough tentacle");
});
