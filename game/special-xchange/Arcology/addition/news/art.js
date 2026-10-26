/* Dome Broadcast illustrations: layered SVG scenes built from an article record, so the same article always gets the same picture.
   Moving parts carry na-* classes; they only animate inside an element with .is-live (see arcology-visuals.js). Text is escaped. */
setup.arcologyNewsArt = {
	W: 320,
	H: 180,
	serial: 0,

	esc: s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])),

	rand(rec, key) {
		let t = Math.floor(setup.arcologyNews.seed(rec.id + "|art|" + key) * 4294967296);
		return () => {
			t = (t + 0x6d2b79f5) | 0;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		};
	},

	palette(rec) {
		const hot = rec.k === "break" || ["clash", "retaliation", "takeover"].includes(rec.ph);
		return {
			top: hot ? "#2a0d1a" : "#120f2e",
			low: hot ? "#08060c" : "#040a14",
			haze: hot ? "#ff4d5e" : "#8a5cff",
			ink: "#7fe3ff",
			dim: "#2b5d73",
			faint: "#123447",
			hot: "#ff4d5e",
			warn: "#ffc857",
			pink: "#ff4fd8",
			violet: "#9b7bff",
			hotScene: hot,
		};
	},

	/* Sky, dome curve and haze. The city is under a dome, so there is never rain. */
	sky(c, id, r) {
		const cx = 60 + r() * 200;
		return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${
			c.low
		}"/></linearGradient>
<radialGradient id="${id}h" cx="${(cx / this.W).toFixed(2)}" cy="0.75" r="0.6"><stop offset="0" stop-color="${
			c.haze
		}" stop-opacity=".28"/><stop offset="1" stop-color="${c.haze}" stop-opacity="0"/></radialGradient>
