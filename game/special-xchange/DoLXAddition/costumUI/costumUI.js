(function () {
	"use strict";

	let scheduled = false;
	let observer = null;
	let observedScope = null;
	const overlayTabIcons = Object.freeze({
		Characteristics: "\u2726",
		Identity: "\u25C7",
		Social: "\u2637",
		Traits: "\u25C6",
		Journal: "\u25A4",
		Notes: "\u270E",
		Statistics: "\u25A5",
		"Extra stats (spoilers)": "\u2295",
		Feats: "\u2605",
		Stats: "\u25A5",
		Visual: "\u25C9",
		NPCs: "\u265F",
		"Alex's Farm": "\u2302",
		Teleport: "\u21C4",
		Other: "\u22EF",
		General: "\u2699\uFE0E",
		Theme: "\u25C8",
		Performance: "\u21AF",
		Advanced: "\u2692\uFE0E",
		Information: "\u24D8",
		Saves: "\u25A3",
		"Export/Import": "\u21C4",
		"Event Info": "\u25C7",
		"Blackjack Guide": "\u24D8",
		Layers: "\u25A4",
		Colours: "\u25C9",
		Model: "\u25C8",
		"Start/Stop Animation": "\u25B6",
		"Refresh Caches": "\u21BB",
		"Outfit Editor": "\u270E",
		Bag: "\u25A3",
		"Hand Mirror": "\u25C9",
		Music: "\u266B",
	});

	function styleOverlayTabs() {
		const overlay = document.getElementById("customOverlay");
		if (!overlay || ["DoLXCredits", "mirrorMood"].includes(overlay.dataset.overlay)) return;

		overlay.querySelectorAll("#overlayTabs button").forEach(button => {
			const label = button.textContent.trim().replace(/\s+/g, " ");
			const icon = overlayTabIcons[label];
			if (icon) button.dataset.tabIcon = icon;
			else delete button.dataset.tabIcon;
		});
	}

	window.customUiStyleOverlayTabs = styleOverlayTabs;

	/* The only UI we care about lives inside the sidebar caption / ui-bar.
	   Observing that container instead of <body> avoids reacting to every mutation in #passages (the story text),
	   which is where DoL does the overwhelming majority of its DOM churn. */
	function getUiScope() {
		return document.getElementById("story-caption") || document.getElementById("ui-bar") || null;
	}

	function isStartLikeScreen() {
		return document.getElementById("startCaption") !== null;
	}

	function getDirectChildByTag(parent, tagName) {
		if (!parent) return null;
		tagName = String(tagName || "").toUpperCase();
		for (const child of parent.children) {
			if (child.tagName === tagName) return child;
		}
		return null;
	}

	function ensureStartCaptionAnchor(startLike) {
		if (!startLike) return;

		const startCaption = document.getElementById("startCaption");
		if (!startCaption) return;

		let h4 = getDirectChildByTag(startCaption, "h4");
		if (h4) return;

		h4 = document.createElement("h4");
		h4.className = "breeze-anchor-title";
		h4.setAttribute("aria-hidden", "true");
		h4.textContent = (document.getElementById("story-title")?.textContent || "").trim() || "Degrees of Lewdity";

		startCaption.insertBefore(h4, startCaption.firstChild);
	}

	function ensureOverlayButtonSplitAnchors(startLike) {
		if (startLike) return;

		const overlayButtons = document.getElementById("overlayButtons");
		if (!overlayButtons) return;

		let splitCount = overlayButtons.querySelectorAll(".sidebarButtonSplit").length;
		if (splitCount >= 2) return;

		let anchorGroup = overlayButtons.querySelector(".breeze-anchor-group");
		if (!anchorGroup) {
			anchorGroup = document.createElement("div");
			anchorGroup.className = "sidebarButtonGroup breeze-anchor-group";
			overlayButtons.insertBefore(anchorGroup, overlayButtons.firstChild);
		}

		while (splitCount < 2) {
			const split = document.createElement("div");
			split.className = "sidebarButtonSplit breeze-anchor-split";
			anchorGroup.appendChild(split);
			splitCount++;
		}
	}

	function ensureBreezeCompatAnchors() {
		/* Late-attach the observer once the caption container exists. */
		installObserver();

		const startLike = isStartLikeScreen();
		ensureStartCaptionAnchor(startLike);
		ensureOverlayButtonSplitAnchors(startLike);
	}

	function scheduleEnsureBreezeCompatAnchors() {
		if (scheduled) return;
		scheduled = true;

		const run = () => {
			scheduled = false;
			ensureBreezeCompatAnchors();
		};

		if (typeof window.requestAnimationFrame === "function") {
			window.requestAnimationFrame(run);
		} else {
			window.setTimeout(run, 0);
		}
	}

	function mutationTouchesUi(mutations) {
		for (const mutation of mutations) {
			if (mutation.type === "childList" && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
				return true;
			}
		}

		return false;
	}

	function installObserver() {
		if (typeof MutationObserver !== "function") return;

		const scope = getUiScope();
		if (!scope) return; /* container not built yet; a later passage hook will retry */
		if (observer && observedScope === scope) return;

		if (observer) observer.disconnect();
		observedScope = scope;

		observer = new MutationObserver(mutations => {
			if (mutationTouchesUi(mutations)) {
				scheduleEnsureBreezeCompatAnchors();
			}
		});

		/* Narrow scope: only the sidebar caption / ui-bar, not the whole body.
		   This is the single change that removes the per-passage tax
		   we no longer get a callback for every node added to the story text. */
		observer.observe(scope, {
			childList: true,
			subtree: true,
		});
	}

	function init() {
		scheduleEnsureBreezeCompatAnchors();
		installObserver();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}

	if (window.jQuery) {
		jQuery(document).on(":passagedisplay", scheduleEnsureBreezeCompatAnchors);
	}
})();
