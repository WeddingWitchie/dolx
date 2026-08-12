setup.dhmod = {
	// extend the dict below if you have more custom gradients
	gradients: {
		"Low Ombré": "low-ombre",
		"High Ombré": "high-ombre",
		Split: "split",
		"Face-framing highlights": "face-frame",
	},
	moddedGradients: {
		"Low Ombré": "modded-low-ombre",
		"High Ombré": "modded-high-ombre",
		Split: "modded-split",
		"Face-framing highlights": "modded-face-frame",
		Scene: "modded-scene",
		"Faded scene": "modded-scene-fade",
		Checker: "modded-checker",
		"Faded checker": "modded-checker-fade",
		Wink: "modded-wink",
	},
	filter_cache: {
		tmp0: {},
		tmp1: {},
	},
};

Object.defineProperty(window, "dhmod", { get: () => State.variables.dhmod });
