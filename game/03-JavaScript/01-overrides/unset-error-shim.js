/* The bundled SugarCube's unset macro reports evaluation failures via `getErrorMessage(ex)`, but that helper was never included in the story format build.
Without it, any unset failure surfaces as "getErrorMessage is not a function" instead of the actual problem.
The call site resolves the bare identifier through the global scope, so defining it here fixes the error reporting. */
window.getErrorMessage = function (ex) {
	return typeof ex === "object" && ex !== null ? `${ex.name}: ${ex.message}` : String(ex);
};
