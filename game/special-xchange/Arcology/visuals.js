/* Holo screen backdrops (Dome Broadcast masthead, City Map header) and the switch that lets illustrations move.
   Motion is CSS only: elements animate while they carry .is-live, and the stylesheet pauses them when the Journal is
   hidden or the tab is in the background. There are no timers, so nothing accumulates. */
setup.arcologyVisuals = {
	serial: 0,
	rand(key) {
		let t = Math.floor(setup.arcologyNews.seed("vis|" + key) * 4294967296);
		return () => {
			t = (t + 0x6d2b79f5) | 0;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
	},

	/* The city at night under the dome, seen from the Exchange towers. Changes a little each day. */
	masthead() {
		const W = 640;
		const H = 170;
		const r = this.rand("mast" + Math.floor(Time.date.timeStamp / 86400));
		const art = setup.arcologyNewsArt;
		const c = { ink: "#7fe3ff", warn: "#ffc857", pink: "#ff4fd8", violet: "#9b7bff", hot: "#ff4d5e" };
		const row = (base, tall, col, lit) => {
			let out = "";
			let x = -10;
			while (x < W + 10) {
				const w = 14 + r() * 30;
				const h = 20 + r() * tall;
				out += `<rect x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`;
				for (let i = 0; i < lit * 6; i++)
					if (r() < 0.6)
						out += `<rect${r() < 0.2 ? ` class="na-win" style="animation-delay:${(r() * 5).toFixed(1)}s"` : ""} x="${(x + 2 + r() * (w - 5)).toFixed(1)}" y="${(
							base -
							h +
							4 +
							r() * (h - 8)
						).toFixed(1)}" width="2" height="1.6" fill="${r() < 0.15 ? c.warn : c.ink}" opacity=".5"/>`;
				x += w + 1 + r() * 3;
			}
			return out;
		};
		let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="dbnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140d33"/><stop offset=".6" stop-color="#0a1230"/><stop offset="1" stop-color="#03070f"/></linearGradient>
<radialGradient id="dbnGlow" cx=".7" cy=".9" r=".7"><stop offset="0" stop-color="#8a5cff" stop-opacity=".35"/><stop offset="1" stop-color="#8a5cff" stop-opacity="0"/></radialGradient>
<linearGradient id="dbnFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#03070f" stop-opacity=".92"/><stop offset=".55" stop-color="#03070f" stop-opacity=".35"/><stop offset="1" stop-color="#03070f" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#dbnSky)"/><rect width="${W}" height="${H}" fill="url(#dbnGlow)"/>`;
		for (let i = 0; i < 3; i++)
			s += `<path d="M${-80 + i * 20} ${H}A${W * 0.62} ${H * 1.5} 0 0 1 ${W + 80 - i * 20} ${H}" fill="none" stroke="${c.ink}" stroke-opacity="${
				0.12 - i * 0.03
			}"/>`;
		s += row(H - 34, 110, "#110f2a", 1);
		for (let i = 0; i < 4; i++) {
			const x = 260 + r() * 360;
			s += `<path d="M${x.toFixed(1)} ${H - 30}V${(20 + r() * 30).toFixed(1)}l6-12 6 12V${
				H - 30
			}z" fill="#0c1430"/><circle class="na-blink" style="animation-delay:${i}s" cx="${(x + 6).toFixed(1)}" cy="${(8 + r() * 26).toFixed(1)}" r="1.4" fill="${
				c.hot
			}"/>`;
		}
		s += row(H - 20, 80, "#08132a", 2);
		for (let i = 0; i < 5; i++) s += art.billboard(r, { ...c }, 220 + r() * 400, 40 + r() * 60);
		s += `<line x1="0" y1="${H - 44}" x2="${W}" y2="${H - 50}" stroke="#16384a" stroke-width="3"/>`;
		s += `<g class="na-move-long"><rect x="-60" y="${H - 54}" width="44" height="7" rx="2" fill="#1c4a60"/><rect x="-56" y="${
			H - 52
		}" width="34" height="2" fill="${c.ink}" opacity=".7"/></g>`;
		for (let i = 0; i < 4; i++) s += art.drone(c, 300 + r() * 320, 30 + r() * 50, (r() * 4).toFixed(1));
		s += row(H, 40, "#050b18", 2);
		s += `<rect width="${W}" height="${H}" fill="url(#dbnFade)"/></svg>`;
		return s;
	},

	/* The Unit Exchange service card: the exchange towers at night, a Cipher coin, and the last day's real price line. */
	fxCard() {
		const W = 640;
		const H = 220;
		const fx = setup.arcologyFx.sync();
		const pts = fx.h2.slice(-96).concat([Math.round(setup.arcologyFx.mid(fx) * 100)]);
		const lo = Math.min(...pts);
		const hi = Math.max(...pts);
		const line = pts
			.map((p, i) => `${i ? "L" : "M"}${(250 + (i / (pts.length - 1)) * 370).toFixed(1)} ${(150 - ((p - lo) / Math.max(1, hi - lo)) * 90).toFixed(1)}`)
			.join("");
		const up = pts[pts.length - 1] >= pts[0];
		const gold = "#ffc857";
		const ink = "#7fe3ff";
		let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="fxcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1430"/><stop offset="1" stop-color="#020a14"/></linearGradient>
<radialGradient id="fxcGlow" cx=".62" cy=".55" r=".55"><stop offset="0" stop-color="${gold}" stop-opacity=".22"/><stop offset="1" stop-color="${gold}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#fxcSky)"/><rect width="${W}" height="${H}" fill="url(#fxcGlow)"/>`;
		const r = this.rand("fxcard");
		for (let x = 230; x < W; x += 34) {
			const h = 60 + r() * 110;
			s += `<rect x="${x}" y="${(H - h).toFixed(1)}" width="26" height="${h.toFixed(1)}" fill="#0b1830"/>`;
			for (let y = H - h + 8; y < H - 6; y += 9)
				if (r() < 0.45)
					s += `<rect${r() < 0.15 ? ' class="na-win"' : ""} x="${x + 4 + Math.floor(r() * 3) * 7}" y="${y.toFixed(1)}" width="4" height="2" fill="${
						r() < 0.3 ? gold : ink
					}" opacity=".45"/>`;
		}
		for (let i = 0; i < 4; i++) s += `<path d="M250 ${60 + i * 30}H620" stroke="${ink}" stroke-opacity=".1"/>`;
		s += `<path d="${line}L620 150L250 150Z" fill="${up ? "#5fd68a" : "#ff7a6b"}" fill-opacity=".08"/><path d="${line}" fill="none" stroke="${
			up ? "#5fd68a" : "#ff7a6b"
		}" stroke-width="2.5" stroke-opacity=".75"/>`;
		s += `<circle class="na-blink" cx="620" cy="${(150 - ((pts[pts.length - 1] - lo) / Math.max(1, hi - lo)) * 90).toFixed(1)}" r="4" fill="${gold}"/>`;
		/* The coin: a gold hexagon with Cipher's mark. */
		s += `<g transform="translate(604 40) scale(.72)"><path d="M0 -34L29 -17V17L0 34L-29 17V-17Z" fill="#1a1406" stroke="${gold}" stroke-width="2.5"/><path d="M0 -24L21 -12V12L0 24L-21 12V-12Z" fill="none" stroke="${gold}" stroke-opacity=".45"/><path d="M10 -9A12 12 0 1 0 10 9M-3 -15V15" fill="none" stroke="${gold}" stroke-width="3" stroke-linecap="round"/></g>`;
		s += `<rect class="na-scan" x="0" y="0" width="${W}" height="2" fill="${gold}" opacity=".18"/></svg>`;
		return s;
	},

	/* The City Map service card: the island under its dome, seen from above the sea. No district data. */
	mapCard() {
		const W = 640;
		const H = 220;
		let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="amcSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1838"/><stop offset=".65" stop-color="#071a2c"/><stop offset="1" stop-color="#020a14"/></linearGradient>
<radialGradient id="amcGlow" cx=".73" cy=".62" r=".5"><stop offset="0" stop-color="#7fe3ff" stop-opacity=".38"/><stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="amcDome" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#7fe3ff" stop-opacity=".22"/><stop offset="1" stop-color="#7fe3ff" stop-opacity=".02"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#amcSky)"/><rect width="${W}" height="${H}" fill="url(#amcGlow)"/><g transform="translate(150 0)">`;
		for (let i = 0; i < 7; i++)
			s += `<ellipse cx="320" cy="168" rx="${120 + i * 50}" ry="${18 + i * 7}" fill="none" stroke="#7fe3ff" stroke-opacity="${(0.3 - i * 0.035).toFixed(2)}"/>`;
		s += `<path d="M190 160h260l-26 16H216z" fill="#0d2232" stroke="#2b5d73"/><path d="M226 176h188l-60 26h-68z" fill="#081624" stroke="#16384a"/>`;
		const r = this.rand("mapcard");
		let x = 210;
		while (x < 430) {
			const w = 6 + r() * 12;
			const h = 14 + r() * (60 - Math.abs(x - 320) * 0.35);
			s += `<rect x="${x.toFixed(1)}" y="${(160 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#123a55"/>`;
			if (r() < 0.6)
				s += `<rect class="na-win" style="animation-delay:${(r() * 4).toFixed(1)}s" x="${(x + 2).toFixed(1)}" y="${(160 - h + 4 + r() * (h - 8)).toFixed(
					1
				)}" width="2" height="1.6" fill="#7fe3ff" opacity=".6"/>`;
			x += w + 1.5;
		}
		s += `<path d="M196 160A124 118 0 0 1 444 160" fill="url(#amcDome)" stroke="#9ff0ff" stroke-opacity=".9" stroke-width="2"/>
<path d="M222 160A98 92 0 0 1 418 160" fill="none" stroke="#7fe3ff" stroke-opacity=".18"/><line x1="320" y1="42" x2="320" y2="160" stroke="#7fe3ff" stroke-opacity=".12"/>
</g><rect class="na-scan" x="0" y="0" width="${W}" height="2" fill="#7fe3ff" opacity=".2"/></svg>`;
		return s;
	},

	/* City Map header backdrop: a navigation console look, with a perspective grid, the dome outline and a compass ring on the right. */
	mapHeader() {
		const W = 720;
		const H = 170;
		let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="acmSky" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#030a14"/><stop offset=".55" stop-color="#06162a"/><stop offset="1" stop-color="#0a2238"/></linearGradient>
<radialGradient id="acmGlow" cx=".78" cy=".55" r=".45"><stop offset="0" stop-color="#7fe3ff" stop-opacity=".25"/><stop offset="1" stop-color="#7fe3ff" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#acmSky)"/><rect width="${W}" height="${H}" fill="url(#acmGlow)"/><g stroke="#7fe3ff" fill="none">`;
		for (let i = 0; i < 9; i++) s += `<line x1="${560 + (i - 4) * 18}" y1="${H}" x2="${560 + (i - 4) * 70}" y2="${H + 60}" stroke-opacity=".1"/>`;
		for (let i = 0; i < 5; i++)
			s += `<line x1="300" y1="${H - 6 - i * i * 3}" x2="${W}" y2="${H - 6 - i * i * 3}" stroke-opacity="${(0.05 + i * 0.02).toFixed(2)}"/>`;
		s += `<path d="M450 ${H - 16}A110 96 0 0 1 670 ${H - 16}" stroke-opacity=".5" stroke-width="1.4"/><path d="M478 ${H - 16}A82 72 0 0 1 642 ${
			H - 16
		}" stroke-opacity=".18"/>
<path d="M436 ${H - 16}h248l-18 10H454z" fill="#0d2232" stroke-opacity=".35"/>
<circle cx="560" cy="${H - 70}" r="34" stroke-opacity=".28"/><circle cx="560" cy="${H - 70}" r="22" stroke-opacity=".14" stroke-dasharray="2 4"/>
<path d="M560 ${H - 108}v10M560 ${H - 42}v10M522 ${H - 70}h10M588 ${H - 70}h10" stroke-opacity=".5"/>
<g class="na-spin" style="transform-origin:560px ${H - 70}px"><path d="M560 ${H - 98}l5 28h-10z" fill="#7fe3ff" fill-opacity=".5" stroke="none"/></g></g>
<rect class="na-scan" x="0" y="0" width="${W}" height="2" fill="#7fe3ff" opacity=".18"/></svg>`;
		return s;
	},

	/* Draws [data-visual] backdrops and starts motion on [data-live] elements when the player allows it. */
	fill(root = document) {
		for (const el of root.querySelectorAll("[data-visual]:not(.drawn)")) {
			const prefix = `arc-visual-${++this.serial}-`;
			const svg = { masthead: () => this.masthead(), mapcard: () => this.mapCard(), fxcard: () => this.fxCard() }[el.dataset.visual]?.() ?? this.mapHeader();
			el.innerHTML = svg.replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`);
			el.classList.add("drawn");
		}
		const move = setup.arcology.animated();
		this.observer?.disconnect();
		this.observer ??= new IntersectionObserver(entries => {
			for (const entry of entries)
				entry.target.classList.toggle(
					"is-live",
					entry.isIntersecting && entry.target.isConnected && !entry.target.closest(".hidden") && !document.hidden && setup.arcology.animated()
				);
		});
		for (const el of document.querySelectorAll("[data-live]")) {
			el.classList.remove("is-live");
			if (move && !document.hidden && !el.closest(".hidden")) this.observer.observe(el);
		}
	},
};

$(document).on("visibilitychange.arcologyVisuals", () => {
	document.documentElement.classList.toggle("arc-page-hidden", document.hidden);
	setup.arcologyVisuals.fill();
});
$(document).on(":oncloseoverlay.arcologyVisuals :passagedisplay.arcologyVisuals", () => setup.arcologyVisuals.fill());
$(() => setup.arcology.reducedMotion.addEventListener?.("change", () => setup.arcologyVisuals.fill()));
