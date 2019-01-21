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

const _ = require('lodash')
const randomstring = require('randomstring')
const bodyParser = require('body-parser')
const compression = require('compression')
const responseTime = require('response-time')
const express = require('express')
const logger = require('../../logger').getLogger(__filename)

// A regex that matches file types that should be compressed
const COMPRESSION_REGEX = /\.(mp3|js|map|svg)$/

module.exports = (application, jellyfish, options) => {
	// Enable compression only for static files and the homepage
	application.use(compression({
		filter: (request, response) => {
			if (request.url === '/' || request.url.match(COMPRESSION_REGEX)) {
				return compression.filter(request, response)
			}

			return false
		}
	}))

	application.use(bodyParser.json({
		// A small trick to preserve the unparsed JSON
		verify: (request, response, buffer, encoding) => {
			request.rawBody = buffer.toString('utf8')
		}
	}))

	application.use(express.static('dist'))

	application.use((request, response, next) => {
		response.header('Access-Control-Allow-Origin', '*')
		response.header('Access-Control-Allow-Headers', [
			'Accept',
			'Authorization',
			'Content-Type',
			'Origin',
			'X-Requested-With'
		].join(', '))
		response.header('Access-Control-Allow-Methods', [
			'DELETE',
			'GET',
			'HEAD',
			'OPTIONS',
			'PATCH',
			'POST',
			'PUT'
		].join(', '))

		return next()
	})

	application.use((request, response, next) => {
		const context = {
			id: `REQUEST-${randomstring.generate(20)}`
		}

		logger.info(context, 'HTTP request start', {
			uri: request.originalUrl
		})

		request.context = context
		return next()
	})

	application.use(responseTime((request, response, time) => {
		logger.info(request.context, 'HTTP request end', {
			uri: request.originalUrl,
			time
		})
	}))

	application.use((request, response, next) => {
		const authorization = request.headers.authorization
		const token = _.last(_.split(authorization, ' '))
		request.sessionToken = token || options.guestSession
		return next()
	})
}
