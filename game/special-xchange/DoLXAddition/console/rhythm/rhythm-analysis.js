/* Rhythm game: audio analysis and chart generation. Everything runs locally on decoded samples; nothing is sent anywhere.
 * analyse() estimates tempo, the first beat and how strong each half beat is. generate() turns that into a chart for one
 * difficulty. Both are deterministic: the same song and settings always give the same chart. */
(() => {
	const rate = 11025; // analysis sample rate: enough for beats, cheap to scan
	const hop = 128; // onset frame step, about 11.6 ms
	const minBpm = 70;
	const maxBpm = 190;

	/* Mono, roughly 11 kHz copy of an AudioBuffer (box filter then decimate). */
	function downmix(buffer) {
		const step = buffer.sampleRate / rate;
		const length = Math.floor(buffer.length / step);
		const out = new Float32Array(length);
		const channels = Math.min(2, buffer.numberOfChannels);
		for (let c = 0; c < channels; c++) {
			const data = buffer.getChannelData(c);
			for (let i = 0; i < length; i++) {
				const from = Math.floor(i * step);
				const to = Math.min(data.length, Math.floor((i + 1) * step));
				let sum = 0;
				for (let j = from; j < to; j++) sum += data[j];
				out[i] += sum / Math.max(1, to - from) / channels;
			}
		}
		return out;
	}

	/* Onset strength per frame: rectified rise in log energy, low band (kick, bass) weighted over the full band. */
	function onsets(samples) {
		const frames = Math.floor(samples.length / hop);
		const env = new Float32Array(frames);
		const loud = new Float32Array(frames);
		let low = 0;
		let prevFull = 0;
		let prevLow = 0;
		for (let f = 0; f < frames; f++) {
			let full = 0;
			let lowE = 0;
			for (let i = f * hop, end = i + hop; i < end; i++) {
				const s = samples[i];
				low += 0.08 * (s - low); // one-pole low-pass, about 140 Hz
				full += s * s;
				lowE += low * low;
			}
			const lf = Math.log1p(full * 200);
			const ll = Math.log1p(lowE * 400);
			env[f] = Math.max(0, lf - prevFull) + 1.5 * Math.max(0, ll - prevLow);
			loud[f] = full / hop;
			prevFull = lf;
			prevLow = ll;
		}
		/* Subtract a moving average, so steady loud parts do not count as onsets. */
		const out = new Float32Array(frames);
		const w = 16;
		let acc = 0;
		for (let f = 0; f < frames; f++) {
			acc += env[f] - (f >= 2 * w ? env[f - 2 * w] : 0);
			const mean = acc / Math.min(f + 1, 2 * w);
			const centre = f - w;
			if (centre >= 0) out[centre] = Math.max(0, env[centre] - mean);
		}
		return { env: out, loud };
	}

	const fps = rate / hop;

	/* Sum of the envelope along a beat grid with period `period` frames starting at `phase`. */
	function comb(env, period, phase) {
		let sum = 0;
		let n = 0;
		for (let p = phase; p < env.length - 1; p += period) {
			const i = Math.floor(p);
			const frac = p - i;
			sum += env[i] * (1 - frac) + env[i + 1] * frac;
			n++;
		}
		return n ? sum / n : 0;
	}

	/* Tempo: autocorrelation over the plausible range, nudged toward 120 BPM, then a fine search on the beat comb. */
	function tempo(env) {
		const minLag = Math.floor((60 / maxBpm) * fps);
		const maxLag = Math.ceil((60 / minBpm) * fps);
		const n = Math.min(env.length, Math.floor(fps * 120)); // the first two minutes are plenty
		let best = 0;
		let bestLag = minLag;
		for (let lag = minLag; lag <= maxLag; lag++) {
			let sum = 0;
			for (let i = 0; i + lag < n; i++) sum += env[i] * env[i + lag];
			const bpm = (60 * fps) / lag;
			const weight = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
			/* Half and double lags agreeing make a lag more believable. */
			const score = (sum / (n - lag)) * weight;
			if (score > best) {
				best = score;
				bestLag = lag;
			}
		}
		let bpm = (60 * fps) / bestLag;
		/* Fine search: the grid period that lines up best with the onsets. */
		let bestScore = -1;
		let bestBpm = bpm;
		for (let b = bpm * 0.97; b <= bpm * 1.03; b += 0.02) {
			const period = (60 * fps) / b;
			let top = 0;
			for (let ph = 0; ph < period; ph += 1) top = Math.max(top, comb(env, period, ph));
			if (top > bestScore) {
				bestScore = top;
				bestBpm = b;
			}
		}
		bpm = bestBpm;
		while (bpm < 80) bpm *= 2;
		while (bpm > 180) bpm /= 2;
		return Math.round(bpm * 100) / 100;
	}

	/* The phase (seconds) of the first beat for a given tempo. */
	function phaseOf(env, bpm) {
		const period = (60 * fps) / bpm;
		let best = -1;
		let bestPh = 0;
		for (let ph = 0; ph < period; ph += 0.25) {
			const s = comb(env, period, ph);
			if (s > best) {
				best = s;
				bestPh = ph;
			}
		}
		return bestPh / fps;
	}

	/* Strength 0..9 of every half beat, and loudness 0..9 of every bar (4 beats), as digit strings. */
	function profile(env, loud, bpm, offset, duration) {
		const half = 30 / bpm;
		const slots = [];
		for (let t = offset; t < duration; t += half) {
			const f = Math.round(t * fps);
			let m = 0;
			for (let i = Math.max(0, f - 2); i <= Math.min(env.length - 1, f + 2); i++) m = Math.max(m, env[i]);
			slots.push(m);
		}
		const sorted = slots.filter(v => v > 0).sort((a, b) => a - b);
		const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
		const slotText = slots.map(v => Math.min(9, Math.round((v / ref) * 9))).join("");
		const bar = (240 / bpm) * fps;
		const bars = [];
		for (let start = offset * fps; start < loud.length; start += bar) {
			let sum = 0;
			let n = 0;
			for (let i = Math.floor(start); i < Math.min(loud.length, start + bar); i++, n++) sum += loud[i];
			bars.push(Math.sqrt(sum / Math.max(1, n)));
		}
		const top = Math.max(...bars, 1e-6);
		const energy = bars.map(v => Math.min(9, Math.round((v / top) * 9))).join("");
		return { slots: slotText, energy };
	}

	/* Full analysis of a decoded AudioBuffer. */
	function analyse(buffer) {
		const samples = downmix(buffer);
		const { env, loud } = onsets(samples);
		const duration = buffer.duration;
		const bpm = tempo(env);
		const offset = phaseOf(env, bpm);
		return { bpm, offset: Math.round(offset * 1000), duration: Math.round(duration * 1000) / 1000, ...profile(env, loud, bpm, offset, duration) };
	}

	/* ---- scan line ----
	 * The line sweeps once per page; pages alternate up and down. A page is 2, 4 or 8 beats, whichever keeps one sweep
	 * between 1.6 and 3.4 seconds. */
	function pageBeats(bpm) {
		for (const beats of [4, 8, 2]) {
			const sec = (beats * 60) / bpm;
			if (sec >= 1.6 && sec <= 3.4) return beats;
		}
		return 240 / bpm < 1.6 ? 8 : 2;
	}

	/* Page timing of a song: { start, length } in seconds. Page 0 begins at the beat offset minus whole pages. */
	function pages(song) {
		const length = (song.pageBeats * 60) / song.bpm;
		let start = song.offset / 1000;
		while (start > 0) start -= length;
		return { start, length };
	}

	/* Where the line is at time t: { page, y } with y 0 (top) to 1 (bottom). Even pages sweep up, odd pages down. */
	function lineAt(song, t) {
		const p = pages(song);
		const rel = (t - p.start) / p.length;
		const page = Math.floor(rel);
		const frac = rel - page;
		return { page, y: page % 2 === 0 ? 1 - frac : frac, frac };
	}

	/* ---- chart generation ---- */

	const levels = Object.freeze({
		easy: Object.freeze({ step: 2, gap: 0.5, perSec: 1.0, bias: 1.5, holds: 0.12, drags: 0, doubles: 0 }),
		normal: Object.freeze({ step: 1, gap: 0.24, perSec: 1.9, bias: 0, holds: 0.1, drags: 0.25, doubles: 0 }),
		hard: Object.freeze({ step: 1, gap: 0.15, perSec: 3.0, bias: -1.5, holds: 0.08, drags: 0.35, doubles: 0.2 }),
	});

	function rng(seed) {
		let s = seed >>> 0;
		return () => {
			s = (s + 0x6d2b79f5) >>> 0;
			let t = Math.imul(s ^ (s >>> 15), s | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function hashText(text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return h >>> 0;
	}

	const clampX = x => Math.round(Math.max(0.1, Math.min(0.9, x)) * 1000) / 1000;

	/* A chart for one difficulty: { notes: [{ t, x, type, d? }] }, t and d in ms, x 0..1. The grid is the song's own BPM
	 * and offset (which the player may have corrected); strengths are read from the analysis by time, so a corrected grid
	 * still follows the music without decoding it again. */
	function generate(song, level) {
		const cfg = levels[level];
		const a = song.analysis || {};
		const aHalf = 30 / (a.bpm || song.bpm);
		const aOffset = (a.offset ?? song.offset) / 1000;
		const strengthAt = t => {
			const k = (t - aOffset) / aHalf;
			const i = Math.round(k);
			if (Math.abs(k - i) > 0.3) return Number(a.slots?.[i] ?? 0) * 0.6;
			return Number(a.slots?.[i] ?? 0);
		};
		const energyAt = t => Number(a.energy?.[Math.floor((t - aOffset) / (aHalf * 8))] ?? 5);
		const count = Math.max(0, Math.ceil((song.duration - song.offset / 1000) / (30 / song.bpm))) + 8;
		const slots = Array.from({ length: count }, (_, i) => strengthAt(song.offset / 1000 + (i * 30) / song.bpm));
		const random = rng(hashText(`${song.id}|${level}|${song.bpm}|${song.offset}`));
		const half = 30 / song.bpm;
		const offset = song.offset / 1000;
		const end = song.duration - 1;
		const p = pages(song);
		const notes = [];
		let lastT = -10;
		let lastX = 0.5;
		let dir = 1;
		let busyUntil = 0;
		/* Density budget per bar keeps every stretch under the per-second limit. */
		const barSec = 8 * half;
		for (let i = 0; i < slots.length; i += cfg.step) {
			const t = offset + i * half;
			if (t < 1.5 || t > end) continue;
			if (t < busyUntil + cfg.gap) continue;
			const bar = Math.floor(i / 8);
			const e = energyAt(t);
			const s = Number(slots[i]);
			const onBeat = i % 2 === 0;
			const downbeat = i % 8 === 0;
			/* Louder bars let weaker onsets through; quiet bars keep only the clear ones. */
			let need = 7 + cfg.bias - e * 0.45 - (onBeat ? 1.5 : 0) - (downbeat ? 1 : 0);
			/* Never a whole empty bar while the music is playing: its downbeat always gets a note. */
			if (downbeat && e >= 2 && s >= 1) need = Math.min(need, s);
			if (s < need) continue;
			if (t - lastT < cfg.gap) continue;
			const barStart = offset + bar * barSec;
			const inBar = notes.filter(n => n.t / 1000 >= barStart).length;
			if (inBar >= cfg.perSec * barSec) continue;

			/* x walks across the field, turning at the edges, with a jump now and then on a strong downbeat. */
			let x;
			if (downbeat && s >= 8 && random() < 0.5) x = lastX < 0.5 ? 0.6 + random() * 0.3 : 0.1 + random() * 0.3;
			else {
				const stepX = 0.12 + random() * 0.18;
				if (lastX + dir * stepX > 0.9 || lastX + dir * stepX < 0.1) dir = -dir;
				x = lastX + dir * stepX;
			}
			x = clampX(x);

			/* The page this note is on: holds and drag runs never cross a page turn. */
			const pageEnd = p.start + (Math.floor((t - p.start) / p.length) + 1) * p.length;

			/* Hold: a strong onset followed by quiet half beats. */
			let quiet = 0;
			while (quiet < 6 && Number(slots[i + 1 + quiet] ?? 9) <= 3) quiet++;
			if (quiet >= 3 && s >= 6 && random() < cfg.holds * 4) {
				const d = Math.min(quiet * half, pageEnd - t - 0.12);
				if (d >= 2 * half - 0.01) {
					notes.push({ t: Math.round(t * 1000), x, type: "hold", d: Math.round(d * 1000) });
					busyUntil = t + d;
					lastT = t + d;
					lastX = x;
					continue;
				}
			}

			/* Drag run: several medium onsets in a row become a chain the finger slides along. */
			if (cfg.drags && i % 2 === 0 && random() < cfg.drags) {
				let run = 0;
				while (run < 6 && Number(slots[i + 1 + run] ?? 0) >= 3 && offset + (i + 1 + run) * half < pageEnd - 0.1) run++;
				if (run >= 3) {
					const slide = (random() < 0.5 ? -1 : 1) * (0.05 + random() * 0.04);
					let dx = x;
					for (let k = 0; k <= run; k++) {
						if (dx + slide > 0.9 || dx + slide < 0.1) dx -= slide;
						else dx += k ? slide : 0;
						notes.push({ t: Math.round((t + k * half) * 1000), x: clampX(dx), type: "drag" });
					}
					lastT = t + run * half;
					busyUntil = lastT;
					lastX = dx;
					continue;
				}
			}

			notes.push({ t: Math.round(t * 1000), x, type: "tap" });
			/* Hard: a second tap on the far side on strong downbeats (two thumbs). */
			if (cfg.doubles && downbeat && s >= 8 && random() < cfg.doubles * 4) {
				const x2 = clampX(x < 0.5 ? x + 0.4 + random() * 0.1 : x - 0.4 - random() * 0.1);
				if (Math.abs(x2 - x) >= 0.35) notes.push({ t: Math.round(t * 1000), x: x2, type: "tap" });
			}
			lastT = t;
			lastX = x;
		}
		return { notes: tidy(notes) };
	}

	/* Sorted by time, then x. */
	const tidy = notes => notes.sort((a, b) => a.t - b.t || a.x - b.x);

	setup.rhythmAnalysis = Object.freeze({ analyse, generate, pageBeats, pages, lineAt, levels, tidy, hashText });
})();
