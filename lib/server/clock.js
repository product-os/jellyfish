/*
 * Copyright 2019 resin.io
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

const EventEmitter = require('events').EventEmitter
const Bluebird = require('bluebird')

let run = true
let currentTickPromise = Bluebird.resolve()

const tick = async (worker, context, session, delay) => {
	currentTickPromise = worker.tick(context, session, {
		currentDate: new Date()
	})
	await currentTickPromise

	if (!run) {
		return Bluebird.resolve()
	}

	await Bluebird.delay(delay)
	return tick(worker, context, session, delay)
}

exports.start = (context, worker, session, delay) => {
	const emitter = new EventEmitter()
	run = true

	tick(worker, context, session, delay).catch((error) => {
		emitter.emit('error', error)
	})

	return emitter
}

exports.stop = async (emitter) => {
	run = false
	emitter.removeAllListeners()
	await currentTickPromise
}
