export const PROVIDER_METADATA_KEY = {
	PROVIDER: 'zyro:provider',
	INJECT: 'zyro:inject',
	INJECTABLE: 'zyro:injectable',
	PARAM_TYPES: 'design:paramtypes'
};

export function Provider() {
	return (target: any) => {
		Reflect.defineMetadata(PROVIDER_METADATA_KEY.PROVIDER, true, target);
	};
}

export function Inject(token: any) {
	return (target: Object, _propertyKey: string | symbol | undefined, parameterIndex: number) => {
		const existingInjections = Reflect.getOwnMetadata(PROVIDER_METADATA_KEY.INJECT, target) || {};
		existingInjections[parameterIndex] = token;

		Reflect.defineMetadata(PROVIDER_METADATA_KEY.INJECT, existingInjections, target);
	};
}

export function Injectable() {
	return (target: Function) => {
		Reflect.defineMetadata(PROVIDER_METADATA_KEY.INJECTABLE, true, target);
	};
}
