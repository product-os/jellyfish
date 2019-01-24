/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
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

module.exports = class MemoryQueue {
	/**
   * @summary An in-memory worker queue
   * @class
   * @public
   *
   * @example
	 * const queue = new MemoryQueue()
   */
	constructor () {
		this.data = []
	}

	/**
	 * @summary Enqueue a request
	 * @function
	 * @public
	 *
	 * @param {Object} request - request
	 *
	 * @example
	 * const queue = new MemoryQueue()
	 * await queue.enqueue({
	 *   action: 'action-create-card',
	 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
	 *   type: 'card',
	 *   arguments: {
	 *     properties: {
	 *       data: {
	 *         foo: 'bar'
	 *       }
	 *     }
	 *   }
	 * })
	 */
	async enqueue (request) {
		// Give priority to actions other than event insertions
		if (request.data.action === 'action-create-event') {
			this.data.push(request)
		} else {
			this.data.unshift(request)
		}
	}

	/**
	 * @summary Get next request from the queue
	 * @function
	 * @public
	 *
	 * @returns {(Object|Null)} request
	 *
	 * @example
	 * const queue = new MemoryQueue()
	 * const request = await queue.dequeue()
	 * if (request) {
	 *   console.log(request.id)
	 * }
	 */
	async dequeue () {
		return this.data.shift()
	}

	/**
	 * @summary Get the length of the queue
	 * @function
	 * @public
	 *
	 * @returns {Number} length
	 *
	 * @example
	 * const queue = new MemoryQueue()
	 * const length = await queue.length()
	 * console.log(length)
	 */
	async length () {
		return this.data.length
	}
}
