/* globals pocketLockReason, saveAs */
window.PocketMusic = (() => {
	const audio = new Audio();
	audio.preload = "none";
	const files = new Map();
	let songs;
	let favourites = new Set();
	let current;
	let active = false;
	let paused = false;
	let mode = "all";
	let repeat = false;
	let objectURL;
	let message = "";
	let failed = false;
	let generation = 0;
	let search = "";
	let resumeAt = 0;

	function available() {
		return playerWearsHeadphones();
	}

	function library() {
		if (!songs) {
			songs = setup.pocketMusicTracks.map(path => ({
				id: path,
				title: path
					.split("/")
					.pop()
					.replace(/\.[^.]+$/, ""),
				path,
			}));
		}
		return songs;
	}

	function refresh() {
		const pane = document.getElementById("pocketMusic");
		if (pane) pane.replaceWith(render());
	}

	function release() {
		generation++;
		audio.pause();
		audio.removeAttribute("src");
		audio.load();
		if (objectURL) URL.revokeObjectURL(objectURL);
		objectURL = undefined;
	}

	function stop(restore = true) {
		active = false;
		paused = false;
		release();
		if (restore) Wikifier.wikifyEval("<<update-audio>>");
		refresh();
	}

	function update() {
		if (!active) return;
		if (!available() || V.options?.audio !== 1 || V.location === "banner") {
			resumeAt = audio.currentTime || 0;
			stop(false);
			return;
		}
		audio.volume = Math.clamp((V.options.mastervolume ?? 0) * (V.options.bgm_volume ?? 1), 0, 1);
		audio.muted = !!(V.options.muteonhide && document.hidden);
	}

	function resume() {
		const attempt = generation;
		paused = false;
		audio.play().catch(() => {
			if (generation !== attempt) return;
			message = "This song could not play. Try another file or press Play again.";
			failed = true;
			stop();
		});
	}

	function play(id, automatic = false) {
		if (!available() || (!automatic && pocketLockReason())) return;
		if (V.options?.audio !== 1) {
			message = "Enable audio in Settings to listen to music";
			failed = true;
			refresh();
			return;
		}
		const song = library().find(entry => entry.id === id);
		if (!song) return;
		if (!song.path && !files.has(id)) {
			message = `Select the music file again: ${song.title}`;
			failed = true;
			refresh();
			return;
		}
		const startAt = id === current ? resumeAt : 0;
		resumeAt = 0;
		release();
		current = id;
		active = true;
		message = "";
		failed = false;
		Wikifier.wikifyEval('<<bgm "stop">>');
		if (song.path) audio.src = song.path;
		else {
			objectURL = URL.createObjectURL(files.get(id));
			audio.src = objectURL;
		}
		if (startAt) audio.currentTime = startAt;
		update();
		resume();
		refresh();
	}

	function inMode(song) {
		if (mode === "favourites") return favourites.has(song.id);
		if (mode === "uploaded") return !song.path;
		return true;
	}

	function next(direction = 1, automatic = false) {
		const queue = library().filter(song => inMode(song) && (song.path || files.has(song.id)));
		if (!queue.length) {
			stop();
			return;
		}
		const index = queue.findIndex(song => song.id === current);
		const target = index < 0 ? (direction > 0 ? 0 : queue.length - 1) : (index + direction + queue.length) % queue.length;
		play(queue[target].id, automatic);
	}

	function importFiles(selected) {
		for (const file of selected) {
			if (!file.type.startsWith("audio/") && !/\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(file.name)) continue;
			const id = `file:${JSON.stringify([file.name, file.size, file.lastModified])}`;
			files.set(id, file);
			if (!library().some(song => song.id === id)) library().push({ id, title: file.name.replace(/\.[^.]+$/, "") });
		}
		message = "Files added for this session.";
		failed = false;
		refresh();
	}

	/* Personal files travel inside the preset as base64, so loading it restores the audio too. */
	async function exportPreset() {
		message = "Preparing preset...";
		failed = false;
		refresh();
		const presetSongs = [];
		for (const { id, title } of library()) {
			const file = files.get(id);
			if (!file) {
				presetSongs.push({ id, title });
				continue;
			}
			const bytes = new Uint8Array(await file.arrayBuffer());
			let binary = "";
			for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
			presetSongs.push({ id, title, mime: file.type || "audio/mpeg", audio: btoa(binary) });
		}
		const preset = { type: "dol-music", version: 2, mode, repeat, songs: presetSongs, favourites: [...favourites] };
		saveAs(new Blob([JSON.stringify(preset)], { type: "application/json" }), "music-playlist.json");
		message = files.size ? "Preset saved with your music inside." : "Preset saved.";
		refresh();
	}

	async function importPreset(file) {
		if (!file) return;
		try {
			if (file.size > 500 * 1024 * 1024) throw new Error();
			const data = JSON.parse(await file.text());
			if (
				data.type !== "dol-music" ||
				![1, 2].includes(data.version) ||
				!["all", "one", "favourites", "uploaded"].includes(data.mode) ||
				!Array.isArray(data.songs) ||
				data.songs.length > 5000 ||
				!Array.isArray(data.favourites) ||
				!data.songs.every(
					song =>
						song &&
						typeof song.id === "string" &&
						song.id.length < 2000 &&
						typeof song.title === "string" &&
						song.title.length < 500 &&
						(song.audio === undefined || typeof song.audio === "string")
				) ||
				!data.favourites.every(id => typeof id === "string")
			)
				throw new Error();
			const existing = new Map(library().map(song => [song.id, song]));
			const ordered = new Map();
			for (const song of data.songs) {
				if (song.audio && song.id.startsWith("file:")) {
					const binary = atob(song.audio);
					const bytes = new Uint8Array(binary.length);
					for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
					files.set(song.id, new Blob([bytes], { type: typeof song.mime === "string" ? song.mime : "audio/mpeg" }));
				}
				if (existing.has(song.id)) ordered.set(song.id, existing.get(song.id));
				else if (song.id.startsWith("file:")) ordered.set(song.id, { id: song.id, title: song.title });
			}
			for (const song of library()) if (!ordered.has(song.id)) ordered.set(song.id, song);
			songs = [...ordered.values()];
			favourites = new Set(data.favourites.filter(id => ordered.has(id)));
			mode = data.mode === "one" ? "all" : data.mode;
			repeat = data.mode === "one" || data.repeat === true;
			failed = false;
			message = songs.some(song => !song.path && !files.has(song.id))
				? "Preset loaded. Some songs were saved without audio: pick those files again to play them."
				: "Preset loaded.";
		} catch {
			message = "This is not a valid music playlist preset.";
			failed = true;
		}
		refresh();
	}

	function render() {
		const pane = document.createElement("div");
		pane.id = "pocketMusic";
		const text = (parent, tag, value) => {
			const node = document.createElement(tag);
			node.textContent = value;
			parent.append(node);
			return node;
		};
		const button = (parent, label, action, disabled = false) => {
			const node = text(parent, "button", label);
			node.type = "button";
			node.disabled = disabled;
			node.addEventListener("click", action);
			return node;
		};
		if (!available() || pocketLockReason()) {
			const locked = text(pane, "p", pocketLockReason() || "Wear headphones to listen to music.");
			if (pocketLockReason()) locked.className = "red";
			return pane;
		}
		const player = text(pane, "section", "");
		player.className = "pocket-music-player pocket-slot";
		const status = text(player, "div", active ? (paused ? "Paused" : "Now playing") : "Nothing playing");
		status.className = "pocket-music-status";
		text(player, "div", active ? library().find(song => song.id === current)?.title : "Pick a song from the library below").className = "pocket-music-now";
		const seek = text(player, "div", "");
		seek.className = "pocket-music-seek";
		const bar = document.createElement("input");
		bar.type = "range";
		bar.id = "pocketMusicSeek";
		bar.min = 0;
		bar.step = 1;
		bar.disabled = !active;
		bar.setAttribute("aria-label", "Song position");
		bar.addEventListener("input", () => {
			audio.currentTime = Number(bar.value);
			showTime();
		});
		seek.append(bar);
		const times = text(seek, "div", "");
		times.className = "pocket-music-times";
		text(times, "span", "0:00").id = "pocketMusicElapsed";
		text(times, "span", "0:00").id = "pocketMusicDuration";
		queueMicrotask(showTime);
		const controls = text(player, "div", "");
		controls.className = "pocket-music-controls";
		const icon = (node, label, svg) => {
			node.textContent = "";
			node.title = label;
			node.setAttribute("aria-label", label);
			node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${svg}</svg>`;
			return node;
		};
		icon(
			button(controls, "", () => stop(), !active),
			"Stop",
			'<rect x="6" y="6" width="12" height="12" rx="1"/>'
		);
		icon(
			button(controls, "", () => next(-1)),
			"Previous",
			'<rect x="5" y="5" width="2.5" height="14" rx="1"/><path d="M19 5v14L8.5 12z"/>'
		);
		const toggle = icon(
			button(controls, "", () => {
				if (!active) {
					if (current && library().some(song => song.id === current)) play(current);
					else next();
				} else if (paused) {
					resume();
					refresh();
				} else {
					audio.pause();
					paused = true;
					refresh();
				}
			}),
			active && !paused ? "Pause" : "Play",
			active && !paused ? '<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>' : '<path d="M8 5v14l11-7z"/>'
		);
		toggle.classList.add("pocket-music-main");
		icon(
			button(controls, "", () => next()),
			"Next",
			'<rect x="16.5" y="5" width="2.5" height="14" rx="1"/><path d="M5 5v14l10.5-7z"/>'
		);
		const repeatButton = icon(
			button(controls, "", () => {
				repeat = !repeat;
				refresh();
			}),
			"Repeat one",
			'<path d="M7 7h9l-2-2m2 2-2 2M17 17H8l2 2m-2-2 2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="14.5" font-size="7" text-anchor="middle" font-weight="700">1</text>'
		);
		repeatButton.setAttribute("aria-pressed", String(repeat));
		const modes = text(player, "div", "");
		modes.className = "pocket-music-modes";
		modes.setAttribute("role", "group");
		modes.setAttribute("aria-label", "Playback");

		/* Force Play: above the buttons */
		modes.style.display = "flex";
		modes.style.flexDirection = "column";
		modes.style.alignItems = "flex-start";

		text(modes, "div", "Play:");

		const modeButtons = text(modes, "div", "");
		modeButtons.style.display = "flex";
		modeButtons.style.flexWrap = "wrap";

		for (const [value, title] of [
			["all", "All songs"],
			["favourites", "Favourites"],
			["uploaded", "Uploaded"],
		]) {
			button(modeButtons, title, () => {
				mode = value;
				refresh();
			}).setAttribute("aria-pressed", String(mode === value));
		}
		text(player, "div", "Volume follows the BGM setting.").className = "pocket-music-hint";
		if (message) {
			const notice = text(pane, "p", message);
			notice.setAttribute("role", "status");
			if (failed) notice.className = "red";
		}
		const imports = text(pane, "section", "");
		imports.className = "pocket-section pocket-music-imports";
		text(imports, "div", "Your own music").className = "pocket-section-header";
		text(
			imports,
			"p",
			"Add audio files from your device. They stay until you close or reload the game. Save a preset to keep them: it stores your songs, order, and favourites in one file so loading it brings everything back. Presets with many songs are large files."
		).className = "pocket-music-hint";
		const picker = (title, accept, multiple, action) => {
			const row = text(imports, "label", title);
			row.className = "pocket-music-field";
			const input = document.createElement("input");
			input.type = "file";
			input.accept = accept;
			input.multiple = multiple;
			input.addEventListener("change", () => action(input.files));
			row.append(input);
		};
		picker("Add music", "audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.opus", true, importFiles);
		picker("Load preset", ".json,application/json", false, selected => importPreset(selected[0]));
		const saveRow = text(imports, "div", "");
		saveRow.className = "pocket-music-field";
		text(saveRow, "span", "Save preset");
		button(saveRow, "Download preset file", () =>
			exportPreset().catch(() => {
				message = "The preset could not be saved. Try again with fewer songs.";
				failed = true;
				refresh();
			})
		);
		const libraryHeader = text(pane, "div", "");
		libraryHeader.className = "pocket-section-header pocket-music-library-header";
		text(libraryHeader, "span", "Library");
		text(libraryHeader, "span", `${library().length} songs · ${favourites.size} favourites`).className = "pocket-music-count";
		const searchLabel = text(pane, "label", "Search");
		searchLabel.className = "pocket-music-field";
		const searchInput = document.createElement("input");
		searchInput.type = "search";
		searchInput.value = search;
		searchInput.placeholder = "Song or artist";
		searchLabel.append(searchInput);
		const list = text(pane, "ol", "");
		list.className = "pocket-music-list";
		const rows = [];
		for (const song of library()) {
			if (!inMode(song)) continue;
			const missing = !song.path && !files.has(song.id);
			const row = text(list, "li", "");
			row.className = active && current === song.id ? "pocket-music-song current" : "pocket-music-song";
			rows.push({ row, title: song.title.toLowerCase() });
			const title = text(row, "span", song.title);
			title.className = "pocket-music-title";
			if (missing) text(title, "span", " (pick the file again)").className = "pocket-music-hint";
			const actions = text(row, "div", "");
			actions.className = "pocket-music-controls";
			button(actions, active && current === song.id ? "Playing" : "Play", () => play(song.id), missing);
			const favourite = button(actions, favourites.has(song.id) ? "★" : "☆", () => {
				if (favourites.has(song.id)) favourites.delete(song.id);
				else favourites.add(song.id);
				refresh();
			});
			favourite.className = "pocket-music-fav";
			favourite.setAttribute("aria-label", `Favourite ${song.title}`);
			favourite.setAttribute("aria-pressed", String(favourites.has(song.id)));
			button(
				actions,
				"↑",
				() => {
					const index = songs.indexOf(song);
					[songs[index - 1], songs[index]] = [songs[index], songs[index - 1]];
					refresh();
				},
				songs.indexOf(song) === 0
			).setAttribute("aria-label", `Move ${song.title} up`);
			if (!song.path)
				button(actions, "Remove", () => {
					if (current === song.id && active) stop();
					files.delete(song.id);
					favourites.delete(song.id);
					songs = songs.filter(entry => entry !== song);
					refresh();
				});
		}
		const empty = text(
			pane,
			"p",
			mode === "uploaded" && !rows.length
				? "No uploaded songs yet. Use Add music above to add files from your device."
				: "No songs here. Add favourites from All songs, or try another search."
		);
		empty.className = "pocket-empty";
		const filter = () => {
			search = searchInput.value;
			for (const entry of rows) entry.row.hidden = !entry.title.includes(search.toLowerCase().trim());
			empty.hidden = rows.some(entry => !entry.row.hidden);
		};
		searchInput.addEventListener("input", filter);
		filter();
		return pane;
	}

	const clock = seconds => {
		const whole = Math.floor(Number.isFinite(seconds) ? seconds : 0);
		return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
	};
	/* Updates the bar in place; a full refresh every tick would reset focus and the search box. */
	function showTime() {
		const bar = document.getElementById("pocketMusicSeek");
		if (!bar) return;
		const duration = active && Number.isFinite(audio.duration) ? audio.duration : 0;
		const time = active ? audio.currentTime || 0 : 0;
		bar.max = Math.floor(duration) || 0;
		bar.value = Math.floor(time);
		bar.style.setProperty("--progress", duration ? `${(time / duration) * 100}%` : "0%");
		document.getElementById("pocketMusicElapsed").textContent = clock(time);
		document.getElementById("pocketMusicDuration").textContent = clock(duration);
	}
	audio.addEventListener("timeupdate", showTime);
	audio.addEventListener("loadedmetadata", showTime);
	audio.addEventListener("ended", () => {
		if (!active) return;
		if (repeat) play(current, true);
		else next(1, true);
	});
	audio.addEventListener("error", () => {
		if (!active || !audio.error) return;
		message = "This song could not play. Try another file.";
		failed = true;
		stop();
	});
	document.addEventListener("visibilitychange", update);
	$(document).on(":passageinit.pocketMusic", update);
	Macro.add("pocketMusicControls", {
		handler() {
			this.output.appendChild(render());
		},
	});
	return {
		available,
		update,
		get active() {
			return active;
		},
	};
})();
