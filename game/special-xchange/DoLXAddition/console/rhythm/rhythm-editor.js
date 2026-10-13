/* Rhythm game chart editor. One page of the chart at a time, drawn exactly as the game draws it. Tap an empty spot to
 * add a note (snapped to the beat grid), tap a note to select it, drag it to move it. The panel below changes the
 * selected note, shifts the whole chart, and sets BPM and the first beat. A built-in song is saved as an edited copy in
 * the Rhythm Library, so the original and its rewards stay as they are. */
(() => {
	const R = () => setup.rhythm;
	const L = () => setup.rhythmLibrary;
	const A = () => setup.rhythmAnalysis;
	const U = () => setup.rhythmUI;
	const levels = ["easy", "normal", "hard"];
	const fmt = ms => {
		const v = Math.max(0, Math.round(ms));
		return `${Math.floor(v / 60000)}:${String(Math.floor((v % 60000) / 1000)).padStart(2, "0")}.${String(v % 1000).padStart(3, "0")}`;
	};

	async function open(ui, id, level = R().settings().level, message = "") {
		const { h, button, levelName, fill } = U();
		const screen = ui.screenVersion;
		const original = await L().getSong(id);
		if (!ui.root || screen !== ui.screenVersion) return;
		if (!original) return ui.menu("library");
		ui.stopPreview();
		const song = JSON.parse(JSON.stringify(original));
		const isBuiltin = !!L().builtin(id);
		let notes = L()
			.chartFor(song, level)
			.notes.map(n => ({ ...n }));
		let dirty = false;
		let selected = null;
		let pageIndex = 0;
		let snap = 2; // divisions per beat
		let newType = "tap";
		let previewing = false;
		let raf = 0;
		let lastPreview = 0;
		let dragging = null; // { pointerId, moved }

		const canvas = h("canvas", {
			class: "rh-canvas",
			tabindex: 0,
			"aria-label":
				"Chart page. Tap an empty spot to add a note, tap a note to select it, drag to move it. Arrow keys move the selected note, Delete removes it.",
		});
		const field = h("div", { class: "rh-field rh-field--edit", "data-gesture-owner": "rhythm-editor" }, canvas);
		let view = new (R().Field)({ canvas, song, notes, reduced: true });

		const pageInfo = () => A().pages(song);
		const pageCount = () => {
			const p = pageInfo();
			return Math.max(1, Math.ceil((song.duration - p.start) / p.length));
		};
		const pageStart = (i = pageIndex) => pageInfo().start + i * pageInfo().length;
		const grid = () => 60 / song.bpm / snap;
		const snapTime = t => {
			const g = grid();
			const o = song.offset / 1000;
			return o + Math.round((t - o) / g) * g;
		};
		const clampToPage = t => Math.max(0, pageStart(), Math.min(pageStart() + pageInfo().length - 0.001, t));

		const status = h("p", { class: "rh-progress-text", role: "status" }, message);
		const dirtyMark = h("span", { class: "rh-tag rh-tag--warn", hidden: true }, "unsaved changes");
		const pageLabel = h("span", { class: "rh-page-label" });
		const selPanel = h("div", { class: "rh-sel" });

		const markDirty = () => {
			dirty = true;
			dirtyMark.hidden = false;
		};

		const sortNotes = () => A().tidy(notes);

		function draw(t = pageStart() + 0.0005) {
			if (!canvas.isConnected) return;
			view.draw(t, { editing: true, selected });
		}

		function refresh() {
			const count = pageCount();
			pageIndex = Math.max(0, Math.min(count - 1, pageIndex));
			const onPage = notes.filter(n => A().lineAt(song, n.t / 1000).page === pageIndex).length;
			pageLabel.textContent = `Page ${pageIndex + 1} of ${count} · ${fmt(Math.max(0, pageStart()) * 1000)} · ${onPage} notes here, ${notes.length} in all`;
			drawSelection();
			if (!previewing) draw();
		}

		function drawSelection() {
			if (!selected) {
				selPanel.replaceChildren(h("span", { class: "rh-song-sub" }, "No note selected."));
				return;
			}
			const n = selected;
			const step = Math.round(grid() * 1000);
			const change = fn => () => {
				fn();
				n.t = Math.max(0, Math.round(n.t));
				n.x = Math.round(Math.max(0.05, Math.min(0.95, n.x)) * 1000) / 1000;
				if (n.type === "hold") n.d = Math.max(50, Math.round(n.d));
				sortNotes();
				markDirty();
				refresh();
			};
			fill(
				selPanel,
				h(
					"span",
					{ class: "rh-song-sub" },
					`Selected: ${n.type} at ${fmt(n.t)}, across ${Math.round(n.x * 100)}%${n.type === "hold" ? `, held ${n.d} ms` : ""}`
				),
				h(
					"div",
					{ class: "rh-row", role: "group", "aria-label": "Note type" },
					["tap", "hold", "drag"].map(type =>
						button(
							type[0].toUpperCase() + type.slice(1),
							change(() => {
								n.type = type;
								if (type === "hold") n.d = n.d || Math.round((60 / song.bpm) * 1000);
								else delete n.d;
							}),
							{ "aria-pressed": n.type === type ? "true" : "false" }
						)
					)
				),
				h(
					"div",
					{ class: "rh-row" },
					button(
						`${step} ms earlier`,
						change(() => (n.t -= step))
					),
					button(
						`${step} ms later`,
						change(() => (n.t += step))
					),
					button(
						"10 ms earlier",
						change(() => (n.t -= 10))
					),
					button(
						"10 ms later",
						change(() => (n.t += 10))
					),
					button(
						"Left",
						change(() => (n.x -= 0.05))
					),
					button(
						"Right",
						change(() => (n.x += 0.05))
					)
				),
				n.type === "hold"
					? h(
							"div",
							{ class: "rh-row" },
							button(
								"Shorter hold",
								change(() => (n.d -= step))
							),
							button(
								"Longer hold",
								change(() => (n.d += step))
							)
					  )
					: null,
				h(
					"div",
					{ class: "rh-row" },
					button("Delete note", () => {
						notes.splice(notes.indexOf(n), 1);
						selected = null;
						markDirty();
						refresh();
					})
				)
			);
		}

		/* ---- canvas input ---- */
		const noteAt = q => {
			const reach = Math.max(28, view.r * 1.3);
			let best = null;
			let bestD = reach;
			for (const n of notes) {
				const p = view.pos(n);
				if (p.page !== pageIndex) continue;
				const d = Math.hypot(p.x - q.sx, p.y - q.sy);
				if (d <= bestD) {
					bestD = d;
					best = n;
				}
			}
			return best;
		};
		const down = e => {
			if (previewing) stopPreview();
			e.preventDefault();
			canvas.focus({ preventScroll: true });
			const q = view.toField(e.clientX, e.clientY);
			const hit = noteAt(q);
			if (hit) selected = hit;
			else {
				const t = clampToPage(snapTime(view.timeAt(pageIndex, q.y)));
				const n = { t: Math.round(t * 1000), x: Math.round(Math.max(0.05, Math.min(0.95, q.x)) * 1000) / 1000, type: newType };
				if (newType === "hold") n.d = Math.round(Math.min(60 / song.bpm, pageStart() + pageInfo().length - t - 0.05) * 1000);
				if (n.type === "hold" && n.d < 50) n.type = "tap";
				if (n.type !== "hold") delete n.d;
				notes.push(n);
				sortNotes();
				selected = n;
				markDirty();
			}
			try {
				canvas.setPointerCapture(e.pointerId);
			} catch (err) {}
			dragging = { pointerId: e.pointerId, moved: false };
			refresh();
		};
		const move = e => {
			if (!dragging || dragging.pointerId !== e.pointerId || !selected) return;
			const q = view.toField(e.clientX, e.clientY);
			const t = clampToPage(snapTime(view.timeAt(pageIndex, q.y)));
			const x = Math.round(Math.max(0.05, Math.min(0.95, q.x)) * 1000) / 1000;
			if (Math.round(t * 1000) === selected.t && x === selected.x) return;
			selected.t = Math.round(t * 1000);
			selected.x = x;
			dragging.moved = true;
			sortNotes();
			markDirty();
			draw();
		};
		const up = e => {
			if (!dragging || dragging.pointerId !== e.pointerId) return;
			dragging = null;
			sortNotes();
			refresh();
		};
		for (const [type, fn] of [
			["pointerdown", down],
			["pointermove", move],
			["pointerup", up],
			["pointercancel", up],
		])
			canvas.addEventListener(type, fn);
		field.addEventListener("contextmenu", e => e.preventDefault());

		/* ---- preview: plays the music with the line moving over the chart, ticking each note it passes ---- */
		let clock = null;
		const offsetSec = () => (R().settings().offset + (song.trim || 0)) / 1000;
		async function startPreview(fromHere, onlyPage) {
			if (V.options?.audio !== 1) {
				status.textContent = "DoL's audio is switched off in Options.";
				return;
			}
			ui.stopPreview();
			const src = await ui.audioSource(song);
			if (!ui.root || src.cancelled || !canvas.isConnected) return;
			if (src.missing) {
				status.textContent = "This song's audio is missing. Link it from the Library tab to preview.";
				return;
			}
			const audio = ui.audio;
			if (audio.getAttribute("src") !== src.src) audio.src = src.src;
			audio.volume = Math.max(0, Math.min(1, (V.options?.mastervolume ?? 1) * R().settings().music));
			audio.currentTime = Math.max(0, pageStart() + offsetSec());
			clock = new (R().Clock)(audio);
			previewing = { until: onlyPage ? pageStart() + pageInfo().length : Infinity, fromHere };
			lastPreview = pageStart();
			playBtn.textContent = pageBtn.textContent = "Stop";
			try {
				await audio.play();
				if (!previewing || !canvas.isConnected) return;
			} catch (e) {
				status.textContent = "The browser would not play the music. Tap Play again.";
				stopPreview();
				return;
			}
			loop();
		}
		function loop() {
			raf = 0;
			if (!previewing || !canvas.isConnected) return;
			const t = clock.now() - offsetSec();
			for (const n of notes) if (n.t / 1000 > lastPreview && n.t / 1000 <= t) setup.consoleSfx?.play("rhythm-perfect");
			lastPreview = t;
			const page = A().lineAt(song, t).page;
			if (page !== pageIndex && page < pageCount()) {
				pageIndex = page;
				refresh();
			}
			if (t >= previewing.until || ui.audio.ended) {
				stopPreview();
				return;
			}
			view.draw(t, { editing: true, selected });
			raf = requestAnimationFrame(loop);
		}
		function stopPreview() {
			previewing = false;
			cancelAnimationFrame(raf);
			raf = 0;
			ui.audio.pause();
			playBtn.textContent = "Play from this page";
			pageBtn.textContent = "Play this page";
			refresh();
		}

		const pageBtn = button("Play this page", () => (previewing ? stopPreview() : startPreview(false, true)));
		const playBtn = button("Play from this page", () => (previewing ? stopPreview() : startPreview(true, false)));
		const goPage = d => () => {
			if (previewing) stopPreview();
			pageIndex += d;
			selected = null;
			refresh();
		};

		/* ---- tools ---- */
		const typeGroup = h("div", { class: "rh-row", role: "group", "aria-label": "Type of new notes" });
		const snapGroup = h("div", { class: "rh-row", role: "group", "aria-label": "Snap to" });
		const drawTools = () => {
			fill(
				typeGroup,
				h("span", { class: "rh-song-sub" }, "New notes:"),
				["tap", "hold", "drag"].map(type =>
					button(
						type[0].toUpperCase() + type.slice(1),
						() => {
							newType = type;
							drawTools();
						},
						{ "aria-pressed": newType === type ? "true" : "false" }
					)
				)
			);
			fill(
				snapGroup,
				h("span", { class: "rh-song-sub" }, "Snap to:"),
				[
					[1, "Beats"],
					[2, "Half beats"],
					[4, "Quarter beats"],
				].map(([div, label]) =>
					button(
						label,
						() => {
							snap = div;
							drawTools();
							drawSelection();
						},
						{ "aria-pressed": snap === div ? "true" : "false" }
					)
				)
			);
		};
		drawTools();

		/* ---- whole chart ---- */
		const shift = h("input", {
			type: "number",
			class: "rh-input",
			step: 1,
			value: 0,
			min: -5000,
			max: 5000,
			"aria-label": "Shift every note by this many milliseconds",
		});
		const bpm = h("input", { type: "number", class: "rh-input", min: 40, max: 300, step: 0.01, value: song.bpm, "aria-label": "BPM" });
		const first = h("input", {
			type: "number",
			class: "rh-input",
			min: -10000,
			max: 60000,
			step: 1,
			value: song.offset,
			"aria-label": "First beat in milliseconds",
		});
		const applyShift = () => {
			const ms = Math.round(Number(shift.value));
			if (!ms || Math.abs(ms) > 5000) {
				status.textContent = "Enter a shift between -5000 and 5000 ms.";
				return;
			}
			for (const n of notes) n.t = Math.max(0, n.t + ms);
			markDirty();
			status.textContent = `Moved every note ${Math.abs(ms)} ms ${ms > 0 ? "later" : "earlier"}.`;
			refresh();
		};
		const applyGrid = () => {
			const b = Number(bpm.value);
			const o = Math.round(Number(first.value));
			if (!(b >= 40 && b <= 300) || !(o >= -10000 && o <= 60000)) {
				status.textContent = "BPM must be 40 to 300, the first beat -10000 to 60000 ms.";
				return;
			}
			song.bpm = b;
			song.offset = o;
			song.pageBeats = A().pageBeats(b);
			view = new (R().Field)({ canvas, song, notes, reduced: true });
			markDirty();
			status.textContent = "Beat grid changed. Notes keep their times; snapping and pages now follow the new grid.";
			refresh();
		};
		const confirmRegen = h("div", { class: "rh-row", hidden: true });
		confirmRegen.append(
			h("span", null, "Replace this level's notes with a fresh automatic chart?"),
			button("Yes, replace them", () => {
				notes = A().generate(song, level).notes;
				view = new (R().Field)({ canvas, song, notes, reduced: true });
				selected = null;
				confirmRegen.hidden = true;
				markDirty();
				refresh();
			}),
			button("Keep my notes", () => (confirmRegen.hidden = true))
		);

		/* ---- saving ---- */
		async function save() {
			if (notes.length > L().limits.notes || notes.some(n => n.t > song.duration * 1000 + 5000 || (n.type === "hold" && n.d > 60000))) {
				status.textContent =
					"Charts can hold at most 6,000 notes, notes up to 5 seconds after the song, and holds up to 60 seconds. Shorten this chart before saving.";
				return null;
			}
			try {
				let target;
				if (isBuiltin) {
					target = {
						...song,
						id: L().newId("s"),
						title: `${song.title} (edited)`.slice(0, 120),
						source: "builtin",
						builtin: id,
						charts: {},
						created: Date.now(),
					};
					for (const l of levels) if (l !== level) target.charts[l] = { notes: L().chartFor(song, l).notes, edited: false };
				} else {
					target = await L().getSong(song.id);
					if (!target) throw new Error("That song is no longer in the library.");
					if (target.bpm !== song.bpm || target.offset !== song.offset || target.pageBeats !== song.pageBeats) delete target.best;
					target.bpm = song.bpm;
					target.offset = song.offset;
					target.pageBeats = song.pageBeats;
				}
				target.charts[level] = { notes: notes.map(n => ({ ...n })), edited: true };
				if (target.best && dirty) delete target.best[level];
				await L().saveSong(target);
				dirty = false;
				dirtyMark.hidden = true;
				status.textContent = isBuiltin ? `Saved as "${target.title}" in your Rhythm Library. Editing continues on that copy.` : "Saved.";
				if (isBuiltin) {
					cleanup.destroy();
					if (canvas.isConnected) open(ui, target.id, level, status.textContent);
				}
				return target;
			} catch (e) {
				status.textContent = e.message && !String(e.name).includes("Quota") ? e.message : L().storageMessage(e);
				return null;
			}
		}
		const confirmLeave = h("div", { class: "rh-row", hidden: true });
		confirmLeave.append(
			h("span", null, "Leave without saving your changes?"),
			button("Leave", () => ui.menu("library")),
			button("Stay", () => (confirmLeave.hidden = true))
		);

		const levelGroup = h(
			"div",
			{ class: "rh-levels", role: "group", "aria-label": "Chart to edit" },
			levels.map(l =>
				button(
					levelName(l),
					() => {
						if (l === level) return;
						if (dirty) {
							status.textContent = "Save or revert this chart before switching level.";
							return;
						}
						cleanup.destroy();
						open(ui, id, l);
					},
					{ "aria-pressed": l === level ? "true" : "false" }
				)
			)
		);

		const keydown = e => {
			if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
			if (!field.contains(document.activeElement)) return;
			const step = Math.round(grid() * 1000);
			const actions = {
				ArrowLeft: () => selected && (selected.x = Math.max(0.05, selected.x - 0.02)),
				ArrowRight: () => selected && (selected.x = Math.min(0.95, selected.x + 0.02)),
				ArrowUp: () => selected && (selected.t = Math.max(0, selected.t - step)),
				ArrowDown: () => selected && (selected.t += step),
				Delete: () => selected && (notes.splice(notes.indexOf(selected), 1), (selected = null)),
				Backspace: () => selected && (notes.splice(notes.indexOf(selected), 1), (selected = null)),
				PageUp: () => (pageIndex = Math.max(0, pageIndex - 1)),
				PageDown: () => (pageIndex += 1),
			};
			const fn = actions[e.key];
			if (!fn) return;
			e.preventDefault();
			const before = JSON.stringify(notes);
			fn();
			if (JSON.stringify(notes) !== before) {
				sortNotes();
				markDirty();
			}
			refresh();
		};

		let observer = null;
		const cleanup = {
			keydown,
			visibility: () => document.hidden && previewing && stopPreview(),
			destroy: () => {
				previewing = false;
				cancelAnimationFrame(raf);
				if (observer) observer.disconnect();
				ui.stopPreview();
			},
		};

		ui.show(
			h(
				"div",
				{ class: "rh-editor" },
				h("div", { class: "rh-game-head" }, h("h3", { class: "rh-head" }, `Chart editor: ${song.title}`), dirtyMark),
				isBuiltin
					? h("p", { class: "rh-song-sub" }, "This song comes with the game. Saving puts an edited copy in your Rhythm Library; the original stays as it is.")
					: null,
				levelGroup,
				typeGroup,
				snapGroup,
				field,
				h("div", { class: "rh-row" }, button("Previous page", goPage(-1)), pageLabel, button("Next page", goPage(1))),
				h("div", { class: "rh-row" }, pageBtn, playBtn),
				selPanel,
				h("h4", { class: "con-subhead" }, "Whole chart"),
				h("div", { class: "rh-row" }, h("label", { class: "rh-field-row" }, h("span", null, "Shift every note (ms)"), shift), button("Shift", applyShift)),
				h(
					"div",
					{ class: "rh-row" },
					h("label", { class: "rh-field-row" }, h("span", null, "BPM"), bpm),
					h("label", { class: "rh-field-row" }, h("span", null, "First beat (ms)"), first),
					button("Apply beat grid", applyGrid)
				),
				h(
					"div",
					{ class: "rh-row" },
					button("Make this level again automatically", () => (confirmRegen.hidden = false))
				),
				confirmRegen,
				status,
				h(
					"div",
					{ class: "rh-row" },
					button("Save", () => save()),
					button("Revert to saved", () => {
						cleanup.destroy();
						open(ui, id, level);
					}),
					button("Save and export", async () => {
						const target = await save();
						if (target) ui.exportJson("song", { songIds: [target.id], name: target.title });
					}),
					button("Back to the library", () => (dirty ? (confirmLeave.hidden = false) : ui.menu("library")))
				),
				confirmLeave
			),
			cleanup
		);
		if (window.ResizeObserver) {
			observer = new ResizeObserver(() => {
				view.resize();
				refresh();
			});
			observer.observe(field);
		}
		view.resize();
		refresh();
	}

	setup.rhythmEditor = Object.freeze({ open });
})();
