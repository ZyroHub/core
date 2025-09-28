export type Provider = { new (...args: any[]): any };

export class ProvidersService {
	private providers: Map<Provider, InstanceType<Provider>> = new Map();

	resolve<T extends Provider>(provider: T): InstanceType<T> | undefined {
		return this.providers.get(provider) as InstanceType<T>;
	}

	register(provider: Provider) {
		const isProvider = Reflect.getMetadata('provider:isProvider', provider);
		if (!isProvider) throw new Error('Invalid provider');

		const providerParams = Reflect.getMetadata('design:paramtypes', provider) || [];
		const dependencies = this.resolveClasses(providerParams);

		const instance = new provider(...dependencies);

		this.providers.set(provider, instance);
		return instance;
	}

	registerInstance(provider: Provider, instance: InstanceType<Provider>) {
		this.providers.set(provider, instance);
	}

	unregister(provider: Provider) {
		this.providers.delete(provider);
	}

	resolveClasses(providers: Provider[]) {
		return providers.map(provider => this.resolve(provider));
	}

	initClassWithProviders<T extends Provider>(constructor: T): InstanceType<T> {
		const providerParams = Reflect.getMetadata('design:paramtypes', constructor) || [];
		const dependencies = this.resolveClasses(providerParams);

		return new constructor(...dependencies);
	}
}

export default { ProvidersService };
