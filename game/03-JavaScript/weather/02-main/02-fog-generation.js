/* fog-generation.js */

/*
 * Fog is generated in two ways.
 *  1) When the weather changes from one with precipitation to less precipitation, the fog increases
 *  2) Some days are rolled as allDayFog days. On these rare days, the fogGoal is set to 1 (ignores fogIncreaseAllowed)
 *
 * With just these rules, too much fog could generate. So to control this, and to adjust the amount of fog depending
 * on the time of the year, there is a fogIncreaseAllowed value associated with the different parts of the year.
 * If this is true at a given keypoint, then fog can increase. This value is re-rolled each day.
 *
 * Imported-save note:
 *   Time.date can be ahead of the last fog keypoint. We extend the timeline on demand inside getFog so
 *   interpolateFog always has a `nextKeyPoint` to work with, instead of returning null and crashing.
 */
Weather.FogGeneration = (() => {
	function setFog(value) {
		V.weatherObj.fogKeypoints ??= [];
		const fogKeypoints = V.weatherObj.fogKeypoints;

		const limit = Math.min(5, fogKeypoints.length);

		for (let i = 0; i < limit; i++) {
			fogKeypoints[i].fogGoal = Math.clamp(value, 0, 1);
		}

		Weather.Observables.checkForUpdate();
	}
	window.setFog = setFog;

	/**
	 * Extend fog keypoints so they cover `date`. No-op if already covered.
	 * Generates the underlying weather first, then derives matching fog keypoints.
	 */
	function ensureFogCoverage(date) {
		const fogKeypoints = V.weatherObj.fogKeypoints;
		const lastFog = fogKeypoints?.[fogKeypoints.length - 1];

		if (lastFog && date.timeStamp <= lastFog.timestamp) return;

		Weather.WeatherGeneration.getWeather(new DateTime(date));

		if (V.weatherObj.keypointsArr?.length) {
			generateFogKeypoints(V.weatherObj.keypointsArr);
		}
	}

	function getFog(date) {
		// If weather hasn't generated yet, then fog hasn't either.
		if (!V.weatherObj.keypointsArr?.length) return 0;

		const targetDate = date ? new DateTime(date) : new DateTime(Time.date);

		if (targetDate.timeStamp < Time.date.timeStamp) {
			console.warn("getFog: Provided date is before the current timestamp. Returning the current fog amount.");
			return interpolateFog(new DateTime(Time.date));
		}

		ensureFogCoverage(targetDate);
		return interpolateFog(targetDate);
	}

	function generateFogKeypoints(weatherKeypoints) {
		V.weatherObj.fogKeypoints ??= [];
		const fogKeypoints = V.weatherObj.fogKeypoints;

		if (!weatherKeypoints?.length) {
			throw new Error("weather keypoints are required to generate fog keypoints");
		}

		const lastFogTimestamp = fogKeypoints.length > 0 ? fogKeypoints[fogKeypoints.length - 1].timestamp : 0;
		const lastWeatherTimestamp = weatherKeypoints[weatherKeypoints.length - 1].timestamp;

		// Exit early if the last fog keypoint is after the last weather keypoint
		if (lastFogTimestamp >= lastWeatherTimestamp) {
			return fogKeypoints;
		}

		const newKeypoints = [];

		// Add fog keypoints for uncovered weather keypoints
		const firstUncoveredWeatherKeypointIndex = weatherKeypoints.findIndex(weatherKeypoint => weatherKeypoint.timestamp > lastFogTimestamp);
		for (let i = firstUncoveredWeatherKeypointIndex; i < weatherKeypoints.length; i++) {
			newKeypoints.push({ timestamp: weatherKeypoints[i].timestamp });
		}

		// Add midnight keypoints so daily flags flip at day boundaries
		const midnightIteratorDate = new DateTime(weatherKeypoints[firstUncoveredWeatherKeypointIndex].timestamp);
		let midnightIterator = new DateTime(midnightIteratorDate.year, midnightIteratorDate.month, midnightIteratorDate.day, 0, 0);

		while (midnightIterator.timeStamp <= lastWeatherTimestamp) {
			const midnightTimestamp = midnightIterator.timeStamp;
			if (midnightTimestamp > lastFogTimestamp) {
				newKeypoints.push({ timestamp: midnightTimestamp });
			}

			midnightIterator = new DateTime(midnightIterator).addDays(1);
		}

		fogKeypoints.push(...newKeypoints);

		// Sort and dedupe keypoints
		fogKeypoints.sort((a, b) => a.timestamp - b.timestamp);
		for (let i = 1; i < fogKeypoints.length; i++) {
			if (fogKeypoints[i].timestamp === fogKeypoints[i - 1].timestamp) {
				fogKeypoints.splice(i, 1);
				i--;
			}
		}

		const firstNewFogKeypointIndex = fogKeypoints.findIndex(keypoint => keypoint.timestamp > lastFogTimestamp);

		// Assign flags, forwarding the previous keypoint's flags for the rest of the day, then roll new flags per day
		let currentDayIdentifier = null;
		let currentAllDayFog = false;
		let currentFogIncreaseAllowed = false;

		const previousFogKeypoint = fogKeypoints[firstNewFogKeypointIndex - 1];
		if (previousFogKeypoint) {
			const previousDate = new DateTime(previousFogKeypoint.timestamp);
			currentDayIdentifier = previousDate.day;
			currentAllDayFog = previousFogKeypoint.allDayFog;
			currentFogIncreaseAllowed = previousFogKeypoint.fogIncreaseAllowed;
		}

		for (let i = firstNewFogKeypointIndex; i < fogKeypoints.length; i++) {
			const keypointDate = new DateTime(fogKeypoints[i].timestamp);
			const dayIdentifier = keypointDate.day;

			if (dayIdentifier !== currentDayIdentifier) {
				currentDayIdentifier = dayIdentifier;

				const monthConfig = setup.WeatherGeneration.months[keypointDate.month - 1];
				const allDayFogChance = monthConfig.allDayFog;
				const fogIncreaseAllowedChance = monthConfig.fogIncreaseAllowed;

				currentAllDayFog = Weather.activeRenderer.rng.random() < allDayFogChance;
				currentFogIncreaseAllowed = currentAllDayFog || Weather.activeRenderer.rng.random() < fogIncreaseAllowedChance;
			}

			fogKeypoints[i].allDayFog = currentAllDayFog;
			fogKeypoints[i].fogIncreaseAllowed = currentFogIncreaseAllowed;
		}

		// Assign weather values
		for (let i = firstNewFogKeypointIndex; i < fogKeypoints.length; i++) {
			const weatherValue = Weather.WeatherGeneration.getWeather(new DateTime(fogKeypoints[i].timestamp)).value;
			fogKeypoints[i].weatherId = Weather.genSettings.weatherTypes.findIndex(wt => wt.value === weatherValue);
		}

		// Calculate fog goals
		for (let i = firstNewFogKeypointIndex; i < fogKeypoints.length; i++) {
			const currentKeyPoint = fogKeypoints[i];
			const previousKeyPoint = fogKeypoints[i - 1] ?? currentKeyPoint;

			if (currentKeyPoint.fogGoal !== undefined) {
				continue;
			}

			currentKeyPoint.fogGoal = computeFogGoal(previousKeyPoint, currentKeyPoint);
		}

		// Remove keypoints that are before now
		while (fogKeypoints.length > 1 && fogKeypoints[0].timestamp <= Time.date.timeStamp) {
			fogKeypoints.shift();
		}

		// printFogKeypointsByDate(fogKeypoints);

		return fogKeypoints;
	}

	function interpolateFog(date) {
		const fogKeypoints = V.weatherObj.fogKeypoints;
		if (!fogKeypoints?.length) return 0;

		const currentTimeStamp = date.timeStamp;

		if (currentTimeStamp < fogKeypoints[0].timestamp) {
			return Math.clamp(fogKeypoints[0].fogGoal ?? 0, 0, 1);
		}

		let currentKeyPoint = null;
		let nextKeyPoint = null;

		// Get the current and next fog keypoints
		for (const keyPoint of fogKeypoints) {
			if (keyPoint.timestamp <= currentTimeStamp) {
				currentKeyPoint = keyPoint;
			} else {
				nextKeyPoint = keyPoint;
				break;
			}
		}

		// No next keypoint: return the current value rather than crashing.
		// Two paths reach here:
		//  - getFog → ensureFogCoverage normally prevents this; if it slips through, the ?? 0 keeps us safe.
		//  - Saves made pre-fog update within a flashback event, loaded after the fog update, after <<unfreezePlayerStats>> is run.
		if (currentKeyPoint && !nextKeyPoint) {
			if (V.debug) {
				const lastWeatherKeypointTimestamp = V.weatherObj.keypointsArr?.length
					? V.weatherObj.keypointsArr[V.weatherObj.keypointsArr.length - 1].timestamp
					: null;
				const lastFogKeypointTimestamp = fogKeypoints[fogKeypoints.length - 1]?.timestamp ?? null;

				console.warn(
					`interpolateFog: currentKeyPoint is the last fog keypoint; returning currentKeyPoint.fogGoal.` +
						` \ncurrentTimeStamp: ${currentTimeStamp}` +
						` \ncurrentFogTimestamp: ${currentKeyPoint.timestamp}` +
						` \nLast Weather Timestamp: ${lastWeatherKeypointTimestamp}` +
						` \nLast Fog Timestamp: ${lastFogKeypointTimestamp}` +
						` \nFog Keypoints Length=${fogKeypoints.length}` +
						` \nWeather Keypoints Length=${V.weatherObj.keypointsArr?.length ?? 0}`
				);
			}
			return Math.clamp(currentKeyPoint.fogGoal ?? 0, 0, 1);
		}

		const currentGoal = currentKeyPoint.fogGoal ?? 0;
		const nextGoal = nextKeyPoint.fogGoal ?? currentGoal;

		const fraction = (currentTimeStamp - currentKeyPoint.timestamp) / (nextKeyPoint.timestamp - currentKeyPoint.timestamp);
		const interpolatedGoal = currentGoal + (nextGoal - currentGoal) * fraction;

		return Math.clamp(interpolatedGoal, 0, 1);
	}

	function computeFogGoal(previousKeyPoint, currentKeyPoint) {
		if (!previousKeyPoint) {
			return 0;
		}

		const weatherTypes = setup.WeatherGeneration.weatherTypes;

		// If there is fog all day, ramp up the fogGoal to 1 over the course of 6 hours
		if (currentKeyPoint.allDayFog === true) {
			const previousFogGoal = previousKeyPoint.fogGoal ?? 0;
			const hoursPassed = (currentKeyPoint.timestamp - previousKeyPoint.timestamp) / TimeConstants.secondsPerHour;
			const fogIncreasePerhour = (1 - previousFogGoal) / 6;
			const fogGoal = previousFogGoal + fogIncreasePerhour * hoursPassed;
			return round(Math.max(0, Math.min(1, fogGoal)), 2);
		}

		const previousWeather = weatherTypes[previousKeyPoint.weatherId];
		const currentWeather = weatherTypes[currentKeyPoint.weatherId];
		const previousFogGoal = previousKeyPoint.fogGoal ?? 0;

		const hoursPassed = (currentKeyPoint.timestamp - previousKeyPoint.timestamp) / TimeConstants.secondsPerHour;
		let fogGoal = previousFogGoal + (currentWeather?.fogChangeRate ?? 0) * hoursPassed;

		const previousPrecip = previousWeather?.precipitationIntensity ?? 0;
		const currentPrecip = currentWeather?.precipitationIntensity ?? 0;

		// Sets the fogGoal when precipitation intensity drops. A drop from max precipitation to 0 results in max fog
		// This is the primary place where fog increases, alongside allDayFog
		const maxPrecipIntensity = setup.WeatherGeneration.weatherTypes.reduce((max, wt) => Math.max(max, wt.precipitationIntensity), 0);

		const precipDrop = previousPrecip - currentPrecip;
		if (precipDrop > 0) {
			fogGoal = Math.max(fogGoal, precipDrop / maxPrecipIntensity);
		}

		if (currentKeyPoint.fogIncreaseAllowed === false) {
			fogGoal = Math.min(fogGoal, previousFogGoal);
		}

		return round(Math.max(0, Math.min(1, fogGoal)), 2);
	}

	// Function for testing fog keypoints
	function printFogKeypointsByDate(fogKeypoints) {
		const formatted = fogKeypoints.map(keypoint => {
			const dt = new DateTime(keypoint.timestamp);

			return {
				...keypoint,
				timestamp: `${dt.month}/${dt.day}/${dt.year}`,
			};
		});

		console.table(formatted);

		return formatted;
	}
	window.printFogKeypointsByDate = printFogKeypointsByDate;

	return Object.create({
		getFog,
		generateFogKeypoints,
		setFog,
		computeFogGoal,
	});
})();
