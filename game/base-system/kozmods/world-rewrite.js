(function () {
	"use strict";

	function getV() {
		if (typeof State !== "undefined" && State.variables) return State.variables;
		if (typeof window !== "undefined") {
			window.V ||= {};
			return window.V;
		}
		return {};
	}

	function getC() {
		if (typeof C !== "undefined") return C;
		if (typeof window !== "undefined") return window.C;
		return undefined;
	}

	function ensureState() {
		const V = getV();
		V.settings ||= {};
		if (V.settings.sexRewriteMode === undefined) V.settings.sexRewriteMode = "off";
		if (V.settings.sexRewritePendingMode === undefined) V.settings.sexRewritePendingMode = "";
		if (V.settings.sexRewriteRiskAccepted === undefined) V.settings.sexRewriteRiskAccepted = false;
		if (V.settings.sexRewriteShowWarning === undefined) V.settings.sexRewriteShowWarning = false;
		if (V.settings.sexRewriteShowDisableConfirm === undefined) V.settings.sexRewriteShowDisableConfirm = false;
		if (V.settings.sexRewriteBackup === undefined) V.settings.sexRewriteBackup = null;
		if (V.settings.sexRewriteDisplayBackup === undefined) V.settings.sexRewriteDisplayBackup = null;
		if (V.settings.sexRewriteLastApplied === undefined) V.settings.sexRewriteLastApplied = null;
		return V;
	}

	function getMode() {
		return ensureState().settings.sexRewriteMode || "off";
	}

	function getForcedSex(mode = getMode()) {
		switch (mode) {
			case "femaleOnly":
				return "f";
			case "maleOnly":
				return "m";
			default:
				return null;
		}
	}

	function isRewriteActive(mode = getMode()) {
		return !!getForcedSex(mode);
	}

	function modeLabel(mode = getMode()) {
		switch (mode) {
			case "femaleOnly":
				return "Female Only";
			case "maleOnly":
				return "Male Only";
			default:
				return "Mixed (Off)";
		}
	}

	function forcedChance(mode = getMode()) {
		const forced = getForcedSex(mode);
		if (forced === "m") return 100;
		if (forced === "f") return 0;
		return null;
	}

	function backupChanceStateIfNeeded() {
		const V = ensureState();
		if (V.settings.sexRewriteBackup) return;
		V.settings.sexRewriteBackup = {
			maleChance: V.settings.maleChance,
			maleChanceSplit: V.settings.maleChanceSplit,
			maleChanceMale: V.settings.maleChanceMale,
			maleChanceFemale: V.settings.maleChanceFemale,
			maleVictimChance: V.settings.maleVictimChance,
			beastMaleChance: V.settings.beastMaleChance,
			beastMaleChanceSplit: V.settings.beastMaleChanceSplit,
			beastMaleChanceMale: V.settings.beastMaleChanceMale,
			beastMaleChanceFemale: V.settings.beastMaleChanceFemale,
		};
	}

	function applyChanceState(mode) {
		const V = ensureState();
		const chance = forcedChance(mode);
		if (chance == null) return;

		V.settings.maleChance = chance;
		V.settings.maleChanceSplit = false;
		V.settings.maleChanceMale = chance;
		V.settings.maleChanceFemale = chance;
		V.settings.maleVictimChance = chance;

		V.settings.beastMaleChance = chance;
		V.settings.beastMaleChanceSplit = false;
		V.settings.beastMaleChanceMale = chance;
		V.settings.beastMaleChanceFemale = chance;
	}

	function restoreChanceState() {
		const V = ensureState();
		const backup = V.settings.sexRewriteBackup;
		if (!backup) return;
		Object.keys(backup).forEach(key => {
			V.settings[key] = backup[key];
		});
		V.settings.sexRewriteBackup = null;
	}

	function backupNnpcDisplayStateIfNeeded() {
		const V = ensureState();
		V.options ||= {};
		if (V.settings.sexRewriteDisplayBackup) return;
		V.settings.sexRewriteDisplayBackup = {
			nnpcDisplayGender: V.options.nnpcDisplayGender,
			autoNNPCDisplay: JSON.parse(JSON.stringify(V.options.autoNNPCDisplay || {})),
		};
	}

	function applyNnpcDisplayOverride(mode) {
		const V = ensureState();
		const forced = getForcedSex(mode);
		if (!forced) return;
		V.options ||= {};
		V.options.autoNNPCDisplay ||= { enabled: false };
		backupNnpcDisplayStateIfNeeded();

		Object.keys(V.options.autoNNPCDisplay).forEach(key => {
			if (key === "enabled") return;
			const entry = V.options.autoNNPCDisplay[key];
			if (!entry || typeof entry !== "object") return;
			entry.genderOverride = true;
			if (!entry.gender) entry.gender = getSafeDolpPreviewGender(key);
		});

		if (V.options.nnpcDisplay && V.options.nnpcDisplay !== 0) {
			const key = String(V.options.nnpcDisplay).toLowerCase();
			V.options.autoNNPCDisplay[key] ||= {};
			V.options.autoNNPCDisplay[key].genderOverride = true;
			if (!V.options.autoNNPCDisplay[key].gender) {
				V.options.autoNNPCDisplay[key].gender = getSafeDolpPreviewGender(key);
			}
			V.options.nnpcDisplayGender = getSafeDolpPreviewGender(key);
		}
	}

	function restoreNnpcDisplayState() {
		const V = ensureState();
		const backup = V.settings.sexRewriteDisplayBackup;
		if (!backup) return;
		V.options ||= {};
		V.options.nnpcDisplayGender = backup.nnpcDisplayGender;
		V.options.autoNNPCDisplay = JSON.parse(JSON.stringify(backup.autoNNPCDisplay || {}));
		V.settings.sexRewriteDisplayBackup = null;
	}

	function rewriteSexedType(type, forced) {
		if (typeof type !== "string") return type;
		if (/(wolf|fox|cat|cow|harpy|hawk|plant|bunny|bear)(boy|girl)$/i.test(type)) {
			return type.replace(/boy$/i, forced === "m" ? "boy" : "girl").replace(/girl$/i, forced === "m" ? "boy" : "girl");
		}
		if (type === "bull" && forced === "f") return "cow";
		if (type === "cow" && forced === "m") return "bull";
		return type;
	}

	function normalizePronouns(npc) {
		if (!npc || typeof npc !== "object") return;
		if (typeof window.generatePronouns === "function") {
			try {
				window.generatePronouns(npc);
			} catch (_) {}
		}
		npc.pronouns ||= {};
		const isMale = npc.pronoun === "m";
		npc.pronouns.he = npc.pronouns.he || (isMale ? "he" : "she");
		npc.pronouns.him = npc.pronouns.him || (isMale ? "him" : "her");
		npc.pronouns.his = npc.pronouns.his || (isMale ? "his" : "her");
		npc.pronouns.man = npc.pronouns.man || (isMale ? "man" : "woman");
		npc.pronouns.boy = npc.pronouns.boy || (isMale ? "boy" : "girl");

		/* Some checks in DoL/DoLP use these top-level aliases directly. */
		npc.he = npc.pronouns.he;
		npc.him = npc.pronouns.him;
		npc.his = npc.pronouns.his;
		npc.man = npc.pronouns.man;
		npc.boy = npc.pronouns.boy;
	}

	function normalizeTitle(npc) {
		if (!npc || typeof npc !== "object") return;
		if (typeof npc.title !== "string") return;
		const isMale = npc.pronoun === "m";
		switch (npc.title.toLowerCase()) {
			case "man":
			case "woman":
				npc.title = isMale ? "man" : "woman";
				break;
			case "boy":
			case "girl":
				npc.title = isMale ? "boy" : "girl";
				break;
		}
	}


	function isNamedNpcObject(npc) {
		if (!npc || typeof npc !== "object") return false;
		const C = getC();
		if (C?.npc && typeof C.npc === "object") {
			for (const [name, namedNpc] of Object.entries(C.npc)) {
				if (namedNpc === npc) return true;
				if (typeof npc.description === "string" && npc.description === name) return true;
				if (typeof npc.fullDescription === "string" && npc.fullDescription === name) return true;
			}
		}
		const V = getV();
		if (Array.isArray(V.NPCName) && V.NPCName.includes(npc)) return true;
		if (Array.isArray(V.NPCNameList)) {
			if (typeof npc.description === "string" && V.NPCNameList.includes(npc.description)) return true;
			if (typeof npc.fullDescription === "string" && V.NPCNameList.includes(npc.fullDescription)) return true;
		}
		return false;
	}

	function getDisplayBackupGenderForKey(key) {
		const V = ensureState();
		const backup = V.settings.sexRewriteDisplayBackup;
		if (!backup || !backup.autoNNPCDisplay || !key || key === "0") return null;
		return backup.autoNNPCDisplay[key]?.gender || null;
	}

	function getSafeDolpPreviewGender(key) {
		const V = ensureState();
		if (!key || key === "0") return V.options?.nnpcDisplayGender || "male";
		const backupGender = getDisplayBackupGenderForKey(key);
		if (backupGender) return backupGender;
		const currentGender = V.options?.autoNNPCDisplay?.[key]?.gender;
		if (currentGender) return currentGender;
		return V.options?.nnpcDisplayGender || "male";
	}

	function rebuildFullDescription(npc, forced) {
		if (!npc || typeof npc !== "object") return;
		if (typeof npc.description !== "string" || !npc.description.length) return;
		if (typeof npc.role === "string" && npc.role !== "normal" && npc.role.length) {
			npc.fullDescription = npc.description + " " + npc.role;
			return;
		}
		const sexWord = forced === "m"
			? (npc.teen === 1 ? "boy" : "man")
			: (npc.teen === 1 ? "girl" : "woman");
		if (npc.type === "plant") {
			npc.fullDescription = npc.description + " plant" + sexWord;
		} else {
			npc.fullDescription = npc.description + " " + sexWord;
		}
	}

	function normalizeNpcObject(npc, options = {}) {
		const forced = getForcedSex(options.mode);
		if (!forced || !npc || typeof npc !== "object") return npc;

		/* World rewrite locks presentation/social sex, but leaves genital/body sliders available. */
		npc.pronoun = forced;
		npc.type = rewriteSexedType(npc.type, forced);
		normalizePronouns(npc);
		normalizeTitle(npc);
		if (!isNamedNpcObject(npc)) rebuildFullDescription(npc, forced);
		return npc;
	}

	function normalizeChildObject(child, options = {}) {
		const forced = getForcedSex(options.mode);
		if (!forced || !child || typeof child !== "object") return child;
		child.gender = forced;
		child.type = rewriteSexedType(child.type, forced);
		if (child.pronoun !== undefined) child.pronoun = forced;
		if (child.pronouns && typeof child.pronouns === "object") {
			child.pronouns.he = forced === "m" ? "he" : "she";
			child.pronouns.him = forced === "m" ? "him" : "her";
			child.pronouns.his = forced === "m" ? "his" : "her";
			child.pronouns.man = forced === "m" ? "man" : "woman";
			child.pronouns.boy = forced === "m" ? "boy" : "girl";
		}
		return child;
	}

	function normalizeStoredCollections(options = {}) {
		const V = ensureState();
		const C = getC();

		if (Array.isArray(V.NPCList)) V.NPCList.forEach(npc => normalizeNpcObject(npc, options));
		if (V.per_npc && typeof V.per_npc === "object") Object.values(V.per_npc).forEach(npc => normalizeNpcObject(npc, options));
		if (V.storedNPCs && typeof V.storedNPCs === "object") {
			Object.values(V.storedNPCs).forEach(entry => {
				if (entry && typeof entry === "object" && entry.npc) normalizeNpcObject(entry.npc, options);
			});
		}
		if (Array.isArray(V.NPCName)) V.NPCName.forEach(npc => normalizeNpcObject(npc, options));
		if (C?.npc && typeof C.npc === "object") Object.values(C.npc).forEach(npc => normalizeNpcObject(npc, options));
		if (V.children && typeof V.children === "object") Object.values(V.children).forEach(child => normalizeChildObject(child, options));
	}

	function ensureDomLockStyles() {
		if (typeof document === "undefined") return;
		if (document.getElementById("world-sex-rewrite-lock-styles")) return;
		const style = document.createElement("style");
		style.id = "world-sex-rewrite-lock-styles";
		style.textContent = `
			.sexRewriteLockedPanel {
				opacity: 0.5;
				filter: grayscale(0.2);
			}
			.sexRewriteLockedPanel .sexRewriteLockNote,
			.sexRewriteRowNote {
				display: block;
				margin-top: 0.55em;
				color: #ffbf73;
				font-size: 0.9em;
				line-height: 1.35;
			}
			.sexRewriteLockedAnchor {
				pointer-events: none !important;
				opacity: 0.55 !important;
				text-decoration: none !important;
				cursor: not-allowed !important;
			}
		`;
		document.head.appendChild(style);
	}

	function toggleInputsDisabled($elements, lock) {
		$elements.each(function () {
			const $el = window.jQuery(this);
			if (lock) {
				if ($el.data("sexRewriteOrigDisabled") === undefined) {
					$el.data("sexRewriteOrigDisabled", !!$el.prop("disabled"));
				}
				$el.prop("disabled", true);
			} else if ($el.data("sexRewriteOrigDisabled") !== undefined) {
				$el.prop("disabled", !!$el.data("sexRewriteOrigDisabled"));
				$el.removeData("sexRewriteOrigDisabled");
			}
		});
	}

	function toggleAnchorsDisabled($anchors, lock) {
		$anchors.each(function () {
			const $a = window.jQuery(this);
			if (lock) {
				if ($a.data("sexRewriteLocked") === undefined) {
					$a.data("sexRewriteLocked", true);
				}
				$a.addClass("sexRewriteLockedAnchor").attr("aria-disabled", "true");
			} else if ($a.data("sexRewriteLocked") !== undefined) {
				$a.removeClass("sexRewriteLockedAnchor").removeAttr("aria-disabled");
				$a.removeData("sexRewriteLocked");
			}
		});
	}

	function setLockNote($panel, message, noteClass = "sexRewriteLockNote") {
		if (!$panel || !$panel.length) return;
		$panel.find("." + noteClass).remove();
		if (message) {
			window.jQuery('<div class="' + noteClass + '"></div>').text(message).appendTo($panel.first());
		}
	}

	function togglePanelLock($panel, lock, message) {
		if (!$panel || !$panel.length) return;
		$panel.toggleClass("sexRewriteLockedPanel", !!lock);
		toggleInputsDisabled($panel.find("input, select, button, textarea"), !!lock);
		toggleAnchorsDisabled($panel.find("a"), !!lock);
		setLockNote($panel, lock ? message : "");
	}

	function setRowNote($row, message) {
		if (!$row || !$row.length) return;
		$row.find(".sexRewriteRowNote").remove();
		if (message) {
			window.jQuery('<div class="sexRewriteRowNote"></div>').text(message).appendTo($row.first());
		}
	}

	function findGridByHeaderText($, headerText) {
		return $(".settingsGrid").filter(function () {
			const text = $(this).find(".settingsHeader").first().text().trim();
			return text === headerText;
		}).first();
	}

	function findPanelByText($root, text) {
		if (!$root || !$root.length) return $root;
		return $root.find(".settingsToggleItem, .settingsToggleItemWide, .solidBorderContainer, .settingsToggleIndent").filter(function () {
			return window.jQuery(this).text().includes(text);
		}).first();
	}

	function forceCurrentSettingsDom(mode = getMode()) {
		if (typeof window.jQuery !== "function") return;
		const V = ensureState();
		const $ = window.jQuery;
		const forced = getForcedSex(mode);
		const active = !!forced;
		const forcedValue = forcedChance(mode);
		const modeText = modeLabel(mode);
		ensureDomLockStyles();

		function syncRange(selector, value) {
			$(selector).each(function () {
				const $wrap = $(this);
				const $range = $wrap.find('input[type="range"]');
				if ($range.length) {
					$range.val(value).trigger("input").trigger("change");
				}
			});
		}

		/* Reflect the override in live settings values first. */
		if (active) {
			syncRange(".maleChance, .maleChanceMale, .maleChanceFemale, .malevictimchance, .beastmalechance, .beastMaleChanceMale, .beastMaleChanceFemale", forcedValue);
			$("#simpleGenders").removeClass("hidden");
			$("#splitGenders").addClass("hidden");
			$("#simpleBeastGenders").removeClass("hidden");
			$("#splitBeastGenders").addClass("hidden");
			applyNnpcDisplayOverride(mode);
		}

		/* Human settings: generic genders + victim genders locked while override is active. */
		const $npcGenderGrid = findGridByHeaderText($, "NPC Genders");
		const $genericNpcPanel = $npcGenderGrid.find(".settingsToggleItem").eq(0);
		const $victimPanel = $npcGenderGrid.find(".settingsToggleItem").eq(1);
		togglePanelLock($genericNpcPanel, active, "This setting is unavailable because World Rewrite is active. Turn the override off to edit NPC gender distribution and orientation here.");
		togglePanelLock($victimPanel, active, "This setting is unavailable because World Rewrite is active.");

		/* Beast settings: beast gender distribution locked while override is active. */
		const $beastPrefGrid = findGridByHeaderText($, "Beast Preferences");
		const $beastGenderPanel = $beastPrefGrid.find(".settingsToggleItem").eq(0);
		togglePanelLock($beastGenderPanel, active, "This setting is unavailable because World Rewrite is active. Turn the override off to edit beast gender distribution here.");

		/* Named NPC settings: lock social gender, but keep genitals/body controls editable. */
		const $npcSettingsRoot = $("#npcSettingsMenu");
		const $namedNpcGenderPanel = $npcSettingsRoot.find(".settingsToggleItem").filter(function () {
			return $(this).find("> .gold").first().text().trim() === "Gender:";
		}).first();
		togglePanelLock($namedNpcGenderPanel, active, "This setting is unavailable because World Rewrite is active. Presentation gender is forced by the override; genitals below can still be edited.");
		if (active && $namedNpcGenderPanel.length) {
			$namedNpcGenderPanel.find("input[type='radio'][value='" + forced + "']").prop("checked", true);
		}
		const $npcRootContainer = $(".solidBorderContainer.settings-container").has("#npcSettingsMenu").first();
		const $randomAssignRow = $npcRootContainer.children(".settingsToggleIndent").first();
		const $genderAssignLink = $randomAssignRow.find("a").filter(function () {
			return $(this).text().trim() === "Genders";
		});
		toggleAnchorsDisabled($genderAssignLink, active);
		setRowNote($randomAssignRow, active ? "Randomly assigning named NPC genders is unavailable while World Rewrite is active." : "");

		/* NPC body parts: only the opposite-gender panels are locked. */
		const $bodyGrid = findGridByHeaderText($, "NPC Body Parts");
		const $breastPanel = findPanelByText($bodyGrid, "Average size of women's breasts");
		const $penisPanel = findPanelByText($bodyGrid, "Average size of NPC penises");
		const $femaleGenitalPanel = $bodyGrid.children(".solidBorderContainer").filter(function () {
			return $(this).text().includes("Percentage of women that have only a vagina");
		}).first();
		const $maleGenitalPanel = $bodyGrid.children(".solidBorderContainer").filter(function () {
			return $(this).text().includes("Percentage of men that have only a penis");
		}).first();
		const $straponPanel = findPanelByText($bodyGrid, "Percentage of women that have strap-on penises");

		if (mode === "femaleOnly") {
			togglePanelLock($breastPanel, false, "");
			togglePanelLock($penisPanel, false, "");
			togglePanelLock($femaleGenitalPanel, false, "");
			togglePanelLock($maleGenitalPanel, true, "This setting is unavailable because Female Only World Rewrite is active.");
			togglePanelLock($straponPanel, false, "");
		} else if (mode === "maleOnly") {
			togglePanelLock($breastPanel, true, "This setting is unavailable because Male Only World Rewrite is active.");
			togglePanelLock($penisPanel, false, "");
			togglePanelLock($femaleGenitalPanel, true, "This setting is unavailable because Male Only World Rewrite is active.");
			togglePanelLock($maleGenitalPanel, false, "");
			togglePanelLock($straponPanel, true, "This setting is unavailable because Male Only World Rewrite is active.");
		} else {
			togglePanelLock($breastPanel, false, "");
			togglePanelLock($penisPanel, false, "");
			togglePanelLock($femaleGenitalPanel, false, "");
			togglePanelLock($maleGenitalPanel, false, "");
			togglePanelLock($straponPanel, false, "");
		}

		/* DoLP NNPC display sidebar preview: keep preview visible and lock only sprite gender controls. */
		if (active) {
			const selectedKey = V.options && V.options.nnpcDisplay && V.options.nnpcDisplay !== 0
				? String(V.options.nnpcDisplay).toLowerCase()
				: null;
			if (selectedKey) {
				V.options.autoNNPCDisplay ||= { enabled: false };
				V.options.autoNNPCDisplay[selectedKey] ||= {};
				V.options.autoNNPCDisplay[selectedKey].genderOverride = true;
				V.options.autoNNPCDisplay[selectedKey].gender = getSafeDolpPreviewGender(selectedKey);
				V.options.nnpcDisplayGender = getSafeDolpPreviewGender(selectedKey);
			}
			$("#autoNNPCGenderOverrideToggle input[type='checkbox']").prop("checked", true).prop("disabled", true);
			$("input[type='radio'][name$='nnpcDisplayGender']").prop("disabled", true);
			$("#autoNNPCGenderOverrideToggle .sex-rewrite-display-note, #manualNNPC .sex-rewrite-display-note").remove();
			$('<span class="small-description sex-rewrite-display-note"></span>').text(" Gender locked by World Rewrite: " + modeText + ". DoLP preview keeps the saved sprite gender when needed so the avatar does not disappear. Slot, layer, and skin can still be changed.").appendTo("#autoNNPCGenderOverrideToggle");
			if (typeof window.Wikifier !== "undefined" && typeof window.Wikifier.wikifyEval === "function" && $("#nnpcDisplay").length && V.options?.NnpcDisplaySystem === "dolp") {
				try { window.Wikifier.wikifyEval("<<updatesidebarimg>>"); } catch (_) {}
			}
		} else {
			$("#autoNNPCGenderOverrideToggle input[type='checkbox']").prop("disabled", false);
			$("input[type='radio'][name$='nnpcDisplayGender']").prop("disabled", false);
			$("#autoNNPCGenderOverrideToggle .sex-rewrite-display-note, #manualNNPC .sex-rewrite-display-note").remove();
		}

		if (typeof window.settingsDisableElement === "function") {
			try { window.settingsDisableElement(); } catch (_) {}
		}
	}

	function syncRewriteState() {
		const mode = getMode();
		if (getForcedSex(mode)) {
			applyChanceState(mode);
			applyNnpcDisplayOverride(mode);
			normalizeStoredCollections({ mode });
		} else {
			restoreNnpcDisplayState();
		}
		forceCurrentSettingsDom(mode);
	}

	function applyWorldSexRewrite(mode, options = {}) {
		const V = ensureState();
		const nextMode = ["off", "femaleOnly", "maleOnly"].includes(mode) ? mode : "off";
		const previousMode = V.settings.sexRewriteMode || "off";

		if (nextMode === "off") {
			V.settings.sexRewriteMode = "off";
			V.settings.sexRewritePendingMode = "";
			V.settings.sexRewriteRiskAccepted = false;
			V.settings.sexRewriteShowWarning = false;
			V.settings.sexRewriteShowDisableConfirm = false;
			restoreChanceState();
			restoreNnpcDisplayState();
			V.settings.sexRewriteLastApplied = { from: previousMode, to: "off", stamp: Date.now() };
			forceCurrentSettingsDom("off");
			return V.settings.sexRewriteMode;
		}

		backupChanceStateIfNeeded();
		backupNnpcDisplayStateIfNeeded();
		V.settings.sexRewriteMode = nextMode;
		V.settings.sexRewritePendingMode = "";
		V.settings.sexRewriteRiskAccepted = false;
		V.settings.sexRewriteShowWarning = false;
		V.settings.sexRewriteShowDisableConfirm = false;
		applyChanceState(nextMode);
		normalizeStoredCollections({ mode: nextMode, force: true, source: options.source || "manual" });
		V.settings.sexRewriteLastApplied = { from: previousMode, to: nextMode, stamp: Date.now() };
		forceCurrentSettingsDom(nextMode);
		return V.settings.sexRewriteMode;
	}

	function installChanceWrapper(fnName) {
		const wrappedFlag = "__sexRewriteWrapped_" + fnName;
		if (window[wrappedFlag]) return true;
		if (typeof window[fnName] !== "function") return false;
		const original = window[fnName];
		window["__sexRewriteOriginal_" + fnName] = original;
		window[fnName] = function () {
			const chance = forcedChance();
			if (chance != null) return chance;
			return original.apply(this, arguments);
		};
		window[wrappedFlag] = true;
		return true;
	}

	function installBirthWrapper() {
		if (window.__sexRewriteBirthWrapped) return true;
		if (typeof window.giveBirthToChildren !== "function") return false;
		const original = window.giveBirthToChildren;
		window.__sexRewriteOriginalGiveBirthToChildren = original;
		window.giveBirthToChildren = function (mother, birthLocation, location, pregnancyOverride) {
			const forced = getForcedSex();
			if (forced) {
				let pregnancy = pregnancyOverride;
				if (!pregnancy) {
					if (mother === "pc" && typeof window.getPregnancyObject === "function") {
						pregnancy = window.getPregnancyObject();
					} else if (getC()?.npc?.[mother]) {
						pregnancy = getC().npc[mother].pregnancy;
					}
				}
				if (Array.isArray(pregnancy)) pregnancy = pregnancy[0];
				if (pregnancy?.fetus?.length) pregnancy.fetus.forEach(child => normalizeChildObject(child));
			}
			const result = original.apply(this, arguments);
			if (forced) normalizeStoredCollections();
			return result;
		};
		window.__sexRewriteBirthWrapped = true;
		return true;
	}


	function resolvePregnancyNpc(NPC) {
		const V = ensureState();
		let NPCObject = null;
		let NPCNameCheck = null;
		if (typeof NPC === "string") {
			NPCNameCheck = NPC;
			if (Array.isArray(V.NPCNameList) && V.NPCNameList.includes(NPC)) {
				NPCObject = V.NPCName[V.NPCNameList.indexOf(NPC)];
			}
		} else if (NPC && typeof NPC === "object" && !Array.isArray(NPC)) {
			if (Array.isArray(V.NPCNameList) && typeof NPC.fullDescription === "string" && V.NPCNameList.includes(NPC.fullDescription)) {
				NPCNameCheck = NPC.fullDescription;
				NPCObject = V.NPCName[V.NPCNameList.indexOf(NPC.fullDescription)];
			} else if (Array.isArray(V.NPCNameList) && typeof NPC.description === "string" && V.NPCNameList.includes(NPC.description)) {
				NPCNameCheck = NPC.description;
				NPCObject = V.NPCName[V.NPCNameList.indexOf(NPC.description)];
			} else {
				NPCObject = NPC;
				NPCNameCheck = NPC.description || NPC.fullDescription || null;
			}
		}
		return { NPCObject, NPCNameCheck };
	}

	function npcCanImpregnateByGenitals(npc) {
		if (!npc || typeof npc !== "object") return false;
		return npc.penis !== undefined && npc.penis !== "none" && !("strapon" in npc);
	}

	function npcCanBeImpregnatedByGenitals(npc) {
		if (!npc || typeof npc !== "object") return false;
		return npc.vagina !== undefined && npc.vagina !== "none";
	}

	function installPregnancyCompatibilityWrappers() {
		if (window.__sexRewritePregCompatWrapped) return true;
		if (typeof window.playerPregnancyPossibleWith !== "function" || typeof window.NPCPregnancyPossibleWithPlayer !== "function") return false;

		const originalPlayerPregnancyPossibleWith = window.playerPregnancyPossibleWith;
		const originalNPCPregnancyPossibleWithPlayer = window.NPCPregnancyPossibleWithPlayer;
		window.__sexRewriteOriginalPlayerPregnancyPossibleWith = originalPlayerPregnancyPossibleWith;
		window.__sexRewriteOriginalNPCPregnancyPossibleWithPlayer = originalNPCPregnancyPossibleWithPlayer;

		window.playerPregnancyPossibleWith = function (NPC) {
			if (!isRewriteActive()) return originalPlayerPregnancyPossibleWith.apply(this, arguments);
			const V = ensureState();
			const T = (typeof window !== "undefined") ? (window.T ||= {}) : {};
			T.pregFalseReason = "";
			const { NPCObject, NPCNameCheck } = resolvePregnancyNpc(NPC);
			if (!NPCObject) {
				T.pregFalseReason = "invalidNpc";
				return false;
			}
			if (NPCNameCheck && setup.pregnancy.infertile.includes(NPCNameCheck)) {
				T.pregFalseReason = "infertile";
				return false;
			}
			if (NPCNameCheck && V.settings.incompletePregnancyEnabled === false && getC()?.npc?.[NPCNameCheck] && !setup.pregnancy.canImpregnatePlayer.includes(NPCNameCheck)) {
				T.pregFalseReason = "infertile";
				return false;
			}
			if (typeof window.getPregnancyObject === "function" && window.getPregnancyObject().fetus.length) {
				T.pregFalseReason = "playerPregnant";
				return false;
			}
			switch (NPCObject.type) {
				case "human":
					if (V.settings.playerPregnancyHumanEnabled === false) {
						T.pregFalseReason = "pregnantDisabled";
						return false;
					}
					break;
				case "wolf":
				case "wolfboy":
				case "wolfgirl":
				case "hawk":
				case "harpy":
					if (V.settings.playerPregnancyBeastEnabled === false || (V.settings.playerPregnancyEggLayingEnabled === false && ["hawk", "harpy"].includes(NPCObject.type))) {
						T.pregFalseReason = "pregnantDisabled";
						return false;
					}
					break;
				default:
					T.pregFalseReason = "pregnantTypeUnsupported";
					return false;
			}
			if (!((V.player.vaginaExist || canBeMPregnant()) && npcCanImpregnateByGenitals(NPCObject))) {
				T.pregFalseReason = "genitals";
				return false;
			}
			return true;
		};

		window.NPCPregnancyPossibleWithPlayer = function (NPC) {
			if (!isRewriteActive()) return originalNPCPregnancyPossibleWithPlayer.apply(this, arguments);
			const V = ensureState();
			const T = (typeof window !== "undefined") ? (window.T ||= {}) : {};
			T.pregFalseReason = "";
			const { NPCObject, NPCNameCheck } = resolvePregnancyNpc(NPC);
			if (!NPCObject) {
				T.pregFalseReason = "invalidNpc";
				return false;
			}
			if (NPCNameCheck && getC()?.npc?.[NPCNameCheck]) {
				const cNpc = getC().npc[NPCNameCheck];
				if (setup.pregnancy.infertile.includes(NPCNameCheck) || !NPCObject.pregnancy?.enabled) {
					T.pregFalseReason = "infertile";
					return false;
				}
				if (NPCObject.pregnancy?.fetus?.length) {
					T.pregFalseReason = "npcPregnant";
					return false;
				}
			} else if (NPCObject.pregnancy) {
				T.pregFalseReason = "npcPregnant";
				return false;
			}
			if (V.settings.npcPregnancyEnabled === false) {
				T.pregFalseReason = "pregnantDisabled";
				return false;
			}
			if (!setup.pregnancy.typesEnabled.includes(NPCObject.type)) {
				T.pregFalseReason = "pregnantTypeUnsupported";
				return false;
			}
			if (!V.player.penisExist || !npcCanBeImpregnatedByGenitals(NPCObject)) {
				T.pregFalseReason = "genitals";
				return false;
			}
			return true;
		};

		if (typeof window.pregnancyCompatible === "function") {
			window.pregnancyCompatible = function (NPC) {
				if (window.playerPregnancyPossibleWith(NPC) === false && window.NPCPregnancyPossibleWithPlayer(NPC) === false) return false;
				return true;
			};
		}

		window.__sexRewritePregCompatWrapped = true;
		return true;
	}


	function installWrappers() {
		const okA = installChanceWrapper("maleChance");
		const okB = installChanceWrapper("beastMaleChance");
		const okC = installBirthWrapper();
		const okD = installPregnancyCompatibilityWrappers();
		return okA && okB && okC && okD;
	}


	function installSettingsRefreshHooks() {
		if (window.__sexRewriteSettingsRefreshHooksInstalled) return;
		if (typeof window.jQuery !== "function") return;
		const $ = window.jQuery;
		const selector = [
			"#settingsDiv a", "#settingsDiv button", "#settingsDiv input", "#settingsDiv select",
			"#subsectionDiv a", "#subsectionDiv button", "#subsectionDiv input", "#subsectionDiv select",
			"#npcSettingsMenu a", "#npcSettingsMenu button", "#npcSettingsMenu input", "#npcSettingsMenu select",
			"#nnpcDisplay a", "#nnpcDisplay button", "#nnpcDisplay input", "#nnpcDisplay select",
			"#worldSexRewriteSettingsBody a", "#worldSexRewriteSettingsBody button", "#worldSexRewriteSettingsBody input"
		].join(", ");
		let queued = false;
		function queueSync() {
			if (queued) return;
			queued = true;
			setTimeout(() => {
				queued = false;
				try { syncRewriteState(); } catch (_) {}
			}, 0);
		}
		$(document).on("click change input", selector, queueSync);
		window.__sexRewriteSettingsRefreshHooksInstalled = true;
	}

	function scheduleWrapperInstall() {
		let tries = 0;
		const maxTries = 120;
		const timer = setInterval(() => {
			tries += 1;
			const done = installWrappers();
			syncRewriteState();
			if (done || tries >= maxTries) clearInterval(timer);
		}, 250);
	}

	if (typeof document !== "undefined" && typeof window.jQuery === "function") {
		jQuery(document).on(":storyready", function () {
			ensureState();
			installSettingsRefreshHooks();
			installWrappers();
			syncRewriteState();
		});
		jQuery(document).on(":passagedisplay", function () {
			ensureState();
			installSettingsRefreshHooks();
			syncRewriteState();
			setTimeout(syncRewriteState, 0);
		});
	} else {
		installSettingsRefreshHooks();
		scheduleWrapperInstall();
	}

	window.ensureWorldSexRewriteState = ensureState;
	window.applyWorldSexRewrite = applyWorldSexRewrite;
	window.syncWorldSexRewriteState = syncRewriteState;
	window.worldSexRewriteModeLabel = modeLabel;
	window.worldSexRewriteForcedSex = getForcedSex;
	window.worldSexRewriteNormalizeAll = normalizeStoredCollections;
	window.worldSexRewriteNormalizeNpc = normalizeNpcObject;
	window.worldSexRewriteNormalizeChild = normalizeChildObject;
	window.worldSexRewriteForceSettingsDom = forceCurrentSettingsDom;
	window.worldSexRewriteActive = isRewriteActive;

	ensureState();
	installSettingsRefreshHooks();
	scheduleWrapperInstall();
})();
