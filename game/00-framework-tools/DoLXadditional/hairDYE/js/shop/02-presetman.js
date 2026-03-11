const SAVED = "saved";
const TMP = "tmp";

/**
** ROUTING
**
{{{ */
/**
 * @param {string} selectedPreset
 * @param {string} id
 */
function pmanOnChange(selectedPreset, id) {
	switch (id) {
		case SAVED:
			this.pmanAutoload(selectedPreset);
			break;
		case TMP:
			this.pmanTmpAutoload(selectedPreset);
			break;
	}
}
dhmShop.pmanOnChange = pmanOnChange;

/**
 * @param {string} preset
 * @param {string} id
 */
function pmanBtnDelete(preset, id) {
	switch (id) {
		case SAVED:
			dhmShop.pmanDelete(preset);
			break;
		case TMP:
			dhmShop.pmanTmpDelete(preset);
			break;
	}
	dhmShop.pmanRefresh(id);
}
dhmShop.pmanBtnDelete = pmanBtnDelete;

/**
 * @param {string} preset
 * @param {string} id
 */
function pmanBtnRename(preset, id) {
	switch (id) {
		case SAVED:
			dhmShop.pmanRename(preset);
			break;
		case TMP:
			dhmShop.pmanTmpRename(preset);
			break;
	}
}
dhmShop.pmanBtnRename = pmanBtnRename;
//}}}

/**
** UNIVERSAL
**
{{{*/

/**
 * @param {string} id
 */
function pmanHook(id = SAVED) {
	$(`#listbox--presetselected${id}`).on("change", function (e) {
		if (!!T[`presetSelected${id}`] && T[`presetSelected${id}`].length > 0) {
			dhmShop.pmanOnChange(T[`presetSelected${id}`], id);
		}
	});
}
dhmShop.pmanHook = pmanHook;

/**
 * @param {string} id
 * @param {Canvasfilter} newFilter
 */
function pmanSync(id = SAVED, newFilter) {
	switch (id) {
		case SAVED:
			setup.colours.hair_map.tmp0.canvasfilter.blend = newFilter.blend;
			setup.colours.hair_map.tmp0.canvasfilter.brightness =
				newFilter.brightness;
			break;
		case TMP:
			setup.colours.hair_map.tmp1.canvasfilter.blend = newFilter.blend;
			setup.colours.hair_map.tmp1.canvasfilter.brightness =
				newFilter.brightness;
			break;
	}
	let similar = dhmUtils.colorCompareHsl(newFilter.blend);

	$(`#presetman-hex${id}`).text("").append(newFilter.blend);
	$(`#presetman-brightness${id}`).text("").append(newFilter.brightness);
	Wikifier.wikifyEval(`<<dhmReplaceSimilar ${id} ${similar}>>`);

	Wikifier.wikifyEval(`<<dhmCfgDollUpdate ${id}>>`);
}
dhmShop.pmanSync = pmanSync;

/**
 * @param {string} id
 */
function pmanRefresh(id) {
	switch (id) {
		case SAVED:
			Wikifier.wikifyEval(
				`<<replace "#presetman-saved">><<dhmPresetManager>><</replace>>`,
			);
			if (Object.keys(dhmod.userPresets).length > 0) {
				dhmShop.pmanOnChange(T[`presetSelected${id}`], id);
			}
			break;
		case TMP:
			if (
				!!T.dhmLoaded?.passed &&
				Object.keys(T.dhmLoaded.passed).length > 0
			) {
				Wikifier.wikifyEval(
					`<<replace "#presetman-loader">><<dhmPresetLoaded>><</replace>>`,
				);
				dhmShop.pmanOnChange(T[`presetSelected${id}`], id);
			} else {
				Wikifier.wikifyEval(
					`<<replace "#presetman-loader">><<dhmPresetLoader>><</replace>>`,
				);
			}
			break;
	}

	dhmShop.pmanHook(id);

	if (
		!!T.dhmLoaded?.passed &&
		Object.keys(T.dhmLoaded.passed).length > 0 &&
		Object.keys(dhmod.userPresets).length > 0
	) {
		dhmShop.pmanCheckDupes();
	}
}
dhmShop.pmanRefresh = pmanRefresh;
//}}}

/**
*** IMPORT PREVIEWER
***
{{{*/
function pmanCheckDupes() {
	if (dhmUtils.presetDupeHunt()) {
		$(`#dupe-report`).html(
			"<span class='red'>Name conflicts with saved presets found</span>",
		);
		$(`#on-duplicate`).show();
	} else {
		$(`#dupe-report`).html(
			"<span class='green'>No name conflicts found</span>",
		);
		$(`#on-duplicate`).hide();
	}
}
dhmShop.pmanCheckDupes = pmanCheckDupes;

/**
 * @param {string} selectedPreset
 */
function pmanTmpAutoload(selectedPreset) {
	let newFilter = dhmUtils.presetLoadTmp(selectedPreset);
	dhmShop.pmanSync(TMP, newFilter);
}
dhmShop.pmanTmpAutoload = pmanTmpAutoload;

