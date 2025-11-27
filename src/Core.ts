import { Ansi, Terminal } from '@zyrohub/utilities';
import ms from 'ms';
import EventEmitter from 'node:events';

import { BaseModule, MountedModule } from './components/Module.js';
import { MODULE_METADATA_KEY } from './decorators/module.js';
import { ProvidersService, ProviderToken } from './services/Providers.js';

interface CoreEvents {
	ready: (data: { core: Core }) => void;
	moduleInit: (data: { module: BaseModule }) => void;
}

export declare interface Core {
	on<T extends keyof CoreEvents>(event: T, listener: CoreEvents[T]): this;
	emit<T extends keyof CoreEvents>(event: T, ...args: Parameters<CoreEvents[T]>): boolean;
}

export interface CoreOptionsMeta {
	isWorker?: boolean;
}

export interface CoreOptions {
	modules?: (typeof BaseModule | MountedModule)[];
	providers?: any[];
	meta?: CoreOptionsMeta;
}

export class Core extends EventEmitter {
	private static instance: Core;

	public initialized: boolean = false;
	public storage: Map<string, any> = new Map();

	private modules: MountedModule[] = [];

	public providers = new ProvidersService();

	public meta: CoreOptionsMeta = {};

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

		if (options.meta) {
			this.meta = options.meta;
		}

		if (!Core.instance) Core.instance = this;
	}

	private async initModules() {
		for (const module of this.modules) {
			try {
				if (!module.instance) throw new Error('Module instance is not defined');

				module.instance.core = this;

				Terminal.info('CORE', `Initializing module: ${Ansi.cyan(module.instance.getName())}...`);

				const startedAt = Date.now();
				await module.instance.init({ core: this, options: module.options });
				const duration = Date.now() - startedAt;

				module.instance.initialized = true;

				this.providers.registerInstance(module.constructor, module.instance);

				if (module.token) {
					this.providers.registerInstance(module.token, module.instance);
				}

				Terminal.success(
					'CORE',
					`Successfully initialized module: ${Ansi.cyan(
						module.instance.getName()
					)} ${Ansi.gray(`(${ms(duration)})`)}`
				);

				this.emit('moduleInit', { module: module.instance });
			} catch (error) {
				Terminal.error('CORE', [`Failed to initialize module: ${module.constructor.name}\n`, error]);
			}
		}
	}

	registerModule(module: typeof BaseModule | MountedModule) {
		const ModuleConstructor = (module as MountedModule).constructor || module;

		const isModule = Reflect.getMetadata(MODULE_METADATA_KEY, ModuleConstructor);

		if (!isModule) {
			Terminal.error(
				'CORE',
				`The class ${Ansi.yellow(
					ModuleConstructor.name
				)} is not a valid module. Did you forget the ${Ansi.cyan('@Module()')} decorator?`
			);

			return;
		}

		if ((module as typeof BaseModule)?.mount) {
			this.modules.push((module as typeof BaseModule).mount({}));
		} else {
			this.modules.push(module as MountedModule);
		}
	}

	instantiate<T>(ClassRef: { new (...args: any[]): T }): T {
		return this.providers.instantiate(ClassRef);
	}

	resolve<T = any>(token: ProviderToken): T | undefined {
		return this.providers.resolve(token);
	}

	getModule<T extends typeof BaseModule>(module: T, token?: ProviderToken): InstanceType<T> | undefined {
		if (token) return this.providers.resolve<InstanceType<T>>(token);

		return this.providers.resolve<InstanceType<T>>(module);
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
			`Successfully initialized ${Ansi.yellow(this.modules.length)} modules. ${Ansi.gray(`(${ms(elapsedTime)})`)}`
		);

		Terminal.success('CORE', 'Successfully initialized.');

		this.emit('ready', { core: this });
	}
}

export default { Core };
