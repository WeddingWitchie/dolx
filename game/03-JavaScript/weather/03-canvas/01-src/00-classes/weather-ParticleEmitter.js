/**
 * Usage:
 * Grab your canvas context and the layer animationGroup:
 * 		const ctx = document.querySelector("canvas").getContext("2d");
 * 		const group = myWeatherLayer.animationGroup;
	}
};
 *   		origin:         { x: 100, y: -10 },     // start just above the top
 *   		maxParticles:   500,                    // fail‑safe cap
 *
 * Continuous stream:
 *   		spawnRate:      200,                    // particles per second
 *   		spawnInterval: 0.01,                 	// OR: fixed delay between spawns
 *
 * Initial settings passed to each particle upon reset:
 *   		initialSettings: {
 *     			shape:        "line",
 *     			size:         { w: 3, h: 1 },
 *     			color:        "#ffffff",
 *     			lifetime:     2,      // seconds until death
 *     			gravity:      50,     // Downward acceleration
 *     			fade:         true,   // start fade after fadeStart
 *     			fadeStart:    1.5,    // seconds before fading begins
 *     			fadeTime:     0.5,    // fade duration
 *   		},
 *
 * Per-particle overrides: (Can override any particle property - during generation phase)
 *   		generator:      () => ({
 *     			velocity: {
 *       			x: (Math.random() - 0.5) * 20, // E.g. randomise velocity
 *       			y: 100 + Math.random() * 50
 *     			}
 *   		}),
 *
 * Callback for when a particle dies
 *  		 onDestroy: (particle) => {
 *     			// e.g. add a splash (rain)
 *     			spawnSplash(particle.position);
 *   		},
 *
 *    		preWarm:        true,    // immediately populate the canvas (Otherwise the particles will begin emitting on load)
 *   		animationGroup: group,   // The layer animationGroup
 *
 * IF we don't want a continuous spawn (one-time burst):
 *   		spawnRate:      null,
 *   		spawnInterval:  null,
 *   		autoDestroy:    true,   // emitter destroys itself when empty - otherwise need to destroy it manually to allow GC to work
 *
 * });
 *
 *
 * Options:
 *   origin (x, y)     // spawn point
 *   maxParticles      // hard cap
 *   spawnRate         // particles/sec
 *   spawnInterval     // seconds between spawns
 *   initialSettings   // Particle reset options (See Particle class)
 *   generator         // per-particle overrides
 *   onDestroy         // callback when particle dies
 *   curve             // global horizontal acceleration (curve)
 *   preWarm           // fill canvas immediately
 *   autoDestroy       // remove emitter when done
 *   animationGroup    // Weather.Renderer.AnimationGroup
 */
