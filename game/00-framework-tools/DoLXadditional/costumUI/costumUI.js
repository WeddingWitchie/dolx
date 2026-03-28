(function () {
	"use strict";

	function getButtonLabels() {
		return Array.from(document.querySelectorAll(".link-internal.macro-button"))
			.map((el) => (el.textContent || "").trim())
			.filter(Boolean);
	}

	function isStartLikeScreen() {
		const labels = getButtonLabels();
		return labels.includes("SAVES") && !labels.includes("CHARACTERISTICS");
	}

	function getDirectChildByTag(parent, tagName) {
		if (!parent) return null;
		tagName = String(tagName || "").toUpperCase();
		for (const child of parent.children) {
			if (child.tagName === tagName) return child;
		}
		return null;
	}

	function ensureStartCaptionAnchor() {
		if (!isStartLikeScreen()) return;

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

	function ensureOverlayButtonSplitAnchors() {
		if (isStartLikeScreen()) return;

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
		ensureStartCaptionAnchor();
		ensureOverlayButtonSplitAnchors();
	}

	function installObserver() {
		const observer = new MutationObserver(() => {
			ensureBreezeCompatAnchors();
		});

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			ensureBreezeCompatAnchors();
			installObserver();
		});
	} else {
		ensureBreezeCompatAnchors();
		installObserver();
	}

	if (window.jQuery) {
		jQuery(document).on(":passagestart :passagerender :passagedisplay", function () {
			ensureBreezeCompatAnchors();
		});
	}
})();
