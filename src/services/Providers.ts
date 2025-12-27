import { PROVIDER_METADATA_KEY } from '@/decorators/provider.js';

export type ProviderToken = any;

export class ProvidersService {
	private providers: Map<ProviderToken, any> = new Map();

	resolve<T = any>(token: ProviderToken): T | undefined {
		return this.providers.get(token);
	}

	resolveOrThrow<T = any>(token: ProviderToken): T {
		const provider = this.resolve<T>(token);
		if (!provider) throw new Error(`Provider for token ${token.toString()} not found.`);

		return provider;
	}

	registerInstance(token: ProviderToken, instance: any) {
		this.providers.set(token, instance);
	}

	register(ProviderClass: any) {
		if (this.providers.has(ProviderClass)) {
			return this.providers.get(ProviderClass);
		}

		const instance = this.instantiate(ProviderClass);

		this.providers.set(ProviderClass, instance);
		return instance;
	}

	instantiate<T>(Target: { new (...args: any[]): T }): T {
		const paramTypes = Reflect.getMetadata(PROVIDER_METADATA_KEY.PARAM_TYPES, Target) || [];
		const injections = Reflect.getOwnMetadata(PROVIDER_METADATA_KEY.INJECT, Target) || {};

		const dependencies = paramTypes.map((paramType: any, index: number) => {
			const token = injections[index] || paramType;
			const dependency = this.resolve(token);

			return dependency;
		});

		return new Target(...dependencies);
	}

	unregister(token: ProviderToken) {
		this.providers.delete(token);
	}
}

export default { ProvidersService };
