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
	constructor (message, context) {
		super(message)
		this.name = 'WorkerNoExecuteEvent'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerNoElement = class WorkerNoElement extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerNoElement'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerInvalidAction = class WorkerInvalidAction extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerInvalidAction'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerInvalidActionRequest = class WorkerInvalidActionRequest extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerInvalidActionRequest'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerInvalidTrigger = class WorkerInvalidTrigger extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerInvalidTrigger'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerInvalidTemplate = class WorkerInvalidTemplate extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerInvalidTemplate'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerInvalidDuration = class WorkerInvalidDuration extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerInvalidDuration'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerSchemaMismatch = class WorkerSchemaMismatch extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerSchemaMismatch'
		this.context = context
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}

exports.WorkerAuthenticationError = class WorkerAuthenticationError extends Error {
	constructor (message, context) {
		super(message)
		this.name = 'WorkerAuthenticationError'
		this.context = context
		this.expected = true
		this.stack = this.stack.replace(/^[^:]+:/, `${this.name}:`)
	}
}
