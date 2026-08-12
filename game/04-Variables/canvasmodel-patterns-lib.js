/*
Example usage of image patterns:

T.modeloptions.worn_upper_colour = "custom"
T.modeloptions.filters.worn_upper_custom = {
	blend: { pattern: "wolfharmony" },
	blendMode: "hard-light"
}
*/

registerImagePattern("wolfharmony", "img/ui/sym-harmony.png");

/*
Example usage:

T.modeloptions.worn_upper_colour = "custom"
T.modeloptions.filters.worn_upper_custom = {
	blend: {
		pattern: { type: "checkerboard", colors: ["white", "black" ] }
	},
	blendMode: "hard-light"
}
 */
registerGeneratedPattern("checkerboard", function (spec) {
	const canvas = Renderer.createCanvas(8, 8, spec.colors[0]);
	canvas.fillStyle = spec.colors[1];
	canvas.fillRect(4, 0, 4, 4);
	canvas.fillRect(0, 4, 4, 4);
	return canvas.canvas; // return HTMLCanvasElement of CanvasRenderingContext2D
});

function registerHairMaskPattern(name, src) {
	const mask = new Image();
	let cachedKey;
	let cachedPattern;
	mask.onload = function () {
		cachedKey = undefined;
		cachedPattern = undefined;
		if (Renderer.lastCall?.[1]?.some(layer => layer.blend?.pattern?.type === name)) Renderer.composeLayersAgain();
	};
	/* Without the mask the pattern collapses to a flat first colour, which on screen looks exactly like
	   the two-tone dye having been ignored. Say so, or the missing file is undiagnosable. */
	mask.onerror = function () {
		console.warn(`Hair mask "${name}" failed to load from ${src}. Its two-tone dye will render as a single colour.`);
	};
	mask.src = src;

	registerGeneratedPattern(name, function (spec) {
		const key = spec.colors.join("|");
		if (key === cachedKey) return cachedPattern;

		const size = 256;
		const base = Renderer.createCanvas(size, size, spec.colors[0]);
		if (!mask.complete || mask.naturalWidth === 0) return base.canvas;

		const masked = Renderer.createCanvas(size, size, spec.colors[1]);
		masked.globalCompositeOperation = "destination-in";
		masked.drawImage(mask, 0, 0, size, size);
		base.drawImage(masked.canvas, 0, 0);
		cachedKey = key;
		cachedPattern = base.canvas;
		return cachedPattern;
	});
}

["low-ombre", "high-ombre", "split", "face-frame", "scene", "scene-fade", "checker", "checker-fade", "wink"].forEach(style =>
	registerHairMaskPattern(`hair-modded-${style}`, `img/hair/masks/hgp-defaults/${style}.png`)
);

Renderer.createModdedHairPatternFilter = function (style, colours, prefilterName) {
	/* Only a modded- style belongs to this path. Anything else is a vanilla gradient, so hand it back. */
	if (!style?.startsWith("modded-")) return null;

	/* A modded- style with no registered mask must never fall through to the vanilla path instead: that
	   lookup is keyed by style name and would throw on the missing prototype, taking the render with it.
	   Saves carrying a style that was later renamed or dropped land here. */
	let type = `hair-${style}`;
	if (!Renderer.GeneratedPatterns[type]) {
		console.warn(`No hair mask is registered for style "${style}". Falling back to modded-split.`);
		type = "hair-modded-split";
		if (!Renderer.GeneratedPatterns[type]) return null;
	}

	/* An unrecognised colour name must not borrow the other tone: two identical tones paint the hair flat,
	   which reads as the pattern never having been applied. Fall back to black so the miss is visible. */
	const resolveColour = colour => {
		const record = setup.colours.hair_map[colour];
		if (record) return record;
		console.warn(`Unknown hair colour "${colour}" requested for pattern ${type}. Falling back to black.`);
		return setup.colours.hair_map.black;
	};
	const filter = {
		blend: {
			pattern: {
				type,
				colors: colours.map(colour => resolveColour(colour).canvasfilter.blend),
			},
		},
		blendMode: "hard-light",
	};
	Renderer.mergeLayerData(filter, setup.colours.sprite_prefilters[prefilterName], true);
	return filter;
};
