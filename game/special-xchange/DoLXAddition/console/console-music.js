/* Sound effects for Virtual Pet and Outbreak, made with Web Audio (no files). Volume is DoL's Audio switch and
 * Master volume times $consoleSfx. Each sound has a cooldown; the context sleeps when hidden or off the console games. */
(() => {
	const defaults = Object.freeze({ volume: 0.6, mute: false });
	const maxVoices = 5;
	let ctx = null;
	let master = null;
	let voices = 0;
	const lastPlayed = {};
	let timers = [];

	const clamp01 = n => Math.max(0, Math.min(1, Number(n) || 0));

	function settings() {
		const s = V.consoleSfx;
		return {
			volume: s && Number.isFinite(s.volume) ? clamp01(s.volume) : defaults.volume,
			mute: !!(s && s.mute),
		};
	}

	/* What the player hears, 0..1: nothing when DoL's audio is off or this is muted. */
	function level() {
		if (V.options?.audio !== 1) return 0;
		const s = settings();
		if (s.mute) return 0;
		return clamp01((V.options.mastervolume ?? 1) * s.volume);
	}

	function set(key, value) {
		if (!V.consoleSfx || typeof V.consoleSfx !== "object") V.consoleSfx = { ...defaults };
		V.consoleSfx[key] = key === "mute" ? !!value : clamp01(value);
		if (master) master.gain.value = level();
		updateMoment();
	}

	function context() {
		if (ctx) return ctx;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		try {
			ctx = new AC();
			master = ctx.createGain();
			master.gain.value = level();
			master.connect(ctx.destination);
		} catch (e) {
			ctx = null;
		}
		return ctx;
	}

	/* ---- building blocks ---- */
	/* One tone: frequency f (sliding to f2), wave type, length in seconds, peak gain, start offset, optional low-pass. */
	function tone(c, at, { f, f2, type = "sine", dur = 0.15, gain = 0.2, attack = 0.008, lowpass }) {
		const osc = c.createOscillator();
		const amp = c.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(f, at);
		if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), at + dur);
		amp.gain.setValueAtTime(0.0001, at);
		amp.gain.exponentialRampToValueAtTime(gain, at + attack);
		amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		let out = osc;
		if (lowpass) {
			const filter = c.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = lowpass;
			osc.connect(filter);
			out = filter;
		}
		out.connect(amp).connect(master);
		osc.start(at);
		osc.stop(at + dur + 0.05);
		return osc;
	}
	let noiseBuffer = null;
	/* A burst of filtered noise: hiss, rustle, crackle, splash. */
	function noise(c, at, { dur = 0.2, gain = 0.15, filter = "bandpass", freq = 1200, freq2, q = 1 }) {
		if (!noiseBuffer) {
			noiseBuffer = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
			const data = noiseBuffer.getChannelData(0);
			for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		}
		const src = c.createBufferSource();
		src.buffer = noiseBuffer;
		const bq = c.createBiquadFilter();
		bq.type = filter;
		bq.frequency.setValueAtTime(freq, at);
		if (freq2) bq.frequency.exponentialRampToValueAtTime(freq2, at + dur);
		bq.Q.value = q;
		const amp = c.createGain();
		amp.gain.setValueAtTime(0.0001, at);
		amp.gain.exponentialRampToValueAtTime(gain, at + 0.01);
		amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		src.connect(bq).connect(amp).connect(master);
		src.start(at);
		src.stop(at + dur + 0.05);
		return src;
	}
	const notes = (c, at, list, opts) => list.map((f, i) => tone(c, at + i * (opts.step || 0.09), { ...opts, f }));

	/* ---- the sounds ----
	 * Virtual Pet: bright and small, a handheld toy. Outbreak (names start "outbreak-"): low, quiet and uneasy. */
	const sounds = {
		/* Virtual Pet */
		"pet-select": (c, t) => notes(c, t, [660, 990], { type: "triangle", dur: 0.14, gain: 0.16 }),
		"pet-feed": (c, t) => notes(c, t, [300, 360, 300], { type: "triangle", dur: 0.07, gain: 0.14, step: 0.1 }),
		"pet-play": (c, t) => notes(c, t, [523, 659, 784, 659], { type: "square", dur: 0.08, gain: 0.06, step: 0.08, lowpass: 2400 }),
		"pet-clean": (c, t) => noise(c, t, { dur: 0.3, gain: 0.08, filter: "highpass", freq: 2500, freq2: 6000 }),
		"pet-cure": (c, t) => [tone(c, t, { f: 520, f2: 1040, dur: 0.3, gain: 0.12 }), tone(c, t + 0.12, { f: 780, f2: 1170, dur: 0.3, gain: 0.08 })],
		"pet-sleep": (c, t) => tone(c, t, { f: 600, f2: 300, dur: 0.6, gain: 0.1 }),
		"pet-train": (c, t) => notes(c, t, [140, 170], { type: "triangle", dur: 0.12, gain: 0.2, step: 0.14 }),
		"pet-levelup": (c, t) => notes(c, t, [523, 659, 784, 1046], { type: "triangle", dur: 0.16, gain: 0.13, step: 0.08 }),
		"pet-heal": (c, t) => [tone(c, t, { f: 600, f2: 1200, dur: 0.35, gain: 0.1 }), tone(c, t + 0.1, { f: 900, f2: 1350, dur: 0.3, gain: 0.07 })],
		"pet-guard": (c, t) => tone(c, t, { f: 880, type: "triangle", dur: 0.35, gain: 0.1 }),
		"pet-hit-normal": (c, t) => [noise(c, t, { dur: 0.08, gain: 0.18, freq: 900 }), tone(c, t, { f: 160, f2: 80, dur: 0.12, gain: 0.2 })],
		"pet-hit-fire": (c, t) => [
			noise(c, t, { dur: 0.35, gain: 0.16, freq: 2400, freq2: 500, q: 0.8 }),
			tone(c, t, { f: 220, f2: 110, type: "sawtooth", dur: 0.2, gain: 0.05, lowpass: 900 }),
		],
		"pet-hit-water": (c, t) => [
			tone(c, t, { f: 380, f2: 900, dur: 0.09, gain: 0.14 }),
			tone(c, t + 0.1, { f: 460, f2: 1100, dur: 0.09, gain: 0.12 }),
			noise(c, t, { dur: 0.25, gain: 0.06, filter: "lowpass", freq: 1200 }),
		],
		"pet-hit-grass": (c, t) => [
			noise(c, t, { dur: 0.28, gain: 0.1, filter: "highpass", freq: 3000 }),
			tone(c, t + 0.05, { f: 700, f2: 500, type: "triangle", dur: 0.15, gain: 0.08 }),
		],
		"pet-hit-electric": (c, t) => [
			tone(c, t, { f: 1400, f2: 180, type: "square", dur: 0.14, gain: 0.07, lowpass: 3000 }),
			noise(c, t, { dur: 0.1, gain: 0.08, filter: "highpass", freq: 4000 }),
		],
		"pet-hurt": (c, t) => tone(c, t, { f: 240, f2: 110, type: "square", dur: 0.14, gain: 0.07, lowpass: 1400 }),
		"pet-boss-appear": (c, t) => [
			tone(c, t, { f: 55, f2: 46, type: "sawtooth", dur: 1.1, gain: 0.12, attack: 0.3, lowpass: 400 }),
			noise(c, t, { dur: 0.9, gain: 0.05, filter: "lowpass", freq: 300 }),
		],
		"pet-boss-attack": (c, t) => tone(c, t, { f: 95, f2: 55, type: "sawtooth", dur: 0.35, gain: 0.12, attack: 0.05, lowpass: 600 }),
		"pet-victory": (c, t) => notes(c, t, [523, 659, 784, 1046], { type: "triangle", dur: 0.22, gain: 0.13, step: 0.12 }),
		"pet-defeat": (c, t) => notes(c, t, [392, 330, 262], { dur: 0.35, gain: 0.12, step: 0.22 }),
		"pet-evolve": (c, t) => [
			tone(c, t, { f: 300, f2: 1200, dur: 1.2, gain: 0.08, attack: 0.2 }),
			...notes(c, t + 1.2, [523, 784, 1046], { type: "triangle", dur: 0.5, gain: 0.08, step: 0.04 }),
		],
		"pet-challenge": (c, t) => notes(c, t, [784, 988, 1175], { type: "triangle", dur: 0.18, gain: 0.12, step: 0.1 }),

		/* Outbreak */
		"outbreak-open": (c, t) => [tone(c, t, { f: 55, dur: 1.6, gain: 0.12, attack: 0.5 }), tone(c, t, { f: 58.3, dur: 1.6, gain: 0.08, attack: 0.6 })],
		"outbreak-select": (c, t) => [noise(c, t, { dur: 0.04, gain: 0.08, filter: "lowpass", freq: 1500 }), tone(c, t, { f: 220, dur: 0.09, gain: 0.06 })],
		"outbreak-details": (c, t) => noise(c, t, { dur: 0.35, gain: 0.06, freq: 300, freq2: 1200, q: 0.7 }),
		"outbreak-tab": (c, t) => noise(c, t, { dur: 0.05, gain: 0.07, filter: "lowpass", freq: 1000 }),
		"outbreak-evolve": (c, t) => [
			tone(c, t, { f: 130, f2: 62, type: "sawtooth", dur: 0.4, gain: 0.1, lowpass: 500 }),
			noise(c, t, { dur: 0.3, gain: 0.06, filter: "lowpass", freq: 700, freq2: 200 }),
		],
		"outbreak-denied": (c, t) => tone(c, t, { f: 90, type: "square", dur: 0.2, gain: 0.06, lowpass: 400 }),
		"outbreak-dna": (c, t) => tone(c, t, { f: 880, f2: 990, dur: 0.12, gain: 0.05 }),
		"outbreak-advance": (c, t) => [tone(c, t, { f: 62, f2: 48, dur: 0.12, gain: 0.2 }), tone(c, t + 0.18, { f: 58, f2: 44, dur: 0.12, gain: 0.14 })],
		"outbreak-region": (c, t) => [tone(c, t, { f: 220, dur: 0.9, gain: 0.07, attack: 0.15 }), tone(c, t, { f: 233, dur: 0.9, gain: 0.06, attack: 0.2 })],
		"outbreak-event": (c, t) => [
			tone(c, t, { f: 110, dur: 1.2, gain: 0.07, attack: 0.4, type: "triangle" }),
			tone(c, t, { f: 156, dur: 1.2, gain: 0.06, attack: 0.5, type: "triangle" }),
		],
		"outbreak-restriction": (c, t) => notes(c, t, [330, 277, 330, 277], { type: "triangle", dur: 0.22, gain: 0.05, step: 0.24 }),
		"outbreak-cure": (c, t) => tone(c, t, { f: 330, f2: 440, dur: 0.7, gain: 0.07, attack: 0.2 }),
		"outbreak-warning": (c, t) => notes(c, t, [440, 440, 440], { type: "square", dur: 0.12, gain: 0.05, step: 0.22, lowpass: 1200 }),
		"outbreak-victory": (c, t) => [
			tone(c, t, { f: 110, dur: 2, gain: 0.08, attack: 0.4 }),
			tone(c, t, { f: 131, dur: 2, gain: 0.06, attack: 0.5 }),
			tone(c, t, { f: 165, dur: 2, gain: 0.06, attack: 0.6 }),
		],
		"outbreak-defeat": (c, t) => [
			tone(c, t, { f: 220, f2: 98, dur: 1.4, gain: 0.08, attack: 0.1 }),
			noise(c, t, { dur: 1, gain: 0.04, filter: "lowpass", freq: 400, freq2: 120 }),
		],
		"outbreak-challenge": (c, t) => [
			tone(c, t, { f: 196, dur: 0.8, gain: 0.07, attack: 0.1 }),
			tone(c, t + 0.15, { f: 294, dur: 0.8, gain: 0.06, attack: 0.1 }),
		],
	};

	/* Minimum gap per sound in ms; anything not listed uses 120. */
	const cooldownMs = {
		"pet-hurt": 200,
		"outbreak-advance": 250,
		"outbreak-dna": 400,
		"outbreak-select": 80,
		"outbreak-tab": 80,
		"pet-boss-appear": 1500,
		"outbreak-open": 2000,
	};

	/* Plays `name` now. Returns true when it was played (sound on, known, past its cooldown, a voice free). */
	function play(name) {
		if (!sounds[name] || !level() || document.hidden) return false;
		const now = performance.now();
		if (now - (lastPlayed[name] || -1e9) < (cooldownMs[name] ?? 120)) return false;
		if (voices >= maxVoices) return false;
		const c = context();
		if (!c) return false;
		if (c.state === "suspended") c.resume().catch(() => {});
		/* Timed from when the sound starts: creating the audio context can take a while on a busy device. */
		lastPlayed[name] = performance.now();
		voices++;
		setTimeout(() => (voices = Math.max(0, voices - 1)), 600);
		try {
			master.gain.value = level();
			sounds[name](c, c.currentTime + 0.01);
		} catch (e) {
			return false;
		}
		played.push(name);
		if (played.length > 40) played.shift();
		return true;
	}

	/* Plays several sounds in order, gapMs apart (a battle round's summary, a day's top notices). */
	function sequence(names, gapMs = 260) {
		names.filter(Boolean).forEach((name, i) => (i ? timers.push(setTimeout(() => play(name), i * gapMs)) : play(name)));
	}

	function cancel() {
		for (const id of timers) clearTimeout(id);
		timers = [];
	}

	/* The last 40 sounds played, for checking from the browser console. */
	const played = [];

	/* The small volume control shown on the Virtual Pet and Outbreak screens. */
	function controlsHtml() {
		const s = settings();
		const off = V.options?.audio !== 1;
		return (
			`<div class="console-sfx"><label class="console-sfx-row">Sound effects ` +
			`<input type="range" min="0" max="100" step="5" value="${Math.round(
				s.volume * 100
			)}" data-console-sfx="volume" aria-label="Sound effects volume"></label>` +
			`<label class="console-sfx-row"><input type="checkbox" data-console-sfx="mute"${s.mute ? " checked" : ""}> Mute effects</label>` +
			(off ? `<span class="console-sfx-note">DoL's audio is switched off in Options, so nothing plays.</span>` : "") +
			`</div>`
		);
	}

	if (typeof jQuery !== "undefined") {
		jQuery(document).on("change", "[data-console-sfx]", event => {
			const el = event.currentTarget;
			if (el.dataset.consoleSfx === "mute") set("mute", el.checked);
			else {
				set("volume", el.value / 100);
				play("pet-select");
			}
		});
		jQuery(document).on(":passageinit", event => {
			cancel();
			/* Leaving the console games: let the audio hardware sleep. */
			const next = event.passage && event.passage.name;
			if (ctx && ctx.state === "running" && !(setup.consoleMusic && setup.consoleMusic[next])) ctx.suspend().catch(() => {});
		});
	}
	document.addEventListener("visibilitychange", () => {
		if (!ctx) return;
		if (document.hidden) ctx.suspend().catch(() => {});
		else if (level()) ctx.resume().catch(() => {});
	});

	setup.consoleSfx = Object.freeze({
		play,
		sequence,
		cancel,
		set,
		settings,
		level,
		controlsHtml,
		names: () => Object.keys(sounds),
		played,
		state: () => (ctx ? ctx.state : "none"),
	});
})();

/* Home Console minigame music. DoL's <<update-audio>> runs in every passage footer and asks this map which theme a
 * console passage holds, so a game's theme survives its own passage changes and the room's theme comes back on leaving.
 * Themes are DoL's own playlists (see "init-playlist"). */
setup.consoleMusic = Object.freeze({
	"Home Console Plague": "sewers",
	"Plague Map": "sewers",
	"Plague Challenges": "sewers",
	"Home Console Pet": "afterschool",
	"Home Console Do": "afterschool",
	"Home Console Pet Train": "afterschool",
	"Home Console Pet Train Do": "afterschool",
	"Home Console Pet Skill Pick": "afterschool",
	"Home Console Pet Battle": "afterschool",
	"Home Console Pet Battle Result": "afterschool",
	"Home Console Pet Evolve": "afterschool",
	"Home Console Pet Evolve Do": "afterschool",
	"Home Console Pet Adopt": "afterschool",
	"Home Console Pet Challenges": "afterschool",
	"Home Console Dungeon Enter": "afterschool",
	"Home Console Dungeon Walk": "afterschool",
	"Home Console Dungeon Step": "afterschool",
	"Home Console Dungeon Exit": "afterschool",
});
