function bikeTime(destinationRegion) {
	// Frost calculated aprox time for the distance based on how long it takes pc to walk to these locations
	const townToTown = 1;
	const townToFarm = 19;
	let lakeToDeepForest = 28;
	let farmToMoor = 80;
	let townToLake = 21;
	//  all travel takes at least 1 minute
	let time = 1;

	// road to the lake reduces travel time
	if (V.town_projects.road >= 4) {
		townToLake = 5;
	}
	V.bicycle.roughTerrain = 0;
	V.bicycle.upgrades.forEach(upgrade => {
		switch (upgrade) {
			case "brakes":
				break;
			case "grips":
				townToLake *= 0.975;
				lakeToDeepForest *= 0.975;
				farmToMoor *= 0.975;
				break;
			case "pedals":
				townToLake *= 0.975;
				lakeToDeepForest *= 0.975;
				farmToMoor *= 0.975;
				break;
			case "suspension":
				townToLake *= 0.9;
				lakeToDeepForest *= 0.9;
				farmToMoor *= 0.9;
				break;
			case "tyres":
				townToLake *= 0.95;
				lakeToDeepForest *= 0.95;
				farmToMoor *= 0.95;
				break;
			case "tubeless":
				townToLake *= 0.95;
				lakeToDeepForest *= 0.95;
				farmToMoor *= 0.95;
				break;
		}
	});
	// following is determined by the path pc has to take to get to the different areas
	// the forestEntrance areas are much closer to the forest than the other parts of town
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
				case "forestEntrance":
					time += townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "forest":
					time += lakeToDeepForest;
					V.bicycle.roughTerrain += lakeToDeepForest;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "alex_farm":
					time += townToLake + townToFarm + townToTown;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "moor":
					time += townToFarm + townToTown + townToLake + farmToMoor;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.mTime = Math.round(time);
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
				case "forest":
					if (V.bicycle.location === "wolf") {
						time += townToLake + lakeToDeepForest;
					} else {
						time += townToTown + townToLake + lakeToDeepForest;
					}
					V.bicycle.roughTerrain += townToLake + lakeToDeepForest;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "forestEntrance":
					if (V.bicycle.location === "wolf") {
						time += townToTown;
					} else {
						time += townToTown + townToTown;
					}
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "alex_farm":
					time += townToTown + townToTown + townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "moor":
					time += townToTown + townToTown + townToFarm + farmToMoor;
					V.bicycle.travel.roughTerrain = farmToMoor;
					V.bicycle.travel.mTime = Math.round(time);
					break;
			}
			break;
		case "cliff":
		case "high":
		case "starfish":
		case "oxford":
		case "connudatus":
		case "nightingale":
		case "forest":
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
				case "forestEntrance":
					time += townToTown;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "forest":
					if (V.bicycle.location === "nightingale" || V.bicycle.location === "forest") {
						time += townToLake;
					} else {
						time += townToTown + townToLake;
					}
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "alex_farm":
					time += townToTown + townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "moor":
					time += townToTown + townToFarm + farmToMoor;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.mTime = Math.round(time);
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
				case "forest":
					time += townToTown + townToLake + lakeToDeepForest;
					V.bicycle.roughTerrain += townToLake + lakeToDeepForest;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "forestEntrance":
					time += townToTown;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "alex_farm":
					time += townToFarm;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "moor":
					time += townToFarm + farmToMoor;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.mTime = Math.round(time);
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
				case "forest":
					time += townToFarm + townToTown + townToLake;
					V.bicycle.roughTerrain += townToLake;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "forestEntrance":
					time += townToFarm + townToTown;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "moor":
					time += townToFarm + townToTown + townToLake + lakeToDeepForest;
					V.bicycle.roughTerrain += townToLake + lakeToDeepForest;
					V.bicycle.travel.mTime = Math.round(time);
					break;
			}
			break;
		case "wolf_cave_yard":
		case "cabin":
			switch (destinationRegion) {
				case "residential":
					time += lakeToDeepForest + townToLake + townToTown;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake;
					V.bicycle.travel.rTime = Math.round(time);
					break;
				case "commercial":
					time += lakeToDeepForest + townToLake + townToTown;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake;
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "industrial":
					time += lakeToDeepForest + townToLake + townToTown + townToTown;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake;
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "lake":
					time += lakeToDeepForest;
					V.bicycle.roughTerrain += lakeToDeepForest;
					V.bicycle.travel.lTime = Math.round(time);
					break;
				case "forest":
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "forestEntrance":
					time += lakeToDeepForest + townToLake;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "alex_farm":
					time += lakeToDeepForest + townToLake + townToTown + townToTown + townToFarm;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake;
					V.bicycle.travel.aTime = Math.round(time);
					break;
				case "moor":
					time += lakeToDeepForest + townToLake + townToTown + townToTown + townToFarm + farmToMoor;
					V.bicycle.roughTerrain += lakeToDeepForest + townToLake + farmToMoor;
					V.bicycle.travel.mTime = Math.round(time);
					break;
			}
			break;
		case "moor":
			switch (destinationRegion) {
				case "residential":
					time += farmToMoor + townToFarm + townToTown + townToTown;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.rTime = Math.round(time);
					break;
				case "commercial":
					time += farmToMoor + townToFarm + townToTown;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.cTime = Math.round(time);
					break;
				case "industrial":
					time += farmToMoor + townToFarm;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.iTime = Math.round(time);
					break;
				case "lake":
					time += farmToMoor + townToFarm + townToTown + townToLake;
					V.bicycle.roughTerrain += farmToMoor + townToLake;
					V.bicycle.travel.lTime = Math.round(time);
					break;
				case "forestEntrance":
					time += farmToMoor + townToFarm + townToTown;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.fETime = Math.round(time);
					break;
				case "forest":
					time += farmToMoor + townToFarm + townToTown + townToLake;
					V.bicycle.roughTerrain += farmToMoor + townToLake;
					V.bicycle.travel.fTime = Math.round(time);
					break;
				case "alex_farm":
					time += farmToMoor;
					V.bicycle.roughTerrain += farmToMoor;
					V.bicycle.travel.aTime = Math.round(time);
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

function bikeSecurity() {
	if (V.bicycle.own && !V.bicycle.stolenCoolDown) {
		// only if persistentLocation is enabled
		if (V.bicycle.persistentLocation) {
			// reset counter when player is next to bike
			if (V.bikeStart === V.bikeLocation) {
				V.bicycle.hourlyCheck = 0;
			}
			if (V.bikeStart !== V.bikeLocation) {
				// Increase hour counter
				if (V.bicycle.hourlyCheck === 0) {
					V.bicycle.hourlyCheck = 1;
				} else if (V.bicycle.hourlyCheck >= 1) {
					V.bicycle.hourlyCheck++;
				}
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
			T.bikeTheftChance = 0.25;
		} else if (V.bicycle.locationRegion === "residential" || V.bicycle.locationRegion === "industrial") {
			if (V.baileydefeatedchain >= 1) {
				bikeTheftChanceBonus += 0.25;
			}
			if (V.orphan_reb >= 25) {
				bikeTheftChanceBonus -= 0.1;
			}
			T.bikeTheftChance = 0.35 - V.bicycle.security + bikeTheftChanceBonus;
		} else if (V.bicycle.locationRegion === "commercial" || V.bicycle.locationRegion === "forestEntrance") {
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
		} else if (V.bicycle.locationRegion === "forest") {
			// literally who is gonna steal your bike in the woods... Eden??
			T.bikeTheftChance = 0.05 - V.bicycle.security + bikeTheftChanceBonus;
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
