export type ProviderType = { new (...args: any[]): any };

export class ProvidersService {
	private providers: Map<ProviderType, InstanceType<ProviderType>> = new Map();

	resolve<T extends ProviderType>(provider: T): InstanceType<T> | undefined {
		return this.providers.get(provider) as InstanceType<T>;
	}

	register(provider: ProviderType) {
		const isProvider = Reflect.getMetadata('provider:isProvider', provider);
		if (!isProvider) throw new Error('Invalid provider');

		const providerParams = Reflect.getMetadata('design:paramtypes', provider) || [];
		const dependencies = this.resolveClasses(providerParams);

		const instance = new provider(...dependencies);

		this.providers.set(provider, instance);
		return instance;
	}

	registerInstance(provider: ProviderType, instance: InstanceType<ProviderType>) {
		this.providers.set(provider, instance);
	}

	unregister(provider: ProviderType) {
		this.providers.delete(provider);
	}

	resolveClasses(providers: ProviderType[]) {
		return providers.map(provider => this.resolve(provider));
	}

	initClassWithProviders<T extends ProviderType>(constructor: T): InstanceType<T> {
		const providerParams = Reflect.getMetadata('design:paramtypes', constructor) || [];
		const dependencies = this.resolveClasses(providerParams);

		return new constructor(...dependencies);
	}
}

export default { ProvidersService };
