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

const EventEmitter = require('events')
const Bluebird = require('bluebird')
const net = require('net')
const rethinkdb = require('rethinkdb')

/**
 * @summary Start the permissions proxy
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {Number} options.port - TCP listen port
 * @param {Object} options.db - database options
 * @param {String} options.db.host - database host
 * @param {Number} options.db.port - database port
 * @param {String} options.db.user - database user
 * @param {String} options.db.password - database password
 * @param {String} [options.db.certificate] - database SSL certificate
 * @returns {EventEmitter}
 *
 * @example
 * const server = proxy.listen({
 *   port: 9999,
 *   db: {
 *     host: 'localhost',
 *     port: 28015,
 *     username: 'admin',
 *     password: 'secret'
 *   }
 * })
 *
 * server.on('error', (error) => {
 *   throw error
 * })
 *
 * server.on('ready', () => {
 *   console.log('The proxy is accepting connections')
 * })
 */
exports.listen = (options) => {
	const emitter = new EventEmitter()

	const dbOptions = {
		host: options.db.host,
		port: options.db.port,
		user: options.db.user,
		password: options.db.password
	}

	if (options.db.certificate) {
		dbOptions.ssl = {
			ca: Buffer.from(options.db.certificate)
		}
	}

	rethinkdb.connect(dbOptions).then((connection) => {
		emitter.server = net.createServer()

		emitter.server.on('connection', (client) => {
			client.on('data', (data) => {
				return Bluebird.fromCallback((callback) => {
					// eslint-disable-next-line no-underscore-dangle
					return connection._start({
						build: () => {
							return JSON.parse(data.toString())
						}
					}, callback, {})
				}).then((result) => {
					return result.toArray
						? Bluebird.fromCallback(result.toArray.bind(result))
						: result
				}).then((result) => {
					client.write(JSON.stringify(result))
				}).catch((error) => {
					emitter.emit('error', error)
				})
			})
		})

		emitter.server.on('error', (error) => {
			emitter.emit('error', error)
		})

		emitter.server.listen(options.port, () => {
			emitter.emit('ready')
		})
	}).catch((error) => {
		emitter.emit('error', error)
	})

	return emitter
}

/**
 * @summary Terminate a permissions proxy
 * @function
 * @public
 *
 * @param {Object} proxy - proxy instance
 * @returns {Promise}
 *
 * @example
 * const server = proxy.listen({
 *   port: 9999,
 *   db: {
 *     host: 'localhost',
 *     port: 28015,
 *     username: 'admin',
 *     password: 'secret'
 *   }
 * })
 *
 * proxy.close(server)
 */
exports.close = (proxy) => {
	return Bluebird.fromCallback((callback) => {
		return proxy.server.close(callback)
	})
}

/**
 * @summary Send a query to the permissions proxy
 * @function
 * @public
 *
 * @param {Object} query - ReQL query object
 * @param {Object} options - options
 * @param {String} options.host - proxy host
 * @param {Number} options.port - proxy port
 * @param {String} options.user - user
 * @param {String} options.password - password
 * @returns {EventEmitter}
 *
 * @example
 * const r = require('rethinkdb')
 *
 * const query = proxy.sendQuery(r.db('test').table('foo'), {
 *   host: 'localhost',
 *   port: 9999,
 *   user: 'myuser',
 *   password: 'mypasword'
 * })
 *
 * query.on('error', (error) => {
 *   throw error
 * })
 *
 * query.on('done', (result) => {
 *   console.log(result)
 * })
 */
exports.sendQuery = (query, options) => {
	const emitter = new EventEmitter()
	const client = net.createConnection({
		host: options.host,
		port: options.port
	})

	client.on('connect', () => {
		client.write(JSON.stringify(query.build()))
	})

	client.on('error', (error) => {
		emitter.emit('error', error)
	})

	client.on('data', (data) => {
		client.end()
		emitter.emit('done', JSON.parse(data.toString()))
	})

	return emitter
}
