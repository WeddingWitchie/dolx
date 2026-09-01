/**
 * (Low-level API)
 * Prepare a layer to be rendered.
 *
 * See {@link CompositeLayerSpec} definition for details on options.
 *
 * Arguments are processed depending on their type:
 * String argument is `src` option (image source)
 * Number argument is `z` option (z-index)
 * Object argument is full or partial CompositeLayerSpec object
 * Leftmost arguments have most priority.
 *
 * @example
 * <<run canvaslayer(10, 'img.png', {blendMode:'hard-light', blend:'#00ff00'});>>
 * <<run canvaslayer({z:10, src:'img.png'}, {blendMode:'hard-light', blend:'#00ff00'});>>
 */
function canvaslayer() {
	const layers = T.CanvasLayers;
	if (!layers) throw new Error("'canvaslayer()' without 'canvasstart'");

	let theOptions = {};
	for (let i = arguments.length - 1; i >= 0; i--) {
		const arg = arguments[i];
		switch (typeof arg) {
			case "object":
				theOptions = Object.assign(theOptions, arg);
				break;
			case "string":
				theOptions.src = arg;
				break;
			case "number":
				theOptions.z = arg;
				break;
			default:
				throw new Error("Invalid canvaslayer() argument " + i + ": " + typeof arg);
		}
	}

	if (typeof theOptions.src !== "string") {
		console.error(arguments);
		throw new Error("canvaslayer() options missing 'src'");
	}
	layers.push(theOptions);
}
window.canvaslayer = canvaslayer;

// use 2x2 pixels in generated images
Renderer.pixelSize = 2;

/*
 * Doll art resolution.
 *
 * Image packs replace files in `img/`, so the game cannot detect them directly.
 * Some packs use higher-resolution art, which was previously scaled down and lost detail.
 *
 * Measure the installed art and render the model at the same resolution instead.
 * Existing layer positions still use the standard 256px space and are scaled in calcLayerRects.
 */
Renderer.artScale = 1;

const ART_SCALE_KEY = "dolx-doll-art-scale";
/* Every pack replaces the body, so one core file answers for the whole set. */
const ART_SCALE_PROBE = "img/body/base-classic.png";
const ART_SCALE_MAX = 4;

function applyDollArtScale(scale) {
	if (!(scale >= 1) || scale === Renderer.artScale) return;
	Renderer.artScale = scale;
	/* Stylesheets that crop a canvas (the hairstyle mannequins) need the scale to size the crop. */
	document.documentElement.style.setProperty("--doll-art-scale", String(scale));
	Renderer.mannequinCache = new Map();
	/* Cached models hold their old dimensions, and the canvases built from them. */
	Renderer.CanvasModelCaches = {};
	/*
	 * Cached images may still use the old model size.
	 * Clear them so sprites reload at the correct size and frame layout.
	 */
	Renderer.ImageCaches = {};
	Renderer.ImageErrors = {};
}
/* Exposed so the resolution can be forced from the console or a test. */
Renderer.setArtScale = applyDollArtScale;

/*
 * Keep the canvas at its expected display size, even when rendered at a higher resolution.
 *
 * This lets high-resolution image packs show more detail without making the doll appear larger.
 * The browser scales the extra pixels down to fit the normal canvas size.
 * Nearest-neighbour scaling is disabled because it can remove detail when shrinking the image.
 *
 * @param {HTMLCanvasElement} canvasElement
 * @param {{artScale?: number}} model The model used to render the canvas.
 */
Renderer.pinCanvasDisplaySize = function (canvasElement, model) {
	const artScale = model?.artScale || 1;
	if (artScale === 1 || !canvasElement) return;
	canvasElement.style.width = `${canvasElement.width / artScale}px`;
	canvasElement.style.height = `${canvasElement.height / artScale}px`;
	canvasElement.style.imageRendering = "auto";
};

/*
 * Hair previews are expensive to render.
 * Cache finished previews so reopening or changing pages does not render them again.
 */
Renderer.mannequinCache = new Map();
const MANNEQUIN_CACHE_MAX = 60;

function mannequinCacheKey(options) {
	try {
		return JSON.stringify(options);
	} catch (e) {
		/* Circular or otherwise unserialisable options simply skip the cache. */
		return null;
	}
}

/*
 * Returns a copy of a previously rendered mannequin canvas, or null when there is none.
 *
 * @param {object} options The model options the mannequin was rendered with.
 * @returns {HTMLCanvasElement|null}
 */
Renderer.cachedMannequin = function (options) {
	const key = mannequinCacheKey(options);
	if (key === null) return null;
	const source = Renderer.mannequinCache.get(key);
	if (!source || !source.width || !source.height) return null;
	const copy = document.createElement("canvas");
	copy.width = source.width;
	copy.height = source.height;
	try {
		copy.getContext("2d").drawImage(source, 0, 0);
	} catch (e) {
		return null;
	}
	copy.className = source.className;
	copy.style.cssText = source.style.cssText;
	/* Keep it most-recently-used so the styles being browsed survive trimming. */
	Renderer.mannequinCache.delete(key);
	Renderer.mannequinCache.set(key, source);
	return copy;
};

/*
 * Remembers a rendered mannequin canvas for reuse.
 *
 * @param {object} options The model options it was rendered with.
 * @param {HTMLCanvasElement} canvasElement
 */
Renderer.storeMannequin = function (options, canvasElement) {
	const key = mannequinCacheKey(options);
	if (key === null || !canvasElement) return;
	Renderer.mannequinCache.set(key, canvasElement);
	while (Renderer.mannequinCache.size > MANNEQUIN_CACHE_MAX) {
		Renderer.mannequinCache.delete(Renderer.mannequinCache.keys().next().value);
	}
};

