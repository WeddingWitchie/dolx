// @ts-check

/*
	Temporary until we have a better system for locations
	Exceptions are defined here
	Otherwise locations will match the folder name
*/
setup.Locations = {
	alex_farm: () => (V.bus === "woodland" ? "forest" : V.bus === "farm_fields" ? "fields" : "alex_farm"),
	alley: () => {
		if (V.bus === "industrial") return "ind_alley";
		if (V.bus === "residential") return "res_alley";
		return "com_alley";
	},
	beach: () => {
		if (V.sublocation === "changingroom" && V.bus === "clothingshop") return "shopping_centre";
		if (V.sublocation === "changingroom" && V.bus === "forestshop") return "forest_shop";
		return "beach";
	},
	cafe: () => {
		if (V.chef_state >= 9) return "cafe_renovated";
		if (V.chef_state >= 7) return "cafe_construction";
		return "cafe";
	},
	castle: () => {
		return "tower";
	},
	coastpath: () => (["fishingCoastPath", "fishingCoastPathApproach"].includes(V.bus) ? "cliff-dock" : "coastpath"),
	hotel: () => {
		return "town";
	},
	UBM: () => "estate_cottage",
	arcology: () => "arcology",
	/* The Stack's areas share one location; the passage says which part of it the player is in. */
	arcology_stack: () => {
		const p = State.passage;
		if (/^Arcology Stack (Reclamation|Tech)/.test(p)) return "arcology_stack_reclamation";
		if (/^Arcology Stack Loading/.test(p)) return "arcology_stack_loading";
		if (/^Arcology Stack Swim/.test(p)) return "arcology_stack_hull";
		if (/^Arcology Stack (Bunks?|Sleep|Talk|Flirt|Eavesdrop|Fixer|Rewire|Grope|Ration|Water|Overall|Way Out|Patrols|Band|Passout|Revolt)/.test(p))
			return "arcology_stack_bunks";
		if (/^Arcology Stack (Punishment|Pod|Recondition|Compactor|Buyer)/.test(p)) return "arcology_stack_cells";
		return "arcology_stack";
	},
	arcology_launch: () => {
		if (V.sublocation === "arcology_deck" || V.xchange?.arcology?.voyage?.escort === "loyalists") return "arcology_ship_deck";
		return V.sublocation === "arcology_leisure" ? "arcology_ship_leisure" : "arcology_ship";
	},
	lake: () => (["fishingForestLake", "lakefishingrock"].includes(V.bus) ? "lake-rock" : "lake"),
	estate: () => (V.bus === "estate_cottage" ? "estate_cottage" : "estate"),
	farm: () => (["farmroad6", "farm"].includes(V.bus) ? "farm" : "underground_farm"),
	mines: () => "underground",
	get() {
		if (typeof this[V.location] === "function") {
			return this[V.location]();
		}
		if (setup.LocationImages && Object.hasOwn(setup.LocationImages, V.location)) {
			return V.location;
		}
		return "home";
	},
};

/**
	NOTE: When adding animation frameDelay - use multiples of 50 millseconds only
	(such as 50, 100, 150, 200, 1000, 5000, etc.)
	If we want smoother animations (than 20 fps):
		- Change the updateRate in layer-location.js
 */

