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

module.exports = class LivePg extends EventEmitter {
	constructor (client, channel, table) {
		super()

		this.table = table
		this.channel = channel

		this.triggerProcedure = `livepg_${this.channel}`
		this.triggerName = `${this.channel}_${this.table}`

		this.client = client
		this.waitingPayloads = {}
	}

	async select () {
		await this.client.query([
			'BEGIN',
			`DROP TRIGGER IF EXISTS "${this.triggerName}" ON "${this.table}"`,
			[
				`CREATE TRIGGER "${this.triggerName}"`,
				`AFTER INSERT OR UPDATE OR DELETE ON "${this.table}"`,
				`FOR EACH ROW EXECUTE PROCEDURE "${this.triggerProcedure}"()`
			].join(' '),
			'COMMIT'
		].join('; '))

		await this.client.query(`LISTEN "${this.channel}"`)

		this.client.on('notification', (info) => {
			let payload = null
			try {
				payload = this.processNotification(info.payload)
			} catch (error) {
				this.emit('error', error)
			}

			// Only continue if full notification has arrived
			if (_.isNull(payload)) {
				return
			}

			this.emit('change', payload)
		})
	}

	async start () {
		await this.client.query(
			createTriggerSQL(this.triggerProcedure, this.channel))

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
			`DROP TRIGGER IF EXISTS "${this.triggerName}" ON ${this.table}`,
			`DROP FUNCTION IF EXISTS "${this.triggerProcedure}"() CASCADE`,
			'COMMIT'
		].join('; '))
	}

	processNotification (payload) {
		const argSep = []

		// Notification is 4 parts split by colons
		while (argSep.length < 3) {
			const lastPos = argSep.length === 0
				? 0
				: argSep[argSep.length - 1] + 1
			argSep.push(payload.indexOf(':', lastPos))
		}

		const msgHash = payload.slice(0, argSep[0])
		const pageCount = payload.slice(argSep[0] + 1, argSep[1])
		const curPage = payload.slice(argSep[1] + 1, argSep[2])
		const msgPart = payload.slice(argSep[2] + 1, argSep[3])
		let fullMsg = ''

		if (pageCount > 1) {
			// Piece together multi-part messages
			if (!(msgHash in this.waitingPayloads)) {
				this.waitingPayloads[msgHash] = _.times(pageCount, _.constant(null))
			}
			this.waitingPayloads[msgHash][curPage - 1] = msgPart

			if (_.includes(this.waitingPayloads[msgHash], null)) {
				// Must wait for full message
				return null
			}

			fullMsg = this.waitingPayloads[msgHash].join('')

			Reflect.deleteProperty(this.waitingPayloads, msgHash)
		} else {
			// Payload small enough to fit in single message
			fullMsg = msgPart
		}

		try {
			return _.defaults(JSON.parse(fullMsg), {
				before: null,
				after: null
			})
		} catch (error) {
			throw new Error(`Invalid notification: ${fullMsg}`)
		}
	}
}
