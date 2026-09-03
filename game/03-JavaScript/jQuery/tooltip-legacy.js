// Position old <mouse class="tooltip"><span>...</span></mouse> tooltips.
//
// On wide screens, tooltips appear below the text as normal.
// On narrow or touch screens, they used to be fixed at the top of the screen.
// This keeps them on screen while placing them near the text: below when possible, above if needed, and shifted sideways to fit.
//
// The newer [tooltip] system in tooltip.js is unchanged.

const legacyTooltipAnchors = "mouse.tooltip, mouse.tooltip-small";
// Matches the media query in base.css that moves these tooltips out of the flow.
const legacyTooltipQuery = "only screen and (max-width: 800px), (hover: none) and (pointer: coarse)";
// Keeps the tooltip clear of the screen edges and of its own anchor.
const legacyTooltipMargin = 8;

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
 * Drop the inline placement again, so the wide-screen CSS is back in charge.
 *
 * @param {HTMLElement} popup the tooltip body
 */
function clearLegacyTooltip(popup) {
	popup.style.removeProperty("top");
	popup.style.removeProperty("left");
	popup.style.removeProperty("margin-top");
	popup.style.removeProperty("margin-left");
	popup.style.removeProperty("transform");
}

/**
 * Place a tooltip next to its anchor, kept inside the screen.
 *
 * @param {HTMLElement} anchor the <mouse> element being pointed at
 * @param {HTMLElement} popup the tooltip body
 */
function placeLegacyTooltip(anchor, popup) {
	// The CSS centres these on the screen. Clear that first, or it fights the measurements.
	popup.style.setProperty("margin-top", "0", "important");
	popup.style.setProperty("margin-left", "0", "important");
	popup.style.setProperty("transform", "none", "important");

	const anchorRect = anchor.getBoundingClientRect();
	const popupRect = popup.getBoundingClientRect();
	if (!popupRect.width && !popupRect.height) return; // not actually shown

	// Show below the anchor by default. If there is no room, show above it.
	// If neither fits, place it as low as possible.
	let top = anchorRect.bottom + legacyTooltipMargin;
	if (top + popupRect.height > window.innerHeight - legacyTooltipMargin) {
		const above = anchorRect.top - popupRect.height - legacyTooltipMargin;
		top = above >= legacyTooltipMargin ? above : Math.max(legacyTooltipMargin, window.innerHeight - popupRect.height - legacyTooltipMargin);
	}
	// Centred on the anchor, then pushed back inside the screen if that hangs off an edge.
	let left = anchorRect.left + anchorRect.width / 2 - popupRect.width / 2;
	left = Math.max(legacyTooltipMargin, Math.min(left, window.innerWidth - popupRect.width - legacyTooltipMargin));

	// getBoundingClientRect reads the zoomed screen, but the tooltip is placed inside the zoom,
	// so the numbers have to go back through the zoom setting to land where they were measured.
	const zoom = parseFloat($("body").css("zoom")) || 1;
	popup.style.setProperty("top", top / zoom + "px", "important");
	popup.style.setProperty("left", left / zoom + "px", "important");
}

let legacyTooltipOpen = null;
let legacyTooltipFrame = null;

/** Reposition the open tooltip on the next frame, at most once per frame. */
function refreshLegacyTooltip() {
	if (!legacyTooltipOpen) return;
	if (legacyTooltipFrame) cancelAnimationFrame(legacyTooltipFrame);
	legacyTooltipFrame = requestAnimationFrame(() => {
		legacyTooltipFrame = null;
		if (!legacyTooltipOpen) return;
		const { anchor, popup } = legacyTooltipOpen;
		// Stop manual positioning if the anchor is gone or the screen is wide enough for normal CSS.
		if (!anchor.isConnected || !window.matchMedia(legacyTooltipQuery).matches) {
			clearLegacyTooltip(popup);
			legacyTooltipOpen = null;
			return;
		}
		placeLegacyTooltip(anchor, popup);
	});
}

/** Forget the tooltip being placed, leaving it as the CSS alone would have it. */
function closeLegacyTooltip() {
	if (!legacyTooltipOpen) return;
	clearLegacyTooltip(legacyTooltipOpen.popup);
	legacyTooltipOpen = null;
}

$(document).on("mouseenter.legacyTooltip touchstart.legacyTooltip", legacyTooltipAnchors, function () {
	if (!window.matchMedia(legacyTooltipQuery).matches) return;
	const popup = legacyTooltipPopup(this);
	if (!popup) return;
	// A tap never sends mouseleave, so tidy up the last one here instead of waiting for it.
	if (legacyTooltipOpen && legacyTooltipOpen.anchor !== this) closeLegacyTooltip();
	legacyTooltipOpen = { anchor: this, popup };
	refreshLegacyTooltip();
});

$(document).on("mouseleave.legacyTooltip", legacyTooltipAnchors, function () {
	const popup = legacyTooltipPopup(this);
	if (popup) clearLegacyTooltip(popup);
	if (legacyTooltipOpen && legacyTooltipOpen.anchor === this) legacyTooltipOpen = null;
});

// The tooltip is fixed to the screen, so it has to follow its anchor when the page moves.
$(window).on("scroll.legacyTooltip resize.legacyTooltip", refreshLegacyTooltip);
