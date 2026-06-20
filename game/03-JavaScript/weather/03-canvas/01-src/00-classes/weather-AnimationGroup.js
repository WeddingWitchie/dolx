Weather.Renderer.AnimationGroup = class AnimationGroup {
	constructor(options, onUpdate) {
		this.lastUpdateTime = 0;
		this.updateRate = options.updateRate;
		this.animations = new Map();
		this.animationFrameId = null;
		this.onUpdate = onUpdate;
	}

	/**
	 * Add child-animations if eligible
	 */
	init() {
		this.animations.forEach(animation => {
			const parent = this.animations.get(animation.parentAnimation);
			parent?.childAnimations.push(animation);
		});
	}

	reset() {
		this.animations.clear();
	}

	add(key, animation) {
		if (!(animation instanceof Weather.Renderer.Animation)) {
			console.error("Error adding animation to group: Expected Animation instance as argument, but received ", animation);
			return;
		}

		this.animations.set(key, animation);
	}

	start() {
		if (this.animationFrameId !== null) return;
		this.lastUpdateTime = 0;
		const frame = time => {
			if (typeof document !== "undefined" && document.hidden) {
				this.lastUpdateTime = time;
				this.animationFrameId = requestAnimationFrame(frame);
				return;
			}
			if (!this.lastUpdateTime || time - this.lastUpdateTime >= this.updateRate) {
				this.updateAnimations(time - this.lastUpdateTime);
				this.lastUpdateTime = time;
			}
			this.animationFrameId = requestAnimationFrame(frame);
		};
		this.animationFrameId = requestAnimationFrame(frame);
	}

	updateAnimations(deltaTime) {
		if (!V.weatherObj) return;

		deltaTime = Math.min(deltaTime, this.updateRate);
		// If there are no child animations, still trigger the onUpdate callback
		// so that layers/effects that rely on the animation group's tick still redraw.
		if (this.animations.size < 1) {
			this.onUpdate();
			return;
		}
		let needsRedraw = false;
		this.animations.forEach((animation, key) => {
			if (!animation.parentAnimation) {
				if (animation.canUpdate(this) && animation.update(deltaTime)) {
					needsRedraw = true;
				}
			}
		});

		if (needsRedraw) {
			this.onUpdate();
		}
	}

	isAnimationRunning(key) {
		const animation = this.animations.get(key);
		return animation && animation.inCycle;
	}

	stop() {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		this.lastUpdateTime = 0;
	}
};
