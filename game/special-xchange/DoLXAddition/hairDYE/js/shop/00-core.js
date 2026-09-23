/* global dhmod, dhmUtils, dollHighlightsAvailable, colorUtils, moddedTwoToneStyle, vanillaTwoToneStyle */

const dhmShop = {
	pickers: [],

	/**
	 * @param {number} index
	 */
	presetAttachHooks(index = 0) {
		$(`#delete${index} button`).prop("disabled", true);

		$(`#listbox--presetselected${index}`).on("change", function (e) {
			if (!!T[`presetSelected${index}`] && T[`presetSelected${index}`].length > 0) {
				dhmShop.presetAutoload(T[`presetSelected${index}`], index);
				$(`#delete${index} button`).prop("disabled", false);
			}
		});
	},

	/**
	 */
	presetBoxRefresh() {
		for (let i = 0; i < this.pickers.length; i++) {
			Wikifier.wikifyEval(`<<replace "#preset-dropdown-container-${i}">><<dhmPresetsDropdown ${i}>><</replace>>`);
			this.presetAttachHooks(i);
		}
	},

	/**
	 * @param {object} rawFilter
	 */
	presetBtnSave(rawFilter) {
		const filterString = dhmUtils.filterEncode(rawFilter);
		const presetName = prompt("Name your preset", "Preset");

		if (presetName) {
			if (V.dhmod.userPresets[presetName]) {
				alert(`'${presetName}' was not saved because another preset with the same name already exists.`);
				return true;
			}

			const duplicate = dhmUtils.presetExists(filterString);
			if (duplicate) {
				alert(`'${presetName}' was not saved because this color is already saved as '${duplicate}'.`);
				return true;
			}

			dhmUtils.presetAdd(presetName, filterString);
			this.presetBoxRefresh();

			return false;
		}
	},

	/**
	 * @param {string} selectedPreset
	 */
	presetBtnDelete(selectedPreset) {
		dhmUtils.presetDelete(selectedPreset);
		this.presetBoxRefresh();
	},

	/**
	 * @param {string} selectedPreset
	 * @param {number} index
	 */
	presetAutoload(selectedPreset, index = 0) {
		const newFilter = dhmUtils.presetLoad(selectedPreset);
		this.syncColorPicker(index, newFilter.blend);
		this.syncColorBrightnessSlider(index, newFilter.brightness);
	},
	// }}}

	// filth
	// {{{
	newSession() {
		dhmod.tmp = {
			originalColors: ["", ""],
			colors: ["", ""],
			brightnessStart: [0, 0],
			blendStart: ["#FFFFFF", "#FFFFFF"],
			is_custom: !!dhmod.hair.is_custom,
		};

		if (V.hairColourStyle === "simple") {
			dhmod.tmp.colors = [V.haircolour, V.haircolour];
			dhmod.tmp.originalColors = [V.haircolour, V.haircolour];
		} else {
			// "highlights" isn't a selectable option in the normal two-tone Style dropdown
			// (it has its own dedicated "special vanilla two-tone" checkbox) and has no gradient prototype,
			// so never let the player's current hair seed it in as a stale selection.
			V.twoToneStyle = vanillaTwoToneStyle(V.hairColourGradient.style);
			V.moddedTwoToneStyle = moddedTwoToneStyle(V.hairColourGradient.style);
			dhmod.tmp.colors = [...V.hairColourGradient.colours];
			dhmod.tmp.originalColors = [...V.hairColourGradient.colours];
		}

		for (const i in dhmod.tmp.colors) {
			const activeFilter = dhmUtils.getActiveHairFilter(i);
			if (activeFilter) {
				setup.colours.hair_map[`tmp${i}`].canvasfilter.blend = activeFilter.blend;
				setup.colours.hair_map[`tmp${i}`].canvasfilter.brightness = activeFilter.brightness;
				dhmod.tmp.brightnessStart[i] = activeFilter.brightness;
				dhmod.tmp.blendStart[i] = activeFilter.blend;
			}
			if (dhmod.tmp.is_custom) {
				dhmod.tmp.colors[i] = `tmp${i}`;
			}
		}
	},
	// }}}

	/**
	 * Whether the "special vanilla two-tone" (highlights) dye can be offered for the part currently being dyed.
	 * It needs a matching color2_highlights.png overlay per hairstyle, which imagepack-replaced
	 * styles won't have, so this is only true for the vanilla art we've prepared.
	 *
	 * @param {"sides"|"fringe"} dyedHairPart
	 * @param {string} sidesType
	 * @param {string} fringeType
	 * @param {string} sidesLength
	 * @param {string} fringeLength
	 * @returns {boolean}
	 */
	highlightsAvailable(dyedHairPart, sidesType, fringeType, sidesLength, fringeLength) {
		if (dyedHairPart === "sides") return dollHighlightsAvailable("sides", sidesType, sidesLength);
		if (dyedHairPart === "fringe") return dollHighlightsAvailable("fringe", fringeType, fringeLength);
		return dollHighlightsAvailable("sides", sidesType, sidesLength) && dollHighlightsAvailable("fringe", fringeType, fringeLength);
	},

	compileGradient(colors = ["tmp0", "tmp1"], tmp = 0) {
		const compiled = {
			// Callers that want the highlights overlay overwrite .style themselves afterwards;
			// a plain two-tone compile must never inherit a non-gradient style.
			style: vanillaTwoToneStyle(V.twoToneStyle),
			colours: ["", ""],
		};

		for (let i = 0; i < colors.length; i++) {
			if (tmp && dhmod.tmp.is_custom) {
				compiled.colours[i] = `tmp${i}`;
			} else {
				compiled.colours[i] = colors[i];
			}
		}
		return compiled;
	},

	gradientPreviewUpdate(slot = "shop", custom = false) {
		const model = Renderer.locateModel("main", slot);
		if (!model.canvas) return false;

		// The highlights dye is its own overlay-art style, so it must not be flattened into a gradient here.
		const highlights = !!V.specialTwoToneHairDye;
		const style = highlights ? "highlights" : V.moddedTwoToneHairDye ? moddedTwoToneStyle(V.moddedTwoToneStyle) : vanillaTwoToneStyle(V.twoToneStyle);
		const gradient = {
			style,
			colours: custom ? ["tmp0", "tmp1"] : [V.twoToneDyeOption1, V.twoToneDyeOption2],
		};
		if (V.dyedHairPart !== "fringe") {
			model.options.hair_colour_style = highlights ? "highlights" : "gradient";
			model.options.hair_colour_gradient = gradient;
		}
		if (V.dyedHairPart !== "sides") {
			model.options.hair_fringe_colour_style = highlights ? "highlights" : "gradient";
			model.options.hair_fringe_colour_gradient = gradient;
		}
		model.redraw();
		return true;
	},

	/**
	 * @param {number} index
	 */
	setColorHex(index = 0) {
		const hex = prompt("Enter new hex code", "#FFFFFF");
		if (!!hex && tinycolor(hex).getFormat() === "hex") {
			this.syncColorPicker(index, hex);
		} else if (hex) {
			alert("Invalid hex code :(");
		}
	},

	syncColorPicker(index = 0, color = "#FFFFFF", colorName = `tmp${index}`) {
		this.pickers[index].color.hexString = color.toUpperCase();
		this.syncColorValue(index, color, colorName);
	},

	// throttled live-preview re-render;
	// keeps the heavy canvas render from firing on every picker / slider tick (lazily built so it works regardless of script load order)
	mannequinUpdate() {
		if (!this._mannequinUpdate) {
			this._mannequinUpdate = colorUtils.throttle(() => {
				Wikifier.wikifyEval("<<dhmMannequinUpdate>>");
			}, 150);
		}
		this._mannequinUpdate();
	},

	syncColorValue(index = 0, color = "#FFFFFF", colorName = `tmp${index}`) {
		dhmod.tmp.colors[index] = colorName;
		setup.colours.hair_map[`tmp${index}`].canvasfilter.blend = color;

		this.mannequinUpdate();
		$(`#hex${index}`).text("").append(color.toUpperCase());
	},

	syncColorBrightnessSlider(index = 0, brightness = 0, colorName = `tmp${index}`) {
		this.syncColorBrightness(index, brightness, colorName);
		Wikifier.wikifyEval(`<<replace #brightness${index}>><<numberslider "_dhBrightness${index}" ${brightness} -1 1 0.1>><</replace>>`);
		$(`#numberslider-input--dhbrightness${index}`).on("input change", function (e) {
			dhmShop.syncColorBrightness(index, T[`dhBrightness${index}`]);
		});
	},

	syncColorBrightness(index = 0, brightness = 0, colorName = `tmp${index}`) {
		setup.colours.hair_map[`tmp${index}`].canvasfilter.brightness = brightness;
		dhmod.tmp.colors[index] = colorName;
		this.mannequinUpdate();
	},

	/*
        generate the color pickers
        Vanilla DoL embeds iro.js color picker library so we using that
        u can read its docs @ iro.js.org
    */
	pickerGen(index = 0, color = "FFFFFF") {
		const picker = new iro.ColorPicker(`#picker${index}`, {
			color,
			width: 250,
			layout: [
				{
					component: iro.ui.Box,
				},
				{
					component: iro.ui.Slider,
					options: { sliderType: "hue" },
				},
			],
		});

		picker.on(["color:init", "color:change"], function (color) {
			dhmShop.syncColorValue(index, color.hexString);
		});

		this.pickers.push(picker);
	},

	pickerResizeAll() {
		for (let i = 0; i < this.pickers.length; i++) {
			this.pickers[i].resize(this.pickerAutoWidth());
		}
	},

	// Slightly modified vanilla snippet.
	// resizes the picker according to window size
	pickerAutoWidth() {
		if (V.twoToneHairDye || V.specialTwoToneHairDye || V.moddedTwoToneHairDye) {
			if (window.innerWidth > 600) return 220;
			if (window.innerWidth > 500) return 210;
		}
		// seems columns wrap around here
		if (window.innerWidth > 600 && window.innerHeight > 400) return 220;
		if (window.innerWidth > 500 && window.innerHeight > 325) return 210;
		return 150;
	},
	// }}}
};

Object.defineProperty(window, "dhmShop", { get: () => dhmShop });
