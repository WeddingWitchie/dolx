import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { openGame, navigateTo, assertNoErrors, type Page } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_ROOT = path.resolve(__dirname, "../game");
const LITERAL_RE = /<<wearProp\s+(?:"([^"]+)"|'([^']+)')(?:\s+(?:"[^"]+"|'[^']+'))?\s*>>/g;

function collectLiteralWearPropNames(dir: string): string[] {
	const names = new Set<string>();
	function walk(current: string) {
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.isFile() && full.endsWith(".twee")) {
				const src = readFileSync(full, "utf8");
				LITERAL_RE.lastIndex = 0;
				let m: RegExpExecArray | null;
				while ((m = LITERAL_RE.exec(src))) names.add(m[1] ?? m[2]);
			}
		}
	}
	walk(dir);
	return [...names].sort();
}

const NAMES = collectLiteralWearPropNames(GAME_ROOT);

type Failure = { name: string; layer: string; src: string };

async function probeAllNames(page: Page, names: string[]): Promise<Failure[]> {
	return page.evaluate(async namesArg => {
		const SC = (window as any).SugarCube;
		const Renderer = (window as any).Renderer;
		const model = Renderer.locateModel("main", "sidebar");

		const propLayers: [string, any][] = Object.entries(model.layers).filter(([, layer]: [string, any]) => {
			const fn = layer && typeof layer.srcfn === "function" ? layer.srcfn.toString() : "";
			return /options\.prop\b/.test(fn);
		});

		const failures: Failure[] = [];

		function probe(src: string): Promise<boolean> {
			return new Promise(resolve => {
				if (src in Renderer.ImageErrors) return resolve(false);
				if (src in Renderer.ImageCaches) return resolve(true);
				Renderer.ImageLoader.loadImage(
					src,
					{ scale: false, model },
					() => resolve(true),
					() => resolve(false)
				);
			});
		}

		for (const name of namesArg) {
			const macro = `<<wearProp "${name.replace(/"/g, '\\"')}">>`;
			try {
				SC.Wikifier.wikifyEval(macro);
			} catch (err) {
				failures.push({ name, layer: "(wikifyEval threw)", src: String(err) });
				continue;
			}
			const T = SC.State.temporary;
			if (!T || !T.prop) {
				failures.push({ name, layer: "(no T.prop)", src: "" });
				continue;
			}
			const layerOptions = { prop: { ...T.prop, show: true } };
			for (const [layerName, layer] of propLayers) {
				if (typeof layer.showfn === "function") {
					try {
						if (!layer.showfn(layerOptions)) continue;
					} catch {
						continue;
					}
				}
				let src: string | undefined;
				try {
					src = layer.srcfn(layerOptions);
				} catch (err) {
					failures.push({ name, layer: layerName, src: `(srcfn threw: ${String(err)})` });
					continue;
				}
				if (!src) continue;
				const ok = await probe(src);
				if (!ok) failures.push({ name, layer: layerName, src });
			}
		}
		return failures;
	}, names);
}

function formatFailures(failures: Failure[]): string {
	if (failures.length === 0) return "no failures";
	const lines = failures.map(f => `  ${f.name}  [${f.layer}]  ${f.src}`);
	return `wearProp image load failures (${failures.length}):\n${lines.join("\n")}`;
}

test.describe("wearProp image loads", () => {
	test.afterEach(async ({ page }) => {
		await assertNoErrors(page);
	});

	test("every <<wearProp>> name in game/ twee loads cleanly", async ({ page }) => {
		await openGame(page);
		await navigateTo(page, "Start2");

		const failures = await probeAllNames(page, NAMES);
		expect(failures, formatFailures(failures)).toEqual([]);
	});
});
