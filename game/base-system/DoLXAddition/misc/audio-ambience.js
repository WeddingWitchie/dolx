/* globals SimpleAudio, Weather, Save, Wikifier */
window.AmbienceAudio = (() => {
	const weatherTracks = {
		lightPrecipitation: ["rain", "light-precipitation"],
		heavyPrecipitation: ["rain", "heavy-precipitation", "light-precipitation"],
		storm: ["rain", "heavy-precipitation", "light-precipitation", "storm"],
		thunderstorm: ["thunderstorm"],
	};
	// Snowfall uses the wind recordings in ambience/snow instead of rain.
	const snowTracks = {
		lightPrecipitation: ["wind"],
		heavyPrecipitation: ["wind", "heavyPrecipitation"],
		storm: ["wind", "storm"],
		thunderstorm: ["wind", "storm", "thunderstorm"],
	};
	const tracks = new Map();
	const pending = new Set();
	const looping = new WeakSet();
	let context;
	let filter;
	let lastLightning = -Infinity;
	let lightningIndex = 0;

	/* One AudioContext for the game: the weather filter and synthesized effects share it. */
	function audioContext() {
		if (!context && (window.AudioContext || window.webkitAudioContext)) {
			context = new (window.AudioContext || window.webkitAudioContext)();
			filter = context.createBiquadFilter();
			filter.type = "lowpass";
			filter.Q.value = 0.7;
			filter.connect(context.destination);
		}
		return context;
	}

	function getTrack(name, folder = "rain") {
		const key = folder ? `${folder}/${name}` : name;
		if (!tracks.has(key)) {
			const id = `ambience-${key}`;
			SimpleAudio.tracks.add(id, [`audio/sfx/ambience/${folder ? folder + "/" : ""}${name}.mp3`]);
			const track = SimpleAudio.tracks.get(id);
			// Browsers treat file:// media as cross-origin and silence it through Web Audio.
			if (window.location.protocol !== "file:" && audioContext()) {
				context.createMediaElementSource(track.audio).connect(filter);
			}
			track.audio.addEventListener("timeupdate", () => {
				if (looping.has(track) && track.audio.duration - track.audio.currentTime <= 0.5) {
					track.audio.currentTime = 0;
				}
			});
			tracks.set(key, track);
		}
		return tracks.get(key);
	}

	/* How much of the outside weather reaches the player, and how muffled it is. Always worked out from scratch, so moving around never compounds it.
	   The whole island is under Arcology's dome: its streets sound like a town interior, its buildings more muffled still. The ship keeps town rules. */
	function surroundings() {
		if (setup.arcology?.inCity()) return setup.arcology.isStreet() ? { gain: 0.3, cutoff: 650 } : { gain: 0.15, cutoff: 350 };
		return V.outside ? { gain: 1, cutoff: 22000 } : { gain: 0.3, cutoff: 650 };
	}

	function volume(muffled = true) {
		return (V.options.ambience_volume ?? 1) * (muffled ? surroundings().gain : 1);
	}

	function play(track, loop, muffled = true) {
		if (context) {
			filter.frequency.setTargetAtTime(surroundings().cutoff, context.currentTime, 0.08);
			if (context.state === "suspended") {
				context.resume().catch(() => {});
				$(document)
					.off(".ambienceContext")
					.one("pointerup.ambienceContext keydown.ambienceContext", () => {
						context.resume().catch(() => {});
					});
			}
		}
		track.volume(volume(muffled)).loop(loop);
		if (loop) looping.add(track);
		else looping.delete(track);
		if (track.isPlaying() || pending.has(track)) return;
		if (track.isUnloaded()) track.load();
		pending.add(track);
		track
			.play()
			.then(() => {
				if (loop && !looping.has(track)) {
					track.stop();
					track.unload();
				}
			})
			.catch(error => {
				// Re-evaluate the current location on unlock, never replay an obsolete loop or strike.
				if (loop && error.name === "NotAllowedError") {
					$(document).off(".ambienceUnlock").one("pointerup.ambienceUnlock keydown.ambienceUnlock", update);
				}
			})
			.finally(() => pending.delete(track));
	}

	function update() {
		if (filter) filter.frequency.setTargetAtTime(surroundings().cutoff, context.currentTime, 0.08);
		const wanted = new Set();
		const enabled = V.options?.audio === 1 && (V.options.ambience_volume ?? 1) > 0 && V.location && V.location !== "banner";
		if (enabled) {
			const folder = Weather.precipitation === "snow" && snowTracks[Weather.name] ? "snow" : "rain";
			const weather = V.weatherObj && (folder === "snow" ? snowTracks : weatherTracks)[Weather.name];
			if (weather) weather.forEach(track => wanted.add(`${folder}/${track}`));
		}
		for (const [name, track] of tracks) {
			if (name.startsWith("rain/lightning")) {
				if (!enabled || !Weather.enableLightning) track.stop();
				else track.volume(volume());
			} else if (name === "money" || name === "meds") {
				if (!enabled) track.stop();
				else track.volume(volume(false));
			} else if (!wanted.has(name)) {
				looping.delete(track);
				track.loop(false);
				track.stop();
				if (!track.isUnloaded()) track.unload();
			}
		}
		for (const key of wanted) {
			const [folder, name] = key.split("/");
			play(getTrack(name, folder), true);
		}
		if (!enabled) {
			$(document).off(".ambienceUnlock");
			lastLightning = -Infinity;
		}
	}

	function lightning(renderer) {
		if (renderer !== Weather.sidebar || V.options?.audio !== 1 || (V.options.ambience_volume ?? 1) <= 0 || V.location === "banner" || !Weather.enableLightning)
			return;
		const now = Date.now();
		lightningIndex = now - lastLightning < 10000 ? (lightningIndex + 1) % 3 : 0;
		lastLightning = now;
		const track = getTrack(["lightning", "lightning2", "lightning3"][lightningIndex]);
		track.stop();
		play(track, false);
	}

	function effect(name) {
		if (V.options?.audio !== 1 || (V.options.ambience_volume ?? 1) <= 0) return;
		const track = getTrack(name, "");
		track.stop();
		play(track, false, false);
	}

	$(document).on(":onWeatherChange.ambience", update);
	// The previous save's theme must not inherit the loaded save's volume and keep playing; the new passage picks its own.
	Save.onLoad.add(() => Wikifier.wikifyEval('<<bgm "stop">>'));

	return { update, lightning, effect, context: audioContext, surroundings };
})();
