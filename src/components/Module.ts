import { Core } from '@/Core.js';

export type MountedModule<T = any> = {
	constructor: typeof BaseModule;
	instance?: BaseModule;
	options: T;
};

export class BaseModule {
	static options: any;
	public name?: string;
	public initialized: boolean = false;

	getName() {
		return this.name || this.constructor.name;
	}

	static mount<TMount extends (typeof BaseModule)['options']>(
		this: typeof BaseModule & { options: TMount },
		options: TMount
	): MountedModule<TMount> {
		return {
			constructor: this,
			instance: new this(),
			options
		};
	}

	async init(data: { core: Core; options: any }) {}
}
