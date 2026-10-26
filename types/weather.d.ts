interface ImageLocation {
	folder: string;
	base?: ImageSetting | { [key: string]: ImageSetting };
	emissive?: EmissiveSetting | { [key: string]: EmissiveSetting };
	reflective?: ReflectiveSetting;
	layerTop?: ImageSetting | { [key: string]: ImageSetting };
	weather?: WeatherLocationSettings;
	particles?: {};
}

interface AnimationSetting {
	frameDelay: number | (() => number);
	cycleDelay?: number | (() => number);
	startDelay?: number | (() => number);
	startFrame?: number | (() => number);
	slider?: boolean | (() => boolean);
	frames?: number | (() => number);
}

interface LocationImageAnimationGroup {
	animations?: Map<string, { inCycle?: boolean }>;
}

type LocationImageNumericValue = number | (() => number);
type LocationImageCondition = (group?: LocationImageAnimationGroup) => boolean | undefined;
type LocationImageConditionValue = boolean | LocationImageCondition;
type LocationImageCompositeOperation = string | (() => string);

interface ImageSetting {
	image: string;
	condition?: LocationImageConditionValue;
	waitForAnimation?: string;
	alwaysDisplay?: boolean;
	animation?: string | AnimationSetting;
	frame?: number | (() => number);
}

interface EmissiveSetting {
	image: string;
	condition?: LocationImageConditionValue;
	waitForAnimation?: string;
	alwaysDisplay?: boolean;
	animation?: string | AnimationSetting;
	color?: string;
	size?: number;
	blur?: number;
	strength?: number;
	intensity?: LocationImageNumericValue;
	frame?: number | (() => number);
}

interface ReflectiveSetting {
	mask?: MaskSetting;
	[key: string]: MaskSetting | ReflectiveProperty | undefined;
}

interface MaskSetting {
	image: string;
	alpha?: LocationImageNumericValue;
	horizon?: LocationImageNumericValue;
	waveShiftFactor?: LocationImageNumericValue;
	blur?: LocationImageNumericValue;
	animationCondition?: LocationImageCondition;
	verticalDirection?: LocationImageNumericValue;
	verticalFactor?: LocationImageNumericValue;
	verticalSpeed?: LocationImageNumericValue;
	amplitude?: LocationImageNumericValue;
	frequency?: LocationImageNumericValue;
	condition?: LocationImageConditionValue;
	compositeOperation?: LocationImageCompositeOperation;
}

interface ReflectiveProperty {
	image: string;
	condition?: LocationImageConditionValue;
	alpha?: LocationImageNumericValue;
	frequency?: LocationImageNumericValue;
	verticalDirection?: LocationImageNumericValue;
	waveShiftFactor?: LocationImageNumericValue;
	blur?: LocationImageNumericValue;
	horizon?: LocationImageNumericValue;
	gradientMask?: boolean | (() => boolean);
	alwaysDisplay?: boolean | (() => boolean);
	compositeOperation?: LocationImageCompositeOperation;
	animation?: string | AnimationSetting;
	verticalFactor?: LocationImageNumericValue;
	amplitude?: LocationImageNumericValue;
	verticalSpeed?: LocationImageNumericValue;
}

interface BoundsBand {
	top?: LocationImageNumericValue;
	bottom?: LocationImageNumericValue;
}

interface GroundBounds {
	splashes: BoundsBand;
	fog: BoundsBand;
}

interface WeatherLocationSettings {
	fogDistributionCurve?: LocationImageNumericValue;
	rainSplashEnabled?: boolean;
	fogEnabled?: boolean;
	fogOpacity?: number | (() => number);
	precipitationEnabled?: boolean;
	groundBounds?: GroundBounds;
}

interface WeatherType {
	name: string;
	iconType: string | (() => string);
	value: number;
	probability: {
		summer: number;
		winter: number;
		spring: number;
		autumn: number;
	};
	cloudCount: {
		small: () => number;
		medium: () => number;
		large: () => number;
	};
	tanningModifier: number | (() => number);
	overcast: number | (() => number);
	precipitationIntensity: number | (() => number);
	rain?: {
		dropLength: number;
		dropSpeed: number;
		dropWidth: number;
	};
	cloudAlpha: number;
	darkenFactor: {
		sky: number;
		sun: number;
		moon: number;
		clouds: number;
		cirrusClouds: number;
		overcastClouds: number;
		precipitation: number;
		fog: number;
		location: number;
	};
	fogChangeRate: number;
	lightningFrequency?: number | (() => number);
}

declare global {
	export interface LocationImages {
		[locationKey: string]: ImageLocation;
	}
}

export {};