Weather.Renderer.ParticleEmitter = class ParticleEmitter {
	// Manage emitters and tickers per animation group
	static #emittersByGroup = new Map(); // group -> Set<ParticleEmitter>
	static #tickersByGroup = new Map(); // group -> Animation
	static #originalOnUpdate = new WeakMap(); // group -> function
	static #wrapperKey = Symbol("particleWrapperOriginal"); // tag stored on our wrapper -> the true (unwrapped) onUpdate
	static #key = "particleTicker";

	// Peel off any of our own wrappers so we never wrap a wrapper (prevents stacked update loops -> "too much recursion")
	static #unwrapOnUpdate(fn) {
		let current = fn;
		while (typeof current === "function" && current[Weather.Renderer.ParticleEmitter.#wrapperKey]) {
			current = current[Weather.Renderer.ParticleEmitter.#wrapperKey];
		}
		return current;
	}

	#spawnAccumulator = 0;
	#spawnTimer = 0;
	#isPrewarming = false;
	pool = [];
	particles = [];

	/*
	 * Dummy ticker
	 */
	static #setTicker(group) {
		const existingTicker = this.#tickersByGroup.get(group);
		if (existingTicker) {
			if (!group.animations.has(this.#key)) group.add(this.#key, existingTicker);
			existingTicker.enable();
			return;
		}
		const frameDelay = group.updateRate;
		const offscreen = new BaseCanvas(1, 1);
		const ticker = new Weather.Renderer.Animation({
			name: this.#key,
			image: offscreen.element,
			canvas: offscreen,
			numFrames: 1,
			frameDelay,
			alwaysDisplay: true,
		});
		group.add(this.#key, ticker);
		ticker.enable();
		this.#tickersByGroup.set(group, ticker);

		// Real-time seconds
		const currentOnUpdate = typeof group.onUpdate === "function" ? group.onUpdate : () => {};
		// Always resolve to the genuine (unwrapped) callback so a stale wrapper is never re-wrapped.
		const original = ParticleEmitter.#unwrapOnUpdate(currentOnUpdate);
		this.#originalOnUpdate.set(group, original);
		const nowFn = typeof performance !== "undefined" ? () => performance.now() : () => Date.now();
		const targetDt = frameDelay / 1000;
		let last = nowFn();
		let updating = false;
		const wrappedOnUpdate = () => {
			if (updating) return;
			updating = true;
			try {
				const now = nowFn();
				let dt = (now - last) / 1000;
				last = now;
				// Freeze when hidden (alt-tab/background)
				const hidden = typeof document !== "undefined" && (document.hidden || document.visibilityState === "hidden");
				if (hidden) dt = 0;
				// Treat huge gaps as pauses
				if (dt > targetDt * 4) dt = 0;
				if (!Number.isFinite(dt) || dt < 0) dt = targetDt;
				else if (dt > 0) dt = Math.min(dt, targetDt * 2);

				const set = Weather.Renderer.ParticleEmitter.#emittersByGroup.get(group);
				if (set && set.size) {
					for (const em of set) {
						if (!em.active) continue;
						em.update(dt);
					}
				}
				original.call(group);
			} finally {
				updating = false;
			}
		};
		// Tag the wrapper with the genuine callback so it can always be unwrapped, even if the maps fall out of sync.
		wrappedOnUpdate[ParticleEmitter.#wrapperKey] = original;
		group.onUpdate = wrappedOnUpdate;
	}

	static #restoreGroup(group) {
		if (!group) return;
		const currentOnUpdate = group.onUpdate;
		// Prefer unwrapping the live callback directly; fall back to the stored original.
		const original =
			(typeof currentOnUpdate === "function" && currentOnUpdate[Weather.Renderer.ParticleEmitter.#wrapperKey]) ||
			Weather.Renderer.ParticleEmitter.#originalOnUpdate.get(group);
		if (original) group.onUpdate = ParticleEmitter.#unwrapOnUpdate(original);
		Weather.Renderer.ParticleEmitter.#originalOnUpdate.delete(group);
		Weather.Renderer.ParticleEmitter.#tickersByGroup.get(group)?.disable();
		group.animations?.delete(Weather.Renderer.ParticleEmitter.#key);
		Weather.Renderer.ParticleEmitter.#tickersByGroup.delete(group);
		Weather.Renderer.ParticleEmitter.#emittersByGroup.delete(group);
	}

	static destroyGroup(group) {
		if (!group) return;
		const set = Weather.Renderer.ParticleEmitter.#emittersByGroup.get(group);
		if (set) {
			for (const em of Array.from(set)) {
				em.destroy();
			}
		}
		Weather.Renderer.ParticleEmitter.#restoreGroup(group);
	}

	constructor(
		ctx,
		{
			origin = { x: 0, y: 0 },
			maxParticles = 100,
			spawnRate = null,
			spawnInterval = null,
			initialSettings = {},
			generator = () => ({}),
			onCollision = null,
			onDestroy = null,
			onUpdate = null,
			curve = 0,
			preWarm = false,
			autoDestroy = false,
			animationGroup = null,
		} = {}
	) {
		this.ctx = ctx;
		this.origin = origin;
		this.maxParticles = maxParticles;
		this.spawnRate = spawnRate;
		this.spawnInterval = spawnInterval;
		this.generator = generator;
		this.onCollision = onCollision;
		this.onDestroy = onDestroy;
		this.onUpdate = onUpdate;
		this.curve = curve;
		this.autoDestroy = autoDestroy;

		let imagePromise = Promise.resolve();
		if (initialSettings.shape === "image" && typeof initialSettings.src === "string") {
			const img = new Image();
			initialSettings.image = img;
			if (typeof img.decode === "function") {
				img.src = initialSettings.src;
				imagePromise = img.decode();
			} else {
				imagePromise = new Promise((resolve, reject) => {
					img.onload = resolve;
					img.onerror = reject;
					img.src = initialSettings.src;
				});
			}
		}

		this.initialSettings = initialSettings;

		this.active = true;
		if (animationGroup) {
			let set = Weather.Renderer.ParticleEmitter.#emittersByGroup.get(animationGroup);
			if (!set) {
				set = new Set();
				Weather.Renderer.ParticleEmitter.#emittersByGroup.set(animationGroup, set);
			}
			set.add(this);
			ParticleEmitter.#setTicker(animationGroup);
			this.group = animationGroup;
		}
		if (preWarm) {
			// Await image before prewarming
			imagePromise.then(() => this.#preWarm()).catch(err => console.warn("Image decode failed:", err));
		}
	}

	#preWarm() {
		const lifetime = this.initialSettings.lifetime;
		const finiteLife = Number.isFinite(lifetime) && lifetime > 0;

		this.#isPrewarming = true;
		let count = this.maxParticles;
		while (count-- > 0) this.#spawnParticle();
		this.#isPrewarming = false;

		if (finiteLife) {
			for (const p of this.particles) {
				p.update(Math.random() * lifetime);
			}
		}
	}

	update(time) {
		if (this.spawnRate != null) {
			this.#spawnAccumulator += time * this.spawnRate;
			const toSpawn = Math.floor(this.#spawnAccumulator);
			this.#spawnAccumulator -= toSpawn;
			for (let i = 0; i < toSpawn; i++) this.#spawnParticle();
		} else if (this.spawnInterval != null) {
			this.#spawnTimer += time;
			while (this.#spawnTimer >= this.spawnInterval) {
				this.#spawnParticle();
				this.#spawnTimer -= this.spawnInterval;
			}
		}

		// update
		let writeIndex = 0;
		const particleCount = this.particles.length;
		for (let i = 0; i < particleCount; i++) {
			const p = this.particles[i];
			const prevAge = p.age;
			p.update(time);
			if (this.onCollision && p.collisionTime != null && prevAge < p.collisionTime && p.age >= p.collisionTime) {
				this.onCollision(p);
			}
			if (p.isAlive) {
				this.particles[writeIndex++] = p;
			} else {
				this.pool.push(p);
				this.onDestroy?.(p);
			}
			this.onUpdate?.(p, time);
		}
		this.particles.length = writeIndex;

		// auto‑destroy
		if (this.autoDestroy && this.spawnRate == null && this.particles.length === 0) {
			this.destroy();
		}
	}

	#spawnParticle() {
		if (this.particles.length >= this.maxParticles) return;
		const p = this.pool.pop() ?? new Weather.Renderer.Particle();

		p.reset({
			position: { x: this.origin.x, y: this.origin.y },
			curve: this.curve,
			isPrewarmed: this.#isPrewarming,
			...this.initialSettings,
			...this.generator(),
		});
		this.particles.push(p);
	}

	draw() {
		for (const p of this.particles) {
			p.draw(this.ctx);
		}
	}

	enable() {
		this.active = true;
		if (this.group) Weather.Renderer.ParticleEmitter.#tickersByGroup.get(this.group)?.enable();
	}

	disable() {
		this.active = false;
	}

	destroy() {
		this.active = false;
		if (this.group) {
			const set = Weather.Renderer.ParticleEmitter.#emittersByGroup.get(this.group);
			if (set) {
				set.delete(this);
				if (set.size === 0) {
					Weather.Renderer.ParticleEmitter.#restoreGroup(this.group);
				}
			}
		}
		this.group = null;
		this.particles.length = 0;
		this.pool.length = 0;
	}
};
