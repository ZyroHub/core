import type { Core } from '@/Core.js';

export type MountedModule<T = any> = {
	constructor: typeof BaseModule;
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
		this: typeof BaseModule & { options: TMount },
		options: TMount,
		token?: any
	): MountedModule<TMount> {
		return {
			constructor: this,
			instance: new this(),
			options,
			token
		};
	}

	async init(data: { core: Core; options: any }) {}
}

export default { BaseModule };
