const WLI = {};

Object.defineProperty(window, "W", { get: () => WLI });
Object.defineProperty(window, "WOpts", { get: () => State.variables.wli.cfg });
