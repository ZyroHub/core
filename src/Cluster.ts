import { Terminal } from '@zyrohub/utilities';
import ansicolor from 'ansicolor';
import ms from 'ms';
import cluster, { Worker } from 'node:cluster';
import EventEmitter from 'node:events';
import os from 'node:os';
import process from 'node:process';

import { Core, CoreOptions } from './Core.js';

interface ClusteredCoreEvents {
	ready: (data: { clusteredCore: ClusteredCore }) => void;
	workerInit: (data: { worker: ClusteredCoreWorker }) => void;
}

export declare interface ClusteredCore {
	on<T extends keyof ClusteredCoreEvents>(event: T, listener: ClusteredCoreEvents[T]): this;
	emit<T extends keyof ClusteredCoreEvents>(event: T, ...args: Parameters<ClusteredCoreEvents[T]>): boolean;
}

export interface ClusteredCoreOptionsSettings {
	cpus?: number;
	workers?: {
		autoRestart?: {
			enabled?: boolean;
			delay?: number;
		};
	};
}

export interface ClusteredCoreOptions {
	core: CoreOptions;
	settings?: ClusteredCoreOptionsSettings;
}

export interface ClusteredCoreWorker {
	id: number;
	process: Worker;
}

export class ClusteredCore extends EventEmitter {
	public isPrimary: boolean = cluster.isPrimary;
	public isWorker: boolean = cluster.isWorker;

	public actualCore: Core | null = null;

	workers: Record<number, ClusteredCoreWorker> = {};

	constructor(public options: ClusteredCoreOptions) {
		super({});

		options.settings = {
			...options.settings,
			cpus: options.settings?.cpus || os.availableParallelism(),
			workers: {
				...options.settings?.workers,
				autoRestart: {
					enabled: true,
					delay: 5000,
					...options.settings?.workers?.autoRestart
				}
			}
		};
	}

	private createWorker() {
		const worker = cluster.fork();

		const workerData = {
			id: worker.id,
			process: worker
		};

		this.workers[worker.id] = workerData;

		Terminal.info('CLUSTER', `Worker ${ansicolor.cyan(worker.process.pid)} started.`);
		this.emit('workerInit', { worker: workerData });
	}

	private async initWorker() {
		const core = new Core({
			...this.options.core,
			meta: {
				...this.options.core.meta,
				isWorker: true
			}
		});

		this.actualCore = core;

		await core.init();
	}

	private async initPrimary() {
		Terminal.success('CLUSTER', `Primary ${ansicolor.cyan(process.pid)} is running.`);

		const startedAt = Date.now();

		const cpuCount = this.options.settings?.cpus || 0;

		for (let i = 0; i < cpuCount; i++) {
			this.createWorker();
		}

		cluster.on('exit', (worker, code, signal) => {
			delete this.workers[worker.id];

			Terminal.error(
				'CLUSTER',
				`Worker ${ansicolor.cyan(worker.process.pid)} died with code: ${ansicolor.yellow(
					code
				)}, and signal: ${ansicolor.red(signal)}`
			);

			if (this.options.settings?.workers?.autoRestart?.enabled) {
				setTimeout(() => {
					Terminal.info('CLUSTER', 'Restarting worker...');

					this.createWorker();
				}, this.options.settings?.workers?.autoRestart?.delay);
			}
		});

		const elapsedTime = Date.now() - startedAt;

		Terminal.success(
			'CLUSTER',
			`Successfully initialized ${ansicolor.yellow(cpuCount)} workers. ${ansicolor.darkGray(`(${ms(elapsedTime)})`)}`
		);

		this.emit('ready', { clusteredCore: this });
	}

	async init() {
		if (cluster.isPrimary) {
			await this.initPrimary();
		} else {
			await this.initWorker();
		}
	}
}

export default { ClusteredCore };
