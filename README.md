<div align="center">
    <img src="https://i.imgur.com/KVVR2dM.png">
</div>

## ZyroHub - Core

<p>This is the core module of ZyroHub ecosystem, providing modules and services for building and managing applications.</p>

## Table of Contents

- [ZyroHub - Core](#zyrohub---core)
- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
    - [TypeScript Configuration](#typescript-configuration)
- [Basic Usage](#basic-usage)
    - [Creating a Core Instance](#creating-a-core-instance)
    - [Cluster Support](#cluster-support)
- [Modules](#modules)
    - [Creating a Module (@Module)](#creating-a-module-module)
    - [Configuration with .mount()](#configuration-with-mount)
    - [Getting a Module Instance](#getting-a-module-instance)
- [Dependency Injection (DI)](#dependency-injection-di)
    - [Creating Services (@Provider)](#creating-services-provider)
    - [Injecting Dependencies](#injecting-dependencies)
    - [Injecting Dependencies in Any Class](#injecting-dependencies-in-any-class)
    - [Token Injection (@Inject)](#token-injection-inject)
    - [Core DI Methods (instantiate \& resolve)](#core-di-methods-instantiate--resolve)
- [Lifecycle](#lifecycle)
    - [Initialization (init)](#initialization-init)
    - [Graceful Shutdown (shutdown)](#graceful-shutdown-shutdown)
- [Events](#events)

## Getting Started

To install the core module, use one of the following package managers:

[NPM Repository](https://www.npmjs.com/package/@zyrohub/core)

```bash
# npm
npm install @zyrohub/core
# yarn
yarn add @zyrohub/core
# pnpm
pnpm add @zyrohub/core
# bun
bun add @zyrohub/core
```

### TypeScript Configuration

⚠️ **Important:** To use the Dependency Injection system, you **must** enable `emitDecoratorMetadata` in your `tsconfig.json`.

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	}
}
```

## Basic Usage

### Creating a Core Instance

The modules are automatically initialized in order when the core instance is created.

```typescript
import { Core } from '@zyrohub/core';

import { MyModule } from './modules/MyModule.js';

const core = new Core({
	modules: [MyModule]
});

await core.init();
```

### Cluster Support

You can also create a Clustered Core instance to take advantage of multi-core systems. The clustered core will automatically manage worker processes and restart them if they fail.

```typescript
import { ClusteredCore } from '@zyrohub/core';

import { MyModule } from './modules/MyModule.js';

const core = new ClusteredCore({
	core: {
		modules: [MyModule]
	},
	settings: {
		workers: {
			autoRestart: { enabled: true, delay: 5000 }
		}
	}
});

await core.init();
```

## Modules

Modules are the building blocks of your application. Use the `@Module()` decorator to register a class as a module.

### Creating a Module (@Module)

```typescript
import { BaseModule, Module, type Core } from '@zyrohub/core';
import { Terminal } from '@zyrohub/utilities';

@Module()
export class DatabaseModule extends BaseModule {
	async init(data: { core: Core }) {
		Terminal.success('DB', 'Database connected.');
	}

	// Called when the application is shutting down
	async shutdown() {
		Terminal.info('DB', 'Closing connections...');
	}
}
```

### Configuration with .mount()

To pass options to a module before initialization, use the static `mount` method. These options are accessible in the `init` method via `data.options`.

```typescript
export interface HttpOptions {
	port: number;
}

@Module()
export class HttpModule extends BaseModule {
	static options: HttpOptions;

	// Options passed in .mount() are received here
	async init(data: { core: Core; options: HttpOptions }) {
		const { port } = data.options;
		console.log(`Server starting on port ${port}`);
	}
}

// Usage
const core = new Core({
	modules: [
		// Pass the configuration object here
		HttpModule.mount({ port: 3000 })
	]
});
```

### Getting a Module Instance

You can retrieve a module instance from the core using the `getModule()` or `getModuleOrThrow()` method.

```typescript
import { Module, BaseModule, type Core } from '@zyrohub/core';

@Module()
export class UserModule extends BaseModule {
	async init() {
		const databaseModule = this.core.getModuleOrThrow(DatabaseModule);
	}
}
```

> You can also provide a token if the module was registered with one.

```typescript
const databaseModule = this.core.getModuleOrThrow(DatabaseModule, 'CUSTOM_DB_TOKEN');
```

> You can also use dependency injection to get module instances directly in the constructor. See [Injecting Dependencies](#injecting-dependencies) for more details.

## Dependency Injection (DI)

The `@zyrohub/core` has a DI container that resolves dependencies automatically. Modules are automatically registered as providers.

### Creating Services (@Provider)

Use the `@Provider()` decorator to mark a class as a provider that can be injected.

```typescript
import { Provider } from '@zyrohub/core';

@Provider()
export class UserService {
	getAll() {
		return ['User 1', 'User 2'];
	}
}
```

### Injecting Dependencies

You can inject services or other modules directly into the **constructor**.

```typescript
import { Module, BaseModule } from '@zyrohub/core';

import { UserService } from './services/UserService.js';

@Module()
export class UserModule extends BaseModule {
	// UserService is automatically injected here
	constructor(private userService: UserService) {
		super();
	}

	async init() {
		console.log(this.userService.getAll());
	}
}
```

> **Note:** For circular dependencies or modules defined later in the list, use `core.getModule(TargetModule)` inside the `init()` method instead of constructor injection.

### Injecting Dependencies in Any Class

You can also inject dependencies into any class (not just modules) using the `Core` instance.

```typescript
import { Core, Injectable } from '@zyrohub/core';

import { UserService } from './services/UserService.js';

@Injectable()
export class UserController {
	constructor(private userService: UserService) {}

	async getUsers() {
		return await this.userService.getAll();
	}
}
```

```typescript
import { Module, BaseModule, type Core } from '@zyrohub/core';

import { UserController } from './controllers/UserController.js';

@Module()
export class UserModule extends BaseModule {
	async init() {
		const userController = this.core.instantiate(UserController);
		console.log(await userController.getUsers());
	}
}
```

### Token Injection (@Inject)

You can assign a custom token to a module using the second argument of `.mount()`. This is especially useful for running multiple instances of the same module or injecting specific configurations.

```typescript
import { Inject, Module, BaseModule } from '@zyrohub/core';

@Module()
export class BotModule extends BaseModule {
	constructor(@Inject('BOT_TOKEN') private token: string) {
		super();
	}
}

// Using .mount(options, token) to register with a custom token
const core = new Core({
	modules: [
		// This module will be registered as 'BOT_SALES' in the provider container
		BotModule.mount({ settings: '...' }, 'BOT_SALES'),

		// This one as 'BOT_SUPPORT'
		BotModule.mount({ settings: '...' }, 'BOT_SUPPORT')
	]
});
```

To consume these specific instances later:

```typescript
// Injecting by Token
constructor(@Inject('BOT_SALES') private salesBot: BotModule) {}

// Or resolving manually
const supportBot = core.resolve('BOT_SUPPORT');
```

To consume these specific instances later:

```typescript
@Module()
export class SalesController extends BaseModule {
	// Injecting by Token
	constructor(@Inject('BOT_SALES') private salesBot: BotModule) {
		super();
	}

	async init() {
		// Use salesBot instance...
	}
}

// Or resolving manually
const supportBot = core.resolve('BOT_SUPPORT');
```

### Core DI Methods (instantiate & resolve)

The `Core` exposes methods to interact with the DI container manually, useful for Controllers or external scripts.

```typescript
// 1. Instantiate: Creates a NEW instance with dependencies injected (Transient)
const userController = core.instantiate(UserController);

// 2. Resolve: Retrieves an EXISTING singleton instance (Service or Module)
const databaseModule = core.resolve(DatabaseModule);
```

## Lifecycle

The framework manages the application lifecycle.

### Initialization (init)

1.  **Instantiation Phase:** All modules are instantiated and registered in the provider container.
2.  **Initialization Phase:** The `init()` method of each module is called. It is safe to communicate with other modules here.

### Graceful Shutdown (shutdown)

The Core listens for system signals (`SIGINT`, `SIGTERM`). When received:

1.  The `shutdown()` method is called on all modules, in **reverse order** of initialization.
2.  The application exits gracefully.

## Events

The core emits events that you can listen to.

```typescript
core.on('ready', ({ core }) => {
	console.log('Core is ready!');
});

core.on('moduleInit', ({ module }) => {
	console.log(`Module ${module.getName()} initialized.`);
});

core.on('shutdown', () => {
	console.log('Application shut down.');
});
```
