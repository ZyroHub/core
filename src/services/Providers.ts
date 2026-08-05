import { PROVIDER_METADATA_KEY } from '@/decorators/provider.js';
import { Ansi } from '@zyrohub/utilities';

export type ProviderToken = any;

export interface ClassProvider {
	provide: ProviderToken;
	useClass: any;
}

export interface ValueProvider {
	provide: ProviderToken;
	useValue: any;
}

export type ProviderType = any | ClassProvider | ValueProvider;

export class ProvidersService {
	private providers: Map<ProviderToken, any> = new Map();

	resolve<T = any>(token: ProviderToken): T | undefined {
		return this.providers.get(token);
	}

	resolveOrThrow<T = any>(token: ProviderToken): T {
		const provider = this.resolve<T>(token);
		if (provider === undefined) throw new Error(`Provider for token ${token.toString()} not found.`);

		return provider;
	}

	registerInstance(token: ProviderToken, instance: any) {
		this.providers.set(token, instance);
	}

	register(provider: ProviderType) {
		if (this.isValueProvider(provider)) {
			this.providers.set(provider.provide, provider.useValue);

			return provider.useValue;
		}

		if (this.isClassProvider(provider)) {
			const instance = this.instantiate(provider.useClass);
			this.providers.set(provider.provide, instance);

			return instance;
		}

		if (this.providers.has(provider)) {
			return this.providers.get(provider);
		}

		const instance = this.instantiate(provider);
		this.providers.set(provider, instance);

		return instance;
	}

	instantiate<T>(Target: { new (...args: any[]): T }): T {
		const paramTypes: any[] = Reflect.getMetadata(PROVIDER_METADATA_KEY.PARAM_TYPES, Target) || [];
		const injections = Reflect.getOwnMetadata(PROVIDER_METADATA_KEY.INJECT, Target) || {};

		const dependencies = paramTypes.map((paramType: any, index: number) => {
			const token = injections[index] || paramType;
			const dependency = this.resolve(token);

			return { token: token, value: dependency };
		});

		const unresolvedDependencies = dependencies.filter(dependency => dependency.value === undefined);
		if (unresolvedDependencies.length) {
			const unresolvedTokensText = unresolvedDependencies
				.map(dependency => {
					if (dependency.token?.name) return dependency.token.name;

					return String(dependency.token);
				})
				.map(dependency => `${Ansi.magenta(dependency)}`)
				.join(', ');
			throw new Error(`Provider for tokens ${unresolvedTokensText} in ${Ansi.yellow(Target.name)} not found.`);
		}

		return new Target(...dependencies);
	}

	unregister(token: ProviderToken) {
		this.providers.delete(token);
	}

	private isValueProvider(provider: any): provider is ValueProvider {
		return provider && typeof provider === 'object' && 'useValue' in provider;
	}

	private isClassProvider(provider: any): provider is ClassProvider {
		return provider && typeof provider === 'object' && 'useClass' in provider;
	}
}

export default { ProvidersService };
