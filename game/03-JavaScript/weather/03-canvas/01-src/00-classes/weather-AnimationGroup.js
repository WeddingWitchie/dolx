Weather.Renderer.AnimationGroup = class AnimationGroup {
	constructor(options, onUpdate) {
		this.lastUpdateTime = 0;
		this.updateRate = options.updateRate;
		this.animations = new Map();
		this.running = false;
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
		if (this.running) return;
		this.lastUpdateTime = 0;
		/* Every group used to own a requestAnimationFrame loop. They now share one driver. */
		this.running = true;
		AnimationGroup.Driver.add(this);
	}

	/*
	 * Called once per animation frame. Returns true if this frame did any work.
	 */
	tick(time) {
		if (typeof document !== "undefined" && document.hidden) {
			this.lastUpdateTime = time;
			return true;
		}
		if (!this.lastUpdateTime || time - this.lastUpdateTime >= this.updateRate) {
			this.updateAnimations(time - this.lastUpdateTime);
			this.lastUpdateTime = time;
			return true;
		}
		return false;
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
		if (this.running) {
			AnimationGroup.Driver.remove(this);
			this.running = false;
		}
		this.lastUpdateTime = 0;
	}
};

/*
 * One animation loop shared by all groups. It stops when nothing is moving.
 */
Weather.Renderer.AnimationGroup.Driver = {
	groups: new Set(),
	frameId: null,
	lastFrameTime: 0,

	add(group) {
		this.groups.add(group);
		this.run();
	},

	remove(group) {
		this.groups.delete(group);
		if (this.groups.size === 0 && this.frameId !== null) {
			cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
	},

	run() {
		if (this.frameId !== null) return;
		this.lastFrameTime = 0;
		const frame = time => {
			/*
			 * Run the animation loop only as fast as the fastest group needs.
			 * A small tolerance prevents animations from accidentally running at half speed.
			 */
			let minRate = Infinity;
			for (const group of this.groups) {
				if (group.updateRate < minRate) minRate = group.updateRate;
			}
			if (!Number.isFinite(minRate)) minRate = 0;

			if (time - this.lastFrameTime >= minRate - 4) {
				/*
				 * A frame may arrive slightly early.
				 * Only count it when the group actually uses it, otherwise the animation can run at half speed.
				 */
				let ticked = false;
				for (const group of this.groups) {
					try {
						if (group.tick(time)) ticked = true;
					} catch (e) {
						console.error("Error ticking weather animation group:", e);
					}
				}
				if (ticked) this.lastFrameTime = time;
			}
			this.frameId = this.groups.size > 0 ? requestAnimationFrame(frame) : null;
		};
		this.frameId = requestAnimationFrame(frame);
	},
};
