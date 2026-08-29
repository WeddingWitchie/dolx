export default {
	"*.{js,cjs}": filenames => `eslint --cache --fix "${filenames.join('" "')}"`,
	"*.css": "stylelint --fix",
	// Format other files with Prettier
	"*.{html,json,json5,md,ts,yaml}": "prettier --write",
};
