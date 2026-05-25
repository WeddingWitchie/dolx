const dhmShop = {
	pickers: [],

	/**
	 ** PRESET PRESET PRESET PRESET
	 **
	 ** {{{ */
	presetAttachHooks(index = 0) {
		$(`#delete${index} button`).prop("disabled", true);

		$(`#listbox--presetselected${index}`).on("change", function (e) {
			if (
				!!T[`presetSelected${index}`] &&
				T[`presetSelected${index}`].length > 0
			) {
				dhmShop.presetAutoload(T[`presetSelected${index}`], index);
				$(`#delete${index} button`).prop("disabled", false);
			}
		});
	},

	/**
	 */
	presetBoxRefresh() {
		for (let i = 0; i < this.pickers.length; i++) {
			Wikifier.wikifyEval(
				`<<replace "#preset-dropdown-container-${i}">><<dhmPresetsDropdown ${i}>><</replace>>`,
			);
			this.presetAttachHooks(i);
		}
	},

	/**
	 * @param {Canvasfilter} rawFilter
	 * @returns {boolean}
	 */
	presetBtnSave(rawFilter) {
		const filterString = dhmUtils.filterEncode(rawFilter);
		const presetName = prompt("Name your preset", "Preset");

		if (!!presetName) {
			if (V.dhmod.userPresets[presetName]) {
				alert(
					`'${presetName}' was not saved because another preset with the same name already exists.`,
				);
				return true;
			}

			let duplicate = dhmUtils.presetExists(filterString);
			if (duplicate) {
				alert(
					`'${presetName}' was not saved because this color is already saved as '${duplicate}'.`,
				);
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
		let newFilter = dhmUtils.presetLoad(selectedPreset);
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
			is_custom: dhmod.hair.is_custom ? true : false,
		};

		if (V.hairColourStyle === "simple") {
			dhmod.tmp.colors = [V.haircolour, V.haircolour];
			dhmod.tmp.originalColors = [V.haircolour, V.haircolour];
		} else {
			V.twoToneStyle = V.hairColourGradient.style;
			dhmod.tmp.colors = [...V.hairColourGradient.colours];
			dhmod.tmp.originalColors = [...V.hairColourGradient.colours];
		}

		for (let i in dhmod.tmp.colors) {
			let activeFilter = dhmUtils.getActiveHairFilter(i);
			if (!!activeFilter) {
				setup.colours.hair_map[`tmp${i}`].canvasfilter.blend =
					activeFilter.blend;
				setup.colours.hair_map[`tmp${i}`].canvasfilter.brightness =
					activeFilter.brightness;
				dhmod.tmp.brightnessStart[i] = activeFilter.brightness;
				dhmod.tmp.blendStart[i] = activeFilter.blend;
			}
			if (dhmod.tmp.is_custom) {
				dhmod.tmp.colors[i] = `tmp${i}`;
			}
		}
	},
	// }}}

	compileGradient(colors = ["tmp0", "tmp1"], tmp = 0) {
		let compiled = {
			style: V.twoToneStyle,
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

	/**
	 ** PICKER PICKER PICKER PICKER
	 **
	 ** {{{ */
	setColorHex(index = 0) {
		const hex = prompt("Enter new hex code", "#FFFFFF");
		if (!!hex && tinycolor(hex).getFormat() === "hex") {
			this.syncColorPicker(index, hex);
		} else if (!!hex) {
			alert("Invalid hex code :(");
		}
	},

	syncColorPicker(index = 0, color = "#FFFFFF", colorName = `tmp${index}`) {
		this.pickers[index].color.hexString = color.toUpperCase();
		this.syncColorValue(index, color, colorName);
	},

	syncColorValue(index = 0, color = "#FFFFFF", colorName = `tmp${index}`) {
		dhmod.tmp.colors[index] = colorName;
		setup.colours.hair_map[`tmp${index}`].canvasfilter.blend = color;

		Wikifier.wikifyEval("<<dhmMannequinUpdate>>");
		$(`#hex${index}`).text("").append(color.toUpperCase());
	},

	syncColorBrightnessSlider(
		index = 0,
		brightness = 0,
		colorName = `tmp${index}`,
	) {
		this.syncColorBrightness(index, brightness, colorName);
		Wikifier.wikifyEval(
			`<<replace #brightness${index}>><<numberslider "_dhBrightness${index}" ${brightness} -1 1 0.1>><</replace>>`,
		);
		$(`#numberslider-input--dhbrightness${index}`).on(
			"input change",
			function (e) {
				dhmShop.syncColorBrightness(index, T[`dhBrightness${index}`]);
			},
		);
	},

	syncColorBrightness(index = 0, brightness = 0, colorName = `tmp${index}`) {
		setup.colours.hair_map[`tmp${index}`].canvasfilter.brightness =
			brightness;
		dhmod.tmp.colors[index] = colorName;
		Wikifier.wikifyEval("<<dhmMannequinUpdate>>");
	},

	/*
        generate the color pickers
        Vanilla DoL embeds iro.js color picker library so we using that
        u can read its docs @ iro.js.org
    */
	pickerGen(index = 0, color = "FFFFFF") {
		let picker = new iro.ColorPicker(`#picker${index}`, {
			color: color,
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

	// slightly modified vanilla snippet 😇
	// resizes the picker according to window size
	pickerAutoWidth() {
		if (!!V.twoToneHairDye) {
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
