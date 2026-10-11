/* globals formatMoney */
/* Fruit game core. Physics is Matter.js (global `Matter`), stepped at a fixed 60 Hz on simulated time. The game lives
 * in JS memory: open() mounts it, any passage change destroys it, and leave() first saves an unfinished run to
 * $suikaData.run. */
(() => {
	const config = Object.freeze({
		width: 300,
		height: 420,
		dropY: 34, // centre of the fruit being aimed
		dangerY: 76, // the line; a settled fruit whose top stays above it fills the overflow timer
		wallThickness: 120,
		stepMs: 1000 / 60,
		maxStepsPerFrame: 5,
		gravity: 1,
		dropCooldownMs: 550,
		settleGraceMs: 1200, // a fruit this new (dropped or merged) never counts as over the line
		overflowMs: 2500, // how long the pile must stay over the line to end the game
		warnMargin: 36, // a settled pile top within this many units below the line shows the amber warning
		growSteps: 6, // a merged fruit grows to full size over this many steps instead of popping in
		keyAimSpeed: 0.25, // world units per ms when aiming with the keyboard
		dropPool: 5, // the next fruit is one of the first five tiers
		watermelonBonus: 100, // two watermelons that touch both vanish for this many points
		maxFruit: 90, // safety cap on fruit in the jar; far above what fits under the line in normal play
		collideSpeed: 3, // relative speed (per step) a collision needs before it makes a sound
		maxDpr: 2,
		body: Object.freeze({ restitution: 0.15, friction: 0.2, frictionStatic: 0.5, frictionAir: 0.004, density: 0.001 }),
		/* Arcade only. `uses` is the charges per run. Velocities are Matter's per-step units (px per 1/60 s). */
		abilities: Object.freeze({
			shake: Object.freeze({
				uses: 2,
				pulses: 4, // alternating left/right shoves
				pulseGapMs: 120,
				push: 3.2, // sideways speed added per pulse
				lift: 2.4, // upward speed added per pulse; this is the risk, fruit can bounce over the line
				maxSpeed: 9, // speed cap after each pulse; below the cherry's radius per step, so nothing tunnels
				cooldownMs: 1500, // no ability (including another shake) until this long after a shake starts
			}),
			shuffle: Object.freeze({ uses: 3 }),
			wand: Object.freeze({ uses: 1, maxTier: 4, touchSlop: 6 }), // maxTier 4: the five drop fruits
			swap: Object.freeze({ uses: 2 }),
		}),
		/* A chain starts with a drop, a shake or a wand removal and ends once no merge has happened for firstMs (before
		 * its first merge) or gapMs (after one). Under Arcade rules merge n of a chain (n >= 2) adds
		 * min(maxBonus, bonusPerStep * (n - 1)) on top of the normal merge points; other modes only show the chain. */
		combo: Object.freeze({ firstMs: 3000, gapMs: 1000, bonusPerStep: 2, maxBonus: 10, showMs: 1100 }),
		/* Zen: when the jar reaches maxFruit, this many of the smallest fruit are picked off. */
		zen: Object.freeze({ fullHarvest: 10 }),
		/* Decorative effects; reduced motion skips particles and the shake wobble. */
		effects: Object.freeze({ maxEffects: 90, glowMs: 320, floatMs: 900, particleMs: 650, toastMs: 2600 }),
	});

	/* label; arcade: Arcade rules (null: taken from the challenge); best: story variable holding the mode's best score;
	 * zen: the jar never ends the run, fruit over the line are picked off instead. */
	const modes = Object.freeze({
		classic: Object.freeze({ label: "Classic", arcade: false, best: "suikaBest" }),
		arcade: Object.freeze({ label: "Arcade", arcade: true, best: "suikaBestArcade" }),
		zen: Object.freeze({ label: "Zen", arcade: false, best: null, zen: true }),
		challenge: Object.freeze({ label: "Challenge", arcade: null, best: null }),
		daily: Object.freeze({ label: "Daily", arcade: null, best: null }),
		tutorial: Object.freeze({ label: "Tutorial", arcade: false, best: null }),
	});
	const freeModes = Object.freeze(["classic", "arcade", "zen"]);

	/* Seeded generator (mulberry32). The state is a plain number, so a saved run carries it and resumes the same
	 * fruit sequence. */
	function makeRng(seed) {
		const rng = {
			state: seed >>> 0,
			next() {
				let t = (rng.state = (rng.state + 0x6d2b79f5) >>> 0);
				t = Math.imul(t ^ (t >>> 15), t | 1);
				t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			},
		};
		return rng;
	}
	const freshSeed = () => (Math.random() * 4294967296) >>> 0;

	/* points: awarded when this fruit is made by a merge. The colours feed the renderer only: `color` is the body (and the
	 * HUD swatch), `light`/`shade` the two ends of its shading, `rim` its outline. */
	const fruits = Object.freeze(
		[
			{ name: "Cherry", radius: 11, points: 0, color: "#e3263f", light: "#ff8a8f", shade: "#a8102a", rim: "#6e0a1a" },
			{ name: "Strawberry", radius: 15, points: 1, color: "#f0404c", light: "#ff9a96", shade: "#c21d2e", rim: "#7e1420" },
			{ name: "Grape", radius: 20, points: 3, color: "#8e4fd0", light: "#c79bf2", shade: "#5f2c9c", rim: "#3d1a66" },
			{ name: "Dekopon", radius: 24, points: 6, color: "#f9a825", light: "#ffd77a", shade: "#e07e0c", rim: "#8a4f06" },
			{ name: "Persimmon", radius: 30, points: 10, color: "#f2711c", light: "#ffb36b", shade: "#cf4f0c", rim: "#7f2f05" },
			{ name: "Apple", radius: 36, points: 15, color: "#e3302c", light: "#ff8c7a", shade: "#b5161a", rim: "#6f0c0e" },
			{ name: "Pear", radius: 42, points: 21, color: "#e3e35a", light: "#fbfba8", shade: "#b9c23a", rim: "#6f7418" },
			{ name: "Peach", radius: 49, points: 28, color: "#fba9a2", light: "#ffe3c9", shade: "#ee7f8a", rim: "#b04e5c" },
			{ name: "Pineapple", radius: 56, points: 36, color: "#f6d23c", light: "#fff09a", shade: "#e0a81c", rim: "#8a6408" },
			{ name: "Melon", radius: 65, points: 45, color: "#a6db6a", light: "#e2f7b8", shade: "#6fb23e", rim: "#3f7420" },
			{ name: "Watermelon", radius: 76, points: 55, color: "#3fa046", light: "#86d17c", shade: "#257a2f", rim: "#124a1a" },
		].map(f => Object.freeze(f))
	);
	const lastTier = fruits.length - 1;

	/* Pure rules, kept apart from the engine so they can be checked on their own. */
	const rules = Object.freeze({
		/* What two touching fruits of `tier` become: { tier, points }, tier null when they vanish. */
		merge(tier) {
			if (tier >= lastTier) return { tier: null, points: config.watermelonBonus };
			return { tier: tier + 1, points: fruits[tier + 1].points };
		},
		pickDropTier(random = Math.random) {
			return Math.min(config.dropPool - 1, Math.floor(random() * config.dropPool));
		},
		/* One step of the overflow timer. Returns the new timer; the game is over once it reaches config.overflowMs. */
		overflow(timer, anyOver, dt) {
			return anyOver ? timer + dt : 0;
		},
		isOver(body, now) {
			const f = body.plugin.suika;
			return now - f.bornAt >= config.settleGraceMs && body.position.y - body.circleRadius < config.dangerY;
		},
		clampAim(x, tier) {
			const r = fruits[tier].radius;
			return Math.max(r, Math.min(config.width - r, x));
		},
		/* A drop fruit other than `tier`, evenly from the rest of the drop pool. */
		pickOther(tier, random = Math.random) {
			const pick = Math.min(config.dropPool - 2, Math.floor(random() * (config.dropPool - 1)));
			return pick >= tier ? pick + 1 : pick;
		},
		/* Extra points for merge number `n` of one chain (Arcade). */
		comboBonus(n) {
			return n < 2 ? 0 : Math.min(config.combo.maxBonus, config.combo.bonusPerStep * (n - 1));
		},
	});

	/* ---- fruit art ----
	 * Every fruit is drawn in units of its collision radius (the body circle is radius 1 around 0,0). Bodies stay inside
	 * that circle; stems, leaves and crowns may reach out to `spriteExtent`, so they overlap neighbours only a little. */
	const spriteExtent = 1.2;
	let outline = 0.07; // 0.11 with bold outlines
	/* Appearance options (renderer.setStyle): faces, simple (flat colours, no texture or shine), bold outlines. */
	const style = { faces: true, simple: false, bold: false };
	const ink = "#2b1710";
	const leafGreen = { fill: "#62b83c", rim: "#2c6619" };

	function shading(ctx, f, cx = 0, cy = 0, r = 1) {
		if (style.simple) return f.color;
		const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.42, r * 0.05, cx, cy, r * 1.1);
		g.addColorStop(0, f.light);
		g.addColorStop(0.45, f.color);
		g.addColorStop(1, f.shade);
		return g;
	}

	function paint(ctx, path, fill, rim, width = outline) {
		ctx.fillStyle = fill;
		ctx.fill(path);
		ctx.lineWidth = width;
		ctx.strokeStyle = rim;
		ctx.stroke(path);
	}

	function circle(cx, cy, r) {
		const p = new Path2D();
		p.arc(cx, cy, r, 0, Math.PI * 2);
		return p;
	}

	function ellipse(cx, cy, rx, ry) {
		const p = new Path2D();
		p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
		return p;
	}

	/* A left-right symmetric outline from its right half: the top point (0, top), then bezier segments
	 * [c1x, c1y, c2x, c2y, x, y] running down the right side and ending on the centre line. */
	function mirrored(top, curves) {
		const p = new Path2D();
		p.moveTo(0, top);
		for (const c of curves) p.bezierCurveTo(c[0], c[1], c[2], c[3], c[4], c[5]);
		for (let i = curves.length - 1; i >= 0; i--) {
			const c = curves[i];
			const prev = i ? curves[i - 1] : [0, 0, 0, 0, 0, top];
			p.bezierCurveTo(-c[2], c[3], -c[0], c[1], -prev[4], prev[5]);
		}
		p.closePath();
		return p;
	}

	function shine(ctx, x, y, rx, ry, alpha = 0.55) {
		if (style.simple) return;
		ctx.fillStyle = "rgb(255 255 255 / " + alpha + ")";
		ctx.beginPath();
		ctx.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2);
		ctx.fill();
	}

	/* `pop` rings the eyes and mouth in white, for dark fruit where plain ink would vanish. */
	function face(ctx, y, spread, size = 1, pop = false) {
		if (!style.faces) return;
		ctx.fillStyle = "rgb(255 105 125 / 45%)";
		for (const s of [-1, 1]) {
			ctx.beginPath();
			ctx.ellipse(s * (spread + 0.1 * size), y + 0.13 * size, 0.11 * size, 0.06 * size, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		for (const s of [-1, 1]) {
			ctx.fillStyle = ink;
			ctx.beginPath();
			ctx.ellipse(s * spread, y, 0.065 * size, 0.085 * size, 0, 0, Math.PI * 2);
			if (pop) {
				ctx.strokeStyle = "rgb(255 255 255 / 90%)";
				ctx.lineWidth = 0.05 * size;
				ctx.stroke();
			}
			ctx.fill();
			ctx.fillStyle = "#fff";
			ctx.beginPath();
			ctx.arc(s * spread - 0.018 * size, y - 0.03 * size, 0.024 * size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.beginPath();
		ctx.arc(0, y + 0.05 * size, 0.07 * size, 0.2 * Math.PI, 0.8 * Math.PI);
		if (pop) {
			ctx.strokeStyle = "rgb(255 255 255 / 90%)";
			ctx.lineWidth = 0.1 * size;
			ctx.stroke();
		}
		ctx.strokeStyle = ink;
		ctx.lineWidth = 0.045 * size;
		ctx.stroke();
	}

	/* A leaf from its base (x, y) pointing along `angle`, `len` long. */
	function leaf(ctx, x, y, angle, len, width = 0.45, colours = leafGreen) {
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(angle);
		const w = len * width;
		const p = new Path2D();
		p.moveTo(0, 0);
		p.quadraticCurveTo(len * 0.45, -w, len, 0);
		p.quadraticCurveTo(len * 0.45, w, 0, 0);
		paint(ctx, p, colours.fill, colours.rim, 0.05);
		ctx.strokeStyle = colours.rim;
		ctx.lineWidth = 0.03;
		ctx.beginPath();
		ctx.moveTo(len * 0.1, 0);
		ctx.lineTo(len * 0.8, 0);
		ctx.stroke();
		ctx.restore();
	}

	function stem(ctx, x0, y0, cx, cy, x1, y1) {
		for (const [colour, width] of [
			["#3b2210", 0.15],
			["#8d5a2b", 0.08],
		]) {
			ctx.strokeStyle = colour;
			ctx.lineWidth = width;
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.quadraticCurveTo(cx, cy, x1, y1);
			ctx.stroke();
		}
	}

	/* Runs `draw` clipped to `body`, then re-strokes the outline over the texture. */
	function textured(ctx, f, body, draw) {
		if (!style.simple) {
			ctx.save();
			ctx.clip(body);
			draw();
			ctx.restore();
		}
		ctx.lineWidth = outline;
		ctx.strokeStyle = f.rim;
		ctx.stroke(body);
	}

	function dots(ctx, colour, r, points) {
		if (style.simple) return;
		ctx.fillStyle = colour;
		for (const [x, y] of points) {
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	const drawFruit = [
		/* Cherry */
		(ctx, f) => {
			stem(ctx, 0, -0.6, -0.05, -0.95, 0.3, -1.1);
			leaf(ctx, 0.26, -1.06, -0.25, 0.42);
			paint(ctx, circle(0, 0.1, 0.88), shading(ctx, f, 0, 0.1, 0.88), f.rim);
			shine(ctx, -0.38, -0.22, 0.2, 0.11);
			face(ctx, 0.16, 0.27, 0.95);
		},
		/* Strawberry: a rounded heart point-down, seeds, and a green star of leaves on top. */
		(ctx, f) => {
			const body = mirrored(-0.7, [
				[0.55, -0.95, 1.02, -0.6, 0.94, -0.05],
				[0.86, 0.5, 0.38, 0.92, 0, 1.0],
			]);
			paint(ctx, body, shading(ctx, f), f.rim);
			ctx.fillStyle = "#ffe7a0";
			for (const [x, y] of [
				[-0.55, -0.4],
				[0.55, -0.4],
				[-0.2, -0.45],
				[0.2, -0.45],
				[-0.75, 0.02],
				[0.75, 0.02],
				[-0.56, 0.4],
				[0.56, 0.4],
				[-0.24, 0.55],
				[0.24, 0.55],
				[0, 0.8],
			]) {
				ctx.beginPath();
				ctx.ellipse(x, y, 0.04, 0.065, x * 0.4, 0, Math.PI * 2);
				ctx.fill();
			}
			for (const a of [-2.75, -2.1, -1.57, -1.04, -0.39]) leaf(ctx, 0, -0.68, a, 0.4, 0.5);
			stem(ctx, 0, -0.75, 0, -0.95, 0.08, -1.08);
			shine(ctx, -0.45, -0.25, 0.16, 0.09, 0.45);
			face(ctx, 0.08, 0.26, 0.9);
		},
		/* Grape: a bunch of grapes under a stem and leaf. */
		(ctx, f) => {
			for (const [x, y, r] of [
				[-0.42, -0.36, 0.36],
				[0.42, -0.36, 0.36],
				[0, -0.44, 0.36],
				[-0.6, 0.1, 0.36],
				[0.6, 0.1, 0.36],
				[-0.2, 0.06, 0.37],
				[0.2, 0.06, 0.37],
				[-0.22, 0.52, 0.36],
				[0.22, 0.52, 0.36],
				[0, 0.8, 0.2],
			]) {
				paint(ctx, circle(x, y, r), shading(ctx, f, x, y, r), f.rim, 0.06);
				shine(ctx, x - r * 0.38, y - r * 0.4, r * 0.22, r * 0.12, 0.5);
			}
			stem(ctx, 0, -0.72, 0.02, -0.95, 0.06, -1.1);
			leaf(ctx, 0.04, -0.9, -0.45, 0.5);
			face(ctx, 0.12, 0.2, 0.9, true);
		},
		/* Dekopon: a round orange with the knob on top. */
		(ctx, f) => {
			const body = new Path2D();
			body.arc(0, 0.12, 0.87, 0, Math.PI * 2);
			body.moveTo(0.3, -0.7);
			body.arc(0, -0.7, 0.3, 0, Math.PI * 2);
			/* Double-width stroke under the fill leaves only the outer edge of the merged shape. */
			ctx.lineWidth = outline * 2;
			ctx.strokeStyle = f.rim;
			ctx.stroke(body);
			ctx.fillStyle = shading(ctx, f, 0, 0.12, 0.87);
			ctx.fill(body);
			dots(ctx, "rgb(190 100 0 / 35%)", 0.03, [
				[-0.55, -0.1],
				[0.6, -0.05],
				[-0.35, 0.6],
				[0.45, 0.55],
				[0.1, 0.8],
				[-0.7, 0.35],
				[0.72, 0.32],
			]);
			leaf(ctx, 0.02, -0.97, -0.55, 0.36);
			shine(ctx, -0.4, -0.12, 0.2, 0.1);
			face(ctx, 0.18, 0.28);
		},
		/* Persimmon: squat orange body under a big four-leaf calyx. */
		(ctx, f) => {
			paint(ctx, ellipse(0, 0.1, 0.98, 0.86), shading(ctx, f, 0, 0.1, 0.92), f.rim);
			shine(ctx, -0.45, -0.1, 0.22, 0.1);
			const calyx = { fill: "#4f9a32", rim: "#24561a" };
			for (const a of [Math.PI - 0.25, 0.25, Math.PI + 0.85, -0.85]) leaf(ctx, 0, -0.68, a, 0.46, 0.6, calyx);
			ctx.fillStyle = "#6b4321";
			ctx.strokeStyle = "#3b2210";
			ctx.lineWidth = 0.04;
			ctx.beginPath();
			ctx.rect(-0.07, -0.92, 0.14, 0.22);
			ctx.fill();
			ctx.stroke();
			face(ctx, 0.22, 0.3);
		},
		/* Apple: two top lobes with a dip for the stem, a small dip underneath, and a leaf. */
		(ctx, f) => {
			const body = mirrored(-0.6, [
				[0.32, -0.98, 1.0, -0.88, 0.97, -0.12],
				[0.94, 0.58, 0.52, 0.98, 0.2, 0.94],
				[0.1, 0.9, 0.04, 0.88, 0, 0.88],
			]);
			stem(ctx, 0, -0.55, -0.02, -0.85, 0.1, -1.08);
			paint(ctx, body, shading(ctx, f), f.rim);
			leaf(ctx, 0.06, -0.86, -0.55, 0.45);
			shine(ctx, -0.48, -0.32, 0.2, 0.11);
			face(ctx, 0.14, 0.3);
		},
		/* Pear: narrow neck, wide bottom, a few freckles. */
		(ctx, f) => {
			const body = mirrored(-0.86, [
				[0.3, -0.86, 0.38, -0.55, 0.48, -0.25],
				[0.6, 0.02, 0.92, 0.12, 0.88, 0.5],
				[0.85, 0.9, 0.4, 0.99, 0, 0.99],
			]);
			stem(ctx, 0, -0.82, 0.02, -1.0, 0.12, -1.12);
			paint(ctx, body, shading(ctx, f, 0, 0.3, 0.9), f.rim);
			leaf(ctx, 0.08, -0.98, -0.3, 0.36);
			dots(ctx, "rgb(140 110 20 / 40%)", 0.028, [
				[-0.25, -0.35],
				[0.2, -0.5],
				[-0.6, 0.55],
				[0.62, 0.45],
				[0.15, 0.8],
				[-0.3, 0.82],
			]);
			shine(ctx, -0.42, 0.1, 0.2, 0.1);
			face(ctx, 0.38, 0.3);
		},
		/* Peach: soft point at the top, a crease down one side, one leaf. */
		(ctx, f) => {
			const body = mirrored(-0.86, [
				[0.42, -1.0, 1.0, -0.62, 0.97, 0.04],
				[0.94, 0.68, 0.5, 0.97, 0, 0.97],
			]);
			paint(ctx, body, shading(ctx, f), f.rim);
			ctx.strokeStyle = "rgb(200 80 100 / 55%)";
			ctx.lineWidth = 0.05;
			ctx.beginPath();
			ctx.moveTo(0, -0.84);
			ctx.quadraticCurveTo(0.3, -0.35, 0.16, 0.25);
			ctx.stroke();
			leaf(ctx, -0.02, -0.86, -2.4, 0.42);
			shine(ctx, -0.48, -0.28, 0.2, 0.11, 0.5);
			face(ctx, 0.2, 0.3);
		},
		/* Pineapple: spiky crown behind a criss-cross yellow body. */
		(ctx, f) => {
			const crown = { fill: "#4faa38", rim: "#22601a" };
			for (const [a, len] of [
				[-2.45, 0.42],
				[-0.69, 0.42],
				[-2.05, 0.55],
				[-1.09, 0.55],
				[-1.57, 0.66],
			]) {
				leaf(ctx, 0, -0.5, a, len, 0.32, crown);
			}
			const body = ellipse(0, 0.2, 0.8, 0.78);
			paint(ctx, body, shading(ctx, f, 0, 0.2, 0.8), f.rim);
			textured(ctx, f, body, () => {
				ctx.strokeStyle = "rgb(165 110 0 / 60%)";
				ctx.lineWidth = 0.035;
				ctx.beginPath();
				for (let d = -1.6; d <= 1.6; d += 0.3) {
					ctx.moveTo(d - 1, -0.6);
					ctx.lineTo(d + 1, 1.4);
					ctx.moveTo(d + 1, -0.6);
					ctx.lineTo(d - 1, 1.4);
				}
				ctx.stroke();
			});
			shine(ctx, -0.4, -0.1, 0.18, 0.09, 0.45);
			face(ctx, 0.28, 0.27);
		},
		/* Melon: pale netting over a green rind, T-shaped stem. */
		(ctx, f) => {
			const body = circle(0, 0, 0.97);
			paint(ctx, body, shading(ctx, f), f.rim);
			textured(ctx, f, body, () => {
				ctx.strokeStyle = "rgb(245 255 225 / 75%)";
				ctx.lineWidth = 0.045;
				ctx.beginPath();
				for (let i = -3; i <= 3; i++) {
					const x = i * 0.32;
					ctx.moveTo(x, -1);
					ctx.bezierCurveTo(x + 0.18, -0.4, x - 0.18, 0.3, x + 0.08, 1);
					ctx.moveTo(-1, x);
					ctx.bezierCurveTo(-0.3, x - 0.16, 0.3, x + 0.16, 1, x - 0.06);
				}
				ctx.stroke();
			});
			stem(ctx, 0, -0.92, 0, -1.0, 0, -1.1);
			stem(ctx, -0.14, -1.08, 0, -1.12, 0.14, -1.08);
			shine(ctx, -0.45, -0.45, 0.22, 0.11, 0.5);
			face(ctx, 0.12, 0.3);
		},
		/* Watermelon: dark zig-zag stripes on green. */
		(ctx, f) => {
			const body = circle(0, 0, 0.98);
			paint(ctx, body, shading(ctx, f), f.rim);
			textured(ctx, f, body, () => {
				ctx.strokeStyle = "#17521f";
				ctx.lineWidth = 0.13;
				ctx.beginPath();
				/* Five stripes that bow outwards like meridians, each with a small zig-zag. */
				for (const x0 of [-0.78, -0.4, 0, 0.4, 0.78]) {
					for (let k = 0; k <= 14; k++) {
						const y = -1.05 + k * 0.15;
						const x = x0 * Math.sqrt(Math.max(0, 1 - y * y * 0.8)) + (k % 2 ? 0.05 : -0.05);
						if (k) ctx.lineTo(x, y);
						else ctx.moveTo(x, y);
					}
				}
				ctx.stroke();
			});
			stem(ctx, 0, -0.95, 0.02, -1.04, 0.1, -1.1);
			shine(ctx, -0.45, -0.45, 0.24, 0.12, 0.4);
			face(ctx, 0.1, 0.3, 1, true);
		},
	];

	/* Sprites are drawn once per fruit, pixel size and art style, then reused every frame. A fruit may carry an `image` (a
	 * loaded HTMLImageElement filling the same spriteExtent box) to replace its drawing. */
	const spriteCache = new Map();

	function buildSprite(tier, pxRadius) {
		const f = fruits[tier];
		const size = Math.ceil(pxRadius * spriteExtent * 2) + 2;
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext("2d");
		if (f.image && f.image.complete && f.image.naturalWidth) {
			ctx.drawImage(f.image, 0, 0, size, size);
			return canvas;
		}
		ctx.translate(size / 2, size / 2);
		ctx.scale(pxRadius, pxRadius);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		drawFruit[tier](ctx, f);
		return canvas;
	}

	const renderer = {
		/* Art options from the Appearance page. Changing them empties the sprite cache. */
		setStyle(next) {
			const changed = next.faces !== style.faces || next.simple !== style.simple || next.bold !== style.bold;
			style.faces = !!next.faces;
			style.simple = !!next.simple;
			style.bold = !!next.bold;
			outline = style.bold ? 0.11 : 0.07;
			if (changed) spriteCache.clear();
		},
		/* The sprite for `tier` with a body radius of `pxRadius` device pixels. */
		sprite(tier, pxRadius) {
			const px = Math.max(4, Math.round(pxRadius));
			const key = tier * 10000 + px;
			let sprite = spriteCache.get(key);
			if (!sprite) {
				/* Window resizes add new sizes; drop old ones before the cache grows without bound. */
				if (spriteCache.size >= 64) spriteCache.clear();
				sprite = buildSprite(tier, px);
				spriteCache.set(key, sprite);
			}
			return sprite;
		},
		/* Draws `tier` at (x, y) with radius r (context units), turned by `angle`. `pxPerUnit` is how many device pixels one
		 * context unit covers, so the sprite is built for the fruit's full size; a merged fruit still growing reuses it. */
		fruit(ctx, tier, x, y, r, angle, alpha, pxPerUnit) {
			const px = Math.max(4, Math.round(fruits[tier].radius * pxPerUnit));
			const sprite = this.sprite(tier, px);
			const half = ((sprite.width / 2) * r) / px;
			ctx.save();
			ctx.globalAlpha = alpha;
			ctx.translate(x, y);
			if (angle) ctx.rotate(angle);
			ctx.drawImage(sprite, -half, -half, half * 2, half * 2);
			ctx.restore();
		},
		/* Paints one fruit into a small canvas (HUD swatch, achievement icons). */
		icon(canvas, tier, cssSize, dpr) {
			const px = Math.round(cssSize * dpr);
			if (canvas.width !== px) canvas.width = canvas.height = px;
			const ctx = canvas.getContext("2d");
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, px, px);
			const r = px / 2 / spriteExtent;
			this.fruit(ctx, tier, px / 2, px / 2, r, 0, 1, r / fruits[tier].radius);
		},
	};

	/* Arcade abilities. ready(game) says whether using it now would do something; use(game) does it and returns true when
	 * a charge is spent. The shared checks (rules, pause, game over, charges, another ability busy) live in canUse(). */
	const abilities = Object.freeze({
		shake: Object.freeze({
			label: "Shake",
			desc: "Jolt the jar",
			help: "Shake: jolt the jar so fruit knock together. Risky, fruit can bounce up over the line.",
			icon: '<path d="M9 3h6M10 3v3L7 10v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9l-3-4V3"/><path d="M3 9v6M21 9v6"/>',
			ready: game => game.hasFruit(),
			use(game) {
				const c = config.abilities.shake;
				game.shakeStart = game.time;
				game.shakePulses = [];
				for (let i = 0; i < c.pulses; i++) game.shakePulses.push({ at: game.time + i * c.pulseGapMs, dir: i % 2 ? -1 : 1 });
				game.busyUntil = game.time + c.cooldownMs;
				game.startChain("shake");
				return true;
			},
		}),
		shuffle: Object.freeze({
			label: "Shuffle",
			desc: "Reroll this fruit",
			help: "Shuffle: swap the fruit you are holding for a different small fruit.",
			icon: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/>',
			ready: () => true,
			use(game) {
				game.heldTier = rules.pickOther(game.heldTier, () => game.abilityRng.next());
				return true;
			},
		}),
		wand: Object.freeze({
			label: "Wand",
			desc: "Remove a fruit",
			help: "Magic Wand: pick one of the five smallest fruit in the jar to remove it. No points.",
			icon: '<path d="M4 20L14 10"/><path d="M17 3l1 2.3 2.4.4-1.8 1.6.5 2.4L17 8.5l-2.1 1.2.5-2.4-1.8-1.6 2.4-.4z"/>',
			ready: game => game.hasWandTarget(),
			/* Only opens the picker; the charge is spent when a fruit is picked (confirmWand). */
			use(game) {
				game.wand = { target: null };
				game.announce("Magic Wand: pick a ringed fruit, or press Escape to cancel.");
				return false;
			},
		}),
		swap: Object.freeze({
			label: "Swap",
			desc: "Trade with Next",
			help: "Swap: trade the fruit you are holding with the Next fruit.",
			icon: '<path d="M4 8h15l-4-4"/><path d="M20 16H5l4 4"/>',
			ready: game => game.heldTier !== game.nextTier,
			use(game) {
				[game.heldTier, game.nextTier] = [game.nextTier, game.heldTier];
				return true;
			},
		}),
	});
	const abilityIds = Object.keys(abilities);

	/* First-time tutorial: a card above the jar while a scripted demo drops fruit. `drops` are [delay ms, tier, x]. */
	const tutorialSteps = Object.freeze([
		{ title: "Aim and drop", text: "Move along the top to aim, then tap, click or press Space to drop.", drops: [[400, 0, 90]] },
		{
			title: "Merge",
			text: "Two of the same fruit merge into the next one up. Bigger fruit score more.",
			drops: [
				[300, 0, 92],
				[1700, 1, 97],
			],
		},
		{ title: "The red line", text: "If the pile stays above the red line for 2.5 seconds, the run ends. It turns amber when the pile gets close.", drops: [] },
		{
			title: "Modes",
			text: "Classic is the plain game. Arcade adds power-ups and combo points. Zen never ends. Challenges, records and settings are in the Menu.",
			drops: [],
		},
	]);

	const progress = () => setup.suikaProgress;
	const content = () => setup.suikaContent;
	const sound = () => setup.suikaAudio;
	const r3 = n => Math.round(n * 1000) / 1000;

	let current = null;
	let loops = 0; // running animation loops across every instance (setup.suika.loops), to check nothing leaks

	class SuikaGame {
		constructor(root) {
			this.root = root;
			this.canvas = root.querySelector(".suika-canvas");
			this.ctx = this.canvas.getContext("2d");
			const q = sel => root.querySelector(sel);
			this.el = {
				play: q(".suika-play"),
				panel: q(".suika-panel"),
				score: q(".suika-score"),
				best: q(".suika-best"),
				bestLabel: q(".suika-best-label"),
				nextName: q(".suika-next-name"),
				nextDot: q(".suika-next-dot"),
				legend: q(".suika-legend"),
				pauseBtn: q(".suika-pause"),
				restartBtn: q(".suika-restart"),
				menuBtn: q(".suika-menu"),
				overlay: q(".suika-overlay"),
				overlayTitle: q(".suika-overlay-title"),
				overlayText: q(".suika-overlay-text"),
				overlayExtra: q(".suika-overlay-extra"),
				overlayBtn: q(".suika-overlay-btn"),
				overlayBtn2: q(".suika-overlay-btn2"),
				modes: q(".suika-modes"),
				abilityBar: q(".suika-abilities"),
				goal: q(".suika-goal"),
				goalName: q(".suika-goal-name"),
				goalText: q(".suika-goal-text"),
				goalBar: q(".suika-goal-bar"),
				tip: q(".suika-tip"),
				toast: q(".suika-toast"),
				status: q(".suika-status"),
			};
			this.rafId = 0;
			this.engine = null;
			this.cssScale = 1;
			this.dpr = 1;
			this.keys = { left: false, right: false };
			this.aiming = false;
			this.fx = [];
			this.toasts = [];
			this.toastTimer = 0;
			this.announceAt = 0;
			this.tutorialStep = -1;
			const saved = progress().data();
			this.mode = freeModes.includes(saved.mode) ? saved.mode : "classic";
			this.buildAbilityBar();
			this.bindListeners();
			this.applySettings(false);
			this.resize();
			const run = progress().savedRun();
			if (run) {
				this.newGame(this.mode, { idle: true });
				this.offerSavedRun(run);
			} else if (!saved.tutorial) this.startTutorial();
			else this.newGame();
		}

		/* ---- lifecycle ---- */

		/* A fresh run. opts: { challenge } for Challenge and Daily, { idle } to build it paused (behind the saved-run
		 * offer). A run already under way is counted as abandoned first. */
		newGame(mode = this.mode, opts = {}) {
			if (this.engine && !this.over) progress().abandon(this);
			this.clearEngine();
			const { Engine, Bodies, Composite, Events } = Matter;
			const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
			engine.gravity.y = config.gravity;
			const t = config.wallThickness;
			const { width: w, height: h } = config;
			const wall = { isStatic: true, label: "wall", friction: 0.3, restitution: 0.1 };
			Composite.add(engine.world, [
				Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, wall),
				Bodies.rectangle(-t / 2, h / 2 - h, t, h * 3, wall),
				Bodies.rectangle(w + t / 2, h / 2 - h, t, h * 3, wall),
			]);
			Events.on(engine, "collisionStart", e => {
				this.collectMerges(e.pairs);
				this.collisionSound(e.pairs);
			});
			Events.on(engine, "collisionActive", e => this.collectMerges(e.pairs));
			this.engine = engine;
			this.mode = mode;
			this.challenge = opts.challenge || null;
			if (freeModes.includes(mode)) progress().rememberMode(mode);
			const arcade = modes[mode].arcade;
			this.rulesArcade = arcade === null ? !!this.challenge && this.challenge.rules === "arcade" : arcade;
			this.abilitiesOn = this.rulesArcade && !(this.challenge && this.challenge.noAbilities);
			this.dropRng = makeRng(this.challenge && this.challenge.seed !== undefined ? this.challenge.seed : freshSeed());
			this.abilityRng = makeRng(freshSeed());
			this.merges = [];
			this.time = 0; // simulated ms
			this.acc = 0;
			this.lastFrame = 0;
			this.score = 0;
			this.overflowTimer = 0;
			this.danger = 0; // 0 clear, 1 the pile is close to the line, 2 over it (the countdown runs)
			this.over = false;
			this.endReason = null;
			this.paused = !!opts.idle;
			this.idle = !!opts.idle;
			this.newBest = false;
			this.aimX = this.aimWanted = config.width / 2;
			this.heldTier = this.pickDrop();
			this.nextTier = this.pickDrop();
			this.readyAt = 0;
			this.drops = 0;
			this.lastDropAt = -Infinity;
			this.mergeCount = 0;
			this.uses = {};
			for (const id of abilityIds) this.uses[id] = this.abilitiesOn ? config.abilities[id].uses : 0;
			this.busyUntil = 0; // no ability before this (sim time)
			this.shakePulses = [];
			this.shakeStart = -Infinity;
			this.wand = null; // { target } while the wand picker is open
			this.removals = []; // wand picks and Zen harvests, removed after the next physics update
			this.scripted = []; // tutorial demo drops: { at, tier, x }
			this.chain = null; // { count, lastAt, cause } while a chain is open
			this.comboBonus = 0;
			this.combo = null; // the last combo message
			this.note = null; // a short hint drawn on the board
			this.abilitySig = "";
			this.goalSig = "";
			this.tally = progress().newTally();
			this.runInfo = { largest: -1, maxChain: 0, used: {} }; // whole-run facts kept in the saved snapshot
			this.newAchievements = [];
			this.fx.length = 0;
			this.disarm();
			if (mode !== "tutorial") this.hideTip();
			this.hideOverlay();
			this.updateGoal(true);
			this.updateHud();
			this.render();
			if (!this.idle) this.startLoop();
		}

		clearEngine() {
			if (!this.engine) return;
			Matter.Events.off(this.engine);
			Matter.Composite.clear(this.engine.world, false);
			Matter.Engine.clear(this.engine);
			this.engine = null;
		}

		destroy() {
			this.stopLoop();
			clearTimeout(this.armTimer);
			clearTimeout(this.toastTimer);
			this.unbindListeners();
			this.clearEngine();
			this.fx.length = 0;
			this.root = this.canvas = this.ctx = this.el = null;
		}

		startLoop() {
			if (this.rafId || this.over || this.paused) return;
			this.lastFrame = 0;
			loops++;
			this.rafId = requestAnimationFrame(this.frame);
		}

		stopLoop() {
			if (!this.rafId) return;
			cancelAnimationFrame(this.rafId);
			this.rafId = 0;
			loops--;
		}

		frame = now => {
			this.rafId = 0;
			loops--;
			/* The passage was replaced without :passageinit (should not happen, but never leave a loop on a dead canvas). */
			if (!this.canvas || !this.canvas.isConnected) {
				if (current === this) destroy();
				return;
			}
			/* A long gap (the tab was hidden, the device slept) is capped, so the jar never fast-forwards. */
			const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : config.stepMs;
			this.lastFrame = now;
			this.acc += dt;
			let steps = 0;
			while (this.acc >= config.stepMs && steps < config.maxStepsPerFrame && !this.over) {
				this.step();
				this.acc -= config.stepMs;
				steps++;
			}
			if (steps === config.maxStepsPerFrame) this.acc = 0;
			this.aimWithKeys(dt);
			this.syncAbilities();
			this.updateGoal();
			this.render();
			if (!this.over && !this.paused) {
				loops++;
				this.rafId = requestAnimationFrame(this.frame);
			}
		};

		/* ---- physics ---- */

		step() {
			this.runScripted();
			this.applyShake();
			Matter.Engine.update(this.engine, config.stepMs);
			this.time += config.stepMs;
			this.tally.playMs += config.stepMs;
			this.resolveRemovals();
			this.resolveMerges();
			this.growAndContain();
			/* A goal reached in this step wins even if the pile also tips over in it. */
			this.checkChallenge();
			if (!this.over) this.checkOverflow();
			this.tickChain();
		}

		/* Runs inside Matter's collision events: only flags pairs. Bodies are removed after the update, never mid-step. */
		collectMerges(pairs) {
			for (const pair of pairs) {
				const a = pair.bodyA;
				const b = pair.bodyB;
				const fa = a.plugin.suika;
				const fb = b.plugin.suika;
				if (!fa || !fb || fa.merging || fb.merging || fa.tier !== fb.tier) continue;
				fa.merging = fb.merging = true;
				this.merges.push(a, b);
			}
		}

		/* A soft knock for hard landings; the audio module's cooldown keeps a busy pile quiet. */
		collisionSound(pairs) {
			for (const pair of pairs) {
				const a = pair.bodyA;
				const b = pair.bodyB;
				if (!a.plugin.suika && !b.plugin.suika) continue;
				const speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
				if (speed >= config.collideSpeed) {
					sound().play("collide", { strength: Math.min(1, speed / 10) });
					return;
				}
			}
		}

		resolveMerges() {
			const list = this.merges;
			if (!list.length) return;
			this.merges = [];
			const { Composite, Body } = Matter;
			for (let i = 0; i < list.length; i += 2) {
				const a = list[i];
				const b = list[i + 1];
				const from = a.plugin.suika.tier;
				const result = rules.merge(from);
				const mx = (a.position.x + b.position.x) / 2;
				const my = (a.position.y + b.position.y) / 2;
				Composite.remove(this.engine.world, [a, b]);
				/* Each queued pair is handled once here, so each merge counts once towards its chain. */
				let bonus = 0;
				let n = 0;
				const cause = this.chain ? this.chain.cause : null;
				if (this.chain) {
					n = ++this.chain.count;
					this.chain.lastAt = this.time;
					if (this.rulesArcade) bonus = rules.comboBonus(n);
					if (n >= 2) this.combo = { n, bonus, x: mx, y: my, at: this.time };
				}
				this.score += result.points + bonus;
				this.comboBonus += bonus;
				this.mergeCount++;
				if (result.tier !== null) this.runInfo.largest = Math.max(this.runInfo.largest, result.tier);
				this.runInfo.maxChain = Math.max(this.runInfo.maxChain, n);
				this.spawnMergeFx(mx, my, result.tier === null ? lastTier : result.tier, result.points + bonus, result.tier === null);
				this.emit("merge", { tier: result.tier, from, chain: n, bonus, cause });
				if (result.tier === null) continue;
				const fruit = this.addFruit(result.tier, mx, my, true);
				Body.setVelocity(fruit, { x: (a.velocity.x + b.velocity.x) / 2, y: (a.velocity.y + b.velocity.y) / 2 });
			}
			this.updateHud();
		}

		/* startR: build a fruit smaller than full size (a saved run restoring one that was still growing). */
		addFruit(tier, x, y, grow = false, startR = 0) {
			const r = fruits[tier].radius;
			const r0 = startR || (grow ? r * 0.6 : r);
			const body = Matter.Bodies.circle(x, y, r0, { ...config.body, label: "fruit" });
			body.plugin.suika = { tier, radius: r, merging: false, bornAt: this.time, grow: grow ? config.growSteps : 0 };
			Matter.Composite.add(this.engine.world, body);
			return body;
		}

		growAndContain() {
			const { width: w, height: h } = config;
			for (const body of this.engine.world.bodies) {
				const f = body.plugin.suika;
				if (!f) continue;
				if (f.grow > 0) {
					f.grow--;
					const target = f.grow === 0 ? f.radius : f.radius * (1 - (0.4 * f.grow) / config.growSteps);
					Matter.Body.scale(body, target / body.circleRadius, target / body.circleRadius);
					body.circleRadius = target;
				}
				/* Safety net against tunnelling: a fruit outside the box is put back inside, at rest. */
				const r = body.circleRadius;
				const { x, y } = body.position;
				if (x < -r || x > w + r || y > h + r) {
					Matter.Body.setPosition(body, { x: Math.max(r, Math.min(w - r, x)), y: Math.min(h - r, y) });
					Matter.Body.setVelocity(body, { x: 0, y: 0 });
				}
			}
		}

		checkOverflow() {
			let anyOver = false;
			let top = Infinity;
			for (const body of this.engine.world.bodies) {
				const f = body.plugin.suika;
				if (!f) continue;
				if (rules.isOver(body, this.time)) anyOver = true;
				if (!f.merging && this.time - f.bornAt >= config.settleGraceMs) top = Math.min(top, body.position.y - body.circleRadius);
			}
			this.overflowTimer = rules.overflow(this.overflowTimer, anyOver, config.stepMs);
			/* The warning is drawing only; the timer above is the original rule and alone decides the end. */
			const danger = this.overflowTimer > 0 ? 2 : top < config.dangerY + config.warnMargin ? 1 : 0;
			if (danger === 2 && this.danger !== 2 && !modes[this.mode].zen) this.announce("The pile is over the red line.");
			this.danger = danger;
			if (this.overflowTimer >= config.overflowMs) {
				if (modes[this.mode].zen) this.harvest("line");
				else this.gameOver("overflow");
			}
		}

		/* Zen only: picks fruit off the jar instead of ending the run. "line" takes every settled fruit whose top is over
		 * the line; "full" takes the smallest config.zen.fullHarvest fruit. No points either way. */
		harvest(reason) {
			let picked = this.engine.world.bodies.filter(b => b.plugin.suika && !b.plugin.suika.merging);
			if (reason === "line") picked = picked.filter(b => rules.isOver(b, this.time));
			else picked = picked.sort((a, b) => a.plugin.suika.tier - b.plugin.suika.tier).slice(0, config.zen.fullHarvest);
			for (const body of picked) {
				body.plugin.suika.merging = true;
				this.removals.push(body);
				this.spawnSparkle(body.position.x, body.position.y, body.plugin.suika.tier);
			}
			this.overflowTimer = 0;
			if (picked.length) {
				const text = `Picked ${picked.length} fruit off the ${reason === "line" ? "top" : "jar"}`;
				this.note = { text, at: this.time };
				this.announce(text + ".");
				sound().play("harvest");
			}
		}

		/* ---- tutorial demo ---- */

		runScripted() {
			while (this.scripted.length && this.scripted[0].at <= this.time) {
				const s = this.scripted.shift();
				this.addFruit(s.tier, rules.clampAim(s.x, s.tier), config.dropY);
				this.startChain("drop");
			}
		}

		/* ---- player ---- */

		pickDrop() {
			return rules.pickDropTier(() => this.dropRng.next());
		}

		canDrop() {
			return !this.over && !this.paused && !this.wand && this.time >= this.readyAt;
		}

		runActive() {
			return !this.over && !this.idle && this.drops > 0 && this.mode !== "tutorial";
		}

		dropLimit() {
			const c = this.challenge;
			return c ? (c.goal.type === "survive" ? c.goal.n : c.drops || 0) : 0;
		}

		fruitCount() {
			let n = 0;
			for (const body of this.engine.world.bodies) if (body.plugin.suika) n++;
			return n;
		}

		hasFruit() {
			for (const body of this.engine.world.bodies) if (body.plugin.suika) return true;
			return false;
		}

		isWandTarget(body) {
			const f = body.plugin.suika;
			return !!f && !f.merging && f.tier <= config.abilities.wand.maxTier;
		}

		hasWandTarget() {
			for (const body of this.engine.world.bodies) if (this.isWandTarget(body)) return true;
			return false;
		}

		drop() {
			if (!this.canDrop()) return false;
			const limit = this.dropLimit();
			if (limit && this.drops >= limit) {
				this.note = { text: "No drops left", at: this.time };
				return false;
			}
			/* The safety cap: Zen makes room, the scored modes end the run plainly instead of deleting anything. */
			if (this.fruitCount() >= config.maxFruit) {
				if (modes[this.mode].zen) this.harvest("full");
				else {
					this.gameOver("full");
					return false;
				}
			}
			this.aimX = rules.clampAim(this.aimX, this.heldTier);
			const tier = this.heldTier;
			this.addFruit(tier, this.aimX, config.dropY);
			this.startChain("drop");
			this.drops++;
			this.lastDropAt = this.time;
			this.heldTier = this.nextTier;
			this.nextTier = this.pickDrop();
			this.readyAt = this.time + config.dropCooldownMs;
			this.emit("drop", { tier });
			this.updateHud();
			return true;
		}

		aimWithKeys(dt) {
			const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
			if (dir && !this.paused && !this.over) {
				this.aimWanted = this.aimX + dir * config.keyAimSpeed * dt;
				this.aimX = rules.clampAim(this.aimWanted, this.heldTier);
			}
		}

		/* ---- abilities ---- */

		canUse(id) {
			if (!this.abilitiesOn || this.over || this.paused || this.wand) return false;
			if (!(this.uses[id] > 0) || this.time < this.busyUntil) return false;
			return abilities[id].ready(this);
		}

		/* Returns whether the ability started; a charge is only spent when it actually does something. */
		useAbility(id) {
			if (!this.canUse(id)) return false;
			if (abilities[id].use(this)) this.spend(id);
			this.updateHud();
			return true;
		}

		spend(id) {
			this.uses[id]--;
			this.runInfo.used[id] = true;
			this.flashAbility(id);
			this.emit("ability", { id });
		}

		/* The wand target nearest (x, y) in world units, within its radius plus a little slack for fingers. */
		wandHit(x, y) {
			let best = null;
			let bestD = Infinity;
			for (const body of this.engine.world.bodies) {
				if (!this.isWandTarget(body)) continue;
				const d = Math.hypot(body.position.x - x, body.position.y - y);
				if (d <= body.circleRadius + config.abilities.wand.touchSlop && d < bestD) {
					best = body;
					bestD = d;
				}
			}
			return best;
		}

		confirmWand(body) {
			if (!this.wand || !body || !this.isWandTarget(body) || !this.engine.world.bodies.includes(body)) return false;
			body.plugin.suika.merging = true;
			this.removals.push(body);
			this.wand = null;
			this.spawnSparkle(body.position.x, body.position.y, body.plugin.suika.tier);
			this.announce(`Removed a ${fruits[body.plugin.suika.tier].name}.`);
			this.spend("wand");
			this.startChain("wand");
			this.updateHud();
			return true;
		}

		cancelWand() {
			if (!this.wand) return;
			this.wand = null;
			this.updateHud();
		}

		/* Keyboard picking: moves the wand target to the next valid fruit left or right. */
		cycleWand(dir) {
			const list = this.engine.world.bodies.filter(b => this.isWandTarget(b)).sort((a, b) => a.position.x - b.position.x);
			if (!list.length) return;
			const i = list.indexOf(this.wand.target);
			this.wand.target = list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length];
		}

		/* Wand picks and Zen harvests are flagged `merging` when picked, so no merge can claim them before they go here. */
		resolveRemovals() {
			if (!this.removals.length) return;
			Matter.Composite.remove(this.engine.world, this.removals);
			this.removals = [];
		}

		/* Shake pulses due by now change fruit velocities before the update, so Matter resolves every collision. */
		applyShake() {
			const c = config.abilities.shake;
			while (this.shakePulses.length && this.shakePulses[0].at <= this.time) {
				const { dir } = this.shakePulses.shift();
				for (const body of this.engine.world.bodies) {
					const f = body.plugin.suika;
					if (!f || f.merging || body.isStatic) continue;
					/* A fixed spread per body, so the pile tumbles instead of sliding as one block, the same way every time. */
					const k = 0.8 + (0.4 * ((body.id * 37) % 11)) / 10;
					let vx = body.velocity.x + dir * c.push * k;
					let vy = body.velocity.y - c.lift * k;
					const speed = Math.hypot(vx, vy);
					if (speed > c.maxSpeed) {
						vx *= c.maxSpeed / speed;
						vy *= c.maxSpeed / speed;
					}
					Matter.Body.setVelocity(body, { x: vx, y: vy });
				}
			}
		}

		startChain(cause) {
			this.chain = { count: 0, lastAt: this.time, cause };
		}

		tickChain() {
			const c = this.chain;
			if (c && this.time - c.lastAt > (c.count ? config.combo.gapMs : config.combo.firstMs)) this.chain = null;
		}

		/* ---- challenges ---- */

		checkChallenge() {
			if (!this.challenge || this.over) return;
			const r = content().evaluate(this.challenge, this);
			if (r.done) this.gameOver("won");
			else if (r.failed) this.gameOver("failed");
		}

		/* The goal strip above the jar. Rebuilt only when its text changes. */
		updateGoal(force = false) {
			if (!this.el) return;
			const c = this.challenge;
			const zen = modes[this.mode].zen;
			/* A real boolean: Classic and Arcade have no `zen` key, and undefined never equals `hidden`. */
			const show = !!c || !!zen;
			if (this.el.goal.hidden === show) this.el.goal.hidden = !show;
			if (!show) return;
			let name;
			let text;
			let fraction = 0;
			if (c) {
				const r = content().evaluate(c, this);
				name = c.diff === "daily" ? `Daily challenge · ${c.date}` : `${c.name} · ${c.diff[0].toUpperCase()}${c.diff.slice(1)}`;
				text = r.text;
				fraction = r.fraction;
			} else {
				name = "Zen";
				text = "No game over. Fruit that stay over the line are picked off.";
			}
			const sig = name + text + Math.round(fraction * 100);
			if (!force && sig === this.goalSig) return;
			this.goalSig = sig;
			this.el.goalName.textContent = name;
			this.el.goalText.textContent = text;
			this.el.goalBar.hidden = !c;
			this.el.goalBar.style.setProperty("--suika-goal", `${Math.round(fraction * 100)}%`);
			this.el.goalBar.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
		}

		/* ---- pause, end ---- */

		setPaused(paused) {
			if (this.over || paused === this.paused) return;
			if (paused) this.cancelWand();
			this.paused = paused;
			if (paused) {
				this.stopLoop();
				this.keys.left = this.keys.right = false;
				this.aiming = false;
				this.showOverlay(
					"Paused",
					"The fruit stay where they are until you come back.",
					{ label: "Resume", run: () => this.setPaused(false) },
					this.menuAction()
				);
			} else {
				this.hideOverlay();
				this.startLoop();
			}
			sound().setPaused(paused);
			this.el.pauseBtn.textContent = paused ? "Resume" : "Pause";
			/* The loop that normally refreshes the toolbar is stopped while paused. */
			this.syncAbilities(true);
			this.render();
		}

		menuAction() {
			return { label: "Menu", run: () => setup.suikaUI.open(this, "menu") };
		}

		bestKey() {
			return modes[this.mode].best;
		}

		/* Ends the run. reason: "overflow" (the pile stayed over the line), "full" (the safety cap), "won" or "failed"
		 * (a challenge's goal). Saves stats, records and best scores once, then shows the summary. */
		gameOver(reason = "overflow") {
			if (this.over) return;
			/* A goal met at the same moment the pile tipped over still counts. */
			if (this.challenge && reason === "overflow" && content().evaluate(this.challenge, this).done) reason = "won";
			this.over = true;
			this.endReason = reason;
			this.merges = [];
			this.removals = [];
			this.shakePulses = [];
			this.scripted = [];
			this.wand = null;
			this.chain = null;
			const result = progress().endRun(this, reason);
			this.newBest = result.newBest;
			this.updateHud();
			this.updateGoal(true);
			this.showSummary(reason, result);
			if (reason === "won") sound().play("challenge");
			else {
				sound().play("gameover");
				sound().vibrate(120);
			}
			this.el.pauseBtn.disabled = true;
			this.syncAbilities(true);
		}

		showSummary(reason, result) {
			const c = this.challenge;
			const label = modes[this.mode].label;
			let title = "Game over";
			let text;
			if (reason === "won") title = this.mode === "daily" ? "Daily challenge complete" : "Challenge complete";
			else if (reason === "failed" || (c && reason === "overflow")) title = this.mode === "daily" ? "Daily challenge failed" : "Challenge failed";
			else if (reason === "full") title = "The jar is full";
			const why = reason === "full" ? "The jar holds as many fruit as it can." : reason === "overflow" ? "The pile stayed over the line." : "";
			if (c) {
				text = `${why ? why + " " : ""}${content().describe(c)} Score ${this.score}.`;
				if (this.mode === "daily") {
					text += ` Today's best ${progress().dailyDay(c.date)?.best || this.score}.`;
					if (result.paid) text += ` You earned ${formatMoney(result.paid)}.`;
					else if (reason === "won" && progress().dailyDay(c.date)?.paid) text += " Today's reward was already claimed.";
				} else if (reason === "won" && !result.firstClear) text += " Already completed before.";
			} else {
				text = `${why} Score ${this.score}, ${label} best ${result.best || 0}.${result.newBest ? " That is a new best." : ""}`;
			}
			const extra = [
				`Biggest fruit: ${this.runInfo.largest >= 0 ? fruits[this.runInfo.largest].name : "none"}`,
				`Drops: ${this.drops}`,
				`Best chain: ${this.runInfo.maxChain}`,
			];
			if (this.rulesArcade) extra.push(`Combo points: ${this.comboBonus}`);
			if (this.newAchievements.length) extra.push(`Achievements: ${this.newAchievements.map(a => a.name).join(", ")}`);
			const again = c ? (this.mode === "daily" ? "Try again" : "Retry") : "Play again";
			this.showOverlay(title, text, { label: again, run: () => this.restartSame() }, this.menuAction(), extra);
			this.announce(`${title}. ${text}`, true);
		}

		/* A new run of the same mode (and challenge). */
		restartSame() {
			this.newGame(this.mode, { challenge: this.challenge && (this.mode === "daily" ? content().daily(this.challenge.date) : this.challenge) });
		}

		/* ---- save and resume ---- */

		canSave() {
			return !!this.engine && this.runActive();
		}

		/* A plain-data copy of the run, made between physics steps: merges and removals are always resolved by then. An
		 * open wand picker is closed (it has not spent its charge); shake pulses still to come are kept. */
		snapshot() {
			if (!this.canSave()) return null;
			this.cancelWand();
			const t = this.time;
			const fruitsOut = [];
			for (const b of this.engine.world.bodies) {
				const f = b.plugin.suika;
				if (!f || f.merging) continue;
				fruitsOut.push([
					f.tier,
					r3(b.position.x),
					r3(b.position.y),
					r3(b.angle),
					r3(b.velocity.x),
					r3(b.velocity.y),
					r3(b.angularVelocity),
					r3(t - f.bornAt),
					f.grow,
					r3(b.circleRadius),
				]);
			}
			return {
				v: 1,
				mode: this.mode,
				challenge: this.mode === "challenge" ? this.challenge.id : null,
				daily: this.mode === "daily" ? this.challenge.date : null,
				time: r3(t),
				score: this.score,
				drops: this.drops,
				merges: this.mergeCount,
				comboBonus: this.comboBonus,
				overflow: r3(this.overflowTimer),
				ready: r3(Math.max(0, this.readyAt - t)),
				busy: r3(Math.max(0, this.busyUntil - t)),
				sinceDrop: r3(Math.min(1e7, t - this.lastDropAt)),
				held: this.heldTier,
				next: this.nextTier,
				aim: r3(this.aimX),
				uses: { ...this.uses },
				rng: [this.dropRng.state, this.abilityRng.state],
				shake: this.shakePulses.map(p => [r3(p.at - t), p.dir]),
				shakeAge: Number.isFinite(this.shakeStart) ? r3(t - this.shakeStart) : null,
				chain: this.chain ? [this.chain.count, r3(t - this.chain.lastAt), this.chain.cause] : null,
				run: { largest: this.runInfo.largest, maxChain: this.runInfo.maxChain, used: { ...this.runInfo.used } },
				fruits: fruitsOut,
			};
		}

		/* Rebuilds a run from a snapshot. Returns false (and changes nothing that matters) if the data is unusable. */
		restore(snap) {
			const s = validateSnapshot(snap);
			if (!s) return false;
			let challenge = null;
			if (s.mode === "challenge") challenge = content().challenges.find(c => c.id === s.challenge) || null;
			else if (s.mode === "daily") challenge = content().daily(s.daily);
			if ((s.mode === "challenge" || s.mode === "daily") && !challenge) return false;
			this.newGame(s.mode, { challenge, idle: true });
			const t = s.time;
			this.time = t;
			this.score = s.score;
			this.drops = s.drops;
			this.mergeCount = s.merges;
			this.comboBonus = s.comboBonus;
			this.overflowTimer = s.overflow;
			this.readyAt = t + s.ready;
			this.busyUntil = t + s.busy;
			this.lastDropAt = t - s.sinceDrop;
			this.heldTier = s.held;
			this.nextTier = s.next;
			this.aimX = this.aimWanted = rules.clampAim(s.aim, s.held);
			for (const id of abilityIds) this.uses[id] = this.abilitiesOn ? s.uses[id] : 0;
			this.dropRng.state = s.rng[0] >>> 0;
			this.abilityRng.state = s.rng[1] >>> 0;
			this.shakePulses = s.shake.map(([at, dir]) => ({ at: t + at, dir }));
			this.shakeStart = s.shakeAge === null ? -Infinity : t - s.shakeAge;
			this.chain = s.chain ? { count: s.chain[0], lastAt: t - s.chain[1], cause: s.chain[2] } : null;
			this.runInfo = { largest: s.run.largest, maxChain: s.run.maxChain, used: { ...s.run.used } };
			for (const [tier, x, y, angle, vx, vy, av, age, grow, r] of s.fruits) {
				const full = fruits[tier].radius;
				const radius = grow > 0 ? Math.min(full, Math.max(full * 0.5, r)) : full;
				/* Resting fruit sit a fraction of a unit into the floor and walls (Matter's contact slop); only data that is
				 * clearly outside the jar is pulled back in, so a resumed pile does not shift. */
				const cx = Math.max(radius - 2, Math.min(config.width - radius + 2, x));
				const cy = Math.min(config.height - radius + 2, y);
				const body = this.addFruit(tier, cx, cy, false, radius);
				body.plugin.suika.bornAt = t - age;
				body.plugin.suika.grow = grow;
				Matter.Body.setAngle(body, angle);
				Matter.Body.setVelocity(body, { x: vx, y: vy });
				Matter.Body.setAngularVelocity(body, av);
			}
			this.idle = false;
			this.paused = false;
			this.hideOverlay();
			this.updateGoal(true);
			this.updateHud();
			this.render();
			this.startLoop();
			return true;
		}

		/* Saves the unfinished run into $suikaData.run and folds its counts into the stats. */
		checkpoint() {
			const snap = this.snapshot();
			if (!snap) return false;
			progress().saveRun(this, snap);
			return true;
		}

		offerSavedRun(run) {
			const mode = modes[run.mode];
			const what =
				run.mode === "challenge"
					? content().challenges.find(c => c.id === run.challenge)?.name || "Challenge"
					: run.mode === "daily"
					? `Daily challenge ${run.daily}`
					: mode
					? mode.label
					: "Unknown";
			const text = `${what} run, score ${Number(run.score) || 0}, ${Number(run.drops) || 0} ${
				Number(run.drops) === 1 ? "drop" : "drops"
			}. Resume it, or discard it to start fresh.`;
			this.showOverlay(
				"Saved run",
				text,
				{
					label: "Resume run",
					run: () => {
						const ok = this.restore(run);
						progress().clearRun();
						if (!ok) {
							this.newGame();
							this.toast("The saved run could not be read, so it was discarded.");
						}
					},
				},
				{
					label: "Discard saved run",
					run: () => {
						progress().clearRun();
						this.newGame();
					},
				}
			);
		}

		/* ---- tutorial ---- */

		startTutorial() {
			this.newGame("tutorial");
			this.tutorialStep = 0;
			this.showTip();
		}

		showTip() {
			const step = tutorialSteps[this.tutorialStep];
			setup.suikaUI.tip(this, step, this.tutorialStep, tutorialSteps.length);
			this.scripted = step.drops.map(([delay, tier, x]) => ({ at: this.time + delay, tier, x }));
		}

		nextTip() {
			if (this.tutorialStep < tutorialSteps.length - 1) {
				this.tutorialStep++;
				this.showTip();
			} else this.finishTutorial();
		}

		finishTutorial() {
			progress().finishTutorial();
			this.tutorialStep = -1;
			this.hideTip();
			this.newGame(freeModes.includes(progress().data().mode) ? progress().data().mode : "classic");
		}

		hideTip() {
			if (this.el && this.el.tip) this.el.tip.hidden = true;
		}

		/* ---- events, effects, notices ---- */

		/* Game events go to the progress module (stats, achievements) and to sound. */
		emit(type, data = {}) {
			progress().event(this, type, data);
			const a = sound();
			if (type === "drop") a.play("drop");
			else if (type === "ability") a.play(data.id);
			else if (type === "merge") {
				if (data.tier === null) a.play("vanish");
				else if (data.tier === lastTier) {
					a.play("watermelon");
					a.vibrate([40, 40, 90]);
				} else {
					a.play("merge", { tier: data.tier });
					if (data.tier >= 7) a.vibrate(30);
				}
				if (data.chain >= 2) a.play("combo", { n: data.chain });
				if (data.chain >= 4) a.vibrate(25);
			}
		}

		onAchievement(a) {
			this.newAchievements.push(a);
			this.toast(`Achievement: ${a.name}`);
			sound().play("achievement");
		}

		/* DoL shows its own feat banner; the toast says why it appeared. */
		onFeat(name) {
			this.toast(`Every achievement unlocked. Feat earned: ${name}`);
			this.announce(`Feat earned: ${name}`, true);
		}

		pushFx(fx) {
			if (this.fx.length >= config.effects.maxEffects) this.fx.shift();
			this.fx.push(fx);
		}

		/* Merge feedback: a glow, a few particles and the points floating up. Bigger fruit get more; reduced motion keeps
		 * only the points. All of it is drawing; none of it touches the physics. */
		spawnMergeFx(x, y, tier, points, vanish) {
			const e = config.effects;
			const big = tier >= 8 || vanish;
			this.pushFx({ kind: "float", x, y, at: this.time, life: e.floatMs, text: `+${points}`, big });
			if (this.reduced) return;
			this.pushFx({ kind: "glow", x, y, at: this.time, life: e.glowMs * (big ? 1.6 : 1), r: fruits[tier].radius, color: fruits[tier].light });
			const count = vanish || tier === lastTier ? 18 : Math.min(12, 3 + tier);
			for (let i = 0; i < count; i++) {
				const a = (i / count) * Math.PI * 2 + tier;
				const speed = 0.05 + 0.03 * ((i * 7) % 5) + (big ? 0.04 : 0);
				this.pushFx({
					kind: "p",
					x,
					y,
					at: this.time,
					life: e.particleMs,
					vx: Math.cos(a) * speed,
					vy: Math.sin(a) * speed - 0.05,
					color: i % 3 ? fruits[tier].color : "#fff",
					size: big ? 3 : 2,
				});
			}
		}

		spawnSparkle(x, y, tier) {
			if (this.reduced) return;
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2;
				this.pushFx({
					kind: "p",
					x,
					y,
					at: this.time,
					life: config.effects.particleMs,
					vx: Math.cos(a) * 0.07,
					vy: Math.sin(a) * 0.07,
					color: "#fff",
					size: 2,
				});
			}
			this.pushFx({ kind: "glow", x, y, at: this.time, life: config.effects.glowMs, r: fruits[tier].radius, color: "#fff" });
		}

		/* A short message above the jar (achievements, saved-run problems). Shown one at a time. */
		toast(text) {
			this.toasts.push(text);
			if (!this.toastTimer) this.nextToast();
		}

		nextToast() {
			if (!this.el) return;
			const text = this.toasts.shift();
			if (text === undefined) {
				this.el.toast.hidden = true;
				this.toastTimer = 0;
				return;
			}
			this.el.toast.textContent = text;
			this.el.toast.hidden = false;
			this.toastTimer = setTimeout(() => this.nextToast(), config.effects.toastMs);
		}

		/* Screen reader notices, kept rare: at most one routine notice every 3 s; `important` ones always go out. */
		announce(text, important = false) {
			const now = performance.now();
			if (!important && now - this.announceAt < 3000) return;
			this.announceAt = now;
			if (this.el) this.el.status.textContent = text;
		}

		flashAbility(id) {
			const b = this.abilityBtns && this.abilityBtns[id];
			if (!b) return;
			/* Removed then re-added on the next frame, so a second use replays the highlight. */
			b.btn.classList.remove("suika-ability--used");
			requestAnimationFrame(() => b.btn.classList.add("suika-ability--used"));
		}

		/* ---- settings ---- */

		applySettings(redraw = true) {
			const s = progress().settings();
			renderer.setStyle({ faces: s.faces, simple: s.simple, bold: s.bold || s.contrast });
			const themes = content().themes;
			this.theme = s.contrast ? themes.contrast : progress().themeUnlocked(s.theme) ? themes[s.theme] : themes.dark;
			this.root.dataset.theme = s.contrast ? "contrast" : progress().themeUnlocked(s.theme) ? s.theme : "dark";
			this.root.style.setProperty("--suika-board", this.theme.bg);
			this.root.style.setProperty("--suika-ring", this.theme.ring);
			let systemReduced = false;
			try {
				systemReduced = !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			} catch (e) {}
			this.reduced = s.motion === "reduced" || (s.motion === "auto" && systemReduced);
			this.root.classList.toggle("suika--reduced", this.reduced);
			sound().refresh();
			if (redraw) {
				this.drawLegend();
				this.drawNext();
				this.render();
			}
		}

		/* ---- DOM ---- */

		updateHud() {
			if (!this.el) return;
			this.el.score.textContent = String(this.score);
			const key = this.bestKey();
			if (key) {
				this.el.bestLabel.textContent = "Best";
				this.el.best.textContent = String(Math.max(V[key] || 0, this.score));
			} else if (this.challenge) {
				const limit = this.dropLimit();
				this.el.bestLabel.textContent = "Drops";
				this.el.best.textContent = limit ? `${this.drops}/${limit}` : String(this.drops);
			} else {
				this.el.bestLabel.textContent = "Merges";
				this.el.best.textContent = String(this.mergeCount);
			}
			this.el.nextName.textContent = fruits[this.nextTier].name;
			this.drawNext();
			this.el.pauseBtn.disabled = this.over || this.idle;
			this.el.pauseBtn.textContent = this.paused && !this.idle ? "Resume" : "Pause";
			const free = freeModes.includes(this.mode);
			for (const btn of this.el.modes.querySelectorAll(".suika-mode")) {
				btn.setAttribute("aria-pressed", String(free && btn.dataset.mode === this.mode));
			}
			this.syncAbilities(true);
		}

		buildAbilityBar() {
			const bar = this.el.abilityBar;
			bar.textContent = "";
			this.abilityBtns = {};
			for (const id of abilityIds) {
				const a = abilities[id];
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "suika-ability";
				btn.dataset.ability = id;
				btn.title = a.help;
				btn.innerHTML =
					`<svg class="suika-ability-icon" viewBox="0 0 24 24" aria-hidden="true">${a.icon}</svg>` +
					'<span class="suika-ability-text"><span><span class="suika-ability-name"></span> <span class="suika-ability-count"></span></span>' +
					'<span class="suika-ability-desc"></span></span><span class="suika-ability-cooldown" aria-hidden="true"></span>';
				btn.querySelector(".suika-ability-desc").textContent = a.desc;
				bar.append(btn);
				this.abilityBtns[id] = { btn, name: btn.querySelector(".suika-ability-name"), count: btn.querySelector(".suika-ability-count") };
			}
		}

		/* Runs every frame, but only touches the DOM when a button's state actually changed. */
		syncAbilities(force = false) {
			if (!this.el || !this.abilityBtns) return;
			const bar = this.el.abilityBar;
			const on = this.abilitiesOn;
			if (bar.hidden === on) bar.hidden = !on;
			if (!on) return;
			const cooling = this.time < this.busyUntil && !this.over;
			const cool = cooling ? Math.ceil(((this.busyUntil - this.time) / config.abilities.shake.cooldownMs) * 10) : 0;
			let sig = `${cool}`;
			for (const id of abilityIds) sig += `${this.uses[id]}${this.canUse(id) ? 1 : 0}`;
			sig += this.wand ? "w" : "";
			if (!force && sig === this.abilitySig) return;
			this.abilitySig = sig;
			bar.style.setProperty("--suika-cooldown", `${cool * 10}%`);
			bar.classList.toggle("suika-abilities--cooling", cooling);
			for (const id of abilityIds) {
				const b = this.abilityBtns[id];
				const picking = id === "wand" && !!this.wand;
				b.btn.disabled = !(picking || this.canUse(id));
				b.name.textContent = picking ? "Cancel" : abilities[id].label;
				b.count.textContent = `(${this.uses[id]})`;
				b.btn.setAttribute("aria-label", `${picking ? "Cancel Magic Wand" : abilities[id].label}, ${this.uses[id]} left. ${abilities[id].help}`);
				if (id === "wand") b.btn.setAttribute("aria-pressed", String(picking));
			}
		}

		/* The HUD swatch: the next fruit, drawn into its own small canvas only when it changes. */
		drawNext() {
			renderer.icon(this.el.nextDot, this.nextTier, this.el.nextDot.clientWidth || 20, this.dpr);
		}

		/* Every fruit smallest to largest, so the order (and each fruit's look) can be learnt without numbers. */
		drawLegend() {
			const c = this.el.legend;
			const cssW = this.canvas.clientWidth || config.width;
			const cssH = 36;
			const maxR = cssH / 2 / spriteExtent;
			const radii = fruits.map((f, i) => maxR * (0.4 + (0.6 * i) / lastTier));
			const gap = 3;
			const total = radii.reduce((sum, r) => sum + r * 2 * spriteExtent, 0) + gap * lastTier;
			const k = Math.min(1, cssW / total);
			c.style.width = `${cssW}px`;
			c.style.height = `${cssH}px`;
			c.width = Math.round(cssW * this.dpr);
			c.height = Math.round(cssH * this.dpr);
			const ctx = c.getContext("2d");
			ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
			let x = (cssW - total * k) / 2;
			radii.forEach((r0, i) => {
				const r = r0 * k;
				x += r * spriteExtent;
				renderer.fruit(ctx, i, x, cssH - r * spriteExtent - 1, r, 0, 1, (r * this.dpr) / fruits[i].radius);
				x += r * spriteExtent + gap * k;
			});
		}

		/* primary/secondary: { label, run }; extra: lines listed under the text. */
		showOverlay(title, text, primary, secondary = null, extra = []) {
			const el = this.el;
			el.overlayTitle.textContent = title;
			el.overlayText.textContent = text;
			el.overlayExtra.textContent = "";
			for (const line of extra) {
				const li = document.createElement("li");
				li.textContent = line;
				el.overlayExtra.append(li);
			}
			el.overlayExtra.hidden = !extra.length;
			el.overlayBtn.textContent = primary.label;
			this.overlayPrimary = primary.run;
			el.overlayBtn2.hidden = !secondary;
			el.overlayBtn2.textContent = secondary ? secondary.label : "";
			this.overlaySecondary = secondary ? secondary.run : null;
			el.overlay.hidden = false;
			if (!el.panel || el.panel.hidden) el.overlayBtn.focus({ preventScroll: true });
		}

		hideOverlay() {
			this.el.overlay.hidden = true;
			this.overlayPrimary = this.overlaySecondary = null;
		}

		resize() {
			const wrap = this.canvas.parentElement;
			this.rootWidth = this.root.clientWidth;
			const avail = Math.max(200, this.rootWidth);
			/* Room for the score row and mode buttons above the jar on short screens. */
			const byHeight = ((window.innerHeight || 640) - 190) * (config.width / config.height);
			/* The 220px floor is for short screens only; the jar is never wider than the room it has. */
			const cssW = Math.floor(Math.min(avail, Math.max(220, Math.min(380, byHeight))));
			const cssH = Math.round(cssW * (config.height / config.width));
			this.dpr = Math.min(config.maxDpr, window.devicePixelRatio || 1);
			this.cssScale = cssW / config.width;
			wrap.style.width = `${cssW}px`;
			this.canvas.style.width = `${cssW}px`;
			this.canvas.style.height = `${cssH}px`;
			this.canvas.width = Math.round(cssW * this.dpr);
			this.canvas.height = Math.round(cssH * this.dpr);
			this.drawLegend();
			if (this.engine) {
				this.drawNext();
				this.render();
			}
		}

		render() {
			const ctx = this.ctx;
			if (!ctx || !this.engine) return;
			const th = this.theme;
			const s = this.cssScale * this.dpr;
			const { width: w, height: h, dangerY } = config;
			ctx.setTransform(s, 0, 0, s, 0, 0);
			ctx.fillStyle = th.bg;
			ctx.fillRect(0, 0, w, h);
			const wobble = this.reduced ? 0 : this.shakeOffset();
			if (wobble) ctx.setTransform(s, 0, 0, s, wobble * s, 0);
			ctx.fillStyle = th.inner;
			ctx.fillRect(0, dangerY, w, h - dangerY);

			this.drawDangerLine(ctx);

			if (this.wand) {
				this.label(ctx, "Magic Wand: pick a ringed fruit", w / 2, config.dropY, 15, th.ink, 1);
			} else if (!this.over && !this.idle) {
				this.drawAim(ctx, s);
			}

			for (const body of this.engine.world.bodies) {
				const f = body.plugin.suika;
				if (f) renderer.fruit(ctx, f.tier, body.position.x, body.position.y, body.circleRadius, body.angle, 1, s);
			}

			if (this.wand) {
				ctx.strokeStyle = th.accent;
				for (const body of this.engine.world.bodies) {
					if (!this.isWandTarget(body)) continue;
					const picked = body === this.wand.target;
					ctx.setLineDash(picked ? [] : [4, 3]);
					ctx.lineWidth = picked ? 3.5 : 2;
					ctx.beginPath();
					ctx.arc(body.position.x, body.position.y, body.circleRadius + 3, 0, Math.PI * 2);
					ctx.stroke();
				}
				ctx.setLineDash([]);
			}

			this.drawFx(ctx);

			const combo = this.combo;
			const comboAge = combo ? this.time - combo.at : Infinity;
			if (comboAge < config.combo.showMs) {
				const alpha = Math.min(1, (config.combo.showMs - comboAge) / 300);
				const x = Math.max(60, Math.min(w - 60, combo.x));
				const y = Math.max(dangerY + 22, combo.y - 34);
				const size = Math.min(24, 14 + 2 * combo.n);
				this.label(ctx, combo.bonus ? `Combo x${combo.n}!` : `Chain x${combo.n}`, x, y, size, th.accent, alpha);
				if (combo.bonus) this.label(ctx, `+${combo.bonus} bonus`, x, y + size * 0.9, 12, th.ink, alpha);
			}
			if (this.note && this.time - this.note.at < 1500) this.label(ctx, this.note.text, w / 2, config.dropY + 26, 13, th.ink, 1);
			if (wobble) ctx.setTransform(s, 0, 0, s, 0, 0);
		}

		/* Dashed and dim when clear, amber when the pile is close, solid red with a shrinking bar while it is over. The
		 * bar shows the time left on the original overflow timer; drawing never changes that timer. */
		drawDangerLine(ctx) {
			const th = this.theme;
			const { width: w, dangerY } = config;
			const tutorialLine = this.mode === "tutorial" && this.tutorialStep === 2;
			ctx.lineWidth = 2;
			if (this.danger === 2) {
				ctx.setLineDash([]);
				ctx.strokeStyle = th.line;
				ctx.lineWidth = 3;
			} else if (this.danger === 1 || tutorialLine) {
				ctx.setLineDash([8, 4]);
				ctx.strokeStyle = th.warn;
			} else {
				ctx.setLineDash([6, 6]);
				ctx.strokeStyle = th.line;
				ctx.globalAlpha = 0.55;
			}
			ctx.beginPath();
			ctx.moveTo(0, dangerY);
			ctx.lineTo(w, dangerY);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
			if (this.danger === 2) {
				const left = Math.max(0, 1 - this.overflowTimer / config.overflowMs);
				const seconds = ((config.overflowMs - this.overflowTimer) / 1000).toFixed(1);
				ctx.fillStyle = th.line;
				ctx.fillRect(0, dangerY - 6, w * left, 4);
				this.label(ctx, modes[this.mode].zen ? `Picking off in ${seconds}s` : `Over the line ${seconds}s`, w / 2, dangerY - 16, 12, th.ink, 1);
			}
		}

		/* The drop guide, the held fruit (faded with a ring filling up until the next drop is allowed) and a mark at the
		 * wall when the aim is pushed against it. */
		drawAim(ctx, s) {
			const th = this.theme;
			const tier = this.heldTier;
			const r = fruits[tier].radius;
			const x = rules.clampAim(this.aimX, tier);
			const ready = this.time >= this.readyAt;
			ctx.strokeStyle = th.guide;
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(x, config.dropY + r);
			ctx.lineTo(x, config.height);
			ctx.stroke();
			renderer.fruit(ctx, tier, x, config.dropY, r, 0, ready ? 1 : 0.35, s);
			if (!ready) {
				const p = 1 - (this.readyAt - this.time) / config.dropCooldownMs;
				ctx.strokeStyle = th.ink;
				ctx.globalAlpha = 0.6;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(x, config.dropY, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p)));
				ctx.stroke();
				ctx.globalAlpha = 1;
			}
			const wall = this.aimWanted < r ? 0 : this.aimWanted > config.width - r ? config.width : -1;
			if (wall >= 0) {
				ctx.fillStyle = th.accent;
				ctx.fillRect(wall === 0 ? 0 : wall - 3, config.dropY - r, 3, r * 2);
			}
		}

		drawFx(ctx) {
			const fx = this.fx;
			let keep = 0;
			for (let i = 0; i < fx.length; i++) {
				const e = fx[i];
				const age = this.time - e.at;
				if (age >= e.life || age < 0) continue;
				fx[keep++] = e;
				const p = age / e.life;
				if (e.kind === "p") {
					ctx.globalAlpha = 1 - p;
					ctx.fillStyle = e.color;
					ctx.fillRect(e.x + e.vx * age - e.size / 2, e.y + e.vy * age + 0.00012 * age * age - e.size / 2, e.size, e.size);
				} else if (e.kind === "glow") {
					ctx.globalAlpha = 0.5 * (1 - p);
					ctx.strokeStyle = e.color;
					ctx.lineWidth = 4;
					ctx.beginPath();
					ctx.arc(e.x, e.y, e.r * (0.8 + 0.5 * p), 0, Math.PI * 2);
					ctx.stroke();
				} else {
					const rise = this.reduced ? 0 : 22 * p;
					this.label(ctx, e.text, e.x, e.y - 8 - rise, e.big ? 16 : 12, this.theme.ink, Math.min(1, 2 * (1 - p)));
				}
			}
			fx.length = keep;
			ctx.globalAlpha = 1;
		}

		/* Outlined text, readable over any fruit. */
		label(ctx, text, x, y, size, colour, alpha) {
			ctx.globalAlpha = alpha;
			ctx.font = `bold ${size}px sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.lineJoin = "round";
			ctx.lineWidth = 4;
			ctx.strokeStyle = this.theme.halo;
			ctx.strokeText(text, x, y);
			ctx.fillStyle = colour;
			ctx.fillText(text, x, y);
			ctx.globalAlpha = 1;
		}

		/* A short sideways wobble of the whole board while a shake runs; drawing only. */
		shakeOffset() {
			const c = config.abilities.shake;
			const t = this.time - this.shakeStart;
			const len = c.pulses * c.pulseGapMs;
			return t >= 0 && t < len ? Math.sin(t / 25) * 3 * (1 - t / len) : 0;
		}

		/* ---- input ---- */

		bindListeners() {
			const c = this.canvas;
			this.on = [
				[c, "pointerdown", this.onPointerDown],
				[c, "pointermove", this.onPointerMove],
				[c, "pointerup", this.onPointerUp],
				[c, "pointercancel", this.onPointerCancel],
				[c, "keydown", this.onKeyDown],
				[c, "keyup", this.onKeyUp],
				[c, "blur", this.onBlur],
				[this.root, "pointerdown", this.onAnyInput],
				[this.root, "keydown", this.onAnyInput],
				[this.el.pauseBtn, "click", this.onPauseClick],
				[this.el.restartBtn, "click", this.onRestartClick],
				[this.el.menuBtn, "click", this.onMenuClick],
				[this.el.overlayBtn, "click", this.onOverlayClick],
				[this.el.overlayBtn2, "click", this.onOverlay2Click],
				[this.el.abilityBar, "click", this.onAbilityClick],
				[this.el.modes, "click", this.onModeClick],
				[this.el.panel, "keydown", this.onPanelKey],
				[window, "resize", this.onResize],
				[document, "visibilitychange", this.onVisibility],
			];
			for (const [target, type, fn] of this.on) target.addEventListener(type, fn);
			$(document).on(":dialogopened.suika", this.onDialog);
			/* The passage can change width without a window resize (a scrollbar appearing, DoL's sidebar opening). */
			if (window.ResizeObserver) {
				this.observer = new ResizeObserver(() => {
					if (this.root && Math.abs(this.root.clientWidth - this.rootWidth) > 1) this.resize();
				});
				this.observer.observe(this.root);
			}
		}

		unbindListeners() {
			for (const [target, type, fn] of this.on) target.removeEventListener(type, fn);
			this.on = [];
			$(document).off(".suika");
			if (this.observer) this.observer.disconnect();
			this.observer = null;
		}

		toWorldX(clientX) {
			const rect = this.canvas.getBoundingClientRect();
			return ((clientX - rect.left) / rect.width) * config.width;
		}

		toWorldY(clientY) {
			const rect = this.canvas.getBoundingClientRect();
			return ((clientY - rect.top) / rect.height) * config.height;
		}

		setAim(clientX) {
			this.aimWanted = this.toWorldX(clientX);
			this.aimX = rules.clampAim(this.aimWanted, this.heldTier);
		}

		/* Any tap or key inside the game counts as the user gesture browsers want before sound may start. */
		onAnyInput = () => sound().unlock();

		onPointerDown = e => {
			if (e.button !== undefined && e.button !== 0) return;
			e.preventDefault();
			this.canvas.focus({ preventScroll: true });
			if (this.paused || this.over) return;
			/* While the wand picker is open a tap picks a fruit; it never aims or drops. */
			if (this.wand) {
				this.wand.target = this.wandHit(this.toWorldX(e.clientX), this.toWorldY(e.clientY));
				return;
			}
			this.aiming = true;
			this.setAim(e.clientX);
			try {
				this.canvas.setPointerCapture(e.pointerId);
			} catch (err) {}
		};

		onPointerMove = e => {
			if (this.paused || this.over) return;
			if (this.wand) {
				if (e.pointerType === "mouse" || e.buttons) this.wand.target = this.wandHit(this.toWorldX(e.clientX), this.toWorldY(e.clientY));
				return;
			}
			/* A mouse aims by hovering; touch and pen aim only while pressed. */
			if (!this.aiming && e.pointerType !== "mouse") return;
			this.setAim(e.clientX);
		};

		onPointerUp = e => {
			if (this.wand && !this.paused && !this.over) {
				const hit = this.wandHit(this.toWorldX(e.clientX), this.toWorldY(e.clientY));
				if (!this.confirmWand(hit)) this.note = { text: "Tap a fruit with a gold ring", at: this.time };
				return;
			}
			if (!this.aiming) return;
			this.aiming = false;
			this.setAim(e.clientX);
			this.drop();
		};

		onPointerCancel = () => {
			this.aiming = false;
		};

		/* Handled keys stop here, so DoL's number-key link shortcuts never see them. */
		onKeyDown = e => {
			const k = e.key;
			let handled = true;
			if (this.wand) {
				if (k === "Escape") this.cancelWand();
				else if (k === "ArrowLeft" || k === "ArrowRight") this.cycleWand(k === "ArrowRight" ? 1 : -1);
				else if (k === " " || k === "Enter") this.confirmWand(this.wand.target);
				else if (k === "p" || k === "P") this.setPaused(true);
				else handled = false;
				if (handled) {
					e.preventDefault();
					e.stopPropagation();
				}
				return;
			}
			if (k === "ArrowLeft" || k === "a" || k === "A") this.keys.left = true;
			else if (k === "ArrowRight" || k === "d" || k === "D") this.keys.right = true;
			else if (k === " " || k === "Enter" || k === "ArrowDown") {
				if (!e.repeat) this.drop();
			} else if (k === "p" || k === "P") this.setPaused(!this.paused);
			else handled = false;
			if (handled) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		onKeyUp = e => {
			const k = e.key;
			if (k === "ArrowLeft" || k === "a" || k === "A") this.keys.left = false;
			else if (k === "ArrowRight" || k === "d" || k === "D") this.keys.right = false;
		};

		onBlur = () => {
			this.keys.left = this.keys.right = false;
		};

		onPauseClick = () => this.setPaused(!this.paused);

		onMenuClick = () => setup.suikaUI.open(this, "menu");

		/* Whether starting something new would throw away work: a run under way, or a saved run waiting. */
		wouldReplace() {
			return this.runActive() || (this.idle && !!progress().savedRun());
		}

		/* Buttons that would throw work away (Restart, switching mode, starting a challenge) need a second press within
		 * 3 s while wouldReplace(). */
		armOrRun(btn, armedText, run) {
			if (!this.wouldReplace() || this.armedBtn === btn) {
				this.disarm();
				run();
				return;
			}
			this.disarm();
			this.armedBtn = btn;
			this.armedText = btn.textContent;
			btn.textContent = this.idle ? "Press again to replace saved run" : armedText;
			this.armTimer = setTimeout(() => this.disarm(), 3000);
		}

		disarm() {
			clearTimeout(this.armTimer);
			if (this.armedBtn && this.armedBtn.isConnected) this.armedBtn.textContent = this.armedText;
			this.armedBtn = null;
		}

		/* Starts mode (and challenge) from a button, asking for the second press when needed. */
		requestStart(btn, armedText, mode, challenge = null) {
			this.armOrRun(btn, armedText, () => {
				if (this.idle) progress().clearRun();
				if (this.mode === "tutorial") this.hideTip();
				setup.suikaUI.close(this, false);
				this.newGame(mode, { challenge });
			});
		}

		onRestartClick = () => {
			if (this.mode === "tutorial") return this.requestStart(this.el.restartBtn, "", progress().data().mode);
			this.armOrRun(this.el.restartBtn, "Press again to restart", () => {
				if (this.idle) progress().clearRun();
				this.restartSame();
			});
		};

		onModeClick = e => {
			const btn = e.target.closest(".suika-mode");
			const mode = btn && btn.dataset.mode;
			if (!mode || (mode === this.mode && !this.idle)) return;
			if (this.mode === "tutorial") {
				progress().finishTutorial();
				this.hideTip();
			}
			this.requestStart(btn, `Press again for ${modes[mode].label}`, mode);
		};

		onAbilityClick = e => {
			const btn = e.target.closest(".suika-ability");
			if (!btn || btn.disabled) return;
			const id = btn.dataset.ability;
			if (id === "wand" && this.wand) this.cancelWand();
			else this.useAbility(id);
			/* The picker is keyboard-driven from the board: arrows choose, Enter removes, Esc cancels. */
			if (this.wand) this.canvas.focus({ preventScroll: true });
		};

		onOverlayClick = () => {
			const run = this.overlayPrimary;
			if (run) run();
			/* The overlay closed (resumed, restarted): keyboard play continues on the jar. */
			if (this.el && this.el.overlay.hidden && this.el.panel.hidden) this.canvas.focus({ preventScroll: true });
		};

		onOverlay2Click = () => {
			const run = this.overlaySecondary;
			if (run) run();
		};

		onPanelKey = e => {
			if (e.key === "Escape" && setup.suikaUI.escape(this)) {
				e.preventDefault();
				e.stopPropagation();
			}
		};

		onResize = () => this.resize();

		onVisibility = () => {
			if (document.hidden) {
				this.setPaused(true);
				sound().setPaused(true);
			}
		};

		onDialog = () => this.setPaused(true);
	}

	/* Rejects anything a saved run cannot safely be rebuilt from. Returns the snapshot or null. */
	function validateSnapshot(s) {
		const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
		const int = (v, lo, hi) => num(v, lo, hi) && Math.floor(v) === v;
		if (!s || typeof s !== "object" || s.v !== 1 || !modes[s.mode] || s.mode === "tutorial") return null;
		if (!num(s.time, 0, 1e9) || !int(s.score, 0, 1e7) || !int(s.drops, 1, 1e5) || !int(s.merges, 0, 1e6) || !int(s.comboBonus, 0, 1e6)) return null;
		if (!num(s.overflow, 0, config.overflowMs) || !num(s.ready, 0, config.dropCooldownMs) || !num(s.busy, 0, 1e5) || !num(s.sinceDrop, 0, 1e9)) return null;
		if (!int(s.held, 0, config.dropPool - 1) || !int(s.next, 0, config.dropPool - 1) || !num(s.aim, -1000, 1000)) return null;
		if (!s.uses || typeof s.uses !== "object" || abilityIds.some(id => !int(s.uses[id], 0, config.abilities[id].uses))) return null;
		if (!Array.isArray(s.rng) || s.rng.length !== 2 || s.rng.some(n => !int(n, 0, 4294967295))) return null;
		if (!Array.isArray(s.shake) || s.shake.some(p => !Array.isArray(p) || !num(p[0], 0, 1e4) || (p[1] !== 1 && p[1] !== -1))) return null;
		if (s.shakeAge !== null && !num(s.shakeAge, 0, 1e9)) return null;
		if (s.chain !== null && (!Array.isArray(s.chain) || !int(s.chain[0], 0, 1e4) || !num(s.chain[1], 0, 1e9))) return null;
		if (!s.run || !int(s.run.largest, -1, lastTier) || !int(s.run.maxChain, 0, 1e4) || !s.run.used || typeof s.run.used !== "object") return null;
		if (!Array.isArray(s.fruits) || s.fruits.length > config.maxFruit) return null;
		for (const f of s.fruits) {
			if (!Array.isArray(f) || f.length !== 10) return null;
			const [tier, x, y, angle, vx, vy, av, age, grow, r] = f;
			if (!int(tier, 0, lastTier) || !num(x, -100, config.width + 100) || !num(y, -2 * config.height, config.height + 100)) return null;
			if (
				!num(angle, -1e6, 1e6) ||
				!num(vx, -50, 50) ||
				!num(vy, -50, 50) ||
				!num(av, -10, 10) ||
				!num(age, 0, 1e9) ||
				!int(grow, 0, config.growSteps) ||
				!num(r, 1, 200)
			)
				return null;
		}
		if ((s.mode === "challenge" && typeof s.challenge !== "string") || (s.mode === "daily" && !/^\d{4}-\d{2}-\d{2}$/.test(String(s.daily)))) return null;
		return s;
	}

	function destroy() {
		if (!current) return;
		current.destroy();
		current = null;
		sound().leave();
	}

	function mount(selector = "#suika") {
		destroy();
		const root = document.querySelector(selector);
		if (!root || typeof Matter === "undefined") return null;
		try {
			current = new SuikaGame(root);
			/* Every achievement unlocked before the feat existed still earns it, on the next visit. */
			if (progress().masterFeat()) current.onFeat(content().masterFeat);
		} catch (e) {
			/* Never leave the passage half-built: report it like any other passage error and keep the rest usable. */
			current = null;
			console.error("Fruit game failed to start", e);
			root.textContent = "The fruit game could not start. Go back to the console and open it again.";
		}
		return current;
	}

	/* Called from the passage: the passage DOM only exists once rendering is finished. */
	function open(selector) {
		Utils.Defer(mount, selector);
	}

	/* The game's own exits (Back to the console, Menu > Save and exit) call this before navigating: an unfinished run is
	 * saved so the next visit can resume it. Any other passage change only destroys the game. */
	function leave() {
		if (current && current.canSave()) current.checkpoint();
		else if (current) progress().abandon(current);
	}

	$(document).on(":passageinit", destroy);

	setup.suika = Object.freeze({
		config,
		fruits,
		rules,
		renderer,
		abilities,
		modes,
		freeModes,
		makeRng,
		open,
		mount,
		destroy,
		leave,
		get current() {
			return current;
		},
		get loops() {
			return loops;
		},
	});
})();
