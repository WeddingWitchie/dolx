import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/*
 * Static twee scan: an "empty" passage (body is only <<effects>>/comments/whitespace) renders a blank screen with no links if a player ever reaches it.
 * All entries in KNOWN_EMPTY were audited (2026-07-17) and confirmed UNREACHABLE:
 * their inbound links live in widgets that are never invoked, in commented-out code, or behind conditions that can never be true.
 *
 * If this test fails because a NEW passage appears: either give it content or make sure nothing links to it, then add it to the list.
 * If it fails because a listed passage gained content: remove it from the list.
 * If you wire up any widget/link that leads into one of these, write the content first.
 */

const KNOWN_EMPTY = [
	// legacy street "exposed" travel system — entry widgets never invoked
	"Cliff Exposed",
	"Commercial Exposed",
	"Connudatus Exposed",
	"Danube Exposed",
	"Domus Exposed",
	"Elk Exposed",
	"Harvest Exposed",
	"High Exposed",
	"Industrial Exposed",
	"Mer Exposed",
	"Nightingale Exposed",
	"Oxford Exposed",
	"Park Exposed",
	"Residential Exposed",
	"Starfish Exposed",
	"Wolf Exposed",
	// vanilla WIP content with no reachable entry point
	"Estate Manor Scale",
	"Forest Trunk Cower",
	"Forest Trunk Howl",
	"Mirror Bodywriting Lewd",
	"Street Offer Nod",
	"Street Offer Push",
	// fork WIP — eventPoliceSergeant widget never invoked
	"Police Sergeant Alley Rape",
	// intentional placeholder
	"dummy",
].sort();

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(p, out);
		else if (entry.name.endsWith(".twee")) out.push(p);
	}
	return out;
}

function findEmptyPassages(): string[] {
	const gameDir = path.join(process.cwd(), "game");
	const empties: string[] = [];
	for (const file of walk(gameDir)) {
		const text = fs.readFileSync(file, "utf-8");
		const parts = text.split(/^(:: *[^\r\n]+)$/m);
		for (let i = 1; i < parts.length - 1; i += 2) {
			const header = parts[i];
			const body = parts[i + 1];
			const m = /^:: *([^[\r\n]+?) *(?:\[([^\]]*)\])? *$/.exec(header);
			if (!m) continue;
			const name = m[1].trim();
			const tags = (m[2] || "").split(/\s+/);
			if (tags.includes("widget")) continue;
			const stripped = body
				.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, "")
				.replace(/<<(effects|effect|set [^>]*|silently|\/silently|nobr|\/nobr)>>/g, "")
				.trim();
			if (stripped === "") empties.push(name);
		}
	}
	return empties.sort();
}

test.describe("empty passages", () => {
	test("every effectively-empty passage is a known, audited-unreachable stub", () => {
		const empties = findEmptyPassages();

		const unexpected = empties.filter(n => !KNOWN_EMPTY.includes(n));
		expect(
			unexpected,
			`New empty passage(s) found! Give them content or verify they are unreachable, then update KNOWN_EMPTY: ${unexpected.join(", ")}`
		).toEqual([]);

		const resolved = KNOWN_EMPTY.filter(n => !empties.includes(n));
		expect(resolved, `Passage(s) no longer empty. Remove from KNOWN_EMPTY: ${resolved.join(", ")}`).toEqual([]);
	});
});
