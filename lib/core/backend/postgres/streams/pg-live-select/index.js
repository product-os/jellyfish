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
const murmurHash = require('murmurhash').v3

const querySequence = require('./query-sequence')
const SelectHandle = require('./select-handle')
const createTriggerSQL = require('./trigger-sql')

class LivePg extends EventEmitter {
	constructor (client, channel, context) {
		super()

		this.context = context

		this.client = client
		this.channel = channel
		this.triggerFun = `livepg_${channel}`
		this.waitingPayloads = {}
		this.allTablesUsed = {}

		this.initTriggerFun()

		// Periodically send a spoof query to keep the client open
		this.interval = setInterval(async () => {
			await client.query('SELECT TRUE')
		}, 10000)
	}

	async select (query, params = []) {
		if (!_.isString(query)) {
			throw new Error('Query should be a string')
		}

		if (!_.isArray(params)) {
			throw new Error('Params should be an array')
		}

		const queryHash = murmurHash(JSON.stringify([ query, params ]))
		const handle = new SelectHandle(this, queryHash)

		this.handle = handle

		const attachTriggers = async (tablesUsed) => {
			const queries = []

			tablesUsed.forEach((table) => {
				if (!(table in this.allTablesUsed)) {
					this.allTablesUsed[table] = [ queryHash ]
					const triggerName = `${this.channel}_${table}`
					queries.push(
						'BEGIN;' +
						`DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}";` +
						`CREATE TRIGGER "${triggerName}" ` +
						`AFTER INSERT OR UPDATE OR DELETE ON "${table}" ` +
						`FOR EACH ROW EXECUTE PROCEDURE "${this.triggerFun}"();` +
						'COMMIT;'
					)
				} else if (_.includes(this.allTablesUsed[table], queryHash)) {
					this.allTablesUsed[table].push(queryHash)
				}
			})

			if (queries.length !== 0) {
				await querySequence(this.client, queries)
			}
		}

		const tables = await findDependentRelations(this.client, query, params)
		await attachTriggers(tables)

		await this.initListener()

		return handle
	}

	async initListener () {
		const {
			client,
			handle
		} = this

		await client.query(`LISTEN "${this.channel}"`)

		client.on('notification', (info) => {
			if (info.channel === this.channel) {
				try {
					const payload = this.processNotification(info.payload)

					// Only continue if full notification has arrived
					if (payload === null) {
						return
					}

					if (payload.table in this.allTablesUsed) {
						handle.emit('change', _.defaults(payload, {
							before: null,
							after: null
						}))
					}
				} catch (error) {
					this.emit('error', error)
				}
			}
		})
	}

	async cleanup () {
		clearInterval(this.interval)

		const queries = Object.keys(this.allTablesUsed).map((table) => {
			return `DROP TRIGGER IF EXISTS "${this.channel}_${table}" ON ${table}`
		})

		queries.push(`DROP FUNCTION IF EXISTS "${this.triggerFun}"() CASCADE`)

		await querySequence(this.client, queries, this.context)
	}

	async initTriggerFun () {
		await querySequence(this.client, [
			createTriggerSQL(this.triggerFun, this.channel)
		])
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
			return JSON.parse(fullMsg)
		} catch (error) {
			throw new Error(`Invalid notification: ${fullMsg}`)
		}
	}
}

const findDependentRelations = async (client, query, params) => {
	const nodeWalker = (tree) => {
		let found = []

		const checkNode = function (node) {
			if ('Plans' in node) {
				found = found.concat(nodeWalker(node.Plans))
			}

			if ('Relation Name' in node) {
				found.push(node['Relation Name'])
			}
		}

		if (_.isArray(tree)) {
			tree.forEach(checkNode)
		} else {
			checkNode(tree)
		}

		return found
	}

	const result = await client.query(`EXPLAIN (FORMAT JSON) ${query}`, params)
	return nodeWalker(result.rows[0]['QUERY PLAN'][0].Plan)
}

module.exports = LivePg
