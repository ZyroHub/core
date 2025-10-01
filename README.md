<div align="center">
    <img src="https://i.imgur.com/KVVR2dM.png">
</div>

## ZyroHub - Core

<p>This is the core module of ZyroHub ecosystem, providing modules and services for building and managing applications.</p>

## Table of Contents
- [ZyroHub - Core](#zyrohub---core)
- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
	- [Creating a Core Instance and importing Modules](#creating-a-core-instance-and-importing-modules)
	- [Creating a Core Instance with Cluster Support](#creating-a-core-instance-with-cluster-support)
		- [Cluster Options](#cluster-options)
- [Creating Modules](#creating-modules)
	- [Basic Module Structure](#basic-module-structure)
	- [Importing your Module into Core](#importing-your-module-into-core)
	- [Importing a Module into another Module](#importing-a-module-into-another-module)
	- [Getting the Global Core Instance](#getting-the-global-core-instance)
- [Events](#events)
	- [Core Events](#core-events)
		- [Ready Event](#ready-event)
		- [Module Initialized Event](#module-initialized-event)

## Getting Started

To install the core module, use one of the following package managers:

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

## Basic Usage

### Creating a Core Instance and importing Modules

The modules are automatically initialized in order when the core instance is created. You can import and use other modules from the ZyroHub ecosystem (or custom modules) as needed.

```typescript
import { Core } from '@zyrohub/core';

// Example modules
import { SomeModule } from '@zyrohub/some-module';
import { AnotherModule } from '@zyrohub/another-module';

const core = new Core({
	modules: [SomeModule, AnotherModule]
});

core.init();
```

### Creating a Core Instance with Cluster Support

You can also create a Clustered Core instance to take advantage of multi-core systems. The clustered core will automatically manage worker processes for you.

```typescript
import { ClusteredCore } from '@zyrohub/core';

// Example modules
import { AnotherModule } from '@zyrohub/another-module';
import { SomeModule } from '@zyrohub/some-module';

const core = new ClusteredCore({
	// You can pass core options here as well
	core: {
		modules: [SomeModule, AnotherModule]
	}
});

core.init();
```

#### Cluster Options
* `cpus`: (default: number of available CPU cores) Number of CPU cores to use.
* `workers`: Additional arguments to pass to worker processes.
  * `autoRestart`: Configuration for automatic worker restarts.
    * `enabled`: (default: true) Whether to enable automatic restarts.
    * `delay`: (default: 5000) Delay in milliseconds before restarting a worker.

## Creating Modules

### Basic Module Structure

```typescript
import { BaseModule } from '@zyrohub/core';

export interface MyModuleOptions {
	// Define your initial module options here
}

export class MyModule extends BaseModule {
	static options: MyModuleOptions;

	async init(data: { core: Core; options: MyModuleOptions }) {
		console.log('MyModule initialized');
	}
}
```

### Importing your Module into Core

```typescript
import { Core } from '@zyrohub/core';

import { MyModule } from './path-to-my-module';

const core = new Core({
	modules: [MyModule]
});

core.init();
```

### Importing a Module into another Module

```typescript
import { Core, BaseModule } from '@zyrohub/core';

// Importing another module to use within this module
import { MyModule } from './path-to-my-module';

export interface CustomModuleOptions {
	// ...

	async init(data: { core: Core; options: CustomModuleOptions }) {
		const myModule = data.core.getModule(MyModule);
		// Use myModule as needed
	}
}
```

### Getting the Global Core Instance

When needed, you can get the global core instance from anywhere in your application using the static method `Core.getInstance()`.

```typescript
import { Core } from '@zyrohub/core';

const someFunction = () => {
	// Get the global core instance
	const core = Core.getInstance();
};
```

## Events

### Core Events

The core and modules can emit and listen to events using the built-in event system.

#### Ready Event

The `ready` event is emitted when the core and all its modules have been initialized.

- Data:
- `core`: The core instance.

```typescript
core.on('ready', data => {
	console.log('Core and all modules are ready', data.core);
});
```

#### Module Initialized Event

The `moduleInit` event is emitted when a specific module has been initialized.

- Data:
- `module`: The initialized module instance.

```typescript
core.on('moduleInit', data => {
	console.log('Module initialized:', data.module.getName());
});
```
