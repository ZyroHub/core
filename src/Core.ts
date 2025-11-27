import { Ansi, Terminal } from '@zyrohub/utilities';
import ms from 'ms';
import EventEmitter from 'node:events';

import { BaseModule, ModuleClass, MountedModule } from './components/Module.js';
import { MODULE_METADATA_KEY } from './decorators/module.js';
import { ProvidersService, ProviderToken } from './services/Providers.js';

interface CoreEvents {
	ready: (data: { core: Core }) => void;
	moduleInit: (data: { module: BaseModule }) => void;
	shutdown: () => void;
}

export declare interface Core {
	on<T extends keyof CoreEvents>(event: T, listener: CoreEvents[T]): this;
	emit<T extends keyof CoreEvents>(event: T, ...args: Parameters<CoreEvents[T]>): boolean;
}

export interface CoreOptionsMeta {
	isWorker?: boolean;
}

export interface CoreOptions {
	modules?: (ModuleClass | MountedModule)[];
	providers?: any[];
	meta?: CoreOptionsMeta;

	enableGracefulShutdown?: boolean;
}

export class Core extends EventEmitter {
	private static instance: Core;

	public initialized: boolean = false;
	public storage: Map<string, any> = new Map();

	private modules: MountedModule[] = [];

	public providers = new ProvidersService();

	public meta: CoreOptionsMeta = {};

	private enableGracefulShutdown: boolean = true;

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

		if (options.enableGracefulShutdown !== undefined) {
			this.enableGracefulShutdown = options.enableGracefulShutdown;
		}

		if (!Core.instance) Core.instance = this;
	}

	private async initModules() {
		for (const module of this.modules) {
			try {
				if (!module.instance) {
					module.instance = this.providers.instantiate(module.constructor);
				}

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
				this.handleModuleError(module, error);
			}
		}
	}

	private handleModuleError(module: MountedModule, error: unknown) {
		const moduleName = module.instance?.getName() || module.constructor.name;

		Terminal.error('CORE', [`Failed to initialize module: ${moduleName}`, error]);

		process.exit(1);
	}

	private setupGracefulShutdown() {
		if (!this.enableGracefulShutdown) return;

		const shutdownHandler = async (signal: string) => {
			Terminal.warn('CORE', `Received signal ${signal}. Shutting down gracefully...`);
			await this.shutdown();
			process.exit(0);
		};

		process.on('SIGINT', () => shutdownHandler('SIGINT'));
		process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
	}

	registerModule(module: ModuleClass | MountedModule) {
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

		if ('options' in (module as any)) {
			this.modules.push(module as MountedModule);
		} else {
			this.modules.push((module as ModuleClass).mount({}));
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

	async shutdown() {
		Terminal.info('CORE', 'Shutting down modules...');

		for (const module of [...this.modules].reverse()) {
			if (module.instance && module.instance.initialized) {
				try {
					await module.instance.destroy();
				} catch (error) {
					Terminal.error('CORE', [`Error shutting down module ${module.instance.getName()}`, error]);
				}
			}
		}

		this.emit('shutdown');
		Terminal.success('CORE', 'Core shutdown successfully.');
	}

	async init() {
		if (this.initialized) return;

		this.setupGracefulShutdown();

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
