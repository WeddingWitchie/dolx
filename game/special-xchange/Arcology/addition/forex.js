/* Unit Exchange's GBP/Cipher market. The price moves in 1-second steps of real elapsed time, independent of <<pass>>.
   Each step's randomness comes from (seed, step number), so a reloaded save replays the same path up to the present.
   Saved as $xchange.arcology.fx. Prices are pence per Cipher; histories store hundredths of a penny as integers.
   Quantities are whole thousandths of a Cipher, the unit every wallet balance is stored in. */
setup.arcologyFx = {
	STEP: 1000,
	ANCHOR: 1500000,
	/* Soft support for the reference price around £11,000; temporary swings can pass it. */
	FLOOR: 1100000,
	/* After a long gap (game closed, old save), at most six hours of market time is replayed; the rest is skipped. */
	CATCHUP: 21600,
	SPREAD: [0.006, 0.008, 0.012],
	/* Linear permanent impact: buying c Cipher lifts the log price by c / depth. Linear impact can't be split into a profit. */
	DEPTH: 2000,
	MAX_ORDER: 250000,
	IMPACT_HALFLIFE: 1800,
	VOL: [0.0001, 0.00015, 0.00025],
	/* Second-to-second swing around the market price: about £500 to £900 a second at £12,000, more in a busy market.
	   Each second mostly keeps the last one's direction, so runs of 10 to 20 seconds move the price by thousands,
	   staying between a third and three times the market price. */
	WAVE: [0.06, 0.08, 0.11],
	/* Extra bounce on each one-second tick, never carried into the next tick. */
	TICK_VOL: [0.004, 0.006, 0.01],
	/* Sudden repricings that stay: chance per second, and typical size as a log move. Slightly more of them follow the current trend. */
	JUMP_P: [1 / 900, 1 / 450, 1 / 240],
	JUMP: [0.16, 0.22, 0.3],

	state() {
		const a = V.xchange.arcology;
		if (a.fx) return a.fx;
		const seed = Math.floor(setup.arcologyNews.seed("fx|" + (a.implant?.fitted ?? a.news?.seed ?? 1)) * 2147483647) | 0;
		const fx = (a.fx = {
			seed,
			k: 0,
			w: 0,
			ref: Math.log(this.ANCHOR),
			dev: 0,
			m: 0,
			imp: 0,
			cr: 0,
			crT: 0,
			halt: 0,
			vr: 1,
			vrN: 0,
			mu: 0,
			muN: 0,
		});
		Object.assign(fx, { ev: [], done: [], h0: [], h1: [], h2: [], h3: [], mk: [], tx: [], cz: {} });
		/* A day of prior trading, so the first visit has a chart. */
		fx.w = Date.now();
		this.record(fx);
		for (let i = 0; i < 86400; i++) this.step(fx);
		return fx;
	},

	/* Uniform 0..1 for step k, draw j. */
	u(fx, k, j) {
		let h = fx.seed ^ Math.imul(k, 0x9e3779b1) ^ Math.imul(j + 1, 0x85ebca6b);
		h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
		h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
		h ^= h >>> 16;
		return ((h >>> 0) + 0.5) / 4294967296;
	},

	z(fx, k, j) {
		return Math.sqrt(-2 * Math.log(this.u(fx, k, j))) * Math.cos(2 * Math.PI * this.u(fx, k, j + 50));
	},

	/* Current mid price in pence. */
	mid(fx = this.state()) {
		return Math.exp(fx.ref + fx.dev + fx.imp + fx.cr + (fx.j ?? 0));
	},

	live(fx, e) {
		return fx.k < e.s + e.d * 1.5;
	},

	/* Active impulses from news events add to volatility while they run. */
	boost(fx) {
		return fx.ev.reduce((b, e) => (this.live(fx, e) ? Math.max(b, e.v ?? 1) : b), 1);
	},

	step(fx) {
		const k = ++fx.k;
		if (k >= fx.vrN) {
			const r = this.u(fx, k, 1);
			fx.vr = r < 0.3 ? 0 : r < 0.88 ? 1 : 2;
			fx.vrN = k + 300 + Math.floor(this.u(fx, k, 2) * 1500);
		}
		if (k >= fx.muN) {
			/* A trend lasting 20 minutes to an hour and a half, about 12% an hour either way; quiet regimes move less. */
			fx.mu = (this.z(fx, k, 3) * [0.06, 0.12, 0.2][fx.vr]) / 3600;
			fx.muN = k + 1200 + Math.floor(this.u(fx, k, 4) * 4200);
		}
		let perm = 0;
		let temp = 0;
		let crisis = 0;
		let herd = 0;
		let shock = false;
		const S = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
		for (const e of fx.ev) {
			const shape = S((k - e.s) / e.d) - S((k - 1 - e.s) / e.d);
			const inc = (e.a ?? 0) * shape;
			perm += inc * (1 - (e.o ?? 0));
			temp += inc * (e.o ?? 0);
			crisis += (e.c ?? 0) * (1 - (e.now ?? 0)) * shape;
			if (e.c && this.live(fx, e)) shock = true;
			if (k < e.s + e.d) herd = Math.max(herd, e.h ?? 0);
		}
		fx.ev = fx.ev.filter(e => this.live(fx, e));
		const before = fx.ref + fx.dev;
		const lnA = Math.log(this.ANCHOR);
		const lnF = Math.log(this.FLOOR);
		fx.ref += fx.mu + perm + (Math.LN2 / 259200) * (lnA - fx.ref) + (fx.ref < lnF ? (Math.LN2 / 3600) * (lnF - fx.ref) : 0);
		fx.dev = fx.dev * (1 - Math.LN2 / 1800) + temp + (0.25 + herd) * fx.m + this.VOL[fx.vr] * this.boost(fx) * this.z(fx, k, 0);
		fx.m = fx.m * 0.99 + 0.01 * (fx.ref + fx.dev - before);
		/* After momentum, so one jump doesn't set off a chain of them. */
		if (this.u(fx, k, 90) < this.JUMP_P[fx.vr] * this.boost(fx)) {
			const dir = this.u(fx, k, 91) < 0.55 === fx.mu >= 0 ? 1 : -1;
			fx.jt = (fx.jt ?? 0) + dir * this.JUMP[fx.vr] * (0.5 + Math.abs(this.z(fx, k, 92)));
		}
		/* A jump plays out over about a minute, fastest at the start, so it reads as a sharp run rather than a one-tick wall. */
		if (fx.jt) {
			const part = Math.abs(fx.jt) < 0.002 ? fx.jt : fx.jt * 0.06;
			fx.dev += part;
			fx.jt -= part;
		}
		/* Keep tick noise out of the reference price and momentum; it must not accumulate into a new base. */
		/* The swing sits outside the reference price and momentum, so it can't pile up into a runaway trend. */
		fx.vv = (fx.vv ?? 0) * 0.75 + this.WAVE[fx.vr] * this.boost(fx) * this.z(fx, k, 95);
		fx.wv = (fx.wv ?? 0) * 0.8 + fx.vv;
		fx.j = Math.log(3) * Math.tanh(fx.wv / Math.log(3)) + this.TICK_VOL[fx.vr] * this.boost(fx) * this.z(fx, k, 80);
		fx.imp *= 1 - Math.LN2 / this.IMPACT_HALFLIFE;
		/* The crisis offset moves only through crisis events, then drifts to their outcome; the outcome itself fades over weeks. */
		if (shock) fx.cr += crisis;
		else fx.cr += (Math.LN2 / 43200) * (fx.crT - fx.cr);
		fx.crT *= 1 - Math.LN2 / 1209600;
		/* A crisis can only take value away: overlapping rescues never lift Cipher above its ordinary market. */
		fx.cr = Math.min(0, fx.cr);
		const x = fx.ref + fx.dev + fx.imp + fx.cr + fx.j;
		if (x < 0) fx.dev -= x;
		if (x > Math.log(2e7)) fx.dev += Math.log(2e7) - x;
		this.record(fx);
	},

	record(fx) {
		const p = Math.round(this.mid(fx) * 100);
		const keep = (list, n) => list.length > n && list.splice(0, list.length - n);
		fx.h0.push(p);
		keep(fx.h0, 300);
		if (fx.k % 5 === 0) {
			fx.h1.push(p);
			keep(fx.h1, 720);
		}
		if (fx.k % 300 === 0) {
			fx.h2.push(p);
			keep(fx.h2, 2016);
		}
		if (fx.k % 3600 === 0) {
			fx.h3.push(p);
			keep(fx.h3, 168);
		}
	},

	/* Advances the market to real time. A clock set backwards freezes it rather than rewinding. */
	sync(now = Date.now()) {
		const fx = this.state();
		/* A save from a device whose clock ran ahead would otherwise freeze the market until real time caught up. */
		if (fx.w > now + 600000) fx.w = now;
		let n = Math.floor((now - fx.w) / this.STEP);
		if (!(n > 0)) return fx;
		if (n > this.CATCHUP) {
			fx.w += (n - this.CATCHUP) * this.STEP;
			n = this.CATCHUP;
		}
		for (let i = 0; i < n; i++) this.step(fx);
		fx.w += n * this.STEP;
		return fx;
	},

	/* Real time of step k, for chart labels. */
	timeOf(fx, k) {
		return fx.w - (fx.k - k) * this.STEP;
	},

	/* Cipher's value against its normal level: 1 in ordinary markets, far less during a collapse. */
	ratio(fx = this.state()) {
		return Math.exp(fx.cr);
	},

	/* Trading conditions the exchange is really operating under. halted: no orders at all; sellOnly: the Registry's
	   emergency order that stops guest accounts buying; cap: largest order in thousandths of a Cipher. */
	rules(fx = this.state()) {
		const r = this.ratio(fx);
		const halted = fx.k < fx.halt;
		if (r < 0.2) return { halted, sellOnly: true, cap: 5000, label: halted ? "TRADING SUSPENDED" : "EMERGENCY ORDER: SELLING ONLY" };
		if (r < 0.6) return { halted, sellOnly: false, cap: 25000, label: halted ? "TRADING SUSPENDED" : "RESTRICTED: ORDER LIMIT 25 CIPHER" };
		return { halted, sellOnly: false, cap: this.MAX_ORDER, label: halted ? "TRADING SUSPENDED" : "" };
	},

	spread(fx = this.state()) {
		const r = this.ratio(fx);
		if (r < 0.2) return 0.12;
		if (r < 0.6) return 0.04;
		return fx.ev.some(e => e.wide && this.live(fx, e)) ? 0.03 : this.SPREAD[fx.vr];
	},

	/* Liquidity thins with the currency's value: a collapse leaves very few buyers. */
	depth(fx = this.state()) {
		return this.DEPTH * Math.max(0.01, Math.min(1, this.ratio(fx)));
	},

	bid(fx = this.state()) {
		return this.mid(fx) * (1 - this.spread(fx));
	},

	ask(fx = this.state()) {
		return this.mid(fx) * (1 + this.spread(fx));
	},

	/* Price `steps` seconds ago from the finest history that covers it. */
	ago(fx, steps) {
		const at = (list, per) => {
			const i = list.length - 1 - Math.floor((steps - (fx.k % per)) / per);
			return i >= 0 && i < list.length ? list[i] / 100 : null;
		};
		if (steps < fx.h0.length) return fx.h0[fx.h0.length - 1 - steps] / 100;
		if (steps <= 3600) return at(fx.h1, 5);
		if (steps <= 86400) return at(fx.h2, 300);
		return at(fx.h3, 3600);
	},

	/* Percent change over the given number of seconds, or null without history. */
	change(fx, steps) {
		const then = this.ago(fx, steps);
		return then ? (this.mid(fx) / then - 1) * 100 : null;
	},

	/* What filling q thousandths of a Cipher costs or pays right now. Walking the impact line averages to (e^I − 1) / I. */
	quote(side, q, fx = this.state()) {
		const c = q / 1000;
		const I = c / this.depth(fx);
		const walk = I > 1e-9 ? (side === "buy" ? (Math.exp(I) - 1) / I : (1 - Math.exp(-I)) / I) : 1;
		const unit = (side === "buy" ? this.ask(fx) : this.bid(fx)) * walk;
		const total = side === "buy" ? Math.ceil(c * unit) : Math.floor(c * unit);
		return { side, q, unit: total / c, total, impact: (side === "buy" ? Math.exp(I) - 1 : Math.exp(-I) - 1) * 100 };
	},

	/* Largest quantity affordable with the cash in hand, within the current order limit. */
	maxBuy(fx = this.state()) {
		let q = Math.min(this.rules(fx).cap, Math.floor((V.money / this.ask(fx)) * 1000));
		while (q > 0 && this.quote("buy", q, fx).total > V.money) q = Math.floor(q * 0.995);
		return Math.max(0, q);
	},

	/* Parses a typed amount of Cipher into whole thousandths, or NaN when it has more precision than the exchange accepts. */
	parse(text) {
		const v = Number(String(text).trim());
		if (!Number.isFinite(v)) return NaN;
		const q = Math.round(v * 1000);
		return Math.abs(v * 1000 - q) < 1e-6 ? q : NaN;
	},

	/* Executes a trade once. `seen` is the total the player confirmed; if the market has since moved against them by
	   more than half a percent, nothing happens and the new quote comes back for a second confirmation. */
	trade(side, q, seen) {
		const a = V.xchange.arcology;
		if (!a?.arrived || !setup.arcology.online() || !setup.arcology.hasClearance("guest"))
			return { error: "Trading requires a valid guest profile and a connection to the city network." };
		const fx = this.sync();
		const rule = this.rules(fx);
		if (rule.halted) return { error: "Trading is suspended. No orders are being accepted." };
		if (side === "buy" && rule.sellOnly) return { error: "The Registry's emergency order stops guest accounts buying Cipher. Selling is still possible." };
		if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > rule.cap)
			return { error: `Enter an amount from 0.001 to ${setup.arcology.cxN(rule.cap)} Cipher, to three decimal places.` };
		const x = this.quote(side, q, fx);
		if (side === "buy" && x.total > V.money) return { error: "You don't have enough money for that order." };
		if (side === "sell" && q > (a.cipher || 0)) return { error: "Your wallet doesn't hold that much Cipher." };
		if (x.total < 1) return { error: "That amount is worth less than a penny at the current price." };
		if (!Number.isFinite(seen) || (side === "buy" ? x.total > seen * 1.005 : x.total < seen * 0.995)) return { requote: x };
		if (side === "buy") {
			Wikifier.wikifyEval(`<<money ${-x.total} "arcologyExchange" { cashOnly: true }>><<updatesidebarmoney>>`);
			a.cipher = (a.cipher || 0) + q;
			fx.imp += q / 1000 / this.depth(fx);
		} else {
			a.cipher -= q;
			Wikifier.wikifyEval(`<<money ${x.total} "arcologyExchange" { incomeType: "none" }>><<updatesidebarmoney>>`);
			fx.imp -= q / 1000 / this.depth(fx);
		}
		fx.h0[fx.h0.length - 1] = Math.round(this.mid(fx) * 100);
		fx.tx.push([Date.now(), side === "buy" ? 1 : 0, q, x.total, Time.date.timeStamp]);
		if (fx.tx.length > 12) fx.tx.shift();
		window.updateMoment?.();
		return { done: x };
	},

	/* Called by news stages. Impulses register once per id; stages older than yesterday are treated as already priced in.
	   A crisis event (`c`) may apply part of its move at once (`now`), halt trading (`halt` seconds) and set the
	   level the crisis settles towards (`ct`). */
	impulse(id, def, fresh) {
		const fx = this.sync();
		if (fx.done.includes(id)) return;
		fx.done.push(id);
		if (fx.done.length > 60) fx.done.shift();
		if (!fresh || !def) return;
		fx.ev.push(Object.assign({ id, s: fx.k }, def));
		if (def.c && def.now) fx.cr = Math.min(0, fx.cr + def.c * def.now);
		if (def.halt) fx.halt = Math.max(fx.halt, fx.k + def.halt);
		if (def.ct !== undefined) fx.crT = def.ct === "hold" ? fx.cr + def.c * (1 - (def.now ?? 0)) : def.ct;
		fx.h0[fx.h0.length - 1] = Math.round(this.mid(fx) * 100);
	},

	/* Chart marker for a published market report. */
	mark(label, up) {
		const fx = this.sync();
		fx.mk.push([fx.k, label, up ? 1 : 0]);
		if (fx.mk.length > 20) fx.mk.shift();
	},

	/* How far a currency crisis has spread through the city, 0 to 4. Depth comes from the real-time market; spread
	   comes from in-game days, so a brief anomaly stays a headline while a long collapse reaches work, transit and the streets.
	   After recovery, the level falls one step every two in-game days. */
	crisis() {
		if (!V.xchange?.arcology?.arrived) return 0;
		const fx = this.sync();
		const cz = (fx.cz ??= {});
		const before = JSON.stringify(cz);
		const r = this.ratio(fx);
		const now = Time.date.timeStamp;
		let level = 0;
		if (r < 0.5) {
			cz.s ??= now;
			delete cz.e;
			const sev = r < 0.001 ? 3 : r < 0.05 ? 2 : 1;
			level = Math.min(1 + sev, 1 + Math.floor((((now - cz.s) / 86400) * sev) / 3));
			cz.pk = Math.max(cz.pk ?? 0, level);
		} else if (cz.s) {
			cz.e ??= now;
			level = Math.max(0, (cz.pk ?? 0) - Math.floor((now - cz.e) / 172800));
			if (!level) for (const key of Object.keys(cz)) delete cz[key];
		}
		if (JSON.stringify(cz) !== before) window.updateMoment?.();
		return level;
	},

	/* Chart ranges: [label, history, seconds per point, points shown, words for the change line]. */
	ranges: [
		["5M", "h0", 1, 300, "past 5 minutes"],
		["30M", "h1", 5, 360, "past 30 minutes"],
		["1H", "h1", 5, 720, "past hour"],
		["24H", "h2", 300, 288, "past 24 hours"],
		["7D", "h3", 3600, 168, "past 7 days"],
	],
	range: "30M",
	timer: 0,

	/* Pounds for display: whole pounds at Cipher's normal scale, pence once it has collapsed. */
	gbp(pence, exact) {
		const p = pence / 100;
		const digits = exact || Math.abs(p) < 100 ? 2 : 0;
		return "£" + p.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
	},

	clock(ms) {
		return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
	},

	/* [step, pence] pairs for the chosen range, ending at the live price. */
	series(fx, r) {
		const [, key, per, count] = this.ranges.find(x => x[0] === r);
		const list = fx[key].slice(-count);
		const last = key === "h0" ? fx.k : fx.k - (fx.k % per);
		const out = list.map((p, i) => [last - (list.length - 1 - i) * per, p / 100]);
		if (r === "7D" && fx.h2.length) {
			const end = fx.k - (fx.k % 300);
			const recent = fx.h2.map((p, i) => [end - (fx.h2.length - 1 - i) * 300, p / 100]);
			return out.filter(p => p[0] < recent[0][0]).concat(recent, [[fx.k, this.mid(fx)]]);
		}
		if (key !== "h0") out.push([fx.k, this.mid(fx)]);
		return out;
	},

	/* Market condition as the exchange reports it, from the conditions the model is actually using. */
	condition(fx) {
		const r = this.ratio(fx);
		if (r < 0.2) return ["CRISIS", "hot"];
		if (r < 0.6) return ["UNDER PRESSURE", "hot"];
		const b = this.boost(fx);
		if (b >= 2.5) return ["SHOCK", "hot"];
		if (b > 1.4 || fx.vr === 2) return ["FAST MOVING", "warn"];
		return fx.vr === 0 ? ["CALM", ""] : ["ACTIVE", ""];
	},

	/* A tidy price-axis step for a chart spanning `span` pence: 1, 2 or 5 times a power of ten. */
	niceStep(span) {
		const raw = span / 4;
		const pow = Math.pow(10, Math.floor(Math.log10(raw)));
		return [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw);
	},

	/* Builds the terminal into `host` and keeps it live. One timer for the whole game: mounting again replaces it. */
	mount(host) {
		if (!host) return;
		clearInterval(this.timer);
		if (!V.xchange?.arcology?.arrived || !setup.arcology.online() || !setup.arcology.hasClearance("guest")) {
			host.textContent = "Trading requires a valid guest profile and a connection to the city network.";
			return;
		}
		const ui = { side: "buy", seen: NaN, busy: false, k: -1, axis: null, axisRange: null };
		host.innerHTML = `<section class="fx-term" aria-label="Unit Exchange terminal">
	<header class="fx-head"><div><span class="fx-kicker">UNIT EXCHANGE</span><b class="fx-pair">POUNDS / CIPHER</b></div><div class="fx-live"><span class="fx-dot" aria-hidden="true"></span><span class="fx-clock"></span></div></header>
	<p class="fx-halt" role="status" hidden></p>
	<div class="fx-quote"><div class="fx-price">1 Cipher = <b class="fx-mid"></b></div><div class="fx-chg"></div></div>
	<dl class="fx-sides"><div><dt>BUY AT</dt><dd class="fx-ask"></dd></div><div><dt>SELL AT</dt><dd class="fx-bid"></dd></div><div><dt>SPREAD</dt><dd class="fx-spr"></dd></div><div><dt>MARKET</dt><dd class="fx-state"></dd></div></dl>
	<div class="fx-chart">
		<div class="fx-ranges" role="group" aria-label="Chart range">${this.ranges.map(r => `<button type="button" data-r="${r[0]}">${r[0]}</button>`).join("")}</div>
		<div class="fx-plot"><svg class="fx-svg" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"></svg><div class="fx-y"></div><div class="fx-now"></div></div>
		<div class="fx-x"></div>
		<div class="fx-span"></div>
	</div>
	<div class="fx-grid">
		<div class="fx-wallet"><h4>YOUR MONEY</h4><dl><div><dt>Cash</dt><dd class="fx-money"></dd></div><div><dt>Wallet Cipher</dt><dd class="fx-cipher"></dd></div><div><dt>Vault Cipher</dt><dd class="fx-vault"></dd></div><div><dt>Wallet sell value</dt><dd class="fx-worth"></dd></div></dl><p class="fx-hint">To sell vault Cipher, withdraw it at Halden Trust first.</p></div>
		<form class="fx-order" novalidate>
			<h4>TRADE CIPHER</h4>
			<div class="fx-tabs" role="group" aria-label="Order side"><button type="button" data-side="buy">Buy Cipher</button><button type="button" data-side="sell">Sell Cipher</button></div>
			<label class="fx-amt">Cipher amount (minimum 0.001)<input type="text" inputmode="decimal" autocomplete="off" value="0.010"></label>
			<div class="fx-quick"><button type="button" data-q="10">0.01</button><button type="button" data-q="100">0.1</button><button type="button" data-q="1000">1</button><button type="button" data-q="max">MAX</button></div>
			<p class="fx-preview" aria-live="polite"></p>
			<button type="submit" class="fx-go"></button>
			<p class="fx-msg" role="status"></p>
		</form>
	</div>
	<div class="fx-lists"><div><h4>YOUR TRADES</h4><ol class="fx-tx"></ol></div><div><h4>MARKET ACTIVITY</h4><ol class="fx-act"></ol></div></div>
	<p class="fx-foot">Prices change every second. The price must rise enough to cover the buy/sell gap before you profit. Large trades get a worse price.</p>
</section>`;
		const $ = sel => host.querySelector(sel);
		const input = $(".fx-amt input");
		const cxs = q => setup.arcology.cxN(q);

		const order = () => {
			const fx = this.state();
			const rule = this.rules(fx);
			const q = this.parse(input.value);
			const go = $(".fx-go");
			const blocked = rule.halted
				? "Trading is suspended. No orders are being accepted."
				: ui.side === "buy" && rule.sellOnly
				? "Buying is closed to guest accounts under the Registry's emergency order."
				: "";
			if (blocked || !(q >= 1 && q <= rule.cap)) {
				ui.seen = NaN;
				$(".fx-preview").textContent = blocked || `Enter an amount from 0.001 to ${cxs(rule.cap)} Cipher, to three decimal places.`;
				go.textContent = ui.side === "buy" ? "Buy Cipher" : "Sell Cipher";
				go.disabled = true;
				return;
			}
			const x = this.quote(ui.side, q, fx);
			ui.seen = x.total;
			const short = ui.side === "buy" ? x.total > V.money : q > (V.xchange.arcology.cipher || 0);
			const impact = Math.abs(x.impact) >= 0.1 ? ` Your order moves the price ${x.impact > 0 ? "up" : "down"} ${Math.abs(x.impact).toFixed(1)}%.` : "";
			$(".fx-preview").textContent =
				(ui.side === "buy" ? `You pay ${this.gbp(x.total, true)}` : `You receive ${this.gbp(x.total, true)}`) +
				(Math.abs(x.impact) >= 0.1 ? ` (${this.gbp(x.unit)} per Cipher).${impact}` : ".") +
				(short ? (ui.side === "buy" ? " You don't have enough cash." : " Your wallet doesn't hold that much Cipher.") : "") +
				(x.total < 1 ? " That amount is worth less than a penny." : "");
			go.textContent = `${ui.side === "buy" ? "Buy" : "Sell"} ${cxs(q)} Cipher for ${this.gbp(x.total, true)}`;
			go.disabled = short || ui.busy || x.total < 1;
		};

		const lists = fx => {
			const tx = fx.tx
				.slice()
				.reverse()
				.map(
					([at, buy, q, total]) =>
						`<li><span class="fx-t">${this.clock(at)}</span><span class="${buy ? "up" : "down"}">${buy ? "BOUGHT" : "SOLD"}</span> ${cxs(q)} at ${this.gbp(
							(total / q) * 1000
						)} <span class="fx-dim">(${this.gbp(total, true)})</span></li>`
				);
			$(".fx-tx").innerHTML = tx.join("") || '<li class="fx-dim">No trades yet.</li>';
			const act = fx.mk
				.filter(m => fx.k - m[0] < 86400)
				.reverse()
				.map(
					([k, label, up]) =>
						`<li><span class="fx-t">${this.clock(this.timeOf(fx, k))}</span><span class="${up ? "up" : "down"}">${up ? "▲" : "▼"}</span> ${label.replace(
							/[<>&]/g,
							""
						)}</li>`
				);
			$(".fx-act").innerHTML = act.join("") || '<li class="fx-dim">No market reports in the past day.</li>';
		};

		const chart = (fx, pts) => {
			const svg = $(".fx-svg");
			if (pts.length < 2) {
				svg.innerHTML = "";
				$(".fx-y").innerHTML = "";
				$(".fx-x").innerHTML = '<span class="fx-dim">Not enough history for this range yet.</span>';
				$(".fx-span").textContent = "";
				return;
			}
			const ps = pts.map(p => p[1]);
			const min = Math.min(...ps);
			const max = Math.max(...ps);
			/* A collapse spans several orders of magnitude, so it is drawn on a log scale; ordinary ranges stay linear. */
			const logScale = max / Math.max(min, 1) > 20;
			const f = logScale ? p => Math.log10(Math.max(p, 1)) : p => p;
			/* The axis only rescales when the price leaves it, so ordinary ticks don't make the chart jump. */
			let axis = ui.axisRange === this.range + logScale ? ui.axis : null;
			if (!axis || f(min) < axis[0] || f(max) > axis[1] || f(max) - f(min) < (axis[1] - axis[0]) * 0.35) {
				const step = logScale ? 1 : this.niceStep(max - min || max * 0.01);
				// A price can't go below zero, so the padding under a crashed price stops at £0.
				const lo = logScale ? Math.floor(f(min)) : Math.max(0, Math.floor((min - step * 0.25) / step) * step);
				const hi = logScale ? Math.ceil(f(max)) : Math.ceil((max + step * 0.25) / step) * step;
				axis = [lo, hi, step];
				ui.axis = axis;
				ui.axisRange = this.range + logScale;
			}
			const [lo, hi, step] = axis;
			const k0 = pts[0][0];
			const k1 = pts[pts.length - 1][0];
			const X = k => ((k - k0) / Math.max(1, k1 - k0)) * 1000;
			const Y = p => 300 - ((f(p) - lo) / (hi - lo)) * 300;
			/* Candles cover clock periods aligned to their length. Open is the previous candle's close.
			   The 7D candle length grows with its history; the other ranges keep a fixed length. */
			const span = { "5M": 6, "30M": 40, "1H": 75, "24H": 1800, "7D": [1800, 3600, 7200, 10800].find(s => (k1 - k0) / s <= 60) ?? 10800 }[this.range];
			const groups = new Map();
			for (const [k, p] of pts) {
				const b = Math.floor(k / span);
				if (!groups.has(b)) groups.set(b, []);
				groups.get(b).push(p);
			}
			const w = (span / Math.max(1, k1 - k0)) * 1000;
			let s = "";
			let prev = null;
			for (const [b, g] of groups) {
				const o = prev ?? g[0];
				const cl = g[g.length - 1];
				prev = cl;
				/* The oldest period is partly scrolled off the chart; showing it would make it shrink each second. */
				if (b * span < k0) continue;
				const cls = cl >= o ? "up" : "down";
				const x = Math.min(X(b * span + span / 2), 1000 - w * 0.32);
				const yT = Y(Math.max(o, cl));
				const yB = Y(Math.min(o, cl));
				s += `<path class="fx-wick ${cls}" d="M${x.toFixed(1)} ${Y(Math.max(o, ...g)).toFixed(1)}V${Y(Math.min(o, ...g)).toFixed(1)}"/>`;
				s += `<rect class="fx-body ${cls}" x="${(x - w * 0.32).toFixed(1)}" y="${yT.toFixed(1)}" width="${(w * 0.64).toFixed(1)}" height="${Math.max(
					1.5,
					yB - yT
				).toFixed(1)}"/>`;
			}
			s += `<path class="fx-base" d="M0 ${Y(ps[ps.length - 1]).toFixed(1)}H1000"/>`;
			for (const [k, , mu] of fx.mk) if (k >= k0 && k <= k1) s += `<path class="fx-ev ${mu ? "up" : "down"}" d="M${X(k).toFixed(1)} 0V300"/>`;
			svg.innerHTML = s;
			const ticks = [];
			for (let v = hi; v >= lo - 1e-9 && ticks.length < 8; v -= step) ticks.push(v);
			$(".fx-y").innerHTML = ticks.map(v => `<span style="top:${((hi - v) / (hi - lo)) * 100}%">${this.gbp(logScale ? Math.pow(10, v) : v)}</span>`).join("");
			$(".fx-now").style.top = `${(Y(ps[ps.length - 1]) / 300) * 100}%`;
			$(".fx-now").textContent = this.gbp(ps[ps.length - 1]);
			const tick = k => {
				const t = new Date(this.timeOf(fx, k));
				return this.range === "7D" ? t.toLocaleDateString("en-GB", { weekday: "short", hour: "2-digit" }) : this.clock(t);
			};
			$(".fx-x").innerHTML = [0, 1, 2, 3].map(i => `<span>${tick(k0 + ((k1 - k0) * i) / 3)}</span>`).join("");
			$(".fx-span").textContent = `High ${this.gbp(max)} · Low ${this.gbp(min)}${logScale ? " · log scale" : ""}`;
		};

		const paint = (force = false) => {
			if (!host.isConnected || host.closest(".hidden")) return clearInterval(this.timer);
			const overlay = document.querySelector("#customOverlay:not(.hidden)");
			if (overlay && !overlay.contains(host)) return;
			$(".fx-clock").textContent = "LIVE " + new Date().toLocaleTimeString("en-GB");
			if (document.hidden && !force) return;
			if (!force && setup.arcology.online() && setup.arcology.hasClearance("guest")) {
				const news = setup.arcologyNews;
				const st = news.state();
				const today = Math.floor(Time.date.timeStamp / news.DAY);
				const crash = st.ev.find(e => e.f === "crash" && e.ph === "liquidity" && e.nx <= today);
				if (crash && st.day >= today && !news.catchUp) {
					news.enter(st, crash, "collapse", today);
					force = true;
					window.updateMoment?.();
				}
			}
			const fx = this.sync();
			if (fx.k === ui.k && !force) return;
			ui.k = fx.k;
			const mid = this.mid(fx);
			const rule = this.rules(fx);
			const r = this.ranges.find(x => x[0] === this.range);
			/* The change line compares with the first point drawn, so it always matches the chart. */
			const pts = this.series(fx, this.range);
			const ch = pts.length > 1 ? (mid / pts[0][1] - 1) * 100 : null;
			const full = pts.length && fx.k - pts[0][0] >= r[2] * r[3] - r[2];
			const since = full ? r[4] : pts.length ? "since " + this.clock(this.timeOf(fx, pts[0][0])) : "";
			/* Headline, quotes and the chart's last point all come from this one snapshot. */
			$(".fx-mid").textContent = this.gbp(mid);
			$(".fx-chg").className = "fx-chg " + (ch === null ? "fx-dim" : ch >= 0 ? "up" : "down");
			$(".fx-chg").textContent =
				ch === null
					? "No history for this range yet"
					: `${ch >= 0 ? "+" : "−"}${this.gbp(Math.abs(mid - pts[0][1]))} (${ch >= 0 ? "+" : "−"}${Math.abs(ch).toFixed(
							Math.abs(ch) >= 100 ? 0 : 2
					  )}%) ${since}`;
			$(".fx-halt").hidden = !rule.label;
			$(".fx-halt").textContent = rule.halted
				? `Trading paused for about ${Math.ceil((fx.halt - fx.k) / 60)} min. You cannot trade at the prices shown yet.`
				: rule.label;
			$(".fx-ask").textContent = rule.halted || rule.sellOnly ? "NO QUOTE" : this.gbp(this.ask(fx));
			$(".fx-bid").textContent = rule.halted ? "NO QUOTE" : this.gbp(this.bid(fx));
			$(".fx-spr").textContent = (this.spread(fx) * 200).toFixed(1) + "%";
			const [label, cls] = this.condition(fx);
			$(".fx-state").textContent = label;
			$(".fx-state").className = "fx-state " + cls;
			const a = V.xchange.arcology;
			$(".fx-money").textContent = this.gbp(V.money, true);
			$(".fx-cipher").textContent = cxs(a.cipher);
			$(".fx-vault").textContent = cxs(setup.arcology.vault());
			$(".fx-worth").textContent = a.cipher > 0 ? this.gbp(this.quote("sell", a.cipher, fx).total, true) : this.gbp(0, true);
			host.querySelectorAll(".fx-ranges button").forEach(b => b.setAttribute("aria-pressed", b.dataset.r === this.range));
			host.querySelectorAll(".fx-tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.side === ui.side));
			chart(fx, pts);
			lists(fx);
			order();
		};

		host.querySelector(".fx-ranges").addEventListener("click", ev => {
			const b = ev.target.closest("button");
			if (!b) return;
			this.range = b.dataset.r;
			paint(true);
		});
		host.querySelector(".fx-tabs").addEventListener("click", ev => {
			const b = ev.target.closest("button");
			if (!b) return;
			ui.side = b.dataset.side;
			$(".fx-msg").textContent = "";
			paint(true);
		});
		host.querySelector(".fx-quick").addEventListener("click", ev => {
			const b = ev.target.closest("button");
			if (!b) return;
			const fx = this.sync();
			const q =
				b.dataset.q !== "max" ? Number(b.dataset.q) : ui.side === "buy" ? this.maxBuy(fx) : Math.min(this.rules(fx).cap, V.xchange.arcology.cipher || 0);
			input.value = (q / 1000).toFixed(3);
			order();
		});
		input.addEventListener("input", order);
		host.querySelector(".fx-order").addEventListener("submit", ev => {
			ev.preventDefault();
			if (ui.busy) return;
			ui.busy = true;
			$(".fx-go").disabled = true;
			const res = this.trade(ui.side, this.parse(input.value), ui.seen);
			const msg = $(".fx-msg");
			if (res.error) msg.textContent = res.error;
			else if (res.requote)
				msg.textContent = `The price moved before your order went through. The new total is ${this.gbp(
					res.requote.total,
					true
				)}. Press the button again to confirm.`;
			else
				msg.textContent = `${res.done.side === "buy" ? "Bought" : "Sold"} ${cxs(res.done.q)} Cipher for ${this.gbp(res.done.total, true)} (average ${this.gbp(
					res.done.unit
				)} each).`;
			paint(true);
			setTimeout(() => {
				ui.busy = false;
				order();
			}, 400);
		});
		jQuery(document)
			.off(":oncloseoverlay.arcologyFx")
			.on(":oncloseoverlay.arcologyFx", () => {
				const hall = document.getElementById("fxHost");
				if (hall && hall !== host) this.mount(hall);
				else if (hall) paint(true);
				else clearInterval(this.timer);
			});
		paint(true);
		this.timer = setInterval(paint, 1000);
	},
};