/**
 * @param {string} presetName
 */
function pmanTmpRename(presetName) {
	const presetValue = T.dhmLoaded.passed[presetName];
	const newName = prompt("Rename preset", presetName);

	if (!!newName) {
		if (T.dhmLoaded.passed[newName]) {
			alert(
				`'${newName}' was not saved because another preset with the same name already exists.`,
			);
			return true;
		}

		dhmUtils.presetAddTmp(newName, presetValue);
		dhmShop.pmanTmpDelete(presetName);
	}
}
dhmShop.pmanTmpRename = pmanTmpRename;

/**
 * @param {string} selectedPreset
 */
function pmanTmpDelete(selectedPreset) {
	dhmUtils.presetDeleteTmp(selectedPreset);
	dhmShop.pmanRefresh(TMP);
}
dhmShop.pmanTmpDelete = pmanTmpDelete;
//}}}

/**
 *** SAVED PRESETS
 ***
 **{{{*/
function pmanBtnPurge() {
	let firstWarning = confirm(
		"Are you sure you want to delete all presets? This is not reversible.",
	);
	if (firstWarning) {
		let secondWarning = confirm(
			"Are you REALLY, REALLY SURE you want to delete ALL presets?",
		);

		if (secondWarning) {
			dhmUtils.presetPurge();
			dhmShop.pmanRefresh(SAVED);
		}
	}
}
dhmShop.pmanBtnPurge = pmanBtnPurge;

/**
 * @param {string} preset
 */
function pmanDelete(preset) {
	dhmUtils.presetDelete(preset);
	dhmShop.pmanRefresh(SAVED);
}
dhmShop.pmanDelete = pmanDelete;

/**
 * @param {string} preset
 */
function pmanRename(preset) {
	const presetValue = dhmod.userPresets[preset];
	const presetName = prompt("Rename preset", preset);

	if (!!presetName) {
		if (V.dhmod.userPresets[presetName]) {
			alert(
				`'${presetName}' was not saved because another preset with the same name already exists.`,
			);
			return true;
		}

		dhmUtils.presetAdd(presetName, presetValue);
		dhmUtils.presetDelete(preset);
		this.pmanRefresh(SAVED);
	}
}
dhmShop.pmanRename = pmanRename;

/**
 * @param {string} selectedPreset
 */
function pmanAutoload(selectedPreset) {
	let newFilter = dhmUtils.presetLoad(selectedPreset);
	dhmShop.pmanSync(SAVED, newFilter);
}
dhmShop.pmanAutoload = pmanAutoload;
//}}}

/**
*** EXPORT - IMPORT
***
{{{*/
function presetExport() {
	if (Object.keys(dhmod.userPresets).length > 1) {
		const serialized = JSON.stringify(dhmod.userPresets);
		const blob = new Blob([serialized], {
			type: "text/plain;charset=utf-8",
		});
		saveAs(blob, "hairPresets.txt");
	} else {
		alert("Nothing to export T_T");
	}
}
dhmShop.presetExport = presetExport;

/**
 * @param {File} presetsFile
 */
function presetImport(presetsFile) {
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
		T.dhmLoaded = dhmUtils.presetReadFile(serialized);

		if (Object.keys(T.dhmLoaded.passed).length > 0) {
			if (
				Object.keys(T.dhmLoaded.skip).length > 0 ||
				T.dhmLoaded.errors > 0
			) {
				alert(
					`Imported: ${Object.keys(T.dhmLoaded.passed).length}\nSkipped (duplicated color data): ${Object.keys(T.dhmLoaded.skip).length}\nErrors: ${T.dhmLoaded.errors}`,
				);
			}
			dhmShop.onFileLoaded();
		} else {
			alert(
				`Nothing to import! (${Object.keys(T.dhmLoaded.skip).length} skipped, ${T.dhmLoaded.errors} errors)`,
			);
		}
	};

	reader.readAsText(presetsFile[0]);
}
dhmShop.presetImport = presetImport;

function onFileLoaded() {
	if (Object.keys(T.dhmLoaded).length > 0) {
		let loadedFirst = dhmUtils.presetLoadTmp(
			Object.keys(T.dhmLoaded.passed)[0],
		);
		setup.colours.hair_map.tmp1.canvasfilter.blend = loadedFirst.blend;
		setup.colours.hair_map.tmp1.canvasfilter.brightness =
			loadedFirst.brightness;

		dhmShop.pmanRefresh(TMP);
	}
}
dhmShop.onFileLoaded = onFileLoaded;

function onImportConfirm() {
	let res = dhmUtils.presetBulkImport();
	let text =
		dhmod.cfg.overwrite && res.overwritten > 0
			? `(${res.overwritten} overwritten)`
			: res.skipped > 0
				? `(${res.skipped} skipped)`
				: "";
	alert(`${res.imported} imported ${text}`);

	delete T.dhmLoaded;
	dhmShop.pmanRefresh(TMP);
	dhmShop.pmanRefresh(SAVED);
}
dhmShop.onImportConfirm = onImportConfirm;
// }}}
