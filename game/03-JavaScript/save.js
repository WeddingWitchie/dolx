/* globals autismTalentLimit */

const DoLSave = ((Story, Save) => {
	"use strict";

	const DEFAULT_DETAILS = Object.freeze({
		id: Story.domId,
		autosave: null,
		slots: [null, null, null, null, null, null, null, null],
	});
	const KEY_DETAILS = "dolSaveDetails";

	// Compressed saves are indicated by {jsoncompressed:1} in their metadata
	// The '1' can act as a compression algorithm id.

	// see game/00-framework-tools/03-compression/dictionaries.js
	const COMPRESSOR_DICTIONARIES = DoLCompressorDictionaries;
	// id of the dictionary to use for saving
	const COMPRESSOR_CURRENT_DICTIONARY_ID = "v3";
	/**
	 * When saving, decompress and compare with the original.
	 * If results differ, report an error and save the uncompressed version instead.
	 */
	function shouldVerifyCompression() {
		return true;
	}

	/* Place somewhere to expose globally. */
	function isObject(obj) {
		return typeof obj === "object" && obj != null;
	}

	/* Can also call from backcomp in the future? */
	function getSaveVersion(variables) {
		if (isObject(variables)) {
			if (!variables.saveVersions) {
				return -1;
			}
			return variables.saveVersions.last();
		}
		return -2;
	}

	function marshalVersion(version) {
		return typeof version === "string"
			? version
					.replace(/[^0-9.]+/g, "")
					.split(".")
					.map(v => parseInt(v))
			: [0, 0, 0, 0];
	}

	function parseVersion(version) {
		version = marshalVersion(version);
		return version ? version[0] * 1000000 + version[1] * 10000 + version[2] * 100 + version[3] * 1 : 0;
	}

	/**
	 * The handler which the load button should call.
	 * Contains checks to determine whether the save loads or pops up a confirmation window.
	 *
	 * @param {any} slot The slot ID to get the save from. 0 to 9, or 'auto'.
	 * @param {boolean} confirm Bypass the load confirmation.
	 * @returns {void}
	 */
	function loadHandler(slot, confirm) {
		if (V.ironmanmode === true && V.passage !== "Start") {
			Wikifier.wikifyEval(`<<loadIronmanSafetyCancel ${slot}>>`);
			return;
		}
		if (V.confirmLoad === true && confirm === undefined) {
			Wikifier.wikifyEval(`<<loadConfirm ${slot}>>`);
			return;
		}
		const save = slot === "auto" ? Save.autosave.get() : Save.slots.get(slot);
		// an empty slot gives back null, which is not the same as an empty save. JavaScript treats null as an object.
		// so checking the type alone would let an empty slot through and crash - isObject rules out null
		if (!isObject(save)) {
			Errors.report("Could not find a valid save at that slot.", {});
			return;
		}
		const currVersion = parseVersion(StartConfig.version);
		/* Assume the save->variables is valid if an object. */
		const saveVersion = parseVersion(getSaveVersion(save.state.delta[0].variables));
		if (currVersion < saveVersion) {
			Wikifier.wikifyEval(`<<loadconfirmcompat ${slot}>>`);
			return;
		}
		load(slot, save);
	}

	/**
	 * Loads the given saveobj, or the save from the given slot.
	 *
	 * @param {number|string} slot The slot ID to get the save from. 0 to 9, or 'auto'.
	 * @param {object} saveObj The save object if already possessed by the callee.
	 * @param {boolean} overrides
	 * @returns {void}
	 */
	function load(slot, saveObj, overrides) {
		const save = saveObj == null ? (slot === "auto" ? Save.autosave.get() : Save.slots.get(slot)) : saveObj;
		// the details record can be missing (storage cleared) or lack this slot's row, so default to safe empties and don't crash
		const saveDetails = JSON.parse(localStorage.getItem(KEY_DETAILS)) ?? { autosave: null, slots: [] };
		const details = slot === "auto" ? saveDetails.autosave : saveDetails.slots[slot];
		const metadata = details?.metadata ?? {};
		/* Check if metadata for save matches the save's computed md5 hash. If it matches, the ironman save was not tampered with.
			Bypass this check if on a mobile, because they are notoriously difficult to grab saves from in the event of issues. */
		if (metadata.ironman && !Browser.isMobile.any()) {
			IronMan.update(save, metadata);
			// (if ironman mode enabled) following checks md5 signature of the save to see if the variables have been modified
			if (!IronMan.compare(metadata, save)) {
				Wikifier.wikifyEval(`<<loadIronmanCheater ${slot}>>`);
				return;
			}
		}
		const loaded = slot === "auto" ? Save.autosave.load() : Save.slots.load(slot);
		// if the load failed, stop here so ironman mode doesn't delete the player's other saves for nothing
		if (!loaded) return;
		if (V.ironmanmode) {
			// (ironman) remove all saves(except auto-save) with the same saveId than loaded save
			[0, 1, 2, 3, 4, 5, 6, 7].forEach(id => {
				const saveDetail = saveDetails.slots[id];
				if (saveDetail == null) return;
				if (saveDetail.metadata.saveId === metadata.saveId) {
					Save.slots.delete(id);
					deleteSaveDetails(id);
				}
			});
		}
	}

	function save(saveSlot, confirm, saveId, saveName) {
		if (saveId == null) {
			Wikifier.wikifyEval(`<<saveConfirm ${saveSlot}>>`);
		} else if ((V.confirmSave === true && confirm !== true) || (V.saveId !== saveId && saveId != null)) {
			Wikifier.wikifyEval(`<<saveConfirm ${saveSlot}>>`);
		} else {
			if (saveSlot != null) {
				const success = Save.slots.save(saveSlot, null, {
					saveId,
					saveName,
					ironman: V.ironmanmode,
				});
				if (success) {
					const save = Save.slots.get(saveSlot);
					// Copy save metadata (it includes the jsoncompressed indicator)
					const metadata = { ...save.metadata, saveId, saveName };
					if (V.ironmanmode) {
						Object.assign(metadata, {
							ironman: V.ironmanmode,
							signature: V.ironmanmode ? IronMan.getSignature(save) : false,
							schema: IronMan.schema,
						});
					}
					setSaveDetail(saveSlot, metadata);
					delete T.currentOverlay;
					// todo: find a better solution
					closeOverlay();
					if (V.ironmanmode === true) Engine.restart();
				}
			}
		}
	}

	function deleteSave(saveSlot, confirm) {
		if (saveSlot === "all") {
			if (confirm === undefined) {
				Wikifier.wikifyEval("<<clearSaveMenu>>");
				return;
			} else if (confirm === true) {
				Save.clear();
				deleteAllSaveDetails();
			}
		} else if (saveSlot === "auto") {
			if (V.confirmDelete === true && confirm === undefined) {
				Wikifier.wikifyEval(`<<deleteConfirm ${saveSlot}>>`);
				return;
			} else {
				Save.autosave.delete();
				deleteSaveDetails("autosave");
			}
		} else {
			if (V.confirmDelete === true && confirm === undefined) {
				Wikifier.wikifyEval(`<<deleteConfirm ${saveSlot}>>`);
				return;
			} else {
				Save.slots.delete(saveSlot);
				deleteSaveDetails(saveSlot);
			}
		}
		Wikifier.wikifyEval("<<resetSaveMenu>>");
	}

	function importSave(saveFile) {
		if (!window.FileReader) return; // Browser is not compatible

		const reader = new FileReader();

		reader.onloadend = function () {
			DeserializeGame(this.result);
		};

		reader.readAsText(saveFile[0]);
	}

	function prepareSaveDetails(forceRun) {
		const saveDetails = getSaveDetails();
		if (saveDetails == null || saveDetails.id !== Story.domId || forceRun) {
			const scSaveDetails = Save.get();
			// clone so we don't fill in the shared template and leave ghost saves
			const dolSaveDetails = clone(DEFAULT_DETAILS);
			/* Search SugarCube's autosave property, if it exists, reflect this in the save details. */
			if (scSaveDetails.autosave != null) {
				dolSaveDetails.autosave = {
					title: scSaveDetails.autosave.title,
					date: scSaveDetails.autosave.date,
					metadata: scSaveDetails.autosave.metadata,
				};
				if (dolSaveDetails.autosave.metadata === undefined) {
					dolSaveDetails.autosave.metadata = { saveName: "" };
				}
				if (dolSaveDetails.autosave.metadata.saveName === undefined) {
					dolSaveDetails.autosave.metadata.saveName = "";
				}
			}
			/* Check whether SugarCube's save slots exist and populate save details with them. */
			for (let i = 0; i < scSaveDetails.slots.length; i++) {
				if (scSaveDetails.slots[i] !== null) {
					dolSaveDetails.slots[i] = {
						title: scSaveDetails.slots[i].title,
						date: scSaveDetails.slots[i].date,
						metadata: scSaveDetails.slots[i].metadata,
					};
					if (dolSaveDetails.slots[i].metadata === undefined) {
						dolSaveDetails.slots[i].metadata = { saveName: "old save", saveId: 0 };
					}
					if (dolSaveDetails.slots[i].metadata.saveName === undefined) {
						dolSaveDetails.slots[i].metadata.saveName = "old save";
					}
				} else {
					dolSaveDetails.slots[i] = null;
				}
			}

			localStorage.setItem(KEY_DETAILS, JSON.stringify(dolSaveDetails));
			return true;
		}
		return false;
	}

	function setSaveDetail(saveSlot, metadata, story) {
		const saveDetails = JSON.parse(localStorage.getItem(KEY_DETAILS));
		if (saveSlot === "autosave") {
			saveDetails.autosave = {
				id: Story.domId,
				title: Story.get(V.passage).description(),
				date: Date.now(),
				metadata,
			};
		} else {
			const slot = parseInt(saveSlot);
			saveDetails.slots[slot] = {
				id: Story.domId,
				title: Story.get(V.passage).description(),
				date: Date.now(),
				metadata,
			};
		}
		localStorage.setItem(KEY_DETAILS, JSON.stringify(saveDetails));
	}

	function getSaveDetails(saveSlot) {
		if (Object.hasOwn(localStorage, KEY_DETAILS)) {
			const saveDetails = JSON.parse(localStorage.getItem(KEY_DETAILS));
			if (typeof saveSlot === "number") {
				if (saveDetails != null) {
					return saveDetails.slots[saveSlot];
				}
			} else {
				return saveDetails;
			}
		}
		return null;
	}

	function deleteSaveDetails(saveSlot) {
		const saveDetails = JSON.parse(localStorage.getItem(KEY_DETAILS));
		if (saveSlot === "autosave") {
			saveDetails.autosave = null;
		} else {
			const slot = parseInt(saveSlot);
			saveDetails.slots[slot] = null;
		}
		localStorage.setItem(KEY_DETAILS, JSON.stringify(saveDetails));
	}

	function deleteAllSaveDetails() {
		localStorage.setItem(KEY_DETAILS, JSON.stringify(DEFAULT_DETAILS));
	}

	function returnSaveData() {
		return Save.get();
	}

	function resetSaveMenu() {
		Wikifier.wikifyEval("<<resetSaveMenu>>");
	}

	function ironmanAutoSave() {
		const saveSlot = 8;
		const success = Save.slots.save(saveSlot, null, {
			saveId: V.saveId,
			saveName: V.saveName,
			ironman: V.ironmanmode,
		});
		if (success) {
			const save = Save.slots.get(saveSlot);
			const metadata = { saveId: V.saveId, saveName: V.saveName };
			if (V.ironmanmode) {
				Object.assign(metadata, {
					ironman: V.ironmanmode,
					signature: V.ironmanmode ? IronMan.getSignature(save) : false,
					schema: IronMan.schema,
				});
			}
			setSaveDetail(saveSlot, metadata);
		}
	}

	Macro.add("incrementautosave", {
		handler() {
			if (!V.ironmanmode) V.saveDetails.auto.count++;
		},
	});

	/**
	 * Compress a game state (not delta-encoded: {title, variables, prng, pull}) using most recent dictionary.
	 * Can throw an error.
	 *
	 * @param {object} state
	 */
	function compressState(state) {
		const dictionary = COMPRESSOR_DICTIONARIES[COMPRESSOR_CURRENT_DICTIONARY_ID];
		const compressor = new JsonCompressor(dictionary);
		const zstate = compressor.compress(state);
		zstate.dictionary = COMPRESSOR_CURRENT_DICTIONARY_ID;
		zstate.title =
			"This save is compressed and is not compatible with old versions of Degrees of Lewdity. If you want to load this save in an older game build, use exporting.";
		zstate.variables = {};
		if (shouldVerifyCompression()) {
			// Sanity check
			const uzstate = decompressState(zstate);
			if (JSON.stringify(state) !== JSON.stringify(uzstate)) {
				throw new Error("Decompression check failed");
			}
		}
		return zstate;
	}

	/**
	 * Decompress the saved state using the dictionary it was compressed with.
	 * Can throw an error.
	 *
	 * @param {object} zstate
	 */
	function decompressState(zstate) {
		if (!("dictionary" in zstate)) throw new Error("Unable to load - compressed save has no dictionary");
		const dicid = zstate.dictionary;
		if (!(dicid in COMPRESSOR_DICTIONARIES))
			throw new Error(
				"Unable to decompress the save - the dictionary " +
					JSON.stringify(dicid) +
					" is unknown to this game version (trying to load newer save from older game?)"
			);
		const dictionary = COMPRESSOR_DICTIONARIES[dicid];
		const decompressor = new JsonDecompressor(dictionary);
		return decompressor.decompress(zstate);
	}
	function enableCompression() {
		V.compressSave = true;
	}
	function disableCompression() {
		V.compressSave = false;
	}
	function isCompressionEnabled() {
		// for now, save compressor and delta-encoder work against each other, leading to bigger saves when both are active
		// todo: make them friends?
		return V.compressSave && State.history.length === 1;
	}

	/**
	 * Compress a SaveObject (the one with metadata and delta-encoded history), if the compression is enabled.
	 * If compression fails, report and error and do nothing.
	 * This function returns nothing, it modifies the saveObj parameter.
	 *
	 * @param {object} saveObj
	 */
	function compressIfNeeded(saveObj) {
		if (!saveObj.metadata) saveObj.metadata = {};
		saveObj.metadata.jsoncompressed = 0;
		if (!isCompressionEnabled()) return;
		try {
			saveObj.state.history = saveObj.state.history.map(state => compressState(state));
			saveObj.metadata.jsoncompressed = 1;
		} catch (e) {
			DOL.Errors.report("Unable to compress - " + e);
			console.error(e);
			// Just return, the saveObj won't be modified
		}
	}
	function looksLikeCompressedSave(state) {
		return state.compressed === 1 && Array.isArray(state.values) && typeof state.values === "object" && typeof state.dictionary === "string";
	}
	/**
	 * Decompress a SaveObject (the one with metadata and delta-encoded history), if it is compressed.
	 *
	 * @param {object} saveObj
	 */
	function decompressIfNeeded(saveObj) {
		const isCompressed = (saveObj.metadata && saveObj.metadata.jsoncompressed === 1) || looksLikeCompressedSave(saveObj.state.history[0]);
		if (!isCompressed) return;
		let dictOverride = saveObj.state.history[0].dictionary;
		saveObj.state.history = saveObj.state.history.map(state => {
			state.dictionary = dictOverride;
			if (JsonDecompressor.isCompressed(state)) {
				// decompressing with the wrong dictionary can throw or produce nonsense, treat both as a failed attempt
				const tryDecompress = () => {
					try {
						const result = decompressState(state);
						return result.variables && result.variables.saveVersions ? result : null;
					} catch {
						return null;
					}
				};
				let decompressed = tryDecompress();
				// if that failed, the dictionary might be mislabeled, so try the others until one works
				const otherDicts = Object.keys(COMPRESSOR_DICTIONARIES).filter(d => d !== dictOverride);
				for (let k = 0; k < otherDicts.length && !decompressed; k++) {
					state.dictionary = otherDicts[k];
					decompressed = tryDecompress();
					if (decompressed) dictOverride = otherDicts[k];
				}
				if (!decompressed)
					throw new Error("Unable to decompress the save with any of the game's dictionaries (save is labeled " + JSON.stringify(dictOverride) + ")");
				return decompressed;
			} else return state;
		});
	}

	return Object.freeze({
		save,
		load,
		delete: deleteSave,
		import: importSave,
		getSaves: returnSaveData,
		resetMenu: resetSaveMenu,
		getVersion: getSaveVersion,
		loadHandler,
		enableCompression,
		disableCompression,
		isCompressionEnabled,
		compressState,
		decompressState,
		compressIfNeeded,
		decompressIfNeeded,
		SaveDetails: Object.freeze({
			prepare: prepareSaveDetails,
			set: setSaveDetail,
			get: getSaveDetails,
			delete: deleteSaveDetails,
			deleteAll: deleteAllSaveDetails,
		}),
		IronMan: Object.freeze({
			autoSave: ironmanAutoSave,
		}),
		Utils: Object.freeze({
			parseVer: parseVersion,
		}),
	});
})(Story, Save);
window.DoLSave = DoLSave;

