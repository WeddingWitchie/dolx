/* globals AmbienceAudio, SimpleAudio */
/* Arcology's synthesized interface and door sounds. They play on real moves only, never on rerenders or save loads,
   and follow Master × Ambience and the game's mute rules. */
window.ArcologySfx = (() => {
	let noiseBuffer = null;
	let bus = null;
	let cues = [];
	let lastLocation = null;
	let lastCipher = null;
	let lastMoment = null;
	let skip = true;
	let carried = null;
	let output = null;

	function context() {
		return AmbienceAudio?.context?.() ?? null;
	}

	/* Same controls as the game's other one-shot effects: Master × Ambience. Presets peak well below 1, so the bus lifts them to sit just under the music. */
	function level() {
		const o = V.options ?? {};
		if (o.audio !== 1 || SimpleAudio.mute() || (document.hidden && o.muteonhide)) return 0;
		return (o.mastervolume ?? 1) * (o.ambience_volume ?? 1) * 2.2;
	}

	/* A gentle compressor on the way out, so overlapping voices never clip. Straight to the speakers, not through the weather filter. */
	function destination(ctx) {
		if (!output || output.context !== ctx) {
			output = ctx.createDynamicsCompressor();
			output.threshold.value = -12;
			output.knee.value = 10;
			output.ratio.value = 6;
			output.attack.value = 0.003;
			output.release.value = 0.2;
			output.connect(ctx.destination);
		}
		return output;
	}

	function noiseSource(ctx) {
		if (!noiseBuffer) {
			noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
			const data = noiseBuffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		}
		const src = ctx.createBufferSource();
		src.buffer = noiseBuffer;
		src.loop = true;
		return src;
	}

	/* Every voice ramps in and out on an exponential envelope, so nothing clicks, and disconnects itself when done. */
	function envelope(ctx, out, start, dur, peak, attack) {
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, start);
		g.gain.exponentialRampToValueAtTime(peak, start + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
		g.connect(out);
		return g;
	}

	function tone(ctx, out, t, { f, to, dur = 0.15, type = "sine", gain = 0.5, attack = 0.008 }) {
		const start = ctx.currentTime + t;
		const osc = ctx.createOscillator();
		osc.type = type;
		osc.frequency.setValueAtTime(f, start);
		if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
		const g = envelope(ctx, out, start, dur, gain, attack);
		osc.connect(g);
		osc.start(start);
		osc.stop(start + dur + 0.05);
		osc.onended = () => {
			osc.disconnect();
			g.disconnect();
		};
	}

	function hiss(ctx, out, t, { f = 1200, to, dur = 0.3, gain = 0.25, type = "bandpass", q = 1, attack = 0.02 }) {
		const start = ctx.currentTime + t;
		const src = noiseSource(ctx);
		const filter = ctx.createBiquadFilter();
		filter.type = type;
		filter.Q.value = q;
		filter.frequency.setValueAtTime(f, start);
		if (to) filter.frequency.exponentialRampToValueAtTime(to, start + dur);
		const g = envelope(ctx, out, start, dur, gain, attack);
		src.connect(filter);
		filter.connect(g);
		src.start(start, Math.random() * 0.5);
		src.stop(start + dur + 0.05);
		src.onended = () => {
			src.disconnect();
			filter.disconnect();
			g.disconnect();
		};
	}

	/* A short burst of filtered noise: a latch, relay or contact. */
	function click(ctx, out, t, { f = 3500, q = 1.2, dur = 0.014, gain = 0.2 } = {}) {
		hiss(ctx, out, t, { f, q, dur, gain, attack: 0.001 });
	}

	/* A low pitch-dropping knock: a bolt or actuator seating. */
	function thump(ctx, out, t, { f = 80, to = 42, dur = 0.12, gain = 0.4 } = {}) {
		tone(ctx, out, t, { f, to, dur, gain, attack: 0.002 });
	}

	/* Two-operator FM. Non-integer ratios give metal and glass, ratio 1 with a small index a soft electronic tone. */
	function fm(ctx, out, t, { f, ratio = 1, index = 1, dur = 0.3, gain = 0.15, attack = 0.005, to }) {
		const start = ctx.currentTime + t;
		const car = ctx.createOscillator();
		const mod = ctx.createOscillator();
		const depth = ctx.createGain();
		car.frequency.setValueAtTime(f, start);
		mod.frequency.setValueAtTime(f * ratio, start);
		if (to) {
			car.frequency.exponentialRampToValueAtTime(to, start + dur);
			mod.frequency.exponentialRampToValueAtTime(to * ratio, start + dur);
		}
		depth.gain.setValueAtTime(f * index, start);
		depth.gain.exponentialRampToValueAtTime(Math.max(1, f * index * 0.1), start + dur);
		mod.connect(depth);
		depth.connect(car.frequency);
		const g = envelope(ctx, out, start, dur, gain, attack);
		car.connect(g);
		[car, mod].forEach(o => {
			o.start(start);
			o.stop(start + dur + 0.05);
		});
		car.onended = () => [car, mod, depth, g].forEach(n => n.disconnect());
	}

	/* A motor or servo: a sawtooth through a resonant low-pass, gliding in pitch. */
	function servo(ctx, out, t, { f, to, dur = 0.6, gain = 0.12, cutoff = 600, q = 4, attack = 0.08 }) {
		const start = ctx.currentTime + t;
		const osc = ctx.createOscillator();
		const filter = ctx.createBiquadFilter();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(f, start);
		if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
		filter.type = "lowpass";
		filter.Q.value = q;
		filter.frequency.setValueAtTime(cutoff, start);
		const g = envelope(ctx, out, start, dur, gain, attack);
		osc.connect(filter);
		filter.connect(g);
		osc.start(start);
		osc.stop(start + dur + 0.05);
		osc.onended = () => [osc, filter, g].forEach(n => n.disconnect());
	}

	/* Irregular clicks across the upper mids: a terminal processing data. */
	function data(ctx, out, t, { dur = 0.2, gain = 0.07, f = 2600 } = {}) {
		for (let d = 0; d < dur; d += 0.012 + Math.random() * 0.025) click(ctx, out, t + d, { f: f * (0.7 + Math.random() * 0.6), q: 6, dur: 0.008, gain });
	}

	/* A small synthesized room tail for the expensive places. Built once per context; voices send a share of themselves into it. */
	let roomNode = null;
	function room(ctx, out, amount) {
		if (!roomNode || roomNode.context !== ctx) {
			const len = Math.floor(ctx.sampleRate * 1.1);
			const ir = ctx.createBuffer(2, len, ctx.sampleRate);
			for (let ch = 0; ch < 2; ch++) {
				const d = ir.getChannelData(ch);
				for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
			}
			roomNode = ctx.createConvolver();
			roomNode.buffer = ir;
		}
		const send = ctx.createGain();
		const verb = ctx.createGain();
		send.gain.value = amount;
		verb.gain.value = 1;
		send.connect(roomNode);
		roomNode.connect(verb);
		verb.connect(out);
		setTimeout(() => {
			send.disconnect();
			roomNode.disconnect(verb);
			verb.disconnect();
		}, 3000);
		return send;
	}

	/* Shared presets. Each plays into `out` at offset t and returns its length in seconds.
	   Island sounds are equipment, never melody: latches, motors, scanners and single low confirmations. */
	const presets = {
		door(ctx, out, t, v = "light") {
			if (v === "heavy") {
				servo(ctx, out, t, { f: 62, to: 44, dur: 0.9, gain: 0.16, cutoff: 280, attack: 0.12 });
				fm(ctx, out, t + 0.05, { f: 150, ratio: 2.76, index: 3, dur: 0.22, gain: 0.08 });
				thump(ctx, out, t + 0.8, { f: 60, to: 32, dur: 0.18, gain: 0.24 });
				click(ctx, out, t + 0.8, { f: 1800, gain: 0.16 });
				return 1.05;
			}
			/* An old metal door dragged open: a grinding scrape that catches as it goes, a loose rattle, then a hard latch. */
			if (v === "rough") {
				for (let d = 0; d < 0.5; d += 0.035 + Math.random() * 0.03)
					hiss(ctx, out, t + d, { f: 260 + Math.random() * 220, dur: 0.05, gain: 0.1, q: 9, attack: 0.004 });
				[0.08, 0.2, 0.27].forEach(d => fm(ctx, out, t + d, { f: 310 + Math.random() * 60, ratio: 3.7, index: 4, dur: 0.09, gain: 0.07 }));
				fm(ctx, out, t + 0.55, { f: 180, ratio: 2.76, index: 5, dur: 0.16, gain: 0.12 });
				thump(ctx, out, t + 0.55, { f: 110, to: 55, dur: 0.1, gain: 0.2 });
				return 0.7;
			}
			if (v === "smooth") {
				const r = room(ctx, out, 0.35);
				click(ctx, out, t, { f: 2200, gain: 0.08 });
				tone(ctx, r, t, { f: 110, to: 92, dur: 0.6, gain: 0.16, attack: 0.08 });
				tone(ctx, out, t, { f: 110, to: 92, dur: 0.6, gain: 0.12, attack: 0.08 });
				hiss(ctx, out, t + 0.05, { f: 350, to: 1100, dur: 0.6, gain: 0.07, type: "lowpass", attack: 0.2 });
				return 0.65;
			}
			/* An electric sliding panel: the lock clicks, the drive motor glides the door aside, and it stops on a soft seal. No air, unlike the bus. */
			click(ctx, out, t, { f: 2200, gain: 0.1 });
			servo(ctx, out, t + 0.03, { f: 180, to: 260, dur: 0.38, gain: 0.07, cutoff: 1400, q: 6, attack: 0.04 });
			servo(ctx, out, t + 0.03, { f: 90, to: 130, dur: 0.38, gain: 0.06, cutoff: 500, q: 2, attack: 0.04 });
			thump(ctx, out, t + 0.4, { f: 120, to: 70, dur: 0.07, gain: 0.14 });
			return 0.48;
		},
		scan(ctx, out, t, v = "clean") {
			const soft = v === "soft" ? 0.85 : 1;
			hiss(ctx, out, t, { f: 500, to: 3000, dur: 0.42, gain: 0.12 * soft, q: 7, attack: 0.05 });
			servo(ctx, out, t, { f: 80, to: 120, dur: 0.42, gain: 0.05 * soft, cutoff: 700, attack: 0.05 });
			data(ctx, out, t + 0.1, { dur: 0.25, gain: 0.05 * soft });
			return 0.45;
		},
		approve(ctx, out, t, v = "clean") {
			if (v === "elegant") {
				const r = room(ctx, out, 0.5);
				fm(ctx, r, t, { f: 523, ratio: 3.01, index: 0.35, dur: 0.9, gain: 0.07, attack: 0.02 });
				fm(ctx, out, t, { f: 523, ratio: 3.01, index: 0.35, dur: 0.9, gain: 0.06, attack: 0.02 });
				tone(ctx, out, t, { f: 131, dur: 0.7, gain: 0.12, attack: 0.03 });
				return 0.8;
			}
			if (v === "exclusive") {
				const r = room(ctx, out, 0.6);
				tone(ctx, out, t, { f: 73, dur: 1.4, gain: 0.22, attack: 0.15 });
				fm(ctx, r, t + 0.1, { f: 146, ratio: 2, index: 0.3, dur: 1.3, gain: 0.08, attack: 0.2 });
				click(ctx, out, t + 0.05, { f: 2400, gain: 0.05 });
				return 1.3;
			}
			if (v === "medical") {
				tone(ctx, out, t, { f: 392, dur: 0.3, gain: 0.1, attack: 0.02 });
				return 0.3;
			}
			if (v === "finance") {
				data(ctx, out, t, { dur: 0.16, gain: 0.06, f: 3200 });
				fm(ctx, out, t + 0.17, { f: 880, ratio: 1.41, index: 2, dur: 0.07, gain: 0.08 });
				tone(ctx, out, t + 0.17, { f: 185, dur: 0.22, gain: 0.1 });
				return 0.4;
			}
			data(ctx, out, t, { dur: 0.12, gain: 0.05 });
			fm(ctx, out, t + 0.12, { f: 262, ratio: 1, index: 0.6, dur: 0.32, gain: 0.14, attack: 0.01 });
			return 0.44;
		},
		/* A magnetic lock refusing: a relay clack, a dull knock as the bolt stays home, and one muted low tone. No buzzer. */
		deny(ctx, out, t) {
			click(ctx, out, t, { f: 900, q: 3, dur: 0.02, gain: 0.18 });
			thump(ctx, out, t, { f: 65, to: 45, dur: 0.14, gain: 0.47 });
			tone(ctx, out, t + 0.01, { f: 146, to: 130, dur: 0.22, gain: 0.25, attack: 0.006 });
			return 0.28;
		},
		/* System start: no noise at all, so it reads as clean, precise hardware. A smooth glide powers up, then settles on one soft tone
		   with a faint glassy overtone and a little room. */
		holo(ctx, out, t) {
			const r = room(ctx, out, 0.3);
			tone(ctx, out, t, { f: 180, to: 440, dur: 0.32, gain: 0.07, attack: 0.12 });
			tone(ctx, out, t, { f: 360, to: 880, dur: 0.32, gain: 0.025, attack: 0.12 });
			tone(ctx, out, t + 0.28, { f: 330, dur: 0.5, gain: 0.11, attack: 0.03 });
			fm(ctx, r, t + 0.28, { f: 660, ratio: 2.01, index: 0.2, dur: 0.6, gain: 0.04, attack: 0.03 });
			return 0.75;
		},
		transaction(ctx, out, t) {
			return presets.approve(ctx, out, t, "finance");
		},
		/* A working machine: a motor hum under a press that cycles, each stroke a knock, a metal clank and a puff of exhaust.
		   Rough machines miss their timing and spark. */
		machine(ctx, out, t, v) {
			const rough = v === "rough";
			servo(ctx, out, t, { f: 55, dur: 1.15, gain: 0.08, cutoff: 260, q: 3, attack: 0.1 });
			let d = 0.08;
			for (let i = 0; i < 4; i++) {
				thump(ctx, out, t + d, { f: 75, to: 38, dur: 0.12, gain: 0.2 });
				fm(ctx, out, t + d, { f: 140, ratio: 2.76, index: 3, dur: 0.12, gain: 0.07 });
				hiss(ctx, out, t + d + 0.08, { f: 700, dur: 0.1, gain: 0.05, q: 1.5, attack: 0.01 });
				d += rough ? 0.18 + Math.random() * 0.14 : 0.24;
			}
			if (rough) [0.3, 0.33, 0.71].forEach(e => click(ctx, out, t + e, { f: 2400, q: 0.8, gain: 0.07 }));
			return 1.15;
		},
		/* The city shuttle: a heavy electric drive, air brakes and pneumatic doors. */
		bus(ctx, out, t, v) {
			if (v === "arrive") {
				servo(ctx, out, t, { f: 150, to: 55, dur: 1.3, gain: 0.14, cutoff: 520, attack: 0.15 });
				hiss(ctx, out, t, { f: 900, to: 300, dur: 1.1, gain: 0.06, type: "lowpass", attack: 0.2 });
				hiss(ctx, out, t + 1.15, { f: 1600, to: 500, dur: 0.4, gain: 0.1, attack: 0.01 });
				fm(ctx, out, t + 1.45, { f: 247, ratio: 1, index: 0.4, dur: 0.3, gain: 0.08, attack: 0.02 });
				return 1.75;
			}
			if (v === "board") {
				hiss(ctx, out, t, { f: 1600, to: 500, dur: 0.4, gain: 0.1, attack: 0.01 });
				thump(ctx, out, t + 0.38, { f: 75, to: 40, dur: 0.14, gain: 0.2 });
				click(ctx, out, t + 0.38, { f: 2000, gain: 0.1 });
				servo(ctx, out, t + 0.6, { f: 50, to: 160, dur: 1.5, gain: 0.09, cutoff: 600, attack: 0.25 });
				hiss(ctx, out, t + 0.6, { f: 300, to: 900, dur: 1.5, gain: 0.05, type: "lowpass", attack: 0.3 });
				return 2.1;
			}
			fm(ctx, out, t, { f: 247, ratio: 1, index: 0.4, dur: 0.25, gain: 0.08, attack: 0.02 });
			hiss(ctx, out, t + 0.25, { f: 1600, to: 500, dur: 0.4, gain: 0.1, attack: 0.01 });
			thump(ctx, out, t + 0.62, { f: 70, to: 40, dur: 0.12, gain: 0.16 });
			return 0.8;
		},
		/* A clinical sweep and readout, ending on one soft tone. */
		medical(ctx, out, t) {
			tone(ctx, out, t, { f: 700, to: 1300, dur: 0.35, gain: 0.04, attack: 0.05 });
			data(ctx, out, t + 0.05, { dur: 0.25, gain: 0.04, f: 3400 });
			tone(ctx, out, t + 0.32, { f: 494, dur: 0.28, gain: 0.08, attack: 0.02 });
			return 0.6;
		},
	};

	/* What entering each place sounds like: up to two shared presets with a variant. Unlisted island buildings get a light door. */
	const entries = {
		arcology_hotel: [
			["door", "smooth"],
			["approve", "elegant"],
		],
		arcology_xstation: [
			["scan", "clean"],
			["approve", "medical"],
		],
		arcology_exchangehall: [["door"], ["approve", "finance"]],
		arcology_bank: [["door"], ["approve", "finance"]],
		arcology_arms: [["door", "heavy"]],
		arcology_clinic: [["door"], ["medical"]],
		arcology_augment: [["door"], ["medical"]],
		arcology_calib: [["door"], ["medical"]],
		arcology_glasshouse: [
			["door", "smooth"],
			["approve", "elegant"],
		],
		arcology_glassdoor: [["scan", "soft"]],
		arcology_stillwater: [
			["door", "smooth"],
			["approve", "exclusive"],
		],
		arcology_registry: [["door"], ["scan", "clean"]],
		arcology_enforcement: [
			["door", "heavy"],
			["scan", "clean"],
		],
		arcology_broadcast: [["door"], ["holo"]],
		arcology_intel: [["holo"]],
		arcology_compute: [["door"], ["machine"]],
		arcology_print: [["door"], ["machine"]],
		arcology_foundry: [
			["door", "heavy"],
			["machine", "rough"],
		],
		arcology_blackmarket: [["door", "rough"]],
		arcology_cutter: [["door", "rough"]],
		arcology_stairwell: [["door", "rough"]],
		arcology_hatch: [["door", "rough"]],
		/* Outdoor arrivals that still have a sound of their own. */
		arcology_underpass: [["machine", "rough"]],
	};
	const priority = ["deny", "transaction", "approve", "scan", "holo"];
	/* Whole scenes that replace the usual entry sound. */
	const scenes = {
		busArrive: [["bus", "arrive"]],
		busDenied: [["bus", "arrive"], ["deny"]],
		busBoard: [
			["scan", "clean"],
			["bus", "board"],
		],
		busAlight: [["bus", "alight"]],
	};

	/* Called from Holo widgets while a passage renders. Only kept if that render turns out to be a real move. */
	function cue(state) {
		if (scenes[state]) {
			cues.push(state);
			return;
		}
		const name = { denied: "deny", ok: "approve", deny: "deny", approve: "approve", scan: "scan", holo: "holo", transaction: "transaction" }[state];
		if (name) cues.push(name);
	}

	function play(parts) {
		const vol = level();
		const ctx = vol > 0 ? context() : null;
		if (!ctx || !parts.length) return;
		const start = () => {
			if (ctx.state !== "running") return;
			/* One sequence at a time: a new one fades out whatever is still sounding. */
			if (bus) {
				const old = bus;
				old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
				setTimeout(() => old.disconnect(), 300);
			}
			bus = ctx.createGain();
			bus.gain.value = vol;
			/* Access denied alone goes straight out, past the compressor, so it can reach full scale at full volume. Its own levels keep it from clipping. */
			bus.connect(parts.length === 1 && parts[0][0] === "deny" ? ctx.destination : destination(ctx));
			let t = 0.02;
			for (const [name, variant] of parts) t += presets[name](ctx, bus, t, variant) * 0.85;
			const done = bus;
			setTimeout(() => {
				if (bus === done) bus = null;
				done.disconnect();
			}, (t + 0.5) * 1000);
			return done;
		};
		/* Never force playback: try once to resume inside the player's own click, otherwise stay silent. */
		if (ctx.state === "suspended") ctx.resume().then(start, () => {});
		else return start();
	}

	function onDisplay() {
		/* A real move activates a new history moment; a rerender keeps the same one. */
		const moment = State.active;
		const location = V.location;
		const cipher = V.xchange?.arcology?.cipher;
		const moved = !skip && moment !== lastMoment;
		if (carried) cues.push(carried);
		carried = null;
		const scene = cues.find(c => scenes[c]);
		if (moved && scene) {
			play(scenes[scene]);
		} else if (moved) {
			const parts = [];
			const arcology = setup.arcology;
			if (location !== lastLocation && arcology?.inCity() && ((V.outside !== 1 && !arcology.isStreet()) || entries[location])) {
				parts.push(...(entries[location] ?? [["door"]]));
			}
			if (Number.isFinite(lastCipher) && Number.isFinite(cipher) && cipher !== lastCipher && arcology?.inCity()) cues.push("transaction");
			const top = priority.find(p => cues.includes(p));
			if (top && !parts.some(p => p[0] === top)) {
				if (parts.length >= 2) parts[1] = [top];
				else parts.push([top]);
			}
			play(parts);
		}
		cues = [];
		skip = false;
		lastMoment = moment;
		lastLocation = location;
		lastCipher = cipher;
	}

	/* Sounds the settings preview can play, each built from the same presets and scenes the island uses. */
	const previews = {
		door: [["door"]],
		authentication: [["approve", "clean"]],
		holo: [["holo"]],
		denied: [["deny"]],
		transaction: [["transaction"]],
		medical: [["scan", "clean"], ["medical"]],
		machinery: [["door", "heavy"], ["machine"]],
		underworld: [["door", "rough"]],
		elite: [
			["door", "smooth"],
			["approve", "elegant"],
		],
		residence: [
			["door", "smooth"],
			["approve", "exclusive"],
		],
		busArrival: scenes.busArrive,
		busDeparture: scenes.busBoard,
		busAlight: scenes.busAlight,
	};

	/* The settings test: plays one preview through the real path and says which step stopped it. */
	async function test(name = "authentication") {
		const o = V.options ?? {};
		if (o.audio !== 1) return "Audio is turned off. Enable it above, then test again.";
		if (SimpleAudio.mute()) return "The game's audio is muted.";
		if (!(o.mastervolume > 0) || !(o.ambience_volume > 0)) return "Master or Ambience is at 0%. These sounds follow both sliders.";
		const ctx = context();
		if (!ctx) return "This browser has no Web Audio support.";
		if (ctx.state === "suspended") await ctx.resume().catch(() => {});
		if (ctx.state !== "running") return `The browser blocked playback (audio is ${ctx.state}). Click anywhere on the page and test again.`;
		/* Listen after the compressor (it adds make-up gain) and on the sequence itself (access denied skips the compressor); report the louder. */
		const taps = [ctx.createAnalyser(), ctx.createAnalyser()];
		destination(ctx).connect(taps[0]);
		play(previews[name] ?? previews.authentication)?.connect(taps[1]);
		const data = new Float32Array(taps[0].fftSize);
		let peak = 0;
		for (let i = 0; i < 90; i++) {
			await new Promise(resolve => setTimeout(resolve, 25));
			for (const tap of taps) {
				tap.getFloatTimeDomainData(data);
				for (const v of data) peak = Math.max(peak, Math.abs(v));
			}
		}
		destination(ctx).disconnect(taps[0]);
		taps[1].disconnect();
		console.debug("Arcology sound test", { state: ctx.state, sampleRate: ctx.sampleRate, level: level(), peak });
		if (peak < 0.001) return "The chime was sent but no signal reached the output. Please report this.";
		return `Played at ${Math.round(peak * 100)}% of full scale. If you heard nothing, check your system or browser tab volume.`;
	}

	$(document).on(":passagestart.arcologySfx", () => (cues = []));
	$(document).on(":passagedisplay.arcologySfx", onDisplay);
	Save.onLoad.add(() => {
		skip = true;
		carried = null;
	});

	/* next(): a scene for the passage a link is about to open. cue() would be cleared when that passage starts. */
	return { cue, next: name => (carried = name), play: (name, variant) => play([[name, variant]]), test, previews: Object.keys(previews) };
})();
