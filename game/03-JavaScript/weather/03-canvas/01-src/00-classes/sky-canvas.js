Weather.Renderer.Sky = class {
	constructor(settings) {
		this.Canvas = class extends BaseCanvas {
			constructor(width, height) {
				const scaledWidth = width ?? settings.setup.size[0];
				const scaledHeight = height ?? settings.setup.size[1];
				super(scaledWidth, scaledHeight, settings.setup.scale);
			}
		};

		const requiredParams = ["id", "setup", "layers"];
		requiredParams.forEach(param => {
			if (!settings || !settings[param]) {
				throw new Error(`Error creating new Sky instance: Missing parameter: '${param}'`);
			}
		});

		this.skybox = $("<div />", { id: settings.id });
		this.settings = settings.setup;
		this.layerList = settings.layers;
		this.resizable = settings.resizable;

		this.mainLayer = new this.Canvas();
		this.mainLayer.element.width = this.settings.size[0];
		this.mainLayer.element.height = this.settings.size[1];

		this.rng = new PRNG();

		if (this.resizable && typeof ResizeObserver === "function") {
			// Only trigger the resize event if the actual element is resized
			new ResizeObserver(e => {
				this.mainLayer.resize(e[0].contentRect.right, e[0].contentRect.bottom);
			}).observe(this.skybox[0]);
		}

		this.layers = new Map();
		this.orbitals = {};

		/*
		 * Increased by stopAll.
		 * If a layer finishes loading after the sky has been stopped, Layer.init detects the change and cancels its animation.
		 */
		this.teardownToken = 0;

		/* Composite state. See drawLayers and requestDrawLayers. */
		this.compositeCanvas = null;
		this.compositeInFlight = null;
		this.pendingLayers = new Set();
		this.pendingAllLayers = false;
		this.pendingFrameId = null;

		this.loaded = new ObservableValue(false);
		this.loading = false;
		this.initializationPromise = null;

		this.skybox.append(this.mainLayer.canvas);
	}

	/**
	 * @param {object} objA Position object {x, y, width, height}
	 * @param {object} objB Position object {x, y, width, height}
	 * @param {number} modifier 0-1
	 * @returns {boolean}
	 */
	static isOverlapping(objA, objB, modifier = 1) {
		const xOverlap = Math.max(0, Math.min(objA.x + objA.width, objB.x + objB.width) - Math.max(objA.x, objB.x));
		const yOverlap = Math.max(0, Math.min(objA.y + objA.height, objB.y + objB.height) - Math.max(objA.y, objB.y));

		const intersectionArea = xOverlap * yOverlap;
		const minOverlapArea = objA.width * objA.height * modifier;
		return intersectionArea >= minOverlapArea;
	}

	static isOverlappingAny(objA, objList, modifier) {
		if (!objList.length) return false;
		for (const objB of objList) {
			if (this.isOverlapping(objA, objB, modifier)) {
				return true;
			}
		}
		return false;
	}

	sortLayersByZIndex() {
		const sortedLayers = new Map([...this.layers.entries()].sort((a, b) => a[1].zIndex - b[1].zIndex));
		this.layers.clear();
		sortedLayers.forEach((value, key) => {
			this.layers.set(key, value);
		});
	}

	/**
	 * Executes once - when page is loaded
	 */
	initialize() {
		if (this.loaded.value) return this.initializationPromise || Promise.resolve();
		if (this.loading) {
			// Re-enabling can arrive before a cancelled initialization has finished.
			return this.initializationPromise.then(() => {
				if (!this.loaded.value && V.options.weatherUpdate !== false) return this.initialize();
			});
		}
		this.loading = true;
		this.initSun();
		this.initMoon();
		this.setupLayers();
		this.initializationPromise = this.setupCanvas().finally(() => {
			this.loading = false;
		});
		return this.initializationPromise;
	}

	setupLayers() {
		// Add selected layers
		Weather.Renderer.Layers.layers.forEach((value, key) => {
			if (this.layerList.includes(key)) {
				this.layers.set(key, value);
			}
		});
	}

	async setupCanvas() {
		const token = this.teardownToken;
		const loadPromises = Array.from(this.layers.values()).flatMap(layer => layer.loadPromises);

		// Sequentially await each promise in loadPromises
		for (const loadPromise of loadPromises) {
			try {
				await loadPromise;
			} catch (error) {
				console.warn(error);
			}
			if (this.teardownToken !== token) return;
		}

		this.sortLayersByZIndex();
		await this.initEffects();
		if (this.teardownToken !== token) return;
		this.drawLayers();
		this.loaded.value = true;
	}

	initSun() {
		const sunOrbitSettings = this.settings.orbits.sun;
		this.orbitals.sun = new Orbital(this.settings, interpolateObject(sunOrbitSettings.summer, sunOrbitSettings.winter, Time.date.seasonFactor), Time.date);
	}

	initMoon() {
		const moonOrbitSettings = this.settings.orbits.moon;
		this.orbitals.moon = new Orbital(this.settings, interpolateObject(moonOrbitSettings.summer, moonOrbitSettings.winter, Time.date.seasonFactor), Time.date);

		const bloodMoonOrbitSettings = this.settings.orbits.bloodmoon;
		this.orbitals.bloodMoon = new Orbital(this.settings, bloodMoonOrbitSettings, Time.date);
	}

	async initEffects() {
		const token = this.teardownToken;
		for (const layer of this.layers.values()) {
			/* Stop feeding a teardown that already happened. */
			if (this.teardownToken !== token) return;
			layer.setRenderer(this);
			await layer.init();
		}
	}

	/**
	 * Only recalculate the draw functions on the animated layer if a name is specified
	 * All other layers redraw their previous canvas
	 * If no layerName is specified - recalculate draw functions for all layers
	 *
	 * @param {string} args
	 */
	async drawLayers(...args) {
		/*
		 * Compositing is async and uses one shared canvas.
		 * If another pass starts during one, it waits and runs once after.
		 */
		if (this.compositeInFlight) {
			if (args.length === 0) this.pendingAllLayers = true;
			else for (const name of args) this.pendingLayers.add(name);
			return this.compositeInFlight;
		}

		/*
		 * Handle errors here because drawLayers is not awaited.
		 * This prevents unhandled rejections and keeps the queue running.
		 */
		this.compositeInFlight = this.composite(...args).catch(error => console.error("Error compositing sky layers:", error));
		try {
			await this.compositeInFlight;
		} finally {
			this.compositeInFlight = null;
		}

		if (this.pendingAllLayers || this.pendingLayers.size > 0) {
			const all = this.pendingAllLayers;
			const names = [...this.pendingLayers];
			this.pendingAllLayers = false;
			this.pendingLayers.clear();
			return all ? this.drawLayers() : this.drawLayers(...names);
		}
	}

	/* The composite itself. Always go through drawLayers, which keeps passes from overlapping. */
	async composite(...args) {
		/*
		 * Reuse one canvas for the sky instead of creating a new one every pass.
		 * This reduces memory use and improves performance, especially on phones.
		 */
		if (!this.compositeCanvas) this.compositeCanvas = new this.Canvas();
		const tempCanvas = this.compositeCanvas;
		tempCanvas.clear();
		tempCanvas.ctx.globalAlpha = 1;
		tempCanvas.ctx.globalCompositeOperation = "source-over";
		for (const layer of this.layers.values()) {
			if (args.length === 0 || args.includes(layer.name)) {
				try {
					const errors = await layer.drawEffects(tempCanvas);
					if (errors && errors.length > 0) {
						console.error(`Errors drawing layer '${layer.name}':`, errors);
					}
				} catch (error) {
					console.error(`Error drawing layer '${layer.name}':`, error.message);
				}
			}
			layer.drawLayer(tempCanvas);
		}

		this.mainLayer.ctx.imageSmoothingEnabled = false;
		this.mainLayer.clear();
		this.mainLayer.ctx.drawImage(tempCanvas.element, 0, 0, this.mainLayer.element.width, this.mainLayer.element.height);
	}

	/*
	 * Animation path. Animated layers used to redraw the whole sky separately, causing many unnecessary redraws.
	 * They are now combined into one redraw per animation frame.
	 */
	requestDrawLayers(...args) {
		if (args.length === 0) this.pendingAllLayers = true;
		else for (const name of args) this.pendingLayers.add(name);

		if (this.pendingFrameId != null) return;
		this.pendingFrameId = requestAnimationFrame(() => {
			this.pendingFrameId = null;
			const all = this.pendingAllLayers;
			const names = [...this.pendingLayers];
			this.pendingAllLayers = false;
			this.pendingLayers.clear();
			/*
			 * An empty batch means another pass already drained it.
			 * Calling drawLayers with no arguments would ask for a full recompute of every layer, so stop here instead.
			 */
			if (!all && names.length === 0) return;
			/* Nothing on screen to update - skip the pass entirely. */
			if (!this.mainLayer?.element?.isConnected) return;
			if (all) this.drawLayers();
			else this.drawLayers(...names);
		});
	}

	stopAll() {
		this.teardownToken++;
		for (const layer of this.layers.values()) {
			// A layer initialises its effects asynchronously, so a passage change can land here while the array still has an empty slot in it.
			for (const effect of layer.effects) effect?.disable();
			if (layer.animationGroup) {
				layer.animationGroup.stop();
				Weather.Renderer.ParticleEmitter?.destroyGroup?.(layer.animationGroup);
				layer.animationGroup.reset();
			}
		}
		if (this.pendingFrameId != null) {
			cancelAnimationFrame(this.pendingFrameId);
			this.pendingFrameId = null;
		}
		this.pendingLayers.clear();
		this.pendingAllLayers = false;
		this.loaded.value = false;
	}

	updateOrbits() {
		this.orbitals.sun.setPosition(Time.date);
		if (Weather.bloodMoon) {
			this.orbitals.bloodMoon.setPosition(Time.date);
		} else {
			this.orbitals.moon.setPosition(Time.date);
		}
	}

	get dayFactor() {
		return this.orbitals.sun?.factor ?? 0;
	}

	// Returns 1 when moon is fully lit - and 0 when its fully dark
	get moonBrightnessFactor() {
		return 1 - 2 * Math.abs(Time.date.moonPhaseFraction - 0.5);
	}

	get sidebarSkyDisabled() {
		return V.location === "tentworld" || V.location === "mines"; // todo move to Weather
	}

	// Covered scenes (under the Arcology dome, inside the ship) keep their sky but get no rain or snow.
	get precipitationDisabled() {
		return this.sidebarSkyDisabled || setup.LocationImages[setup.Locations.get()]?.weather?.precipitationEnabled === false;
	}

	setMoonPhase() {
		this.layers.get("moon")?.init();
	}
};
