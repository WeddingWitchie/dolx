// Reposition old <mouse class="tooltip"><span>...</span></mouse> tooltips.
//
// Keeps the tooltip beside its anchor when possible, or moves it above/below if needed.
// It also stays inside the screen and becomes scrollable when the text is too long.
//
// The newer [tooltip] system in tooltip.js is unchanged.

const legacyTooltipAnchors = "mouse.tooltip, mouse.tooltip-small";
// Keeps the tooltip clear of the screen edges and of its own anchor.
const legacyTooltipMargin = 8;
// The maximum screen space a touch tooltip can use before it becomes scrollable.
// This keeps large tooltips from covering other choices.
const legacyTooltipHeightShare = 0.65;
// Wider tooltip sizes for desktop screens to reduce scrolling.
// Short tooltips still use the normal width.
const legacyTooltipWidthSteps = [450, 620, 760, 900, 1040, 1200];
// Limit the box width for easier reading. It only grows wider if needed to fit the window.
const legacyTooltipComfortWidth = 900;
// Only use the wider box if it makes the text noticeably shorter.
// Otherwise, it just creates extra empty space.
const legacyTooltipGainRatio = 0.9;
// How many frames to wait for a tooltip to appear.
// On touch devices, :hover may only activate after touchend, so the first frame can have no size.
// Waiting prevents the tooltip from using its default size and overflowing the screen.
const legacyTooltipAppearFrames = 40;
// Smaller text sizes to use if the tooltip is too tall. Shrinking the text is better than adding a scrollbar.
const legacyTooltipFontSteps = [0.94, 0.88, 0.82, 0.76];
// Wide screens can resize tooltips, so they do not need scrollbars.
// Narrow screens are treated as phones, where scrolling is fine.
// Use actual width instead of pointer/media queries, since touch laptops can be misdetected as phones.
const legacyTooltipRoomyWidth = 560;
// The maximum height for mouse tooltips, as a share of the window.
// This keeps tall tooltips from covering the whole list.
const legacyTooltipTargetShare = 0.55;

/**
 * The tooltip body inside an anchor, which the CSS styles as the anchor's last span.
 *
 * @param {HTMLElement} anchor the <mouse> element
 * @returns {HTMLElement|null}
 */
function legacyTooltipPopup(anchor) {
	const spans = Array.from(anchor.children).filter(child => child.tagName === "SPAN");
	return spans.length ? spans[spans.length - 1] : null;
}

/**
 * Drop the inline placement again, so the stylesheet is back in charge.
 *
 * @param {HTMLElement} popup the tooltip body
 */
function clearLegacyTooltip(popup) {
	popup.style.removeProperty("top");
	popup.style.removeProperty("left");
	popup.style.removeProperty("margin-top");
	popup.style.removeProperty("margin-left");
	popup.style.removeProperty("transform");
	popup.style.removeProperty("box-sizing");
	popup.style.removeProperty("max-width");
	popup.style.removeProperty("max-height");
	popup.style.removeProperty("font-size");
	popup.style.removeProperty("overflow-y");
	popup.style.removeProperty("overscroll-behavior");
}

/**
 * Place a tooltip next to its anchor, kept inside the screen and clear of the anchor's own line.
 *
 * @param {HTMLElement} anchor the <mouse> element being pointed at
 * @param {HTMLElement} popup the tooltip body
 * @returns {boolean} whether the tooltip was on screen to be placed
 */