/* Legacy references, references to the global namespace should be avoided, and thus this is considered deprecated usage. */
window.prepareSaveDetails = DoLSave.SaveDetails.prepare;
window.setSaveDetail = DoLSave.SaveDetails.set;
window.getSaveDetails = DoLSave.SaveDetails.get;
window.deleteSaveDetails = DoLSave.SaveDetails.delete;
window.deleteAllSaveDetails = DoLSave.SaveDetails.deleteAll;
window.returnSaveDetails = DoLSave.getSaves;
window.resetSaveMenu = DoLSave.resetMenu;
window.ironmanAutoSave = DoLSave.IronMan.autoSave;
window.loadSave = DoLSave.load;
window.save = DoLSave.save;
window.deleteSave = DoLSave.delete;
window.importSave = DoLSave.import;
window.SerializeGame = Save.serialize;
window.DeserializeGame = Save.deserialize;

window.getSaveData = function () {
	const compressionWasEnabled = DoLSave.isCompressionEnabled();
	DoLSave.disableCompression();
	const input = document.getElementById("saveDataInput");
	input.value = Save.serialize();
	if (compressionWasEnabled) DoLSave.enableCompression();
};

window.loadSaveData = function () {
	const input = document.getElementById("saveDataInput");
	const result = Save.deserialize(input.value);
	if (result === null) {
		input.value = "Invalid Save.";
	}
};

window.clearTextBox = function (id) {
	document.getElementById(id).value = "";
};

window.topTextArea = function (id) {
	const textArea = document.getElementById(id);
	textArea.scroll(0, 0);
};

window.bottomTextArea = function (id) {
	const textArea = document.getElementById(id);
	textArea.scroll(0, textArea.scrollHeight);
};

window.copySavedata = function (id) {
	const saveData = document.getElementById(id);
	saveData.focus();
	saveData.select();

	try {
		document.execCommand("copy");
	} catch (err) {
		const copyTextArea = document.getElementById("CopyTextArea");
		copyTextArea.value = "Copying Error";
		console.log("Unable to copy: ", err);
	}
};

window.importSettings = function (data, type) {
	let reader;
	switch (type) {
		case "text":
			V.importString = compatibilityConversion(document.getElementById("settingsDataInput")?.value);
			Wikifier.wikifyEval('<<displaySettings "importConfirmDetails">>');
			break;
		case "file":
			reader = new FileReader();
			reader.addEventListener("load", function (e) {
				// eslint-disable-next-line no-undef
				V.importString = compatibilityConversion(e.target?.result);
				Wikifier.wikifyEval('<<displaySettings "importConfirmDetails">>');
			});
			reader.readAsBinaryString(data[0]);
			break;
		case "function":
			importSettingsData(compatibilityConversion(data));
			break;
	}
};

function skinToneSettingsFromDarkChance(darkChance) {
	const dark = Math.clamp(Math.round(darkChance), 0, 100);
	if (dark <= 0) return { skinToneMin: 0, skinToneMode: 0, skinToneMax: 0 };
	if (dark >= 100) return { skinToneMin: 70, skinToneMode: 70, skinToneMax: 70 };
	return { skinToneMin: 0, skinToneMode: dark, skinToneMax: 100 };
}
window.skinToneSettingsFromDarkChance = skinToneSettingsFromDarkChance;

function compatibilityConversion(rawData) {
	let processed;

	try {
		processed = JSON.parse(rawData);
	} catch {
		return rawData;
	}
	if (!processed || typeof processed !== "object" || Array.isArray(processed)) return rawData;
	if (processed.general === undefined && processed.starting && typeof processed.starting === "object" && !Array.isArray(processed.starting))
		processed.general = {};
	if (!processed.general || typeof processed.general !== "object" || Array.isArray(processed.general)) return rawData;
	if (processed.general.settings != null && (typeof processed.general.settings !== "object" || Array.isArray(processed.general.settings))) return rawData;

	const map = {
		alluremod: { key: "allureModifier", invert: false },
		analdisable: { key: "analEnabled", invert: true },
		analdoubledisable: { key: "analDoubleEnabled", invert: true },
		analingusdisablegiving: { key: "analingusGivingEnabled", invert: true },
		analingusdisablereceiving: { key: "analingusReceivingEnabled", invert: true },
		asphyxiaLvl: { key: "asphyxiaLevel", invert: false },
		baseNpcPregnancyChance: { key: "baseNpcPregnancyChance", invert: false },
		basePlayerPregnancyChance: { key: "basePlayerPregnancyChance", invert: false },
		beastmalechance: { key: "beastMaleChance", invert: false },
		beastMaleChanceFemale: { key: "beastMaleChanceFemale", invert: false },
		beastMaleChanceMale: { key: "beastMaleChanceMale", invert: false },
		beastMaleChanceSplit: { key: "beastMaleChanceSplit", invert: false },
		beedisable: { key: "beesEnabled", invert: true },
		bestialitydisable: { key: "bestialityEnabled", invert: true },
		blackchance: { key: "darkSkinChance", invert: false },
		bodywritingLvl: { key: "bodyWritingLevel", invert: false },
		breast_mod: { key: "breastModifier", invert: false },
		breastfeedingdisable: { key: "breastFeedingEnabled", invert: true },
		cbchance: { key: "maleNPCVaginaChance", invert: false },
		cheatdisabletoggle: { key: "cheatsEnabledToggle", invert: true },
		checkstyle: { key: "skillCheckStyle", invert: false },
		clothesPrice: { key: "clothingCostModifier", invert: false },
		clothesPriceLewd: { key: "lewdClothingCostModifier", invert: false },
		clothesPriceSchool: { key: "schoolClothingCostModifier", invert: false },
		clothesPriceUnderwear: { key: "underwearCostModifier", invert: false },
		condomChance: { key: "condomChance", invert: false },
		condomLvl: { key: "condomLevel", invert: false },
		condomUseChanceCon: { key: "condomUseChanceConsensual", invert: false },
		condomUseChanceRape: { key: "condomUseChanceRape", invert: false },
		cycledisable: { key: "fertilityCycleEnabled", invert: true },
		dgchance: { key: "femaleNPCPenisChance", invert: false },
		facesitdisable: { key: "facesitEnabled", invert: true },
		footdisable: { key: "footFetishEnabled", invert: true },
		forcedcrossdressingdisable: { key: "forcedCrossdressingEnabled", invert: true },
		furniturePriceFactor: { key: "furnitureCostModifier", invert: false },
		horsedisable: { key: "horsesEnabled", invert: true },
		humanPregnancyMonths: { key: "humanPregnancyMonths", invert: false },
		hypnosisdisable: { key: "hypnosisEnabled", invert: true },
		incompletePregnancyDisable: { key: "incompletePregnancyEnabled", invert: true },
		lurkerdisable: { key: "lurkersEnabled", invert: true },
		malechance: { key: "maleChance", invert: false },
		maleChanceFemale: { key: "maleChanceFemale", invert: false },
		maleChanceMale: { key: "maleChanceMale", invert: false },
		maleChanceSplit: { key: "maleChanceSplit", invert: false },
		malevictimchance: { key: "maleVictimChance", invert: false },
		monsterchance: { key: "monsterChance", invert: false },
		monsterhallucinations: { key: "monsterHallucinationsOnly", invert: false },
		multipleWardrobes: { key: "multipleWardrobes", invert: false },
		npcPregnancyDisable: { key: "npcPregnancyEnabled", invert: true },
		npcVirginityChance: { key: "npcVirginChanceStudent", invert: false },
		npcVirginityChanceAdult: { key: "npcVirginChanceAdult", invert: false },
		NudeGenderDC: { key: "nudeGenderPerception", invert: false },
		parasitedisable: { key: "parasitesEnabled", invert: true },
		parasitepregdisable: { key: "parasitePregnancyEnabled", invert: true },
		pbdisable: { key: "pubicHairEnabled", invert: true },
		penis_mod: { key: "penisModifier", invert: false },
		plantdisable: { key: "plantsEnabled", invert: true },
		playerPregnancyBeastDisable: { key: "playerPregnancyBeastEnabled", invert: true },
		playerPregnancyEggLayingDisable: { key: "playerPregnancyEggLayingEnabled", invert: true },
		playerPregnancyHumanDisable: { key: "playerPregnancyHumanEnabled", invert: true },
		pregnancyspeechdisable: { key: "pregnancySpeechEnabled", invert: true },
		pregnancytype: { key: "pregnancyType", invert: false },
		rentmod: { key: "rentCostModifier", invert: false },
		ruinedorgasmdisable: { key: "ruinedOrgasmEnabled", invert: true },
		slimedisable: { key: "slimesEnabled", invert: true },
		slugdisable: { key: "slugsEnabled", invert: true },
		spiderdisable: { key: "spidersEnabled", invert: true },
		statdisable: { key: "blindStatsEnabled", invert: false },
		straponchance: { key: "straponChance", invert: false },
		swarmdisable: { key: "swarmsEnabled", invert: true },
		tending_yield_factor: { key: "tendingYieldModifier", invert: false },
		tentacledisable: { key: "tentaclesEnabled", invert: true },
		toydildodisable: { key: "toyDildoEnabled", invert: true },
		toymultiplepenetration: { key: "toyMultiplePenetrationEnabled", invert: true },
		toywhipdisable: { key: "toyWhipEnabled", invert: true },
		transformdisable: { key: "transformAnimalEnabled", invert: true },
		transformdisabledivine: { key: "transformDivineEnabled", invert: true },
		vaginaldoubledisable: { key: "vaginalDoubleEnabled", invert: true },
		voredisable: { key: "voreEnabled", invert: true },
		waspdisable: { key: "waspsEnabled", invert: true },
		watersportsdisable: { key: "watersportsEnabled", invert: true },
		wolfPregnancyWeeks: { key: "wolfPregnancyWeeks", invert: false },
	};

	processed.general.settings ??= {};

	for (const legacyKey in map) {
		if (!(legacyKey in processed.general)) continue;
		const { key, invert } = map[legacyKey];
		const legacyValue = processed.general[legacyKey];

		if (typeof legacyValue === "boolean" && invert) {
			processed.general.settings[key] ??= !legacyValue;
		} else {
			processed.general.settings[key] ??= legacyValue;
		}
		delete processed.general[legacyKey];
	}

	if (!processed.pregnancyChancePercent && !processed.general.settings.beastSettings && processed.general.settings.skinToneMin === undefined) {
		const settings = processed.general.settings;
		if (settings.basePlayerPregnancyChance !== undefined) {
			settings.basePlayerPregnancyChance = legacyPregnancyChanceToPercent(settings.basePlayerPregnancyChance, 100);
		}
		if (settings.baseNpcPregnancyChance !== undefined) {
			settings.baseNpcPregnancyChance = legacyPregnancyChanceToPercent(settings.baseNpcPregnancyChance, 20);
		}
	}

	// A settings file exported before NNPC and generic pregnancy became separate toggles carries only
	// the one flag. It governed both kinds of NPC, so both inherit it.
	const incoming = processed.general.settings;
	if (incoming.darkSkinChance !== undefined && incoming.skinToneMin === undefined) {
		Object.assign(incoming, skinToneSettingsFromDarkChance(incoming.darkSkinChance));
	}
	const legacyBeastKeys = {
		beastMaleChance: "maleChance",
		beastMaleChanceMale: "maleChanceMale",
		beastMaleChanceFemale: "maleChanceFemale",
		beastMaleChanceSplit: "maleChanceSplit",
		monsterChance: "monsterChance",
		monsterHallucinationsOnly: "hallucinationsOnly",
	};
	if (Object.keys(legacyBeastKeys).some(key => incoming[key] !== undefined) || incoming.bestialityEnabled !== undefined) {
		incoming.beastSettings ??= {};
		processed.general.genericBeastSettings ??= {};
		for (const type of C.beastSettingTypes) {
			incoming.beastSettings[type] ??= {};
			for (const [oldKey, key] of Object.entries(legacyBeastKeys)) {
				if (incoming[oldKey] !== undefined) incoming.beastSettings[type][key] ??= incoming[oldKey];
			}
			if (incoming.bestialityEnabled !== undefined)
				incoming.beastSettings[type].bestiality ??= incoming.bestialityEnabled
					? "on"
					: (incoming.monsterChance ?? V.genericBeastSettings.monsterChance) > 0
					? "monsterOnly"
					: "off";
		}
		for (const oldKey of Object.keys(legacyBeastKeys)) {
			if (incoming[oldKey] !== undefined) processed.general.genericBeastSettings[oldKey] ??= incoming[oldKey];
		}
		if (incoming.bestialityEnabled !== undefined)
			processed.general.genericBeastSettings.bestiality ??= incoming.bestialityEnabled
				? "on"
				: (incoming.monsterChance ?? V.genericBeastSettings.monsterChance) > 0
				? "monsterOnly"
				: "off";
	}
	for (const beast of C.namedBeasts) {
		const old = processed.general[beast + "monster"];
		if (old === undefined) continue;
		incoming.namedBeasts ??= {};
		incoming.namedBeasts[beast] ??= {
			monsterChance: old === 2 ? 100 : old === 0 ? 0 : incoming.monsterChance ?? V.genericBeastSettings.monsterChance,
			hallucinationsOnly: old === 2 ? false : incoming.monsterHallucinationsOnly ?? V.genericBeastSettings.monsterHallucinationsOnly,
		};
	}
	if (incoming.npcPregnancyEnabled !== undefined && incoming.nnpcPregnancyEnabled === undefined) {
		incoming.nnpcPregnancyEnabled = incoming.npcPregnancyEnabled;
	}

	// A settings file exported before ear slimes became their own toggle carries only the slime flag.
	// It governed both kinds of slime, so ear slimes inherit it.
	if (incoming.slimesEnabled !== undefined && incoming.earSlimesEnabled === undefined) {
		incoming.earSlimesEnabled = incoming.slimesEnabled;
	}
	const player = processed.starting?.player;
	if (player && typeof player === "object") {
		player.skin ??= {};
		if (player.skinColour !== undefined) player.skin.color ??= player.skinColour;
		if (player.faceFreckles !== undefined) player.skin.faceFreckles ??= player.faceFreckles;
		if (player.freckles !== undefined) player.skin.faceFreckles ??= player.freckles;
		if (player.bodyFreckles !== undefined) player.skin.bodyFreckles ??= player.bodyFreckles;
	}
	if (processed.npc && typeof processed.npc === "object") {
		for (const npc of Object.values(processed.npc)) {
			if (!npc || typeof npc !== "object") continue;
			if (npc.skincolour === "white") npc.skincolour = 0;
			else if (npc.skincolour === "black") npc.skincolour = 70;
			else if (npc.skincolour === "ghost") {
				npc.skincolour = 0;
				npc.skinType = "ghost";
			}
		}
	}

	return JSON.stringify(processed);
}

/**
 * Using the incoming configuration object, replace all active variables (V | $ | State.variables)
 *
 * @param {string} data
 */
