export function Provider() {
	return (target: any) => {
		Reflect.defineMetadata('provider:isProvider', true, target);
	};
}

export function ProviderReceiver() {
	return (target: any) => {
		Reflect.defineMetadata('provider:isProviderReceiver', true, target);
	};
}
