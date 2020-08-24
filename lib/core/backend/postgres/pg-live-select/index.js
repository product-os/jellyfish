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

const EventEmitter = require('events').EventEmitter
const _ = require('lodash')
const createTriggerSQL = require('./trigger-sql')
const payload = require('./payload')

// The notification mechanism has a 8000 byte limit for its payload, and thus
// some changes have to be broken up into multiple notifications. To that end,
// we transmit 4 pieces of information in that payload:
//
// - An unique message identifier
// - The total number of pages required to reconstruct the whole message
// - The current page
// - A piece of the actual message
//
// We reserve 20 bytes for the identifier (fixed), up to 4 bytes for the total
// and current page counts, and 2 bytes for separators. This leaves 7970 bytes
// for the message itself.
//
// The payload must be a valid string. So each payload component is encoded as
// follows:
//
// - Identifier: random string
// - Counts: base-10 numbers
// - Message: base64-encoded slices of an UTF-8 byte buffer. Slices may not be
//   valid UTF-8, but when decoded concatenated in order they must result in a
//   valid UTF-8 string containing a valid stringified JSON object
//
// The whole payload is encoded as:
//
// <Identifier><Total Pages>:<Current Page>:<Message>
//
// (note that there is no separator after the identifier)
const ID_LEN = 20
const COUNT_MAX_LEN = 4
const SEPARATOR = ':'
const MESSAGE_MAX_LEN = 8000 - ID_LEN - 2 * COUNT_MAX_LEN - 2 * SEPARATOR.length

/*
 * Because Postgres doesn't allow us to run CREATE OR REPLACE FUNCTION
 * concurrently. This "random" big int is a key between clients to
 * synchronize themselves when creating the functions and triggers.
 *
 * See https://vladmihalcea.com/how-do-postgresql-advisory-locks-work/
 */
const TRANSACTION_ADVISORY_LOCK_KEY = 2142043989439426746

module.exports = class LivePg extends EventEmitter {
	constructor (client, channel, table, columns) {
		super()

		this.table = table
		this.channel = channel
		this.columns = columns

		this.triggerProcedure = `livepg_${this.channel}`
		this.triggerName = `${this.channel}_${this.table}`

		this.client = client
		this.pendingPayloads = {}
	}

	async select () {
		await this.client.query(createTriggerSQL(
			TRANSACTION_ADVISORY_LOCK_KEY,
			this.triggerProcedure,
			this.triggerName,
			this.table,
			this.channel,
			this.columns,
			MESSAGE_MAX_LEN
		))
		await this.client.query(`LISTEN "${this.channel}"`)

		this.client.on('notification', (info) => {
			let change = null
			try {
				change = payload.reconstruct(
					this.pendingPayloads, payload.parse(info.payload, ID_LEN, SEPARATOR))
			} catch (error) {
				this.emit('error', error)
				return
			}

			// Only continue if full notification has arrived
			if (_.isNull(change)) {
				return
			}

			this.emit('change', change)
		})
	}

	getWaitingCount () {
		return Object.keys(this.pendingPayloads).length
	}

	async start () {
		// Periodically send a spoof query to keep the client open
		this.interval = setInterval(() => {
			this.client.query({
				name: 'connection-test',
				text: 'select true'
			}).catch((error) => {
				this.emit('error', error)
			})
		}, 10000)
	}

	async stop () {
		clearInterval(this.interval)
	}
}
