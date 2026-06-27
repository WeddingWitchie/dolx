Weather.Observables = (() => {
	// Schedules the updates so that the same layers don't update multiple times by different bindings
	// Uses promises since scheduled code is sometimes asyncronous
	class UpdateScheduler {
		constructor() {
			this.updates = new Map();
			this.scheduled = false;
		}

		scheduleUpdate(layerKey, update) {
			this.updates.set(layerKey, update);
			if (!this.scheduled) {
				this.scheduled = true;
				Promise.resolve().then(() => this.executeUpdates());
			}
		}

		executeUpdates() {
			const promises = [];

			this.updates.forEach((update, key) => {
				if (key !== "all") {
					const updatePromise = Promise.resolve().then(() => update(!!this.updates.get("all")));
					promises.push(updatePromise);
					this.updates.delete(key);
				}
			});

			// Wait for all layer updates to complete before executing "all" update
			Promise.all(promises).then(() => {
				const allUpdate = this.updates.get("all");
				if (allUpdate) {
					allUpdate();
				}
				this.updates.clear();
				this.scheduled = false;
			});
		}
	}

	const scheduler = new UpdateScheduler();
	const observables = {};
	const changedKeys = new Map();
	let updatesSubscribed = false;
	let passageEndBound = false;

	Object.keys(setup.WeatherBindings).forEach(key => (observables[key] = new ObservableValue(null)));

	const setBindings = (force = false) => {
		if (V.options.weatherUpdate === false) {
			if (Weather.sidebar?.loaded.value) Weather.sidebar.stopAll();
			return;
		}
		if (V.weatherObj && Weather.sidebar && !Weather.sidebar.loaded.value && !Weather.sidebar.loading) {
			Weather.activeRenderer = Weather.sidebar;
			Weather.sidebar.initialize();
			return;
		}
		const forceSidebarRefresh = force && Weather.sidebar?.loaded.value;
		if (Weather.sidebar?.loaded.value) Weather.Tooltips.skybox();
		if (forceSidebarRefresh) subscribeToUpdates();
		Object.entries(setup.WeatherBindings).forEach(([key, config]) => {
			const previous = observables[key].value;
			const value = config.variable();
			observables[key].value = value;
			if (forceSidebarRefresh && previous === value) {
				observables[key]._notifyListeners(value, changedKeys.get(key));
			}
			if (forceSidebarRefresh) changedKeys.set(key, value);
		});
	};

	const subscribeToUpdates = () => {
		if (updatesSubscribed) return;
		updatesSubscribed = true;
		Object.entries(setup.WeatherBindings).forEach(([key, config]) => {
			observables[key].subscribe(value => {
				if (value === undefined) return;
				config.layers.forEach(layer => {
					scheduler.scheduleUpdate(layer, async draw => {
						if (layer === "all") {
							Weather.Tooltips.skybox();
							Weather.sidebar.updateOrbits();
							Weather.sidebar.drawLayers();
						} else {
							await Weather.sidebar.layers.get(layer).init();
							if (!draw) Weather.sidebar.drawLayers(layer);
						}
					});
				});
			});
		});
	};

	$(document).one(":passageend", () => {
		setBindings();
		Object.keys(observables).forEach(key => {
			changedKeys.set(key, observables[key].value);
		});
	});

	Weather.sidebar?.loaded.subscribe(loaded => {
		if (!loaded) return;
		setBindings();
		subscribeToUpdates();

		// Check if values were changed between page load and Weather.sidebar finished loading
		Object.keys(observables).forEach(key => {
			if (changedKeys.get(key) === observables[key].value) {
				observables[key]._notifyListeners(observables[key].value, changedKeys.get(key));
			}
		});
		if (!passageEndBound) {
			$(document).on(":passageend", setBindings);
			passageEndBound = true;
		}
	});

	return {
		objects: observables,
		checkForUpdate: setBindings,
	};
})();
