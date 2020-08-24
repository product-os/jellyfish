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
const util = require('util')

const jsonParse = (string) => {
	try {
		return JSON.parse(string)
	} catch (error) {
		throw new Error(`Invalid notification: ${string}`)
	}
}

// See `index.js` for the structure
exports.parse = (data, idLen, separator) => {
	const sep0 = data.indexOf(separator, idLen)
	const sep1 = data.indexOf(separator, sep0 + 1)

	return {
		identity: data.slice(0, idLen),
		totalPages: parseInt(data.slice(idLen, sep0), 10),
		currentPage: parseInt(data.slice(sep0 + 1, sep1), 10),
		message: Buffer.from(data.slice(sep1 + 1), 'base64')
	}
}

exports.reconstruct = (cache, object) => {
	// Payload small enough to fit in single message
	if (object.totalPages <= 1) {
		const message = new util.TextDecoder('utf-8').decode(object.message)

		return _.defaults(jsonParse(message), {
			before: null,
			after: null
		})
	}

	/*
	 * If this is the first part we got from this message,
	 * then create an array on the pending payloads cache
	 * indexed by the message hash, including all "null"
	 * values for the missing "holes" in the message.
	 * Also store the number of pending pages so that we
	 * don't need to check for nulls.
	 */
	let partial = cache[object.identity]
	if (!partial) {
		partial = {
			slices: _.times(object.totalPages, _.constant(null)),
			pendingPages: object.totalPages
		}
		cache[object.identity] = partial
	}

	/*
	 * Fill in the hole we just got.
	 */
	partial.slices[object.currentPage - 1] = object.message
	partial.pendingPages -= 1

	/*
	 * Don't continue if there are still holes for
	 * this message on the cache.
	 */
	if (partial.pendingPages > 0) {
		// Must wait for full message
		return null
	}

	const decoder = new util.TextDecoder('utf-8')
	const result = partial
		.slices
		.map((chunk) => {
			return decoder.decode(chunk, {
				stream: true
			})
		})
		.join('')
	Reflect.deleteProperty(cache, object.identity)

	return _.defaults(jsonParse(result), {
		before: null,
		after: null
	})
}
