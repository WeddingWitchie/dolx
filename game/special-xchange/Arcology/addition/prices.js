/* Arcology shop prices. Amounts are thousandths of a Cipher, as everywhere on the island.
   Each item has a pound value at Cipher's normal price; its vendor's behaviour turns that into the Cipher price shown.
   A shown price is saved as a quote and charged exactly, or not at all once it has expired. */
setup.arcologyPrice = {
	/* How long a shown price stays valid, in real milliseconds. */
	HOLD: 120000,

	/* kind: "spot" reprices with the live market, "list" keeps a price list and reprices it once Cipher has moved more than
	   15% and `lag` in-game days have passed. cheap: what happens when an old list makes Cipher prices a bargain.
	   crisis: what the vendor does from crisis level 2. temper: how the staff answer a question about the price. */
	vendors: {
		xstation: { who: "clerk", kind: "spot", temper: "helpful" },
		health: { who: "pharmacist", kind: "spot", crisis: "pounds", temper: "curt" },
		lumen: { who: "receptionist", kind: "spot", crisis: "surcharge", temper: "helpful" },
		training: { who: "instructor", kind: "spot", temper: "curt" },
		hotel: { who: "clerk", kind: "list", lag: 1, cheap: "update", temper: "helpful" },
		calibration: { who: "technician", kind: "list", lag: 3, cheap: "honour", temper: "helpful" },
		ballast: { who: "bartender", kind: "list", lag: 2, cheap: "accept", crisis: "refuse", temper: "irritated" },
		halcyon: { who: "bartender", kind: "list", lag: 1, cheap: "update", crisis: "refuse", temper: "irritated" },
		cafe: { who: "kiosk", kind: "list", lag: 2, cheap: "honour", crisis: "refuse" },
		dealer: { who: "dealer", kind: "list", lag: 2, cheap: "hostile", black: true, crisis: "pounds", temper: "irritated", stock: 2 },
	},

	/* [vendor, pence at Cipher's normal price]. Shop prices never go below 1 Cipher: the island is priced for the rich. */
	items: {
		pinkBasic: ["xstation", 9000000],
		blueBasic: ["xstation", 9000000],
		pinkNow: ["xstation", 3750000],
		blueNow: ["xstation", 3750000],
		painkillers: ["health", 2250000],
		treatment: ["lumen", 4500000],
		training: ["training", 6000000],
		night: ["hotel", 45000000],
		calibration: ["calibration", 7500000],
		drinkBallast: ["ballast", 1500000],
		drinkHalcyon: ["halcyon", 2250000],
		coffee: ["cafe", 1500000],
		stim: ["dealer", 4500000],
	},

	/* Pence per thousandth of a Cipher at the normal price. */
	unit() {
		return setup.arcologyFx.ANCHOR / 1000;
	},

	/* Today's day number in game time. */
	day() {
		return Math.floor(Time.date.timeStamp / 86400);
	},

	/* The rate a list vendor's prices were last set at, repriced once Cipher has moved far enough for long enough. */
	listRate(id, v, mid) {
		const lists = (V.xchange.arcology.lists ??= {});
		const l = lists[id];
		const today = this.day();
		if (!l || (today - l.d >= v.lag && Math.abs(mid / l.r - 1) > 0.15)) lists[id] = { r: Math.round(mid), d: today };
		return lists[id].r;
	},

	/* How unsettled the city is, from the market and the crisis it is in: 0 normal, 1 disturbed, 2 severe, 3 prolonged collapse. */
	stress() {
		if (!V.xchange?.arcology?.arrived) return 0;
		const level = setup.arcologyFx.crisis();
		if (level >= 3) return 3;
		if (level === 2) return 2;
		if (level === 1) return 1;
		const fx = setup.arcologyFx.sync();
		const day = setup.arcologyFx.change(fx, 86400);
		return Math.abs(day ?? 0) > 15 || setup.arcologyFx.boost(fx) >= 2.5 ? 1 : 0;
	},

	/* The price as it stands now, without saving a quote. */
	peek(id) {
		const [vid, base] = this.items[id];
		const v = this.vendors[vid];
		const fx = setup.arcologyFx.sync();
		const mid = setup.arcologyFx.mid(fx);
		const level = setup.arcologyFx.crisis();
		const normal = Math.max(1000, Math.ceil(base / this.unit()));
		const out = { id, vendor: vid, v, base, normal, ok: true, cheap: null, mult: 1 };
		if (level >= 2 && v.crisis === "refuse") return Object.assign(out, { ok: false, why: "refuse" });
		if (level >= 2 && v.crisis === "pounds") {
			/* Paid in pounds through money(), so town inflation applies once there. A dealer adds a premium for cash. */
			out.pounds = Math.round(base * (v.black ? 1.3 : 1));
			out.charge = setup.inflation?.price?.(out.pounds) ?? out.pounds;
			out.label = setup.arcologyFx.gbp(out.charge, true);
			return out;
		}
		const rate = v.kind === "list" ? this.listRate(vid, v, mid) : mid;
		if (v.crisis === "surcharge" && level >= 2) out.mult *= 1 + 0.1 * level;
		if (v.black) {
			const swing = Math.abs(setup.arcologyFx.change(fx, 86400) ?? 0) / 100;
			out.mult *= 1.15 + Math.min(0.6, swing + (setup.arcologyFx.boost(fx) - 1) * 0.1);
		}
		out.q = Math.max(1, Math.ceil((base * out.mult) / (rate / 1000)));
		out.worth = (out.q * mid) / 1000;
		if (v.cheap && out.worth < base * 0.6) out.cheap = v.cheap;
		/* Only a list left behind by the exchange rate can show less than 1 Cipher; that is what the seller reacts to. */
		if (!out.cheap) out.q = Math.max(1000, out.q);
		out.worth = (out.q * mid) / 1000;
		out.label = setup.arcology.cx(out.q);
		out.high = !out.cheap && out.q >= Math.ceil(normal * 1.3) && out.q > normal + 1;
		/* A clerk who notices an old list reprices at the market before taking payment. */
		if (out.cheap === "update") {
			out.q = Math.max(1000, Math.ceil((base * out.mult) / (mid / 1000)));
			out.label = setup.arcology.cx(out.q);
			out.corrected = true;
		}
		return out;
	},

	/* The price shown on a link. Saved so the click charges this amount, for HOLD milliseconds. */
	quote(id) {
		const p = this.peek(id);
		const pq = (V.xchange.arcology.pq ??= {});
		if (p.ok) pq[id] = { q: p.q, p: p.pounds, charge: p.charge, exp: Date.now() + this.HOLD };
		else delete pq[id];
		return p;
	},

	/* Whether the player can cover the quote. */
	affordable(p) {
		if (!p.ok) return false;
		if (p.pounds) return V.money >= p.charge;
		return (V.xchange.arcology.cipher ?? 0) >= p.q;
	},

	/* Charges a saved quote once. False, and nothing charged, when the quote is missing, expired or unaffordable. */
	pay(id) {
		const a = V.xchange.arcology;
		const h = a.pq?.[id];
		if (h) delete a.pq[id];
		if (!h || Date.now() > h.exp) {
			this.notice = "That price is no longer valid. You haven't been charged. Check the price again.";
			return false;
		}
		if (h.p) {
			if (h.charge !== (setup.inflation?.price?.(h.p) ?? h.p)) {
				this.notice = "That price is no longer valid. You haven't been charged. Check the price again.";
				return false;
			}
			if (V.money < h.charge) return false;
			statChange.money(-h.p, "arcologyShop", { cashOnly: true });
			return true;
		}
		if ((a.cipher ?? 0) < h.q) return false;
		a.cipher -= h.q;
		return true;
	},

	/* `units` is whole Cipher at its normal value; the returned demand is in wallet thousandths at today's rate. */
	demand(units) {
		const mid = setup.arcologyFx.mid(setup.arcologyFx.sync());
		return Math.max(1, Math.ceil((units * setup.arcologyFx.ANCHOR) / (mid / 1000)));
	},

	/* An item's price at the live market with the vendor's premium, ignoring any old list. */
	fair(id) {
		const p = this.peek(id);
		const mid = setup.arcologyFx.mid(setup.arcologyFx.sync());
		return Math.max(1000, Math.ceil((p.base * p.mult) / (mid / 1000)));
	},

	/* Bargain stock: how many more a vendor will sell today at an old price. */
	stockLeft(vid) {
		const v = this.vendors[vid];
		return (v.stock ?? 99) - (V.daily.arcologyBargain?.[vid] ?? 0);
	},

	noteBargain(vid) {
		(V.daily.arcologyBargain ??= {})[vid] = (V.daily.arcologyBargain[vid] ?? 0) + 1;
	},

	/* Why a price is unusual, from conditions that really hold. */
	cause(p) {
		const fx = setup.arcologyFx.sync();
		const level = setup.arcologyFx.crisis();
		const week = setup.arcologyFx.change(fx, 604800) ?? 0;
		const story = setup.arcologyNews.state().ev.find(e => ["market", "crash"].includes(e.f));
		if (p.pounds) return "pounds";
		if (p.cheap) return "old";
		if (level >= 2 && p.v.crisis === "surcharge") return "surcharge";
		if (level >= 1) return "crisis";
		if (story && week < -10) return "news";
		if (p.v.black) return "risk";
		if (setup.arcologyFx.mid(fx) < setup.arcologyFx.ANCHOR * 0.85) return "weak";
		return "list";
	},

	/* What the staff do and say when asked about the price: [action, line], picked by vendor and by the real cause.
	   The narration around it adds nothing the speaker has already said. */
	explainLines: {
		weak: {
			health: [
				[
					"looks at the price on the register.",
					"Cipher is worth less now, but our supplier still wants the same amount in pounds. That's why you have to pay more Cipher.",
				],
			],
			xstation: [
				[
					"turns the counter screen towards you so you can see the price.",
					"Head office sets the prices in pounds. Cipher is worth less now, so the machine asks for more Cipher. The price can change during the day.",
				],
			],
			lumen: [
				[
					"checks the treatment price on the screen before answering.",
					"Treatment still costs the same in pounds. Cipher is worth less right now, so you need more of it to pay.",
				],
			],
			training: [
				["taps the session list with a finger.", "Cipher's worth less now. Training still costs the same in pounds, so you'll need more Cipher. Got it?"],
			],
			hotel: [
				[
					"shows you the price on the booking screen.",
					"We check our prices every morning. Cipher had lost value when we last checked, so a room costs more Cipher now.",
				],
			],
			calibration: [
				[
					"taps the price list beside the booth.",
					"We updated that list after Cipher lost value. We still have to pay for parts and electricity, so the price went up.",
				],
			],
			ballast: [["keeps drying a glass with a cloth.", "Cipher's worth less, so I've put my prices up. You buying something or not?"]],
			halcyon: [["points to the drink prices on the screen behind the bar.", "Haven't you seen the news? Cipher's worth less now, so drinks cost more of it."]],
			dealer: [["leans back in the chair and looks at you.", "Cipher's worth less now. I'm not losing money just so you can pay the old price."]],
			cafe: [["shows the current price on its screen.", "Cipher has lost value. Prices in Cipher may be higher than before."]],
		},
		news: {
			health: [
				[
					"glances at the Dome Broadcast screen near the door.",
					"The news says people have been selling a lot of Cipher. It's worth less now, so our deliveries cost more of it.",
				],
			],
			xstation: [
				[
					"looks at the queue behind you before answering.",
					"More people have been selling Cipher, so it's worth less now. That's why our prices in Cipher have gone up. Dome Broadcast has been reporting on it.",
				],
			],
			training: [["puts down the session list.", "Read the news. People have been selling Cipher, so training costs more of it now."]],
			halcyon: [
				["sets the glass down on the bar.", "Haven't you seen the news? People are selling Cipher and it's losing value. I'm not charging the old price."],
			],
			ballast: [["points at the drink prices.", "Read the news. People keep selling Cipher, so I've had to put the prices up."]],
			cafe: [["shows the price on its screen.", "More people are selling Cipher, so it is worth less now. Check the price shown before you pay."]],
			any: [["checks the price shown on the screen.", "People have been selling Cipher and it's worth less now. That's why the price has gone up."]],
		},
		crisis: {
			health: [
				[
					"checks the register again before answering.",
					"Since the crash, Cipher's value keeps changing. I can tell you the price now, but I can't promise it'll stay the same.",
				],
			],
			xstation: [
				[
					"checks the price on the screen.",
					"Head office changes the prices every hour right now. I can't change them myself. It might be cheaper later, if you want to come back.",
				],
			],
			lumen: [
				[
					"reads the notice beside the desk.",
					"I'm sorry, but the price in Cipher can change during the day. Please check the amount on the screen before you pay.",
				],
			],
			training: [["looks up from the session list.", "Cipher's crashed. Check the price before you book a session."]],
			hotel: [["brings up today's room price on the screen.", "I'm sorry. We check our prices every morning, and this is today's rate. I can't change it."]],
			dealer: [["looks at the price and gives a short laugh.", "Cipher keeps falling in value. If you're paying with it, you're going to need a lot more."]],
			cafe: [["shows the current price on its screen.", "Cipher's value keeps changing. Check the price shown before you pay."]],
			any: [["checks the current price on the screen.", "Cipher's lost a lot of value. That's why the price is higher now."]],
		},
		surcharge: {
			lumen: [
				[
					"points to a notice beside the desk.",
					"There's an extra charge for treatment during the currency crisis. The clinic says it needs to cover payments that might fail.",
				],
			],
		},
		pounds: {
			health: [
				[
					"shows you the handwritten sign on the counter.",
					"Sorry, we're only taking pounds for now. Our supplier won't accept Cipher until its value stops changing so much.",
				],
			],
			dealer: [["puts one hand over the goods on the table.", "Pounds only. And it'll cost you extra. Everyone wants pounds right now."]],
			any: [["points to a sign beside the register.", "We're taking pounds only until Cipher's value settles down."]],
		},
		risk: {
			dealer: [
				["taps the price with a metal finger.", "If Cipher loses more value before I can spend it, I lose money. So I'm charging extra."],
				["slides the goods a little farther away.", "You want a receipt and a fixed price? Go to a proper shop. See if anyone there will sell you this."],
			],
		},
		old: {
			hotel: [
				[
					"checks the desk screen and changes the printed price card.",
					"Sorry, that card hasn't been updated. The price on the screen is what you'll pay tonight.",
				],
			],
			halcyon: [["taps the amount on the bill screen.", "That's an old price. Cipher's worth less now, so I'm charging the current price."]],
			calibration: [["points to the price list beside the booth.", "Yeah, Cipher's value has changed. I'm still charging you the price on that list."]],
			ballast: [["looks at the old price list and shrugs.", "Yeah, it's an old price. I'll still sell it to you for that."]],
			cafe: [["shows the listed price on the screen.", "The price on the menu is still valid. You can pay that amount."]],
			dealer: [["moves the goods away from you.", "You think I'm selling at that price? Try asking again."]],
			any: [["checks the price list.", "That's an old price. Check with the seller before paying."]],
		},
		list: {
			cafe: [["shows the price on the screen.", "The price on the menu is what you pay."]],
			any: [["points at the price list.", "That's the price on the list. Everyone pays the same."]],
		},
	},

	explain(p) {
		const why = this.cause(p);
		const set = this.explainLines[why] ?? this.explainLines.list;
		const options = set[p.vendor] ?? set.any ?? Object.values(set)[0];
		const [action, line] = options[Math.floor(setup.arcologyNews.seed(p.id + this.day()) * options.length)];
		/* Pounds are paid at town prices, which the player may not expect on the island. */
		const town = p.pounds && setup.inflation?.multiplier?.() > 1.05;
		return { why, action, line, town };
	},
};

/* An expired quote disables the links it priced and offers a fresh look; a refused payment explains itself once. */
$(document).on(":passagestart.arcologyPrice", () => clearTimeout(setup.arcologyPrice.timer));
$(document).on(":passagedisplay.arcologyPrice", () => {
	const P = setup.arcologyPrice;
	if (P.notice) {
		$("<div class='arc-price-notice' role='status'></div>").text(P.notice).prependTo(".passage");
		delete P.notice;
	}
	const priced = $(".passage .arc-priced");
	if (!priced.length) return;
	P.timer = setTimeout(() => {
		priced.addClass("expired").find("a").attr({ "aria-disabled": "true", tabindex: "-1" });
		const box = $("<div class='arc-price-notice' role='status'>That price is no longer valid. </div>");
		box.wiki('<<link "Check the prices again" `passage()`>><</link>>');
		box.insertBefore(priced.first());
	}, P.HOLD);
});
