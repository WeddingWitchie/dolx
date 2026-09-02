/**
 * Shared colour and preset types used by Dye Harder and Custom Makeup.
 */

/** A canvas filter as consumed by the sprite renderer, produced by filterGen(). */
interface Canvasfilter {
	/** Blend colour as a hex string, e.g. "#FFFFFF". */
	blend: string;
	/** Canvas composite operation used to apply the blend. */
	blendMode: string;
	/** Brightness adjustment applied on top of the blend. */
	brightness: number;
}

/** A stored Custom Makeup entry, produced by ccmUtils.itemGen(). */
interface ccmItem {
	/** Encoded "hex;brightness" filter string. */
	filterString: string;
	waterproof: boolean;
	/** Remaining uses. */
	count: number;
}

/** A Dye Harder hair entry, produced by dhmUtils.objNew(). */
interface DhmObj {
	/** Encoded filter strings, one per colour slot. */
	colors: string[];
	/** False for the game's own preset colours, true for player-made ones. */
	is_custom: boolean;
}

/** A preset import file: entry name to colour, as a hex or an encoded filter string. */
type ColorDict = Record<string, string>;

/** The outcome of validating a preset import file, from presetReadFile(). */
interface FileLog {
	/** Number of entries that failed to decode. */
	errors: number;
	/** Entries that validated and are new. */
	passed: Record<string, string>;
	/** Entries that validated but already exist. */
	skip: Record<string, string>;
}
