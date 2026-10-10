/* globals isPossibleLoveInterest */
/* Hospital emergency contact. $hospitalContact names the love interest who collects the PC after a discharge.
   Unset, or a contact who is no longer available, falls back to vanilla Bailey. */
function hospitalContactAvailable(name) {
	if (!isPossibleLoveInterest(name)) return false;
	switch (name) {
		case "Robin":
			return !V.robinmissing;
		case "Whitney":
			return ["active", "rescued"].includes(C.npc.Whitney.state);
		case "Kylar":
			return C.npc.Kylar.state === "active";
		case "Avery":
			return C.npc.Avery.state === "active";
		case "Sydney":
			return true;
		default:
			return false;
	}
}
window.hospitalContactAvailable = hospitalContactAvailable;

function hospitalContactOptions() {
	return ["Robin", "Whitney", "Kylar", "Sydney", "Avery"].filter(hospitalContactAvailable);
}
window.hospitalContactOptions = hospitalContactOptions;

function hospitalContact() {
	return V.hospitalContact && hospitalContactAvailable(V.hospitalContact) ? V.hospitalContact : undefined;
}
window.hospitalContact = hospitalContact;