function importSettingsData(data) {
	if (data == null) {
		return;
	}
	let overrides;
	// console.log("json",JSON.parse(result));
	if (V.importString) {
		overrides = JSON.parse(V.importString);
		delete V.importString;
	} else {
		overrides = JSON.parse(data);
	}
	if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return;
	if (V.passage === "Start" && overrides.starting != null) {
		overrides.starting = settingsConvert(false, "starting", overrides.starting);
	}
	if (overrides.general != null) {
		overrides.general = settingsConvert(false, "general", overrides.general);
	}

	if (V.passage === "Start" && overrides.starting != null) {
		const startingConfig = settingsObjects("starting");
		if (validateValue(startingConfig.facestyle, overrides.starting.facestyle)) {
			V.facestyle = overrides.starting.facestyle;
			startingConfig.facevariant = settingsObjects("starting").facevariant;
		}
		importSettingsWalk(startingConfig, overrides.starting, V);
	}

	if (overrides.general != null) {
		// correct swapped min/max values
		if (overrides.general.breastsizemin > overrides.general.breastsizemax) {
			const temp = overrides.general.breastsizemin;
			overrides.general.breastsizemin = overrides.general.breastsizemax;
			overrides.general.breastsizemax = temp;
		}
		if (overrides.general.penissizemin > overrides.general.penissizemax) {
			const temp = overrides.general.penissizemin;
			overrides.general.penissizemin = overrides.general.penissizemax;
			overrides.general.penissizemax = temp;
		}
		if (overrides.general.bottomsizemin > overrides.general.bottomsizemax) {
			const temp = overrides.general.bottomsizemin;
			overrides.general.bottomsizemin = overrides.general.bottomsizemax;
			overrides.general.bottomsizemax = temp;
		}
		const generalConfig = settingsObjects("general");
		importSettingsWalk(generalConfig, overrides.general, V);
		if (validateValue(generalConfig.options.theme, overrides.general.options?.theme)) {
			Theme.setPreference(overrides.general.options.theme);
		}
	}

	if (overrides.npc != null) {
		if ((setup.modLIRegistry || []).some(name => V.modLIUnlocks?.[name] && overrides.npc[name] && !V.NPCNameList.includes(name))) {
			Wikifier.wikifyEval("<<modLI-init>>");
		}
		const listObject = settingsObjects("npc");
		// eslint-disable-next-line no-var
		const listKey = Object.keys(listObject);
		// eslint-disable-next-line no-var
		for (let i = 0; i < V.NPCNameList.length; i++) {
			if (overrides.npc[V.NPCNameList[i]] != null) {
				const previousGender = V.NPCName[i].gender;
				const carriedGender = getActivePregnancies(V.NPCName[i].nam).length ? V.NPCName[i].gender : undefined;
				// eslint-disable-next-line no-var
				for (let j = 0; j < listKey.length; j++) {
					// Overwrite to allow for "none" default value in the start passage to allow for rng to decide
					if (V.passage === "Start" && ["pronoun", "gender", "skincolour"].includes(listKey[j]) && overrides.npc[V.NPCNameList[i]][listKey[j]] === "none") {
						V.NPCName[i][listKey[j]] = overrides.npc[V.NPCNameList[i]][listKey[j]];
					} else if (validateValue(listObject[listKey[j]], overrides.npc[V.NPCNameList[i]][listKey[j]])) {
						V.NPCName[i][listKey[j]] = overrides.npc[V.NPCNameList[i]][listKey[j]];
					}
				}
				if (carriedGender !== undefined) V.NPCName[i].gender = carriedGender;
				if (carriedGender === undefined && previousGender !== V.NPCName[i].gender && ["m", "f"].includes(V.NPCName[i].gender)) {
					const present = V.NPCName[i].type === "human" ? "clothed" : 0;
					V.NPCName[i].penis = V.NPCName[i].gender === "m" ? present : "none";
					V.NPCName[i].vagina = V.NPCName[i].gender === "f" ? present : "none";
				}
			}
		}
	}

	/* Imported talents are the player's picks now, so the snapshot taken before Insanity forced them all on is out of date. */
	if (overrides.general?.AMCTraits != null) delete V.AMCTraitsPreInsanity;

	/* Reject / Accepted / Preferred are imported as independent flags, so an import or a Random start can leave contradictions behind. */
	if (typeof window.identityNormalisePresentation === "function") window.identityNormalisePresentation();
}
window.importSettingsData = importSettingsData;

/**
 * @param {object} configuration
 * @param {object} value
 * @returns {boolean}
 */
function validateValue(configuration, value) {
	if (value == null) return false;
	// console.log("validateValue", keys, value);
	const keyArray = Object.keys(configuration);
	let valid = false;
	if (keyArray.length === 0) {
		valid = true;
	}
	if (keyArray.includes("min")) {
		if (typeof value === "number" && Number.isFinite(value) && configuration.min <= value && configuration.max >= value) {
			valid = true;
		}
	}
	if (keyArray.includes("decimals") && value != null) {
		/* A setting holding the wrong type is invalid, not a crash: throwing here aborted the entire export. */
		// eslint-disable-next-line eqeqeq
		if (typeof value !== "number" || value.toFixed(configuration.decimals) != value) {
			valid = false;
		}
	}
	if (keyArray.includes("bool")) {
		if (value === true || value === false) {
			valid = true;
		}
	}
	if (keyArray.includes("boolLetter")) {
		if (value === "t" || value === "f") {
			valid = true;
		}
	}
	if (keyArray.includes("strings") && value != null) {
		if (configuration.strings.includes(value)) {
			valid = true;
		}
	}
	if (keyArray.includes("number")) {
		if (typeof value === "number" && Number.isFinite(value)) {
			valid = true;
		}
	}
	return valid;
}
window.validateValue = validateValue;

/**
 * A config node is a "leaf" (a single setting descriptor) when it declares a value type.
 * Otherwise it is a container whose children are traversed recursively.
 *
 * @param {object} config
 * @returns {boolean}
 */
function isSettingLeaf(config) {
	if (config == null || typeof config !== "object") {
		return false;
	}
	return ["min", "max", "bool", "boolLetter", "strings", "number"].some(key => key in config);
}
window.isSettingLeaf = isSettingLeaf;

/**
 * Recursively copy valid setting values from a live variable tree into an export object,
 * driven by the settings schema so only known keys (never runtime state) are written.
 *
 * @param {object} config schema node
 * @param {object} source live variable node (usually V or a sub-object)
 * @param {object} output destination node
 */
function exportSettingsWalk(config, source, output) {
	if (config == null || source == null || typeof source !== "object") {
		return;
	}
	for (const key of Object.keys(config)) {
		const cfg = config[key];
		if (cfg == null) continue;
		if (isSettingLeaf(cfg)) {
			const value = source[key] ?? cfg.default;
			if (value != null && validateValue(cfg, value)) {
				output[key] = value;
			}
		} else if (source[key] != null && typeof source[key] === "object") {
			const sub = {};
			exportSettingsWalk(cfg, source[key], sub);
			if (Object.keys(sub).length > 0) {
				output[key] = sub;
			}
		}
	}
}
window.exportSettingsWalk = exportSettingsWalk;

/**
 * Recursively write valid setting values from an imported object into the live variable tree,
 * driven by the settings schema.
 *
 * @param {object} config schema node
 * @param {object} override imported node
 * @param {object} target live variable node (usually V or a sub-object)
 */
function importSettingsWalk(config, override, target) {
	if (config == null || override == null || target == null || typeof override !== "object" || typeof target !== "object") {
		return;
	}
	for (const key of Object.keys(config)) {
		const cfg = config[key];
		if (cfg == null) continue;
		if (isSettingLeaf(cfg)) {
			if (override[key] != null && validateValue(cfg, override[key])) {
				target[key] = override[key];
			}
		} else if (override[key] != null && typeof override[key] === "object") {
			target[key] ??= {};
			if (typeof target[key] === "object") importSettingsWalk(cfg, override[key], target[key]);
		}
	}
}
window.importSettingsWalk = importSettingsWalk;

/**
 * Flatten every schema leaf present in an imported data node into a display list,
 * used by the import-confirmation UI for settings groups that are nested.
 *
 * @param {object} config schema node
 * @param {object} data imported node
 * @param {Array<{name: string, value: any, valid: boolean}>} out
 * @returns {Array<{name: string, value: any, valid: boolean}>}
 */
function settingsPreviewLeaves(config, data, out) {
	out = out || [];
	if (config == null || data == null || typeof data !== "object") {
		return out;
	}
	for (const key of Object.keys(config)) {
		const cfg = config[key];
		if (cfg == null) continue;
		if (isSettingLeaf(cfg)) {
			if (data[key] !== undefined) {
				out.push({ name: cfg.displayName || key, value: data[key], valid: validateValue(cfg, data[key]) });
			}
		} else if (data[key] != null && typeof data[key] === "object") {
			settingsPreviewLeaves(cfg, data[key], out);
		}
	}
	return out;
}
window.settingsPreviewLeaves = settingsPreviewLeaves;

function exportSettings(data, type) {
	const output = {
		general: {},
		npc: {},
	};
	output.starting = {};
	exportSettingsWalk(settingsObjects("starting"), V, output.starting);

	exportSettingsWalk(settingsObjects("general"), V, output.general);
	output.general.options.theme = Theme.getPreference();
	output.general.modLIUnlocks = Object.fromEntries((setup.modLIRegistry || []).map(name => [name, !!V.modLIUnlocks?.[name]]));

	const listObject = settingsObjects("npc");
	const listKey = Object.keys(listObject);
	for (let i = 0; i < V.NPCNameList.length; i++) {
		// The Silver Stranger (Luchifen) is a hidden mystery NPC; never expose their name in exported settings.
		if (V.NPCNameList[i] === "Luchifen") continue;
		output.npc[V.NPCNameList[i]] = {};
		for (let j = 0; j < listKey.length; j++) {
			// Overwrite to allow for "none" default value in the start passage to allow for rng to decide
			if (V.passage === "Start" && ["pronoun", "gender", "skincolour"].includes(listKey[j]) && V.NPCName[i][listKey[j]] === "none") {
				output.npc[V.NPCNameList[i]][listKey[j]] = V.NPCName[i][listKey[j]];
			} else if (validateValue(listObject[listKey[j]], V.NPCName[i][listKey[j]])) {
				output.npc[V.NPCNameList[i]][listKey[j]] = V.NPCName[i][listKey[j]];
			}
		}
	}

	output.starting = settingsConvert(true, "starting", output.starting);
	output.general = settingsConvert(true, "general", output.general);
	output.pregnancyChancePercent = true;

	// console.log(S);
	const result = JSON.stringify(output);
	if (type === "text") {
		const textArea = document.getElementById("settingsDataInput");
		textArea.value = result;
	} else if (type === "file") {
		const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
		saveAs(blob, "DolSettingsExport.txt");
	}
}
window.exportSettings = exportSettings;

/**
 * The demeanours the character creation and mirror menus offer for the current face style, as a { "Display name": value } map.
 * Reading them from setup keeps randomisation in step with whatever face styles and modded demeanours are installed.
 *
 * @returns {object}
 */
function faceVariantsForStyle() {
	const options = setup.faceVariantOptions ?? {};
	const style = options[V.facestyle] ? V.facestyle : "default";
	const variants = options[style];
	if (Array.isArray(variants)) return Object.fromEntries(variants.map(v => [v.toUpperFirst(), v]));
	return variants ?? { Gentle: "default" };
}

/**
 * Empty "Modded" demeanour slots are offered so art packs can fill them, but rolling one at random would leave the face blank.
 *
 * @param {string} variant
 * @returns {boolean}
 */
function faceVariantHasArt(variant) {
	const slot = /^modded(\d+)$/.exec(variant);
	return !slot || Number(slot[1]) <= (setup.moddedFaceVariantsWithArt ?? 0);
}

