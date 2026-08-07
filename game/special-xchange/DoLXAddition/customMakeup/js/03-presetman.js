const _CCMSAVED = "saved";
const _CCMTMP = "tmp";

/**
 *ROUTING
 *
{{{
 */
/**
 * @param {string} selectedPreset
 * @param {string} id
 */
ccmShop.pmanOnChange = function (selectedPreset, id) {
	switch (id) {
		case _CCMSAVED:
			this.pmanAutoload(selectedPreset);
			break;
		case _CCMTMP:
			this.pmanTmpAutoload(selectedPreset);
			break;
	}
};

/**
 * @param {string} preset
 * @param {string} id
 */
ccmShop.pmanBtnDelete = function (preset, id) {
	switch (id) {
		case _CCMSAVED:
			ccmShop.pmanDelete(preset);
			break;
		case _CCMTMP:
			ccmShop.pmanTmpDelete(preset);
			break;
	}
	ccmShop.pmanRefresh(id);
};

/**
 * @param {string} preset
 * @param {string} id
 */
ccmShop.pmanBtnRename = function (preset, id) {
	switch (id) {
		case _CCMSAVED:
			ccmShop.pmanRename(preset);
			break;
		case _CCMTMP:
			ccmShop.pmanTmpRename(preset);
			break;
	}
};
// }}}

/**
 *UNIVERSAL
 *
{{{
 */
/**
 * @param {string} id
 */
ccmShop.pmanHook = function (id = _CCMSAVED) {
	$(`#listbox--ccmpresetselected${id}`).on("change", function (e) {
		if (!!T[`ccmPresetSelected${id}`] && T[`ccmPresetSelected${id}`].length > 0) {
			ccmShop.pmanOnChange(T[`ccmPresetSelected${id}`], id);
		}
	});
	$(`#listbox--presetmode${id}`).on("change", function (e) {
		if (!!T[`presetMode${id}`] && setup.ccmod.categories.includes(T[`presetMode${id}`])) {
			ccmShop.pmanOnChange(T[`ccmPresetSelected${id}`], id);
		}
	});
};

/**
 * @param {string} id
 * @param {Canvasfilter} newFilter
 */
ccmShop.pmanSync = function (id = _CCMSAVED, newFilter) {
	switch (id) {
		case _CCMSAVED:
			setup.colours[`${T.presetModesaved}_map`].tmp.canvasfilter.blend = newFilter.blend;
			setup.colours[`${T.presetModesaved}_map`].tmp.canvasfilter.brightness = newFilter.brightness;
			break;
		case _CCMTMP:
			setup.colours[`${T.presetModetmp}_map`].tmp1.canvasfilter.blend = newFilter.blend;
			setup.colours[`${T.presetModetmp}_map`].tmp1.canvasfilter.brightness = newFilter.brightness;
			break;
	}
	$(`#ccm-presetman-hex${id}`).text("").append(newFilter.blend);
	$(`#ccm-presetman-brightness${id}`).text("").append(newFilter.brightness);

	Wikifier.wikifyEval(`<<ccmodManagerMannequinUpdate ${id}>>`);
};

/**
 * @param {string} id
 */
ccmShop.pmanRefresh = function (id) {
	switch (id) {
		case _CCMSAVED:
			Wikifier.wikifyEval(`<<replace "#ccm-presetman-saved">><<ccmodPresetManager>><</replace>>`);
			if (Object.keys(ccmod.userPresets).length > 0) {
				ccmShop.pmanOnChange(T[`ccmPresetSelected${id}`], id);
			}
			break;
		case _CCMTMP:
			if (!!T.ccmLoaded?.passed && Object.keys(T.ccmLoaded.passed).length > 0) {
				Wikifier.wikifyEval(`<<replace "#ccm-presetman-loader">><<ccmodPresetLoaded>><</replace>>`);
				ccmShop.pmanOnChange(T[`ccmPresetSelected${id}`], id);
			} else {
				Wikifier.wikifyEval(`<<replace "#ccm-presetman-loader">><<ccmodPresetLoader>><</replace>>`);
			}
			break;
	}

	ccmShop.pmanHook(id);

	if (!!T.ccmLoaded?.passed && Object.keys(T.ccmLoaded.passed).length > 0 && Object.keys(ccmod.userPresets).length > 0) {
		ccmShop.pmanCheckDupes();
	}
};
// }}}

/**
 *** IMPORT PREVIEWER
 ***
{{{
 */
ccmShop.pmanCheckDupes = function () {
	if (ccmUtils.presetDupeHunt()) {
		$(`#dupe-report`).html("<span class='red'>Name conflicts with saved presets found</span>");
		$(`#on-duplicate`).show();
	} else {
		$(`#dupe-report`).html("<span class='green'>No name conflicts found</span>");
		$(`#on-duplicate`).hide();
	}
};

/**
 * @param {string} selectedPreset
 */
ccmShop.pmanTmpAutoload = function (selectedPreset) {
	const newFilter = ccmUtils.presetLoadTmp(selectedPreset);
	ccmShop.pmanSync(_CCMTMP, newFilter);
};

