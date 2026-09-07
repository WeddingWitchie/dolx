/**
 * Add exceptions to weather key generation, to specify times in the year to be a certain weather type
 */
setup.WeatherExceptions = [
	{
		// Always snow on christmas day
		date: date => new DateTime((date ?? Time.date).year, 12, 25, 10),
		duration: 3, // Minimum duration in hours - only for weatherType. Temperature is changed for the whole day.
		weatherType: "heavyPrecipitation",
		temperature: -5, // Average temperature below zero for the whole day to ensure snow
	},
	{
		// Base weather will be "clear" on blood moons - can still override the type manually
		date: date => {
			date ??= Time.date;
			return new DateTime(date.year, date.month, date.lastDayOfMonth, 22);
		},
		duration: 8,
		weatherType: "clear",
	},
];
