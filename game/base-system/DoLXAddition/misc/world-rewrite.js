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
	const PRONOUN_MAP_T = {
		he: "they",
		his: "their",
		hers: "theirs",
		him: "them",
		himself: "themselves",
		man: "person",
		boy: "person",
		men: "people",
	};
	function pronounMap(forced) {
		if (forced === "t") return PRONOUN_MAP_T;
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

	/* Fixed story characters do not always have an NPC record. Each call supplies the
	   original wording and its opposite explicitly, including ambiguous her/his forms.
	   An optional third argument preserves mixed-group wording when the override is off.
	   This only renders opted-in text; it never rewrites passage source or player text. */
	Macro.add(["worldFemale", "worldMale"], {
		handler() {
			const opposite = this.name === "worldFemale" ? "m" : "f";
			const forced = getForcedGender();
			const text = !forced && this.args.length > 2 ? this.args[2] : this.args[forced === opposite ? 1 : 0];
			this.output.append(document.createTextNode(text));
		},
	});

	/* Crowd wording for places whose occupants vary at runtime, such as the school
	   changing rooms and toilets. The room keeps its own name; only the people in it
	   follow the override. Pass the room's own word and get back who is actually inside. */
	const CROWD_M = { boys: "boys", girls: "boys", men: "men", women: "men" };
	const CROWD_F = { boys: "girls", girls: "girls", men: "women", women: "women" };
	function occupants(roomWord) {
		const forced = getForcedGender();
		if (!forced || typeof roomWord !== "string") return roomWord;
		const key = roomWord.toLowerCase();
		const mapped = (forced === "m" ? CROWD_M : CROWD_F)[key];
		return mapped === undefined ? roomWord : mapped;
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
			beastMaleChance: V.genericBeastSettings.beastMaleChance,
			beastMaleChanceSplit: V.genericBeastSettings.beastMaleChanceSplit,
			beastMaleChanceMale: V.genericBeastSettings.beastMaleChanceMale,
			beastMaleChanceFemale: V.genericBeastSettings.beastMaleChanceFemale,
			beastSettings: Object.fromEntries(
				C.beastSettingTypes.map(type => [
					type,
					{
						maleChance: V.settings.beastSettings[type].maleChance,
						maleChanceSplit: V.settings.beastSettings[type].maleChanceSplit,
						maleChanceMale: V.settings.beastSettings[type].maleChanceMale,
						maleChanceFemale: V.settings.beastSettings[type].maleChanceFemale,
					},
				])
			),
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

		V.genericBeastSettings.beastMaleChance = chance;
		V.genericBeastSettings.beastMaleChanceSplit = false;
		V.genericBeastSettings.beastMaleChanceMale = chance;
		V.genericBeastSettings.beastMaleChanceFemale = chance;
		setAllBeastsMaleChance(chance);
		setAllBeastsMaleChanceSplit(false);
		setAllBeastsMaleChanceMale(chance);
		setAllBeastsMaleChanceFemale(chance);
	}

	function restoreChanceState() {
		const V = ensureState();
		const backup = V.settings.genderOverrideBackup;
		if (!backup) return;
		Object.keys(backup).forEach(key => {
			if (key.startsWith("beastMaleChance")) V.genericBeastSettings[key] = backup[key];
			else if (key === "beastSettings") {
				for (const type of C.beastSettingTypes) Object.assign(V.settings.beastSettings[type], backup.beastSettings[type]);
			} else V.settings[key] = backup[key];
		});
		if (!backup.beastSettings) {
			setAllBeastsMaleChance(backup.beastMaleChance);
			setAllBeastsMaleChanceSplit(backup.beastMaleChanceSplit);
			setAllBeastsMaleChanceMale(backup.beastMaleChanceMale);
			setAllBeastsMaleChanceFemale(backup.beastMaleChanceFemale);
		}
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
		if (/(wolf|fox|cat|cow|bull|harpy|hawk|plant|bunny|bear)(boy|girl)$/i.test(type)) {
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
		/* Older overrides added unused copies outside the canonical pronouns object. */
		for (const key of ["he", "him", "his", "man", "boy"]) delete target[key];
	}

	function rewriteGenderedTitle(title, forced) {
		if (typeof title !== "string") return title;
		const isMale = forced === "m";
		switch (title.toLowerCase()) {
			case "man":
			case "woman":
				return isMale ? "man" : "woman";
			case "boy":
			case "girl":
				return isMale ? "boy" : "girl";
			case "priest":
			case "priestess":
				return isMale ? "priest" : "priestess";
			case "headmaster":
			case "headmistress":
				return isMale ? "headmaster" : "headmistress";
			case "hunter":
			case "huntress":
				return isMale ? "hunter" : "huntress";
			case "businessman":
			case "businesswoman":
				return isMale ? "businessman" : "businesswoman";
		}
		return title;
	}

	function rebuildFullDescription(npc, forced) {
		if (!npc || typeof npc !== "object") return;
		if (typeof npc.description !== "string" || !npc.description.length) return;
		/* Only rebuild generated descriptions. Scenes also store custom names here. */
		if (typeof npc.fullDescription !== "string" || !npc.fullDescription.startsWith(npc.description)) return;
		const suffix = npc.fullDescription.slice(npc.description.length);
		if (!/^ (?:plant)?(?:man|woman|boy|girl)$/.test(suffix)) {
			/* A role is also a gameplay identifier: only change its displayed wording. */
			if (/^ (?:priest|priestess|headmaster|headmistress|hunter|huntress|businessman|businesswoman)$/.test(suffix)) {
				npc.fullDescription = npc.description + " " + rewriteGenderedTitle(suffix.trim(), forced);
			}
			return;
		}
		const sexWord = forced === "m" ? (npc.teen === 1 ? "boy" : "man") : npc.teen === 1 ? "girl" : "woman";
		npc.fullDescription = npc.type === "plant" ? npc.description + " plant" + sexWord : npc.description + " " + sexWord;
	}

	function normalizeNpcObject(npc, options = {}) {
		const forced = getForcedGender(options.mode);
		if (!forced || !npc || typeof npc !== "object") return npc;
		if (!npc.pronoun) return npc;
		/* Preserve neutral characters, and repair Mickey records rewritten by older overrides.
		   Luchifen's narration also consistently uses they/them. Never revive cleared slots. */
		if (npc.pronoun === "t" || npc.role === "hacker" || npc.per === "hacker" || npc.nam === "Luchifen" || npc.fullDescription === "Luchifen") {
			npc.pronoun = "t";
			applyPronounMap(npc, "t");
			return npc;
		}
		if (npc.pronoun !== "m" && npc.pronoun !== "f") return npc;

		/* World gender override locks presentation/social gender, but leaves genital/body sliders available. */
		npc.pronoun = forced;
		npc.type = rewriteGenderedType(npc.type, forced);
		if (
			typeof npc.type === "string" &&
			npc.type !== "human" &&
			!npc.nam &&
			!getV().NPCNameList?.includes(npc.fullDescription) &&
			(npc.gender === "m" || npc.gender === "f")
		) {
			npc.gender = forced;
		}
		applyPronounMap(npc, forced);
		if (typeof npc.title === "string") npc.title = rewriteGenderedTitle(npc.title, forced);
		if (npc.per === "pinch" || /^(?:Mr|Ms) Pinch$/.test(npc.fullDescription)) {
			npc.fullDescription = (forced === "m" ? "Mr" : "Ms") + " Pinch";
			npc.name = npc.fullDescription;
		}
		rebuildFullDescription(npc, forced);
		return npc;
	}

	function normalizeChildObject(child, options = {}) {
		const forced = getForcedGender(options.mode);
		if (!forced || !child || typeof child !== "object") return child;
		if (child.pronoun === "t") return child;
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
		if (V.pillory?.tenant?.person) normalizeNpcObject(V.pillory.tenant.person, options);
		if (V.per_npc && typeof V.per_npc === "object") Object.values(V.per_npc).forEach(npc => normalizeNpcObject(npc, options));
		if (V.storedNPCs && typeof V.storedNPCs === "object") {
			Object.values(V.storedNPCs).forEach(entry => {
				if (entry && typeof entry === "object" && entry.npc) normalizeNpcObject(entry.npc, options);
			});
		}
		if (Array.isArray(V.NPCName)) V.NPCName.forEach(npc => normalizeNpcObject(npc, options));
		else if (C?.npc && typeof C.npc === "object") Object.values(C.npc).forEach(npc => normalizeNpcObject(npc, options));
		if (V.children && typeof V.children === "object") Object.values(V.children).forEach(child => normalizeChildObject(child, options));
		// Children live in $childRecords since the 0.5.12 pregnancy rewrite.
		if (Array.isArray(V.childRecords)) V.childRecords.forEach(child => normalizeChildObject(child, options));
		if (V.orphanHawkPreview) normalizeChildObject(V.orphanHawkPreview, options);
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

	/* The DOM-lock pass only has anything to act on while a settings panel is rendered. */
	function settingsDomPresent() {
		if (typeof document === "undefined") return false;
		return !!document.querySelector("#settingsDiv, #subsectionDiv, #npcSettingsMenu, #nnpcDisplay, #worldGenderOverrideSettingsBody");
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
		const okB = installChanceWrapper("beastMaleChanceForType");
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
		function queueSync(event) {
			/* Ignore the input/change notifications emitted while reflecting locked sliders. */
			if (event.isTrigger) return;
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
			if (done || tries >= maxTries) {
				clearInterval(timer);
				syncRewriteState();
			}
		}, 250);
	}

	if (typeof document !== "undefined" && typeof window.jQuery === "function") {
		jQuery(document).on(":storyready", function () {
			ensureState();
			installSettingsRefreshHooks();
			installWrappers();
			syncRewriteState();
		});
		jQuery(document).on(":passageinit", function () {
			const V = ensureState();
			const mode = getMode();
			const pendingRestore = !!(V.settings.genderOverrideBackup || V.settings.genderOverrideDisplayBackup);
			if (!isRewriteActive(mode) && !pendingRestore) return;
			syncRewriteState();
		});
		jQuery(document).on(":passagedisplay", function () {
			if (isRewriteActive() && settingsDomPresent()) forceCurrentSettingsDom();
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
	window.worldOccupants = occupants;

	ensureState();
	installSettingsRefreshHooks();
	scheduleWrapperInstall();
})();
