/*
 * Usage:
 *
 * <<doubleslider VAR1 VAR2 VAR3 LEFTCOLOR MIDDLECOLOR RIGHTCOLOR>>
 *
 * The vars should be the variable name WITHOUT the "$", or a "$settings.key" path.
 * Colors can be any css-compatible colour string, like "#00FF00" or "rgb(0,255,0)".
 *
 * Creates a 0-100 range with a single handle and two labels (left/right).
 * VAR1 + VAR3 = 100. VAR2 is always set to 0 (kept for back-compat with code that still reads the "middle" variable, e.g. $fhermchance / $mhermchance).
 */
Macro.add("doubleslider", {
	handler() {
		let [var1, var2, var3, leftcolor, middlecolor, rightcolor] = this.args;
		if (this.args.length !== 3 && this.args.length !== 6) {
			throw new Error("Bad doubleslider args " + JSON.stringify(this.args));
		}
		if (this.args.length === 3) {
			leftcolor = "#fa0000";
			middlecolor = "#ab00fa";
			rightcolor = "#006cfa";
		}

		const varKey = name => String(name).replace(/^\$/, "");

		function getValue(name) {
			const key = varKey(name);
			if (key.startsWith("settings.")) return V.settings?.[key.slice(9)] ?? 0;
			return V[key] ?? 0;
		}

		function setValue(name, value) {
			const key = varKey(name);
			if (key.startsWith("settings.")) {
				if (!V.settings) V.settings = {};
				V.settings[key.slice(9)] = value;
			} else {
				V[key] = value;
			}
		}

		function updateText(name, value) {
			const element = document.getElementById("numberslider-value-" + varKey(name));
			if (element) element.textContent = value;
		}

		function updateValues(data) {
			let bar2 = data.slider.find(".irs-bar2");
			if (bar2.length === 0) bar2 = $("<span>").addClass("irs-bar2").appendTo(data.slider);

			const leftValue = getValue(var1);
			const rightValue = getValue(var3);

			const leftLabel = data.slider.find(".irs-from");
			const middleLabel = data.slider.find(".irs-single");
			const rightLabel = data.slider.find(".irs-to");

			bar2.css("width", "" + (data.from / (data.max - data.min)) * 100 + "%");

			leftLabel.css("visibility", leftValue > 0 ? "visible" : "hidden");
			middleLabel.css("visibility", "hidden");
			rightLabel.css("visibility", rightValue > 0 ? "visible" : "hidden");

			leftLabel.html(leftValue + "%");
			rightLabel.html(rightValue + "%");

			const a = data.max - data.min;
			leftLabel.css("left", "calc(" + (data.from / a) * 50 + "% - " + leftLabel.width() / 2 + "px)");
			rightLabel.css("left", "calc(" + (data.from + (100 - data.from) / 2) + "% - " + rightLabel.width() / 2 + "px)");
		}

		const input = $("<input>")
			.appendTo(this.output)
			.ionRangeSlider({
				type: "single",
				skin: "roundprobability",
				hide_min_max: true,
				postfix: "%",
				min: 0,
				max: 100,
				from: getValue(var1),
				onStart(data) {
					setValue(var2, 0);
					setValue(var3, 100 - getValue(var1));

					updateValues(data);

					data.slider.find(".irs-handle.single").css("--color", leftcolor);
					data.slider.find(".irs-from").css("--color", leftcolor);
					data.slider.find(".irs-bar2").css("--color", leftcolor);

					data.slider.find(".irs-single").css("--color", middlecolor);
					data.slider.find(".irs-bar").css("--color", middlecolor);

					data.slider.find(".irs-to").css("--color", rightcolor);
					data.slider.find(".irs-line").css("--color", rightcolor);
				},
				onChange(data) {
					setValue(var1, data.from);
					setValue(var2, 0);
					setValue(var3, 100 - data.from);

					updateText(var1, getValue(var1));
					updateText(var2, getValue(var2));
					updateText(var3, getValue(var3));

					updateValues(data);
				},
			});

		const slider = input.data("ionRangeSlider");
		const oldDrawHandles = slider.drawHandles;
		slider.drawHandles = function () {
			oldDrawHandles.call(this);
			updateValues(this.result);
		};
		slider.callOnChange();
	},
});
