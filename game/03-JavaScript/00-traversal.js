// @ts-check

/**
 * @typedef {Record<string, unknown>} TraversalNode
 * @typedef {(source: TraversalNode, key: string) => unknown} TraverseCallback
 * @typedef {(source: TraversalNode, target: TraversalNode, key: string) => unknown} TraversePairCallback
 */

/**
 * @param {TraversalNode | null | undefined} source The tree to traverse.
 * @param {string} key The key of the current source node.
 * @param {string[]} parents List of keys that when matched to a node's key traverses its children.
 * @param {TraverseCallback} callback
 * @returns {TraversalNode | null}
 */
function traverse(source, key, parents, callback) {
	// Ensure node is setup correctly for later traversal or configuration
	const output = /** @type {TraversalNode} */ ({});
	if (source == null) {
		return null;
	}
	Object.entries(source).forEach(([key, value]) => {
		const isParent = parents.includes(key) || key === "root";
		if (isParent) {
			const result = traverse(/** @type {TraversalNode | null | undefined} */ (value), key, parents, callback);
			if (result == null) {
				return;
			}
			output[key] = result;
			return;
		}
		const result = callback(source, key);
		if (result == null) {
			return;
		}
		output[key] = result;
	});
	return output;
}
/** @type {Window & { traverse: typeof traverse }} */ (window).traverse = traverse;

/**
 * @param {TraversalNode | null | undefined} source The tree to traverse.
 * @param {TraversalNode | null | undefined} target The tree to compare with the source.
 * @param {string} key The key of the current source node.
 * @param {string[]} parents List of keys that when matched to a node's key traverses its children.
 * @param {TraversePairCallback} callback
 * @returns {TraversalNode | null}
 */
function traversePair(source, target, key, parents, callback) {
	// Ensure node is setup correctly for later traversal or configuration
	const output = /** @type {TraversalNode} */ ({});
	if (source == null) {
		return null;
	}
	if (target == null) {
		return null;
	}
	Object.entries(source).forEach(([key, value]) => {
		const isParent = parents.includes(key) || key === "root";
		if (isParent) {
			const result = traversePair(
				/** @type {TraversalNode | null | undefined} */ (value),
				/** @type {TraversalNode | null | undefined} */ (target[key]),
				key,
				parents,
				callback
			);
			if (result == null) {
				return;
			}
			output[key] = result;
			return;
		}
		const result = callback(source, target, key);
		if (result == null) {
			return;
		}
		output[key] = result;
	});
	return output;
}
/** @type {Window & { traversePair: typeof traversePair }} */ (window).traversePair = traversePair;
