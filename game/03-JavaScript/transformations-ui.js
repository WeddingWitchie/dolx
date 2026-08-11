const TransformationsInterface = (() => {
	"use strict";

	// eslint-disable-next-line prefer-const
	let defaultColour = "rgb(255, 255, 0)";

	let current = null;

	function generateColourPicker() {
		const container = document.createElement("div");
		const passageWidth = document.querySelector("#passages")?.clientWidth || window.innerWidth;
		const picker = new iro.ColorPicker(container, {
			color: defaultColour,
			// The picker is created inside a closed, hidden menu, so it cannot measure its own width reliably.
			width: Math.max(160, Math.min(300, passageWidth - 24)),
			layout: [
				{
					component: iro.ui.Slider,
					options: {
						sliderType: "hue",
					},
				},
				{
					component: iro.ui.Slider,
					options: {
						sliderType: "saturation",
					},
				},
				{
					component: iro.ui.Slider,
					options: {
						sliderType: "value",
					},
				},
			],
		});
		picker.on("color:change", colour => {
			let hasMutated = false;
			const checkedItems = document.querySelectorAll('input[name="colour-selector"]:checked');
			for (const item of checkedItems) {
				const { h, s, l } = colour.hsl;
				State.setVar(item.dataset.target, { h, s, l });
				hasMutated = true;
			}
			if (hasMutated) Wikifier.wikifyEval("<<updatesidebarimg true>>");
		});
		current = picker;
		return {
			element: container.children[0],
			picker,
		};
	}

	// Hide the colour picker unless TF parts are checked
	function colourPickerVisibility() {
		const colourMenu = document.querySelector(".tf-custom-colours");
		if (!colourMenu) return;
		const menuWarning = colourMenu.querySelector(".menuWarning");
		const menuContent = colourMenu.querySelector(".menuContent");
		const checkboxes = document.querySelectorAll('input[name="colour-selector"]');

		const isVisible = Array.from(checkboxes).some(checkbox => checkbox.checked);

		if (isVisible) {
			menuWarning.classList.add("hidden");
			menuContent.classList.remove("hidden");
		} else {
			menuWarning.classList.remove("hidden");
			menuContent.classList.add("hidden");
		}
	}

	function generateColourSquares(options) {
		const output = document.createDocumentFragment();
		if (Array.isArray(options)) {
			const containerList = document.createElement("div");
			containerList.classList.add("list", "row", "wrap", "colour-presets");
			/* Creation of square buttons. */
			options.forEach(option => {
				const square = document.createElement("div");
				square.classList.add("colour-preset");
				square.dataset.colour = "#" + option;
				square.style.backgroundColor = "#" + option;
				// eslint-disable-next-line no-undef
				square.style.borderColor = "#" + ColourUtils.invertHex(option);
				/* event handler */
				square.addEventListener("click", ev => {
					if (current != null) {
						current.color.set(ev.target.dataset.colour);
					}
				});
				/* Append to list */
				containerList.append(square);
			});
			/* Append our list to the output. */
			output.append(containerList);
		}
		return output;
	}

	function generateSelector(target) {
		const output = document.createDocumentFragment();

		const checkbox = document.createElement("input");
		checkbox.classList.add("colour-selector");
		checkbox.type = "checkbox";
		checkbox.name = "colour-selector";
		checkbox.value = "value";
		checkbox.dataset.target = target;
		checkbox.addEventListener("change", colourPickerVisibility);

		output.append(checkbox);
		return output;
	}

	function clearSelectedColours() {
		let hasMutated = false;
		const checkedItems = document.querySelectorAll('input[name="colour-selector"]:checked');
		for (const item of checkedItems) {
			const match = /^\$transformationParts\.([a-zA-Z]+)\.([a-zA-Z_]+)$/.exec(item.dataset.target);
			if (!match) continue;
			const partState = State.variables.transformationParts?.[match[1]];
			if (partState && Object.hasOwn(partState, match[2])) {
				delete partState[match[2]];
				hasMutated = true;
			}
		}
		if (hasMutated) Wikifier.wikifyEval("<<updatesidebarimg true>>");
	}

	Macro.add("gencolourselector", {
		handler() {
			const target = this.args[0];
			const component = generateSelector(target);
			this.output.append(component);
			T.isMenuEnabled = true;
		},
	});

	Macro.add("gencoloursquares", {
		handler() {
			const options = this.args[0];
			const component = generateColourSquares(options);
			this.output.append(component);
		},
	});

	Macro.add("gencolourpicker", {
		handler() {
			const { element } = generateColourPicker();
			this.output.append(element);

			/* Cleanup at end of passage */
			$(document).one(":passageinit", () => {
				current = null;
			});
		},
	});

	return {
		generateColourPicker,
		generateColourSquares,
		clearSelectedColours,
		current: () => current,
	};
})();
window.TransformationsInterface = TransformationsInterface;
