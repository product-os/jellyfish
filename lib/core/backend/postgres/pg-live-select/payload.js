/*
 * Adapted from https://github.com/numtel/pg-live-select
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015
 *
 * Ben Green <ben@latenightsketches.com>
 * Robert Myers <rbmyr8@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const _ = require('lodash')

const jsonParse = (string) => {
	try {
		return JSON.parse(string)
	} catch (error) {
		throw new Error(`Invalid notification: ${string}`)
	}
}

exports.parse = (data) => {
	const positions = []

	// Notification is a 4 parts string split by colons
	while (positions.length < 3) {
		const lastSeparatorIndex = positions.length === 0
			? 0
			: positions[positions.length - 1] + 1
		positions.push(data.indexOf(':', lastSeparatorIndex))
	}

	return {
		checksum: data.slice(0, positions[0]),
		totalPages: parseInt(data.slice(positions[0] + 1, positions[1]), 10),
		currentPage: parseInt(data.slice(positions[1] + 1, positions[2]), 10),
		message: data.slice(positions[2] + 1, positions[3])
	}
}

exports.reconstruct = (cache, object) => {
	// Payload small enough to fit in single message
	if (object.totalPages <= 1) {
		return _.defaults(jsonParse(object.message), {
			before: null,
			after: null
		})
	}

	/*
	 * If this is the first part we got from this message,
	 * then create an array on the pending payloads cache
	 * indexed by the message hash, including all "null"
	 * values for the missing "holes" in the message.
	 */
	if (!cache[object.checksum]) {
		cache[object.checksum] =
			_.times(object.totalPages, _.constant(null))
	}

	/*
	 * Fill in the hole we just got.
	 */
	cache[object.checksum][object.currentPage - 1] = object.message

	/*
	 * Don't continue if there are still holes for
	 * this message on the cache.
	 */
	if (cache[object.checksum].includes(null)) {
		// Must wait for full message
		return null
	}

	const result = cache[object.checksum].join('')
	Reflect.deleteProperty(cache, object.checksum)
	return _.defaults(jsonParse(result), {
		before: null,
		after: null
	})
}
