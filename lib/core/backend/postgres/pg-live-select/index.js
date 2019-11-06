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

/*
 * Because Postgres doesn't allow us to run CREATE OR REPLACE FUNCTION
 * concurrently. This "random" big int is a key between clients to
 * synchronize themselves when creating the functions and triggers.
 *
 * See https://vladmihalcea.com/how-do-postgresql-advisory-locks-work/
 */
const TRANSACTION_ADVISORY_LOCK_KEY = 2142043989439426746

module.exports = class LivePg extends EventEmitter {
	constructor (client, channel, table) {
		super()

		this.table = table
		this.channel = channel

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
			this.channel))
		await this.client.query(`LISTEN "${this.channel}"`)

		this.client.on('notification', (info) => {
			let change = null
			try {
				change = payload.reconstruct(
					this.pendingPayloads, payload.parse(info.payload))
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
			this.client.query('SELECT TRUE').catch((error) => {
				this.emit('error', error)
			})
		}, 10000)
	}

	async stop () {
		clearInterval(this.interval)

		await this.client.query([
			'BEGIN',
			`SELECT pg_advisory_xact_lock(${TRANSACTION_ADVISORY_LOCK_KEY})`,
			`DROP TRIGGER IF EXISTS "${this.triggerName}" ON ${this.table}`,
			`DROP FUNCTION IF EXISTS "${this.triggerProcedure}"() CASCADE`,
			'COMMIT'
		].join('; '))
	}
}
