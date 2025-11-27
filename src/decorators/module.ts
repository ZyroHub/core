export const MODULE_METADATA_KEY = 'zyro:module';

export function Module() {
	return (target: Function) => {
		Reflect.defineMetadata(MODULE_METADATA_KEY, true, target);
	};
}
