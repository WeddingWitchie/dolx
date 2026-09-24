Macro.add("skybox", {
	handler() {
		Weather.sidebar.skybox.appendTo(this.output);
	},
});

Macro.add("banner", {
	handler() {
		// DoLX: the title screen shows our own banner art instead of vanilla's animated weather banner.
		$("<div />", { id: "canvasBanner" })
			.append($("<img />", { src: "img/misc/banner.png" }))
			.appendTo(this.output);
	},
});

Macro.add("thermometer", {
	handler() {
		Weather.Thermometer.element.appendTo(this.output);
		Weather.Thermometer.tooltipElement.appendTo(this.output);
		Weather.Thermometer.update();
	},
});

Macro.add("weatherIcon", {
	handler() {
		const iconDiv = $("<div />", { id: "weatherIcon" });
		const iconImg = $("<img />");

		const dayState = Weather.bloodMoon ? "blood" : Weather.dayState === "night" ? "night" : "day";
		const weatherState = resolveValue(Weather.current.iconType, "clear");
		const path = `img/ui/weather/${dayState}-${weatherState}.png`;

		iconImg.attr("src", path);
		Weather.Tooltips.skybox(iconImg);
		iconDiv.append(iconImg);
		iconDiv.appendTo(this.output);
	},
});
