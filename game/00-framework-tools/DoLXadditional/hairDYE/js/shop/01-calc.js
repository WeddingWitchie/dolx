dhmShop.prices = {};
dhmShop.prices.hairCut = 3000;
dhmShop.prices.fringeCut = 2000;
dhmShop.prices.fullCut =
	dhmShop.prices.hairCut + dhmShop.prices.fringeCut * 0.45;

dhmShop.prices.browDye = 2000;
dhmShop.prices.browClear = 1000;

dhmShop.prices.dyeBase = 5000;
dhmShop.prices.dyeBaseFringe = 2000;
dhmShop.prices.twoToneBase = Math.round(
	dhmShop.prices.dyeBase + dhmShop.prices.dyeBase * 0.48,
);

// assume achieving a non-standard dye color involves mixing at least two dyes
dhmShop.prices.dyeCustom = dhmShop.prices.twoToneBase;
dhmShop.prices.twoToneCustom = Math.round(
	dhmShop.prices.dyeCustom + dhmShop.prices.dyeCustom * 0.45,
);

/**
 * @param {number} basePrice
 * @returns {number}
 */
dhmShop.priceHair = function (basePrice = 3000) {
	if (V.hairlength / 200 > 1) {
		const growthStage = Math.floor(V.hairlength / 200);
		const growthExcedent = V.hairlength % 200;
		const stageTax = Math.round(basePrice * 0.2);
		const lengthTax = (stageTax * 0.35) / 100;

		return Math.round(
			stageTax * growthStage + lengthTax * growthExcedent + basePrice,
		);
	}
	return basePrice;
};

/**
 * @param {number} basePrice
 * @returns {number}
 */
dhmShop.priceFringe = function (basePrice = 3000) {
	basePrice = Math.round(basePrice * 0.85);
	const growthStage = Math.trunc(V.fringelength / 200);

	if (growthStage > 1) {
		const stageTax = Math.round(basePrice * 0.15);
		return Math.round(stageTax * growthStage + basePrice);
	}

	return basePrice;
};

/**
 * @param {string} type
 * @param {string} area
 * @returns {number}
 */
dhmShop.calcWrapper = function (type = "simple", area = "hair") {
	let basePrice;
	switch (type) {
		case "simple":
			basePrice = dhmShop.prices.dyeBase;
			break;
		case "gradient":
			basePrice = dhmShop.prices.twoToneBase;
			break;
		case "simple-custom":
			basePrice = dhmShop.prices.dyeCustom;
			break;
		case "gradient-custom":
			basePrice = dhmShop.prices.twoToneCustom;
			break;
	}

	switch (area) {
		case "hair":
			return Math.min(
				Math.round(
					dhmShop.priceFringe(basePrice) * 0.55 +
						dhmShop.priceHair(basePrice),
				),
				25000,
			);
		case "fringe":
			return dhmShop.priceFringe(basePrice);
		case "sides":
			return dhmShop.priceHair(basePrice);
	}
};

dhmShop.cashGrabCustom = function () {
	let total = 0;

	if (V.twoToneHairDye) {
		switch (V.dyedHairPart) {
			case "fringe":
				total += dhmShop.calcWrapper("gradient-custom", "fringe");
				break;
			case "sides":
				total += dhmShop.calcWrapper("gradient-custom", "sides");
				break;
			case "hair":
				total += dhmShop.calcWrapper("gradient-custom", "hair");
				break;
		}
	} else {
		switch (V.dyedHairPart) {
			case "fringe":
				total += dhmShop.calcWrapper("simple-custom", "fringe");
				break;
			case "sides":
				total += dhmShop.calcWrapper("simple-custom", "sides");
				break;
			case "hair":
				total += dhmShop.calcWrapper("simple-custom", "hair");
				break;
		}
	}

	return total;
};

dhmShop.cashGrab = function () {
	let total = 0;

	if (V.dyeOption !== "noChange" && !V.twoToneHairDye) {
		switch (V.dyedHairPart) {
			case "fringe":
				total += dhmShop.calcWrapper("simple", "fringe");
				break;
			case "sides":
				total += dhmShop.calcWrapper("simple", "sides");
				break;
			case "hair":
				total += dhmShop.calcWrapper("simple", "hair");
				break;
		}
	} else if (V.twoToneHairDye) {
		switch (V.dyedHairPart) {
			case "fringe":
				total += dhmShop.calcWrapper("gradient", "fringe");
				break;
			case "sides":
				total += dhmShop.calcWrapper("gradient", "sides");
				break;
			case "hair":
				total += dhmShop.calcWrapper("gradient", "hair");
				break;
		}
	}

	if (V.fringeOption != V.fringelength && V.hairOption != V.hairlength) {
		total += dhmShop.prices.fullCut;
	} else if (V.fringeOption != V.fringelength) {
		total += dhmShop.prices.fringeCut;
	} else if (V.hairOption != V.hairlength) {
		total += dhmShop.prices.hairCut;
	}

	if (V.browsDyeOption == "removeDye") {
		total += dhmShop.prices.browClear;
	} else if (V.browsDyeOption != "noChange") {
		total += dhmShop.prices.browDye;
	}

	return total;
};
