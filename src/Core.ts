import ansicolor from 'ansicolor';
import ms from 'ms';
import EventEmitter from 'node:events';
import 'reflect-metadata';

import { BaseModule, MountedModule } from './components/Module.js';
import { Provider, ProvidersService } from './services/Providers.js';
import { Terminal } from './utils/Terminal.js';

interface CoreEvents {
	ready: (core: Core) => void;
	moduleInit: (module: BaseModule) => void;
}

export declare interface Core {
	on<T extends keyof CoreEvents>(event: T, listener: CoreEvents[T]): this;
	emit<T extends keyof CoreEvents>(event: T, ...args: Parameters<CoreEvents[T]>): boolean;
}

export interface CoreOptions {
	modules?: (typeof BaseModule | MountedModule)[];
	providers?: Provider[];
}

export class Core extends EventEmitter {
	private static instance: Core;

	public initialized: boolean = false;
	public storage: Map<string, any> = new Map();

	private modules: MountedModule[] = [];

	public providers = new ProvidersService();

	constructor(options: CoreOptions = {}) {
		super({});

		this.providers.registerInstance(Core, this);

		if (options.modules) {
			for (const module of options.modules) {
				this.registerModule(module);
			}
		}

		if (options.providers) {
			for (const provider of options.providers) {
				this.providers.register(provider);
			}
		}

		if (!Core.instance) Core.instance = this;
	}

	private async initModules() {
		for (const module of this.modules) {
			try {
				if (!module.instance) throw new Error('Module instance is not defined');

				const startedAt = Date.now();
				await module.instance.init({ core: this, options: module.options });
				const duration = Date.now() - startedAt;

				module.instance.initialized = true;

				Terminal.success(
					'CORE',
					`Successfully initialized module: ${ansicolor.cyan(
						module.instance.getName()
					)} ${ansicolor.darkGray(`(${ms(duration)})`)}`
				);

				this.emit('moduleInit', module.instance);
			} catch (error) {
				Terminal.error('CORE', [`Failed to initialize module: ${module.constructor.name}\n`, error]);
			}
		}
	}

	registerModule(module: typeof BaseModule | MountedModule) {
		if ((module as typeof BaseModule)?.mount) {
			this.modules.push((module as typeof BaseModule).mount({}));
		} else {
			this.modules.push(module as MountedModule);
		}
	}

	getModule<T extends typeof BaseModule>(module: T): InstanceType<T> | undefined {
		const foundedModule = this.modules.find(m => m.constructor === module) as MountedModule | undefined;

		return (foundedModule?.instance as InstanceType<T>) || undefined;
	}

	static getInstance(options: CoreOptions = {}): Core {
		return Core.instance || new Core(options);
	}

	async init() {
		if (this.initialized) return;

		const startedAt = Date.now();
		await this.initModules();
		const elapsedTime = Date.now() - startedAt;

		this.initialized = true;

		Terminal.success(
			'CORE',
			`Successfully initialized ${ansicolor.yellow(
				this.modules.length
			)} modules. ${ansicolor.darkGray(`(${ms(elapsedTime)})`)}`
		);

		Terminal.success('CORE', 'Successfully initialized.');

		this.emit('ready', this);
	}
}
