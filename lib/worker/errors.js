/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

exports.WorkerNoExecuteEvent = class WorkerNoExecuteEvent extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerNoExecuteEvent'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerNoElement = class WorkerNoElement extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerNoElement'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerInvalidAction = class WorkerInvalidAction extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerInvalidAction'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerInvalidActionRequest = class WorkerInvalidActionRequest extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerInvalidActionRequest'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerInvalidTrigger = class WorkerInvalidTrigger extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerInvalidTrigger'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerInvalidTemplate = class WorkerInvalidTemplate extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerInvalidTemplate'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerInvalidDuration = class WorkerInvalidDuration extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerInvalidDuration'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerSchemaMismatch = class WorkerSchemaMismatch extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerSchemaMismatch'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}

exports.WorkerAuthenticationError = class WorkerAuthenticationError extends Error {
	constructor (message, ctx) {
		super(message)
		this.name = 'WorkerAuthenticationError'
		this.ctx = ctx
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}

	getContext () {
		return this.ctx
	}
}