function placeLegacyTooltip(anchor, popup) {
	// The stylesheet offsets these from the anchor. Clear that first, or it fights the measurements.
	popup.style.setProperty("margin-top", "0", "important");
	popup.style.setProperty("margin-left", "0", "important");
	popup.style.setProperty("transform", "none", "important");
	// Tooltips include 10px side padding and a 2px border.
	// Count those edges in the width so they don't overflow on phones.
	popup.style.setProperty("box-sizing", "border-box", "important");

	// Tooltips may be positioned relative to a nearby ancestor instead of the screen, and body zoom can scale the final position.
	// Move the tooltip to 0,0 first to measure its real position and size.
	//
	// Remeasuring also resets the scroll position of long tooltips, so restore it after applying the height limit again.
	const scrolled = popup.scrollTop;
	popup.style.setProperty("top", "0", "important");
	popup.style.setProperty("left", "0", "important");
	popup.style.removeProperty("max-width");
	popup.style.removeProperty("max-height");
	popup.style.removeProperty("font-size");
	popup.style.removeProperty("overflow-y");
	const originRect = popup.getBoundingClientRect();
	if (!originRect.width && !originRect.height) return false; // not on screen yet
	const scale = popup.offsetWidth > 0 ? originRect.width / popup.offsetWidth : 1;
	const unit = Number.isFinite(scale) && scale > 0 ? scale : 1;

	const fullHeight = window.innerHeight - legacyTooltipMargin * 2;
	const widest = Math.min(legacyTooltipWidthSteps[legacyTooltipWidthSteps.length - 1], window.innerWidth - legacyTooltipMargin * 2);
	const roomy = widest >= legacyTooltipRoomyWidth;

	// Make the box wider until the text fits. If it still does not fit on screen, make the text smaller.
	// On phones, the box already uses the full screen width, so no resizing is needed.
	const targetHeight = Math.min(fullHeight, window.innerHeight * legacyTooltipTargetShare);
	let narrower = null;
	for (const step of legacyTooltipWidthSteps) {
		const width = Math.min(step, widest);
		popup.style.setProperty("max-width", width / unit + "px", "important");
		const height = popup.getBoundingClientRect().height;
		// Short enough to leave most of the page behind it visible. Nothing more to gain.
		if (height <= targetHeight) break;
		// This step barely helped, so use the previous one if it also fit without scrolling.
		if (narrower && height <= fullHeight && narrower.height <= fullHeight && height > narrower.height * legacyTooltipGainRatio) {
			popup.style.setProperty("max-width", narrower.width / unit + "px", "important");
			break;
		}
		narrower = { width, height };
		if (width >= widest) break;
		// Use wider sizes to reach the target height. Go wider only if the text still does not fit.
		if (width >= legacyTooltipComfortWidth && height <= fullHeight) break;
	}
	if (roomy) {
		const baseFont = parseFloat(window.getComputedStyle(popup).fontSize);
		if (Number.isFinite(baseFont) && baseFont > 0) {
			for (const step of legacyTooltipFontSteps) {
				if (popup.getBoundingClientRect().height <= fullHeight) break;
				popup.style.setProperty("font-size", baseFont * step + "px", "important");
			}
		}
	}

	// If the content still does not fit, let it scroll inside the window instead of off-screen.
	// On phones, leave some space around it. On larger screens, it can use the full height.
	const heightLimit = roomy ? fullHeight : Math.min(fullHeight, window.innerHeight * legacyTooltipHeightShare);
	if (popup.getBoundingClientRect().height > heightLimit) {
		popup.style.setProperty("max-height", heightLimit / unit + "px", "important");
		popup.style.setProperty("overflow-y", "auto", "important");
		popup.style.setProperty("overscroll-behavior", "contain", "important");
		popup.scrollTop = scrolled;
	}

	const anchorRect = anchor.getBoundingClientRect();
	const popupRect = popup.getBoundingClientRect();
	const clamp = (value, limit) => Math.max(legacyTooltipMargin, Math.min(value, limit));

	// Try placing it to the right of the anchor, then the left. Narrow screens may not have room for either.
	const rightOf = anchorRect.right + legacyTooltipMargin;
	const leftOf = anchorRect.left - popupRect.width - legacyTooltipMargin;
	let left;
	let top;
	if (rightOf + popupRect.width <= window.innerWidth - legacyTooltipMargin) {
		left = rightOf;
	} else if (leftOf >= legacyTooltipMargin) {
		left = leftOf;
	}

	if (left === undefined) {
		// No room beside it. Place below, above if needed, or as low as possible.
		top = anchorRect.bottom + legacyTooltipMargin;
		if (top + popupRect.height > window.innerHeight - legacyTooltipMargin) {
			const above = anchorRect.top - popupRect.height - legacyTooltipMargin;
			top = above >= legacyTooltipMargin ? above : clamp(0, window.innerHeight - popupRect.height - legacyTooltipMargin);
		}
		// Centred on the anchor, then pushed back inside the screen if that hangs off an edge.
		left = clamp(anchorRect.left + anchorRect.width / 2 - popupRect.width / 2, window.innerWidth - popupRect.width - legacyTooltipMargin);
	} else {
		// Level with the anchor, slid up only as far as staying on screen requires.
		top = clamp(anchorRect.top, window.innerHeight - popupRect.height - legacyTooltipMargin);
	}

	// Turn the screen position back into the numbers this tooltip's own container measures in.
	popup.style.setProperty("top", (top - originRect.top) / unit + "px", "important");
	popup.style.setProperty("left", (left - originRect.left) / unit + "px", "important");
	return true;
}

