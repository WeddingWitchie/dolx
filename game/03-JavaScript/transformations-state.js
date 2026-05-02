/**
 * @typedef TransformationDefault
 * @property {{ h: number, s: number, l: number }} colour
 */

class Transformations {
	/** @returns {Readonly<Partial<Record<TransformationKeys, TransformationDefault>>>} */
	static get defaults() {
		return Object.freeze({
			demon: {
				colour: { h: 275, s: 100, l: 30 },
			},
		});
	}
}

window.Transformations = Transformations;