setup.LocationImages = {
	adult_shop: {
		folder: "adult-shop",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			windows: {
				condition: () => V.adultshopstate !== "closed" && (Time.dayState === "dusk" || Time.dayState === "night"),
				image: "emissive-windows.png",
				color: "#cf51ca",
				size: 2,
				intensity: 1.5,
			},
			heart: {
				condition: () => V.adultshopstate !== "closed" && (Time.dayState === "dusk" || Time.dayState === "night"),
				image: "emissive-heart.png",
				color: "#ff4fd6",
				animation: {
					frameDelay: 800,
					cycleDelay: () => 600,
				},
				size: 1,
			},
			red: {
				condition: () => V.adultshopstate !== "closed" && (Time.dayState === "dusk" || Time.dayState === "night"),
				image: "emissive-red.png",
				color: "#ff1d2f",
				size: 1,
			},
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 7,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	alex_cottage: {
		folder: "alex-cottage",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 12,
					bottom: 0,
				},
			},
		},
	},
	alex_farm: {
		folder: "alex-farm",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 9,
					bottom: 0,
				},
				fog: {
					top: 16,
					bottom: 0,
				},
			},
		},
	},
	arcade: {
		folder: "arcade",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			red: {
				image: "emissive-red.png",
				color: "#e36c59",
				size: 5,
			},
			yellow: {
				image: "emissive-yellow.png",
				condition: () => Weather.lightsOn,
				color: "#dcdb99cc",
				size: 5,
			},
			green: {
				image: "emissive-green.png",
				condition: () => Weather.lightsOn,
				color: "#4bc248",
				size: 5,
			},
			orange: {
				image: "emissive-orange.png",
				condition: () => Weather.lightsOn,
				color: "#f59442",
				size: 5,
			},
			purple: {
				image: "emissive-purple.png",
				condition: () => Weather.lightsOn,
				color: "#cf51ca",
				size: 5,
			},
			blue: {
				image: "emissive-blue.png",
				condition: () => Weather.lightsOn,
				color: "#4f6edb",
				size: 5,
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
				verticalSpeed: 0.05,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.4,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 8,
					bottom: 0,
				},
			},
		},
	},
	asylum: {
		folder: "asylum",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			clockMinute: {
				condition: () => V.hallucinations < 1,
				image: "clock-1.png",
				frame: () => {
					const numFrames = 8;
					const segmentSize = 60 / numFrames;
					return Math.floor(((Time.minute + segmentSize / 2) / segmentSize) % numFrames);
				},
			},
			clockHour: {
				condition: () => V.hallucinations < 1,
				image: "clock-2.png",
				frame: () => {
					const numFrames = 8;
					const segmentSize = 12 / numFrames;
					return Math.floor((((Time.hour % 12) + segmentSize / 2) / segmentSize) % numFrames);
				},
			},
			clockHallucinationMinute: {
				condition: () => V.hallucinations >= 1,
				image: "clock-1.png",
				animation: {
					frameDelay: 100,
					cycleDelay: () => 0,
				},
			},
			clockHallucinationHour: {
				condition: () => V.hallucinations >= 1,
				image: "clock-2.png",
				animation: {
					frameDelay: 1000,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 6,
					bottom: 0,
				},
			},
		},
	},
	avery_mansion: {
		folder: "avery-mansion",
		base: {
			default: {
				image: "base.png",
				condition: () => V.avery_fate !== "fallen" && V.avery_fate !== "kicked",
			},
			pool: {
				image: "pool.png",
				condition: () => V.avery_fate !== "fallen" && V.avery_fate !== "kicked",
			},
			fire: {
				image: "base-fire.png",
				condition: () => V.avery_mansion_fire_time > 0,
				animation: {
					frameDelay: 150,
				},
			},
			ruin: {
				image: "base-burnt.png",
				condition: () => !V.avery_mansion_fire_time && (V.avery_fate === "fallen" || V.avery_fate === "kicked"),
			},
		},
		emissive: {
			white: {
				image: "emissive-white.png",
				condition: () => V.avery_fate !== "fallen" && V.avery_fate !== "kicked",
				color: "#ffffff",
				size: 5,
			},
			yellow: {
				image: "emissive-yellow.png",
				condition: () => Weather.lightsOn && V.avery_fate !== "fallen" && V.avery_fate !== "kicked",
				size: 5,
			},
			fire: {
				image: "fire-particle.png",
				condition: () => V.avery_mansion_fire_time > 0,
				animation: {
					frameDelay: 150,
				},
				color: "#e6502eff",
				strength: 1,
			},
			dust: {
				image: "fire-particle-dust.png",
				condition: () => V.avery_mansion_fire_time > 0,
				color: "#46221bff",
				animation: {
					frameDelay: 150,
					cycleDelay: () => random(0, 4, true) * 1000,
				},
				strength: 0.1,
			},
		},
		reflective: {
			mask: {
				image: "pool-fire.png",
				condition: () => V.avery_mansion_fire_time > 0,
				verticalFactor: 3.5,
				amplitude: 6,
				verticalSpeed: 0.1,
				horizon: 30,
			},
		},
		weather: {
			fogDistributionCurve: 0,
			rainSplashEnabled: false,
			fogEnabled: false,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 0,
					bottom: 0,
				},
			},
		},
	},
	avery_skyscraper: {
		folder: "avery-skyscraper",
		base: {
			default: {
				image: "base.png",
				condition: () => V.avery_tower.progress >= 80,
			},
			default_mid: {
				image: "base-mid.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 1200,
				},
				condition: () => V.avery_tower.progress >= 40 && V.avery_tower.progress < 80,
			},
			default_low: {
				image: "base-low.png",
				condition: () => V.avery_tower.progress < 40,
			},
			base_fire: {
				image: "base-fire.png",
				condition: () => V.avery_skyscraper_fire_time > 1,
			},
			burnt: {
				image: "base-burnt.png",
				condition: () => (V.avery_fate === "saved" || V.avery_fate === "fallen" || V.avery_fate === "kicked") && !V.avery_skyscraper_fire_time,
			},
			winter: {
				image: "winter.png",
				condition: () => Time.season === "winter" && V.avery_tower.progress >= 80,
			},
			mid_winter: {
				image: "mid-winter.png",
				condition: () => Time.season === "winter" && V.avery_tower.progress >= 40 && V.avery_tower.progress < 80,
			},
		},
		emissive: {
			lights: {
				image: "lights.png",
				condition: () =>
					Time.dayState === "night" && V.avery_tower.progress >= 100 && V.avery_fate !== "saved" && V.avery_fate !== "fallen" && V.avery_fate !== "kicked",
				color: "#deae66",
				size: 5,
			},
			mid_lights: {
				image: "mid-lights.png",
				condition: () => Time.dayState === "night" && V.avery_tower.progress < 80,
				color: "#deae66",
				size: 5,
			},
			fire: {
				image: "fire.png",
				condition: () => V.avery_skyscraper_fire_time > 0,
				animation: {
					frameDelay: 150,
				},
				color: "#e6502eff",
				strength: 1,
			},
		},
		weather: {
			fogDistributionCurve: 5,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 12,
					bottom: 0,
				},
			},
		},
	},
	beach: {
		folder: "beach",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			foam: {
				image: "waves.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			waves: {
				image: "waves.png",
				alpha: 0.5,
				alwaysDisplay: false,
				compositeOperation: "overlay",
				animation: "foam",
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.4,
			},
		},
		layerTop: {
			tree: {
				image: "tree.png",
				animation: {
					frameDelay: 350,
					cycleDelay: () => 3250,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 12,
					bottom: 0,
				},
				fog: {
					top: 14,
					bottom: 0,
				},
			},
		},
	},
	blitz: {
		folder: "blitz",
		base: {
			default: {
				condition: () => ["home", "manor", "winter"].includes(V.bus),
				image: "base.png",
			},
			street: {
				condition: () => !["home", "manor", "winter"].includes(V.bus),
				image: "base-street.png",
			},
			smoke: {
				condition: () => ["home", "manor", "winter"].includes(V.bus) && !T.smokeOff,
				image: "smoke.png",
				animation: {
					frameDelay: 200,
					cycleDelay: 0,
				},
			},
			smoke_street: {
				condition: () => !["home", "manor", "winter"].includes(V.bus),
				image: "smoke-street.png",
				animation: {
					frameDelay: 220,
					cycleDelay: 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 19,
					bottom: 0,
				},
				fog: {
					top: 24,
					bottom: 0,
				},
			},
		},
	},
	bog: {
		folder: "bog",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 2000,
					cycleDelay: () => 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 2000,
					cycleDelay: () => 1000,
				},
			},
		},
		emissive: {
			bloodmoon: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood.png",
				color: "#e63e3e66",
				size: 15,
			},
			lights: {
				image: "emissive.png",
				condition: () => !Weather.bloodMoon && Time.dayState === "night" && Time.season !== "autumn" && Time.season !== "winter",
				color: "#deae66",
				size: 4,
				animation: {
					frameDelay: 250,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 12,
					bottom: 0,
				},
				fog: {
					top: 16,
					bottom: 0,
				},
			},
		},
	},
	brothel: {
		folder: "brothel",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			size: 5,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 2,
					bottom: 0,
				},
				fog: {
					top: 7,
					bottom: 0,
				},
			},
		},
	},
	mma_gym: {
		folder: "mma-gym",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			size: 4,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,
			groundBounds: {
				splashes: { top: 2, bottom: 0 },
				fog: { top: 7, bottom: 0 },
			},
		},
	},
	// The underground colosseum: fully indoor, like the Arcology interiors.
	colosseum: {
		folder: "colosseum",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffffff",
				size: 2,
			},
			crowd: {
				condition: () => setup.arcology.sceneMotion(),
				image: "crowd.png",
				color: "#ffffff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			crowdStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "crowd.png",
				color: "#ffffff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	seaspray_hotel: {
		folder: "seaspray-hotel",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			size: 4,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,
			groundBounds: {
				splashes: { top: 3, bottom: 0 },
				fog: { top: 8, bottom: 0 },
			},
		},
	},
	cabin: {
		folder: "cabin",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			snowroof: {
				condition: () => Weather.isSnow,
				image: "snowroof.png",
				animation: {
					frameDelay: 250,
					cycleDelay: () => random(3, 7, true) * 1000,
				},
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: false,
			fogEnabled: true,
			fogOpacity: 0.5,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 20,
					bottom: 0,
				},
			},
		},
		particles: [
			{
				condition: () => Weather.isSnow || (!Weather.isSnow && Weather.lightsOn),
				type: "smoke",
				shape: "image",
				image: "img/misc/sky/clouds/fog/2.png",
				origin: [30, 60],
				rate: 3,
				size: 4,
				riseSpeed: 3,
				spread: 2,
				alpha: 0.2,
				color: "rgba(195, 195, 195, 0.43)",
				windSpeed: 1,
				windDirection: 1,
				minFadeDistance: 5,
				maxFadeDistance: 10,
				fadeTime: 4,
				driftAmplitude: 1,
				driftWavelength: 10,
			},
		],
	},
	cafe: {
		folder: "cafe",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.5,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 8,
					bottom: 0,
				},
			},
		},
	},
	cafe_construction: {
		folder: "cafe-construction",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.5,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 10,
					bottom: 0,
				},
			},
		},
	},
	cafe_renovated: {
		folder: "cafe-renovated",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.5,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 10,
					bottom: 0,
				},
			},
		},
	},
	canal: {
		folder: "canal",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			drip: {
				condition: () => Weather.isSnow,
				image: "drip.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalSpeed: 0.1,
				verticalFactor: 3,
				amplitude: 6,
			},
			overlay: {
				image: "water.png",
				condition: () => !Weather.isSnow,
				compositeOperation: "overlay",
				alpha: 0.5,
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				alpha: 0.9,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 25,
					bottom: 0,
				},
			},
		},
	},
	chalets: {
		folder: "chalets",
		base: {
			default: {
				image: "base.png",
			},
			foam: {
				image: "waves.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			waves: {
				image: "waves.png",
				alpha: 0.5,
				alwaysDisplay: false,
				compositeOperation: "overlay",
				animation: "foam",
			},
		},
		layerTop: {
			tree: {
				image: "tree.png",
				animation: {
					frameDelay: 350,
					cycleDelay: () => 3250,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#c26802",
			size: 1,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 14,
					bottom: 0,
				},
				fog: {
					top: 16,
					bottom: 0,
				},
			},
		},
	},
	churchyard: {
		folder: "churchyard",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#a8b5ff",
			size: 2,
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 27,
					bottom: 0,
				},
			},
		},
	},
	coastpath: {
		folder: "coastal-path",
		base: {
			default: {
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			flower: {
				condition: () => !Weather.isSnow,
				image: "flower.png",
				animation: {
					frameDelay: 500,
					cycleDelay: () => random(5, 30, true) * 1000,
				},
			},
			bunny: {
				condition: () => Time.dayState !== "night",
				image: "bunny.png",
				animation: {
					frameDelay: 150,
					cycleDelay: () => random(10, 40, true) * 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				compositeOperation: "overlay",
				verticalFactor: 4,
				amplitude: 20,
				frequency: 15,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				animation: {
					frameDelay: 250,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 13,
					bottom: 0,
				},
				fog: {
					top: 15,
					bottom: 0,
				},
			},
		},
	},
	"cliff-dock": {
		folder: "cliff-dock",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				compositeOperation: "overlay",
				verticalFactor: 4,
				amplitude: 20,
				frequency: 15,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				animation: {
					frameDelay: 250,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 0,
					bottom: 0,
				},
			},
		},
	},
	com_alley: {
		folder: "com-alley",
		base: {
			default: {
				condition: () => !Weather.bloodMoon && !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 30, true) * 1000,
				},
			},
			blood: {
				condition: () => Weather.bloodMoon && !Weather.isSnow,
				image: "blood-moon.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(10, 60, true) * 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 22,
					bottom: 0,
				},
			},
		},
	},
	compound: {
		folder: "compound",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			smoke: {
				condition: () => !Weather.bloodMoon,
				image: "smoke.png",
				animation: {
					frameDelay: 300,
					cycleDelay: 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 4,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 4,
					bottom: 0,
				},
				fog: {
					top: 13,
					bottom: 0,
				},
			},
		},
	},
	dance_studio: {
		folder: "dance-studio",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 3,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 4,
					bottom: 0,
				},
				fog: {
					top: 10,
					bottom: 0,
				},
			},
		},
	},
	dilapidated_shop: {
		folder: "dilapidated-shop",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 3,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 7,
					bottom: 0,
				},
				fog: {
					top: 14,
					bottom: 0,
				},
			},
		},
	},
	docks: {
		folder: "docks",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			boat: {
				// Not at same time as cruiser
				waitForAnimation: "cruiser",
				image: "boat.png",
				animation: {
					frameDelay: 6000,
					cycleDelay: () => random(2, 20, true) * 1000,
					startFrame: () => random(1, 24, true),
				},
			},
			cruiser: {
				condition: () => Time.dayState !== "night",
				// Not at same time as boat
				waitForAnimation: "boat",
				image: "cruiser.png",
				animation: {
					frameDelay: 9000,
					cycleDelay: () => random(2, 20, true) * 1000,
					startFrame: () => (random(0, 1, true) ? random(0, 24, true) : 0),
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 4,
				amplitude: 20,
				frequency: 15,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.4,
			},
			waves: {
				condition: () => Weather.value >= 3, // light precipitation or above
				image: "waves.png",
				alpha: 0.8,
				alwaysDisplay: false,
				compositeOperation: "overlay",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 1000,
				},
			},
			waves2: {
				image: "waves.png",
				condition: () => Weather.value >= 4, // heavy precipitation or above
				alpha: 0.8,
				alwaysDisplay: false,
				compositeOperation: "overlay",
				animation: {
					startDelay: 3000,
					frameDelay: 200,
					cycleDelay: () => 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 3,
					bottom: 0,
				},
				fog: {
					top: 20,
					bottom: 0,
				},
			},
		},
	},
	drain: {
		folder: "drain",
		base: {
			default: {
				image: "base.png",
			},
			drain: {
				condition: () => !Weather.isFreezing,
				image: "drain.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
			water: {
				image: "water.png",
				animation: {
					frameDelay: 1000,
					cycleDelay: () => 2000,
				},
			},
		},
		// reflective: {
		// 	mask: {
		// 		image: "reflective.png",
		// 	},
		// 	water: {
		// 		image: "water.png",
		// 		animation: {
		// 			frameDelay: 1000,
		// 			cycleDelay: () => 2000,
		// 		},
		// 	},
		// },

		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 20,
					bottom: 0,
				},
				fog: {
					top: 26,
					bottom: 0,
				},
			},
		},
	},
	estate: {
		folder: "estate",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			condition: () => Weather.lightsOn,
			image: "emissive.png",
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	factory: {
		folder: "factory",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			lorry_back: {
				condition: () => Time.dayState !== "night" && Time.dayState !== "day",
				image: "lorry-back.png",
			},
			lorry_front: {
				condition: () => Time.dayState !== "night",
				image: "lorry-front.png",
			},
			gate: {
				condition: () => Time.dayState !== "night",
				image: "gate.png",
			},
			inside: {
				condition: () => Time.dayState !== "night",
				image: "inside.png",
				waitForAnimation: "lorry-moving",
				animation: {
					frameDelay: 150,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			lorry_moving: {
				condition: () => Time.dayState !== "night",
				image: "lorry-moving.png",
				waitForAnimation: "inside",
				animation: {
					frameDelay: 150,
					cycleDelay: () => random(10, 30, true) * 1000,
				},
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn,
				size: 3,
				color: "#e7eb81",
			},
			stop_lights: {
				image: "lights-emissive.png",
				alwaysDisplay: true,
				animation: "lorry-moving",
				size: 5,
				color: "#e34d4d",
			},
			lorry_lights: {
				image: "lorry-emissive.png",
				condition: () => Weather.lightsOn,
				alwaysDisplay: false,
				animation: "lorry-moving",
				size: 10,
				color: "#f7e092",
			},
			lorry_back_lights: {
				image: "lorry-back-emissive.png",
				alwaysDisplay: false,
				animation: "lorry-moving",
				size: 4,
				color: "#e34d4d",
			},
			inside_lights: {
				image: "inside-emissive.png",
				condition: () => Weather.lightsOn,
				alwaysDisplay: false,
				animation: "inside",
				color: "#e6cc77",
			},
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 10,
					bottom: 0,
				},
				fog: {
					top: 13,
					bottom: 0,
				},
			},
		},
	},
	farm: {
		folder: "farm",
		base: {
			default: {
				condition: () => !Weather.isSnow && Time.season !== "winter",
				image: "base.png",
			},
			winter: {
				condition: () => !Weather.isSnow && Time.season === "winter",
				image: "winter.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			wind_base: {
				condition: () => !Weather.isSnow && Time.season !== "winter",
				image: "wind-base.png",
				animation: {
					frameDelay: 1000,
				},
			},
			wind_winter: {
				condition: () => !Weather.isSnow && Time.season === "winter",
				image: "wind-winter.png",
				animation: {
					frameDelay: 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 15,
					bottom: 0,
				},
				fog: {
					top: 19,
					bottom: 0,
				},
			},
		},
	},
	farm_manors: {
		folder: "farm-manors",
		base: {
			default: {
				condition: () => Time.season !== "winter",
				image: "base.png",
			},
			winter: {
				condition: () => Time.season === "winter",
				image: "base-winter.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 28,
					bottom: 0,
				},
			},
		},
	},
	fields: {
		folder: "fields",
		base: {
			watchtower: {
				condition: () => V.farm.tower >= 1,
				image: "watchtower.png",
			},
			spring: {
				condition: () => !Weather.isSnow && Time.season === "spring",
				image: "spring.png",
			},
			summer: {
				condition: () => !Weather.isSnow && Time.season === "summer",
				image: "summer.png",
			},
			autumn: {
				condition: () => !Weather.isSnow && Time.season === "autumn",
				image: "autumn.png",
			},
			winter: {
				condition: () => !Weather.isSnow && Time.season === "winter",
				image: "winter.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			wind: {
				image: "wind.png",
				animation: {
					frameDelay: 100,
					cycleDelay: () => 4000,
					startDelay: () => 150,
				},
			},
		},
		emissive: {
			condition: () => V.farm.tower >= 1 && Weather.lightsOn,
			image: "emissive.png",
			color: "#deae66",
			blur: 0,
			intensity: 0.8,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 21,
					bottom: 0,
				},
				fog: {
					top: 23,
					bottom: 0,
				},
			},
		},
	},
	flats: {
		folder: "flats",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			water: {
				image: "sea.png",
			},
			power: {
				image: "power-lines.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn,
				alwaysDisplay: false,
				color: "#deae66",
				intensity: 0.8,
				size: 2,
			},
			streetLight: {
				condition: () => Weather.lightsOn,
				image: "street-light.png",
				color: "#e8d39d",
				size: 4,
			},
			streetGlow: {
				condition: () => Weather.lightsOn,
				image: "street-glow.png",
				intensity: 0.5,
				color: "#deae6655",
				size: 2,
			},
		},
		// reflective: {
		// 	image: "reflective.png",
		// },

		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 7,
					bottom: 0,
				},
			},
		},
	},
	forest: {
		folder: "forest",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			birds_light: {
				condition: () => !Weather.bloodMoon,
				image: "birds-light.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			bloodmoon: {
				condition: () => Weather.bloodMoon,
				image: "blood-moon.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(2, 7, true) * 1000,
				},
			},
		},
		emissive: {
			blood0: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood-0.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(2, 7, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood1: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood-1.png",
				animation: {
					frameDelay: 2000,
					cycleDelay: () => random(4, 10, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood2: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood-2.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(4, 11, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood3: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood-3.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(3, 12, true) * 1000,
				},
				color: "#e63e3e",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 30,
					bottom: 0,
				},
			},
		},
	},
	forest_shop: {
		folder: "forest-shop",
		base: {
			spring: {
				condition: () => !Weather.isSnow && Time.season === "spring",
				image: "spring.png",
			},
			summer: {
				condition: () => !Weather.isSnow && Time.season === "summer",
				image: "summer.png",
			},
			autumn: {
				condition: () => !Weather.isSnow && Time.season === "autumn",
				image: "autumn.png",
			},
			winter: {
				condition: () => !Weather.isSnow && Time.season === "winter",
				image: "winter.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			front_spring: {
				condition: () => Time.season === "spring",
				image: "front-spring.png",
			},
			front_summer: {
				condition: () => Time.season === "summer",
				image: "front-summer.png",
			},
			front_autumn: {
				condition: () => Time.season === "autumn",
				image: "front-autumn.png",
			},
			front_winter: {
				condition: () => Time.season === "winter",
				image: "front-winter.png",
			},
			smoke: {
				condition: () => !Weather.bloodMoon && !Weather.lightsOn,
				image: "smoke.png",
				animation: {
					frameDelay: 200,
				},
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn && !V.gwylan?.timer?.nobody && !V.yearningLetter,
			},
			tower: {
				image: "emissive-tower-only.png",
				condition: () => Weather.lightsOn && !V.gwylan?.timer?.nobody && V.yearningLetter,
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 13,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	forest_shop_garden: {
		folder: "forest-shop-garden",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			smoke: {
				condition: () => !Weather.bloodMoon && !Weather.lightsOn,
				image: "smoke.png",
				animation: {
					frameDelay: 200,
				},
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn && !V.gwylan?.timer?.nobody,
			animation: {
				frameDelay: 190,
			},
			color: "#89CFF0",
			intensity: 1.2,
			size: 2,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 21,
					bottom: 0,
				},
				fog: {
					top: 27,
					bottom: 0,
				},
			},
		},
	},
	home: {
		folder: "home",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		particles: [
			{
				condition: () => !Weather.bloodMoon,
				type: "smoke",
				shape: "image",
				image: "img/misc/sky/clouds/fog/2.png",
				origin: [3, 71.5], // Coordinates from the top left
				rate: 3, // Particles generated per second
				size: 4, // Size of the particle in px
				riseSpeed: 0.8,
				spread: 5,
				alpha: 1,
				color: "#4c4c4cff", // Last 2 numbers are the alpha (99 in hex means 60%)
				windSpeed: 2, // strength of the wind, will push the particles in a direction
				windDirection: 0, // degrees - A value of 0 is right (east)
				minFadeDistance: 1, // minimum fade time of the particles (in distance (px))
				maxFadeDistance: 35, // maximum fade time
				fadeTime: 1.2, // In seconds
				driftAmplitude: 0, // curve - mostly useful if we want the smoke to travel straight up (but in a wobbly curve)
				driftWavelength: 0, // wavelength of the curve
			},
			{
				condition: () => !Weather.bloodMoon,
				type: "smoke",
				shape: "image",
				image: "img/misc/sky/clouds/fog/2.png",
				origin: [20, 69],
				rate: 3,
				size: 4,
				riseSpeed: 0.8,
				spread: 7,
				alpha: 1,
				color: "#484848ff",
				windSpeed: 2,
				windDirection: 0,
				minFadeDistance: 1,
				maxFadeDistance: 30,
				fadeTime: 1.2,
				driftAmplitude: 0,
				driftWavelength: 0,
			},
		],

		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 2,
					bottom: 0,
				},
				fog: {
					top: 7,
					bottom: 0,
				},
			},
		},
	},
	hospital: {
		folder: "hospital",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 13,
					bottom: 0,
				},
				fog: {
					top: 18,
					bottom: 0,
				},
			},
		},
	},
	ind_alley: {
		folder: "ind-alley",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(4, 15, true) * 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(4, 15, true) * 1000,
				},
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 18,
					bottom: 0,
				},
			},
		},
	},
	island: {
		folder: "island",
		base: {
			default: {
				image: "base.png",
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalDirection: 1,
			},
			overlay: {
				image: "water.png",
				animation: {
					frameDelay: 500,
				},
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 16,
					bottom: 0,
				},
				fog: {
					top: 29,
					bottom: 0,
				},
			},
		},
	},
	kylar_manor: {
		folder: "kylar-manor",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#fbff86dd",
			size: 4,
			intensity: 0.8,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 4,
					bottom: 0,
				},
				fog: {
					top: 19,
					bottom: 0,
				},
			},
		},
	},
	kylarmanor_grounds: {
		folder: "kylar-manor-grounds",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#9484d1",
			size: 2,
			intensity: 0.4,
		},
		weather: {
			fogDistributionCurve: 4,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 18,
					bottom: 0,
				},
				fog: {
					top: 30,
					bottom: 0,
				},
			},
		},
	},
	lake: {
		folder: "lake",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			deer: {
				condition: () => !Weather.isSnow && Time.dayState === "dawn",
				image: "deer.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 12000,
				},
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn && Time.season !== "winter" && Time.season !== "autumn",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
				color: "#deae66",
				strength: 2,
			},
			blood0: {
				condition: () => Weather.bloodMoon,
				image: "blood-0.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(2, 7, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood1: {
				condition: () => Weather.bloodMoon,
				image: "blood-1.png",
				animation: {
					frameDelay: 2000,
					cycleDelay: () => random(4, 10, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood2: {
				condition: () => Weather.bloodMoon,
				image: "blood-2.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(4, 11, true) * 1000,
				},
				color: "#e63e3e",
			},
		},
		reflective: {
			mask: {
				animationCondition: () => !Weather.isFrozen("lake"),
				image: "reflective.png",
				horizon: 18,
				blur: 0.4,
				verticalDirection: 1,
			},
			water: {
				condition: () => !Weather.isFrozen("lake"),
				image: "water.png",
				alpha: () => (!Weather.isFrozen("lake") ? 0.35 : 0.8),
			},
			glimmer: {
				condition: () => V.options.reflections && !Weather.isFrozen("lake"),
				image: "glimmer.png",
				compositeOperation: "overlay",
				alpha: 0.5,
				gradientMask: true,
				animation: {
					slider: true,
					frames: 150,
					frameDelay: 150,
				},
			},
			ice: {
				condition: () => Weather.isFrozen("lake"),
				image: "ice.png",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 9,
					bottom: 0,
				},
				fog: {
					top: 30,
					bottom: 0,
				},
			},
		},
	},
	"lake-rock": {
		folder: "lake-rock",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn && Time.season !== "winter" && Time.season !== "autumn",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
				color: "#deae66",
				strength: 2,
			},
			blood0: {
				condition: () => Weather.bloodMoon,
				image: "blood-0.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(2, 7, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood1: {
				condition: () => Weather.bloodMoon,
				image: "blood-1.png",
				animation: {
					frameDelay: 2000,
					cycleDelay: () => random(4, 10, true) * 1000,
				},
				color: "#e63e3e",
			},
			blood2: {
				condition: () => Weather.bloodMoon,
				image: "blood-2.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(4, 11, true) * 1000,
				},
				color: "#e63e3e",
			},
		},
		reflective: {
			mask: {
				animationCondition: () => !Weather.isFrozen("lake"),
				image: "reflective.png",
				horizon: 39,
				blur: 0.4,
				verticalDirection: 1,
			},
			water: {
				condition: () => !Weather.isFrozen("lake"),
				image: "water.png",
				alpha: () => (!Weather.isFrozen("lake") ? 0.35 : 0.8),
			},
			glimmer: {
				condition: () => V.options.reflections && !Weather.isFrozen("lake"),
				image: "glimmer.png",
				compositeOperation: "overlay",
				alpha: 0.5,
				gradientMask: true,
				animation: {
					slider: true,
					frames: 150,
					frameDelay: 150,
				},
			},
			ice: {
				condition: () => Weather.isFrozen("lake"),
				image: "ice.png",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,
			groundBounds: {
				splashes: {
					top: 18,
					bottom: 0,
				},
				fog: {
					top: 30,
					bottom: 18,
				},
			},
		},
	},
	lake_office: {
		folder: "lake-office",
		base: {
			default: {
				condition: () => Time.season !== "winter",
				image: "base.png",
			},
			waterbase: {
				image: "water.png",
			},
			snow: {
				condition: () => Time.season === "winter",
				image: "snow.png",
			},
			ice: {
				condition: () => Weather.isFrozen("lake"),
				image: "ice.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn && Time.season !== "winter" && Time.season !== "autumn",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
				color: "#deae66",
				strength: 2,
			},
			heater: {
				image: "emissive-winter.png",
				condition: () => !Weather.lightsOn && Time.season === "winter",
				color: "#ff5724",
				strength: 1,
			},
			heaterdim: {
				image: "emissive-winter.png",
				condition: () => Weather.lightsOn && Time.season === "winter",
				color: "#360c01",
				strength: 1,
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				horizon: 18,
				blur: 0.5,
				verticalDirection: () => (!Weather.isFrozen("lake") ? 1 : 0),
				alpha: () => (!Weather.isFrozen("lake") ? 0.6 : 0.15),
			},
		},
		weather: {
			fogDistributionCurve: 5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 14,
					bottom: 0,
				},
				fog: {
					top: 34,
					bottom: 0,
				},
			},
		},
	},
	lake_ruin: {
		folder: "lake-ruin",
		base: {
			default: {
				condition: () => !Weather.bloodMoon && !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 3000,
					cycleDelay: () => 5000,
				},
			},
			snow: {
				condition: () => !Weather.bloodMoon && Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 3000,
					cycleDelay: () => 5000,
				},
			},
			bloodmoon: {
				condition: () => Weather.bloodMoon && Weather.isSnow,
				image: "blood-moon.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
			blood_moon_snow: {
				condition: () => Weather.bloodMoon && !Weather.isSnow,
				image: "blood-moon-snow.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
		},
		emissive: {
			blood: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood.png",
				animation: "bloodmoon",
				color: "#e63e3e",
			},
		},
		reflective: {
			mask: {
				condition: () => !Weather.bloodMoon,
				image: "reflective.png",
			},
			water: {
				condition: () => !Weather.bloodMoon,
				image: "water.png",
				alpha: 0.5,
				animation: {
					frameDelay: 1000,
					cycleDelay: () => 0,
				},
			},
		},
		// 	bloodMoon: {
		// 		condition: () => Weather.bloodMoon,
		// 		image: "reflective-blood.png",
		// 	},
		// 	horizon: 112,
		// },

		weather: {
			fogDistributionCurve: 0,
			rainSplashEnabled: false,
			fogEnabled: false,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 0,
					bottom: 0,
				},
			},
		},
	},
	landfill: {
		folder: "landfill",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 16,
					bottom: 0,
				},
			},
		},
	},
	market: {
		folder: "market",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	townhall: {
		folder: "town-hall",
		base: {
			default: {
				image: "base.png",
			},
			trees: {
				condition: () => Time.season !== "winter",
				image: "trees.png",
			},
			trees_winter: {
				condition: () => Time.season === "winter",
				image: "trees-winter.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66",
			strength: 2,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 9,
					bottom: 0,
				},
				fog: {
					top: 15,
					bottom: 0,
				},
			},
		},
	},
	meadow: {
		folder: "meadow",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			wind: {
				image: "wind.png",
				animation: {
					frameDelay: 100,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => !Weather.bloodMoon && Time.dayState === "night" && Time.season !== "autumn" && Time.season !== "winter",
				color: "#deae66",
				size: 4,
				animation: {
					frameDelay: 200,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 21,
					bottom: 0,
				},
				fog: {
					top: 26,
					bottom: 0,
				},
			},
		},
	},
	mer_pier: {
		folder: "mer-pier",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 4,
				amplitude: 20,
				frequency: 15,
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.4,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 25,
					bottom: 0,
				},
				fog: {
					top: 12,
					bottom: 0,
				},
			},
		},
	},
	mines: {
		folder: "mines",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#deae66",
				size: 4,
				animation: {
					frameDelay: 200,
				},
			},
		},
		weather: {
			fogDistributionCurve: 0,
			rainSplashEnabled: false,
			fogEnabled: false,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 0,
					bottom: 0,
				},
			},
		},
	},
	moor: {
		folder: "moor",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			grass: {
				image: "grass.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(1, 8, true) * 1000,
				},
			},
			wind: {
				image: "wind.png",
				animation: {
					frameDelay: 100,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
		},
		// reflective: {
		// 	image: "reflective.png",
		// 	horizon: 112,
		// },

		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 22,
					bottom: 0,
				},
				fog: {
					top: 24,
					bottom: 0,
				},
			},
		},
	},
	museum: {
		folder: "museum",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			grass: {
				condition: () => Time.season === "autumn",
				image: "grass-autumn.png",
			},
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 10,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	night_monster_lair: {
		folder: "night-monster-lair",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			beast: {
				image: "beast.png",
				condition: () => Time.dayState === "dawn",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(1, 5, true) * 1000,
				},
			},
			drip: {
				image: "drip.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 4000,
				},
			},
			flies: {
				image: "drip.png",
				condition: () => Time.dayState !== "dawn",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
			rat: {
				image: "rat.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(10, 30, true) * 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 2,
					bottom: 0,
				},
			},
		},
	},
	oak: {
		folder: "oak",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 2.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 7,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	office: {
		folder: "office",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			grass: {
				condition: () => Time.season === "autumn",
				image: "grass-autumn.png",
			},
		},
		emissive: {
			default: {
				condition: () => Weather.lightsOn,
				image: "emissive.png",
			},
			evening: {
				condition: () => Weather.lightsOn && Time.dayState === "dusk",
				image: "emissive-evening.png",
			},
			redBlinkingLight: {
				image: "red.png",
				color: "#ff5058",
				size: 3,
				animation: {
					frameDelay: 1000,
					cycleDelay: () => 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Inside the Arcology dome: no rain, snow, fog, or snow cover.
	// Each animated layer has a still twin, shown when setup.arcology.sceneMotion() is off (reduced motion or the Glitch effects setting).
	arcology: {
		folder: "arcology",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			windows: {
				condition: () => Weather.lightsOn,
				image: "windows.png",
				color: "#7fe9ff",
				size: 1,
			},
			signs: {
				condition: () => Weather.lightsOn,
				image: "emissive.png",
				color: "#ff4fd6",
				size: 2,
				intensity: 1.2,
			},
			holo: {
				condition: () => setup.arcology.sceneMotion(),
				image: "holo.png",
				color: "#7fe9ff",
				size: 3,
				animation: {
					frameDelay: 400,
				},
			},
			holoStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "holo.png",
				color: "#7fe9ff",
				size: 3,
				frame: () => 0,
			},
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#b9a6ff",
				size: 2,
				animation: {
					frameDelay: 350,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#b9a6ff",
				size: 2,
				frame: () => 0,
			},
			flicker: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffd36b",
				size: 1,
				animation: {
					frameDelay: 100,
					cycleDelay: () => random(2500, 6000),
				},
			},
			flickerStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffd36b",
				size: 1,
				frame: () => 0,
			},
			tram: {
				condition: () => setup.arcology.sceneMotion(),
				image: "tram.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 250,
					cycleDelay: () => 4000,
				},
			},
			tramStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "tram.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 3,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The Stack: debt labour in the rock under the island.
	arcology_stack: {
		folder: "arcology-stack",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff9a3c",
				size: 2,
			},
			drones: {
				condition: () => setup.arcology.sceneMotion(),
				image: "drones.png",
				color: "#ff3c46",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			dronesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "drones.png",
				color: "#ff3c46",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	arcology_stack_reclamation: {
		folder: "arcology-stack-reclamation",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#e6f0ff",
			size: 2,
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: { top: 8, bottom: 0 },
				fog: { top: 11, bottom: 0 },
			},
		},
	},
	arcology_stack_loading: {
		folder: "arcology-stack-loading",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#ff9a3c",
			size: 1,
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: { top: 8, bottom: 0 },
				fog: { top: 11, bottom: 0 },
			},
		},
	},
	arcology_stack_bunks: {
		folder: "arcology-stack-bunks",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#ffc878",
			size: 1,
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: { top: 8, bottom: 0 },
				fog: { top: 11, bottom: 0 },
			},
		},
	},
	arcology_stack_cells: {
		folder: "arcology-stack-cells",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#ff3c46",
			size: 1,
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: { top: 8, bottom: 0 },
				fog: { top: 11, bottom: 0 },
			},
		},
	},
	arcology_stack_hull: {
		folder: "arcology-stack-hull",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			image: "emissive.png",
			color: "#c8e6ff",
			size: 2,
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: { top: 8, bottom: 0 },
				fog: { top: 11, bottom: 0 },
			},
		},
	},
	// Breakwater Road: the seawall and the dome's edge over the sea.
	arcology_coast: {
		folder: "arcology-coast",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#fff0c8",
				size: 2,
			},
			waves: {
				condition: () => setup.arcology.sceneMotion(),
				image: "waves.png",
				color: "#c8f0ff",
				size: 1,
				animation: {
					frameDelay: 450,
				},
			},
			wavesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "waves.png",
				color: "#c8f0ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The foot of the dome at the end of Breakwater Road.
	arcology_domeedge: {
		folder: "arcology-domeedge",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#fff0c8",
				size: 2,
			},
			waves: {
				condition: () => setup.arcology.sceneMotion(),
				image: "waves.png",
				color: "#c8f0ff",
				size: 1,
				animation: {
					frameDelay: 450,
				},
			},
			wavesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "waves.png",
				color: "#c8f0ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The X-Change Station on Relay Street.
	arcology_xstation: {
		folder: "arcology-xstation",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff8cd2",
				size: 2,
			},
			holo: {
				condition: () => setup.arcology.sceneMotion(),
				image: "holo.png",
				color: "#ff8cd2",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			holoStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "holo.png",
				color: "#ff8cd2",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Glasshouse private lift lobby.
	arcology_glassdoor: {
		folder: "arcology-glassdoor",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			scan: {
				condition: () => setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			scanStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Afterimage, the cafe on Relay Street.
	arcology_cafe: {
		folder: "arcology-cafe",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffffff",
				size: 2,
			},
			steam: {
				condition: () => setup.arcology.sceneMotion(),
				image: "steam.png",
				color: "#ffffff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			steamStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "steam.png",
				color: "#ffffff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Unit Exchange and Halden Trust.
	arcology_bank: {
		folder: "arcology-bank",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#78ffaa",
				size: 2,
			},
			rates: {
				condition: () => setup.arcology.sceneMotion(),
				image: "rates.png",
				color: "#78ffaa",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			ratesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "rates.png",
				color: "#78ffaa",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Kessler Arms.
	arcology_arms: {
		folder: "arcology-arms",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff3240",
				size: 2,
			},
			reader: {
				condition: () => setup.arcology.sceneMotion(),
				image: "reader.png",
				color: "#ff3240",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			readerStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "reader.png",
				color: "#ff3240",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Printworks.
	arcology_print: {
		folder: "arcology-print",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffaa50",
				size: 2,
			},
			nozzles: {
				condition: () => setup.arcology.sceneMotion(),
				image: "nozzles.png",
				color: "#ffaa50",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			nozzlesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "nozzles.png",
				color: "#ffaa50",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The calibration station.
	arcology_calib: {
		folder: "arcology-calib",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			scan: {
				condition: () => setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			scanStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Island bars: The Ballast, Halcyon, The Static Room.
	arcology_bar: {
		folder: "arcology-bar",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff4fd6",
				size: 2,
			},
			sign: {
				condition: () => setup.arcology.sceneMotion(),
				image: "sign.png",
				color: "#ff4fd6",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			signStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "sign.png",
				color: "#ff4fd6",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Pulse.
	arcology_club: {
		folder: "arcology-club",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#b478ff",
				size: 2,
			},
			floor: {
				condition: () => setup.arcology.sceneMotion(),
				image: "floor.png",
				color: "#b478ff",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			floorStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "floor.png",
				color: "#b478ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Lumen Clinic, Second Skin and the health shop.
	arcology_clinic: {
		folder: "arcology-clinic",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#a0ffdc",
				size: 2,
			},
			scan: {
				condition: () => setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#a0ffdc",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			scanStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#a0ffdc",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Civic Registry.
	arcology_registry: {
		folder: "arcology-registry",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			queue: {
				condition: () => setup.arcology.sceneMotion(),
				image: "queue.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			queueStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "queue.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Enforcement headquarters.
	arcology_enforcement: {
		folder: "arcology-enforcement",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff3c50",
				size: 2,
			},
			alert: {
				condition: () => setup.arcology.sceneMotion(),
				image: "alert.png",
				color: "#ff3c50",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			alertStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "alert.png",
				color: "#ff3c50",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The contract office.
	arcology_contracts: {
		folder: "arcology-contracts",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffa05a",
				size: 2,
			},
			posting: {
				condition: () => setup.arcology.sceneMotion(),
				image: "posting.png",
				color: "#ffa05a",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			postingStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "posting.png",
				color: "#ffa05a",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Dome Broadcast studio.
	arcology_broadcast: {
		folder: "arcology-broadcast",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffd36b",
				size: 2,
			},
			ticker: {
				condition: () => setup.arcology.sceneMotion(),
				image: "ticker.png",
				color: "#ffd36b",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			tickerStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "ticker.png",
				color: "#ffd36b",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Intelligence Division.
	arcology_intel: {
		folder: "arcology-intel",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#78ffaa",
				size: 2,
			},
			marker: {
				condition: () => setup.arcology.sceneMotion(),
				image: "marker.png",
				color: "#78ffaa",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			markerStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "marker.png",
				color: "#78ffaa",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Skyline Residences lobby.
	arcology_residences: {
		folder: "arcology-residences",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffdc96",
				size: 2,
			},
			lift: {
				condition: () => setup.arcology.sceneMotion(),
				image: "lift.png",
				color: "#ffdc96",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			liftStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "lift.png",
				color: "#ffdc96",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The training hall.
	arcology_training: {
		folder: "arcology-training",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#b48cff",
				size: 2,
			},
			stream: {
				condition: () => setup.arcology.sceneMotion(),
				image: "stream.png",
				color: "#b48cff",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			streamStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "stream.png",
				color: "#b48cff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The compute floor.
	arcology_compute: {
		folder: "arcology-compute",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#78ffaa",
				size: 2,
			},
			racks: {
				condition: () => setup.arcology.sceneMotion(),
				image: "racks.png",
				color: "#78ffaa",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			racksStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "racks.png",
				color: "#78ffaa",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The holo studio.
	arcology_studio: {
		folder: "arcology-studio",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff4fd6",
				size: 2,
			},
			avatar: {
				condition: () => setup.arcology.sceneMotion(),
				image: "avatar.png",
				color: "#ff4fd6",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			avatarStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "avatar.png",
				color: "#ff4fd6",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Inside the seawall.
	arcology_hatch: {
		folder: "arcology-hatch",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff9628",
				size: 2,
			},
			beacon: {
				condition: () => setup.arcology.sceneMotion(),
				image: "beacon.png",
				color: "#ff9628",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			beaconStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "beacon.png",
				color: "#ff9628",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// A Dockside Flats stairwell.
	arcology_stairwell: {
		folder: "arcology-stairwell",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffc88c",
				size: 2,
			},
			flicker: {
				condition: () => setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffc88c",
				size: 1,
				animation: {
					frameDelay: 200,
				},
			},
			flickerStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffc88c",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The foundry floor.
	arcology_foundry: {
		folder: "arcology-foundry",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffb450",
				size: 2,
			},
			pour: {
				condition: () => setup.arcology.sceneMotion(),
				image: "pour.png",
				color: "#ffb450",
				size: 1,
				animation: {
					frameDelay: 200,
				},
			},
			pourStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "pour.png",
				color: "#ffb450",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The trading post.
	arcology_tradingpost: {
		folder: "arcology-tradingpost",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			price: {
				condition: () => setup.arcology.sceneMotion(),
				image: "price.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			priceStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "price.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The black market.
	arcology_blackmarket: {
		folder: "arcology-blackmarket",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff788c",
				size: 2,
			},
			lamp: {
				condition: () => setup.arcology.sceneMotion(),
				image: "lamp.png",
				color: "#ff788c",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			lampStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "lamp.png",
				color: "#ff788c",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The chip cutter.
	arcology_cutter: {
		folder: "arcology-cutter",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff3c50",
				size: 2,
			},
			laser: {
				condition: () => setup.arcology.sceneMotion(),
				image: "laser.png",
				color: "#ff3c50",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			laserStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "laser.png",
				color: "#ff3c50",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Unit Exchange hall.
	arcology_exchangehall: {
		folder: "arcology-exchangehall",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#78ffaa",
				size: 2,
			},
			rates: {
				condition: () => setup.arcology.sceneMotion(),
				image: "rates.png",
				color: "#78ffaa",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			ratesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "rates.png",
				color: "#78ffaa",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Halcyon, the window bar on Neon Strip.
	arcology_halcyon: {
		folder: "arcology-halcyon",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			drone: {
				condition: () => setup.arcology.sceneMotion(),
				image: "drone.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			droneStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "drone.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The Static Room.
	arcology_gambling: {
		folder: "arcology-gambling",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffd36b",
				size: 2,
			},
			reels: {
				condition: () => setup.arcology.sceneMotion(),
				image: "reels.png",
				color: "#ffd36b",
				size: 1,
				animation: {
					frameDelay: 200,
				},
			},
			reelsStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "reels.png",
				color: "#ffd36b",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Second Skin augmentation parlour.
	arcology_augment: {
		folder: "arcology-augment",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			joints: {
				condition: () => setup.arcology.sceneMotion(),
				image: "joints.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			jointsStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "joints.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// The sky terrace on Skyline Avenue.
	arcology_terrace: {
		folder: "arcology-terrace",
		weather: { precipitationEnabled: false },
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffffff",
				size: 2,
			},
			traffic: {
				condition: () => setup.arcology.sceneMotion(),
				image: "traffic.png",
				color: "#ffffff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			trafficStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "traffic.png",
				color: "#ffffff",
				size: 1,
				frame: () => 0,
			},
		},
	},
	// Dockside Flats: the island's slum housing.
	arcology_flats: {
		folder: "arcology-flats",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffb060",
				size: 2,
			},
			flicker: {
				condition: () => setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffdca0",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			flickerStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "flicker.png",
				color: "#ffdca0",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Exchange Square and Commerce Walk.
	arcology_exchange: {
		folder: "arcology-exchange",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#7fe9ff",
				size: 2,
				animation: {
					frameDelay: 400,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#7fe9ff",
				size: 2,
				frame: () => 0,
			},
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			column: {
				condition: () => setup.arcology.sceneMotion(),
				image: "column.png",
				color: "#e6ffff",
				size: 1,
				animation: {
					frameDelay: 250,
				},
			},
			columnStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "column.png",
				color: "#e6ffff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Market Street.
	arcology_market: {
		folder: "arcology-market",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ff4fd6",
				size: 2,
				animation: {
					frameDelay: 400,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ff4fd6",
				size: 2,
				frame: () => 1,
			},
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			bulbs: {
				condition: () => setup.arcology.sceneMotion(),
				image: "bulbs.png",
				color: "#ffc86e",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			bulbsStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "bulbs.png",
				color: "#ffc86e",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Neon Strip: bars, clubs and gambling.
	arcology_neon: {
		folder: "arcology-neon",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ff4fd6",
				size: 2,
				animation: {
					frameDelay: 350,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ff4fd6",
				size: 2,
				frame: () => 1,
			},
			lights: {
				image: "emissive.png",
				color: "#ff4fd6",
				size: 2,
			},
			signs: {
				condition: () => setup.arcology.sceneMotion(),
				image: "signs.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 200,
				},
			},
			signsStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "signs.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Underpass and the Stronghold Quarter, under the main platform.
	arcology_underpass: {
		folder: "arcology-underpass",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff8c3c",
				size: 2,
			},
			fire: {
				condition: () => setup.arcology.sceneMotion(),
				image: "fire.png",
				color: "#ffa050",
				size: 1,
				animation: {
					frameDelay: 150,
				},
			},
			fireStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "fire.png",
				color: "#ffa050",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Forge Lane and the Ironworks.
	arcology_forge: {
		folder: "arcology-forge",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ff7828",
				size: 2,
			},
			sparks: {
				condition: () => setup.arcology.sceneMotion(),
				image: "sparks.png",
				color: "#ffdc78",
				size: 1,
				animation: {
					frameDelay: 200,
				},
			},
			sparksStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "sparks.png",
				color: "#ffdc78",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Civic Boulevard and Signal Avenue.
	arcology_civic: {
		folder: "arcology-civic",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 300,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 3,
			},
			lights: {
				image: "emissive.png",
				color: "#dcf0ff",
				size: 2,
			},
			drone: {
				condition: () => setup.arcology.sceneMotion(),
				image: "drone.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			droneStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "drone.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Commerce Walk.
	arcology_commerce: {
		folder: "arcology-commerce",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ffd36b",
				size: 2,
				animation: {
					frameDelay: 450,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ffd36b",
				size: 2,
				frame: () => 1,
			},
			lights: {
				image: "emissive.png",
				color: "#dcf0ff",
				size: 2,
			},
			ribbon: {
				condition: () => setup.arcology.sceneMotion(),
				image: "ribbon.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			ribbonStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "ribbon.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Signal Avenue.
	arcology_signal: {
		folder: "arcology-signal",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#dcf0ff",
				size: 2,
			},
			pulse: {
				condition: () => setup.arcology.sceneMotion(),
				image: "pulse.png",
				color: "#7fe9ff",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			pulseStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "pulse.png",
				color: "#7fe9ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Ironworks.
	arcology_ironworks: {
		folder: "arcology-ironworks",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#dcf0ff",
				size: 2,
			},
			slab: {
				condition: () => setup.arcology.sceneMotion(),
				image: "slab.png",
				color: "#ffa040",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			slabStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "slab.png",
				color: "#ffa040",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Stronghold Quarter.
	arcology_stronghold: {
		folder: "arcology-stronghold",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#dcf0ff",
				size: 2,
			},
			eye: {
				condition: () => setup.arcology.sceneMotion(),
				image: "eye.png",
				color: "#ff2840",
				size: 1,
				animation: {
					frameDelay: 350,
				},
			},
			eyeStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "eye.png",
				color: "#ff2840",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Medtech Street.
	arcology_medtech: {
		folder: "arcology-medtech",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#78ffdc",
				size: 2,
			},
			face: {
				condition: () => setup.arcology.sceneMotion(),
				image: "face.png",
				color: "#c8a0ff",
				size: 1,
				animation: {
					frameDelay: 900,
				},
			},
			faceStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "face.png",
				color: "#c8a0ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Skyline Avenue: wealthy residential towers.
	arcology_skyline: {
		folder: "arcology-skyline",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#d8f4ff",
				size: 1,
				animation: {
					frameDelay: 400,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#d8f4ff",
				size: 1,
				frame: () => 0,
			},
			lights: {
				image: "emissive.png",
				color: "#ffecbe",
				size: 2,
			},
			balconies: {
				condition: () => setup.arcology.sceneMotion(),
				image: "balconies.png",
				color: "#ffecbe",
				size: 1,
				animation: {
					frameDelay: 900,
				},
			},
			balconiesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "balconies.png",
				color: "#ffecbe",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Crown Avenue: the elite compounds.
	arcology_crown: {
		folder: "arcology-crown",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ffd88c",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#ffd88c",
				size: 1,
				frame: () => 2,
			},
			lights: {
				image: "emissive.png",
				color: "#ffdc8c",
				size: 2,
			},
			gleam: {
				condition: () => setup.arcology.sceneMotion(),
				image: "gleam.png",
				color: "#fff0c8",
				size: 1,
				animation: {
					frameDelay: 600,
				},
			},
			gleamStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "gleam.png",
				color: "#fff0c8",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Stillwater Court: Luchifen's residence.
	arcology_stillwater: {
		folder: "arcology-stillwater",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			beams: {
				condition: () => Weather.lightsOn && setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#d8c4ff",
				size: 1,
				animation: {
					frameDelay: 600,
				},
			},
			beamsStill: {
				condition: () => Weather.lightsOn && !setup.arcology.sceneMotion(),
				image: "beams.png",
				color: "#d8c4ff",
				size: 1,
				frame: () => 2,
			},
			lights: {
				image: "emissive.png",
				color: "#7fe9ff",
				size: 2,
			},
			ripples: {
				condition: () => setup.arcology.sceneMotion(),
				image: "ripples.png",
				color: "#c8f0ff",
				size: 1,
				animation: {
					frameDelay: 500,
				},
			},
			ripplesStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "ripples.png",
				color: "#c8f0ff",
				size: 1,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The white pier and the guest gate.
	arcology_pier: {
		folder: "arcology-pier",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#9fe8ff",
				size: 2,
			},
			scan: {
				condition: () => setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 2,
				animation: {
					frameDelay: 300,
					cycleDelay: () => 2500,
				},
			},
			scanStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "scan.png",
				color: "#7fe9ff",
				size: 2,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The Glasshouse ballroom on top of the tallest tower.
	arcology_glasshouse: {
		folder: "arcology-glasshouse",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#d9a8ff",
				size: 2,
			},
			chandelier: {
				condition: () => setup.arcology.sceneMotion(),
				image: "chandelier.png",
				color: "#7fe9ff",
				size: 2,
				animation: {
					frameDelay: 400,
				},
			},
			chandelierStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "chandelier.png",
				color: "#7fe9ff",
				size: 2,
				frame: () => 0,
			},
			floor: {
				condition: () => setup.arcology.sceneMotion(),
				image: "floor.png",
				color: "#ff7ad9",
				size: 2,
				animation: {
					frameDelay: 700,
				},
			},
			floorStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "floor.png",
				color: "#ff7ad9",
				size: 2,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Hotel Meridian: lobby, corridor and guest room share one interior over the city.
	arcology_hotel: {
		folder: "arcology-hotel",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffcf8a",
				size: 2,
			},
			panel: {
				condition: () => setup.arcology.sceneMotion(),
				image: "panel.png",
				color: "#7fe9ff",
				size: 2,
				animation: {
					frameDelay: 600,
				},
			},
			panelStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "panel.png",
				color: "#7fe9ff",
				size: 2,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The Arcology ship. Rooms are enclosed: the window shows the sky but no rain or snow falls in the room.
	arcology_ship: {
		folder: "arcology-ship",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#e0b8ff",
				size: 2,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// Bar, VIP lounge and pool.
	arcology_ship_leisure: {
		folder: "arcology-ship-leisure",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				color: "#ffcf7a",
				size: 2,
			},
			pool: {
				condition: () => setup.arcology.sceneMotion(),
				image: "pool.png",
				color: "#b48cff",
				size: 3,
				animation: {
					frameDelay: 450,
				},
			},
			poolStill: {
				condition: () => !setup.arcology.sceneMotion(),
				image: "pool.png",
				color: "#b48cff",
				size: 3,
				frame: () => 0,
			},
		},
		weather: {
			precipitationEnabled: false,
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: false,
			groundBounds: {
				splashes: {
					top: 8,
					bottom: 0,
				},
				fog: {
					top: 11,
					bottom: 0,
				},
			},
		},
	},
	// The open deck, and the sea from the locked cabin on a forced transfer. Outdoor weather applies.
	arcology_ship_deck: {
		folder: "arcology-ship-deck",
		base: {
			default: {
				image: "base.png",
			},
		},
		emissive: {
			navigation: {
				condition: () => Weather.lightsOn,
				image: "emissive.png",
				color: "#ff5a6e",
				size: 2,
			},
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,
			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 14,
					bottom: 0,
				},
			},
		},
	},
	old_temple: {
		folder: "old-temple",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#ff633f",
			size: 4,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 13,
					bottom: 0,
				},
				fog: {
					top: 21,
					bottom: 0,
				},
			},
		},
	},
	park: {
		folder: "park",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			fountain: {
				image: "fountain.png",
				condition: () => !Weather.isFrozen("fountain"),
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
			treebirds: {
				condition: () => !Weather.isSnow && Time.dayState !== "night",
				// Not at same time as flyingbird
				waitForAnimation: "flying-bird",
				image: "tree-birds.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(2, 10, true) * 1000,
				},
			},
			flyingbird: {
				condition: () => !Weather.isSnow && (Time.dayState === "dawn" || Time.dayState === "dusk"),
				// Not at same time as treebirds
				waitForAnimation: "tree-birds",
				image: "flying-bird.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => random(10, 30, true) * 1000,
				},
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
			color: "#deae66a5",
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 19,
					bottom: 0,
				},
				fog: {
					top: 23,
					bottom: 0,
				},
			},
		},
	},
	estate_cottage: {
		folder: "estate-cottage",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 11,
					bottom: 0,
				},
				fog: {
					top: 15,
					bottom: 0,
				},
			},
		},
		particles: [
			{
				condition: () => Weather.isSnow,
				type: "smoke",
				shape: "image",
				image: "img/misc/sky/clouds/fog/2.png",
				origin: [9, 63],
				rate: 1,
				size: 1,
				riseSpeed: 2,
				spread: 1,
				alpha: 0.5,
				color: "rgba(195, 195, 195, 0.43)",
				windSpeed: 1,
				windDirection: 1,
				minFadeDistance: 5,
				maxFadeDistance: 7,
				fadeTime: 2,
				driftAmplitude: 1,
				driftWavelength: 10,
			},
		],
	},
	police_station: {
		folder: "police-station",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			grass: {
				image: "grass-autumn.png",
				condition: () => !Weather.isSnow && Time.season === "autumn",
			},
			car: {
				image: "car.png",
				condition: () => Time.dayState === "night" || (Time.hour > 11 && Time.hour < 14),
			},
		},
		emissive: {
			image: "emissive.png",
			condition: () => Weather.lightsOn,
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 11,
					bottom: 0,
				},
				fog: {
					top: 15,
					bottom: 0,
				},
			},
		},
	},
	pool: {
		folder: "pool",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 0,
			rainSplashEnabled: false,
			fogEnabled: false,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 0,
					bottom: 0,
				},
			},
		},
	},
	pound: {
		folder: "pound",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			cage: {
				condition: () => !Weather.bloodMoon,
				image: "cage.png",
				animation: {
					frameDelay: 500,
					cycleDelay: () => random(3, 15, true) * 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 9,
					bottom: 0,
				},
			},
		},
	},
	prison: {
		folder: "prison",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			water: {
				image: "water.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 4,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 23,
					bottom: 0,
				},
			},
		},
	},
	prison_beach: {
		folder: "beach",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			foam: {
				image: "waves.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 1000,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				verticalFactor: 3.5,
				amplitude: 35,
			},
			waves: {
				image: "waves.png",
				alpha: 0.5,
				alwaysDisplay: false,
				compositeOperation: "overlay",
				animation: "foam",
			},
			overlay: {
				image: "water.png",
				compositeOperation: "overlay",
				alpha: 0.4,
			},
		},
		layerTop: {
			tree: {
				image: "tree.png",
				animation: {
					frameDelay: 350,
					cycleDelay: () => 3250,
				},
			},
			prison_boat: {
				image: "prison-boat.png",
				condition: () => between(Time.hour, 12, 14) && Time.weekDay === 6,
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 11,
					bottom: 0,
				},
				fog: {
					top: 14,
					bottom: 0,
				},
			},
		},
	},
	promenade: {
		folder: "promenade",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 5000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 5000,
				},
			},
		},
		emissive: {
			condition: () => Weather.lightsOn,
			image: "emissive.png",
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 18,
					bottom: 0,
				},
				fog: {
					top: 21,
					bottom: 0,
				},
			},
		},
	},
	pub: {
		folder: "pub",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			condition: () => Weather.lightsOn,
			image: "emissive.png",
			color: "#deae66",
			strength: 3,
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 5,
					bottom: 0,
				},
				fog: {
					top: 9,
					bottom: 0,
				},
			},
		},
	},
	res_alley: {
		folder: "res-alley",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 1000,
					cycleDelay: () => random(4, 15, true) * 1000,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 1000,
					cycleDelay: () => random(4, 15, true) * 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 21,
					bottom: 0,
				},
			},
		},
	},
	riding_school: {
		folder: "riding-school",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1.2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 19,
					bottom: 0,
				},
				fog: {
					top: 22,
					bottom: 0,
				},
			},
		},
	},
	school: {
		folder: "school",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			autumn: {
				condition: () => !Weather.isSnow && Time.season === "autumn",
				image: "grass-autumn.png",
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 19,
					bottom: 0,
				},
			},
		},
	},
	school_rear_courtyard: {
		folder: "school-rear-courtyard",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			summer: {
				image: "summer.png",
				condition: () => !Weather.isSnow && Time.season === "summer",
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 12,
					bottom: 0,
				},
				fog: {
					top: 22,
					bottom: 0,
				},
			},
		},
	},
	sea: {
		folder: "sea",
		reflective: {
			mask: {
				image: "reflective.png",
				alpha: 1,
				compositeOperation: "overlay",
			},
			overlay: {
				image: "water.png",
				alpha: 0.4,
				animation: {
					slider: () => V.options.reflections,
					frames: 300,
					frameDelay: 300,
				},
			},
			glimmer: {
				condition: () => V.options.reflections,
				image: "glimmer.png",
				compositeOperation: "soft-light",
				alpha: 0.5,
				gradientMask: true,
				animation: {
					slider: true,
					frames: 150,
					frameDelay: 150,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 21,
					bottom: 0,
				},
			},
		},
	},
	sewers: {
		folder: "sewers",
		base: {
			default: {
				image: "base.png",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 29,
					bottom: 29,
				},
				fog: {
					top: 29,
					bottom: 29,
				},
			},
		},
	},
	pirate_ship: {
		folder: "pirate-ship",
		base: {
			overlay: {
				image: "water.png",
			},
			waves: {
				image: "waves.png",
				animation: {
					frameDelay: 450,
				},
			},
		},
		reflective: {
			mask: {
				image: "reflective.png",
				alpha: 0.5,
			},
		},
		layerTop: {
			ship: {
				image: "ship.png",
				animation: {
					frameDelay: 750,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 40,
					bottom: 0,
				},
			},
		},
	},
	sepulchre: {
		folder: "sepulchre",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			eyes: {
				image: "eyes.png",
				condition: () => Weather.lightsOn,
				color: "#e15151",
			},
			gem: {
				image: "gem.png",
				color: "#5b6ee1",
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 10,
					bottom: 0,
				},
			},
		},
	},
	shopping_centre: {
		folder: "shopping-centre",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 3,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 6,
					bottom: 0,
				},
				fog: {
					top: 13,
					bottom: 0,
				},
			},
		},
	},
	spa: {
		folder: "spa",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
				animation: {
					frameDelay: 200,
					cycleDelay: () => 0,
				},
			},
		},
		emissive: {
			emissive_dawn: {
				image: "emissive-dawn.png",
				condition: () => Time.dayState === "dawn",
				color: "#e6de57",
				size: 10,
			},
			light: {
				image: "emissive-lights.png",
				condition: () => Weather.lightsOn,
				color: "#e6de57dd",
				size: 20,
				animation: {
					frameDelay: 2000,
					cycleDelay: () => 2000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 12,
					bottom: 0,
				},
				fog: {
					top: 18,
					bottom: 0,
				},
			},
		},
	},
	strip_club: {
		folder: "strip-club",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			windows: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-windows.png",
				size: 2,
			},
			green: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-green.png",
				color: "#74ff9099",
				size: 2,
			},
			pink1: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-pink-1.png",
				color: "#ff4fd6",
				size: 0,
			},
			pink2: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-pink.png",
				color: "#fe99ff99",
				size: 4,
			},
			purple: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-purple.png",
				color: "#a91dff",
				size: 0,
			},
			red: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-red.png",
				color: "#ff1d2f",
				size: 0,
			},
			blue: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-blue.png",
				color: "#a6f8ff",
				size: 0,
			},
			lady: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-lady-pose.png",
				animation: {
					frameDelay: 1000,
					cycleDelay: () => 1000,
				},
				color: "#ff60a099",
				size: 3,
			},
			hair: {
				condition: () => Time.dayState === "dusk" || Time.dayState === "night",
				image: "emissive-lady-hair.png",
				color: "#d8294899",
				size: 3,
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 7,
					bottom: 0,
				},
				fog: {
					top: 12,
					bottom: 0,
				},
			},
		},
	},
	studio: {
		folder: "studio",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			default: {
				image: "emissive.png",
				condition: () => Weather.lightsOn && between(Time.hour, 18, 23),
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 10,
					bottom: 0,
				},
				fog: {
					top: 16,
					bottom: 0,
				},
			},
		},
	},
	temple: {
		folder: "temple",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		emissive: {
			window_blue: {
				image: "emissive-blue-window.png",
				condition: () => Weather.lightsOn,
				size: 0,
				intensity: 0.7,
			},
			window_orange: {
				image: "emissive-orange-window.png",
				condition: () => Weather.lightsOn,
				size: 0,
				intensity: 0.7,
			},
			orange: {
				image: "emissive-orange.png",
				condition: () => Weather.lightsOn,
				color: "#dfaf70ee",
				size: 4,
			},
			blue: {
				image: "emissive-blue.png",
				condition: () => Weather.lightsOn,
				color: "#7d98e9",
				size: 2,
			},
			grey: {
				image: "emissive-grey.png",
				condition: () => Weather.lightsOn,
				color: "#dbe4b9",
				size: 4,
			},
		},
		weather: {
			fogDistributionCurve: 3,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 7,
					bottom: 0,
				},
				fog: {
					top: 19,
					bottom: 0,
				},
			},
		},
	},
	tentworld: {
		folder: "tent-world",
		base: {
			default: {
				image: "base.png",
				animation: {
					frameDelay: 500,
					cycleDelay: () => 0,
				},
			},
			movingtent: {
				image: "moving-tentacle.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(1, 9, true) * 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: false,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 0,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	tower: {
		folder: "tower",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			wind: {
				image: "wind.png",
				animation: {
					frameDelay: 100,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
		},
		emissive: {
			bonfire: {
				condition: () => getBirdBurnTime() > 0,
				image: "bonfire.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(0, 700, true),
				},
				color: "#deae66",
				size: 5,
				intensity: () => getBirdBurnTime() / 360,
			},
			emissive_blood: {
				condition: () => Weather.bloodMoon,
				image: "emissive-blood.png",
				color: "#e63e3e66",
				size: 5,
			},
		},
		weather: {
			fogDistributionCurve: 3,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 9,
					bottom: 0,
				},
				fog: {
					top: 20,
					bottom: 0,
				},
			},
		},
	},
	town: {
		folder: "town",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
			driving_car: {
				condition: () => !Weather.bloodMoon,
				image: "driving-car.png",
				waitForAnimation: "flickeringLights",
				alwaysDisplay: false,
				animation: {
					frameDelay: 150,
					cycleDelay: () => random(5, 15, true) * 1000,
				},
			},
			parked_car: {
				condition: () => !Weather.bloodMoon,
				image: "parked-car.png",
			},
			cat: {
				condition: () => Time.dayState === "night",
				image: "cat.png",
				animation: {
					frameDelay: 300,
					cycleDelay: () => random(3, 9, true) * 1000,
				},
			},
		},
		emissive: {
			lights: {
				image: "emissive.png",
				condition: () => Weather.lightsOn,
				alwaysDisplay: false,
				animation: "drivingCar",
				color: "#deae66",
				size: 4,
			},
			flickering_lights: {
				waitForAnimation: "drivingCar",
				condition: grp => {
					// Do not draw if car animation is running
					return Weather.lightsOn && !grp?.animations?.get("drivingCar")?.inCycle;
				},
				image: "emissive-flicker.png",
				color: "#deae66",
				size: 4,
				animation: {
					frameDelay: 250,
					cycleDelay: () => random(2, 20, true) * 1000,
				},
			},
		},
		weather: {
			fogDistributionCurve: 1.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 18,
					bottom: 0,
				},
				fog: {
					top: 23,
					bottom: 0,
				},
			},
		},
	},
	underground: {
		folder: "underground",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 2,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 10,
					bottom: 0,
				},
				fog: {
					top: 18,
					bottom: 0,
				},
			},
		},
	},
	underground_farm: {
		folder: "underground-farm",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 1,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 15,
					bottom: 0,
				},
				fog: {
					top: 17,
					bottom: 0,
				},
			},
		},
	},
	wolf_cave: {
		folder: "wolf-cave",
		base: {
			default: {
				condition: () => !Weather.isSnow,
				image: "base.png",
			},
			snow: {
				condition: () => Weather.isSnow,
				image: "snow.png",
			},
		},
		weather: {
			fogDistributionCurve: 2.5,
			rainSplashEnabled: true,
			fogEnabled: true,

			groundBounds: {
				splashes: {
					top: 16,
					bottom: 0,
				},
				fog: {
					top: 24,
					bottom: 0,
				},
			},
		},
	},
};
