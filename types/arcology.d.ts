declare module "twine-sugarcube" {
	export interface SugarCubeStoryVariables {
		xchange: any;
	}

	export interface SugarCubeSetupObject {
		/* Defined in game/special-xchange/Arcology/arcology.js. */
		arcology: {
			sceneMotion: () => boolean;
			[key: string]: any;
		};
	}
}

export {};