<pattern id="${id}s" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" opacity=".03"/></pattern></defs>
<rect width="${this.W}" height="${this.H}" fill="url(#${id})"/><rect width="${this.W}" height="${this.H}" fill="url(#${id}h)"/>
<path d="M-40 ${this.H}A${this.W * 0.75} ${this.H * 1.1} 0 0 1 ${this.W + 40} ${this.H}" fill="none" stroke="${c.ink}" stroke-opacity=".12"/>
<path d="M-20 ${this.H}A${this.W * 0.7} ${this.H} 0 0 1 ${this.W + 20} ${this.H}" fill="none" stroke="${c.ink}" stroke-opacity=".06"/>`;
	},

	/* A row of towers. Lit windows twinkle when live. */
	towers(r, c, base, { tall = 90, col = "#0b1a28", lit = 0.5, step = 1 } = {}) {
		let out = "";
		let x = -12 + r() * 10;
		while (x < this.W + 10) {
			const w = 12 + r() * 24;
			const h = 24 + r() * tall;
			const top = base - h;
			out += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col}"/>`;
			if (r() < 0.3)
				out += `<line x1="${(x + w / 2).toFixed(1)}" y1="${top.toFixed(1)}" x2="${(x + w / 2).toFixed(1)}" y2="${(top - 8 - r() * 10).toFixed(
					1
				)}" stroke="${col}" stroke-width="1.5"/>`;
			if (r() < lit)
				for (let i = 0; i < 3 + Math.floor(r() * 4); i++) {
					const blink = r() < 0.25 ? ` class="na-win" style="animation-delay:${(r() * 4).toFixed(1)}s"` : "";
					out += `<rect${blink} x="${(x + 2 + r() * (w - 5)).toFixed(1)}" y="${(top + 4 + r() * (h - 8)).toFixed(1)}" width="2" height="1.6" fill="${
						r() < 0.2 ? c.warn : c.ink
					}" opacity=".55"/>`;
				}
			x += w + step;
		}
		return out;
	},

	billboard(r, c, x, y) {
		const col = [c.pink, c.ink, c.violet, c.warn][Math.floor(r() * 4)];
		const w = 26 + r() * 22;
		return `<g class="na-flicker" style="animation-delay:${(r() * 3).toFixed(1)}s"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(
			1
		)}" height="14" fill="${col}" opacity=".18" stroke="${col}" stroke-opacity=".8"/><line x1="${(x + 4).toFixed(1)}" y1="${(y + 5).toFixed(1)}" x2="${(
			x +
			w * 0.7
		).toFixed(1)}" y2="${(y + 5).toFixed(1)}" stroke="${col}" stroke-width="2" opacity=".7"/><line x1="${(x + 4).toFixed(1)}" y1="${(y + 9.5).toFixed(
			1
		)}" x2="${(x + w * 0.45).toFixed(1)}" y2="${(y + 9.5).toFixed(1)}" stroke="${col}" stroke-width="1.5" opacity=".5"/></g>`;
	},

	/* Elevated track with pylons and one car that runs along it when live. */
	rail(c, y) {
		let out = `<line x1="0" y1="${y}" x2="${this.W}" y2="${y}" stroke="#16384a" stroke-width="3"/>`;
		for (let x = 20; x < this.W; x += 60) out += `<rect x="${x}" y="${y}" width="4" height="${this.H - y}" fill="#0a1824"/>`;
		return (
			out +
			`<g class="na-move"><rect x="110" y="${y - 7}" width="34" height="7" rx="2" fill="#1c4a60"/><rect x="114" y="${y - 5}" width="26" height="2" fill="${
				c.ink
			}" opacity=".6"/></g>`
		);
	},

	drone(c, x, y, delay) {
		return `<g class="na-drift" style="animation-delay:${delay}s"><rect x="${x - 6}" y="${y - 1.5}" width="12" height="3" fill="#9fd8e8"/><line x1="${
			x - 9
		}" y1="${y - 3}" x2="${x + 9}" y2="${y - 3}" stroke="#9fd8e8" stroke-width=".8"/><circle class="na-blink" cx="${x}" cy="${y + 3}" r="1.3" fill="${
			c.hot
		}"/></g>`;
	},

	person(x, base, s = 1, armour = false) {
		const g = `transform="translate(${x.toFixed(1)} ${base}) scale(${s.toFixed(2)})"`;
		return armour
			? `<g ${g} fill="#05090d"><rect x="-6" y="-38" width="12" height="11" rx="5"/><rect x="-5" y="-34" width="10" height="2" fill="#7fe3ff" opacity=".7"/><path d="M-10 -26h20l-2 26h-16z"/></g>`
			: `<g ${g} fill="#05090d"><circle cx="0" cy="-30" r="6"/><rect x="-8" y="-24" width="16" height="24" rx="4"/></g>`;
	},

	crowd(r, n, base) {
		let out = "";
		for (let i = 0; i < n; i++) out += this.person(r() * this.W, base, 0.7 + r() * 0.6);
		return out;
	},

	smoke(r, x, y) {
		let out = "";
		for (let i = 0; i < 4; i++)
			out += `<circle class="na-smoke" style="animation-delay:${(i * 1.4).toFixed(1)}s" cx="${(x + r() * 6).toFixed(1)}" cy="${(y - i * 9).toFixed(1)}" r="${(
				5 +
				i * 3
			).toFixed(1)}" fill="#9aa9b4" opacity="${(0.22 - i * 0.04).toFixed(2)}"/>`;
		return out;
	},

	/* Labels, timestamp and framing. Only player incidents recorded by drones are marked as footage; the rest say ILLUSTRATION. */
	frame(rec, c, id, inner, style) {
		const t = new DateTime(rec.at ?? Time.date.timeStamp);
		const stamp = `${t.year}.${String(t.month).padStart(2, "0")}.${String(t.day).padStart(2, "0")} ${String(t.hour).padStart(2, "0")}:${String(
			t.minute
		).padStart(2, "0")}`;
		const district = setup.arcologyNews.publicSubject(rec).d;
		const where = district ? setup.arcology.districts[district]?.name ?? "" : "DOME BROADCAST";
		const tag = style === "map" ? "ROUTE DATA" : rec.k === "break" ? "● DRONE FOOTAGE" : "ILLUSTRATION";
		let deco = "";
		if (style === "cam") {
			const b = 12;
			deco = `<g stroke="${c.ink}" stroke-width="1.4" fill="none" opacity=".75"><path d="M${b} ${b + 14}V${b}H${b + 14}M${this.W - b - 14} ${b}H${this.W - b}V${
				b + 14
			}M${b} ${this.H - b - 14}V${this.H - b}H${b + 14}M${this.W - b - 14} ${this.H - b}H${this.W - b}V${
				this.H - b - 14
			}"/></g><rect class="na-scan" x="0" y="0" width="${this.W}" height="2" fill="${c.ink}" opacity=".18"/>`;
		}
		return `<svg viewBox="0 0 ${this.W} ${this.H}" role="img" aria-label="${this.esc(
			where
		)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="${id}-scene" clipPathUnits="userSpaceOnUse"><rect y="32" width="320" height="126"/></clipPath><clipPath id="${id}-frame" clipPathUnits="userSpaceOnUse"><rect width="320" height="180"/></clipPath></defs><rect width="320" height="180" fill="${
			c.low
		}"/><g clip-path="url(#${id}-scene)">${inner}<rect width="${this.W}" height="${
			this.H
		}" fill="url(#${id}s)"/></g><g clip-path="url(#${id}-frame)">${deco}</g>
<g font-family="monospace" font-size="8.5" letter-spacing=".3"><text x="18" y="${this.H - 10}" fill="#9fc3d6">${this.esc(stamp)}</text>
<text x="18" y="24" fill="${c.ink}" opacity=".85">${this.esc(where.toUpperCase())}</text>
<text x="${this.W - 18}" y="24" text-anchor="end" fill="${rec.k === "break" ? c.hot : "#9fc3d6"}">${tag}</text></g></svg>`;
	},

	route(rec, c, closed) {
		const ds = setup.arcology.districts;
		const pos = id => [24 + ds[id].map[0] * 15, 46 + ds[id].map[1] * 15];
		let out = `<rect x="12" y="34" width="150" height="132" fill="#04101a" opacity=".85" stroke="${c.faint}"/>`;
		for (const [a, b] of setup.arcology.streetLinks) {
			if (ds[a].hidden || ds[b].hidden) continue;
			const [x1, y1] = pos(a);
			const [x2, y2] = pos(b);
			const hit = a === rec.d || b === rec.d;
			out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${hit ? (closed ? c.hot : c.warn) : c.dim}" stroke-width="${hit ? 2 : 1.2}"${
				hit && closed ? ' stroke-dasharray="3 2"' : ""
			}/>`;
		}
		for (const [id, d] of Object.entries(ds)) {
			if (d.hidden) continue;
			const [x, y] = pos(id);
			const me = id === rec.d;
			out += `<circle cx="${x}" cy="${y}" r="${me ? 4 : d.bus ? 2.4 : 1.6}" fill="${me ? (closed ? c.hot : c.warn) : d.bus ? c.ink : c.dim}"/>`;
			if (me) out += `<circle class="na-pulse" cx="${x}" cy="${y}" r="8" fill="none" stroke="${closed ? c.hot : c.warn}"/>`;
		}
		return out;
	},

	/* The picture for one article. */
	svg(rec) {
		const r = this.rand(rec, "main");
		const c = this.palette(rec);
		const id = `dbn-art-${++this.serial}`;
		const f = rec.k === "story" ? rec.f : rec.k === "notice" ? "n-" + rec.f : rec.k;
		const ground = 132 + Math.floor(r() * 18);
		const halted = rec.shut && rec.ph !== "reopen";
		let s = this.sky(c, id, r);
		const city = (tall = 70) =>
			this.towers(r, c, ground - 10, { tall: tall + 30, col: "#0d1530", lit: 0.25, step: 2 }) + this.towers(r, c, ground, { tall, col: "#081624", lit: 0.6 });
		if (rec.k === "reminder") {
			if (rec.f === "dome") {
				s +=
					city(45) +
					`<path d="M32 148A128 112 0 0 1 288 148Z" fill="${c.ink}" fill-opacity=".08" stroke="${c.ink}"/><path class="na-glow" d="M64 148A96 100 0 0 1 256 148" fill="none" stroke="${c.ink}" opacity=".4"/>`;
			} else if (rec.f === "transit") {
				s += this.towers(r, c, 125, { tall: 45 }) + this.rail(c, 130) + this.route(rec, c, false);
				s += `<rect x="190" y="54" width="110" height="46" fill="#081a26" stroke="${c.dim}"/><text x="245" y="74" text-anchor="middle" fill="${c.ink}" font-size="10">CHECK STOP BOARD</text><rect class="na-seg" x="204" y="84" width="80" height="3" fill="${c.ink}"/>`;
			} else if (rec.f === "cipher" || rec.f === "hotel") {
				s += city(55);
				for (let i = 0; i < 2; i++)
					s += `<rect x="${28 + i * 150}" y="58" width="114" height="82" rx="4" fill="#081a26" stroke="${c.ink}"/><text x="${
						85 + i * 150
					}" y="82" text-anchor="middle" font-size="10" fill="${c.ink}">${
						rec.f === "cipher" ? ["WALLET", "VAULT"][i] : ["GUEST ROOM", "AUTHORIZATION"][i]
					}</text><rect class="na-seg" x="${43 + i * 150}" y="99" width="84" height="5" fill="${c.ink}" opacity=".4"/><path d="M${
						53 + i * 150
					} 120h64" stroke="${c.dim}"/>`;
			} else if (["safety", "assessment"].includes(rec.f)) {
				s += `<rect x="25" y="46" width="270" height="102" rx="3" fill="#081a26" stroke="${c.dim}"/>`;
				for (let i = 0; i < 5; i++)
					s += `<rect class="na-seg" style="animation-delay:${i * 0.4}s" x="${43 + i * 48}" y="${110 - i * 12}" width="30" height="${20 + i * 12}" fill="${
						i > 2 ? c.warn : c.ink
					}" opacity=".65"/>`;
				s += `<text x="160" y="144" text-anchor="middle" fill="${c.ink}" font-size="9">${
					rec.f === "safety" ? "DISTRICT CONDITIONS" : "PUBLIC THREAT PROFILE"
				}</text>`;
			} else {
				s += `<rect x="82" y="44" width="156" height="108" rx="8" fill="#0c2230" stroke="${c.ink}"/><rect x="105" y="65" width="110" height="60" fill="#040b16" stroke="${c.dim}"/>`;
				for (let i = 0; i < 6; i++) s += `<path d="M${98 + i * 24} 35v9m0 108v8" stroke="${c.ink}" stroke-width="4"/>`;
				if (rec.f === "xchange")
					s += `<g transform="rotate(-25 160 95)"><rect x="125" y="80" width="70" height="28" rx="14" fill="${c.pink}"/><path d="M160 80v28" stroke="#081624" stroke-width="2"/></g>`;
				else
					s += `<circle class="na-glow" cx="135" cy="92" r="12" fill="none" stroke="${c.ink}"/><path d="M160 80h40m-40 12h32m-32 12h24" stroke="${c.ink}" stroke-width="3"/>`;
				s += `<rect class="na-seg" x="110" y="135" width="100" height="4" fill="${c.ink}" opacity=".5"/>`;
			}
			return this.frame(rec, c, id, s, "info");
		}
		if (f === "idcheck") {
			/* A registry corridor, with readers rather than an unrelated street patrol. */
			s += `<path d="M0 30L120 68H200L320 30V180H0Z" fill="#0b1e2a"/><path d="M0 180L120 116H200L320 180" fill="#153445"/><rect x="120" y="68" width="80" height="48" fill="#030a12" stroke="${c.dim}"/>`;
			for (let i = 0; i < 4; i++) {
				const x = 18 + i * 80;
				s += `<path d="M${x} 42V154" stroke="${c.dim}" stroke-width="3"/><rect x="${x + 8}" y="84" width="30" height="42" rx="3" fill="#07121e" stroke="${
					c.ink
				}"/><rect class="na-seg" x="${x + 14}" y="92" width="18" height="4" fill="${c.ink}"/>`;
			}
			s += this.person(178, 150, 1.45) + `<path class="na-scan-x" d="M85 68V146" stroke="${c.ink}" opacity=".5"/>`;
			return this.frame(rec, c, id, s, "cam");
		}
		if (f === "sweep" && rec.s === "drones") {
			s += this.towers(r, c, 172, { tall: 100, col: "#102737", lit: 0.5, step: 10 });
			s += `<path d="M0 180L150 108H188L320 180" fill="#030b15"/><path d="M105 180L163 112M236 180L180 112" stroke="${c.dim}" opacity=".6"/><path class="na-glow" d="M154 72L86 160H244L172 72Z" fill="${c.ink}" opacity=".08"/>`;
			s += `<g transform="translate(-195 -80) scale(2.2)">${this.drone(c, 160, 66, 0)}</g>`;
			s += this.person(68, 178, 0.8) + this.person(264, 174, 0.65);
			return this.frame(rec, c, id, s, "cam");
		}
		if (f === "industry" && (rec.p === "compute" || rec.s === "shortage" || rec.s === "walkout")) {
			s += `<rect x="0" y="36" width="320" height="144" fill="#081722"/><path d="M0 180L120 110H200L320 180" fill="#122c39"/>`;
			if (rec.p === "compute") {
				for (let i = 0; i < 5; i++) {
					const x = 18 + i * 60;
					s += `<rect x="${x}" y="48" width="44" height="100" rx="2" fill="#030c14" stroke="${c.dim}"/>`;
					for (let j = 0; j < 7; j++)
						s += `<rect x="${x + 5}" y="${54 + j * 12}" width="34" height="8" fill="#122b39"/><circle class="${halted ? "na-glow" : "na-seg"}" cx="${
							x + 33
						}" cy="${58 + j * 12}" r="1.5" fill="${halted ? c.hot : c.ink}"/>`;
				}
			} else {
				s += `<rect x="72" y="48" width="176" height="94" fill="#020910" stroke="${c.dim}"/>`;
				s += `<rect class="na-glow" x="151" y="41" width="18" height="3" fill="${halted ? c.hot : c.ink}"/>`;
				for (let j = 0; j < 6; j++) s += `<path d="M72 ${48 + j * 12}H248" stroke="#193c4c" stroke-width="3"/>`;
				if (rec.s === "walkout" && rec.ph !== "reopen") {
					for (let i = 0; i < 6; i++) s += this.person(45 + i * 43, 174, 0.9 + r() * 0.3);
					s += `<path d="M98 152V112H152V140H98" fill="#a9bcc0" stroke="#162432"/><text x="125" y="130" text-anchor="middle" font-size="9" fill="#142632">OVERTIME</text>`;
				} else {
					for (let i = 0; i < 4; i++)
						s += `<rect x="${24 + i * 74}" y="${132 + (i % 2) * 12}" width="52" height="28" fill="#173342" stroke="${c.dim}"/><path d="M${
							32 + i * 74
						} 140h26" stroke="${c.warn}"/>`;
				}
			}
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "nightlife" && ["opening", "noise"].includes(rec.s)) {
			const name = setup.arcologyNews.orgName(rec.o);
			s +=
				city(45) +
				`<path d="M0 180L80 134H240L320 180" fill="#172031"/><rect x="46" y="40" width="228" height="114" fill="#0d1627" stroke="${
					c.dim
				}"/><rect x="114" y="88" width="92" height="66" fill="#030710"/><path class="na-glow" d="M126 96L70 180H256L194 96Z" fill="${
					c.pink
				}" opacity=".14"/><rect x="74" y="53" width="172" height="24" fill="#26182f" stroke="${
					c.pink
				}"/><text class="na-flicker" x="160" y="70" text-anchor="middle" font-size="13" letter-spacing="2" fill="${c.pink}">${this.esc(
					name.toUpperCase()
				)}</text>`;
			for (let i = 0; i < 7; i++) s += this.person(38 + i * 39, 176, 0.7 + r() * 0.3);
			return this.frame(rec, c, id, s, "stage");
		}
		if (f === "market" || f === "crash") {
			/* The exchange board. The line's overall direction follows the move the article reports; its wiggle is decoration. */
			const moved = rec.q?.[1] || rec.q?.[2] || 0;
			const col = moved < 0 ? c.hot : c.ink;
			s += city(40) + `<rect x="24" y="34" width="272" height="112" rx="3" fill="#040b16" stroke="${c.dim}"/>`;
			for (let i = 1; i < 4; i++) s += `<path d="M24 ${34 + i * 28}H296" stroke="${c.dim}" stroke-opacity=".35"/>`;
			const drop = Math.max(-1, Math.min(1, moved / 15));
			let y = 90 + drop * 30;
			let d = `M36 ${y.toFixed(1)}`;
			for (let x = 46; x <= 284; x += 10) {
				y = Math.max(44, Math.min(136, y - drop * 2.6 + (r() - 0.5) * 9));
				d += `L${x} ${y.toFixed(1)}`;
			}
			s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/><circle class="na-blink" cx="284" cy="${y.toFixed(1)}" r="3" fill="${col}"/>`;
			s += `<text x="34" y="48" font-family="monospace" font-size="9" fill="${c.ink}">GBP/CIPHER</text>`;
			if (rec.q) s += `<text x="286" y="48" text-anchor="end" font-family="monospace" font-size="9" fill="${col}">${setup.arcologyFx.gbp(rec.q[0])}</text>`;
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "transit" || f === "n-transit") {
			const closed = f === "transit" && rec.ph !== "reopen" && rec.sp !== 1;
			s += this.towers(r, c, 130, { tall: 60, col: "#0b1a28" }) + this.rail(c, 118);
			s += `<rect x="190" y="126" width="100" height="40" fill="#071420" stroke="${
				c.faint
			}"/><rect x="200" y="134" width="80" height="12" fill="#02070c" stroke="${closed ? c.hot : c.ink}" stroke-opacity=".7"/>`;
			s += `<text x="240" y="143" text-anchor="middle" font-family="monospace" font-size="7" fill="${closed ? c.hot : c.ink}" class="na-blink">${
				closed ? "NOT IN SERVICE" : "IN SERVICE"
			}</text>`;
			s += this.route(rec, c, closed);
			return this.frame(rec, c, id, s, "map");
		}
		if (f === "sweep" || f === "idcheck" || f === "n-safety") {
			s += city(80) + `<rect x="0" y="${ground}" width="${this.W}" height="${this.H - ground}" fill="#03070b"/>`;
			for (let i = 0; i < 2 + Math.floor(r() * 3); i++) s += this.billboard(r, c, 20 + r() * 260, 40 + r() * 40);
			if (rec.s === "drones" || r() < 0.4) for (let i = 0; i < 3; i++) s += this.drone(c, 50 + r() * 220, 46 + r() * 30, (r() * 3).toFixed(1));
			if (f === "idcheck" || rec.s === "checkpoint") {
				const x = 110 + r() * 60;
				s += `<rect x="${x}" y="${ground - 30}" width="8" height="30" fill="#0d2230"/><g><rect x="${x + 8}" y="${ground - 22}" width="90" height="4" fill="${
					c.warn
				}"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${x + 14 + i * 14}" y="${ground - 22}" width="6" height="4" fill="#111"/>`).join("")}</g>`;
				s += `<rect class="na-scan-x" x="${x - 30}" y="${ground - 40}" width="2" height="40" fill="${c.ink}" opacity=".6"/>`;
			} else if (f === "sweep") {
				const vx = 30 + r() * 120;
				s += `<rect x="${vx}" y="${ground - 16}" width="56" height="14" rx="4" fill="#0f2738"/><rect x="${vx + 10}" y="${
					ground - 22
				}" width="30" height="7" rx="2" fill="#0f2738"/><rect class="na-blink" x="${vx + 16}" y="${ground - 25}" width="8" height="3" fill="${
					c.ink
				}"/><rect class="na-blink" style="animation-delay:.6s" x="${vx + 26}" y="${ground - 25}" width="8" height="3" fill="${c.hot}"/>`;
				for (let i = 0; i < 2 + Math.floor(r() * 2); i++) s += this.person(vx + 80 + i * 22, ground + 6, 0.9, true);
			}
			if (f === "n-safety") {
				const tier = setup.arcology.districts[rec.d]?.tier ?? 0;
				s += Array.from(
					{ length: 5 },
					(_, i) => `<rect x="${226 + i * 14}" y="36" width="10" height="18" fill="${i <= tier ? (tier >= 3 ? c.hot : c.warn) : c.faint}"/>`
				).join("");
			}
			return this.frame(rec, c, id, s, "cam");
		}
		if (f === "feud" || f === "break") {
			s += city(70) + `<rect x="0" y="${ground}" width="${this.W}" height="${this.H - ground}" fill="#030508"/>`;
			for (let i = 0; i < 3; i++) s += this.billboard(r, c, 10 + r() * 280, 30 + r() * 50);
			s += this.crowd(r, 6 + Math.floor(r() * 5), ground + 12);
			if (c.hotScene)
				s += `<rect width="${this.W}" height="${this.H}" fill="${c.hot}" opacity=".06"/><circle class="na-blink" cx="${40 + r() * 240}" cy="${
					ground - 20
				}" r="18" fill="${c.warn}" opacity=".12"/>`;
			return this.frame(rec, c, id, s, "cam");
		}
		if (f === "smuggle") {
			s += this.towers(r, c, 110, { tall: 50, col: "#0d1530", lit: 0.3 });
			s += `<rect x="0" y="110" width="${this.W}" height="70" fill="#03111c"/>`;
			for (let i = 0; i < 6; i++)
				s += `<line class="na-flicker" style="animation-delay:${i * 0.5}s" x1="${(r() * 300).toFixed(1)}" y1="${(120 + r() * 50).toFixed(1)}" x2="${(
					r() * 300 +
					20
				).toFixed(1)}" y2="${(120 + r() * 50).toFixed(1)}" stroke="${c.ink}" stroke-opacity=".15"/>`;
			const cx = 40 + r() * 60;
			s += `<path d="M${cx} 110V40h70M${cx} 50l40-10" stroke="#16384a" stroke-width="4" fill="none"/><g class="na-sway" style="transform-origin:${
				cx + 60
			}px 40px"><line x1="${cx + 60}" y1="40" x2="${cx + 60}" y2="78" stroke="#16384a" stroke-width="1.5"/><rect x="${
				cx + 50
			}" y="78" width="20" height="14" fill="#1c3a4a"/></g>`;
			for (let i = 0; i < 4 + Math.floor(r() * 3); i++)
				s += `<rect x="${(140 + i * 26 + r() * 6).toFixed(1)}" y="${92 + (i % 2) * 6}" width="24" height="18" fill="#0d2230" stroke="${c.dim}"/>`;
			return this.frame(rec, c, id, s, "cam");
		}
		if (f === "industry") {
			s += this.towers(r, c, 120, { tall: 40, col: "#0d1530", lit: 0.2 });
			const x = 30 + r() * 50;
			s += `<rect x="${x}" y="84" width="200" height="66" fill="#0c1d2a"/><path d="M${x} 84l34-24v24l34-24v24l34-24v24" fill="#0c1d2a"/>`;
			for (let i = 0; i < 3; i++) {
				const sx = x + 120 + i * 24;
				const sy = 30 + r() * 14;
				s +=
					`<rect x="${sx}" y="${sy.toFixed(1)}" width="12" height="${(84 - sy).toFixed(1)}" fill="#0a1824"/>` + (halted ? "" : this.smoke(r, sx + 3, sy - 6));
			}
			for (let i = 0; i < 6; i++) s += `<rect x="${x + 12 + i * 30}" y="104" width="16" height="6" fill="${c.warn}" opacity="${halted ? 0.08 : 0.45}"/>`;
			s += `<rect x="${x + 70}" y="118" width="40" height="32" fill="#071018"/><rect class="${halted ? "" : "na-press"}" x="${
				x + 80
			}" y="118" width="20" height="10" fill="#1c3a4a"/>`;
			if (halted || ["incident", "dispute", "repair", "exposed"].includes(rec.ph)) {
				s += `<rect x="0" y="150" width="${this.W}" height="7" fill="#000"/>`;
				for (let i = 0; i < 26; i++) s += `<path d="M${i * 13} 157l7-7h6l-7 7z" fill="${c.warn}"/>`;
				s += `<circle class="na-blink" cx="${x + 5}" cy="78" r="3" fill="${c.hot}"/><circle class="na-blink" style="animation-delay:.7s" cx="${
					x + 195
				}" cy="78" r="3" fill="${c.hot}"/>`;
			}
			if (rec.s === "walkout" && rec.ph !== "reopen") for (let i = 0; i < 5; i++) s += this.person(x + 20 + i * 18, 172, 0.8);
			s += `<g opacity=".85"><rect x="236" y="40" width="70" height="44" fill="#04101a" stroke="${
				c.faint
			}"/><text x="242" y="52" font-family="monospace" font-size="6.5" fill="${c.ink}">${this.esc(
				(rec.s ?? "").toUpperCase()
			)}</text><text x="242" y="64" font-family="monospace" font-size="6.5" fill="${halted ? c.hot : c.dim}">${
				halted ? "SHIFTS: OFF" : "SHIFTS: ON"
			}</text><rect class="na-grow" x="242" y="72" width="56" height="4" fill="${c.ink}" opacity=".5"/></g>`;
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "business" || f === "n-exchange") {
			s += this.towers(r, c, 150, { tall: 70, col: "#0d1530", lit: 0.4, step: 3 });
			const tx = 110 + r() * 40;
			s += `<rect x="${tx.toFixed(1)}" y="26" width="70" height="140" fill="#0a1a2a"/><path d="M${tx.toFixed(1)} 26l35-16 35 16z" fill="#0a1a2a"/>`;
			for (let y = 40; y < 160; y += 8)
				s += `<line x1="${(tx + 6).toFixed(1)}" y1="${y}" x2="${(tx + 64).toFixed(1)}" y2="${y}" stroke="${c.faint}" stroke-width="2.5"/>`;
			s += `<g class="na-glow">${this.insignia(c, rec.o ?? "unitx", tx + 35, 66, 20)}</g>`;
			if (["irregular", "contract", "leak", "wages"].includes(rec.s) || rec.sp === 2) {
				s += `<g transform="rotate(-6 250 110)"><rect x="216" y="70" width="70" height="88" fill="#d8e6ee" opacity=".9"/>`;
				for (let i = 0; i < 8; i++)
					s += `<rect x="224" y="${80 + i * 9}" width="${(30 + r() * 24).toFixed(1)}" height="${i % 3 === 1 ? 5 : 2}" fill="${
						i % 3 === 1 ? "#05090d" : "#6b7f8c"
					}"/>`;
				s += "</g>";
			} else if (rec.o2) s += `<g class="na-glow">${this.insignia(c, rec.o2, 250, 110, 14)}</g>`;
			return this.frame(rec, c, id, s, "doc");
		}
		if (f === "implant" && rec.s === "xchange") {
			s +=
				city(45) +
				`<rect x="30" y="44" width="260" height="102" fill="#0c2230" stroke="${c.dim}"/><rect x="64" y="50" width="192" height="20" fill="#071420" stroke="${c.ink}"/><text x="160" y="64" text-anchor="middle" fill="${c.ink}" font-size="10">X-CHANGE / GUEST COUNTER</text>`;
			for (let i = 0; i < 3; i++)
				s += `<rect x="${48 + i * 80}" y="82" width="64" height="44" fill="#040b16" stroke="${c.dim}"/><rect class="na-seg" style="animation-delay:${
					i * 0.5
				}s" x="${60 + i * 80}" y="89" width="40" height="4" fill="${c.ink}"/>`;
			s += this.crowd(r, rec.ph === "fixed" ? 3 : 8, 166);
			return this.frame(rec, c, id, s, "plan");
		}
		if ((f === "implant" && rec.s === "backup") || f === "n-registry") {
			s += `<rect x="30" y="46" width="260" height="100" rx="4" fill="#0c2230" stroke="${c.dim}"/><rect x="150" y="60" width="122" height="70" fill="#040b16" stroke="${c.ink}"/>`;
			for (let i = 0; i < 4; i++)
				s += `<rect x="48" y="${60 + i * 19}" width="80" height="12" fill="#173849"/><circle class="na-seg" style="animation-delay:${i * 0.5}s" cx="117" cy="${
					66 + i * 19
				}" r="2" fill="${c.ink}"/>`;
			s += `<path d="M192 90V80a18 18 0 0 1 36 0v10" fill="none" stroke="${c.ink}" stroke-width="3"/><rect class="na-glow" x="184" y="90" width="52" height="32" rx="4" fill="#173849" stroke="${c.ink}"/><circle cx="210" cy="103" r="3" fill="${c.ink}"/>`;
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "implant") {
			s += `<rect width="${this.W}" height="${this.H}" fill="#06121c" opacity=".7"/><rect x="20" y="40" width="80" height="110" fill="#081a26" stroke="${c.faint}"/>`;
			for (let i = 0; i < 6; i++)
				s += `<rect class="na-seg" style="animation-delay:${(i * 0.4).toFixed(1)}s" x="30" y="${50 + i * 15}" width="${(30 + r() * 30).toFixed(
					1
				)}" height="6" fill="${i === 3 && rec.s === "malfunction" ? c.hot : c.ink}" opacity=".35"/>`;
			const head = "M148 172V112C148 77 169 51 201 51C235 51 255 77 255 108C255 118 250 128 250 134L260 148L247 152V161C247 168 240 172 230 172H211V160";
			const nodes = [
				[183, 84],
				[202, 70],
				[224, 85],
				[201, 104],
				[230, 118],
			].map(([x, y]) => [x + r() * 4 - 2, y + r() * 4 - 2]);
			s += `<defs><clipPath id="${id}-head" clipPathUnits="userSpaceOnUse"><path d="${head}Z"/></clipPath></defs><path d="${head}" fill="#0c2230" stroke="${c.dim}" stroke-width="1.5"/>`;
			s += `<g class="na-neural" clip-path="url(#${id}-head)"><g stroke="${c.ink}" fill="${c.ink}">${nodes
				.map(
					([x, y], i) =>
						`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4"/>${
							i ? `<line x1="${nodes[i - 1][0].toFixed(1)}" y1="${nodes[i - 1][1].toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>` : ""
						}`
				)
				.join("")}</g><circle class="na-glow" cx="201" cy="104" r="7" fill="none" stroke="${
				c.ink
			}" opacity=".6"/><rect class="na-scan-x" x="146" y="50" width="2" height="122" fill="${c.ink}" opacity=".7"/></g>`;
			if (rec.s === "malfunction" || rec.s === "unlicensed" || rec.sp === 2)
				s += `<g class="na-blink"><path d="M282 44l14 24h-28z" fill="none" stroke="${c.warn}" stroke-width="2"/><line x1="282" y1="52" x2="282" y2="60" stroke="${c.warn}" stroke-width="2"/></g>`;
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "nightlife") {
			c.haze = c.pink;
			s = this.sky(c, id, r) + city(70) + `<rect x="0" y="${ground}" width="${this.W}" height="${this.H - ground}" fill="#07040c"/>`;
			for (let i = 0; i < 4; i++) s += this.billboard(r, c, 10 + i * 78 + r() * 20, 50 + r() * 50);
			s += `<path class="na-flicker" d="M${(80 + r() * 160).toFixed(1)} ${ground}L${(40 + r() * 40).toFixed(1)} 0h20z" fill="${c.violet}" opacity=".08"/>`;
			s += this.crowd(r, 10, ground + 14);
			return this.frame(rec, c, id, s, "stage");
		}
		if (f === "glasshouse") {
			s += this.towers(r, c, 120, { tall: 50, col: "#0d1530", lit: 0.4 }) + `<rect x="0" y="120" width="${this.W}" height="60" fill="#04121c"/>`;
			s += `<path d="M90 120l70-80 70 80z" fill="#0c2230" fill-opacity=".85" stroke="${c.ink}" stroke-width="1.2"/>`;
			for (let i = 1; i < 4; i++)
				s += `<line x1="${90 + i * 17.5}" y1="120" x2="160" y2="40" stroke="${c.dim}"/><line x1="${230 - i * 17.5}" y1="120" x2="160" y2="40" stroke="${
					c.dim
				}"/>`;
			for (let i = 0; i < 3; i++)
				s += `<g class="na-drift" style="animation-delay:${i}s"><path d="M${30 + i * 90} ${150 + (i % 2) * 8}h26l-4 5h-18z" fill="#1c3a4a"/><circle cx="${
					45 + i * 90
				}" cy="${150 + (i % 2) * 8}" r="1.5" fill="${c.warn}"/></g>`;
			s += `<path class="na-glow" d="M150 22c4-6 16-6 20 0-2 4-6 5-10 5s-8-1-10-5z" fill="#c9d6e0"/>`;
			return this.frame(rec, c, id, s, "doc");
		}
		if (f === "n-drift") {
			const dir = (rec.x?.[1] ?? 0) * 45;
			s += `<rect x="0" y="120" width="${this.W}" height="60" fill="#03111c"/><path d="M70 120l20-14h140l20 14z" fill="#0c2230"/><path d="M90 120l70 30 70-30z" fill="#081624"/>`;
			s += `<g transform="rotate(${dir} 160 70)"><path class="na-glow" d="M160 40l9 30h-18z" fill="${c.ink}"/><path d="M160 100l9-30h-18z" fill="${c.faint}"/></g><circle cx="160" cy="70" r="34" fill="none" stroke="${c.dim}"/>`;
			s += `<text x="270" y="60" text-anchor="middle" font-family="monospace" font-size="12" fill="${c.ink}">${this.esc((rec.x?.[0] ?? 0) + " KM")}</text>`;
			return this.frame(rec, c, id, s, "plan");
		}
		if (f === "weekly") {
			for (let i = 0; i < 4; i++) {
				s += `<rect x="${40 + (i % 2) * 124}" y="${40 + Math.floor(i / 2) * 60}" width="116" height="52" fill="#0c2230" stroke="${
					i < (rec.x?.length ?? 0) ? c.ink : c.faint
				}"/>`;
				const article = rec.x?.[i];
				const label = setup.arcologyNews.families[article?.f]?.cat || "NO REPORT";
				s += `<text x="${48 + (i % 2) * 124}" y="${58 + Math.floor(i / 2) * 60}" font-size="8" fill="${c.ink}">${this.esc(label)}</text>`;
				if (article)
					s += `<rect class="na-seg" style="animation-delay:${i * 0.4}s" x="${48 + (i % 2) * 124}" y="${72 + Math.floor(i / 2) * 60}" width="${
						35 + (article.sev || 1) * 18
					}" height="4" fill="${c.ink}" opacity=".5"/>`;
			}
			return this.frame(rec, c, id, s, "doc");
		}
		s += city(60);
		for (let i = 0; i < 2; i++) s += this.billboard(r, c, 30 + r() * 240, 40 + r() * 40);
		return this.frame(rec, c, id, s, "doc");
	},

	insignia(c, key, cx, cy, size) {
		const r = this.rand({ id: key }, "logo");
		const sides = [0, 3, 4, 6][Math.floor(r() * 4)];
		const pts = n =>
			Array.from(
				{ length: n },
				(_, i) =>
					`${(cx + size * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2)).toFixed(1)},${(cy + size * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)).toFixed(1)}`
			).join(" ");
		const outer = sides ? `<polygon points="${pts(sides)}"/>` : `<circle cx="${cx}" cy="${cy}" r="${size}"/>`;
		const bars = Array.from(
			{ length: 2 + Math.floor(r() * 3) },
			(_, i) =>
				`<line x1="${(cx - size * 0.45).toFixed(1)}" y1="${(cy - size * 0.3 + i * size * 0.25).toFixed(1)}" x2="${(cx + size * (0.1 + r() * 0.35)).toFixed(
					1
				)}" y2="${(cy - size * 0.3 + i * size * 0.25).toFixed(1)}"/>`
		).join("");
		return `<g fill="none" stroke="${c.ink}" stroke-width="2">${outer}${bars}</g>`;
	},

	/* Fills every placeholder on the page, then starts animation on the elements marked data-live. */
	fill(root = document) {
		const N = setup.arcologyNews;
		for (const el of root.querySelectorAll("[data-news-art]:not(.drawn)")) {
			const rec = N.state().arts.find(x => x.id === el.dataset.newsArt);
			if (!rec) continue;
			el.innerHTML = this.svg(rec);
			el.classList.add("drawn");
		}
		setup.arcologyVisuals.fill(root);
	},

	/* top: scroll the reader back to its header, for a newly opened article. */
	later(top) {
		setTimeout(() => {
			this.fill();
			if (top) document.querySelector(".dbn")?.scrollIntoView({ block: "start" });
		}, 0);
	},
};
