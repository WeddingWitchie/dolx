(function () {
	"use strict";

	const VALID_MODES = ["off", "femaleOnly", "maleOnly"];

	/* Canonical pronoun maps.
	These are written unconditionally during normalisation so a previously-male NPC
	switched to femaleOnly does not retain stale "he/him/himself" */
	const PRONOUN_MAP_M = {
		he: "he",
		his: "his",
		hers: "his",
		him: "him",
		himself: "himself",
		man: "man",
		boy: "boy",
		men: "men",
	};
	const PRONOUN_MAP_F = {
		he: "she",
		his: "her",
		hers: "hers",
		him: "her",
		himself: "herself",
		man: "woman",
		boy: "girl",
		men: "women",
	};
	function pronounMap(forced) {
		return forced === "m" ? PRONOUN_MAP_M : PRONOUN_MAP_F;
	}

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
		const s = V.settings;
		if (s.genderOverrideMode === undefined) s.genderOverrideMode = "off";
		if (s.genderOverridePendingMode === undefined) s.genderOverridePendingMode = "";
		if (s.genderOverrideRiskAccepted === undefined) s.genderOverrideRiskAccepted = false;
		if (s.genderOverrideShowWarning === undefined) s.genderOverrideShowWarning = false;
		if (s.genderOverrideShowDisableConfirm === undefined) s.genderOverrideShowDisableConfirm = false;
		if (s.genderOverrideBackup === undefined) s.genderOverrideBackup = null;
		if (s.genderOverrideDisplayBackup === undefined) s.genderOverrideDisplayBackup = null;
		/* Written by older builds, never read by anything. Drop it so it stops riding along in saves. */
		if (s.genderOverrideLastApplied !== undefined) delete s.genderOverrideLastApplied;
		return V;
	}

	function getMode() {
		return ensureState().settings.genderOverrideMode || "off";
	}

	function getForcedGender(mode = getMode()) {
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
		return !!getForcedGender(mode);
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
		const forced = getForcedGender(mode);
		if (forced === "m") return 100;
		if (forced === "f") return 0;
		return null;
	}

	/* ---------------- Settings backup / restore ---------------- */

	function backupChanceStateIfNeeded() {
		const V = ensureState();
		if (V.settings.genderOverrideBackup) return;
		V.settings.genderOverrideBackup = {
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
		const backup = V.settings.genderOverrideBackup;
		if (!backup) return;
		Object.keys(backup).forEach(key => {
			V.settings[key] = backup[key];
		});
		V.settings.genderOverrideBackup = null;
	}

	function backupNnpcDisplayStateIfNeeded() {
		const V = ensureState();
		V.options ||= {};
		if (V.settings.genderOverrideDisplayBackup) return;
		V.settings.genderOverrideDisplayBackup = {
			nnpcDisplayGender: V.options.nnpcDisplayGender,
			autoNNPCDisplay: JSON.parse(JSON.stringify(V.options.autoNNPCDisplay || {})),
		};
	}

	function applyNnpcDisplayOverride(mode) {
		const V = ensureState();
		const forced = getForcedGender(mode);
		if (!forced) return;
		V.options ||= {};
		V.options.autoNNPCDisplay ||= { enabled: false };
		backupNnpcDisplayStateIfNeeded();

		/* The sprite gender must follow the override, not whatever was saved before it was turned on.
		   Every nnpc folder ships both male and female art, so forcing it can never blank the avatar. */
		const forcedWord = forced === "m" ? "male" : "female";

		Object.keys(V.options.autoNNPCDisplay).forEach(key => {
			if (key === "enabled") return;
			const entry = V.options.autoNNPCDisplay[key];
			if (!entry || typeof entry !== "object") return;
			entry.genderOverride = true;
			entry.gender = forcedWord;
		});

		if (V.options.nnpcDisplay && V.options.nnpcDisplay !== 0) {
			const key = String(V.options.nnpcDisplay).toLowerCase();
			V.options.autoNNPCDisplay[key] ||= {};
			V.options.autoNNPCDisplay[key].genderOverride = true;
			V.options.autoNNPCDisplay[key].gender = forcedWord;
			V.options.nnpcDisplayGender = forcedWord;
		}
	}

	function restoreNnpcDisplayState() {
		const V = ensureState();
		const backup = V.settings.genderOverrideDisplayBackup;
		if (!backup) return;
		V.options ||= {};
		V.options.nnpcDisplayGender = backup.nnpcDisplayGender;
		/* Restore only the fields changed by the override, so other sprite settings stay unchanged. */
		const savedEntries = backup.autoNNPCDisplay || {};
		const live = V.options.autoNNPCDisplay || {};
		Object.keys(live).forEach(key => {
			if (key === "enabled") return;
			const entry = live[key];
			const saved = savedEntries[key];
			if (!entry || typeof entry !== "object") return;
			entry.genderOverride = saved ? !!saved.genderOverride : false;
			if (saved && saved.gender !== undefined) entry.gender = saved.gender;
		});
		V.settings.genderOverrideDisplayBackup = null;
	}

	/* ---------------- NPC / child normalisation ---------------- */

	function rewriteGenderedType(type, forced) {
		if (typeof type !== "string") return type;
		if (/(wolf|fox|cat|cow|harpy|hawk|plant|bunny|bear)(boy|girl)$/i.test(type)) {
			const suffix = forced === "m" ? "boy" : "girl";
			return type.replace(/(boy|girl)$/i, suffix);
		}
		if (type === "bull" && forced === "f") return "cow";
		if (type === "cow" && forced === "m") return "bull";
		return type;
	}

	function applyPronounMap(target, forced) {
		if (!target || typeof target !== "object") return;
		const map = pronounMap(forced);
		target.pronouns ||= {};
		/* Unconditional assignment; must overwrite stale pronouns left over from the prior gender. */
		Object.assign(target.pronouns, map);
		/* Some checks in DoL/DoLX read these top-level aliases directly. */
		target.he = map.he;
		target.him = map.him;
		target.his = map.his;
		target.man = map.man;
		target.boy = map.boy;
	}

	function normalizeTitle(npc, forced) {
		if (!npc || typeof npc !== "object") return;
		if (typeof npc.title !== "string") return;
		const isMale = forced === "m";
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

	function rebuildFullDescription(npc, forced) {
		if (!npc || typeof npc !== "object") return;
		if (typeof npc.description !== "string" || !npc.description.length) return;
		if (typeof npc.role === "string" && npc.role !== "normal" && npc.role.length) {
			npc.fullDescription = npc.description + " " + npc.role;
			return;
		}
		const sexWord = forced === "m" ? (npc.teen === 1 ? "boy" : "man") : npc.teen === 1 ? "girl" : "woman";
		npc.fullDescription = npc.type === "plant" ? npc.description + " plant" + sexWord : npc.description + " " + sexWord;
	}

	function normalizeNpcObject(npc, options = {}) {
		const forced = getForcedGender(options.mode);
		if (!forced || !npc || typeof npc !== "object") return npc;

		/* World gender override locks presentation/social gender, but leaves genital/body sliders available. */
		npc.pronoun = forced;
		npc.type = rewriteGenderedType(npc.type, forced);
		/* Beasts have no anatomy sliders, so existing beasts need their gender updated by the override.
		Human gender stays anatomy-based because pregnancy checks depend on it. */
		if (typeof npc.type === "string" && npc.type !== "human" && (npc.gender === "m" || npc.gender === "f")) {
			npc.gender = forced;
		}
		applyPronounMap(npc, forced);
		normalizeTitle(npc, forced);
		if (!isNamedNpcObject(npc)) rebuildFullDescription(npc, forced);
		return npc;
	}

	function normalizeChildObject(child, options = {}) {
		const forced = getForcedGender(options.mode);
		if (!forced || !child || typeof child !== "object") return child;
		child.gender = forced;
		// Legacy children carried "type"; records children carry "species". Rewrite whichever is present.
		if (child.type !== undefined) child.type = rewriteGenderedType(child.type, forced);
		if (child.species !== undefined) child.species = rewriteGenderedType(child.species, forced);
		if (child.pronoun !== undefined) child.pronoun = forced;
		if (child.pronouns && typeof child.pronouns === "object") {
			Object.assign(child.pronouns, pronounMap(forced));
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
		// Children live in $childRecords since the 0.5.12 pregnancy rewrite.
		if (Array.isArray(V.childRecords)) V.childRecords.forEach(child => normalizeChildObject(child, options));
	}

	/* ---------------- Settings DOM lock UI ---------------- */

	function ensureDomLockStyles() {
		if (typeof document === "undefined") return;
		if (document.getElementById("world-sex-rewrite-lock-styles")) return;
		const style = document.createElement("style");
		style.id = "world-sex-rewrite-lock-styles";
		style.textContent = `
			.genderOverrideLockedPanel {
				opacity: 0.5;
				filter: grayscale(0.2);
			}
			.genderOverrideLockedPanel .genderOverrideLockNote,
			.genderOverrideRowNote {
				display: block;
				margin-top: 0.55em;
				color: #ffbf73;
				font-size: 0.9em;
				line-height: 1.35;
			}
			.genderOverrideLockedAnchor {
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
				if ($el.data("genderOverrideOrigDisabled") === undefined) {
					$el.data("genderOverrideOrigDisabled", !!$el.prop("disabled"));
				}
				$el.prop("disabled", true);
			} else if ($el.data("genderOverrideOrigDisabled") !== undefined) {
				$el.prop("disabled", !!$el.data("genderOverrideOrigDisabled"));
				$el.removeData("genderOverrideOrigDisabled");
			}
		});
	}

	function toggleAnchorsDisabled($anchors, lock) {
		$anchors.each(function () {
			const $a = window.jQuery(this);
			if (lock) {
				if ($a.data("genderOverrideLocked") === undefined) {
					$a.data("genderOverrideLocked", true);
				}
				$a.addClass("genderOverrideLockedAnchor").attr("aria-disabled", "true");
			} else if ($a.data("genderOverrideLocked") !== undefined) {
				$a.removeClass("genderOverrideLockedAnchor").removeAttr("aria-disabled");
				$a.removeData("genderOverrideLocked");
			}
		});
	}

	function setLockNote($panel, message, noteClass = "genderOverrideLockNote") {
		if (!$panel || !$panel.length) return;
		$panel.find("." + noteClass).remove();
		if (message) {
			window
				.jQuery('<div class="' + noteClass + '"></div>')
				.text(message)
				.appendTo($panel.first());
		}
	}

	function togglePanelLock($panel, lock, message) {
		if (!$panel || !$panel.length) return;
		$panel.toggleClass("genderOverrideLockedPanel", !!lock);
		toggleInputsDisabled($panel.find("input, select, button, textarea"), !!lock);
		toggleAnchorsDisabled($panel.find("a"), !!lock);
		setLockNote($panel, lock ? message : "");
	}

	function setRowNote($row, message) {
		if (!$row || !$row.length) return;
		$row.find(".genderOverrideRowNote").remove();
		if (message) {
			window.jQuery('<div class="genderOverrideRowNote"></div>').text(message).appendTo($row.first());
		}
	}

	function findGridByHeaderText($, headerText) {
		return $(".settingsGrid")
			.filter(function () {
				return $(this).find(".settingsHeader").first().text().trim() === headerText;
			})
			.first();
	}

	function findPanelByText($root, text) {
		if (!$root || !$root.length) return $root;
		return $root
			.find(".settingsToggleItem, .settingsToggleItemWide, .solidBorderContainer, .settingsToggleIndent")
			.filter(function () {
				return window.jQuery(this).text().includes(text);
			})
			.first();
	}

	function forceCurrentSettingsDom(mode = getMode()) {
		if (typeof window.jQuery !== "function") return;
		const V = ensureState();
		const $ = window.jQuery;
		const forced = getForcedGender(mode);
		const active = !!forced;
		const forcedValue = forcedChance(mode);
		const modeText = modeLabel(mode);

		ensureDomLockStyles();

		function syncRange(selector, value) {
			$(selector).each(function () {
				const $range = $(this).find('input[type="range"]');
				if ($range.length) $range.val(value).trigger("input").trigger("change");
			});
		}

		/* Reflect the override in live settings values first. */
		if (active) {
			syncRange(
				".maleChance, .maleChanceMale, .maleChanceFemale, .malevictimchance, .beastmalechance, .beastMaleChanceMale, .beastMaleChanceFemale",
				forcedValue
			);
			$("#simpleGenders").removeClass("hidden");
			$("#splitGenders").addClass("hidden");
			$("#simpleBeastGenders").removeClass("hidden");
			$("#splitBeastGenders").addClass("hidden");
			applyNnpcDisplayOverride(mode);
		}

		/* Human settings: generic genders + victim genders locked while override is active. */
		const $npcGenderGrid = findGridByHeaderText($, "NPC Genders");
		togglePanelLock(
			$npcGenderGrid.find(".settingsToggleItem").eq(0),
			active,
			"This setting is unavailable because World Rewrite is active. Turn the override off to edit NPC gender distribution and orientation here."
		);
		togglePanelLock($npcGenderGrid.find(".settingsToggleItem").eq(1), active, "This setting is unavailable because World Rewrite is active.");

		/* Beast settings: beast gender distribution locked while override is active. */
		const $beastPrefGrid = findGridByHeaderText($, "Beast Preferences");
		togglePanelLock(
			$beastPrefGrid.find(".settingsToggleItem").eq(0),
			active,
			"This setting is unavailable because World Rewrite is active. Turn the override off to edit beast gender distribution here."
		);

		/* Named NPC settings: lock social gender, but keep genitals/body controls editable. */
		const $namedNpcGenderPanel = $("#npcSettingsMenu")
			.find(".settingsToggleItem")
			.filter(function () {
				return $(this).find("> .gold").first().text().trim() === "Gender:";
			})
			.first();
		togglePanelLock(
			$namedNpcGenderPanel,
			active,
			"This setting is unavailable because World Rewrite is active. Presentation gender is forced by the override; genitals below can still be edited."
		);
		if (active && $namedNpcGenderPanel.length) {
			$namedNpcGenderPanel.find("input[type='radio'][value='" + forced + "']").prop("checked", true);
		}
		const $randomAssignRow = $(".solidBorderContainer.settings-container").has("#npcSettingsMenu").first().children(".settingsToggleIndent").first();
		const $genderAssignLink = $randomAssignRow.find("a").filter(function () {
			return $(this).text().trim() === "Genders";
		});
		toggleAnchorsDisabled($genderAssignLink, active);
		setRowNote($randomAssignRow, active ? "Randomly assigning named NPC genders is unavailable while World Rewrite is active." : "");

		/* NPC body parts: only the opposite-gender panels are locked. */
		const $bodyGrid = findGridByHeaderText($, "NPC Body Parts");
		const $breastPanel = findPanelByText($bodyGrid, "Average size of women's breasts");
		const $penisPanel = findPanelByText($bodyGrid, "Average size of NPC penises");
		const $femaleGenitalPanel = $bodyGrid
			.children(".solidBorderContainer")
			.filter(function () {
				return $(this).text().includes("Percentage of women that have only a vagina");
			})
			.first();
		const $maleGenitalPanel = $bodyGrid
			.children(".solidBorderContainer")
			.filter(function () {
				return $(this).text().includes("Percentage of men that have only a penis");
			})
			.first();
		const $straponPanel = findPanelByText($bodyGrid, "Percentage of women that have strap-on penises");

		const lockBreast = mode === "maleOnly";
		const lockPenis = false;
		const lockFemaleGenital = mode === "maleOnly";
		const lockMaleGenital = mode === "femaleOnly";
		const lockStrapon = mode === "maleOnly";
		const lockMsgF = "This setting is unavailable because Female Only World Rewrite is active.";
		const lockMsgM = "This setting is unavailable because Male Only World Rewrite is active.";
		togglePanelLock($breastPanel, lockBreast, lockMsgM);
		togglePanelLock($penisPanel, lockPenis, "");
		togglePanelLock($femaleGenitalPanel, lockFemaleGenital, lockMsgM);
		togglePanelLock($maleGenitalPanel, lockMaleGenital, lockMsgF);
		togglePanelLock($straponPanel, lockStrapon, lockMsgM);

		/* DoLX NNPC display sidebar preview: keep preview visible and lock only sprite gender controls. */
		if (active) {
			const selectedKey = V.options && V.options.nnpcDisplay && V.options.nnpcDisplay !== 0 ? String(V.options.nnpcDisplay).toLowerCase() : null;
			if (selectedKey) {
				V.options.autoNNPCDisplay ||= { enabled: false };
				V.options.autoNNPCDisplay[selectedKey] ||= {};
				V.options.autoNNPCDisplay[selectedKey].genderOverride = true;
				const forcedWord = forcedValue === 100 ? "male" : "female";
				V.options.autoNNPCDisplay[selectedKey].gender = forcedWord;
				V.options.nnpcDisplayGender = forcedWord;
			}
			$("#autoNNPCGenderOverrideToggle input[type='checkbox']").prop("checked", true).prop("disabled", true);
			$("input[type='radio'][name$='nnpcDisplayGender']").prop("disabled", true);
			$("#autoNNPCGenderOverrideToggle .sex-rewrite-display-note, #manualNNPC .sex-rewrite-display-note").remove();
			$('<span class="small-description sex-rewrite-display-note"></span>')
				.text(" Gender locked by World Rewrite: " + modeText + ". Sidebar sprites use that gender for every NNPC. Slot, layer, and skin can still be changed.")
				.appendTo("#autoNNPCGenderOverrideToggle");
			if (
				typeof window.Wikifier !== "undefined" &&
				typeof window.Wikifier.wikifyEval === "function" &&
				$("#nnpcDisplay").length &&
				V.options?.NnpcDisplaySystem === "dolp"
			) {
				try {
					window.Wikifier.wikifyEval("<<updatesidebarimg>>");
				} catch (_) {}
			}
		} else {
			$("#autoNNPCGenderOverrideToggle input[type='checkbox']").prop("disabled", false);
			$("input[type='radio'][name$='nnpcDisplayGender']").prop("disabled", false);
			$("#autoNNPCGenderOverrideToggle .sex-rewrite-display-note, #manualNNPC .sex-rewrite-display-note").remove();
		}

		if (typeof window.settingsDisableElement === "function") {
			try {
				window.settingsDisableElement();
			} catch (_) {}
		}
	}

	/* ---------------- Public state ops ---------------- */

	function syncRewriteState() {
		const mode = getMode();
		if (getForcedGender(mode)) {
			applyChanceState(mode);
			applyNnpcDisplayOverride(mode);
			normalizeStoredCollections({ mode });
		} else {
			/* Both are no-ops once the backups are cleared; they only fire if a save is loaded with
			   the mode off but a backup still sitting there, and put the player's sliders back. */
			restoreChanceState();
			restoreNnpcDisplayState();
		}
		forceCurrentSettingsDom(mode);
	}

	function applyWorldGenderOverride(mode, options = {}) {
		const V = ensureState();
		const nextMode = VALID_MODES.includes(mode) ? mode : "off";

		const resetTransientFlags = () => {
			V.settings.genderOverridePendingMode = "";
			V.settings.genderOverrideRiskAccepted = false;
			V.settings.genderOverrideShowWarning = false;
			V.settings.genderOverrideShowDisableConfirm = false;
		};

		if (nextMode === "off") {
			V.settings.genderOverrideMode = "off";
			resetTransientFlags();
			restoreChanceState();
			restoreNnpcDisplayState();
			forceCurrentSettingsDom("off");
			return V.settings.genderOverrideMode;
		}

		backupChanceStateIfNeeded();
		backupNnpcDisplayStateIfNeeded();
		V.settings.genderOverrideMode = nextMode;
		resetTransientFlags();
		applyChanceState(nextMode);
		applyNnpcDisplayOverride(nextMode);
		normalizeStoredCollections({ mode: nextMode, force: true, source: options.source || "manual" });
		forceCurrentSettingsDom(nextMode);
		return V.settings.genderOverrideMode;
	}

	/* ---------------- Function wrappers ---------------- */

	function installChanceWrapper(fnName) {
		const wrappedFlag = "__genderOverrideWrapped_" + fnName;
		if (window[wrappedFlag]) return true;
		if (typeof window[fnName] !== "function") return false;
		const original = window[fnName];
		window["__genderOverrideOriginal_" + fnName] = original;
		window[fnName] = function () {
			if (isRewriteActive()) {
				/* Returns the chance of generating a male NPC.
				World Rewrite overrides this to 100 for Male Only or 0 for Female Only. */
				const chance = forcedChance();
				if (chance != null) return chance;
			}
			return original.apply(this, arguments);
		};
		window[wrappedFlag] = true;
		return true;
	}

	function installBirthWrapper() {
		if (window.__genderOverrideBirthWrapped) return true;
		// Vanilla 0.5.12 replaced giveBirthToChildren with the records-based birthRecordedLitter,
		// which takes a pregnancyId and reads its litter from $childRecords.
		if (typeof window.birthRecordedLitter !== "function") return false;
		const original = window.birthRecordedLitter;
		window.__genderOverrideOriginalBirthRecordedLitter = original;
		window.birthRecordedLitter = function (pregnancyId, birthLocation, location) {
			const forced = getForcedGender();
			if (forced && typeof window.getChildrenOf === "function") {
				const litter = window.getChildrenOf(pregnancyId);
				if (Array.isArray(litter)) litter.forEach(child => normalizeChildObject(child));
			}
			const result = original.apply(this, arguments);
			if (forced) normalizeStoredCollections();
			return result;
		};
		window.__genderOverrideBirthWrapped = true;
		return true;
	}

	/* Pregnancy checks use NPC gender to determine impregnation.
	World Rewrite only changes pronouns, so this temporarily sets gender from the NPC's genitals,
	then lets the original function handle the rest. */
	function resolveNamedNpcObject(NPC) {
		const V = ensureState();
		if (typeof NPC === "string") {
			if (Array.isArray(V.NPCNameList) && V.NPCNameList.includes(NPC)) {
				return V.NPCName[V.NPCNameList.indexOf(NPC)];
			}
			return null;
		}
		if (NPC && typeof NPC === "object" && !Array.isArray(NPC)) {
			if (Array.isArray(V.NPCNameList)) {
				if (typeof NPC.fullDescription === "string" && V.NPCNameList.includes(NPC.fullDescription)) {
					return V.NPCName[V.NPCNameList.indexOf(NPC.fullDescription)];
				}
				if (typeof NPC.description === "string" && V.NPCNameList.includes(NPC.description)) {
					return V.NPCName[V.NPCNameList.indexOf(NPC.description)];
				}
			}
			return NPC;
		}
		return null;
	}

	function genderForImpregnator(npc) {
		/* "m" if NPC has a working penis (no strapon); original checks `"strapon" in NPC` itself,
		   so we don't need to handle that here, just expose a male gender when there's a real penis. */
		return npc && npc.penis !== undefined && npc.penis !== "none" ? "m" : "f";
	}
	function genderForImpregnatable(npc) {
		/* "f" if NPC has a vagina, otherwise "m" (which the original will reject). */
		return npc && npc.vagina !== undefined && npc.vagina !== "none" ? "f" : "m";
	}

	function withTempGender(NPC, tempGender, fn) {
		const target = resolveNamedNpcObject(NPC);
		if (!target) return fn();
		const had = Object.hasOwn(target, "gender");
		const saved = target.gender;
		target.gender = tempGender;
		try {
			return fn();
		} finally {
			if (had) target.gender = saved;
			else delete target.gender;
		}
	}

	function installPregnancyCompatibilityWrappers() {
		if (window.__genderOverridePregCompatWrapped) return true;
		if (typeof window.playerPregnancyPossibleWith !== "function" || typeof window.NPCPregnancyPossibleWithPlayer !== "function") return false;

		const origPlayerPreg = window.playerPregnancyPossibleWith;
		const origNpcPreg = window.NPCPregnancyPossibleWithPlayer;
		window.__genderOverrideOriginalPlayerPregnancyPossibleWith = origPlayerPreg;
		window.__genderOverrideOriginalNPCPregnancyPossibleWithPlayer = origNpcPreg;

		window.playerPregnancyPossibleWith = function (NPC) {
			if (!isRewriteActive()) return origPlayerPreg.apply(this, arguments);
			const target = resolveNamedNpcObject(NPC);
			return withTempGender(NPC, genderForImpregnator(target), () => origPlayerPreg.call(this, NPC));
		};

		window.NPCPregnancyPossibleWithPlayer = function (NPC) {
			if (!isRewriteActive()) return origNpcPreg.apply(this, arguments);
			const target = resolveNamedNpcObject(NPC);
			return withTempGender(NPC, genderForImpregnatable(target), () => origNpcPreg.call(this, NPC));
		};

		window.__genderOverridePregCompatWrapped = true;
		return true;
	}

	function installWrappers() {
		const okA = installChanceWrapper("maleChance");
		const okB = installChanceWrapper("beastMaleChance");
		const okC = installBirthWrapper();
		const okD = installPregnancyCompatibilityWrappers();
		return okA && okB && okC && okD;
	}

	/* ---------------- Hooks & bootstrap ---------------- */

	function installSettingsRefreshHooks() {
		if (window.__genderOverrideSettingsRefreshHooksInstalled) return;
		if (typeof window.jQuery !== "function") return;
		const $ = window.jQuery;
		const selector = [
			"#settingsDiv a",
			"#settingsDiv button",
			"#settingsDiv input",
			"#settingsDiv select",
			"#subsectionDiv a",
			"#subsectionDiv button",
			"#subsectionDiv input",
			"#subsectionDiv select",
			"#npcSettingsMenu a",
			"#npcSettingsMenu button",
			"#npcSettingsMenu input",
			"#npcSettingsMenu select",
			"#nnpcDisplay a",
			"#nnpcDisplay button",
			"#nnpcDisplay input",
			"#nnpcDisplay select",
			"#worldGenderOverrideSettingsBody a",
			"#worldGenderOverrideSettingsBody button",
			"#worldGenderOverrideSettingsBody input",
		].join(", ");
		let queued = false;
		function queueSync() {
			if (queued) return;
			queued = true;
			setTimeout(() => {
				queued = false;
				try {
					syncRewriteState();
				} catch (_) {}
			}, 0);
		}
		$(document).on("click change input", selector, queueSync);
		window.__genderOverrideSettingsRefreshHooksInstalled = true;
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
			/* Settings panels finish rendering after this event, so re-apply the DOM locks once more.
			   Only the DOM pass repeats: re-running the full NPC sweep here would be wasted work. */
			setTimeout(() => forceCurrentSettingsDom(), 0);
		});
	}

	window.ensureWorldGenderOverrideState = ensureState;
	window.applyWorldGenderOverride = applyWorldGenderOverride;
	window.syncWorldGenderOverrideState = syncRewriteState;
	window.worldGenderOverrideModeLabel = modeLabel;
	window.worldGenderOverrideForcedGender = getForcedGender;
	window.worldGenderOverrideNormalizeAll = normalizeStoredCollections;
	window.worldGenderOverrideNormalizeNpc = normalizeNpcObject;
	window.worldGenderOverrideNormalizeChild = normalizeChildObject;
	window.worldGenderOverrideForceSettingsDom = forceCurrentSettingsDom;
	window.worldGenderOverrideActive = isRewriteActive;

	ensureState();
	installSettingsRefreshHooks();
	scheduleWrapperInstall();
})();
