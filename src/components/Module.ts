import type { Core } from '@/Core.js';

export type ModuleClass<T extends BaseModule = BaseModule> = {
	new (...args: any[]): T;
	mount: (options: any, token?: any) => MountedModule<any>;
};

export type MountedModule<T = any> = {
	constructor: ModuleClass<any>;
	instance?: BaseModule;
	options: T;
	token?: any;
};

export class BaseModule {
	static options: any;

	public core?: Core;

	public name?: string;
	public initialized: boolean = false;

	getName() {
		return this.name || this.constructor.name;
	}

	static mount<TMount extends (typeof BaseModule)['options']>(
		this: ModuleClass & { options: TMount },
		options: TMount,
		token?: any
	): MountedModule<TMount> {
		return {
			constructor: this,
			options,
			token
		};
	}

	async init(data: { core: Core; options: any }) {}

	async shutdown() {}
}

export default { BaseModule };