function settingsObjects(type) {
	let result;
	/* boolLetter type also requires the bool type aswell */
	switch (type) {
		case "starting":
			result = {
				facestyle: { strings: Object.values(setup.faceStyleOptions), displayName: "Face style:" },
				beauty: { min: 0, max: 10000, decimals: 0, displayName: "Beauty:" },
				bodysize: {
					min: -1,
					max: 4,
					decimals: 1,
					randomNumbers: [-1, 0, 1, 2, 2.5, 3, 4],
					displayName: "Body size:",
					textMap: { "-1": "Miniature", 0: "Tiny", 1: "Small", 2: "Normal", 2.5: "Tall", 3: "Large", 4: "Giant" },
					randomize: "characterAppearance",
				},
				facevariant: {
					strings: Object.values(faceVariantsForStyle()),
					randomStrings: Object.values(faceVariantsForStyle()).filter(faceVariantHasArt),
					displayName: "Demeanour:",
					textMap: Object.fromEntries(Object.entries(faceVariantsForStyle()).map(([name, value]) => [value, name])),
					randomize: "characterAppearance",
				},
				breastsensitivity: {
					min: 1,
					max: 4,
					displayName: "Breast sensitivity:",
					decimals: 0,
					textMap: { 1: "Normal", 2: "Sensitive", 3: "Very Sensitive", 4: "Hyper Sensitive" },
					randomize: "characterTrait",
				},
				genitalsensitivity: {
					min: 1,
					max: 4,
					displayName: "Genital sensitivity:",
					decimals: 0,
					textMap: { 1: "Normal", 2: "Sensitive", 3: "Very Sensitive", 4: "Hyper Sensitive" },
					randomize: "characterTrait",
				},
				mouthsensitivity: {
					min: 1,
					max: 4,
					decimals: 0,
					displayName: "Mouth sensitivity:",
					textMap: { 1: "Normal", 2: "Sensitive", 3: "Very Sensitive", 4: "Hyper Sensitive" },
					randomize: "characterTrait",
				},
				bottomsensitivity: {
					min: 1,
					max: 4,
					decimals: 0,
					displayName: "Bottom sensitivity:",
					textMap: { 1: "Normal", 2: "Sensitive", 3: "Very Sensitive", 4: "Hyper Sensitive" },
					randomize: "characterTrait",
				},
				drunkSensitivity: {
					min: 0.5,
					max: 1.5,
					decimals: 1,
					displayName: "Alcohol tolerance:",
					textMap: { 0.5: "Heavyweight", 1: "Normal", 1.5: "Lightweight" },
					randomize: "characterTrait",
				},
				eyeselect: {
					strings: [
						"purple",
						"dark blue",
						"light blue",
						"amber",
						"hazel",
						"brown",
						"green",
						"light green",
						"lime green",
						"red",
						"pink",
						"black",
						"grey",
						"light grey",
						"random",
					],
					randomize: "characterAppearance",
					displayName: "Eye colour:",
				},
				hairselect: {
					strings: setup.colours.hair.filter(c => c.natural || c.dye).map(c => c.variable),
					displayName: "Hair colour:",
					randomize: "characterAppearance",
				},
				hairlength: {
					min: 0,
					max: 900,
					decimals: 0,
					randomNumbers: [0, 200, 400, 600, 700, 900],
					displayName: "Hair length:",
					randomize: "characterAppearance",
				},
				awareselect: {
					strings: ["innocent", "knowledgeable"],
					displayName: "Awareness:",
					randomize: "characterTrait",
				},
				background: {
					nerd: { bool: true, displayName: "Nerd background:" },
					athlete: { bool: true, displayName: "Athlete background:" },
					delinquent: { bool: true, displayName: "Delinquent background:" },
					promiscuous: { bool: true, displayName: "Promiscuous background:" },
					exhibitionist: { bool: true, displayName: "Exhibitionist background:" },
					deviant: { bool: true, displayName: "Deviant background:" },
					crossdresser: { bool: true, displayName: "Crossdresser background:" },
					genderAnxious: { bool: true, displayName: "Gender-Anxious background:" },
					transgender: { bool: true, displayName: "Transgender background:" },
					lustful: { bool: true, displayName: "Lustful background:" },
					plantlover: { bool: true, displayName: "Dendrophile background:" },
					insanity: { bool: true, displayName: "Insanity background:" },
					autism: { bool: true, displayName: "Autism Spectrum trait:" },
					detached: { bool: true, displayName: "Detached background:" },
				},
				startingseason: {
					strings: ["spring", "summer", "autumn", "winter", "random"],
					displayName: "Starting season:",
				},
				gamemode: { strings: ["normal", "soft", "hard"], displayName: "Game difficulty:" },
				ironmanmode: { bool: false, displayName: "Ironman mode:" },
				player: {
					gender: {
						strings: ["m", "f"],
						displayName: "Gender:",
						textMap: { m: "Male", f: "Female" },
						randomize: "characterAppearance",
					},
					sex: {
						strings: ["m", "f"],
						displayName: "Genitals:",
						textMap: { m: "Penis", f: "Vagina" },
						randomize: "characterAppearance",
					},
					gender_body: {
						strings: ["m", "f", "a"],
						displayName: "Body type:",
						textMap: { m: "Masculine", f: "Feminine", a: "Androgynous" },
					},
					bodyshape: {
						strings: ["classic", "slender", "andro", "curvy", "soft"],
						textMap: { classic: "Classic", slender: "Slender", andro: "Androgynous", curvy: "Curvy", soft: "Soft" },
						displayName: "Body shape:",
						randomize: "characterAppearance",
					},
					skin: {
						color: {
							strings: [
								"light",
								"medium",
								"dark",
								"gyaru",
								"rlight",
								"rmedium",
								"rdark",
								"rgyaru",
								"ylight",
								"ymedium",
								"ydark",
								"ygyaru",
								"glight",
								"gmedium",
								"gdark",
								"ggyaru",
								"blight",
								"bmedium",
								"bdark",
								"bgyaru",
							],
							randomize: "characterAppearance",
							displayName: "Natural Skintone:",
						},
					},
					ballsExist: { bool: true, displayName: "Balls:", textMap: { true: "Existent", false: "Nonexistent" } },
					freckles: {
						bool: true,
						displayName: "Freckles:",
						textMap: { true: "Existent", false: "Nonexistent" },
						strings: ["random"],
						randomize: "characterAppearance",
					},
					breastsize: {
						min: 0,
						max: 12,
						decimals: 0,
						displayName: "Breast size:",
						textMap: {
							0: "Flat",
							1: "Budding",
							2: "Tiny",
							3: "Small",
							4: "Pert",
							5: "Modest",
							6: "Full",
							7: "Large",
							8: "Ample",
							9: "Massive",
							10: "Huge",
							11: "Gigantic",
							12: "Enormous",
						},
						randomize: "characterAppearance",
					},
					penissize: {
						min: 0,
						max: 6,
						decimals: 0,
						displayName: "Penis size:",
						textMap: { 0: "Micro", 1: "Mini", 2: "Tiny", 3: "Small", 4: "Normal", 5: "Large", 6: "Enormous" },
						randomize: "characterAppearance",
					},
					bottomsize: {
						min: 0,
						max: 8,
						decimals: 0,
						displayName: "Bottom size:",
						textMap: {
							0: "Slender",
							1: "Slim",
							2: "Modest",
							3: "Cushioned",
							4: "Soft",
							5: "Round",
							6: "Plump",
							7: "Large",
							8: "Huge",
						},
						randomize: "characterAppearance",
					},
				},
			};
			break;
		case "general":
			result = {
				modLIUnlocks: Object.fromEntries((setup.modLIRegistry || []).map(name => [name, { bool: true, displayName: `${name} enabled:` }])),
				enemystatstyle: { strings: ["full", "default"], randomize: "gameplay", displayName: "Enemy stat display:" },
				postCombatStats: { min: 0, max: 1, decimals: 0, displayName: "Post-encounter summary:" },
				ModExclusiveLIEnabled: { min: 0, max: 1, decimals: 0, displayName: "Mod-exclusive love interests:" },
				disableAutoSelect: { bool: true, displayName: "Disable settings text auto-select:" },
				realisticTransparency: { min: 0, max: 1, decimals: 0, displayName: "Realistic Clothing Transparency:" },
				preyTrait: { min: 0, max: 1, decimals: 0, displayName: "Prey Clothing Trait:" },
				silkyTrait: { min: 0, max: 1, decimals: 0, displayName: "Silky Clothing Trait:" },
				wardrobeMult: { min: 1, max: 20, decimals: 0, displayName: "Wardrobe Capacity Multiplier:" },
				bicycle: {
					persistentLocation: { bool: true, displayName: "Persistent Bike Location:" },
					theftEnabled: { bool: true, displayName: "Bike Security:" },
				},
				depositMax: { min: 0, max: 12, decimals: 0, displayName: "Deposit Max Weeks:" },
				depositWithdrawalFee: { min: 0, max: 100, decimals: 0, displayName: "Deposit Withdrawal Fee (%):" },
				parasiteCapMult: { min: 1, max: 10, decimals: 0, displayName: "Parasite Tank/Barn Capacity Multiplier:" },
				tirednessMaxScalingToggle: { min: 0, max: 1, decimals: 0, displayName: "Tiredness Max Scaling:" },
				stressMaxScalingToggle: { min: 0, max: 1, decimals: 0, displayName: "Stress Max Scaling:" },
				athleticsFitnessToggle: { min: 0, max: 1, decimals: 0, displayName: "Athletics Fitness:" },
				fatigueSkillPenaltyToggle: { min: 0, max: 1, decimals: 0, displayName: "Fatigue Skill Penalty:" },
				fatigueSkillPenaltyMax: { min: 0, max: 100, decimals: 0, displayName: "Fatigue Skill Penalty Max (%):" },
				mathsTraitBuffs: {
					antiques: { min: 0, max: 1, decimals: 0, displayName: "Antique Price Buff:" },
					stolen: { min: 0, max: 1, decimals: 0, displayName: "Stolen Goods Price Buff:" },
					market: { min: 0, max: 1, decimals: 0, displayName: "Market Stall Price Buff:" },
					aphrodisiacPhials: { min: 0, max: 1, decimals: 0, displayName: "Aphrodisiac Phial Price Buff:" },
				},
				historyTraitBuffs: {
					improvedChances: { min: 0, max: 1, decimals: 0, displayName: "Antique Chance Buff:" },
				},
				DoLPTFBuffs: { min: 0, max: 1, decimals: 0, displayName: "Animal TF Buffs and Nerfs:" },
				DoLPTFTempTolerance: { min: 0, max: 1, decimals: 0, displayName: "Animal TF Temperature Tolerance:" },
				substanceRebalance: { min: 0, max: 1, decimals: 0, displayName: "Vanilla Substance Rebalance:" },
				dancingRebalance: { min: 0, max: 1, decimals: 0, displayName: "Dancing Rebalance:" },
				danceSkillDecay: { min: 0, max: 1, decimals: 0, displayName: "Dancing skill maintenance:" },
				foodSpoilage: { min: 0, max: 1, decimals: 0, displayName: "Food Spoilage:" },
				produce_yield_factor: { min: 10, max: 200, decimals: 0, displayName: "Produce Yield:" },
				combatStressGain: { min: 25, max: 150, decimals: 0, displayName: "Combat Stress Gain:" },
				easyHousekeeping: { min: 0, max: 1, decimals: 0, displayName: "Easy Housekeeping:" },
				statGainMult: { min: 10, max: 1000, decimals: 0, displayName: "Stat Gain Multiplier:" },
				stressBeauty: { min: 0, max: 1, decimals: 0, displayName: "Low Stress Beauty Gain:" },
				beautyMult: { min: 1, max: 10, decimals: 0, displayName: "Daily Beauty Gain:" },
				NNPCMultiOrgasmToggle: { min: 0, max: 1, decimals: 0, displayName: "NNPC multi-orgasm:" },
				nnpcHealthMult: { min: 1, max: 1000000, decimals: 0, displayName: "Named NPC Health Max Multiplier (%):" },
				nnpcArousalMult: { min: 1, max: 1000000, decimals: 0, displayName: "Named NPC Arousal Max Multiplier (%):" },
				npcHealthMult: { min: 1, max: 1000000, decimals: 0, displayName: "NPC Health Max Multiplier (%):" },
				npcArousalMult: { min: 1, max: 1000000, decimals: 0, displayName: "NPC Arousal Max Multiplier (%):" },
				npcStealMoneyToggle: { min: 0, max: 1, decimals: 0, displayName: "NPCs stealing your money:" },
				npcStealMoneyRandomToggle: { min: 0, max: 1, decimals: 0, displayName: "NPC Randomized Stolen Money Percentage:" },
				npcStealMoneyPercentage: { min: 1, max: 100, decimals: 0, displayName: "NPC Stolen Money Percentage (%):" },
				npcStealMoneyMin: { min: 1, max: 100, decimals: 0, displayName: "Minimum cash stolen (%):" },
				npcStealMoneyMax: { min: 1, max: 100, decimals: 0, displayName: "Maximum cash stolen (%):" },
				npcStealCardChance: { min: 0, max: 100, decimals: 0, displayName: "Bank card theft chance (%):" },
				npcStealCardWeeklyLimit: { min: 0, max: 1000, decimals: 0, displayName: "Stolen card weekly limit (pounds):" },
				npcDescGenType: { strings: ["vanilla", "randomized"], displayName: "NPC Description Generation:" },
				npcDescDemonDisable: { min: 0, max: 1, decimals: 0, displayName: "Disable Demon descriptions:" },
				npcBreastGenType: { strings: ["vanilla", "randomized"], displayName: "NPC Breast Generation:" },
				npcPenisGenType: { strings: ["vanilla", "randomized"], displayName: "NPC Penis Generation:" },
				beastMultiOrgasmToggle: { min: 0, max: 1, decimals: 0, displayName: "Beast Multi-Orgasm:" },
				beastGroupFight: { min: 0, max: 1, decimals: 0, displayName: "Beast Gangbangs:" },
				beastHealthMult: { min: 1, max: 1000000, decimals: 0, displayName: "Beast Health Max Multiplier (%):" },
				beastArousalMult: { min: 1, max: 1000000, decimals: 0, displayName: "Beast Arousal Max Multiplier (%):" },
				tentacleHealthMult: { min: 1, max: 1000000, decimals: 0, displayName: "Tentacle Health Max Multiplier (%):" },
				struggleHealthMult: { min: 1, max: 1000000, decimals: 0, displayName: "Struggle Health Max Multiplier (%):" },
				combatExtended: {
					standingFights: { min: 0, max: 1, decimals: 0, displayName: "Standing Fights:" },
					standingFightsType: { strings: ["normal", "hostile"], displayName: "Standing Fight Type:" },
					reverseRape: { min: 0, max: 1, decimals: 0, displayName: "Reverse Rape:" },
					passiveDodging: { min: 0, max: 1, decimals: 0, displayName: "Passive Dodging:" },
					activeDodging: { min: 0, max: 1, decimals: 0, displayName: "Active Dodging:" },
					uncappedDodgeChance: { min: 0, max: 1, decimals: 0, displayName: "Uncapped Dodge Chance:" },
					dodgeChanceCap: { min: 0, max: 100, decimals: 0, displayName: "Dodge Chance Cap:" },
					enemyDamageMult: { min: 25, max: 300, decimals: 0, displayName: "Enemy Damage Multiplier (%):", randomize: "encounter" },
					blocking: { min: 0, max: 1, decimals: 0, displayName: "Blocking:" },
					countering: { min: 0, max: 1, decimals: 0, displayName: "Countering:" },
					feinting: { min: 0, max: 1, decimals: 0, displayName: "Feinting:" },
					hookpunching: { min: 0, max: 1, decimals: 0, displayName: "Hook Punching:" },
					brawlingToggle: { min: 0, max: 1, decimals: 0, displayName: "Brawling:" },
					footworkToggle: { min: 0, max: 1, decimals: 0, displayName: "Footwork:" },
					strikingToggle: { min: 0, max: 1, decimals: 0, displayName: "Striking:" },
					kickingToggle: { min: 0, max: 1, decimals: 0, displayName: "Kicking:" },
					enemyPassiveDodging: { min: 0, max: 1, decimals: 0, displayName: "Enemy Passive Dodging:" },
					enemyActiveDodging: { min: 0, max: 1, decimals: 0, displayName: "Enemy Active Dodging:" },
					enemyBlocking: { min: 0, max: 1, decimals: 0, displayName: "Enemy Blocking:" },
					enemyCountering: { min: 0, max: 1, decimals: 0, displayName: "Enemy Countering:" },
					enemyFeinting: { min: 0, max: 1, decimals: 0, displayName: "Enemy Feinting:" },
					enemyBaseDodgeChance: { min: 0, max: 1, decimals: 0, displayName: "Enemy Base Dodge Chance:" },
					enemyBaseDodgeChanceMult: { number: true, displayName: "Enemy Base Dodge Chance Level Scaling (%):" },
					enemyMartialArts: { min: 0, max: 1, decimals: 0, displayName: "Enemy Martial Arts:" },
					enemyMartialArtsScaling: { strings: ["random", "level", "both"], displayName: "Enemy Martial Arts Scaling:" },
					enemyMartialArtsLevelScalingMult: { number: true, displayName: "Enemy Martial Arts Level Scaling:" },
					enemyMartialArtsBadass: { min: 0, max: 1, decimals: 0, displayName: "Enemy Martial Arts Badass Mode:" },
					enemyLevelDayScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Level Day Scaling:" },
					enemyLevelDayScalingMult: { min: 1, max: 1000000, decimals: 1, displayName: "Enemy Level Day Scaling Multiplier:" },
					enemyHealthDayScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Health Day Scaling:" },
					enemyHealthDayScalingMult: { min: 1, max: 1000000, decimals: 1, displayName: "Enemy Health Day Scaling Multiplier:" },
					enemyDayScaling: { min: 1, max: 1000000, decimals: 0, displayName: "Enemy Day Scaling Interval:" },
					enemyInfiniteDayScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Infinite Day Scaling:" },
					enemyDayScalingLimit: { min: 1, max: 1000000, decimals: 0, displayName: "Enemy Day Scaling Limit:" },
					enemyLevelDefeatScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Defeats Scaling:" },
					enemyLevelDefeatScalingMult: { min: 1, max: 1000000, decimals: 1, displayName: "Enemy Level Defeats Scaling Multiplier:" },
					enemyHealthDefeatScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Health Defeats Scaling:" },
					enemyHealthDefeatScalingMult: { min: 1, max: 1000000, decimals: 1, displayName: "Enemy Health Defeats Scaling Multiplier:" },
					enemyDefeatScaling: { min: 1, max: 1000000, decimals: 0, displayName: "Enemy Defeats Scaling Interval:" },
					enemyInfiniteDefeatScaling: { min: 0, max: 1, decimals: 0, displayName: "Enemy Infinite Defeats Scaling:" },
					enemyDefeatScalingLimit: { min: 1, max: 1000000, decimals: 0, displayName: "Enemy Defeats Scaling Limit:" },
				},
				AMCTraits: {
					halfGain: { min: 0, max: 1, decimals: 0, displayName: "Half Gain:" },
					physique: { min: 1, max: 2, decimals: 0, displayName: "Tempered Physique:" },
					willpower: { min: 1, max: 2, decimals: 0, displayName: "Tempered Willpower:" },
					milk: { min: 1, max: 2, decimals: 0, displayName: "Tempered Milk Volume:" },
					semen: { min: 1, max: 2, decimals: 0, displayName: "Tempered Semen Volume:" },
					skulduggery: { min: 1, max: 2, decimals: 0, displayName: "Tempered Skulduggery:" },
					dancing: { min: 1, max: 2, decimals: 0, displayName: "Tempered Dancing:" },
					swimming: { min: 1, max: 2, decimals: 0, displayName: "Tempered Swimming:" },
					athletics: { min: 1, max: 2, decimals: 0, displayName: "Tempered Athletics:" },
					tending: { min: 1, max: 2, decimals: 0, displayName: "Tempered Tending:" },
					housekeeping: { min: 1, max: 2, decimals: 0, displayName: "Tempered Housekeeping:" },
					brawling: { min: 1, max: 2, decimals: 0, displayName: "Tempered Brawling:" },
					footwork: { min: 1, max: 2, decimals: 0, displayName: "Tempered Footwork:" },
					striking: { min: 1, max: 2, decimals: 0, displayName: "Tempered Striking:" },
					kicking: { min: 1, max: 2, decimals: 0, displayName: "Tempered Kicking:" },
					science: { min: 1, max: 2, decimals: 0, displayName: "Tempered Science:" },
					maths: { min: 1, max: 2, decimals: 0, displayName: "Tempered Maths:" },
					english: { min: 1, max: 2, decimals: 0, displayName: "Tempered English:" },
					history: { min: 1, max: 2, decimals: 0, displayName: "Tempered History:" },
					seductionskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Seduction Skill:" },
					oralskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Oral Skill:" },
					chestskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Chest Skill:" },
					handskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Hands Skill:" },
					bottomskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Buttocks Skill:" },
					penileskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Penile Skill:" },
					vaginalskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Vaginal Skill:" },
					analskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Anal Skill:" },
					thighskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Thighs Skill:" },
					feetskill: { min: 1, max: 2, decimals: 0, displayName: "Tempered Feet Skill:" },
				},
				multiOrgasmToggle: { min: 0, max: 1, decimals: 0, displayName: "Multi-Orgasm:" },
				multiOrgasmChance: { min: 0, max: 100, decimals: 0, displayName: "Multi-Orgasm Chance:" },
				multiOrgasmGroupDisable: { min: 0, max: 1, decimals: 0, displayName: "Disable group multi-orgasms:" },
				multiOrgasmLustScaling: { min: 0, max: 1, decimals: 0, displayName: "Multi-Orgasm Lust Scaling:" },
				settings: {
					analEnabled: { bool: true, displayName: "Anal:" },
					analingusGivingEnabled: { bool: true, displayName: "Analingus (Giving):" },
					analingusReceivingEnabled: { bool: true, displayName: "Analingus (Receiving):" },
					transformAnimalEnabled: { bool: true, displayName: "Animal Transformations:" },
					asphyxiaLevel: {
						min: 0,
						max: 5,
						decimals: 0,
						displayName: "Asphyxiation:",
						textMap: {
							0: "NPCs will not touch your neck",
							1: "NPCs may grab you by the neck without impeding breathing",
							2: "NPCs may try to choke you during consensual encounters",
							3: "NPCs may try to strangle you during non-consensual encounters",
							4: "NPCs will often try to strangle you during non-consensual encounters",
							5: "NPCs will readily strangle you during non-consensual encounters, regardless of their anger",
						},
					},
					penisModifier: { min: -8, max: 8, decimals: 0, displayName: "Average size of NPC penises:", randomize: "encounter" },
					npcColossalPenisChance: { min: 0, max: 100, decimals: 0, displayName: "Chance of colossal NPC penises:", randomize: "encounter" },
					breastModifier: { min: -12, max: 12, decimals: 0, displayName: "Average size of women's breasts:", randomize: "encounter" },
					// DoLX keeps the wider rent range for its inflation economy; the pregnancy chances are
					// now straight percentages on vanilla's rewritten conception model.
					rentCostModifier: {
						min: 0.1,
						max: 10,
						decimals: 1,
						/* Vanilla randomises rent between x0.1 and x3; the slider still allows up to x10. */
						randomNumbers: Array.from({ length: 30 }, (_, i) => (i + 1) / 10),
						displayName: "Bailey's rent:",
						randomize: "gameplay",
					},
					baseNpcPregnancyChance: { min: 0, max: 100, decimals: 0, displayName: "Base NPC pregnancy chance:", randomize: "gameplay" },
					basePlayerPregnancyChance: { min: 0, max: 100, decimals: 0, displayName: "Base player pregnancy chance:", randomize: "gameplay" },
					beastMaleChanceSplit: { bool: true, displayName: "Beast attraction split by gender appearance:" },
					beastMaleChanceMale: { min: 0, max: 100, decimals: 0, displayName: "Beasts who are attracted to men:", randomize: "encounter" },
					beastMaleChanceFemale: { min: 0, max: 100, decimals: 0, displayName: "Beasts who are attracted to women:", randomize: "encounter" },
					beesEnabled: { bool: true, displayName: "Bees:" },
					bestialityEnabled: { bool: true, displayName: "Bestiality:" },
					blindStatsEnabled: { bool: true, displayName: "Blind stats mode:" },
					bodyWritingLevel: {
						min: 0,
						max: 3,
						decimals: 0,
						displayName: "Bodywriting:",
						textMap: {
							0: "NPCs will not write on you",
							1: "NPCs may ask to write on you",
							2: "NPCs may forcibly write on you",
							3: "NPCs may forcibly write on and tattoo you",
						},
					},
					npcMakeupLevel: {
						min: 0,
						max: 3,
						decimals: 0,
						displayName: "NPC makeup interference:",
						textMap: {
							0: "NPCs will not apply or remove your makeup during encounters",
							1: "NPCs will rarely apply or remove your makeup during eligible encounters",
							2: "NPCs will sometimes apply or remove your makeup during eligible encounters",
							3: "NPCs will often apply or remove your makeup during eligible encounters",
						},
						randomize: "encounter",
					},
					npcChastityLevel: {
						min: 0,
						max: 3,
						decimals: 0,
						displayName: "NPC chastity:",
						textMap: {
							0: "NPCs will never put you in chastity or take your key",
							1: "NPCs will rarely force chastity on you",
							2: "NPCs will sometimes force chastity on you",
							3: "NPCs will often force chastity on you",
						},
						randomize: "encounter",
					},
					breastFeedingEnabled: { bool: true, displayName: "Breastfeeding:" },
					lactationFlatChestEnabled: { bool: true, displayName: "Lactation at minimum breast size:" },
					cheatsEnabledToggle: { bool: true, displayName: "Cheat mode:" },
					condomLevel: {
						min: 0,
						max: 3,
						decimals: 0,
						displayName: "Condoms:",
						textMap: {
							0: "Everyone is allergic to latex and safe sex",
							1: "Only you may use condoms, but you may give NPCs condoms",
							2: "NPCs will only have condoms if pregnancy between them and the player is possible",
							3: "NPCs may have and use condoms whenever they please",
						},
						randomize: "gameplay",
					},
					condomChance: { min: 0, max: 100, decimals: 0, displayName: "Chance of NPCs having condoms:" },
					condomUseChanceRape: { min: 0, max: 100, decimals: 0, displayName: "NPC condom use during rape:" },
					condomUseChanceConsensual: { min: 0, max: 100, decimals: 0, displayName: "NPC condom use during consensual sex:" },
					playerCondomBreakChance: { min: 0, max: 100, decimals: 0, displayName: "Player condom automatic breaking:" },
					npcCondomBreakChance: { min: 0, max: 100, decimals: 0, displayName: "NPC condom automatic breaking:" },
					clothingCostModifier: { min: 1, max: 10, decimals: 1, displayName: "Cost of clothing:", randomize: "gameplay" },
					furnitureCostModifier: { min: 0.6, max: 5, decimals: 1, displayName: "Cost of furniture:", randomize: "gameplay" },
					lewdClothingCostModifier: { min: 0.1, max: 2, decimals: 1, displayName: "Cost of lewd clothes:", randomize: "gameplay" },
					schoolClothingCostModifier: { min: 1, max: 2, decimals: 1, displayName: "Cost of school clothes:", randomize: "gameplay" },
					underwearCostModifier: { min: 1, max: 2, decimals: 1, displayName: "Cost of underwear:", randomize: "gameplay" },
					tendingYieldModifier: { min: 1, max: 10, decimals: 1, displayName: "Crop yield:", randomize: "gameplay" },
					femaleClimaxAlways: { bool: true, displayName: "Cum like a girl regardless of penis size:" },
					clearClimaxEnabled: { bool: true, displayName: "Clear climax at low semen volume:" },
					toyDildoEnabled: { bool: true, displayName: "Dildos:" },
					smallPenisSemenVolumeLossDisabled: { bool: true, displayName: "Disable semen volume loss from dry orgasms:" },
					toyVirginityEnabled: { bool: true, displayName: "Toys can take virginity:" },
					transformDivineEnabled: { bool: true, displayName: "Divine Transformations:" },
					analDoubleEnabled: { bool: true, displayName: "Double Anal:" },
					vaginalDoubleEnabled: { bool: true, displayName: "Double Vaginal:" },
					earSlimesEnabled: { bool: true, displayName: "Ear slimes:" },
					earSlimeThoughts: { bool: true, displayName: "Ear slimes appear as intrusive thoughts:" },
					allureModifier: { min: 0.2, max: 2, decimals: 1, displayName: "Encounter rate:", randomize: "gameplay" },
					allureIgnoresFame: { bool: true, displayName: "Allure ignores fame:" },
					facesitEnabled: { bool: true, displayName: "Facesitting:" },
					pregnancySpeechEnabled: { bool: true, displayName: "Fertility references:" },
					footFetishEnabled: { bool: true, displayName: "Foot fetish:" },
					forcedCrossdressingEnabled: { bool: true, displayName: "Forced crossdressing:" },
					horsesEnabled: { bool: true, displayName: "Horses:" },
					humanPregnancyMonths: { min: 1, max: 9, decimals: 0, displayName: "Human pregnancy length:" },
					hypnosisEnabled: { bool: true, displayName: "Hypnosis:" },
					npcVirginChanceAdult: { min: 0, max: 100, decimals: 0, displayName: "Likelihood of adults being virgins:", randomize: "encounter" },
					npcVirginChanceStudent: { min: 0, max: 100, decimals: 0, displayName: "Likelihood of young adults being virgins:", randomize: "encounter" },
					darkSkinChance: { min: 0, max: 100, decimals: 0, displayName: "Likelihood that NPCs have dark skin:", randomize: "encounter" },
					lurkersEnabled: { bool: true, displayName: "Lurkers:" },
					fertilityCycleEnabled: { bool: true, displayName: "Menstrual cycle:" },
					arousalMoanEnabled: { bool: true, displayName: "Moans and grunts:" },
					toyMultiplePenetrationEnabled: { bool: true, displayName: "Multiple penetration with sex toys:" },
					multipleWardrobes: { strings: [false, "isolated", "strict"], displayName: "Multiple wardrobes:" }, //, "all"
					maleChanceSplit: { bool: true, displayName: "NPC attraction split by gender appearance:" },
					incompletePregnancyEnabled: { bool: true, displayName: "Incomplete pregnancy content:" },
					npcPregnancyEnabled: { bool: true, displayName: "Generic NPC pregnancy:" },
					nnpcPregnancyEnabled: { bool: true, displayName: "NNPC/LI pregnancy:" },
					analPregnancy: { strings: [false, "exceptional", "always"], displayName: "PC anal pregnancy:" },
					npcAnalPregnancyEnabled: { bool: true, displayName: "NPC anal pregnancy:" },
					maleChanceMale: { min: 0, max: 100, decimals: 0, displayName: "NPCs who are attracted to men:", randomize: "encounter" },
					maleChanceFemale: { min: 0, max: 100, decimals: 0, displayName: "NPCs who are attracted to women:", randomize: "encounter" },
					nudeGenderPerception: {
						min: 0,
						max: 2,
						decimals: 0,
						displayName: "Nude gender appearance:",
						textMap: {
							"-1": "NPCs will ignore genitals when perceiving gender, and crossdressing warnings will not be displayed",
							0: "NPCs will ignore genitals when perceiving gender",
							1: "NPCs will consider your genitals when perceiving your gender",
							2: "NPCs will judge your gender based on your genitals",
						},
					},
					monsterHallucinationsOnly: {
						bool: true,
						displayName: "Only replace beasts with monsters while hallucinating:",
						randomize: "encounter",
					},
					parasitePregnancyEnabled: { bool: true, displayName: "Parasite pregnancy:" },
					parasitesEnabled: { bool: true, displayName: "Parasites:" },
					beastMaleChance: {
						min: 0,
						max: 100,
						decimals: 0,
						displayName: "Percentage of beasts attracted to you that are male:",
						randomize: "encounter",
					},
					monsterChance: {
						min: 0,
						max: 100,
						decimals: 0,
						displayName: "Percentage of beasts that are replaced with monster girls or boys:",
						randomize: "encounter",
					},
					maleNPCVaginaChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of men that have vaginas:", randomize: "encounter" },
					maleVictimChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of other victims that are male:", randomize: "encounter" },
					maleChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of people attracted to you that are male:", randomize: "encounter" },
					femaleNPCPenisChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of women that have penises:", randomize: "encounter" },
					straponChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of women that have strap-on penises:", randomize: "encounter" },
					plantsEnabled: { bool: true, displayName: "Plantpeople:" },
					playerPregnancyEggLayingEnabled: { bool: true, displayName: "Player egg laying:" },
					playerPregnancyBeastEnabled: { bool: true, displayName: "Player pregnancy with beasts:" },
					playerPregnancyHumanEnabled: { bool: true, displayName: "Player pregnancy with humans:" },
					pregnancyType: { strings: ["realistic", "fetish", "silly"], displayName: "Pregnancy mode:" },
					pubicHairEnabled: { bool: true, displayName: "Pubic hair:" },
					ruinedOrgasmEnabled: { bool: true, displayName: "Ruined orgasms:" },
					skillCheckStyle: { strings: ["percentage", "words", "skillname"], randomize: "gameplay", displayName: "Skill check display:" },
					slimesEnabled: { bool: true, displayName: "Slimes:" },
					maggotsEnabled: { bool: true, displayName: "Maggots:" },
					slugsEnabled: { bool: true, displayName: "Slugs:" },
					spidersEnabled: { bool: true, displayName: "Spiders:" },
					swarmsEnabled: { bool: true, displayName: "Swarms:" },
					tentaclesEnabled: { bool: true, displayName: "Tentacles:" },
					voreEnabled: { bool: true, displayName: "Vore:" },
					waspsEnabled: { bool: true, displayName: "Wasps:" },
					watersportsEnabled: { bool: true, displayName: "Watersports:" },
					toyWhipEnabled: { bool: true, displayName: "Whips:" },
					wolfPregnancyWeeks: { min: 2, max: 12, decimals: 0, displayName: "Wolf pregnancy length:" },
					birdPregnancyWeeks: { min: 1, max: 12, decimals: 0, displayName: "Bird pregnancy length:" },
					realisticChildbirthEnabled: { bool: true, displayName: "Realistic childbirth:" },
					tanningDifficulty: {
						min: 0,
						max: 4,
						decimals: 0,
						displayName: "Tanning:",
						textMap: { 0: "Tans very easily", 1: "Tans easily", 2: "Tans moderately", 3: "Tans poorly", 4: "Hardly tans" },
					},
					inflationEnabled: { bool: true, displayName: "Economy inflation:" },
					inflationBaileyRelentless: { bool: true, displayName: "Relentless Bailey:" },
					inflationOnsetPct: { min: 11, max: 30, decimals: 0, displayName: "Inflation onset (%):" },
					inflationBadPct: { min: 28, max: 100, decimals: 0, displayName: "Inflation bad economy (%):" },
					inflationCrisisPct: { min: 56, max: 200, decimals: 0, displayName: "Inflation crisis (%):" },
					inflationExtremePct: { min: 113, max: 400, decimals: 0, displayName: "Inflation extreme (%):" },
					inflationParodyPct: { min: 450, max: 3000, decimals: 0, displayName: "Inflation parody spiral (%):" },
					inflationBaileyRentPct: { min: 3, max: 300, decimals: 0, displayName: "Inflation extra rent start (%):" },
					inflationBaileyCrisisTier: { strings: ["onset", "bad", "crisis", "extreme", "parody"], displayName: "Inflation refusal/hunt tier:" },
					inflationBaileyCapLow: { min: 500000, max: 5000000, decimals: 0, displayName: "Inflation low-wealth rent cap:" },
					inflationBaileyCapHigh: { min: 1000000, max: 10000000, decimals: 0, displayName: "Inflation high-wealth rent cap:" },
					inflationBaileyDemandJump: { min: 2500000, max: 25000000, decimals: 0, displayName: "Inflation jump-tier rent cap:" },
					inflationBaileyDemandInvestment: { min: 5000000, max: 100000000, decimals: 0, displayName: "Inflation investment-tier rent cap:" },
					inflationBaileyStep: { min: 10000, max: 200000, decimals: 0, displayName: "Inflation weekly rent step:" },
					inflationLoanRentSurcharge: { min: 50000, max: 300000, decimals: 0, displayName: "Inflation overdue loan collection:" },
					inflationBlackmailRewardPct: { min: 0, max: 100, decimals: 0, displayName: "Inflation blackmail reward (%):" },
				},
				blackwolfmonster: {
					min: 0,
					max: 2,
					decimals: 0,
					displayName: "Black Wolf beast type:",
					textMap: { 0: "Always a beast", 1: "Monster girl or boy when requirements met", 2: "Always a monster girl or boy" },
					randomize: "encounter",
				},
				greathawkmonster: {
					min: 0,
					max: 2,
					decimals: 0,
					displayName: "Great Hawk beast type:",
					textMap: { 0: "Always a beast", 1: "Monster girl or boy when requirements met", 2: "Always a monster girl or boy" },
					randomize: "encounter",
				},
				nightmonstermonster: {
					min: 0,
					max: 2,
					decimals: 0,
					displayName: "Night Monster beast type:",
					textMap: { 0: "Always a beast", 1: "Monster girl or boy when requirements met", 2: "Always a monster girl or boy" },
					randomize: "encounter",
				},
				breastsizemin: {
					min: 0,
					max: 12,
					decimals: 0,
					displayName: "Minimum breast size:",
					textMap: {
						0: "Flat",
						1: "Budding",
						2: "Tiny",
						3: "Small",
						4: "Pert",
						5: "Modest",
						6: "Full",
						7: "Large",
						8: "Ample",
						9: "Massive",
						10: "Huge",
						11: "Gigantic",
						12: "Enormous",
					},
				},
				breastsizemax: {
					min: 0,
					max: 12,
					decimals: 0,
					displayName: "Maximum breast size:",
					textMap: {
						0: "Flat",
						1: "Budding",
						2: "Tiny",
						3: "Small",
						4: "Pert",
						5: "Modest",
						6: "Full",
						7: "Large",
						8: "Ample",
						9: "Massive",
						10: "Huge",
						11: "Gigantic",
						12: "Enormous",
					},
				},
				bottomsizemin: {
					min: 0,
					max: 8,
					decimals: 0,
					displayName: "Minimum bottom size:",
					textMap: { 0: "Slender", 1: "Slim", 2: "Modest", 3: "Cushioned", 4: "Soft", 5: "Round", 6: "Plump", 7: "Large", 8: "Huge" },
				},
				bottomsizemax: {
					min: 0,
					max: 8,
					decimals: 0,
					displayName: "Maximum bottom size:",
					textMap: { 0: "Slender", 1: "Slim", 2: "Modest", 3: "Cushioned", 4: "Soft", 5: "Round", 6: "Plump", 7: "Large", 8: "Huge" },
				},
				penissizemin: {
					min: 0,
					max: 6,
					decimals: 0,
					displayName: "Minimum penis size:",
					textMap: { 0: "Micro", 1: "Mini", 2: "Tiny", 3: "Small", 4: "Normal", 5: "Large", 6: "Enormous" },
				},
				penissizemax: {
					min: 0,
					max: 6,
					decimals: 0,
					displayName: "Maximum penis size:",
					textMap: { 0: "Micro", 1: "Mini", 2: "Tiny", 3: "Small", 4: "Normal", 5: "Large", 6: "Enormous" },
				},
				confirmSave: { bool: true, displayName: "Require confirmation on save:" },
				confirmLoad: { bool: true, displayName: "Require confirmation on load:" },
				confirmDelete: { bool: true, displayName: "Require confirmation on delete:" },
				reducedLineHeight: { bool: true, displayName: "Reduced line height:" },
				outfitEditorPerPage: { min: 5, max: 20, decimals: 0, displayName: "Items per page:" }, //, "all"
				options: {
					neverNudeMenus: { bool: true, displayName: "Hide player nudity in menus:" },
					showCaptionText: { bool: true, displayName: "Show caption text in sidebar:" },
					showAllStatMeters: { bool: true, displayName: "Always show sidebar stat meters:" },
					clothingCaption: { bool: true, displayName: "Show clothing description in sidebar:" },
					clothingReplacementWarning: { bool: true, displayName: "Enable clothing replacement warning:" },
					sidebarStats: { strings: ["disabled", "limited", "all"], displayName: "Closed sidebar stats:" },
					sidebarTime: { strings: ["disabled", "top", "bottom"], displayName: "Closed sidebar time:" },
					combatControls: { strings: ["radio", "columnRadio", "lists", "limitedLists"], displayName: "Combat controls:" },
					mapMovement: { bool: true, displayName: "Enable movement by clicking on map:" },
					mapTop: { bool: true, displayName: "Move the map above the map links:" },
					mapMarkers: { bool: true, displayName: "Show clickable areas on maps:" },
					images: { min: 0, max: 1, decimals: 0, displayName: "Images:" },
					combatImages: { min: 0, max: 1, decimals: 0, displayName: "Combat images:" },
					bodywritingImages: { bool: true, displayName: "Bodywriting images:" },
					silhouetteEnabled: { bool: true, displayName: "NPC silhouettes:" },
					bodySizeScaling: { bool: true, displayName: "Scale sidebar image to body size:" },
					sidebarAnimations: { bool: true, displayName: "Sidebar images:" },
					blinkingEnabled: { bool: true, displayName: "Animated blinking:" },
					combatAnimations: { bool: true, displayName: "Combat animations:" },
					halfClosedEnabled: { bool: true, displayName: "Half-closed eyes:" },
					characterLightEnabled: { bool: true, displayName: "Character lighting:" },
					lightSpotlight: { min: 0, max: 1, decimals: 2, displayName: "Spotlight:" },
					lightGradient: { min: 0, max: 1, decimals: 2, displayName: "Gradient:" },
					lightGlow: { min: 0, max: 1, decimals: 2, displayName: "Glow:" },
					lightFlat: { min: 0, max: 1, decimals: 2, displayName: "Flat light:" },
					lightTFColor: { min: 0, max: 1, decimals: 2, displayName: "Angel/Devil TF colour components:" },
					combatLightEnabled: { bool: true, displayName: "Character lighting:" },
					combatLightOffsetY: { min: 0, max: 128, decimals: 0, displayName: "Y offset:" },
					combatLightSpotlight: { min: 0, max: 1, decimals: 2, displayName: "Spotlight:" },
					combatLightSpotlightX: { min: 0, max: 128, decimals: 0, displayName: "Spotlight width:" },
					combatLightSpotlightY: { min: 0, max: 48, decimals: 0, displayName: "Spotlight height:" },
					combatLightGradient: { min: 0, max: 1, decimals: 2, displayName: "Gradient:" },
					combatLightGlow: { min: 0, max: 1, decimals: 2, displayName: "Glow:" },
					combatLightFlat: { min: 0, max: 1, decimals: 2, displayName: "Flat light:" },
					combatLightTFColor: { min: 0, max: 1, decimals: 2, displayName: "Angel/Devil TF colour components:" },
					maxStates: { min: 1, max: 20, decimals: 0, displayName: "History depth:" },
					historyControls: { bool: true, displayName: "Show history controls:" },
					useNarrowMarket: { bool: true, displayName: "Use 'narrow screen' version of market inventory:" },
					skipStatisticsConfirmation: { bool: true, displayName: "Skip confirmation when viewing extra stats:" },
					passageCount: { strings: ["disabled", "changes", "total"], displayName: "Display passage count:" },
					playtime: { bool: true, displayName: "Display play time:" },
					numberify_enabled: { min: 0, max: 1, decimals: 0, displayName: "Enable numbered link navigation:" },
					timestyle: { strings: ["military", "ampm"], displayName: "Time style:" },
					tipdisable: { boolLetter: true, bool: true, displayName: "Sidebar Tips:" },
					pepperSprayDisplay: {
						strings: ["none", "sprays", "compact", ...Array.from({ length: 9 }, (_, i) => `modded${i + 1}`)],
						displayName: "Pepper spray display:",
					},
					dragonStarDisplay: { strings: ["none", "show"], displayName: "Dragon star display:" },
					condomsDisplay: { strings: ["none", "standard", ...Array.from({ length: 9 }, (_, i) => `modded${i + 1}`)], displayName: "Condom display:" },
					closeButtonMobile: { bool: true, displayName: "Items per page:" },
					showDebugRenderer: { bool: true, displayName: "Enable renderer debugger:" },
					showCombatTools: { bool: true, displayName: "Enable combat tools:" },
					numpad: { bool: true, displayName: "Enable numpad:" },
					traitOverlayFormat: { strings: ["table", "reducedTable", "list"], displayName: "Display traits:" },
					font: {
						default: "",
						strings: [
							"",
							"Arial",
							"Verdana",
							"TimesNewRoman",
							"Georgia",
							"Garamond",
							"CourierNew",
							"LucidaConsole",
							"Monaco",
							"ComicSans",
							"OpenDyslexicMono",
							"Lexend",
						],
						displayName: "Font:",
					},
					passageLineHeight: { default: 0, strings: [0, 1, 1.25, 1.5, 1.75, 2], displayName: "Passage line height:" },
					overlayLineHeight: { default: 0, strings: [0, 1, 1.25, 1.5, 1.75, 2], displayName: "Overlay line height:" },
					sidebarLineHeight: { default: 0, strings: [0, 1, 1.25, 1.5, 1.75, 2], displayName: "Sidebar line height:" },
					passageFontSize: { default: 0, strings: [0, 10, 12, 14, 16, 18, 20], displayName: "Passage font size:" },
					overlayFontSize: { default: 0, strings: [0, 10, 12, 14, 16, 18, 20], displayName: "Overlay font size:" },
					sidebarFontSize: { default: 0, strings: [0, 12, 14, 16, 18, 20], displayName: "Sidebar font size:" },
					genderBody: { strings: ["default", "m", "a", "f"], displayName: "Body type displayed:" },
					notesAutoSave: { bool: true, displayName: "Notes auto saving:" },
					dateFormat: { strings: ["en-GB", "en-US", "zh-CN"], displayName: "Date format:" },
				},
				multiOrgasmGender: { strings: ["all", "f", "m"], displayName: "NPC multi-orgasm applies to:" },
				NNPCMultiOrgasmGender: { strings: ["all", "f", "m"], displayName: "NNPC multi-orgasm applies to:" },
				xchangeStatSplit: { bool: true, displayName: "Lewd stat split:" },
				whackRandom: { bool: true, displayName: "Whack actions can fail:" },
				portalPantiesEnabled: { min: 0, max: 1, decimals: 0, displayName: "Portal spike effect:" },
				angryHypnotist: { bool: true, displayName: "Angered hypnotists more likely:" },
				deviantHypnotist: { bool: true, displayName: "Hypnotic deviancy:" },
				hypnotistChance: { min: 0, max: 100, decimals: 0, displayName: "Enemy hypnotist chance (%):" },
				willpowerCum: { min: 0, max: 1, decimals: 0, displayName: "Cum even if you resist the stun:" },
				xchange: {
					pillPermanence: { min: 0, max: 1, decimals: 0, displayName: "Pill permanence:" },
					continueDurationCapEnabled: { bool: true, displayName: "Continue duration cap:" },
					postPermanenceFertilityReset: { min: 0, max: 1, decimals: 0, displayName: "Reset fertility after permanence:" },
					grayPillGenderflip: { min: 0, max: 1, decimals: 0, displayName: "Gray pills flip sex:" },
					omegaShrinkGenitals: { min: 0, max: 1, decimals: 0, displayName: "Pink Omega pill shrinks instead of changing sex:" },
					npcPillChangesGender: { min: 0, max: 1, decimals: 0, displayName: "Pilled NPCs change gender:" },
					bodyAdjustmentEnabled: { min: 0, max: 1, decimals: 0, displayName: "Adjustment period after changing bodies:" },
					omegaNeedsNoVagina: { min: 0, max: 1, decimals: 0, displayName: "Omega needs no vagina:" },
					alphaGrowsPenis: { min: 0, max: 1, decimals: 0, displayName: "Alpha grows a cock if you have none:" },
					aboDrivesHeat: { min: 0, max: 1, decimals: 0, displayName: "Alpha/Omega drive heat:" },
					pheromoneAllure: { min: 0, max: 1, decimals: 0, displayName: "Alpha/Beta/Omega pheromones:" },
					nonconEnabled: { min: 0, max: 1, decimals: 0, displayName: "Non-con pill spiking:" },
					spikeSideEffectsEnabled: { min: 0, max: 1, decimals: 0, displayName: "Suspicious pill side effects:" },
					disregardGender: { min: 0, max: 1, decimals: 0, displayName: "Ignore gender checks:" },
					faceChangesEnabled: { min: 0, max: 1, decimals: 0, displayName: "Face changes for pills:" },
					genitalAddictTraitsEnabled: { min: 0, max: 1, decimals: 0, displayName: "Cock/hole addict traits:" },
					oralFixationTraitEnabled: { min: 0, max: 1, decimals: 0, displayName: "Oral Fixation trait:" },
					oralFixationSwallowRelief: { min: 0, max: 1, decimals: 0, displayName: "Oral Fixation swallow relief:" },
					heatBlocksScream: { min: 0, max: 1, decimals: 0, displayName: "Can't scream in heat/rut:" },
					critterMagnetTraitEnabled: { min: 0, max: 1, decimals: 0, displayName: "Critter Magnet trait:" },
					chastityAcclimatedTraitEnabled: { min: 0, max: 1, decimals: 0, displayName: "Chastity Acclimated trait:" },
					arousalAcclimatedTraitEnabled: { min: 0, max: 1, decimals: 0, displayName: "Arousal Acclimated trait:" },
					insanityDisturbedTraitsEnabled: { min: 0, max: 1, decimals: 0, displayName: "Full Insanity dissociation:" },
					insanityBecomesPermanent: { min: 0, max: 1, decimals: 0, displayName: "Natural Insanity is permanent:" },
					useHermBalls: { min: 0, max: 1, decimals: 0, displayName: "Purple pillers have testes:" },
					chastityKeepBeltShape: { min: 0, max: 1, decimals: 0, displayName: "Keep chastity belt shape:" },
					combatPillingEnabled: { min: 0, max: 1, decimals: 0, displayName: "Combat pilling:" },
					restrictedSexCombatPilling: { min: 0, max: 1, decimals: 0, displayName: "Combat pills same-sex NPCs only:" },
					NNPCcombatPillingEnabled: { min: 0, max: 1, decimals: 0, displayName: "NNPC noncon combat pilling:" },
					combatPillingIfPilled: { min: 0, max: 1, decimals: 0, displayName: "Combat pills if already pilled:" },
					combatPillingBeastsEnabled: { min: 0, max: 1, decimals: 0, displayName: "Beasts carry combat pills:" },
					combatPillingMonsterPeopleEnabled: { min: 0, max: 1, decimals: 0, displayName: "Monster people carry combat pills:" },
					combatPillingChance: { min: 0, max: 100, decimals: 0, displayName: "NPC pill chance (%):" },
					combatPillingDrawChance: { min: 1, max: 50, decimals: 0, displayName: "Pill use chance per turn:" },
					combatPillingPureRatio: { min: 0, max: 100, decimals: 0, displayName: "Clean pill ratio (%):" },
					bodySizeLimitsEnabled: { min: 0, max: 1, decimals: 0, displayName: "Separate X-Change body size limits:" },
					bodyBreastSizeMin: {
						min: 0,
						max: 12,
						decimals: 0,
						displayName: "X-Change minimum breast size:",
						textMap: {
							0: "Flat",
							1: "Budding",
							2: "Tiny",
							3: "Small",
							4: "Pert",
							5: "Modest",
							6: "Full",
							7: "Large",
							8: "Ample",
							9: "Massive",
							10: "Huge",
							11: "Gigantic",
							12: "Enormous",
						},
					},
					bodyBreastSizeMax: {
						min: 0,
						max: 12,
						decimals: 0,
						displayName: "X-Change maximum breast size:",
						textMap: {
							0: "Flat",
							1: "Budding",
							2: "Tiny",
							3: "Small",
							4: "Pert",
							5: "Modest",
							6: "Full",
							7: "Large",
							8: "Ample",
							9: "Massive",
							10: "Huge",
							11: "Gigantic",
							12: "Enormous",
						},
					},
					bodyBottomSizeMin: {
						min: 0,
						max: 8,
						decimals: 0,
						displayName: "X-Change minimum bottom size:",
						textMap: { 0: "Slender", 1: "Slim", 2: "Modest", 3: "Cushioned", 4: "Soft", 5: "Round", 6: "Plump", 7: "Large", 8: "Huge" },
					},
					bodyBottomSizeMax: {
						min: 0,
						max: 8,
						decimals: 0,
						displayName: "X-Change maximum bottom size:",
						textMap: { 0: "Slender", 1: "Slim", 2: "Modest", 3: "Cushioned", 4: "Soft", 5: "Round", 6: "Plump", 7: "Large", 8: "Huge" },
					},
					bodyPenisSizeMin: {
						min: 0,
						max: 6,
						decimals: 0,
						displayName: "X-Change minimum penis size:",
						textMap: { 0: "Micro", 1: "Mini", 2: "Tiny", 3: "Small", 4: "Normal", 5: "Large", 6: "Enormous" },
					},
					bodyPenisSizeMax: {
						min: 0,
						max: 6,
						decimals: 0,
						displayName: "X-Change maximum penis size:",
						textMap: { 0: "Micro", 1: "Mini", 2: "Tiny", 3: "Small", 4: "Normal", 5: "Large", 6: "Enormous" },
					},
					customisedEyeColour: {
						strings: [
							"nochange",
							"black",
							"purple",
							"dark blue",
							"light blue",
							"amber",
							"hazel",
							"green",
							"lime green",
							"red",
							"pink",
							"grey",
							"light grey",
							"random",
						],
						displayName: "Sexflipped eye colour:",
					},
					customisedHairColour: {
						strings: ["nochange", ...setup.colours.hair.filter(c => c.natural || c.dye).map(c => c.variable)],
						displayName: "Sexflipped hair colour:",
					},
					customisedSkinColour: {
						strings: [
							"nochange",
							"light",
							"medium",
							"dark",
							"gyaru",
							"rlight",
							"rmedium",
							"rdark",
							"rgyaru",
							"glight",
							"gmedium",
							"gdark",
							"ggyaru",
							"ylight",
							"ymedium",
							"ydark",
							"ygyaru",
							"blight",
							"bmedium",
							"bdark",
							"bgyaru",
							"random",
						],
						displayName: "Sexflipped skin colour:",
					},
					customisedDemeanour: {
						strings: [
							"nochange",
							"docile",
							"meek",
							"shy",
							"polite",
							"neutral",
							"confident",
							"bratty",
							"cruel",
							"flamboyant",
							"special",
							"capricious",
							"fickle",
							"random",
						],
						displayName: "Sexflipped demeanour:",
					},
					sizeOverride: {
						strings: ["default", "miniature", "tiny", "small", "normal", "tall", "large", "giant"],
						displayName: "Physique size override:",
					},
					physiqueChangePercent: { number: true, displayName: "Transformation multiplier (%):" },
					pillSensitivityChange: { number: true, displayName: "Sensitivity boost due to pill:" },
					impuritySensitivityBonus: { number: true, displayName: "Sensitivity boost due to impurity:" },
					pregnancyMultPercent: { number: true, displayName: "Pilled pregnancy chance modifier (%):" },
					resistanceOrgasmPenalty: { min: 0.5, max: 0.99, decimals: 2, displayName: "Resistance odds reduction per orgasm:" },
					resistanceDaysPenalty: { number: true, displayName: "Resistance pill-end failure penalty (days):" },
					portalFrequency: { number: true, displayName: "Portal frequency (%):" },
					cumcureTime: { min: 1, max: 24, decimals: 0, displayName: "CumCure time reduction:" },
					breederFreeOrgasm: { bool: true, displayName: "Breeder orgasm without creampie:" },
					omegaFreeOrgasm: { bool: true, displayName: "Omega orgasm without being filled:" },
					alphaFreeOrgasm: { bool: true, displayName: "Alpha orgasm without knotting:" },
					genitalAddictFreeOrgasm: { bool: true, displayName: "Cock/hole addict orgasm without penetration:" },
					oralFixationFreeOrgasm: { bool: true, displayName: "Oral Fixation orgasm without oral:" },
					breederInfertile: { bool: true, displayName: "Fake breeder (infertile):" },
					alwaysFertile: { bool: true, displayName: "Always fertile while X-Changed:" },
					fertilityStrengthPercent: { min: 25, max: 400, decimals: 0, displayName: "Fertility strength (%):" },
					willpowerSystemEnabled: { min: 0, max: 1, decimals: 0, displayName: "Willpower system:" },
					willpowerSuccessCost: { number: true, displayName: "Willpower success cost:" },
					willpowerFailureCost: { number: true, displayName: "Willpower failure cost:" },
					willpowerRestEnabled: { min: 0, max: 1, decimals: 0, displayName: "Rest restores willpower:" },
					willpowerRestPercent: { min: 0, max: 300, decimals: 0, displayName: "Rest recovery strength (%):" },
					giAutoEnabled: { bool: true, displayName: "Update Gender Identity from Identity system:" },
					audienceDysphoriaEnabled: { bool: true, displayName: "Dysphoria from the gender of the room:" },
					euphoriaAcclimationEnabled: { bool: true, displayName: "Preferred-trait comfort wears off over time:" },
					giTransformEnabled: { bool: true, displayName: "Slow body changes follow Gender Identity:" },
					giBreastSizeEnabled: { bool: true, displayName: "Body identity: breast size:" },
					giAssSizeEnabled: { bool: true, displayName: "Body identity: ass size:" },
					giGenitalsEnabled: { bool: true, displayName: "Body identity: genitals:" },
					giHairLengthEnabled: { bool: true, displayName: "Body identity: hair length:" },
					giBodySizeEnabled: { bool: true, displayName: "Body identity: body size:" },
					giFecundityEnabled: { bool: true, displayName: "Body identity: fecundity:" },
					heat: {
						systemOn: { min: 0, max: 1, decimals: 0, displayName: "Forceful heat:" },
						permanentOn: { min: 0, max: 1, decimals: 0, displayName: "Permanent heat/rut:" },
						resistWithWillpower: { min: 0, max: 1, decimals: 0, displayName: "Heat resisted by willpower:" },
					},
					spikepool: {
						herm: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Herm:" },
						crossdresser: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Sissy/Butch:" },
						bull: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Bull:" },
						breeder: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Breeder:" },
						resistance: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Resistance:" },
						continue: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Continue:" },
						passion: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Passion:" },
						dumbbitch: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Dumb Bitch:" },
						innocence: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Innocence:" },
						feartoxin: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Fear Toxin:" },
						swell: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Swell:" },
						bimbo: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Bimbo:" },
						cumcure: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - CumCure:" },
						fertility: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Hyper Fertility:" },
						omega: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Omega:" },
						alpha: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Alpha:" },
						beta: { min: 0, max: 1, decimals: 0, displayName: "Spike pool - Beta:" },
					},
					spikerates: {
						herm: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Herm:" },
						crossdress: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Sissy/Butch:" },
						bull: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Bull:" },
						breeder: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Breeder:" },
						resistance: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Resistance:" },
						continue: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Continue:" },
						passion: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Passion:" },
						"dumb-bitch": { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Dumb Bitch:" },
						innocence: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Innocence:" },
						feartoxin: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Fear Toxin:" },
						swell: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Swell:" },
						bimbo: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Bimbo:" },
						cumcure: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - CumCure:" },
						fertility: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Hyper Fertility:" },
						portal: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Portal:" },
						omega: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Omega:" },
						alpha: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Alpha:" },
						beta: { min: 1, max: 10, decimals: 0, displayName: "Spike rate - Beta:" },
					},
				},
				identity: {
					presentation: {
						pronouns: {
							masculine: {
								reject: { bool: true, displayName: "Masculine pronouns rejected:" },
								acceptance: { bool: true, displayName: "Masculine pronouns accepted:" },
							},
							feminine: {
								reject: { bool: true, displayName: "Feminine pronouns rejected:" },
								acceptance: { bool: true, displayName: "Feminine pronouns accepted:" },
							},
							neutral: {
								reject: { bool: true, displayName: "Neutral pronouns rejected:" },
								acceptance: { bool: true, displayName: "Neutral pronouns accepted:" },
							},
							preferredMasculine: { bool: true, displayName: "Masculine pronouns preferred:" },
							preferredFeminine: { bool: true, displayName: "Feminine pronouns preferred:" },
							preferredNeutral: { bool: true, displayName: "Neutral pronouns preferred:" },
							pronounDynamicMode: { strings: ["", "body", "clothing", "appearance", "posture"], displayName: "Dynamic pronoun mode:" },
						},
						makeup: {
							wearing: {
								reject: { bool: true, displayName: "Wearing makeup rejected:" },
								acceptance: { bool: true, displayName: "Wearing makeup accepted:" },
							},
							bare: {
								reject: { bool: true, displayName: "Bare face rejected:" },
								acceptance: { bool: true, displayName: "Bare face accepted:" },
							},
							preferred: { strings: ["wearing", "bare", "n"], displayName: "Preferred makeup:" },
						},
						appearance: {
							masculine: {
								reject: { bool: true, displayName: "Masculine appearance rejected:" },
								acceptance: { bool: true, displayName: "Masculine appearance accepted:" },
							},
							feminine: {
								reject: { bool: true, displayName: "Feminine appearance rejected:" },
								acceptance: { bool: true, displayName: "Feminine appearance accepted:" },
							},
							neutral: {
								reject: { bool: true, displayName: "Androgynous appearance rejected:" },
								acceptance: { bool: true, displayName: "Androgynous appearance accepted:" },
							},
							preferred: { strings: ["m", "f", "n"], displayName: "Preferred appearance:" },
						},
						clothing: {
							masculine: {
								reject: { bool: true, displayName: "Masculine clothing rejected:" },
								acceptance: { bool: true, displayName: "Masculine clothing accepted:" },
							},
							feminine: {
								reject: { bool: true, displayName: "Feminine clothing rejected:" },
								acceptance: { bool: true, displayName: "Feminine clothing accepted:" },
							},
							neutral: {
								reject: { bool: true, displayName: "Androgynous clothing rejected:" },
								acceptance: { bool: true, displayName: "Androgynous clothing accepted:" },
							},
							preferred: { strings: ["m", "f", "u", "n"], displayName: "Preferred clothing:" },
						},
					},
				},
				wli: {
					cfg: {
						bodywritinglvl: { min: 0, max: 2, decimals: 0, displayName: "Wraith supernatural bodywriting:" },
						tattoodream: { bool: true, displayName: "Wraith tattoo during nightmares:" },
						tattoobypass: { bool: true, displayName: "Wraith can overwrite tattoos:" },
						nosocialrng: { bool: true, displayName: "Wraith disable social tab RNG:" },
						notentacles: { bool: true, displayName: "Wraith disable tentacles:" },
					},
				},
				shopDefaults: {
					alwaysBackToShopButton: { bool: true },
					color: {
						strings: ["black", "blue", "brown", "green", "pink", "purple", "red", "tangerine", "teal", "white", "yellow", "custom", "random"],
					},
					colourItems: { strings: ["disable", "random", "default"] },
					compactMode: { bool: true },
					disableReturn: { bool: true },
					highContrast: { bool: true },
					mannequinGender: { strings: ["same", "opposite", "male", "female"] },
					mannequinGenderFromClothes: { bool: true },
					noHelp: { bool: true },
					noTraits: { bool: true },
					secColor: {
						strings: ["black", "blue", "brown", "green", "pink", "purple", "red", "tangerine", "teal", "white", "yellow", "custom", "random"],
					},
				},
				wardrobeDefaults: {
					showTraits: { bool: false },
					extraInfo: { bool: false },
				},
			};
			Object.assign(result.options, {
				theme: {
					strings: ["system-default", "dark", "light", "arctic", "zen", "monokai", "storm", "latte", "frappe", "macchiato", "mocha", "sea"],
					displayName: "Theme:",
				},
				passageMaxWidth: { default: 0, strings: [0, 50, 55, 60, 65, 70, 75], displayName: "Passage width:" },
				thermometerDisplay: { strings: ["", ...Array.from({ length: 9 }, (_, i) => `modded${i + 1}`)], displayName: "Thermometer:" },
				NnpcDisplaySystem: { strings: ["none", "vanilla", "dolp"], displayName: "Named NPC sprite system:" },
				nnpcDisplay: {
					strings: [0, ...setup.NPCNameList.filter(name => name !== "Luchifen").map(name => name.toLowerCase().replaceAll(" ", "_")), "others"],
					displayName: "Named NPC sprite:",
				},
				nnpcDisplayGender: { strings: ["male", "female", "monster"], displayName: "NPC sprite gender:" },
				nnpcDisplayLayer: { strings: ["front", "back"], displayName: "NPC sprite layer:" },
				nnpcDisplaySkin: { strings: ["pale", "dark", "monster"], displayName: "NPC sprite skin:" },
				nnpcDisplaySlot: { min: 0, max: 9, decimals: 0, displayName: "NPC sprite slot:" },
				altImgGender: { strings: ["m", "f"], displayName: "Alternative spriteset gender:" },
				showCombatImgWhenGender: { strings: ["both", "m", "f"], displayName: "Combat image gender:" },
				fishingBaitSelection: { strings: ["sidebar", "dropdown"], displayName: "Fishing bait selection:" },
				debugdisable: { bool: true, boolLetter: true, displayName: "Additional error messages:" },
				statNerf: { min: 0, max: 100, decimals: 0, displayName: "Lewd stat multiplier:" },
				zoom: { min: 50, max: 200, decimals: 0, displayName: "Zoom:" },
			});
			for (const key of [
				"fahrenheit",
				"mapLegacy",
				"autosaveDisabled",
				"listboxOutfitsEnabled",
				"lowerHalo",
				"showUiBar",
				"bigCanvas",
				"showSidebarEffects",
				"showExactMeasurements",
				"targetYourself",
				"scrollRemember",
				"textAnimsAll",
				"textAnimsDrunk",
				"textAnimsHeat",
				"textAnimsHypno",
				"weatherUpdate",
				"reflections",
				"topdownBreastjob",
				"confirmDialogUponTabClose",
				"showGameVersion",
			]) {
				result.options[key] = { bool: true, displayName: `${key}:` };
			}
			for (const key of [
				"postureAffectsVoice",
				"muteonhide",
				"audio",
				"voiceoverAudio",
				"npcVoiceoverAudio",
				"useAltImg",
				"altImgAlways",
				"showCombatImgWhileStanding",
				"showCurrentSexIcon",
				"currentSexIconIdentity",
				"showPortalXray",
			]) {
				result.options[key] = { min: 0, max: 1, decimals: 0, displayName: `${key}:` };
			}
			for (const key of ["mastervolume", "bgm_volume", "bgs_volume", "ambience_volume", "voice_volume", "nonCombatMoanVolume"]) {
				result.options[key] = { min: 0, max: 1, decimals: 2, displayName: `${key}:` };
			}
			result.options.voiceConfig = Object.fromEntries(
				["male", "female", "sissy", "butch", "herm"].map(key => [
					key,
					{
						enabled: { bool: true, displayName: `${key} voice enabled:` },
						voice: { strings: ["v1", "v2", "m"], displayName: `${key} voice:` },
						npc: { strings: ["all", "m", "f", "off"], displayName: `${key} NPC voice:` },
					},
				])
			);
			result.options.autoNNPCDisplay = { enabled: { bool: true, displayName: "Automatic NPC sprites:" } };
			for (const name of [...setup.NPCNameList.filter(name => name !== "Luchifen"), "Others"]) {
				result.options.autoNNPCDisplay[name.toLowerCase().replaceAll(" ", "_")] = {
					genderOverride: { bool: true, displayName: `${name} sprite gender override:` },
					gender: { strings: ["", "male", "female", "monster"], displayName: `${name} sprite gender:` },
					skin: { strings: ["pale", "dark", "monster"], displayName: `${name} sprite skin:` },
					slot: { min: 0, max: 9, decimals: 0, displayName: `${name} sprite slot:` },
					layer: { strings: ["front", "back"], displayName: `${name} sprite layer:` },
				};
			}
			result.identity.body = {};
			for (const [group, choices] of Object.entries({
				chest: ["flat", "small", "medium", "big"],
				bottom: ["small", "medium", "big"],
				genitals: ["vagina", "tinypenis", "smallpenis", "mediumpenis", "bigpenis"],
				hairlength: ["short", "medium", "long"],
				bodysize: ["miniature", "tiny", "small", "normal", "tall", "large", "giant"],
			})) {
				result.identity.body[group] = Object.fromEntries(
					choices.map(choice => [
						choice,
						{
							reject: { bool: true, displayName: `${group} ${choice} rejected:` },
							acceptance: { bool: true, displayName: `${group} ${choice} accepted:` },
						},
					])
				);
				result.identity.body[group].preferred = { strings: choices, displayName: `Preferred ${group}:` };
			}
			result.identity.body.genitals.preferred = { strings: [false, "vagina", "tinypenis", "smallpenis", "mediumpenis", "bigpenis"] };
			result.identity.body.genitals.preferredPenis = { strings: [false, "tinypenis", "smallpenis", "mediumpenis", "bigpenis"] };
			result.identity.body.genitals.preferredVagina = { bool: true };
			for (const group of ["lactation", "pregnancy"]) {
				result.identity.body[group] = {
					reject: { bool: true, displayName: `${group} rejected:` },
					acceptance: { bool: true, displayName: `${group} accepted:` },
					preferred: { strings: ["none", group], displayName: `${group} preferred:` },
				};
			}
			break;
		case "npc":
			result = {
				pronoun: { strings: ["m", "f"], displayName: "Pronoun: ", textMap: { none: "N/A", m: "Male", f: "Female" } },
				gender: { strings: ["m", "f"], displayName: "Genitalia: ", textMap: { none: "N/A", m: "Penis", f: "Vagina" } },
				skincolour: {
					strings: ["white", "black", "ghost"],
					displayName: "Skin colour: ",
					textMap: { none: "N/A", white: "Pale", black: "Dark", ghost: "Ghostly Pale" },
				},
				penissize: {
					min: 0,
					max: 5,
					decimals: 0,
					displayName: "Penis size: ",
					textMap: {
						0: "None",
						1: "Tiny",
						2: "Average",
						3: "Thick",
						4: "Huge",
						5: "Colossal",
					},
				},
				breastsize: {
					min: 0,
					max: 12,
					decimals: 0,
					displayName: "Breast size: ",
					textMap: {
						none: "N/A",
						0: "Flat",
						1: "Budding",
						2: "Tiny",
						3: "Small",
						4: "Pert",
						5: "Modest",
						6: "Full",
						7: "Large",
						8: "Ample",
						9: "Massive",
						10: "Huge",
						11: "Gigantic",
						12: "Enormous",
					},
				},
				maxOrgasms: {
					min: 1,
					max: 5,
					decimals: 0,
					displayName: "Base max orgasms: ",
				},
			};
			break;
	}
	if (type === "starting") {
		result.player.skin.faceFreckles = result.player.freckles;
		delete result.player.freckles;
		result.player.skin.bodyFreckles = { strings: ["none", "upper", "full", "random"], displayName: "Body freckles:", randomize: "characterAppearance" };
	} else if (type === "general") {
		for (const key of [
			"beastMaleChance",
			"beastMaleChanceMale",
			"beastMaleChanceFemale",
			"beastMaleChanceSplit",
			"bestialityEnabled",
			"monsterChance",
			"monsterHallucinationsOnly",
			"darkSkinChance",
		])
			delete result.settings[key];
		for (const beast of C.namedBeasts) delete result[beast + "monster"];
		result.options.tipdisable = { bool: true, displayName: "Sidebar Tips:" };
		result.settings.granularBeastControl = { bool: true, displayName: "Granular beast controls:" };
		result.settings.skinToneMin = { min: 0, max: 100, decimals: 0, displayName: "Lightest NPC skin:", randomize: "encounter" };
		result.settings.skinToneMode = { min: 0, max: 100, decimals: 0, displayName: "Most common NPC skin:", randomize: "encounter" };
		result.settings.skinToneMax = { min: 0, max: 100, decimals: 0, displayName: "Darkest NPC skin:", randomize: "encounter" };
		result.settings.beastSettings = {};
		for (const beast of C.beastSettingTypes) {
			result.settings.beastSettings[beast] = {
				monsterChance: { min: 0, max: 100, decimals: 0 },
				hallucinationsOnly: { bool: true },
				maleChance: { min: 0, max: 100, decimals: 0 },
				maleChanceMale: { min: 0, max: 100, decimals: 0 },
				maleChanceFemale: { min: 0, max: 100, decimals: 0 },
				maleChanceSplit: { bool: true },
				bestiality: { strings: ["on", "off", "monsterOnly"] },
				victimsAlwaysMonster: { bool: true },
			};
		}
		result.settings.namedBeasts = Object.fromEntries(
			C.namedBeasts.map(beast => [
				beast,
				{
					monsterChance: { min: 0, max: 100, decimals: 0, displayName: `${beast} monster chance:`, randomize: "encounter" },
					hallucinationsOnly: { bool: true, displayName: `${beast} only a monster while hallucinating:`, randomize: "encounter" },
				},
			])
		);
		result.genericBeastSettings = {
			beastMaleChance: { min: 0, max: 100, decimals: 0, displayName: "Percentage of beasts attracted to you that are male:", randomize: "encounter" },
			beastMaleChanceMale: { min: 0, max: 100, decimals: 0, displayName: "Beasts who are attracted to men:", randomize: "encounter" },
			beastMaleChanceFemale: { min: 0, max: 100, decimals: 0, displayName: "Beasts who are attracted to women:", randomize: "encounter" },
			beastMaleChanceSplit: { bool: true, displayName: "Beast attraction split by gender appearance:" },
			monsterHallucinationsOnly: { bool: true, displayName: "Only replace beasts with monsters while hallucinating:", randomize: "encounter" },
			monsterChance: {
				min: 0,
				max: 100,
				decimals: 0,
				displayName: "Percentage of beasts that are replaced with monster girls or boys:",
				randomize: "encounter",
			},
			bestiality: { strings: ["on", "off", "monsterOnly"], displayName: "Bestiality:" },
			victimsAlwaysMonster: { bool: true, displayName: "Beast victims are always monsters:", randomize: "encounter" },
		};
	} else if (type === "npc") {
		result.skincolour = { min: 0, max: 100, decimals: 0, displayName: "Skin tone:" };
		result.skinType = { strings: ["normal", "ghost"], displayName: "Skin type:" };
	}
	return result;
}
window.settingsObjects = settingsObjects;

/* Converts specific settings to so they don't look so chaotic to players */
function settingsConvert(exportType, type, settings) {
	const listObject = settingsObjects(type);
	const result = settings;
	const keys = Object.keys(listObject);
	for (let i = 0; i < keys.length; i++) {
		if (result[keys[i]] === undefined) continue;
		if (["map", "player", "shopDefaults", "options", "wardrobeDefaults", "combatExtended", "AMCTraits"].includes(keys[i])) {
			const itemKey = Object.keys(listObject[keys[i]]);
			for (let j = 0; j < itemKey.length; j++) {
				if (result[keys[i]][itemKey[j]] === undefined) continue;
				const keyArray = Object.keys(listObject[keys[i]][itemKey[j]]);
				if (exportType) {
					if (keyArray.includes("boolLetter") && keyArray.includes("bool")) {
						if (result[keys[i]][itemKey[j]] === "t") {
							result[keys[i]][itemKey[j]] = true;
						} else if (result[keys[i]][itemKey[j]] === "f") {
							result[keys[i]][itemKey[j]] = false;
						}
					}
				} else {
					if (keyArray.includes("boolLetter") && keyArray.includes("bool")) {
						if (result[keys[i]][itemKey[j]] === true) {
							result[keys[i]][itemKey[j]] = "t";
						} else if (result[keys[i]][itemKey[j]] === false) {
							result[keys[i]][itemKey[j]] = "f";
						}
					}
				}
			}
		} else {
			const keyArray = Object.keys(listObject[keys[i]]);
			if (exportType) {
				if (keyArray.includes("boolLetter") && keyArray.includes("bool")) {
					if (result[keys[i]] === "t") {
						result[keys[i]] = true;
					} else if (result[keys[i]] === "f") {
						result[keys[i]] = false;
					}
				}
			} else {
				if (keyArray.includes("boolLetter") && keyArray.includes("bool")) {
					if (result[keys[i]] === true) {
						result[keys[i]] = "t";
					} else if (result[keys[i]] === false) {
						result[keys[i]] = "f";
					}
				}
			}
		}
	}
	return result;
}
window.settingsConvert = settingsConvert;

window.loadExternalExportFile = function () {
	importScripts("DolSettingsExport.js")
		.then(function () {
			const textArea = document.getElementById("settingsDataInput");
			textArea.value = JSON.stringify(DolSettingsExport);
		})
		.catch(function () {
			// console.log(err);
			const button = document.getElementById("LoadExternalExportFile");
			button.value = "Error Loading";
		});
};

/**
 * Background traits that the character creation UI (settings.twee) treats as mutually exclusive within each group (its checkboxes grey each other out via data-disabledif).
 * Independently randomizing every background boolean can otherwise select several traits from the same group at once (e.g. Nerd + Athlete, or Crossdresser + Transgender + Gender-Anxious),
 * which locks the player out of ever unchecking them since each one's checkbox is disabled by the others.
 *
 * @type {string[][]}
 */
const exclusiveBackgroundTraitGroups = [
	["nerd", "athlete", "delinquent"],
	["crossdresser", "genderAnxious", "transgender"],
];

/**
 * Collapse each mutually-exclusive background trait group down to at most one active trait, keeping a random one from those the walk happened to roll true.
 *
 * @param {object} starting the "starting" branch of a randomizeSettings() result
 */
function resolveExclusiveBackgroundTraits(starting) {
	const background = starting?.background;
	if (!background) return;

	for (const group of exclusiveBackgroundTraitGroups) {
		const active = group.filter(key => background[key] === true);
		if (active.length <= 1) continue;
		const keep = active.random();
		for (const key of active) {
			if (key !== keep) background[key] = false;
		}
	}
}

/**
 * Random talents can exceed the normal character creation limit.
 * Trim each talent group to a random valid amount so random characters keep a legal set of talents.
 *
 * @param {object} general Randomised general settings
 * @param {object} starting Randomised starting settings, including background
 */
function resolveRandomizedTalents(general, starting) {
	const traits = general?.AMCTraits;
	const groups = window.autismTalentGroups;
	if (!traits || !groups) return;

	const bonusActive = starting?.background?.autism ?? V.background?.autism ?? false;
	for (const [group, stats] of Object.entries(groups)) {
		const taken = stats.filter(stat => traits[stat] === 2);
		const limit = autismTalentLimit(group, bonusActive === true);
		while (taken.length > limit) traits[taken.pluck()] = 1;
	}
}

/**
 * gender_body is not set directly during character creation, but "randomize everything" can still randomize it separately from sex.
 * This can give it the wrong value, including "a" (herm), even when the character only has one set of genitals.
 * Keep gender_body matched to the randomized sex, or the current sex if sex was not randomized.
 *
 * @param {object} starting The "starting" branch returned by randomizeSettings().
 */
function resolveRandomizedGenderBody(starting) {
	const player = starting?.player;
	if (!player) return;
	player.gender_body = player.sex ?? V.player?.sex;
}

/**
 * Body part sizes and the min/max growth limits are separate settings, so a full random start can roll a character whose breasts,
 * bottom or penis start outside their own growth range - a size that can then never change. Clamp the starting sizes into the limits.
 *
 * @param {object} general Randomised general settings
 * @param {object} starting Randomised starting settings
 */
function resolveRandomizedBodySizes(general, starting) {
	const player = starting?.player;
	if (!player) return;

	for (const size of ["breastsize", "bottomsize", "penissize"]) {
		if (player[size] == null) continue;
		const min = general?.[size + "min"] ?? V[size + "min"];
		const max = general?.[size + "max"] ?? V[size + "max"];
		if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
		player[size] = Math.clamp(player[size], Math.min(min, max), Math.max(min, max));
	}
}

/**
 * The three NPC skin tone settings are rolled independently, so put them back in order: lightest <= most common <= darkest.
 *
 * @param {object} general Randomised general settings
 */
function resolveRandomizedSkinTones(general) {
	const settings = general?.settings;
	if (!settings) return;
	const keys = ["skinToneMin", "skinToneMode", "skinToneMax"];
	const rolled = keys.filter(key => settings[key] != null);
	if (!rolled.length) return;
	const tones = keys.map(key => settings[key] ?? V.settings[key]).sort((a, b) => a - b);
	keys.forEach((key, i) => (settings[key] = tones[i]));
}

/**
 * Randomised generic beast settings apply to every beast type, the same way the settings menu's "all beasts" controls do.
 *
 * @param {object} general Randomised general settings
 */
function resolveRandomizedBeasts(general) {
	const generic = general?.genericBeastSettings;
	if (!generic) return;
	const map = {
		beastMaleChance: "maleChance",
		beastMaleChanceMale: "maleChanceMale",
		beastMaleChanceFemale: "maleChanceFemale",
		monsterChance: "monsterChance",
		monsterHallucinationsOnly: "hallucinationsOnly",
		victimsAlwaysMonster: "victimsAlwaysMonster",
	};
	general.settings ??= {};
	general.settings.beastSettings ??= {};
	for (const type of C.beastSettingTypes) {
		const target = (general.settings.beastSettings[type] ??= {});
		for (const [from, to] of Object.entries(map)) {
			if (generic[from] != null) target[to] = generic[from];
		}
	}
}

/**
 * @param {string} filter
 * @returns {string}
 */
function randomizeSettings(filter) {
	const result = {};

	/**
	 * Recursively randomise every setting with a concrete set of valid values.
	 * A filter keeps the existing category links scoped to explicitly tagged settings;
	 * the full random game mode deliberately includes every toggle, slider and choice.
	 *
	 * @param {object} config
	 * @returns {object}
	 */
	const randomizeSettingsWalk = config => {
		const output = {};
		for (const key of Object.keys(config)) {
			const setting = config[key];
			if (setting == null) continue;
			if (isSettingLeaf(setting)) {
				if (filter && filter !== setting.randomize) continue;
				const randomValue = randomizeSettingSet(setting);
				if (randomValue !== undefined) output[key] = randomValue;
			} else {
				const group = randomizeSettingsWalk(setting);
				if (Object.keys(group).length > 0) output[key] = group;
			}
		}
		return output;
	};

	if (V.passage === "Start") {
		result.starting = randomizeSettingsWalk(settingsObjects("starting"));
		resolveExclusiveBackgroundTraits(result.starting);
		resolveRandomizedGenderBody(result.starting);
	}

	result.general = randomizeSettingsWalk(settingsObjects("general"));
	resolveRandomizedTalents(result.general, result.starting);
	resolveRandomizedBodySizes(result.general, result.starting);
	resolveRandomizedSkinTones(result.general);
	resolveRandomizedBeasts(result.general);

	return JSON.stringify(result);
}
window.randomizeSettings = randomizeSettings;

const randomNumber = function (min, max, decimals = 0) {
	const decimalsMult = Math.pow(10, decimals);
	const minMult = Math.ceil(min * decimalsMult);
	const maxMult = Math.floor(max * decimalsMult);
	const rn = (Math.floor(Math.random() * (maxMult - minMult + 1)) + minMult) / decimalsMult;
	return parseFloat(rn.toFixed(decimals));
};

const randomizeSettingSet = function (setting) {
	let result;
	const keys = Object.keys(setting);
	if (keys.includes("min")) {
		/* randomNumbers narrows a numeric setting to the discrete values the menu actually offers, without narrowing what is valid to set or import */
		result = setting.randomNumbers ? setting.randomNumbers.random() : randomNumber(setting.min, setting.max, setting.decimals);
	}
	if (keys.includes("strings")) {
		/* randomStrings narrows what a randomised game may roll without narrowing what is valid to set or import */
		result = (setting.randomStrings ?? setting.strings).pluck();
	}
	if (keys.includes("boolLetter")) {
		result = ["t", "f"].pluck();
	}
	if (keys.includes("bool")) {
		result = [true, false].pluck();
	}
	return result;
};

/**
 * instantly moves changes made in the passage into save data without changing the passage
 * WARNING: the game __will__ re-apply passage effects after reload, be sure to account for that or avoid using it
 */
function updateMoment() {
	State.history[State.activeIndex].variables = JSON.parse(JSON.stringify(V));
}
window.updateMoment = updateMoment;

window.isJsonString = function (s) {
	try {
		JSON.parse(s);
	} catch (e) {
		return false;
	}
	return true;
};

/**
 * Recursively traverses an object, reporting an error for any NaN values or null objects or functions\
 * Example: `let result = recurseNaN(a, "a");`.
 *
 * @param {object} obj The head of the object tree.
 * @param {string} path A string to indicate the path, put the object name in quotes.
 * @param {object} result An object to store the results in. - leave blank.
 * @param {Set} hist A set used for Cycle history. - leave blank.
 */

function recurseNaN(obj, path, result = null, hist = null) {
	result = Object.assign({ nulls: [], nan: [], functions: [], cycle: [] }, result);
	if (hist == null) hist = new Set([obj]);
	/* let result = {"nulls" : [], "nan" : [], "cycle" : []}; */
	for (const [key, val] of Object.entries(obj)) {
		const newPath = `${path}.${key}`;
		if (Number.isNaN(val)) {
			result.nan.push(newPath);
			continue;
		}
		if (typeof val === "function") result.functions.push(newPath);
		if (typeof val === "object") {
			if (val === null) {
				result.nulls.push(newPath);
				continue;
			}
		} else {
			continue;
		}
		if (hist.has(val)) {
			result.cycle.push(newPath);
			continue;
		}
		hist.add(val);
		recurseNaN(val, `${newPath}`, result, hist);
	}
	return result;
}
window.recurseNaN = recurseNaN;

/**
 * Recursively traverse target object, finding and returning an object containing all the NaN vars inside.
 *
 * Use with nukeNaNs to re-assign 0 to all bad NaN'd vars.	Use with caution.
 *
 * @param {object} target The object to traverse.	Defaults to V ($).
 * @returns {object} An object containing all the properties/sub-props that were NaN.
 */
function scanNaNs(target = V) {
	// If this gets set to true during function, a NaN was hit within scope.
	let isMutated = false;
	const current = Object.create({});
	// Loop through all properties of the target for NaNs and objects to scan.
	for (const [key, value] of Object.entries(target)) {
		// If value is an object, scan that property.
		if (value && typeof value === "object") {
			const resp = scanNaNs(value);
			// If scanNaNs returns a non-null object, there was a NaN somewhere, so make sure to update current obj.
			if (resp && typeof resp === "object") {
				current[key] = resp;
				isMutated = true;
			}
		} else if (typeof value === "number") {
			// Does what it says on the tin, make sure you only test numbers.
			if (isNaN(value)) {
				// Set property to a default value, likely zero.
				current[key] = 0;
				isMutated = true;
			}
		}
	}
	// Return a fully realised object, indicating there were NaNs, or null, which can be ignored.
	// isMutated controls whether we have encountered NaNs, remember to update where necessary.
	return isMutated ? current : null;
}
window.scanNaNs = scanNaNs;

function nukeNaNs(target = V) {
	for (const key in target) {
		const value = target[key];
		if (typeof value === "object" && value !== null) nukeNaNs(value);
		else if (Number.isNaN(value)) target[key] = 0;
	}
}
window.nukeNaNs = nukeNaNs;
