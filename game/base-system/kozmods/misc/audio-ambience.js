/* globals SimpleAudio, Weather */
window.AmbienceAudio = (() => {
	const weatherTracks = {
		lightClouds: ["light-clouds"],
		heavyClouds: ["heavy-clouds"],
		lightPrecipitation: ["rain", "light-precipitation"],
		heavyPrecipitation: ["rain", "heavy-precipitation", "light-precipitation"],
		storm: ["rain", "heavy-precipitation", "light-precipitation", "storm"],
		thunderstorm: ["thunderstorm"],
	};
	const tracks = new Map();
	const pending = new Set();
	const looping = new WeakSet();
	let context;
	let filter;
	let lastLightning = -Infinity;
	let lightningIndex = 0;

	function getTrack(name) {
		if (!tracks.has(name)) {
			const id = `ambience-${name}`;
			SimpleAudio.tracks.add(id, [`audio/sfx/ambience/rain/${name}.mp3`]);
			const track = SimpleAudio.tracks.get(id);
			// Browsers treat file:// media as cross-origin and silence it through Web Audio.
			if (window.location.protocol !== "file:" && (window.AudioContext || window.webkitAudioContext)) {
				if (!context) {
					context = new (window.AudioContext || window.webkitAudioContext)();
					filter = context.createBiquadFilter();
					filter.type = "lowpass";
					filter.Q.value = 0.7;
					filter.connect(context.destination);
				}
				context.createMediaElementSource(track.audio).connect(filter);
			}
			track.audio.addEventListener("timeupdate", () => {
				if (looping.has(track) && track.audio.duration - track.audio.currentTime <= 0.5) {
					track.audio.currentTime = 0;
				}
			});
			tracks.set(name, track);
		}
		return tracks.get(name);
	}

	function volume() {
		return (V.options.ambience_volume ?? 1) * (V.outside ? 1 : 0.1);
	}

	function play(track, loop) {
		if (context) {
			filter.frequency.setTargetAtTime(V.outside ? 22000 : 650, context.currentTime, 0.08);
			if (context.state === "suspended") {
				context.resume().catch(() => {});
				$(document)
					.off(".ambienceContext")
					.one("pointerup.ambienceContext keydown.ambienceContext", () => {
						context.resume().catch(() => {});
					});
			}
		}
		track.volume(volume()).loop(loop);
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
		if (filter) filter.frequency.setTargetAtTime(V.outside ? 22000 : 650, context.currentTime, 0.08);
		const wanted = new Set();
		const enabled = V.options?.audio === 1 && (V.options.ambience_volume ?? 1) > 0 && V.location && V.location !== "banner";
		if (enabled) {
			const weather = V.weatherObj && weatherTracks[Weather.name];
			if (weather) weather.forEach(track => wanted.add(track));
		}
		for (const [name, track] of tracks) {
			if (name.startsWith("lightning")) {
				if (!enabled || !Weather.enableLightning) track.stop();
				else track.volume(volume());
			} else if (!wanted.has(name)) {
				looping.delete(track);
				track.loop(false);
				track.stop();
				if (!track.isUnloaded()) track.unload();
			}
		}
		for (const name of wanted) play(getTrack(name), true);
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

	$(document).on(":onWeatherChange.ambience", update);

	return { update, lightning };
})();