/**
 * @param {string} presetName
 */
ccmShop.pmanTmpRename = function (presetName) {
	const presetValue = T.ccmLoaded.passed[presetName];
	const newName = prompt("Rename preset", presetName);

	if (newName) {
		if (T.ccmLoaded.passed[newName]) {
			alert(`'${newName}' was not saved because another preset with the same name already exists.`);
			return true;
		}

		ccmUtils.presetAddTmp(newName, presetValue);
		ccmShop.pmanTmpDelete(presetName);
	}
};

/**
 * @param {string} selectedPreset
 */
ccmShop.pmanTmpDelete = function (selectedPreset) {
	ccmUtils.presetDeleteTmp(selectedPreset);
	ccmShop.pmanRefresh(_CCMTMP);
};
// }}}

/**
 *** SAVED PRESETS
 ***
 *{{{
 */
ccmShop.pmanBtnPurge = function () {
	const firstWarning = confirm("Are you sure you want to delete all presets? This is not reversible.");
	if (firstWarning) {
		const secondWarning = confirm("Are you REALLY, REALLY SURE you want to delete ALL presets?");

		if (secondWarning) {
			ccmUtils.presetPurge();
			ccmShop.pmanRefresh(_CCMSAVED);
		}
	}
};

/**
 * @param {string} preset
 */
ccmShop.pmanDelete = function (preset) {
	ccmUtils.presetDelete(preset);
	ccmShop.pmanRefresh(_CCMSAVED);
};

/**
 * @param {string} preset
 */
ccmShop.pmanRename = function (preset) {
	const presetValue = ccmod.userPresets[preset];
	const presetName = prompt("Rename preset", preset);

	if (presetName) {
		if (V.ccmod.userPresets[presetName]) {
			alert(`'${presetName}' was not saved because another preset with the same name already exists.`);
			return true;
		}

		ccmUtils.presetAdd(presetName, presetValue);
		ccmUtils.presetDelete(preset);
		this.pmanRefresh(_CCMSAVED);
	}
};

/**
 * @param {string} selectedPreset
 */
ccmShop.pmanAutoload = function (selectedPreset) {
	const newFilter = ccmUtils.presetLoad(selectedPreset);
	ccmShop.pmanSync(_CCMSAVED, newFilter);
};
// }}}

/**
 *** EXPORT - IMPORT
 ***
{{{
 */
ccmShop.presetExport = function () {
	if (Object.keys(ccmod.userPresets).length > 1) {
		const serialized = JSON.stringify(ccmod.userPresets);
		const blob = new Blob([serialized], {
			type: "text/plain;charset=utf-8",
		});
		saveAs(blob, "makeupPresets.txt");
	} else {
		alert("Nothing to export T_T");
	}
};

/**
 * @param {File} presetsFile
 */
ccmShop.presetImport = function (presetsFile) {
	if (!window.FileReader) {
		alert("Browser not compatible with FileReader T_T");
		return; // Browser is not compatible
	}

	const reader = new FileReader();

	reader.onloadend = function () {
		let serialized;
		try {
			serialized = JSON.parse(this.result);
		} catch (e) {
			alert(`Unable to parse file. T_T\n\nDebug: ${e}`);
			return;
		}
		T.ccmLoaded = ccmUtils.presetReadFile(serialized);

		if (Object.keys(T.ccmLoaded.passed).length > 0) {
			if (Object.keys(T.ccmLoaded.skip).length > 0 || T.ccmLoaded.errors > 0) {
				alert(
					`Imported: ${Object.keys(T.ccmLoaded.passed).length}\nSkipped (duplicated color data): ${Object.keys(T.ccmLoaded.skip).length}\nErrors: ${
						T.ccmLoaded.errors
					}`
				);
			}
			ccmShop.onFileLoaded();
		} else {
			alert(`Nothing to import! (${Object.keys(T.ccmLoaded.skip).length} skipped, ${T.ccmLoaded.errors} errors)`);
		}
	};

	reader.readAsText(presetsFile[0]);
};

ccmShop.onFileLoaded = function () {
	if (Object.keys(T.ccmLoaded).length > 0) {
		const loadedFirst = ccmUtils.presetLoadTmp(Object.keys(T.ccmLoaded.passed)[0]);
		setup.colours[`${T.presetModetmp}_map`].tmp1.canvasfilter.blend = loadedFirst.blend;
		setup.colours[`${T.presetModetmp}_map`].tmp1.canvasfilter.brightness = loadedFirst.brightness;

		ccmShop.pmanRefresh(_CCMTMP);
	}
};

ccmShop.onImportConfirm = function () {
	const res = ccmUtils.presetBulkImport();
	const text = ccmod.cfg.overwrite && res.overwritten > 0 ? `(${res.overwritten} overwritten)` : res.skipped > 0 ? `(${res.skipped} skipped)` : "";
	alert(`${res.imported} imported ${text}`);

	delete T.ccmLoaded;
	ccmShop.pmanRefresh(_CCMTMP);
	ccmShop.pmanRefresh(_CCMSAVED);
};
// }}}
