/* Sidebar swipe. A touch that starts inside an element marked data-gesture-owner (a minigame playfield that drags or
 * swipes) belongs to that element: the sidebar ignores it. The mark lives on the element, so it goes away with the
 * passage and nothing has to be unlocked on exit. */
document.addEventListener("touchstart", handleTouchStart, false);
document.addEventListener("touchmove", handleTouchMove, false);

let xDown = null;
let yDown = null;

function handleTouchStart(ev) {
	if (ev.target.closest && ev.target.closest("[data-gesture-owner]")) {
		xDown = yDown = null;
		return;
	}
	const firstTouch = ev.touches[0];
	xDown = firstTouch.clientX;
	yDown = firstTouch.clientY;
}

function handleTouchMove(ev) {
	if (!xDown || !yDown) return;
	// don't interfere with sliders and other inputs
	if (ev.target.tagName === "INPUT") return;
	if (ev.target.closest && ev.target.closest("[data-gesture-owner]")) return;

	// Activate the swipe only when finger is over the UI Bar
	// eslint-disable-next-line no-unused-vars
	const stowedWidth = 60; // appx. width of stowed UI Bar in px
	// eslint-disable-next-line no-unused-vars
	const unstowedWidth = 300; // same for unstowed UI Bar

	const xUp = ev.touches[0].clientX;
	const yUp = ev.touches[0].clientY;

	const xDiff = xDown - xUp;
	const yDiff = yDown - yUp;

	// distance to swipe before triggering action
	const threshold = 100;
	if (Math.abs(xDiff) < threshold) return;

	if (Math.abs(xDiff) > Math.abs(yDiff)) {
		// most significant
		if (xDiff > 0) UIBar.stow(); // left swipe
		else UIBar.unstow(); // right swipe
		// allow opening and then closing sidebar without breaking the touch
		xDown = xUp;
		yDown = yUp;
	} else {
		// eslint-disable-next-line prettier/prettier
		if (yDiff > 0); // up swipe
		else; // down swipe
		// nothing yet, just reset the values
		xDown = null;
		yDown = null;
	}
}
