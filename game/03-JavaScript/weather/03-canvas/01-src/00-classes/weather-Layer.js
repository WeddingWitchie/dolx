Weather.Renderer.Layer = class Layer {
	constructor(name, blur, zIndex = 0, animation = undefined) {
		this.name = name;
		this.blur = blur;
		this.zIndex = zIndex;
		this.effects = [];
		this.loadPromises = [];
		this.loading = false;
		if (animation) {
			this.animationGroup = new Weather.Renderer.AnimationGroup(animation, () => {
				if (this.renderInstance) {
					this.renderInstance.requestDrawLayers(this.name);
				}
			});
		}
	}

	/**
	 * Set the renderer only after the layer has been added
	 *
	 * @param {Weather.Renderer.Sky} renderer Sky renderer instance
	 */
	setRenderer(renderer) {
		this.renderInstance = renderer;
		for (const effect of this.effects) {
			effect.setRenderer(renderer);
		}
	}

	addEffect(effectName, params, bindings, condition, compositeOperation) {
		if (!params) params = {};
		const effectConfig = Weather.Renderer.Effects.effects.get(effectName);
		if (!effectConfig) {
			const errorPromise = Promise.reject(new Error(`Could not add effect '${effectName}' to layer ${this.name}. That effect does not exist.`));
			this.loadPromises.push(errorPromise);
			return errorPromise;
		}
		effectConfig.parentLayer = this;

		// Set index for a consistent order - since it loads asynchronously
		const currentIndex = (this.effectIndex = (this.effectIndex ?? 0) + 1);
		params.id = [currentIndex];
		const effect = new Weather.Renderer.Effect(effectConfig, condition, compositeOperation, params);

		const loadPromise = effect.loadImages().then(() => {
			if (bindings) {
				for (const [prop, getter] of Object.entries(bindings)) {
					effect.bind(getter, prop);
				}
			}
			this.effects[currentIndex - 1] = effect;
		});
		this.loadPromises.push(loadPromise);
		return loadPromise;
	}

	async init() {
		this.loading = true;
		if (!this.renderInstance) return;
		/*
		 * Sidebar and banner share sky layers, and effects load asynchronously.
		 * Check that this sky still owns the layer before starting the effect.
		 */
		const renderer = this.renderInstance;
		const token = renderer.teardownToken;
		this.canvas = new renderer.Canvas();

		// Reset animations on that layer
		if (this.animationGroup) {
			this.animationGroup.stop();
			Weather.Renderer.ParticleEmitter?.destroyGroup?.(this.animationGroup);
			this.animationGroup.reset();
		}

		// Sequentially initialise each effect
		for (const effect of this.effects) {
			await effect.init();
		}

		/*
		 * The sky was removed while loading. Don't start the animation, or it may keep running forever.
		 */
		if (this.renderInstance !== renderer || renderer.teardownToken !== token) {
			this.animationGroup?.stop();
			this.loading = false;
			return;
		}

		// Start playing animations once effects are loaded
		this.animationGroup?.init();
		this.animationGroup?.start();
	}

	drawLayer(canvas) {
		if (!this.canvas) return;
		canvas.drawImage(this.canvas.element);
	}

	async drawEffects(canvas) {
		const errors = [];
		if (this.effects.length === 0) {
			errors.push(new Error(`Could not draw layer '${this.name}'. It contains no effects.`));
		}
		const initPromises = this.effects.map(effect => effect.initPromise);
		await Promise.all(initPromises);
		/* The sky can be torn down while the effects load, taking this layer's canvas with it. */
		if (!this.canvas) {
			this.loading = false;
			return errors;
		}
		this.canvas.clear();
		for (const effect of this.effects) {
			try {
				effect.draw(canvas, this.canvas);
				this.canvas.ctx.globalAlpha = effect.alpha;
				this.canvas.ctx.globalCompositeOperation = effect.compositeOperation;
				this.canvas.drawImage(effect.canvas.element);
			} catch (e) {
				console.error(this, `Error drawing effect in layer '${this.name}':`, e);
				errors.push(e);
			}
		}
		this.loading = false;
		return errors;
	}
};
