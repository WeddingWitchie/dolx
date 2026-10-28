/* Rhythm game tutorial: seven short practice rounds on a slow click beat, each teaching one thing by doing it. It runs
 * on the game's own playfield, input and music clock: the beat is a click track made in memory as a WAV file and
 * played through the same audio element as any song. Timing is more forgiving than Easy, nothing is recorded and
 * nothing pays. Finishing or skipping it stops the first-time offer on the song list. */
(() => {
	const R = () => setup.rhythm;
	const U = () => setup.rhythmUI;
	const bpm = 100;
	const beat = 60 / bpm;
	const length = 30; // seconds of practice beat, longer than any round
	const windows = Object.freeze({ perfect: 70, good: 160, miss: 200 });
	const song = Object.freeze({ id: "tutorial", title: "Practice beat", bpm, offset: 0, pageBeats: 4, duration: length, trim: 0 });

	/* Notes from beats: [beat, x, type, holdBeats]. */
	const at = list =>
		list.map(([b, x, type = "tap", hold]) =>
			type === "hold" ? { t: Math.round(b * beat * 1000), x, type, d: Math.round(hold * beat * 1000) } : { t: Math.round(b * beat * 1000), x, type }
		);
	const drag = (from, to, x0, x1) => {
		const out = [];
		const steps = (to - from) * 2;
		for (let k = 0; k <= steps; k++) out.push([from + k / 2, x0 + ((x1 - x0) * k) / steps, "drag"]);
		return out;
	};

	/* Lane centres, so every pattern sits squarely in one lane for keyboard players and the same for touch and mouse. */
	const lane = i => (i + 0.5) / 6;

	/* The line sweeps up during beats 0-4, down 4-8, up 8-12 and so on; a note on beat 4, 8, 12... sits at an edge.
	 * Each step's text is written for the controls the player picked: "touch", "mouse" or "keys". Pairs are always two
	 * different lanes, so two keys (or two fingers) take them; a mouse click takes a whole pair. */
	const steps = Object.freeze([
		{
			title: "The line",
			text: () =>
				"The line sweeps up the field and turns at the top, then sweeps down and turns at the bottom: once every four beats. Every note sits where the line will be on its beat. Watch two sweeps.",
			notes: [],
			endAt: 8 * beat,
		},
		{
			title: "Tap",
			text: (mode, keys) =>
				"A ring shrinks onto each note. When the ring touches the note, the line is on it: " +
				(mode === "keys"
					? `press that note's key then. The field is six lanes, keys ${keys.join(" ")} from left to right, and each note shows its key.`
					: mode === "mouse"
					? "click it then."
					: "tap it then.") +
				" Hit these four.",
			notes: at([
				[5, lane(1)],
				[6, lane(3)],
				[9, lane(2)],
				[10, lane(4)],
			]),
			need: 3,
		},
		{
			title: "At the turns",
			text: () => "Notes at the very top or bottom come as the line turns. They show up just as early as any other note, and their ring works the same way.",
			notes: at([
				[4, lane(2)],
				[8, lane(1)],
				[12, lane(4)],
				[16, lane(3)],
			]),
			need: 3,
		},
		{
			title: "Hold",
			text: mode =>
				"A square note with a bar is a hold. " +
				(mode === "keys"
					? "Press its key when the ring closes and keep the key down"
					: mode === "mouse"
					? "Press the mouse button on it when the ring closes and keep it down"
					: "Press it when the ring closes and keep your finger down") +
				" until the line reaches the end of the bar.",
			notes: at([
				[5, lane(2), "hold", 2],
				[13, lane(3), "hold", 2],
			]),
			need: 1,
		},
		{
			title: "Drag",
			text: (mode, keys) =>
				"Diamonds joined by dots are a drag, and need no tapping. " +
				(mode === "keys"
					? `Hold a key as the line reaches the first diamond. A held key covers its own lane and the lanes either side, so ${keys[1]} or ${keys[2]} covers the first chain; roll from key to key when a chain moves further.`
					: mode === "mouse"
					? "Hold the mouse button down and move along the dots as the line passes them."
					: "Keep a finger down and slide it along the dots as the line passes them."),
			notes: at([...drag(5, 7, lane(1), lane(2)), ...drag(13, 15, lane(4), lane(3))]),
			need: 7,
		},
		{
			title: "Together",
			text: (mode, keys) =>
				"Two notes on the same beat are a pair. " +
				(mode === "keys"
					? `Press both their keys together: ${keys[1]} with ${keys[4]}, then ${keys[2]} with ${keys[3]}, then ${keys[0]} with ${keys[5]}.`
					: mode === "mouse"
					? "A mouse cannot click two places at once, so clicking either note of a pair on the beat hits both."
					: "Tap both at once, one finger each."),
			notes: at([
				[6, lane(1)],
				[6, lane(4)],
				[10, lane(2)],
				[10, lane(3)],
				[14, lane(0)],
				[14, lane(5)],
			]),
			need: 4,
		},
		{
			title: "Perfect, Good, and Miss",
			text: () =>
				"Right on the beat is Perfect, a little off is Good, too far off or not hit at all is a Miss. Every hit adds to your combo and a Miss resets it. The score counts a Perfect in full and a Good as a bit over half: every note Perfect is 1,000,000. Try a short mix.",
			notes: at([
				[5, lane(1)],
				[6, lane(3)],
				[6.5, lane(2), "hold", 1.25],
				...drag(9, 10.5, lane(1), lane(2)),
				[12, lane(3)],
				[13, lane(0)],
				[13, lane(4)],
				[14, lane(2)],
			]),
			need: 0,
		},
	]);

	/* The controls this device most likely uses, as the tutorial's first suggestion. */
	const guessMode = () => (window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? "touch" : "keys");
	const modeName = { touch: "Touch", mouse: "Mouse", keys: "Keyboard" };

	/* A mono 16-bit WAV of the practice beat: a click on every beat, a lower one at each turn of the line. */
	function practiceBeat() {
		const rate = 22050;
		const n = Math.floor(rate * length);
		const data = new Int16Array(n);
		for (let b = 0; b * beat < length; b++) {
			const start = Math.floor(b * beat * rate);
			const turn = b % 4 === 0;
			const freq = turn ? 520 : 880;
			for (let i = 0; i < 1800 && start + i < n; i++)
				data[start + i] = Math.round((turn ? 9000 : 6000) * Math.exp(-i / 260) * Math.sin((i * 2 * Math.PI * freq) / rate));
		}
		const head = new DataView(new ArrayBuffer(44));
		const text = (o, s) => [...s].forEach((ch, i) => head.setUint8(o + i, ch.charCodeAt(0)));
		text(0, "RIFF");
		head.setUint32(4, 36 + n * 2, true);
		text(8, "WAVEfmt ");
		head.setUint32(16, 16, true);
		head.setUint16(20, 1, true);
		head.setUint16(22, 1, true);
		head.setUint32(24, rate, true);
		head.setUint32(28, rate * 2, true);
		head.setUint16(32, 2, true);
		head.setUint16(34, 16, true);
		text(36, "data");
		head.setUint32(40, n * 2, true);
		return new Blob([head.buffer, data.buffer], { type: "audio/wav" });
	}

	function open(ui, index = 0, mode = null) {
		const { h, button, bindInput, keyLabels, fill } = U();
		const audio = ui.audio;
		const s = R().settings();
		ui.silence();
		ui.objectURL = URL.createObjectURL(practiceBeat());
		audio.src = ui.objectURL;
		audio.load();
		const silent = V.options?.audio !== 1;

		const canvas = h("canvas", {
			class: "rh-canvas",
			"aria-label": "Practice field. Hit the notes as the line crosses them, by tap, click, or lane key.",
		});
		const overlay = h("div", { class: "rh-overlay rh-overlay--light", hidden: true });
		const field = h("div", { class: "rh-field", "data-gesture-owner": "rhythm-tutorial" }, canvas, overlay);
		const stepLabel = h("span", { class: "rh-song-sub" });
		const title = h("h3", { class: "rh-head", tabindex: -1 });
		const text = h("p", { class: "rh-tut-text" });
		const tally = h("span", { class: "tama-v" }, " ");
		const judge = h("span", { class: "tama-v rh-judge" }, " ");
		const combo = h("span", { class: "tama-v" }, "0");
		const stat = (k, v) => h("span", { class: "tama-stat" }, h("span", { class: "tama-k" }, k), v);
		const outcome = h("p", { class: "rh-tut-outcome", role: "status" });
		const actions = h("div", { class: "rh-row" });

		let play = null;
		let phase = "ready"; // ready, countdown, playing, done
		let timer = 0;
		let observer = null;
		const input = bindInput(canvas, field, () => (phase === "playing" ? play : null));

		const modeLabel = h("span", { class: "rh-song-sub rh-tut-mode" });
		const finishTutorial = how => R().finishTutorial(how);

		/* First: which controls to teach. Every step's wording and the field's key labels follow the choice. */
		function chooseMode() {
			stop();
			phase = "ready";
			stepLabel.textContent = "Tutorial";
			modeLabel.replaceChildren();
			title.textContent = "How will you play?";
			text.textContent = "Pick your controls and the tutorial teaches those. You can change this at any step, and every control works in real songs.";
			outcome.textContent = "";
			const guess = mode || guessMode();
			actions.replaceChildren(
				...["touch", "mouse", "keys"].map(m =>
					button(
						modeName[m],
						() => {
							mode = m;
							show(index);
						},
						{ class: m === guess ? "rh-btn rh-btn--main" : "rh-btn" }
					)
				)
			);
			actions.querySelector(".rh-btn--main").focus({ preventScroll: true });
		}

		function stop() {
			clearTimeout(timer);
			if (play) play.stop();
			audio.pause();
		}

		function show(i) {
			stop();
			index = i;
			const step = steps[i];
			phase = "ready";
			stepLabel.textContent = `Tutorial, step ${i + 1} of ${steps.length}`;
			modeLabel.replaceChildren(
				`Controls: ${modeName[mode]} `,
				button("Change", () => chooseMode(), { class: "rh-btn rh-btn--small" })
			);
			title.textContent = step.title;
			text.textContent = step.text(mode, keyLabels());
			outcome.textContent = silent ? "DoL's audio is off in Options, so the practice beat is silent. Follow the line instead." : "";
			overlay.hidden = true;
			play = new (R().Play)({
				canvas,
				song,
				notes: step.notes.map(n => ({ ...n })),
				level: "easy",
				win: windows,
				endAt: step.endAt,
				audio,
				offsetMs: s.offset,
				reduced: s.reduced,
				onHud: (st, result) => {
					combo.textContent = String(st.combo);
					const hits = play ? play.stats.perfect + play.stats.good : 0;
					tally.textContent = step.notes.length ? `${hits} of ${step.notes.length}` : " ";
					if (result) {
						judge.textContent = { perfect: "Perfect", good: "Good", miss: "Miss", hold: "Holding" }[result];
						judge.className = `tama-v rh-judge rh-judge--${result}`;
					}
				},
				onEnd: done,
			});
			if (mode === "keys") play.field.lanes = keyLabels();
			play.onHud(play.summary());
			judge.textContent = " ";
			play.still(0);
			fill(
				actions,
				button(step.notes.length ? "Start this round" : "Watch the line", () => run(), { class: "rh-btn rh-btn--main", "data-autofocus": true }),
				i > 0 ? button("Previous step", () => show(i - 1)) : null
			);
			actions.querySelector("button").focus({ preventScroll: true });
			title.focus({ preventScroll: true });
		}

		/* Counts in, then plays the round from the start of the practice beat. */
		function run() {
			stop();
			show(index);
			actions.replaceChildren(button("Stop this round", () => show(index)));
			phase = "countdown";
			audio.currentTime = 0;
			audio.muted = silent;
			audio.volume = Math.max(0, Math.min(1, (V.options?.mastervolume ?? 1) * s.music));
			let n = 3;
			const tick = () => {
				if (!ui.root || phase !== "countdown") return;
				if (n === 0) {
					overlay.hidden = true;
					phase = "playing";
					audio.play().catch(() => {
						if (phase !== "playing" || !canvas.isConnected) return;
						show(index);
						outcome.textContent = "The browser would not play the practice beat. Press Start again.";
					});
					play.start();
					return;
				}
				overlay.replaceChildren(h("span", { class: "rh-overlay-title" }, String(n)));
				overlay.hidden = false;
				n--;
				timer = ui.later(tick, 600);
			};
			tick();
		}

		function done(result) {
			phase = "done";
			audio.pause();
			const step = steps[index];
			const hits = result.perfect + result.good;
			const passed = !step.need || hits >= step.need;
			const last = index === steps.length - 1;
			if (!step.notes.length) outcome.textContent = "That is the whole rhythm of the field: up, turn, down, turn.";
			else if (last)
				outcome.textContent = `${result.perfect} Perfect, ${result.good} Good, ${result.miss} Miss, longest combo ${result.maxCombo}. You are ready for a real song.`;
			else
				outcome.textContent = passed
					? `Well done: ${hits} of ${step.notes.length}.`
					: `${hits} of ${step.notes.length}. Have another go, or move on when you are ready.`;
			actions.replaceChildren(
				last
					? button(
							"Finish the tutorial",
							() => {
								finishTutorial("done");
								ui.menu("play");
							},
							{ class: "rh-btn rh-btn--main" }
					  )
					: button("Next step", () => show(index + 1), { class: passed ? "rh-btn rh-btn--main" : "rh-btn" }),
				button("Try again", () => run(), { class: passed ? "rh-btn" : "rh-btn rh-btn--main" })
			);
			actions.querySelector(".rh-btn--main").focus({ preventScroll: true });
		}

		ui.show(
			h(
				"div",
				{ class: "rh-tutorial" },
				h(
					"div",
					{ class: "rh-game-head" },
					stepLabel,
					modeLabel,
					button("Skip the tutorial", () => {
						finishTutorial("skipped");
						ui.menu("play");
					})
				),
				h("div", { class: "rh-tut-card" }, title, text),
				h("div", { class: "rh-hud" }, stat("Hits", tally), stat("Combo", combo), stat("Last hit", judge)),
				field,
				outcome,
				actions
			),
			{
				keydown: e => {
					if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
					if (e.key === "Escape" && (phase === "playing" || phase === "countdown")) {
						e.preventDefault();
						show(index);
						return;
					}
					input.keydown(e);
				},
				keyup: e => input.keyup(e),
				blur: () => input.releaseAll(),
				visibility: () => document.hidden && (phase === "playing" || phase === "countdown") && show(index),
				destroy: () => {
					phase = "done";
					stop();
					if (observer) observer.disconnect();
					audio.muted = false;
					ui.silence();
				},
			}
		);
		if (window.ResizeObserver) {
			observer = new ResizeObserver(() => {
				if (!play) return;
				play.field.resize();
				if (phase !== "playing") play.still(0);
			});
			observer.observe(field);
		}
		if (mode) show(index);
		else chooseMode();
	}

	setup.rhythmTutorial = Object.freeze({ open, steps });
})();
