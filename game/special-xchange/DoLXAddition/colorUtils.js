/*
 * Shared color/render helpers for the DoLXAddition cosmetic mods
 * (Custom Makeup `ccmod` + Dye Harder `dhmod`).
 *
 * Only domain-agnostic, pure utilities live here so both mods can delegate to a single implementation instead of carrying byte-identical copies.
 * Anything that touches mod-specific state (ccmod.cfg / dhmod data, preset stores, etc.) stays in each mod's own utils.
 *
 * These methods are only ever called at runtime (from inside mod methods), so load order relative to the mods does not matter.
 */
window.colorUtils = {
	/**
	 * Rate-limit a function so heavy work (e.g. a full canvas re-render) runs at most once per `wait` ms during continuous input,
	 * with a guaranteed trailing call so the final value is always applied.
	 * Used to keep the live mannequin preview from re-rendering on every single colour-picker / slider tick,
	 * which is the main source of lag on low-end devices.
	 *
	 * @param {Function} fn
	 * @param {number} wait milliseconds
	 * @returns {Function}
	 */
	throttle(fn, wait = 150) {
		let last = 0;
		let timer = null;
		let lastArgs = null;
		let lastThis = null;
		return function (...args) {
			lastArgs = args;
			lastThis = this;
			const now = Date.now();
			const remaining = wait - (now - last);
			if (remaining <= 0) {
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				last = now;
				fn.apply(lastThis, lastArgs);
			} else if (!timer) {
				timer = setTimeout(() => {
					last = Date.now();
					timer = null;
					fn.apply(lastThis, lastArgs);
				}, remaining);
			}
		};
	},

	/**
	 * @param {string} hexCode
	 * @returns {string}
	 */
	stringFromHex(hexCode) {
		return `${hexCode.toUpperCase()};0`;
	},

	/**
	 * Check that a filter string is in the expected "HEX;brightness" format.
	 *
	 * @param {string} filterString
	 * @returns {boolean}
	 */
	stringIsValid(filterString) {
		if (typeof filterString !== "string") {
			return false;
		}

		const arr = filterString.split(";");
		if (arr.length < 2) {
			return false;
		}

		const hex = tinycolor(arr[0]);
		if (hex.getFormat() !== "hex") {
			return false;
		}

		const number = parseFloat(arr[1]);
		if (Number.isNaN(number)) {
			return false;
		}

		return true;
	},

	/**
	 * @param {string} filterString
	 * @returns {Array<string|number>} [hex, brightness]
	 */
	stringDecode(filterString) {
		if (this.stringIsValid(filterString)) {
			const arr = filterString.split(";");
			const brightness = parseFloat(arr[1]) ? parseFloat(arr[1]) : 0;
			return [arr[0], brightness];
		}
		return ["#FFFFFF", 0];
	},

	/**
	 * @param {Canvasfilter} filter
	 * @returns {string}
	 */
	filterEncode(filter) {
		return `${filter.blend.toUpperCase()};${filter.brightness.toFixed(1)}`;
	},
};
