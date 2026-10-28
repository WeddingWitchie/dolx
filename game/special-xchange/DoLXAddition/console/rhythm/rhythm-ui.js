/* globals formatMoney saveAs */
/* Rhythm game screens: song select, the game itself, results, the Rhythm Library, playlists, settings and records.
 * Everything is built inside the passage's #rhythm element and torn down on the next passage change (or when the player
 * leaves through the game's own link), so no listener, audio, timer or object URL outlives the passage. */
(() => {
	const R = () => setup.rhythm;
	const L = () => setup.rhythmLibrary;
	const levels = ["easy", "normal", "hard"];
	const levelName = l => l[0].toUpperCase() + l.slice(1);
	const warning = "Automatically generated charts may not perfectly match your music. Some songs may require manual BPM or timing adjustments.";

	/* Small element builder: h("div", { class, text, onclick, ...attributes }, ...children). */
	function h(tag, props, ...kids) {
		const el = document.createElement(tag);
		for (const [k, v] of Object.entries(props || {})) {
			if (v === undefined || v === null || v === false) continue;
			if (k === "class") el.className = v;
			else if (k === "text") el.textContent = v;
			else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
			else el.setAttribute(k, v === true ? "" : String(v));
		}
		for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
		return el;
	}
	const button = (label, onclick, props = {}) => h("button", { type: "button", class: "rh-btn", onclick, ...props }, label);
	const time = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
	const chip = level => h("span", { class: `con-diff ${{ easy: "green", normal: "gold", hard: "red" }[level]}` }, levelName(level));

	/* Appends only real children: append() and replaceChildren() print null or false as text and an array as
	 * "[object HTMLElement],...". `fill` replaces an element's children the same way. */
	const put = (el, ...kids) => el.append(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));
	const fill = (el, ...kids) => {
		el.replaceChildren();
		put(el, ...kids);
	};

	let current = null;

	/* What a key is called on this keyboard: the layout's own character where the browser can tell (so an AZERTY
	 * player sees Q where the physical key is), else a readable name for the code. */
	let layoutMap = null;
	if (navigator.keyboard && typeof navigator.keyboard.getLayoutMap === "function") {
		navigator.keyboard
			.getLayoutMap()
			.then(map => (layoutMap = map))
			.catch(() => {});
	}
	const codeNames = {
		Semicolon: ";",
		Quote: "'",
		Comma: ",",
		Period: ".",
		Slash: "/",
		BracketLeft: "[",
		BracketRight: "]",
		Backslash: "\\",
		Minus: "-",
		Equal: "=",
		Backquote: "`",
		ArrowLeft: "←",
		ArrowRight: "→",
		ArrowUp: "↑",
		ArrowDown: "↓",
	};
	function keyLabel(code) {
		const mapped = layoutMap && layoutMap.get(code);
		if (mapped && mapped.trim()) return mapped.toUpperCase();
		if (codeNames[code]) return codeNames[code];
		return code.replace(/^Key/, "").replace(/^Numpad/, "Num ");
	}
	const keyLabels = () => R().settings().keys.map(keyLabel);

	/* Pointer and lane-key input for a playfield. `getPlay()` returns the Play to send presses to, or null while not
	 * playing. Pointer capture keeps each finger's moves and release on the canvas, and every finger is tracked on its
	 * own. Each lane key is its own input too, so two keys pressed together hit a pair. `onLane` is told when a lane key
	 * is first used, so the field can show its key labels. Shared by the game and the tutorial. */
	function bindInput(canvas, field, getPlay, onLane) {
		const held = new Map(); // code -> input id
		const down = e => {
			const play = getPlay();
			if (!play) return;
			e.preventDefault();
			try {
				canvas.setPointerCapture(e.pointerId);
			} catch (err) {}
			const q = play.field.toField(e.clientX, e.clientY);
			play.pointers.set(e.pointerId, q);
			play.press(e.pointerId, { sx: q.sx, sy: q.sy, mouse: e.pointerType === "mouse" });
		};
		const move = e => {
			const play = getPlay();
			if (!play || !play.pointers.has(e.pointerId)) return;
			play.pointers.set(e.pointerId, play.field.toField(e.clientX, e.clientY));
		};
		const up = e => {
			const play = getPlay();
			if (!play || !play.pointers.has(e.pointerId)) return;
			play.pointers.delete(e.pointerId);
			play.release(e.pointerId);
		};
		for (const [type, fn] of [
			["pointerdown", down],
			["pointermove", move],
			["pointerup", up],
			["pointercancel", up],
			["lostpointercapture", up],
		])
			canvas.addEventListener(type, fn);
		/* The long-press menu and text selection never belong to a playfield. */
		field.addEventListener("contextmenu", e => e.preventDefault());
		const releaseAll = () => {
			const play = getPlay();
			if (play) {
				for (const id of play.pointers.keys()) play.release(id);
				play.pointers.clear();
			}
			for (const id of held.values()) {
				if (play) {
					play.keysDown.delete(id);
					play.release(id);
				}
			}
			held.clear();
		};
		return {
			keydown(e) {
				const play = getPlay();
				if (!play || e.ctrlKey || e.metaKey || e.altKey) return;
				const lane = R().settings().keys.indexOf(e.code);
				if (lane < 0) return;
				e.preventDefault();
				/* Auto-repeat and a key already down are not new presses. */
				if (e.repeat || held.has(e.code)) return;
				const id = `key-${e.code}`;
				held.set(e.code, id);
				play.keysDown.set(id, lane);
				if (onLane) onLane();
				play.press(id, { lane });
			},
			keyup(e) {
				const id = held.get(e.code);
				if (!id) return;
				held.delete(e.code);
				const play = getPlay();
				if (play) {
					play.keysDown.delete(id);
					play.release(id);
				}
			},
			/* The window lost focus: its key releases will never arrive, so every key is let go now. */
			releaseAll,
		};
	}

	/* Should the field show lane keys from the start? "auto" shows them where a keyboard and mouse are the main input. */
	function lanesAtStart() {
		const mode = R().settings().laneLabels;
		if (mode !== "auto") return mode === "always";
		return !!window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(any-pointer: coarse)").matches;
	}

	/* A chart's level number, from how busy it is: notes per second, weighted for holds and drags. */
	function chartLevel(song, level) {
		const notes = L().chartFor(song, level).notes;
		const span = Math.max(30, song.duration);
		const weight = notes.reduce((sum, n) => sum + (n.type === "drag" ? 0.4 : n.type === "hold" ? 1.3 : 1), 0);
		return Math.max(1, Math.min(15, Math.round(1 + (weight / span) * 3.4 + (level === "hard" ? 1 : 0))));
	}

	/* A song's look, from a hash of its id (so a song the player adds gets its own as surely as a built-in one) and its
	 * analysis: two colours a set step apart on the colour wheel, one of five background patterns, one of four waveform
	 * styles, where the glow sits, and how strong the colour is from how loud the song runs. */
	function identity(song) {
		const n = setup.rhythmAnalysis.hashText(String(song.id));
		const hue = n % 360;
		const energy = song.analysis?.energy || "";
		const avg = energy.length ? [...energy].reduce((sum, c) => sum + Number(c), 0) / energy.length : 5;
		return {
			hue,
			hue2: (hue + [40, 180, 120, 150, 320][(n >>> 9) % 5]) % 360,
			sat: Math.round(45 + avg * 5),
			pattern: (n >>> 12) % 5,
			wave: (n >>> 15) % 4,
			gx: 15 + ((n >>> 18) % 70),
			gy: 20 + ((n >>> 25) % 60),
		};
	}

	const svgNs = "http://www.w3.org/2000/svg";
	/* An SVG element with attributes, added to `parent` when there is one. */
	function svgEl(parent, tag, attrs) {
		const el = document.createElementNS(svgNs, tag);
		for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
		if (parent) parent.append(el);
		return el;
	}

	/* The cover combines the song's colours, pattern and loudness. The selected cover carries a scan line;
	 * reduced motion stops it. `small` is the song list's size. */
	function cover(song, { big = false, small = false } = {}) {
		const look = identity(song);
		const { gx, gy } = look;
		const pattern = svgEl(null, "svg", { viewBox: "0 0 100 100", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", class: "rh-pattern" });
		if (look.pattern === 0) {
			for (let i = 0; i < 16; i++) {
				const angle = (i / 16) * Math.PI * 2 + gx / 100;
				svgEl(pattern, "line", { x1: gx, y1: gy, x2: (gx + Math.cos(angle) * 150).toFixed(1), y2: (gy + Math.sin(angle) * 150).toFixed(1) });
			}
		} else if (look.pattern === 1) {
			for (let r = 8; r < 140; r += 9) svgEl(pattern, "circle", { cx: gx, cy: gy, r });
		} else if (look.pattern === 2) {
			const step = small ? 20 : 10;
			for (let x = step / 2; x < 100; x += step)
				for (let y = step / 2; y < 100; y += step) svgEl(pattern, "circle", { cx: x, cy: y, r: small ? 1.6 : 0.9, class: "rh-pattern-dot" });
		} else if (look.pattern === 3) {
			for (let k = -100; k < 100; k += 7) svgEl(pattern, "line", { x1: k, y1: 100, x2: k + 100, y2: 0 });
		} else {
			for (let i = 0; i < 4; i++)
				svgEl(pattern, "ellipse", { cx: gx, cy: gy, rx: 20 + i * 18, ry: 8 + i * 7, transform: `rotate(${(gx * 3 + i * 25) % 180} ${gx} ${gy})` });
		}

		const energy = song.analysis?.energy || "";
		const bars = big ? 48 : 12;
		const wave = svgEl(null, "svg", {
			viewBox: `0 0 ${bars} 20`,
			preserveAspectRatio: "none",
			"aria-hidden": "true",
			class: `rh-wave rh-wave--${["bars", "mirror", "line", "dots"][look.wave]}`,
		});
		const level = i => (energy.length ? Number(energy[Math.floor((Math.min(i, bars - 1) / bars) * energy.length)]) || 0 : 4);
		if (look.wave === 2) {
			let d = "M0 20";
			for (let i = 0; i <= bars; i++) d += ` L${i} ${(18 - (level(i) / 9) * 16).toFixed(2)}`;
			svgEl(wave, "path", { d: `${d} L${bars} 20 Z` });
		} else {
			for (let i = 0; i < bars; i++) {
				const height = 2 + (level(i) / 9) * 16;
				if (look.wave === 1) svgEl(wave, "rect", { x: i + 0.2, y: (10 - height / 2).toFixed(2), width: 0.6, height: height.toFixed(2) });
				else if (look.wave === 3)
					for (let y = 19; y > 20 - height; y -= 2.4) svgEl(wave, "rect", { x: i + 0.25, y: (y - 1.2).toFixed(2), width: 0.5, height: 1.2 });
				else svgEl(wave, "rect", { x: i + 0.15, y: (20 - height).toFixed(2), width: 0.7, height: height.toFixed(2) });
			}
		}

		const art = h(
			"div",
			{
				class: `rh-cover${big ? " rh-cover--big" : ""}${small ? " rh-cover--small" : ""}`,
				style: `--hue: ${look.hue}; --hue2: ${look.hue2}; --sat: ${look.sat}%; --gx: ${gx}%; --gy: ${gy}%; --sweep: ${(
					(240 / song.bpm) *
					(big ? 1 : 2)
				).toFixed(2)}s`,
			},
			pattern,
			wave
		);
		if (big) art.append(h("span", { class: "rh-cover-line", "aria-hidden": "true" }));
		return art;
	}

	/* The stage panel takes the selected song's colours. */
	function lookStyle(song) {
		const look = identity(song);
		return `--hue: ${look.hue}; --hue2: ${look.hue2}; --sat: ${look.sat}%`;
	}

	/* How long a menu preview plays before it fades and starts over, in seconds. */
	const previewLength = 24;

	const levelColour = { easy: "rh-lv--easy", normal: "rh-lv--normal", hard: "rh-lv--hard" };
	const pad7 = n => String(Math.max(0, Math.round(n))).padStart(7, "0");

	class RhythmUI {
		constructor(root) {
			this.root = root;
			this.screenVersion = 0;
			if (window.PocketMusic?.active) window.PocketMusic.stop(false);
			this.audio = new Audio();
			this.audio.preload = "auto";
			this.objectURL = null;
			this.timers = new Set();
			this.listeners = [];
			this.cleanup = null; // the open screen's own teardown
			this.tab = "play";
			this.source = "builtin";
			this.selected = null;
			this.queue = null; // a playlist being played: { ids, index }
			this.busy = false;
			this.previewId = null; // the song the menu is previewing (or waiting for a tap to preview)
			this.previewToken = 0; // bumped on every change, so an older preview's timers and fades stand down
			this.previewRetry = null;
			this.previewHidden = false;
			root.textContent = "";
			this.body = h("div", { class: "rh-body" });
			this.status = h("div", { class: "rh-sr", "aria-live": "polite" });
			root.append(this.body, this.status);
			this.listen(document, "visibilitychange", () => {
				this.cleanup?.visibility?.();
				this.previewVisibility();
			});
			/* A preview the browser would not start before the player touched the page starts on their next tap or key. */
			for (const type of ["click", "keydown", "touchend"])
				this.listen(
					root,
					type,
					() => {
						const retry = this.previewRetry;
						this.previewRetry = null;
						if (retry) retry();
					},
					true
				);
			this.listen(document, "keydown", e => this.cleanup?.keydown?.(e));
			this.listen(document, "keyup", e => this.cleanup?.keyup?.(e));
			/* Key releases never arrive while the window is in the background. */
			this.listen(window, "blur", () => this.cleanup?.blur?.());
			this.menu();
		}

		listen(target, type, fn, opts) {
			target.addEventListener(type, fn, opts);
			this.listeners.push([target, type, fn, opts]);
		}

		later(fn, ms) {
			const id = setTimeout(() => {
				this.timers.delete(id);
				if (this.root) fn();
			}, ms);
			this.timers.add(id);
			return id;
		}

		say(text) {
			this.status.textContent = text;
		}

		/* Replaces the screen, running the old one's teardown first. */
		show(el, cleanup = null) {
			if (!this.root) return;
			this.screenVersion++;
			if (this.cleanup?.destroy) this.cleanup.destroy();
			/* "Fewer effects" also stills the menus' scan lines. */
			this.root.classList.toggle("rh-calm", R().settings().reduced);
			this.cleanup = cleanup;
			this.body.replaceChildren(el);
			const focus = el.querySelector("[data-autofocus]") || el.querySelector("h3");
			if (focus) {
				if (!focus.hasAttribute("tabindex") && focus.tagName === "H3") focus.setAttribute("tabindex", "-1");
				focus.focus({ preventScroll: true });
			}
		}

		/* Stops the music and frees its source. */
		silence() {
			this.stopPreview();
			this.audio.pause();
			this.audio.removeAttribute("src");
			this.audio.load();
			if (this.objectURL) URL.revokeObjectURL(this.objectURL);
			this.objectURL = null;
		}

		destroy() {
			if (this.cleanup?.destroy) this.cleanup.destroy();
			this.cleanup = null;
			for (const id of this.timers) clearTimeout(id);
			this.timers.clear();
			for (const [target, type, fn, opts] of this.listeners) target.removeEventListener(type, fn, opts);
			this.listeners = [];
			this.silence();
			this.root = null;
		}

		/* Where a song's audio comes from: a game file path, or the stored file. Returns { src } or { missing }. */
		async audioSource(song) {
			if (song.builtin) return { src: L().builtin(song.builtin).path };
			const token = this.previewToken;
			const blob = await L().getAudio(song.id);
			if (!this.root || token !== this.previewToken) return { cancelled: true };
			if (!blob) return { missing: true };
			if (this.objectURL) URL.revokeObjectURL(this.objectURL);
			this.objectURL = URL.createObjectURL(blob);
			return { src: this.objectURL };
		}

		/* ---- the menu's song preview ----
		 * The selected song plays in the menu through the same audio element as the game, so two songs never play at
		 * once, and the taps that let the preview play also let the game play. It carries on across the menu's tabs. The
		 * game, the tutorial, the chart editor and the details player take the element over, and each calls
		 * stopPreview() first (silence() does too); the menu picks the preview up again when it is next shown. */

		previewVolume() {
			if (V.options?.audio !== 1 || !R().settings().previews) return 0;
			return Math.max(0, Math.min(1, (V.options?.mastervolume ?? 1) * R().settings().music));
		}

		/* The part of a song to preview: the loudest stretch of about previewLength seconds, starting on a bar line, from
		 * the song's analysis (often the chorus); without an analysis, from a third of the way in. Returns [from, to]. */
		previewSpan(song) {
			const length = Math.min(previewLength, Math.max(6, song.duration - 1));
			const a = song.analysis || {};
			const energy = a.energy || "";
			const bar = 240 / (a.bpm || song.bpm);
			const first = (a.offset ?? song.offset ?? 0) / 1000;
			const count = Math.max(1, Math.round(length / bar));
			let from = song.duration * 0.3;
			if (energy.length > count) {
				let best = -1;
				let sum = 0;
				for (let i = 0; i < energy.length; i++) {
					sum += Number(energy[i]);
					if (i >= count) sum -= Number(energy[i - count]);
					const start = i - count + 1;
					if (start >= 0 && sum > best && first + (start + count) * bar <= song.duration) {
						best = sum;
						from = first + start * bar;
					}
				}
			}
			from = Math.max(0, Math.min(from, song.duration - length));
			return [from, from + length];
		}

		/* Ramps the volume over `ms`. Resolves false if the preview changed meanwhile. */
		fadeTo(target, ms, token) {
			const audio = this.audio;
			const from = audio.volume;
			const steps = Math.max(1, Math.round(ms / 40));
			let i = 0;
			return new Promise(resolve => {
				const step = () => {
					if (token !== this.previewToken) return resolve(false);
					i++;
					audio.volume = Math.max(0, Math.min(1, from + ((target - from) * i) / steps));
					if (i < steps) this.later(step, 40);
					else resolve(true);
				};
				step();
			});
		}

		/* Previews `song`: fades out whatever is playing, then fades in the song's preview and loops it. Picking the song
		 * already previewing changes nothing, so redrawing the menu never restarts it. */
		async preview(song) {
			if (!song || this.previewId === song.id || !this.root) return;
			const token = ++this.previewToken;
			this.previewId = song.id;
			this.previewRetry = null;
			this.previewHidden = false;
			if (this.previewMetadata) this.audio.removeEventListener("loadedmetadata", this.previewMetadata);
			this.previewMetadata = null;
			const audio = this.audio;
			if (this.previewVolume() === 0) {
				audio.pause();
				return;
			}
			if (!audio.paused && !(await this.fadeTo(0, 180, token))) return;
			let src;
			try {
				src = await this.audioSource(song);
			} catch (e) {
				return;
			}
			if (token !== this.previewToken || src.cancelled) return;
			audio.pause();
			if (src.missing) return;
			const [from, to] = this.previewSpan(song);
			if (audio.getAttribute("src") !== src.src) {
				audio.src = src.src;
				audio.load();
			}
			audio.volume = 0;
			let looping = false;
			const ours = () => token === this.previewToken && audio.getAttribute("src") === src.src;
			/* Near the end of the stretch: fade out, go back to its start, fade in. */
			const watch = () => {
				if (!ours()) return;
				if (!looping && !this.previewHidden && (audio.ended || (!audio.paused && audio.currentTime >= to - 0.9))) {
					looping = true;
					this.fadeTo(0, 700, token).then(ok => {
						if (!ok || !ours()) return;
						audio.currentTime = from;
						if (audio.paused) audio.play().catch(() => {});
						this.fadeTo(this.previewVolume(), 500, token);
						looping = false;
					});
				}
				this.later(watch, 200);
			};
			const begin = () => {
				if (!ours()) return;
				if (document.hidden) {
					this.previewHidden = true;
					this.previewRetry = begin;
					return;
				}
				const started = audio.play();
				Promise.resolve(started).then(
					() => {
						if (!ours()) return;
						this.fadeTo(this.previewVolume(), 450, token);
						watch();
					},
					e => {
						if (ours() && e && e.name === "NotAllowedError") this.previewRetry = begin;
					}
				);
			};
			const seekAndBegin = () => {
				if (!ours()) return;
				try {
					audio.currentTime = from;
				} catch (e) {}
				begin();
			};
			if (audio.readyState >= 1) seekAndBegin();
			else {
				this.previewMetadata = seekAndBegin;
				audio.addEventListener("loadedmetadata", seekAndBegin, { once: true });
			}
		}

		/* Previews the selected song, for tabs other than Play (which previews from its own list). */
		async previewSelected() {
			const screen = this.screenVersion;
			const id = this.selected;
			if (!id || this.previewId === id) return;
			let song = null;
			try {
				song = await L().getSong(id);
			} catch (e) {}
			if (song && this.selected === id && this.root && screen === this.screenVersion) this.preview(song);
		}

		stopPreview() {
			if (this.previewMetadata) this.audio.removeEventListener("loadedmetadata", this.previewMetadata);
			this.previewMetadata = null;
			this.previewToken++;
			this.previewId = null;
			this.previewRetry = null;
			this.previewHidden = false;
			this.audio.pause();
		}

		/* The page went to the background: hold the preview, and carry on when it comes back. */
		previewVisibility() {
			if (!this.previewId) return;
			if (document.hidden) {
				if (!this.audio.paused) {
					this.audio.pause();
					this.previewHidden = true;
				}
			} else if (this.previewHidden) {
				this.previewHidden = false;
				const retry = this.previewRetry;
				this.previewRetry = null;
				if (retry) retry();
				else this.audio.play().catch(() => {});
			}
		}

		/* ---- the menu: tabs ---- */

		menu(tab = this.tab) {
			if (!this.root) return Promise.resolve();
			this.tab = tab;
			this.queue = tab === "play" ? this.queue : null;
			const tabs = [
				["play", "Play"],
				["challenges", "Challenges"],
				["library", "Library"],
				["playlists", "Playlists"],
				["settings", "Settings"],
			];
			const bar = h(
				"div",
				{ class: "rh-tabs", role: "group", "aria-label": "Rhythm game menu" },
				tabs.map(([id, label]) => button(label, () => this.menu(id), { "aria-pressed": tab === id ? "true" : "false", class: "rh-tab" }))
			);
			const head = h(
				"div",
				{ class: "rh-masthead", "aria-hidden": "true" },
				h("span", { class: "rh-wordmark" }, "Rhythm"),
				h("span", { class: "rh-mast-line" })
			);
			const page = h("div", { class: `rh-page rh-page--${tab}` });
			this.show(h("div", { class: "rh-menu" }, head, bar, page));
			const fillTab = {
				play: this.playTab,
				challenges: this.challengesTab,
				library: this.libraryTab,
				playlists: this.playlistsTab,
				settings: this.settingsTab,
			}[tab];
			if (tab !== "play") this.previewSelected();
			return fillTab
				.call(this, page)
				.then(screen => {
					/* A tab with something to undo on leaving (Settings waiting for a key) hands back its teardown. */
					if (screen && screen.destroy && this.body.contains(page)) this.cleanup = screen;
				})
				.catch(e => {
					console.error("Rhythm game menu failed", e);
					page.replaceChildren(h("p", { class: "rh-error", role: "alert" }, L().storageMessage(e)));
				});
		}

		storageNote() {
			return L().persistent
				? null
				: h("p", { class: "rh-note" }, "This browser will not let the game keep a Rhythm Library, so songs you add last only until the page is closed.");
		}

		/* ---- Play tab ---- */

		/* The Play tab: the selected song's stage (cover, details, difficulty, best, Play) and the song list. There is one
		 * difficulty, R().settings().level; every part that shows it is redrawn from it whenever it changes. */
		async playTab(page) {
			await L().open();
			const lists = await L().listPlaylists();
			if (!this.root || !page.isConnected) return;
			if (this.source !== "builtin" && this.source !== "library" && !lists.some(p => p.id === this.source)) this.source = "builtin";
			const select = h(
				"select",
				{
					class: "rh-select",
					"aria-label": "Songs to show",
					onchange: e => {
						this.source = e.target.value;
						this.selected = null;
						this.menu("play");
					},
				},
				h("option", { value: "builtin" }, "Songs that come with the game"),
				h("option", { value: "library" }, "My Rhythm Library"),
				lists.map(p => h("option", { value: p.id }, `Playlist: ${p.name}`))
			);
			select.value = this.source;
			let songs;
			if (this.source === "builtin") songs = setup.rhythmBuiltins.map(b => L().builtinSong(b));
			else if (this.source === "library") songs = (await L().listSongs()).sort((a, b) => a.title.localeCompare(b.title));
			else {
				const list = lists.find(p => p.id === this.source);
				songs = (await Promise.all(list.songs.map(id => L().getSong(id)))).filter(Boolean);
			}
			const missing = new Set();
			const audioFound = await Promise.all(songs.map(song => (song.builtin ? true : L().getAudio(song.id))));
			if (!this.root || !page.isConnected) return;
			songs.forEach((song, i) => {
				if (!audioFound[i]) missing.add(song.id);
			});
			if (!songs.some(s => s.id === this.selected)) this.selected = songs[0]?.id ?? null;

			const stage = h("section", { class: "rh-stage", "aria-label": "Selected song" });
			const list = h("ul", { class: "rh-picks", "aria-label": "Songs" });
			/* The stage, in the selected song's colours; the menu preview follows the selection. */
			const drawStage = () => {
				const song = songs.find(s => s.id === this.selected);
				stage.setAttribute("style", song ? lookStyle(song) : "");
				stage.replaceChildren(...(song ? this.stage(song, R().settings().level, missing.has(song.id), draw) : []));
				if (song) this.preview(song);
				else this.stopPreview();
			};
			/* Picking a song only moves the selection mark; the rows are rebuilt when the difficulty (and so the grades)
			 * changes. */
			const mark = () => {
				for (const row of list.querySelectorAll(".rh-pick")) {
					const on = row.dataset.song === this.selected;
					row.setAttribute("aria-pressed", on ? "true" : "false");
					row.querySelector(".rh-pick-mark").textContent = on ? "●" : "›";
				}
			};
			const draw = () => {
				const level = R().settings().level;
				drawStage();
				list.replaceChildren(
					...songs.map(s => {
						const own = !L().builtin(s.id);
						const best = own ? s.best?.[level] : R().data().best[`${s.id}|${level}`];
						const selected = s.id === this.selected;
						return h(
							"li",
							{ class: "rh-pick-item" },
							h(
								"button",
								{
									type: "button",
									class: "rh-pick",
									"data-song": s.id,
									"aria-pressed": selected ? "true" : "false",
									onclick: () => {
										if (this.selected === s.id) return;
										this.selected = s.id;
										mark();
										drawStage();
										/* On a narrow screen the stage sits above the list: bring it into view. */
										if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ block: "start", behavior: R().settings().reduced ? "auto" : "smooth" });
									},
								},
								cover(s, { small: true }),
								h(
									"span",
									{ class: "rh-pick-text" },
									h("span", { class: "rh-song-title" }, s.title),
									h("span", { class: "rh-song-sub" }, `${s.artist || "Unknown artist"} · ${Math.round(s.bpm)} BPM · ${time(s.duration)}`)
								),
								missing.has(s.id) ? h("span", { class: "rh-tag rh-tag--warn" }, "no audio") : null,
								h(
									"span",
									{
										class: `rh-pick-grade${best ? "" : " rh-pick-grade--none"}`,
										"aria-label": best ? `Best on ${levelName(level)}: grade ${best.grade}` : `Not played on ${levelName(level)}`,
									},
									best ? best.grade : "–"
								),
								h("span", { class: "rh-pick-mark", "aria-hidden": "true" }, selected ? "●" : "›")
							)
						);
					})
				);
			};
			draw();

			const playAll =
				this.source !== "builtin" && songs.length > 1
					? button("Play all in order", () => {
							this.queue = { ids: songs.map(s => s.id), index: 0 };
							this.startById(songs[0].id, R().settings().level);
					  })
					: null;
			put(
				page,
				this.tutorialOffer(),
				this.dailyBanner(songs, draw),
				h(
					"div",
					{ class: `rh-select-layout${songs.length ? "" : " rh-select-layout--empty"}` },
					songs.length ? stage : null,
					h(
						"div",
						{ class: "rh-list-col" },
						h(
							"div",
							{ class: "rh-row rh-row--head" },
							select,
							playAll,
							button("Tutorial", () => setup.rhythmTutorial.open(this))
						),
						songs.length
							? list
							: h(
									"p",
									{ class: "rh-note" },
									this.source === "library"
										? "Your library is empty. Add a music file from the Library tab."
										: "This playlist is empty. Add songs to it from the Playlists tab."
							  )
					)
				),
				this.storageNote()
			);
		}

		/* The selected song's stage. Returns its children; `redraw` repaints the stage and list after a change. */
		stage(song, level, missing, redraw) {
			const own = !L().builtin(song.id);
			const bestOf = l => (own ? song.best?.[l] : R().data().best[`${song.id}|${l}`]);
			const best = bestOf(level);
			const levelsRow = h(
				"div",
				{ class: "rh-levels", role: "group", "aria-label": "Difficulty" },
				levels.map(l =>
					h(
						"button",
						{
							type: "button",
							class: `rh-level ${levelColour[l]}`,
							"aria-pressed": l === level ? "true" : "false",
							onclick: () => {
								R().setSetting("level", l);
								redraw();
								this.body.querySelector(`.rh-level.${levelColour[l]}`)?.focus({ preventScroll: true });
							},
						},
						h("span", { class: "rh-level-name" }, levelName(l)),
						h("span", { class: "rh-level-num", "aria-label": `level ${chartLevel(song, l)}` }, String(chartLevel(song, l))),
						h("span", { class: "rh-level-best" }, bestOf(l) ? bestOf(l).grade : "–")
					)
				)
			);
			const notes = L().chartFor(song, level).notes.length;
			return [
				cover(song, { big: true }),
				h(
					"div",
					{ class: "rh-stage-info" },
					h("h3", { class: "rh-stage-title" }, song.title),
					h("span", { class: "rh-song-sub" }, song.artist || "Unknown artist"),
					h("span", { class: "rh-stage-meta" }, `${Math.round(song.bpm)} BPM · ${time(song.duration)} · ${notes} notes`),
					own ? h("span", { class: "rh-tag" }, "your chart: keeps a best score, no rewards") : null,
					missing ? h("span", { class: "rh-tag rh-tag--warn" }, "audio missing") : null
				),
				levelsRow,
				h(
					"div",
					{ class: "rh-stage-foot" },
					h(
						"div",
						{ class: "rh-stage-best" },
						h("span", { class: "rh-k" }, `Best on ${levelName(level)}`),
						h("span", { class: "rh-score" }, best ? pad7(best.score) : "-------"),
						h("span", { class: "rh-song-sub" }, best ? `${best.grade}${best.ap ? " · all Perfect" : best.fc ? " · full combo" : ""}` : "Not played yet")
					),
					missing
						? button("Link audio", () => this.relink(song), { class: "rh-btn rh-play" })
						: button(`Play ${levelName(level)}`, () => this.start(song, level), {
								class: `rh-btn rh-play ${levelColour[level]}`,
								"aria-label": `Play ${song.title} on ${levelName(level)}`,
						  })
				),
			];
		}

		/* Today's daily challenge, in short, above the song list. */
		dailyBanner(songs, redraw) {
			if (this.source !== "builtin") return null;
			const c = R().daily();
			const day = R().data().daily[c.date];
			return h(
				"div",
				{ class: "rh-daily-strip" },
				h("span", { class: "rh-k" }, "Daily challenge"),
				h("span", { class: "rh-daily-goal" }, c.goal),
				h(
					"span",
					{ class: "rh-song-sub" },
					day?.done ? "Completed today" : `${formatMoney(c.reward)} on completion · resets in ${setup.consoleDaily.untilReset()}`
				),
				day?.done
					? null
					: button("Select it", () => {
							R().setSetting("level", c.level);
							this.selected = c.songId;
							redraw();
					  })
			);
		}

		/* The first-time offer of the tutorial, until the player takes it or turns it down. */
		tutorialOffer() {
			const d = R().data();
			if (d.tutorial) return null;
			const card = h(
				"div",
				{ class: "rh-offer" },
				h("strong", null, "New to the rhythm game?"),
				h("span", null, "A short tutorial lets you try the line, taps, holds, drags, and pairs on a slow practice beat, with touch, mouse, or keys."),
				h(
					"div",
					{ class: "rh-row" },
					button("Start the tutorial", () => setup.rhythmTutorial.open(this), { class: "rh-btn rh-btn--main" }),
					button("Not now", () => {
						R().finishTutorial("skipped");
						card.remove();
					})
				)
			);
			return card;
		}

		/* ---- the game ---- */

		async startById(id, level) {
			const screen = this.screenVersion;
			const song = await L().getSong(id);
			if (!this.root || screen !== this.screenVersion) return;
			if (song) this.start(song, level);
			else this.menu("play");
		}

		async start(song, level) {
			if (this.busy) return;
			const screen = this.screenVersion;
			if (V.options?.audio !== 1) {
				this.notice("DoL's audio is switched off in Options, and this game needs its music. Turn audio on to play.");
				return;
			}
			const chart = L().chartFor(song, level);
			if (!chart.notes.length) {
				this.notice(`The ${levelName(level)} chart of this song has no notes. Open it in the chart editor to add some.`);
				return;
			}
			this.busy = true;
			this.stopPreview();
			let src;
			try {
				src = await this.audioSource(song);
			} catch (e) {
				this.busy = false;
				this.notice(L().storageMessage(e));
				return;
			}
			this.busy = false;
			if (!this.root || screen !== this.screenVersion || src.cancelled) return;
			if (src.missing) {
				this.relink(song);
				return;
			}
			if (window.PocketMusic?.active) window.PocketMusic.stop(false);
			this.game(song, level, chart, src.src);
		}

		/* A one-message screen with a way back. */
		notice(text) {
			this.show(
				h(
					"div",
					{ class: "rh-notice" },
					h("p", { role: "alert" }, text),
					button("Back to the song list", () => this.menu(), { "data-autofocus": true })
				)
			);
		}

		game(song, level, chart, src) {
			this.selected = song.id;
			const s = R().settings();
			const audio = this.audio;
			const eligible = !!L().builtin(song.id) && !chart.edited;
			const notes = chart.notes.map(n => ({ ...n }));
			const hud = {
				score: h("span", { class: "rh-hud-score" }, "0000000"),
				combo: h("span", { class: "rh-hud-combo" }, "0"),
				comboLabel: h("span", { class: "rh-hud-k" }, "Combo"),
				acc: h("span", { class: "rh-hud-acc" }, "100.00%"),
				judge: h("span", { class: "rh-judge" }, "\u00a0"),
			};
			const progress = h("span", { class: "rh-progress-fill" });
			const canvas = h("canvas", {
				class: "rh-canvas",
				"aria-label": `${song.title}. Tap or click the notes as the line crosses them, or use the lane keys ${keyLabels().join(" ")}. P or Escape pauses.`,
			});
			const overlay = h("div", { class: "rh-overlay", role: "dialog", "aria-modal": "false", "aria-labelledby": "rh-overlay-title" });
			const field = h("div", { class: "rh-field", "data-gesture-owner": "rhythm" }, canvas, overlay);
			const pauseBtn = h(
				"button",
				{ type: "button", class: "rh-btn rh-pause", onclick: () => pause(), "aria-keyshortcuts": "P Escape", "aria-label": "Pause" },
				h("span", { class: "rh-pause-icon", "aria-hidden": "true" })
			);
			const el = h(
				"div",
				{ class: "rh-game" },
				h(
					"div",
					{ class: "rh-hud-bar" },
					h("span", { class: "rh-progress", "aria-hidden": "true" }, progress),
					pauseBtn,
					h("div", { class: "rh-hud-mid" }, hud.combo, hud.comboLabel),
					h("div", { class: "rh-hud-right" }, hud.score, h("span", { class: "rh-hud-sub" }, hud.acc, " ", hud.judge))
				),
				field,
				h(
					"div",
					{ class: "rh-game-foot" },
					h("span", { class: "rh-song-title" }, song.title),
					h("span", { class: "rh-song-sub" }, song.artist || ""),
					h("span", { class: `rh-lv-tag ${levelColour[level]}` }, `${levelName(level)} ${chartLevel(song, level)}`)
				)
			);

			let phase = "loading"; // loading, held (paused while loading), countdown, playing, paused, results, error
			let play = null;
			let countdownTimer = 0;
			let pausedAt = 0;
			let ourPause = false;
			let observer = null;

			const setOverlay = (title, text, buttons = [], light = false) => {
				overlay.classList.toggle("rh-overlay--light", light);
				fill(
					overlay,
					h("span", { class: "rh-overlay-title", id: "rh-overlay-title" }, title),
					text ? h("span", { class: "rh-overlay-text" }, text) : null,
					buttons.length ? h("div", { class: "rh-overlay-buttons" }, buttons) : null
				);
				overlay.hidden = false;
				const first = overlay.querySelector("button");
				if (first) first.focus({ preventScroll: true });
			};
			const hideOverlay = () => {
				overlay.hidden = true;
				overlay.replaceChildren();
			};

			const audioPause = () => {
				ourPause = true;
				audio.pause();
				Promise.resolve().then(() => (ourPause = false));
			};

			const onHud = (st, result) => {
				hud.score.textContent = pad7(st.score);
				hud.combo.textContent = String(st.combo);
				hud.combo.classList.toggle("rh-hud-combo--zero", st.combo === 0);
				hud.acc.textContent = `${st.acc.toFixed(2)}%`;
				progress.style.width = `${Math.round(st.progress * 100)}%`;
				if (result) {
					hud.judge.textContent = { perfect: "Perfect", good: "Good", miss: "Miss", hold: "Holding" }[result];
					hud.judge.className = `rh-judge rh-judge--${result}`;
				}
			};

			const build = () => {
				play = new (R().Play)({
					canvas,
					song,
					notes,
					level,
					audio,
					offsetMs: s.offset + (song.trim || 0),
					reduced: s.reduced,
					onHud,
					onEnd: result => finish(result),
				});
				if (lanesAtStart()) play.field.lanes = keyLabels();
				onHud(play.summary());
			};

			/* Counts 3, 2, 1 over a still field, then starts (or resumes) the music. */
			const countdown = (from, then) => {
				phase = "countdown";
				let n = 3;
				const tick = () => {
					if (!this.root || phase !== "countdown") return;
					if (n === 0) {
						hideOverlay();
						then();
						return;
					}
					/* A see-through count over the field as it will be when play starts, so the first notes can be read. */
					setOverlay(String(n), null, [], true);
					play.still(from);
					if (n === 3) setup.consoleSfx?.play("rhythm-start");
					n--;
					countdownTimer = this.later(tick, 650);
				};
				tick();
			};

			const run = () => {
				play.stop();
				audio.volume = Math.max(0, Math.min(1, (V.options?.mastervolume ?? 1) * s.music));
				phase = "playing";
				const p = audio.play();
				if (p && p.catch)
					p.catch(() => {
						if (phase !== "playing") return;
						/* The browser wants a fresh tap before it plays sound. */
						phase = "paused";
						play.stop();
						setOverlay("Tap to start the music", "The browser is waiting for a tap before it plays sound.", [
							button("Start", () => countdown(play.time(), run)),
						]);
					});
				play.start();
			};

			const pause = () => {
				/* Still loading: nothing to pause yet, but the way out is always there. */
				if (phase === "loading") {
					phase = "held";
					setOverlay("Paused", "The song is still loading.", [
						button("Resume", () => {
							phase = "loading";
							setOverlay("Loading the song", null);
							waitReady();
						}),
						button("Quit to the song list", () => quit()),
					]);
					return;
				}
				if (phase !== "playing" && phase !== "countdown") return;
				clearTimeout(countdownTimer);
				phase = "paused";
				play.stop();
				/* Lifts during the pause are never seen, so every finger and key is let go now. */
				play.settleInputs();
				input.releaseAll();
				audioPause();
				pausedAt = play.time();
				play.still(pausedAt);
				setOverlay("Paused", `${time(Math.max(0, audio.currentTime))} of ${time(song.duration)}`, [
					button("Resume", () => countdown(pausedAt, run)),
					button("Restart", () => restart()),
					button("Quit to the song list", () => quit()),
				]);
			};

			const restart = () => {
				clearTimeout(countdownTimer);
				if (play) play.stop();
				input.releaseAll();
				audioPause();
				audio.currentTime = 0;
				build();
				countdown(0, run);
			};

			const quit = () => {
				this.queue = null;
				this.menu("play");
			};

			const finish = async result => {
				phase = "results";
				audioPause();
				let outcome = { newBest: false, paid: 0, unlocked: [] };
				if (eligible) outcome = R().record({ ...result, songId: song.id, level }, true);
				else {
					outcome = R().record({ custom: !L().builtin(song.id) }, false);
					/* Your own songs keep their best on the song itself, in the library. */
					if (!L().builtin(song.id)) {
						try {
							const stored = await L().getSong(song.id);
							if (stored) {
								stored.best = stored.best || {};
								const old = stored.best[level];
								if (!old || result.score > old.score) {
									stored.best[level] = { score: result.score, grade: result.grade, fc: result.fc || !!old?.fc, ap: result.ap || !!old?.ap };
									outcome.newBest = !!old;
									await L().saveSong(stored);
								} else if ((result.fc && !old.fc) || (result.ap && !old.ap)) {
									old.fc = old.fc || result.fc;
									old.ap = old.ap || result.ap;
									await L().saveSong(stored);
								}
							}
						} catch (e) {
							console.warn("Rhythm game: could not store the result", e);
							outcome.storageError = L().storageMessage(e);
						}
					}
				}
				if (!this.root || phase !== "results") return;
				setup.consoleSfx?.play(result.cleared ? "rhythm-clear" : "rhythm-fail");
				/* A moment on the field to see how it ended, then the results. */
				setOverlay(result.ap ? "All Perfect" : result.fc ? "Full combo" : result.cleared ? "Cleared" : "Song over", null, [], true);
				this.later(() => {
					if (phase === "results" && el.isConnected) this.results(song, level, result, outcome, eligible);
				}, 1100);
			};

			/* ---- input ---- */
			/* Key labels appear on the field the first time a lane key is used, unless the player turned them off. */
			const input = bindInput(
				canvas,
				field,
				() => (phase === "playing" ? play : null),
				() => {
					if (play && !play.field.lanes && R().settings().laneLabels !== "never") play.field.lanes = keyLabels();
				}
			);
			const keydown = e => {
				if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
				if ((e.code === "Escape" || e.code === "KeyP") && (phase === "playing" || phase === "countdown")) {
					e.preventDefault();
					pause();
					return;
				}
				input.keydown(e);
			};
			const keyup = e => input.keyup(e);

			/* Audio events: a stall just freezes the clock; an outside pause (headphones unplugged, a call) pauses the game. */
			const onAudioPause = () => {
				if (!ourPause && phase === "playing" && !audio.ended) pause();
			};
			const onAudioError = () => {
				if (phase === "results" || !audio.getAttribute("src")) return;
				phase = "error";
				if (play) play.stop();
				setOverlay("This song could not play", "The browser could not read its audio file. If it is one of yours, link the file again from the Library tab.", [
					button("Back to the song list", () => quit()),
				]);
			};
			audio.addEventListener("pause", onAudioPause);
			audio.addEventListener("error", onAudioError);

			const resize = () => {
				if (!play) return;
				play.field.resize();
				if (phase !== "playing") play.still(phase === "paused" ? pausedAt : 0);
			};

			this.show(el, {
				visibility: () => {
					if (document.hidden) pause();
				},
				keydown,
				keyup,
				/* Switching windows loses key releases, so pause and forget held inputs. */
				blur: () => {
					pause();
					input.releaseAll();
				},
				destroy: () => {
					clearTimeout(countdownTimer);
					phase = "closed";
					if (play) play.stop();
					audio.removeEventListener("pause", onAudioPause);
					audio.removeEventListener("error", onAudioError);
					if (observer) observer.disconnect();
					audioPause();
				},
			});

			/* ---- load, then count in ---- */
			build();
			if (window.ResizeObserver) {
				observer = new ResizeObserver(resize);
				observer.observe(field);
			}
			play.still(0);
			setOverlay("Loading the song", null);
			if (audio.getAttribute("src") !== src) {
				audio.src = src;
				audio.load();
			} else audio.currentTime = 0;
			/* Unlock playback inside this tap, for browsers that only allow sound straight after one. */
			audio.muted = true;
			const unlock = audio.play();
			if (unlock && unlock.then)
				unlock
					.then(() => {
						if (phase === "loading") audioPause();
					})
					.catch(() => {})
					.finally(() => {
						audio.muted = false;
					});
			else audio.muted = false;
			const started = performance.now();
			const waitReady = () => {
				if (!this.root || phase !== "loading") return;
				if (audio.readyState >= 3) {
					audioPause();
					audio.currentTime = 0;
					audio.muted = false;
					countdown(0, run);
					return;
				}
				if (audio.error || performance.now() - started > 20000) {
					onAudioError();
					return;
				}
				this.later(waitReady, 100);
			};
			waitReady();
		}

		results(song, level, r, outcome, eligible) {
			const s = R().settings();
			const extra = [];
			if (outcome.storageError) extra.push(outcome.storageError);
			if (outcome.newBest) extra.push("A new best for this song.");
			if (outcome.paid) extra.push(`Today's console reward: ${formatMoney(outcome.paid)}.`);
			for (const a of outcome.unlocked) extra.push(`Achievement: ${a}.`);
			if (!eligible) extra.push("Your own and edited charts keep a best score but do not pay rewards.");
			let offsetBlock = null;
			if (r.meanError !== null && Math.abs(r.meanError) >= 15) {
				const way = r.meanError > 0 ? "late" : "early";
				const next = Math.max(-300, Math.min(300, s.offset + r.meanError));
				offsetBlock = h(
					"div",
					{ class: "rh-offset-tip" },
					h("p", null, `Your hits landed ${Math.abs(r.meanError)} ms ${way} on average. If that felt right to you, the timing offset can make up for it.`),
					button(`Set the timing offset to ${next} ms`, e => {
						R().setSetting("offset", next);
						e.currentTarget.disabled = true;
						e.currentTarget.textContent = `Timing offset is now ${next} ms`;
					})
				);
			}
			const queue = this.queue;
			const hasNext = queue && queue.index + 1 < queue.ids.length;
			const buttons = [
				hasNext
					? button(
							"Next song",
							() => {
								queue.index++;
								this.startById(queue.ids[queue.index], level);
							},
							{ "data-autofocus": true }
					  )
					: null,
				button("Play again", () => this.start(song, level), hasNext ? {} : { "data-autofocus": true }),
				button("Back to the song list", () => {
					this.queue = null;
					this.menu("play");
				}),
			];
			const share = n => `${r.total ? (n / r.total) * 100 : 0}%`;
			const rewards = [...(outcome.completed || []).map(name => `Challenge completed: ${name}.`), ...(outcome.feat ? [`Feat earned: ${R().masterFeat}.`] : [])];
			if (outcome.daily)
				rewards.unshift(
					outcome.daily.met
						? outcome.daily.first
							? "Daily challenge completed."
							: "Daily challenge met again (already completed today)."
						: "Daily challenge not met this time."
				);
			this.show(
				h(
					"div",
					{ class: `rh-results rh-results--${r.grade}` },
					h(
						"div",
						{ class: "rh-result-head" },
						cover(song),
						h(
							"div",
							{ class: "rh-result-song" },
							h("h3", { class: "rh-stage-title" }, song.title),
							h("span", { class: `rh-lv-tag ${levelColour[level]}` }, `${levelName(level)} ${chartLevel(song, level)}`)
						)
					),
					h(
						"div",
						{ class: "rh-result-top" },
						h("div", { class: "rh-grade", "aria-label": `Grade ${r.grade}` }, r.grade),
						h(
							"div",
							{ class: "rh-result-main" },
							h("span", { class: "rh-result-verdict" }, r.ap ? "All Perfect" : r.fc ? "Full combo" : r.cleared ? "Cleared" : "Not cleared"),
							h("span", { class: "rh-score rh-score--big" }, pad7(r.score)),
							h("span", { class: "rh-song-sub" }, `Accuracy ${r.acc.toFixed(2)}% · max combo ${r.maxCombo} of ${r.total}`)
						)
					),
					h(
						"div",
						{ class: "rh-split", role: "img", "aria-label": `${r.perfect} Perfect, ${r.good} Good, ${r.miss} Miss` },
						h("span", { class: "rh-split-perfect", style: `width: ${share(r.perfect)}` }),
						h("span", { class: "rh-split-good", style: `width: ${share(r.good)}` }),
						h("span", { class: "rh-split-miss", style: `width: ${share(r.miss)}` })
					),
					h(
						"div",
						{ class: "rh-counts" },
						[
							["Perfect", r.perfect, "perfect"],
							["Good", r.good, "good"],
							["Miss", r.miss, "miss"],
						].map(([k, v, c]) =>
							h("span", { class: "rh-count" }, h("span", { class: `rh-k rh-judge--${c}` }, k), h("span", { class: "rh-count-v" }, String(v)))
						)
					),
					rewards.length || extra.length
						? h(
								"ul",
								{ class: "rh-extra" },
								[...rewards, ...extra].map(t => h("li", null, t))
						  )
						: null,
					offsetBlock,
					h("div", { class: "rh-row rh-result-actions" }, buttons)
				)
			);
			this.silence();
			this.say(`${r.cleared ? "Cleared" : "Not cleared"}, grade ${r.grade}, ${r.acc} percent.`);
		}

		/* ---- Library tab ---- */

		async libraryTab(page) {
			await L().open();
			const input = h("input", {
				type: "file",
				accept: "audio/*,.mp3,.ogg,.oga,.wav,.m4a,.aac,.flac,.webm",
				class: "rh-file",
				"aria-label": "Music file to add",
			});
			const json = h("input", { type: "file", accept: "application/json,.json", class: "rh-file", "aria-label": "Rhythm JSON file to import" });
			const progress = h("p", { class: "rh-progress-text", role: "status" });
			input.addEventListener("change", () => {
				const file = input.files && input.files[0];
				input.value = "";
				if (file) this.addFile(file, progress);
			});
			json.addEventListener("change", async () => {
				const file = json.files && json.files[0];
				json.value = "";
				if (file) this.importJson(file, progress);
			});
			const songs = (await L().listSongs()).sort((a, b) => a.title.localeCompare(b.title));
			const builtinPick = h(
				"select",
				{ class: "rh-select", "aria-label": "Built-in song to edit" },
				setup.rhythmBuiltins.map(b => h("option", { value: b.id }, b.title))
			);
			const rows = h("ul", { class: "rh-songs" });
			for (const song of songs) {
				const missing = !song.builtin && !(await L().getAudio(song.id));
				rows.append(
					h(
						"li",
						{ class: "rh-song" },
						cover(song, { small: true }),
						h(
							"div",
							{ class: "rh-song-main" },
							h("span", { class: "rh-song-title" }, song.title),
							h("span", { class: "rh-song-sub" }, `${song.artist || "Unknown artist"} · ${Math.round(song.bpm)} BPM · ${time(song.duration)}`),
							missing ? h("span", { class: "rh-tag rh-tag--warn" }, "audio missing") : null
						),
						h(
							"div",
							{ class: "rh-song-actions" },
							button("Details and timing", () => this.details(song.id)),
							button("Edit chart", () => this.edit(song.id)),
							missing ? button("Link audio", () => this.relink(song)) : null
						)
					)
				);
			}
			put(
				page,
				h("h3", { class: "rh-head" }, "Rhythm Library"),
				h(
					"p",
					null,
					"Add music files from this device (MP3, OGG, WAV, or anything else your browser plays). The game works out the beat and makes Easy, Normal, and Hard charts. Files stay in this browser and never go into your saves."
				),
				h("p", { class: "rh-warning" }, warning),
				h(
					"div",
					{ class: "rh-row" },
					h("label", { class: "rh-btn rh-file-label" }, "Add a music file", input),
					h("label", { class: "rh-btn rh-file-label" }, "Import charts (JSON)", json),
					songs.length ? button("Export the whole library", () => this.exportJson("library")) : null
				),
				progress,
				songs.length ? rows : h("p", { class: "rh-note" }, "No songs yet."),
				h("h4", { class: "con-subhead" }, "Edit a built-in chart"),
				h("p", { class: "rh-song-sub" }, "Saving puts an edited copy in your library; the original song and its rewards stay as they are."),
				h(
					"div",
					{ class: "rh-row" },
					builtinPick,
					button("Open in the chart editor", () => this.edit(builtinPick.value))
				),
				this.storageNote()
			);
		}

		/* Reads, fingerprints, decodes and analyses one audio file. Returns { file, fingerprint, analysis } or throws. */
		async readAudio(file, say) {
			const lim = L().limits;
			if (file.size > lim.audioBytes) throw new Error(`That file is over ${lim.audioBytes / 1024 / 1024} MB. Pick a shorter song or a smaller file.`);
			if (file.type && !file.type.startsWith("audio/") && !file.type.startsWith("video/")) throw new Error("That does not look like a music file.");
			say("Reading the file...");
			const bytes = await file.arrayBuffer();
			const fingerprint = L().fingerprint(bytes);
			say("Decoding the music...");
			const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
			if (!AC) throw new Error("This browser cannot decode music files for analysis.");
			const ctx = new AC(1, 2, 44100);
			let buffer;
			try {
				buffer = await new Promise((resolve, reject) => {
					const p = ctx.decodeAudioData(bytes, resolve, reject);
					if (p && p.then) p.then(resolve, reject);
				});
			} catch (e) {
				throw new Error("The browser could not decode that file. Try an MP3, OGG, or WAV.");
			}
			if (buffer.duration > lim.audioSeconds) throw new Error(`That song is over ${lim.audioSeconds / 60} minutes long. Pick a shorter one.`);
			if (buffer.duration < 10) throw new Error("That file is under 10 seconds long, too short to chart.");
			say("Finding the beat...");
			await new Promise(resolve => setTimeout(resolve, 30));
			const analysis = setup.rhythmAnalysis.analyse(buffer);
			return { fingerprint, analysis, duration: buffer.duration };
		}

		async addFile(file, progress) {
			if (this.busy) return;
			this.busy = true;
			const say = t => {
				progress.textContent = t;
				this.say(t);
			};
			try {
				const { fingerprint, analysis, duration } = await this.readAudio(file, say);
				const id = L().newId("s");
				const base = file.name.replace(/\.[^.]+$/, "");
				const [artist, title] = base.includes(" - ") ? [base.slice(0, base.indexOf(" - ")), base.slice(base.indexOf(" - ") + 3)] : ["", base];
				const song = {
					id,
					title: title.slice(0, 120) || "Untitled",
					artist: artist.slice(0, 120),
					source: "file",
					audio: { name: file.name.slice(0, 200), size: file.size, type: (file.type || "").slice(0, 60), fingerprint },
					bpm: analysis.bpm,
					offset: analysis.offset,
					pageBeats: setup.rhythmAnalysis.pageBeats(analysis.bpm),
					duration: Math.round(duration * 1000) / 1000,
					trim: 0,
					analysis: { bpm: analysis.bpm, offset: analysis.offset, slots: analysis.slots, energy: analysis.energy },
					charts: {},
					created: Date.now(),
				};
				for (const level of levels) song.charts[level] = { notes: setup.rhythmAnalysis.generate(song, level).notes, edited: false };
				say("Saving...");
				await L().saveSong(song, file);
				if (!this.root || !progress.isConnected) return;
				this.busy = false;
				this.menu("library");
				this.say(`Added ${song.title}, ${Math.round(song.bpm)} BPM.`);
			} catch (e) {
				say(e instanceof Error && !e.name.includes("Quota") && e.message ? e.message : L().storageMessage(e));
			} finally {
				this.busy = false;
			}
		}

		/* Link a file to a song whose audio is missing (or replace it). A different file than the one charted gets a
		 * warning, and the choice to keep the charts or regenerate them from the new file. */
		relink(song) {
			const input = h("input", {
				type: "file",
				accept: "audio/*,.mp3,.ogg,.oga,.wav,.m4a,.aac,.flac,.webm",
				class: "rh-file",
				"aria-label": "Music file to link",
			});
			const progress = h("p", { class: "rh-progress-text", role: "status" });
			const choice = h("div", { class: "rh-row" });
			const want = song.audio;
			input.addEventListener("change", async () => {
				const file = input.files && input.files[0];
				input.value = "";
				if (!file || this.busy) return;
				this.busy = true;
				try {
					const read = await this.readAudio(file, t => (progress.textContent = t));
					if (!this.root || !progress.isConnected) return;
					const fresh = await L().getSong(song.id);
					if (!fresh) throw new Error("That song is no longer in the library.");
					const differences = [];
					if (want?.fingerprint && want.fingerprint !== read.fingerprint) differences.push("it is not the exact file the chart was made from");
					if (Math.abs(read.duration - fresh.duration) > 1.5) differences.push(`it is ${time(read.duration)} long, the chart expects ${time(fresh.duration)}`);
					const link = async regenerate => {
						if (fresh.audio?.fingerprint !== read.fingerprint) delete fresh.best;
						fresh.audio = { name: file.name.slice(0, 200), size: file.size, type: (file.type || "").slice(0, 60), fingerprint: read.fingerprint };
						if (regenerate) {
							fresh.analysis = { bpm: read.analysis.bpm, offset: read.analysis.offset, slots: read.analysis.slots, energy: read.analysis.energy };
							fresh.bpm = read.analysis.bpm;
							fresh.offset = read.analysis.offset;
							fresh.pageBeats = setup.rhythmAnalysis.pageBeats(fresh.bpm);
							fresh.duration = Math.round(read.duration * 1000) / 1000;
							for (const level of levels)
								if (!fresh.charts[level]?.edited) {
									fresh.charts[level] = { notes: setup.rhythmAnalysis.generate(fresh, level).notes, edited: false };
									if (fresh.best) delete fresh.best[level];
								}
						}
						await L().saveSong(fresh, file);
						if (!this.root || !progress.isConnected) return;
						this.menu("library");
						this.say(`Linked the audio for ${fresh.title}.`);
					};
					if (!differences.length) await link(false);
					else {
						progress.textContent = `This file may not match: ${differences.join("; ")}. The chart's timing might be off.`;
						choice.replaceChildren(
							button("Link it and keep the charts", () => link(false).catch(e => (progress.textContent = L().storageMessage(e)))),
							button("Link it and remake unedited charts from it", () => link(true).catch(e => (progress.textContent = L().storageMessage(e)))),
							button("Cancel", () => this.menu("library"))
						);
					}
				} catch (e) {
					progress.textContent = e.message || L().storageMessage(e);
				} finally {
					this.busy = false;
				}
			});
			this.show(
				h(
					"div",
					{ class: "rh-notice" },
					h("h3", { class: "rh-head" }, `Link audio: ${song.title}`),
					h(
						"p",
						null,
						want
							? `This chart was made from "${want.name}"${want.size ? `, ${(want.size / 1024 / 1024).toFixed(1)} MB` : ""}. Pick your copy of that song.`
							: "Pick the music file for this chart."
					),
					h("label", { class: "rh-btn rh-file-label" }, "Choose the file", input),
					progress,
					choice,
					button("Back", () => this.menu("library"))
				)
			);
		}

		async importJson(file, progress) {
			if (this.busy) return;
			if (file.size > L().limits.importBytes) {
				progress.textContent = "That file is too large to be a rhythm chart (over 8 MB).";
				return;
			}
			this.busy = true;
			try {
				const data = L().parse(await file.text());
				const report = await L().merge(data);
				const parts = [];
				if (report.added.length) parts.push(`added ${report.added.length} song${report.added.length === 1 ? "" : "s"}`);
				if (report.skipped.length) parts.push(`skipped ${report.skipped.length} already in your library`);
				if (report.renamed.length) parts.push(`${report.renamed.length} kept apart from a different song with the same id`);
				if (report.playlists.length) parts.push(`added playlist${report.playlists.length === 1 ? "" : "s"} ${report.playlists.join(", ")}`);
				const text = `Import done: ${parts.join(", ") || "nothing new"}.${
					report.missingAudio ? " Link your own copy of each song's audio before playing it." : ""
				}`;
				if (!this.root || !progress.isConnected) return;
				await this.menu("library");
				const p = this.body.querySelector(".rh-progress-text");
				if (p) p.textContent = text;
				this.say(text);
			} catch (e) {
				progress.textContent = e instanceof L().ImportError ? `Nothing was imported. ${e.message}` : L().storageMessage(e);
			} finally {
				this.busy = false;
			}
		}

		async exportJson(kind, opts = {}) {
			try {
				const data = await L().exportData(kind, opts);
				if (!data.songs.length && !data.playlists.length) {
					this.say("There is nothing to export yet.");
					return;
				}
				const name = (opts.name || kind).replace(/[^A-Za-z0-9 _-]+/g, "").trim() || kind;
				const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
				saveAs(blob, `rhythm-${name}.json`);
				this.say("Export saved.");
			} catch (e) {
				this.say(e.message || "Export failed.");
			}
		}

		/* ---- one library song: details and timing ---- */

		async details(id) {
			const screen = this.screenVersion;
			const song = await L().getSong(id);
			if (!this.root || screen !== this.screenVersion) return;
			if (!song) return this.menu("library");
			/* A labelled input with a one-line explanation under it. */
			const field = (label, attrs, hint) => {
				const input = h("input", { class: "rh-input", ...attrs });
				return [
					h(
						"div",
						{ class: "rh-detail-field" },
						h("label", { class: "rh-field-row" }, h("span", null, label), input),
						hint ? h("span", { class: "rh-song-sub" }, hint) : null
					),
					input,
				];
			};
			const [titleRow, title] = field("Title", { type: "text", maxlength: 120, value: song.title });
			const [artistRow, artist] = field("Artist", { type: "text", maxlength: 120, value: song.artist || "" });
			const [bpmRow, bpm] = field(
				"Tempo (BPM)",
				{ type: "number", min: 40, max: 300, step: 0.01, value: song.bpm },
				"Beats per minute. Not sure? Play the song and use 'Tap here on the beat' above."
			);
			const [offRow, off] = field(
				"First beat (ms)",
				{ type: "number", min: -10000, max: 60000, step: 1, value: song.offset },
				"How far into the file the first beat falls. Charts are built on beats counted from here."
			);
			const [trimRow, trim] = field(
				"Note nudge (ms)",
				{ type: "number", min: -500, max: 500, step: 1, value: song.trim || 0 },
				"Moves every note of this song later (plus) or earlier (minus) without remaking the charts."
			);
			const pages = h(
				"select",
				{ class: "rh-select" },
				[2, 4, 8].map(b => h("option", { value: b }, `${b} beats`))
			);
			pages.value = String(song.pageBeats);
			const msg = h("p", { class: "rh-progress-text", role: "status" });

			/* Tap tempo: tap along to the music for a BPM estimate. */
			const taps = [];
			const tapOut = h("span", { class: "rh-song-sub" }, "Tap on every beat, 8 times or more; the tempo box fills in.");
			const tapBtn = button("Tap here on the beat", () => {
				const now = performance.now();
				if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
				taps.push(now);
				if (taps.length >= 5) {
					const span = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
					const est = Math.round((60000 / span) * 10) / 10;
					if (est < 40 || est > 300) {
						tapOut.textContent = `That came to ${est} BPM, outside 40 to 300. Tap once per beat, in time with the music.`;
						return;
					}
					tapOut.textContent = `About ${est} BPM from ${taps.length} taps, put in the tempo box. Save to keep it.`;
					bpm.value = est;
				}
			});
			const preview = button("Play the song", async () => {
				if (V.options?.audio !== 1) {
					msg.textContent = "DoL's audio is switched off in Options.";
					return;
				}
				if (!this.audio.paused) {
					this.audio.pause();
					preview.textContent = "Play the song";
					return;
				}
				this.stopPreview();
				const src = await this.audioSource(song);
				if (src.cancelled || !preview.isConnected) return;
				if (src.missing) {
					msg.textContent = "Link the audio first.";
					return;
				}
				if (this.audio.getAttribute("src") !== src.src) this.audio.src = src.src;
				this.audio.volume = Math.max(0, Math.min(1, (V.options?.mastervolume ?? 1) * R().settings().music));
				this.audio.play().catch(() => (msg.textContent = "The browser would not play it."));
				preview.textContent = "Stop the song";
			});
			const remake = h(
				"select",
				{ class: "rh-select", "aria-label": "Charts when saving" },
				h("option", { value: "" }, "Keep the charts as they are"),
				h("option", { value: "unedited" }, "Remake the charts you have not edited"),
				h("option", { value: "all" }, "Remake every chart, including edited ones")
			);

			const save = async regenerate => {
				const b = Number(bpm.value);
				const o = Math.round(Number(off.value));
				const tr = Math.round(Number(trim.value));
				if (!(b >= 40 && b <= 300)) {
					msg.textContent = "BPM must be between 40 and 300.";
					return;
				}
				if (!(o >= -10000 && o <= 60000)) {
					msg.textContent = "The first beat must be between -10000 and 60000 ms.";
					return;
				}
				if (!(tr >= -500 && tr <= 500)) {
					msg.textContent = "The song's timing offset must be between -500 and 500 ms.";
					return;
				}
				const fresh = await L()
					.getSong(id)
					.catch(e => {
						msg.textContent = L().storageMessage(e);
						return null;
					});
				if (!fresh) {
					if (!msg.textContent) msg.textContent = "That song is no longer in the library.";
					return;
				}
				fresh.title =
					title.value
						.replace(/[\p{Cc}<>]/gu, "")
						.trim()
						.slice(0, 120) || "Untitled";
				fresh.artist = artist.value
					.replace(/[\p{Cc}<>]/gu, "")
					.trim()
					.slice(0, 120);
				if (fresh.bpm !== b || fresh.offset !== o || fresh.trim !== tr || fresh.pageBeats !== Number(pages.value)) delete fresh.best;
				fresh.bpm = b;
				fresh.offset = o;
				fresh.trim = tr;
				fresh.pageBeats = Number(pages.value);
				if (regenerate)
					for (const level of levels)
						if (!fresh.charts[level]?.edited || regenerate === "all") {
							fresh.charts[level] = { notes: setup.rhythmAnalysis.generate(fresh, level).notes, edited: false };
							if (fresh.best) delete fresh.best[level];
						}
				try {
					await L().saveSong(fresh);
					msg.textContent = regenerate ? "Saved, and the charts were remade with this timing." : "Saved.";
				} catch (e) {
					msg.textContent = L().storageMessage(e);
				}
			};

			const meta = h(
				"dl",
				{ class: "con-facts" },
				h("dt", null, "Audio file"),
				h(
					"dd",
					null,
					song.audio
						? `${song.audio.name || "unnamed"}${song.audio.size ? `, ${(song.audio.size / 1024 / 1024).toFixed(1)} MB` : ""}`
						: song.builtin
						? "Built into the game"
						: "none"
				),
				h("dt", null, "Length"),
				h("dd", null, time(song.duration)),
				h("dt", null, "Detected tempo"),
				h("dd", null, song.analysis ? `${song.analysis.bpm} BPM, first beat at ${song.analysis.offset} ms` : "not analysed"),
				levels.map(l => {
					const c = L().chartFor(song, l);
					return [h("dt", null, levelName(l)), h("dd", null, `${c.notes.length} notes${c.edited ? ", edited by you" : ""}`)];
				})
			);
			const confirmDelete = h("div", { class: "rh-row", hidden: true });
			confirmDelete.append(
				h("span", null, "Delete this song, its charts, and its audio from the library?"),
				button("Yes, delete it", async () => {
					try {
						await L().deleteSong(id);
					} catch (e) {
						msg.textContent = L().storageMessage(e);
						return;
					}
					this.menu("library");
				}),
				button("Keep it", () => (confirmDelete.hidden = true))
			);
			const back = button("Back to the library", () => this.menu("library"));
			this.show(
				h(
					"div",
					{ class: "rh-details" },
					h("div", { class: "rh-row rh-row--head" }, back),
					h("h3", { class: "rh-head" }, song.title),
					meta,
					h("section", { class: "rh-panel" }, h("h4", { class: "rh-panel-head" }, "Song"), titleRow, artistRow),
					h(
						"section",
						{ class: "rh-panel" },
						h("h4", { class: "rh-panel-head" }, "Timing"),
						h("p", { class: "rh-warning" }, warning),
						h("div", { class: "rh-row" }, preview, tapBtn),
						tapOut,
						bpmRow,
						offRow,
						trimRow,
						h(
							"div",
							{ class: "rh-detail-field" },
							h("label", { class: "rh-field-row" }, h("span", null, "Line sweep"), pages),
							h("span", { class: "rh-song-sub" }, "How many beats the line takes to cross the field once.")
						),
						h("label", { class: "rh-field-row" }, h("span", null, "When saving"), remake),
						h(
							"div",
							{ class: "rh-row" },
							button("Save", () => save(remake.value === "all" ? "all" : !!remake.value), { class: "rh-btn rh-btn--main" })
						),
						msg
					),
					h(
						"section",
						{ class: "rh-panel" },
						h("h4", { class: "rh-panel-head" }, "Chart and audio file"),
						h(
							"div",
							{ class: "rh-row" },
							button("Edit the chart", () => this.edit(id)),
							button("Export this song's charts", () => this.exportJson("song", { songIds: [id], name: song.title })),
							button("Replace the audio file", () => this.relink(song))
						),
						h(
							"div",
							{ class: "rh-row" },
							button("Delete this song", () => (confirmDelete.hidden = false), { class: "rh-btn rh-btn--danger" })
						),
						confirmDelete
					)
				),
				{ destroy: () => this.stopPreview() }
			);
		}

		edit(id) {
			setup.rhythmEditor.open(this, id);
		}

		/* ---- Playlists tab ---- */

		async playlistsTab(page) {
			await L().open();
			const lists = await L().listPlaylists();
			const name = h("input", { type: "text", class: "rh-input", maxlength: 80, placeholder: "Playlist name", "aria-label": "New playlist name" });
			const msg = h("p", { class: "rh-progress-text", role: "status" });
			const create = async () => {
				const n = name.value
					.replace(/[\p{Cc}<>]/gu, "")
					.trim()
					.slice(0, 80);
				if (!n) {
					msg.textContent = "Give the playlist a name first.";
					return;
				}
				try {
					await L().savePlaylist({ id: L().newId("p"), name: n, songs: [], order: lists.length });
					this.menu("playlists");
				} catch (e) {
					msg.textContent = L().storageMessage(e);
				}
			};
			name.addEventListener("keydown", e => e.key === "Enter" && create());
			put(
				page,
				h("h3", { class: "rh-head" }, "Playlists"),
				h("div", { class: "rh-row" }, name, button("Create playlist", create)),
				msg,
				lists.length
					? h(
							"ul",
							{ class: "rh-songs" },
							lists.map(p =>
								h(
									"li",
									{ class: "rh-song" },
									h(
										"div",
										{ class: "rh-song-main" },
										h("span", { class: "rh-song-title" }, p.name),
										h("span", { class: "rh-song-sub" }, `${p.songs.length} song${p.songs.length === 1 ? "" : "s"}`)
									),
									button("Open", () => this.playlist(p.id))
								)
							)
					  )
					: h("p", { class: "rh-note" }, "No playlists yet. Playlists can mix built-in songs and your own."),
				this.storageNote()
			);
		}

		async playlist(id) {
			const screen = this.screenVersion;
			const list = (await L().listPlaylists()).find(p => p.id === id);
			if (!this.root || screen !== this.screenVersion) return;
			if (!list) return this.menu("playlists");
			const all = [...setup.rhythmBuiltins.map(b => L().builtinSong(b)), ...(await L().listSongs()).sort((a, b) => a.title.localeCompare(b.title))];
			if (!this.root || screen !== this.screenVersion) return;
			const titleOf = sid => all.find(s => s.id === sid)?.title || "(removed song)";
			const msg = h("p", { class: "rh-progress-text", role: "status" });
			const persist = async () => {
				try {
					await L().savePlaylist(list);
				} catch (e) {
					msg.textContent = L().storageMessage(e);
				}
				draw();
			};
			const entries = h("ol", { class: "rh-songs rh-entries" });
			const draw = () => {
				entries.replaceChildren(
					...list.songs.map((sid, i) =>
						h(
							"li",
							{ class: "rh-song" },
							h("span", { class: "rh-song-main rh-song-title" }, `${i + 1}. ${titleOf(sid)}`),
							h(
								"div",
								{ class: "rh-song-actions" },
								button(
									"Up",
									() => {
										[list.songs[i - 1], list.songs[i]] = [list.songs[i], list.songs[i - 1]];
										persist();
									},
									{ disabled: i === 0, "aria-label": `Move ${titleOf(sid)} up` }
								),
								button(
									"Down",
									() => {
										[list.songs[i + 1], list.songs[i]] = [list.songs[i], list.songs[i + 1]];
										persist();
									},
									{ disabled: i === list.songs.length - 1, "aria-label": `Move ${titleOf(sid)} down` }
								),
								button(
									"Remove",
									() => {
										list.songs.splice(i, 1);
										persist();
									},
									{ "aria-label": `Remove ${titleOf(sid)}` }
								)
							)
						)
					)
				);
				if (!list.songs.length) entries.append(h("li", { class: "rh-note" }, "No songs in this playlist yet."));
			};
			draw();
			const pick = h(
				"select",
				{ class: "rh-select", "aria-label": "Song to add" },
				all.map(s => h("option", { value: s.id }, `${s.title}${L().builtin(s.id) ? " (built in)" : ""}`))
			);
			const rename = h("input", { type: "text", class: "rh-input", maxlength: 80, value: list.name, "aria-label": "Playlist name" });
			const confirmDelete = h("div", { class: "rh-row", hidden: true });
			confirmDelete.append(
				h("span", null, "Delete this playlist? Its songs stay in the library."),
				button("Yes, delete it", async () => {
					await L()
						.deletePlaylist(id)
						.catch(() => {});
					this.menu("playlists");
				}),
				button("Keep it", () => (confirmDelete.hidden = true))
			);
			this.show(
				h(
					"div",
					{ class: "rh-details" },
					h("h3", { class: "rh-head" }, list.name),
					h(
						"div",
						{ class: "rh-row" },
						rename,
						button("Rename", () => {
							const n = rename.value
								.replace(/[\p{Cc}<>]/gu, "")
								.trim()
								.slice(0, 80);
							if (!n) return;
							list.name = n;
							persist();
						})
					),
					entries,
					h(
						"div",
						{ class: "rh-row" },
						pick,
						button("Add to playlist", () => {
							if (!pick.value || list.songs.length >= L().limits.playlistSongs) return;
							list.songs.push(pick.value);
							persist();
						})
					),
					msg,
					h(
						"div",
						{ class: "rh-row" },
						button("Play this playlist", () => {
							this.source = id;
							this.menu("play");
						}),
						button("Export playlist", () => this.exportJson("playlist", { playlistId: id, name: list.name })),
						button("Delete playlist", () => (confirmDelete.hidden = false))
					),
					confirmDelete,
					button("Back to playlists", () => this.menu("playlists"))
				)
			);
		}

		/* ---- Settings tab ---- */

		/* ---- Settings tab ---- */

		async settingsTab(page) {
			const s = R().settings();
			const music = h("input", { type: "range", min: 0, max: 100, step: 5, value: Math.round(s.music * 100), "aria-label": "Music volume", class: "rh-range" });
			music.addEventListener("input", () => {
				R().setSetting("music", Number(music.value) / 100);
				/* The preview follows the slider, so the change can be heard. */
				if (this.previewId) this.audio.volume = this.previewVolume();
			});
			const previews = h("input", { type: "checkbox", checked: s.previews });
			previews.addEventListener("change", () => {
				R().setSetting("previews", previews.checked);
				this.stopPreview();
				if (previews.checked) this.previewSelected();
			});
			const offset = h("input", {
				type: "number",
				class: "rh-input",
				min: -300,
				max: 300,
				step: 5,
				value: s.offset,
				"aria-label": "Timing offset in milliseconds",
			});
			const offsetMsg = h("span", { class: "rh-song-sub", role: "status" });
			offset.addEventListener("change", () => {
				const v = Math.round(Number(offset.value));
				if (!(v >= -300 && v <= 300)) {
					offsetMsg.textContent = "Use a number from -300 to 300.";
					offset.value = R().settings().offset;
					return;
				}
				R().setSetting("offset", v);
				offsetMsg.textContent = `Saved: ${v} ms.`;
			});
			const reduced = h("input", { type: "checkbox", checked: s.reduced });
			reduced.addEventListener("change", () => {
				R().setSetting("reduced", reduced.checked);
				this.root.classList.toggle("rh-calm", reduced.checked);
			});
			const sfx = h("div", { class: "rh-sfx" });
			sfx.innerHTML = setup.consoleSfx ? setup.consoleSfx.controlsHtml() : "";

			/* Lane keys: each button waits for the next key press. A key already on another lane swaps with it. */
			const keyMsg = h("p", { class: "rh-song-sub", role: "status" });
			const keyRow = h("div", { class: "rh-keys", role: "group", "aria-label": "Lane keys, left to right" });
			const labelsSel = h(
				"select",
				{ class: "rh-select", "aria-label": "Show key labels on the field" },
				h("option", { value: "auto" }, "When a keyboard and mouse are used"),
				h("option", { value: "always" }, "Always"),
				h("option", { value: "never" }, "Never")
			);
			labelsSel.value = s.laneLabels;
			labelsSel.addEventListener("change", () => R().setSetting("laneLabels", labelsSel.value));
			let capture = null;
			const stopCapture = () => {
				if (!capture) return;
				document.removeEventListener("keydown", capture, true);
				capture = null;
			};
			const drawKeys = () => {
				const keys = R().settings().keys;
				keyRow.replaceChildren(
					...keys.map((code, i) =>
						h(
							"button",
							{
								type: "button",
								class: "rh-key",
								"aria-label": `Lane ${i + 1}: ${keyLabel(code)}. Press to change.`,
								onclick: e => {
									stopCapture();
									const btn = e.currentTarget;
									btn.classList.add("rh-key--wait");
									btn.querySelector(".rh-key-cap").textContent = "?";
									keyMsg.textContent = `Press a key for lane ${i + 1}, or Escape to keep ${keyLabel(code)}.`;
									capture = ev => {
										/* Nothing else hears this press: not DoL's shortcuts, not the page. */
										ev.preventDefault();
										ev.stopImmediatePropagation();
										if (ev.repeat) return;
										stopCapture();
										if (ev.code === "Escape") keyMsg.textContent = "Unchanged.";
										else if (!R().keyAllowed(ev.code))
											keyMsg.textContent = R().reservedKeys.includes(ev.code)
												? `${keyLabel(ev.code)} is kept for pausing or for DoL's own shortcuts; pick another key.`
												: `${ev.key || ev.code} cannot be a lane key; use a letter, punctuation, arrow, or number-pad key.`;
										else {
											const next = [...R().settings().keys];
											const other = next.indexOf(ev.code);
											if (other >= 0 && other !== i) {
												next[other] = next[i];
												keyMsg.textContent = `${keyLabel(ev.code)} was lane ${other + 1}; lanes ${other + 1} and ${i + 1} swapped keys.`;
											} else keyMsg.textContent = `Lane ${i + 1} is now ${keyLabel(ev.code)}.`;
											next[i] = ev.code;
											R().setSetting("keys", next);
										}
										drawKeys();
										keyRow.children[i]?.focus({ preventScroll: true });
									};
									document.addEventListener("keydown", capture, true);
								},
							},
							h("span", { class: "rh-key-cap" }, keyLabel(code)),
							h("span", { class: "rh-key-lane" }, `Lane ${i + 1}`)
						)
					)
				);
			};
			drawKeys();
			put(
				page,
				h(
					"section",
					{ class: "rh-panel" },
					h("h3", { class: "rh-panel-head" }, "Sound"),
					h("label", { class: "rh-field-row" }, h("span", null, "Music volume"), music),
					h("label", { class: "rh-field-row rh-check" }, previews, h("span", null, "Play a preview of the selected song in the menu")),
					sfx,
					V.options?.audio !== 1 ? h("p", { class: "rh-note" }, "DoL's audio is switched off in Options, so songs will not play until it is on.") : null
				),
				h(
					"section",
					{ class: "rh-panel" },
					h("h3", { class: "rh-panel-head" }, "Timing"),
					h("label", { class: "rh-field-row" }, h("span", null, "Timing offset (ms)"), offset),
					offsetMsg,
					h(
						"p",
						{ class: "rh-song-sub" },
						"If hits are judged late although you play with the beat, raise the offset; if early, lower it. Bluetooth headphones often need 150 or more. After each song the results page suggests a value from your own hits."
					)
				),
				h(
					"section",
					{ class: "rh-panel" },
					h("h3", { class: "rh-panel-head" }, "Keyboard"),
					h(
						"p",
						{ class: "rh-song-sub" },
						"The field is split into six lanes, one key each. A key hits the next note in its lane; hold it for holds; held keys also cover drag notes in their lane and the lanes either side. Press two keys together for a pair. P or Escape pauses."
					),
					keyRow,
					keyMsg,
					h(
						"div",
						{ class: "rh-row" },
						button("Reset to A S D J K L", () => {
							stopCapture();
							R().setSetting("keys", [...R().defaultKeys]);
							keyMsg.textContent = "Lane keys reset.";
							drawKeys();
						}),
						h("label", { class: "rh-field-row" }, h("span", null, "Key labels on the field"), labelsSel)
					),
					h(
						"p",
						{ class: "rh-song-sub" },
						"With a mouse, a click on either note of a pair hits both, since a mouse cannot click two places at once. Touch screens take each finger separately."
					)
				),
				h(
					"section",
					{ class: "rh-panel" },
					h("h3", { class: "rh-panel-head" }, "Display"),
					h(
						"label",
						{ class: "rh-field-row rh-check" },
						reduced,
						h("span", null, "Fewer effects: no hit bursts, line trail, or menu animation (timing rings stay)")
					)
				)
			);
			return { destroy: stopCapture };
		}

		/* ---- Challenges tab: today's challenge, the regular challenges, and the feat for finishing them ---- */

		async challengesTab(page) {
			const d = R().data();
			const c = R().daily();
			const day = d.daily[c.date];
			const song = setup.rhythmBuiltins.find(b => b.id === c.songId);
			const status = R().challengeStatus();
			const done = status.filter(x => x.done).length;
			const feat = R().masterFeat;
			const groups = ["easy", "medium", "hard"].map(diff => {
				const items = status.filter(x => x.c.diff === diff);
				return h(
					"section",
					{ class: "rh-chal-group" },
					h(
						"h4",
						{ class: "rh-chal-head" },
						h("span", { class: `con-diff ${{ easy: "green", medium: "gold", hard: "red" }[diff]}` }, levelName(diff)),
						h("span", { class: "rh-song-sub" }, `${items.filter(x => x.done).length} of ${items.length}`)
					),
					h(
						"ul",
						{ class: "rh-chal-list" },
						items.map(x =>
							h(
								"li",
								{ class: `rh-chal${x.done ? " rh-chal--done" : ""}` },
								h("span", { class: "rh-chal-mark", "aria-hidden": "true" }, x.done ? "✓" : ""),
								h(
									"div",
									{ class: "rh-chal-main" },
									h("span", { class: "rh-song-title" }, x.c.name),
									h("span", { class: "rh-song-sub" }, x.c.desc),
									x.done
										? h("span", { class: "rh-chal-state" }, x.date ? `Completed ${x.date}` : "Completed")
										: h(
												"span",
												{
													class: "rh-meter",
													role: "progressbar",
													"aria-valuemin": 0,
													"aria-valuemax": x.target,
													"aria-valuenow": x.value,
													"aria-label": `${x.c.name} progress`,
												},
												h("span", { class: "rh-meter-fill", style: `width: ${Math.round((x.value / x.target) * 100)}%` })
										  ),
									x.done
										? null
										: h("span", { class: "rh-chal-state" }, x.target === 1 ? "Not yet" : `${x.value.toLocaleString()} of ${x.target.toLocaleString()}`)
								)
							)
						)
					)
				);
			});
			put(
				page,
				h(
					"section",
					{ class: `rh-daily${day?.done ? " rh-daily--done" : ""}`, "aria-label": "Daily challenge" },
					h("div", { class: "rh-daily-head" }, h("span", { class: "rh-k" }, `Daily challenge · ${c.date} (UTC)`), chip(c.level)),
					h("div", { class: "rh-daily-body" }, cover(L().builtinSong(song)), h("p", { class: "rh-daily-goal" }, c.goal)),
					h(
						"dl",
						{ class: "rh-facts" },
						h("dt", null, "Reward"),
						h("dd", null, day?.paid ? `${formatMoney(day.paid)}, paid` : formatMoney(c.reward)),
						h("dt", null, "Status"),
						h(
							"dd",
							null,
							day?.done ? "Completed" : day?.tries ? `Not yet (${day.tries} ${day.tries === 1 ? "try" : "tries"}, best ${day.best}%)` : "Not tried yet"
						),
						h("dt", null, "Next challenge"),
						h("dd", null, `in ${setup.consoleDaily.untilReset()} (midnight UTC)`)
					),
					day?.done
						? null
						: button(
								"Play today's challenge",
								() => {
									R().setSetting("level", c.level);
									this.source = "builtin";
									this.selected = c.songId;
									this.menu("play");
								},
								{ class: `rh-btn rh-play ${levelColour[c.level]}` }
						  ),
					h("p", { class: "rh-song-sub" }, "Only the built-in songs count for challenges and rewards. The daily challenge pays once per day.")
				),
				h(
					"div",
					{ class: "rh-chal-total" },
					h("span", { class: "rh-k" }, "Challenges"),
					h("span", { class: "rh-song-sub" }, `${done} of ${status.length} completed`),
					h(
						"span",
						{ class: "rh-meter", "aria-hidden": "true" },
						h("span", { class: "rh-meter-fill", style: `width: ${Math.round((done / status.length) * 100)}%` })
					)
				),
				groups
			);
			const featBox = h("div", { class: "rh-feat" });
			featBox.innerHTML = setup.consoleDaily.featCard(feat, done, status.length);
			put(page, featBox);
			put(
				page,
				h("h4", { class: "con-subhead" }, "Achievements"),
				h(
					"ul",
					{ class: "rh-chal-list" },
					R().achievements.map(a =>
						h(
							"li",
							{ class: `rh-chal${d.achievements[a.id] ? " rh-chal--done" : ""}` },
							h("span", { class: "rh-chal-mark", "aria-hidden": "true" }, d.achievements[a.id] ? "✓" : ""),
							h(
								"div",
								{ class: "rh-chal-main" },
								h("span", { class: "rh-song-title" }, a.name),
								h("span", { class: "rh-song-sub" }, a.desc),
								h("span", { class: "rh-chal-state" }, d.achievements[a.id] ? `Earned ${d.achievements[a.id]}` : "Not yet")
							)
						)
					)
				)
			);
		}
	}

	function mount(selector = "#rhythm") {
		destroy();
		const root = document.querySelector(selector);
		if (!root) return null;
		try {
			current = new RhythmUI(root);
		} catch (e) {
			current = null;
			console.error("Rhythm game failed to start", e);
			root.textContent = "The rhythm game could not start. Go back to the console and open it again.";
		}
		return current;
	}

	function destroy() {
		if (!current) return;
		try {
			current.destroy();
		} finally {
			current = null;
		}
	}

	/* Called from the passage once it is rendered. */
	function open(selector) {
		Utils.Defer(mount, selector);
	}

	$(document).on(":passageinit", destroy);

	setup.rhythmUI = Object.freeze({
		open,
		destroy,
		leave: destroy,
		h,
		button,
		levelName,
		bindInput,
		fill,
		keyLabel,
		keyLabels,
		chip,
		time,
		get current() {
			return current;
		},
	});
})();
