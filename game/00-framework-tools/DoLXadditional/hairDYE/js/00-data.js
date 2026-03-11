setup.dhmod = {
	// extend the dict below if you have more custom gradients
	gradients: {
		"Low Ombré": "low-ombre",
		"High Ombré": "high-ombre",
		"Split": "split",
		"Face-framing highlights": "face-frame"
	},
	filter_cache: {
		tmp0: {
		},
		tmp1: {
		}
	}
};

Object.defineProperty(window, 'dhmod', { get: () => State.variables.dhmod }); 
