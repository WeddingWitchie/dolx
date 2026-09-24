/* Initialise sky canvas on loading a save */
$(document).on(":onloadsave", () => {
	if (V.options.weatherUpdate === false || !Weather.sidebar) return;
	Weather.activeRenderer = Weather.sidebar;
	if (!Weather.sidebar.loaded.value) return;
	Weather.Observables?.checkForUpdate?.(true);
});

/* Clear all layers on restart */
$(document).on(":enginerestart", () => {
	Weather.sidebar?.stopAll();
});

/* Give the start menu a valid date once its passage has rendered */
$(document).on(":passageend", () => {
	if (State.passage !== "Start") return;
	Time.set(new DateTime(2022, 8, 10, 23, 45));
	// Older builds stored these for the removed animated title banner.
	["time", "weather", "worldCorruption"].forEach(key => localStorage.removeItem(key));
});

/* Initialise sky canvas on page refresh */
$(document).on(":passagestart", () => {
	// Nothing to set up on the start menu - the title banner is a static image
	if (["Start", "Clothes Testing", "Renderer Test Page", "Tips"].includes(State.passage)) {
		if (State.passage === "Start") {
			// Set temporary weatherObj for Start menu
			V.weatherObj = {
				snow: 0,
				ice: {},
				monthlyTemperatures: [],
				keypointsArr: [],
				previousWeatherIndex: 0,
				fogKeypoints: [],
			};
			Time.set(0);
			Weather.activeRenderer = Weather.sidebar;
		}
		return;
	}

	// Return if sidebar has already been initialised
	if (!V.weatherObj || V.options.weatherUpdate === false || Weather.sidebar?.loaded.value) return;
	Weather.activeRenderer = Weather.sidebar;
	Weather.sidebar.initialize();
});

$(document).one(":passagerender", () => {
	if (!StartConfig.enableImages) return;
	Weather.Thermometer.load();
});
