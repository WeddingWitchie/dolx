const ccmUtils = {
	versionUpdate() {
		// filters are handled differently now
		if (ccmod.filters) {
			delete ccmod.filters;
		}
		console.log("deprecated filters");

		for (const category of setup.ccmod.categories) {
			console.log("moving equipped makeup");
			if (V.makeup[`${category}_custom`] !== undefined) {
				if (V.makeup[`${category}_custom`]) {
					ccmod.equipped[category] = this.itemGen(
						this.filterDecode(this.stringConvert(V.makeup[`${category}_custom`])),
						Boolean(V.makeup[`${category}_waterproof`])
					);
				}
				delete V.makeup[`${category}_custom`];
				V.makeup[category] = 0;
			}

			console.log("converting owned makeup");
			for (const i in ccmod.owned[category]) {
				ccmod.owned[category][i] = {
					filterString: this.stringConvert(ccmod.owned[category][i].filterName),
					waterproof: Boolean(ccmod.owned[category][i].waterproof),
					count: ccmod.owned[category][i].count,
				};
			}

			// convert old preset items
			console.log("converting makeup presets");
			if (V.makeup.presets !== undefined) {
				for (const preset of Object.keys(V.makeup.presets)) {
					if (V.makeup.presets[preset][`${category}_custom`]) {
						V.makeup.presets[preset][category] = 0;
						V.makeup.presets[preset][`${category}_custom`] = {
							filterString: this.stringConvert(V.makeup.presets[preset][`${category}_custom`]),
							waterproof: Boolean(V.makeup.presets[preset][`${category}_waterproof`]),
						};
					}
					delete V.makeup.presets[preset][`${category}_waterproof`];
				}
			}
		}

		console.log("converting ccmod presets");
		if (ccmod.userPresets !== undefined) {
			for (const preset of Object.keys(ccmod.userPresets)) {
				ccmod.userPresets[preset] = this.stringConvert(ccmod.userPresets[preset]);
			}
		}

		this.colorCache();
	},

	/**
	 * @param {string} hexCode
	 * @returns {string}
	 */
	stringFromHex(hexCode) {
		return dolxColor.stringFromHex(hexCode);
	},

	/**
	 * @param {string} oldString
	 * @returns {string}
	 */
	stringConvert(oldString) {
		if (!oldString.includes(";")) {
			return oldString.replace("-", ";");
		}
		return oldString;
	},

	/**
	 * @param {string} filterString
	 * @returns {Array<string|number>} [hex, brightness]
	 */
	stringDecode(filterString) {
		return dolxColor.stringDecode(filterString);
	},

	/**
	 * @param {string} filterString
	 * @returns {string}
	 */
	string2Css(filterString) {
		const colordata = this.filterDecode(filterString);
		return `background: ${colordata.blend}; filter: brightness(${1 + colordata.brightness});`;
	},

	// added 130
	/**
	 * @param {string} filterString
	 * @returns {boolean}
	 */
	stringIsValid(filterString) {
		return dolxColor.stringIsValid(filterString);
	},
	// }}}

	/**
	 *COLORS COLORS COLORS COLORS
	 *added 200
	 */
	colorCache() {
		this.ensurePickerSlots();
		this.colorCachePrepare();
		this.colorCachePush();
	},

	/**
	 * The "tmp"/"tmp1" picker slots in setup.colours are normally seeded by colorCache() during the load-time mod update.
	 * Boot orders that skip that pass (e.g. mod-loader builds) leave them missing and the first picker sync crashes on `.tmp.canvasfilter`, so every UI entry point re-ensures them here.
	 */
	ensurePickerSlots() {
		for (const category of setup.ccmod.categories) {
			if (!setup.colours[`${category}_map`]) {
				setup.colours[`${category}_map`] = {};
			}
			const map = setup.colours[`${category}_map`];
			for (const slot of ["tmp", "tmp1"]) {
				if (!map[slot]?.canvasfilter) {
					map[slot] = {
						name: "color picker slot",
						canvasfilter: this.filterGen(),
					};
				}
			}
		}
	},

	colorCachePrepare() {
		for (const category of setup.ccmod.categories) {
			// cache equipped
			if (this.itemIsValid(ccmod.equipped[category])) {
				setup.ccmod[`${category}_cache`][ccmod.equipped[category].filterString] = this.filterDecode(ccmod.equipped[category].filterString);
			}

			// cache used in makeup preset
			if (V.makeup.presets !== undefined) {
				for (const preset of Object.keys(V.makeup.presets)) {
					if (this.itemIsValid(V.makeup.presets[preset][`${category}_custom`])) {
						const f = V.makeup.presets[preset][`${category}_custom`].filterString;
						setup.ccmod[`${category}_cache`][f] = this.filterDecode(f);
					}
				}
			}
		}
	},

	colorCachePush() {
		for (const category of setup.ccmod.categories) {
			const entries = Object.entries(setup.ccmod[`${category}_cache`]);

			for (const entry of entries) {
				if (entry[1]?.blend) {
					const _name = entry[1].name ? entry[1].name : colorNameTranslate(colorNamer(entry[1].blend), "spaced name");
					setup.colours[`${category}_map`][entry[0]] = {
						name: _name,
						name_cap: _name,
						canvasfilter: entry[1],
					};
				} else {
					setup.colours[`${category}_map`][entry[0]] = {
						name: "color picker slot",
						canvasfilter: this.filterGen(),
					};
				}
			}
		}
	},

	/**
	 * @param {string} filterString
	 * @returns {string}
	 */
	colorNameFromPreset(filterString) {
		const key = this.presetCheckDuplicate(filterString);
		return key || "custom";
	},

	/**
	 * @param {string} blend
	 * @param {number} brightness
	 * @returns {Canvasfilter}
	 */
	filterGen(blend = "#FFFFFF", brightness = 0) {
		return {
			blend,
			blendMode: "hard-light",
			brightness,
			desaturate: !ccmod.cfg.skipDesaturate,
		};
	},

	/**
	 * @param {Canvasfilter} filter
	 * @returns {string}
	 */

	filterEncode(filter) {
		return dolxColor.filterEncode(filter);
	},

	/**
	 * @param {string} filterString
	 * @returns {Canvasfilter}
	 */
	filterDecode(filterString) {
		const colordata = this.stringDecode(filterString);
		return this.filterGen(colordata[0], colordata[1]);
	},

	/**
	 * @param {Canvasfilter} filter
	 * @param {boolean} waterproof
	 * @param {number} [count] Remaining uses.
	 * @returns {ccmItem}
	 */
	itemGen(filter, waterproof = false, count = 0) {
		const filterString = this.filterEncode(filter);
		return {
			filterString,
			waterproof,
			count,
		};
	},

	/**
	 * @param {ccmItem} newItem
	 * @param {string} itemType
	 */
	itemAdd(newItem, itemType) {
		for (const i in ccmod.owned[itemType]) {
			if (this.itemCompare(newItem, ccmod.owned[itemType][i])) {
				ccmod.owned[itemType][i].count += newItem.count;
				return false;
			}
		}
		ccmod.owned[itemType].push(newItem);
	},

	/**
	 * @param {ccmItem} a
	 * @param {ccmItem} b
	 * @returns {boolean}
	 */
	itemCompare(a, b) {
		if (!this.itemIsValid(a) || !this.itemIsValid(b)) {
			return false;
		}
		if (a.filterString === b.filterString && a.waterproof === b.waterproof) {
			return true;
		}
		return false;
	},

	/**
	 * @param {string} category
	 * @param {ccmItem} item
	 * @returns {boolean}
	 */
	itemIsEquipped(category, item) {
		if (this.itemIsValid(ccmod.equipped[category])) {
			return this.itemCompare(ccmod.equipped[category], item);
		}
		return false;
	},

	/**
	 * @param {ccmItem} item
	 * @returns {boolean}
	 */
	itemIsValid(item) {
		if (!item) {
			return false;
		}

		if (typeof item !== "object") {
			return false;
		}

		if (Object.keys(item).length < 1) {
			return false;
		}

		if (!Object.hasOwn(item, "filterString")) {
			return false;
		}

		return true;
	},

	// combs thru owned items array and deletes not needed or corrupted
	/**
	 *
	 * @param {string} category
	 */
	stockUpdate(category) {
		for (const i in ccmod.owned[category]) {
			if (ccmod.owned[category][i].count === 0) {
				ccmod.owned[category].splice([i], 1);
			}
		}
	},

	// combs thru all supported makeup types and deletes unused
	stockUpdateAll() {
		for (const category of setup.ccmod.categories) {
			if (ccmod.owned[category]) {
				this.stockUpdate(category);
			}
		}
	},
	// }}}

	// for renderer
	// sends filter info. to canvasmodel
	rendererSetup() {
		for (const category of setup.ccmod.categories) {
			if (this.itemIsValid(ccmod.equipped[category])) {
				T.modeloptions[`${category}_colour`] = ccmod.equipped[category].filterString;
				T.modeloptions[`${category}_custom`] = true;
			}
		}
	},

	/**
	 * @param {string} name
	 * @param {string} filterString
	 */
	presetAdd(name, filterString) {
		ccmod.userPresets[name] = filterString;
	},

	/**
	 * @param {string} presetName
	 */
	presetDelete(presetName) {
		if (ccmod.userPresets[presetName]) {
			delete ccmod.userPresets[presetName];
		}
	},

	/**
	 * @param {string} presetName
	 * @returns {Canvasfilter}
	 */
	presetLoad(presetName) {
		return this.filterDecode(ccmod.userPresets[presetName]);
	},

	/**
	 * @param {string} filterString
	 */
	presetCheckDuplicate(filterString) {
		for (const [key, entry] of Object.entries(V.ccmod.userPresets)) {
			if (entry === filterString) {
				return key;
			}
		}
		return false;
	},

	/**
	 * new in 200
	 */
	presetPurge() {
		ccmod.userPresets = {};
	},

	/**
	 * @param {string} presetName
	 * @returns {Canvasfilter|undefined} undefined when no such preset is loaded
	 */
	presetLoadTmp(presetName) {
		if (T.ccmLoaded.passed[presetName]) {
			return this.filterDecode(T.ccmLoaded.passed[presetName]);
		}
	},

	/**
	 * @param {string} presetName
	 * @param {string} filterString
	 */
	presetAddTmp(presetName, filterString) {
		T.ccmLoaded.passed[presetName] = filterString;
	},

	/**
	 * @param {string} presetName
	 */
	presetDeleteTmp(presetName) {
		if (T.ccmLoaded.passed[presetName]) {
			delete T.ccmLoaded.passed[presetName];
		}
	},

	/**
	 * checks for naming conflicts between tmp presets x saved presets
	 *
	 * @returns {boolean}
	 */
	presetDupeHunt() {
		for (const key of Object.keys(T.ccmLoaded.passed)) {
			if (ccmod.userPresets[key]) {
				return true;
			}
		}
		return false;
	},

	/**
	 * comb thru each imported entry and ensure they pass all validation cases
	 *
	 * @param {ColorDict} json
	 * @returns {FileLog}
	 */
	presetReadFile(json) {
		const results = { errors: 0, passed: {}, skip: {} };
		for (let [key, entry] of Object.entries(json)) {
			const tinyconvert = tinycolor(entry);

			if (tinyconvert.isValid()) {
				entry = this.stringFromHex(tinyconvert.toHexString());
			}

			if (this.stringIsValid(entry)) {
				if (this.presetCheckDuplicate(entry)) {
					results.skip[key] = entry;
				} else {
					results.passed[key] = entry;
				}
			} else {
				results.errors++;
				console.warn(`[custom makeup mod utils] presetReadFile: error decoding ${key}: ${entry}, entry invalid or not compatible`);
			}
		}
		return results;
	},

	/**
	 * @returns {object}
	 */
	presetBulkImport() {
		const log = { overwritten: 0, imported: 0, skipped: 0 };
		for (const [key, entry] of Object.entries(T.ccmLoaded.passed)) {
			if (!ccmod.userPresets[key] || ccmod.cfg.overwrite) {
				if (ccmod.userPresets[key] && ccmod.cfg.overwrite) {
					log.overwritten++;
				}
				log.imported++;
				ccmod.userPresets[key] = entry;
			} else {
				log.skipped++;
			}
		}
		return log;
	},
};

Object.defineProperty(window, "ccmUtils", { get: () => ccmUtils });
