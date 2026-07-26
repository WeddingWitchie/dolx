function bikeTime(destinationRegion) {
	// Frost calculated aprox time for the distance based on how long it takes pc to walk to these locations
	const townToTown = 1;
	const townToFarm = 19;
	let townToLake = 21;
	//  all travel takes at least 1 minute
	let time = 1;

	// road to the lake reduces travel time
	if (V.town_projects.road >= 4) {
		townToLake = 5;
	}
	V.bicycle.roughTerrain = 0;
	// following is determined by the path pc has to take to get to the different areas
	// DoLX: bikes only park in town, at the lake bus stop, and at the farm. The deep forest and the moor are not reachable by bike.
	switch (V.bicycle.location) {
		case "lake":
			switch (destinationRegion) {
				case "residential":
				case "commercial":
				case "industrial":
					time += townToLake + townToTown;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.rTime = Math.round(time);
					V.bicycle.travel.cTime = Math.round(time);
					V.bicycle.travel.iTime = Math.round(time);
					break;
				// the forestEntrance streets (Wolf, Nightingale) are much closer to the forest than the other parts of town
				case "forestEntrance":
					time += townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "alex_farm":
					time += townToLake + townToFarm + townToTown;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "lake":
					break;
			}
			break;
		case "barb":
		case "domus":
		case "danube":
		case "wolf":
			switch (destinationRegion) {
				case "residential":
					V.bicycle.travel.rTime = time;
					break;
				case "commercial":
					time += townToTown;
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "industrial":
					time += townToTown + townToTown;
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "lake":
					if (V.bicycle.location === "wolf") {
						time += townToLake;
					} else {
						time += townToTown + townToLake;
					}
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.lTime = Math.round(time);
					break;
				case "alex_farm":
					time += townToTown + townToTown + townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
			}
			break;
		case "cliff":
		case "high":
		case "starfish":
		case "oxford":
		case "connudatus":
		case "nightingale":
			switch (destinationRegion) {
				case "residential":
				case "industrial":
					time += townToTown;
					V.bicycle.travel.rTime = Math.round(time);
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "commercial":
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "lake":
					time += townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.lTime = Math.round(time);
					break;
				case "alex_farm":
					time += townToTown + townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
			}
			break;
		case "elk":
		case "mer":
		case "harvest":
			switch (destinationRegion) {
				case "residential":
					time += townToTown + townToTown;
					V.bicycle.travel.rTime = Math.round(time);
					break;
				case "commercial":
					time += townToTown;
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "industrial":
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "lake":
					time += townToTown + townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.lTime = Math.round(time);
					break;
				case "alex_farm":
					time += townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
			}
			break;
		case "alex_farm":
			switch (destinationRegion) {
				case "residential":
					time += townToTown + townToTown + townToFarm;
					V.bicycle.travel.rTime = Math.round(time);
					break;
				case "commercial":
					time += townToTown + townToFarm;
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "industrial":
					time += townToFarm;
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "lake":
					time += townToFarm + townToTown + townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.lTime = Math.round(time);
					break;
			}
			break;
	}
	// assign times to variables to display on bike menu and clean  up
	let timestring;
	T.time = [];
	Object.keys(V.bicycle.travel).forEach(key => {
		timestring = getTimeString(V.bicycle.travel[key]);
		T.time[key] = timestring;
	});
}
window.bikeTime = bikeTime;
DefineMacro("bikeTime", bikeTime);

// Where the player currently is, using the same sublocation keys the bike system parks at
function bikePlayerSpot() {
	return ["town", "plains", "forest", "industrial"].includes(V.location) ? V.sublocation : V.location;
}
window.bikePlayerSpot = bikePlayerSpot;

function bikeSecurity() {
	if (V.bicycle.own && !V.bicycle.stolenCoolDown) {
		// only if persistentLocation is enabled
		if (V.bicycle.persistentLocation) {
			// reset counter when player is next to bike
			if (bikePlayerSpot() === V.bicycle.location) {
				V.bicycle.hourlyCheck = 0;
			} else if (V.bicycle.hourlyCheck >= 1) {
				// Increase hour counter
				V.bicycle.hourlyCheck++;
			} else {
				V.bicycle.hourlyCheck = 1;
			}
		} else {
			V.bicycle.hourlyCheck = 0;
		}
		// add a 1% chance to theft bonus for every hour
		let bikeTheftChanceBonus = V.bicycle.hourlyCheck / 100;
		// Areas where young folk frequent/less public visibility have higher chance, these numbers are otherwise arbitrary...
		// Remy and Bailey are more likely to fuck with ur shit if they're mad
		// the orphans are more likely to passively protect pc's stuff if reb is high (orphans stick together!!)
		if (V.bicycle.locationRegion === "lake") {
			T.bikeTheftChance = 0.25 - V.bicycle.security + bikeTheftChanceBonus;
		} else if (V.bicycle.locationRegion === "residential" || V.bicycle.locationRegion === "industrial") {
			if (V.baileydefeatedchain >= 1) {
				bikeTheftChanceBonus += 0.25;
			}
			if (V.orphan_reb >= 25) {
				bikeTheftChanceBonus -= 0.1;
			}
			T.bikeTheftChance = 0.35 - V.bicycle.security + bikeTheftChanceBonus;
		} else if (V.bicycle.locationRegion === "commercial") {
			if (V.baileydefeatedchain >= 1) {
				bikeTheftChanceBonus += 0.25;
			}
			if (V.orphan_reb >= 25) {
				bikeTheftChanceBonus -= 0.1;
			}
			T.bikeTheftChance = 0.45 - V.bicycle.security + bikeTheftChanceBonus;
		} else if (V.bicycle.locationRegion === "alex_farm") {
			if (V.farm?.aggro) bikeTheftChanceBonus = 0.75 * (V.farm.aggro / 100);
			T.bikeTheftChance = 0.25 - V.bicycle.security + bikeTheftChanceBonus;
		} else {
			T.bikeTheftChance = 1 - V.bicycle.security + bikeTheftChanceBonus;
		}
		const bikeTheft = Math.floor(T.bikeTheftChance * 1000);
		if (random(1, 1000) <= Math.max(0, bikeTheft) && V.bicycle.theftEnabled) {
			V.bicycle.own = false;
			V.bicycle.stolen = true;
			if (V.bicycle.security > 0) {
				V.bicycle.security = 0;
				V.bicycle.securityStolen = true;
			}
			V.bicycle.upgrades = [];
			V.bicycle.hourlyCheck = 0;
			if (Time.days < 150) {
				V.bicycle.stolenCoolDown = 14;
			} else {
				V.bicycle.stolenCoolDown = 7;
			}
		}
	}
}
window.bikeSecurity = bikeSecurity;