$(document).on(":passagestart.arcologyFx", () => {
	clearInterval(setup.arcologyFx.timer);
	$(document).off(":oncloseoverlay.arcologyFx");
});

/* A loaded save gets fresh randomness for everything after it, so reloading can't show the market or the news ahead of time.
   Published articles and finished candles are stored, so they stay as they were. */
Save.onLoad.add(save => {
	const seed = (Math.random() * 2147483647) | 0;
	for (const m of save.state.history) {
		const a = m.variables.xchange?.arcology;
		/* Before the exchange existed, saved balances and encounter amounts were whole Cipher.
		   Saves already containing the exchange use thousandths. Mark the conversion so even a
		   pre-arrival save without a market cannot be converted twice. */
		if (a && a.cipherScale !== 1000) {
			if (!a.fx) {
				for (const [record, keys] of [
					[a, ["cipher", "vault"]],
					[a.debt, ["amount"]],
					[a.stack, ["debt"]],
					[a.danger, ["price", "loss"]],
					[a.courier, ["pay"]],
					[a.trouble, ["price", "loss"]],
					[a.citizen, ["loss"]],
					[a.recovery, ["loss"]],
					[m.variables.daily, ["arcologyComputePaid", "arcologyFoundryPaid", "arcologySeawallPaid"]],
				]) {
					for (const key of keys) if (typeof record?.[key] === "number") record[key] *= 1000;
				}
			}
			a.cipherScale = 1000;
		}
		if (a?.fx) a.fx.seed = seed;
		if (a?.news) a.news.seed = seed;
	}
});