let legacyTooltipOpen = null;
let legacyTooltipFrame = null;

/**
 * Reposition the open tooltip on the next frame, at most once per frame.
 * If the tooltip is not ready yet, wait for it to appear.
 *
 * @param {number} [waited] Number of frames already waited
 */
function refreshLegacyTooltip(waited = 0) {
	if (!legacyTooltipOpen) return;
	if (legacyTooltipFrame) cancelAnimationFrame(legacyTooltipFrame);
	legacyTooltipFrame = requestAnimationFrame(() => {
		legacyTooltipFrame = null;
		if (!legacyTooltipOpen) return;
		const { anchor, popup } = legacyTooltipOpen;
		if (!anchor.isConnected) {
			clearLegacyTooltip(popup);
			legacyTooltipOpen = null;
			return;
		}
		if (!placeLegacyTooltip(anchor, popup) && waited < legacyTooltipAppearFrames) refreshLegacyTooltip(waited + 1);
	});
}

/** Forget the tooltip being placed, leaving it as the stylesheet alone would have it. */
function closeLegacyTooltip() {
	if (!legacyTooltipOpen) return;
	clearLegacyTooltip(legacyTooltipOpen.popup);
	legacyTooltipOpen = null;
}

$(document).on("mouseenter.legacyTooltip touchstart.legacyTooltip focusin.legacyTooltip", legacyTooltipAnchors, function (event) {
	const popup = legacyTooltipPopup(this);
	if (!popup) return;
	// Scrolling a long tooltip can trigger this too. Keep the current tooltip open instead of moving it.
	if (legacyTooltipOpen && legacyTooltipOpen.anchor === this && event.target && popup.contains(event.target)) return;
	// A tap never sends mouseleave, so tidy up the last one here instead of waiting for it.
	if (legacyTooltipOpen && legacyTooltipOpen.anchor !== this) closeLegacyTooltip();
	legacyTooltipOpen = { anchor: this, popup };
	refreshLegacyTooltip();
});

$(document).on("mouseleave.legacyTooltip focusout.legacyTooltip", legacyTooltipAnchors, function (event) {
	// Keyboard focus still holds the tooltip open, so the pointer leaving must not clear its placement.
	if (event.type === "mouseleave" && this.matches(":focus-visible")) return;
	const popup = legacyTooltipPopup(this);
	if (popup) clearLegacyTooltip(popup);
	if (legacyTooltipOpen && legacyTooltipOpen.anchor === this) legacyTooltipOpen = null;
});

// The tooltip is placed against the screen, so it has to follow its anchor when the page moves.
$(window).on("scroll.legacyTooltip resize.legacyTooltip", () => refreshLegacyTooltip());
