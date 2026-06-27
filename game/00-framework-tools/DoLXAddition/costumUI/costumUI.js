(function () {
	"use strict";

	let scheduled = false;
	let observer = null;
	let observedScope = null;

	/* The only UI we care about lives inside the sidebar caption / ui-bar.
	   Observing that container instead of <body> avoids reacting to every mutation in #passages (the story text),
	   which is where DoL does the overwhelming majority of its DOM churn. */
	function getUiScope() {
		return (
			document.getElementById("story-caption") ||
			document.getElementById("ui-bar") ||
			null
		);
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
		h4.className = "dolx-breeze-anchor-title";
		h4.setAttribute("aria-hidden", "true");
		h4.textContent =
			(document.getElementById("story-title")?.textContent || "").trim() ||
			"Degrees of Lewdity";

		startCaption.insertBefore(h4, startCaption.firstChild);
	}

	function ensureOverlayButtonSplitAnchors(startLike) {
		if (startLike) return;

		const overlayButtons = document.getElementById("overlayButtons");
		if (!overlayButtons) return;

		let splitCount = overlayButtons.querySelectorAll(".sidebarButtonSplit").length;
		if (splitCount >= 2) return;

		let anchorGroup = overlayButtons.querySelector(".dolx-breeze-anchor-group");
		if (!anchorGroup) {
			anchorGroup = document.createElement("div");
			anchorGroup.className = "sidebarButtonGroup dolx-breeze-anchor-group";
			overlayButtons.insertBefore(anchorGroup, overlayButtons.firstChild);
		}

		while (splitCount < 2) {
			const split = document.createElement("div");
			split.className = "sidebarButtonSplit dolx-breeze-anchor-split";
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

		observer = new MutationObserver((mutations) => {
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

	/* Passage events remain the primary, reliable trigger. 
	Combined with the narrowly-scoped observer above, this covers UI changes that happen outside passage navigation
	(e.g. opening an overlay) without watching the entire document. */
	if (window.jQuery) {
		jQuery(document).on(":passagestart :passagerender :passagedisplay", scheduleEnsureBreezeCompatAnchors);
	}
})();