/*
 * The result is cached because models are created before images finish loading.
 * On a fresh install, the first passage may render at 1x, then update once the image is checked.
 * After that, the cached value is used immediately.
 *
 * Only `img/` is checked. If `img2/` uses a different resolution, it will still use the scale detected from `img/`.
 * Supporting both properly would require rebuilding the scale whenever `getGenderedPath` switches sprite sets.
 */
function measureDollArtScale() {
	try {
		const stored = Number(localStorage.getItem(ART_SCALE_KEY));
		if (stored >= 1) applyDollArtScale(Math.min(ART_SCALE_MAX, Math.round(stored)));
	} catch (e) {
		/* Storage can be unavailable. The probe below still answers, just a passage later. */
	}

	const probe = new Image();
	probe.addEventListener("load", () => {
		/* Rounding keeps stock art (128/256) and the common 512x256 packs (256/256) alike at 1x. */
		const scale = Math.max(1, Math.min(ART_SCALE_MAX, Math.round(probe.naturalHeight / 256)));
		try {
			localStorage.setItem(ART_SCALE_KEY, String(scale));
		} catch (e) {
			/* Not being able to remember it only costs the one-passage delay above. */
		}
		applyDollArtScale(scale);
	});
	probe.src = ART_SCALE_PROBE;
}
measureDollArtScale();

Renderer.Stats = {
	trace: false,
	traceAnim: false,
	lastLoadTime: 0,
	lastRenderTime: 0,

	logmsgLoad: new ObservableValue(""),
	logmsgRender: new ObservableValue(""),
	logmsgAnimate: new ObservableValue(""),

	nlayers: 0,
	ncached: 0,
};
/**
 * @type {Renderer.RendererListener}
 */
Renderer.defaultListener = {
	error(error) {
		// strip source data
		const msg = (error.stack || error.message || "" + error).replace(/\(?[^( )]*:\d+:\d+\)?/gm, "").replace(/\(?eval at [\w.]+/gm, "");
		Errors.report(msg);
	},
	composeLayers(layers) {
		Renderer.Stats.loadErrors = 0;
		if (Renderer.Stats.trace) {
			console.log(performance.now().toFixed(3), "Composing " + layers.length + " layers...");
		}
	},
	processingStep(layer, processing, canvas, dt) {
		Perflog.logWidgetTime("_render:" + processing, dt);
	},
	loadError(layer, src) {
		// logged to console by Renderer itself
		Renderer.Stats.loadErrors++;
		Errors.report("Failed to load image " + src + " for layer " + layer);
	},
	loadingDone(time, layersLoaded) {
		Renderer.Stats.lastLoadTime = time;
		let msg = "Loaded " + layersLoaded + " images in " + time.toFixed(3) + " ms";
		if (Renderer.Stats.loadErrors > 0) msg += " (" + Renderer.Stats.loadErrors + " failed)";
		Renderer.Stats.logmsgLoad.value = msg;
		if (Renderer.Stats.trace) {
			console.log(performance.now().toFixed(3), msg);
		}
	},
	beforeRender(layers) {
		Renderer.Stats.nlayers = layers.length;
		Renderer.Stats.ncached = 0;
	},
	layerCacheHit(layer) {
		Renderer.Stats.ncached++;
	},
	renderingDone(time) {
		Renderer.Stats.lastRenderTime = time;
		const msg = "Rendered " + Renderer.Stats.nlayers + " layers" + " (" + Renderer.Stats.ncached + " cached)" + " in " + time.toFixed(3) + " ms";
		if (Renderer.Stats.trace) {
			console.log(performance.now().toFixed(3), msg);
		}
		Renderer.Stats.logmsgRender.value = msg;
	},
	keyframe(animation, keyframeIndex, keyframe) {
		if (Renderer.Stats.traceAnim) {
			console.log(performance.now().toFixed(3), "animation", animation, "keyframe", keyframeIndex, "frame", keyframe.frame, "duration", keyframe.duration);
		}
	},
	keyframeRender(spec, cacheHit, cacheRenderTime) {
		if (Renderer.Stats.traceAnim) {
			console.log(
				performance.now().toFixed(3),
				"KeyframeRender",
				spec,
				cacheHit ? "cache hit, render time " + cacheRenderTime.toFixed(3) + " ms" : "cache miss"
			);
		}
		if (cacheHit && Renderer.Stats.logmsgAnimate) {
			Renderer.Stats.logmsgAnimate.value = "Cached keyframe rendered in " + cacheRenderTime.toFixed(3) + " ms";
		}
	},
	animationStop() {
		if (Renderer.Stats.traceAnim) {
			console.log(performance.now().toFixed(3), "Animation stopped");
		}
	},
};

function refreshCanvas(model) {
	requestAnimationFrame(() => {
		const canvasModel = Renderer.locateModel(model, "sidebar");
		if (canvasModel.canvas) {
			Renderer.invalidateLayerCaches(canvasModel.layerList);
			canvasModel.redraw();
		}
	});
}

function refreshModels(e, overlay) {
	if (overlay === "options") {
		refreshCanvas("lighting");
	}
}

/* Events */
$(document).on(":passagestart", () => {
	if (State.current !== State.top) {
		Skin.recache();
	}
});
$(document).on(":onloadsave", () => {
	Skin.recache();
	refreshCanvas("lighting");
});
$(document).on(":enginerestart", () => {
	Skin.recache();
});
$(document).on(":oncloseoverlay", refreshModels);
