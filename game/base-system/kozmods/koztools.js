
function kofiValidate(code) {
	let versionNumber = window.StartConfig.version;

	let versionMatch = versionNumber.match(/DoLX (\d+)\.(\d+)\.(\d+)\w{0,1}/);
	if (!versionMatch) {
		throw new Error("Version number doesn't match convention.");
	}
	
	let codeMatch = code.match(/(\d+)[A-Z]{3}(\w)[A-Z]{1}(\w)[A-Z]{1,3}(\d+)/);
	if (codeMatch === null) return 0;

	var verMajor = codeMatch[1];
	var codeMajor = codeMatch[2];
	var codeMinor = codeMatch[3];
	var verMinor = Math.sqrt(codeMatch[4]);

	var majorHash = String.fromCharCode( (verMajor << 11) % 25 + 65 );
	var minorHash = String.fromCharCode( (verMinor << 11) % 25 + 65 );

	let isValid = (versionMatch[1] >= verMajor && versionMatch[2] >= verMinor) && (codeMajor == majorHash && codeMinor == minorHash);

	if (isValid) {
		return +verMajor * 1000 + +verMinor;
	}
	else {
		return 0;
	}
}
window.kofiValidate = kofiValidate;
