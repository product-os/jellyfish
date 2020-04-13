/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const environment = require('../../lib/environment')
const express = require('express')
const http = require('http')
const logger = require('../../lib/logger').getLogger(__filename)
const {
	metrics
} = require('@balena/node-metrics-gatherer')

// Prometheus metric names
const metricNames = {
	CARD_UPSERT_TOTAL: 'jf_card_upsert_total',
	CARD_INSERT_TOTAL: 'jf_card_insert_total',
	CARD_READ_TOTAL: 'jf_card_read_total',
	MIRROR_TOTAL: 'jf_mirror_total',
	MIRROR_DURATION: 'jf_mirror_duration_ms',
	MIRROR_FAILURE_TOTAL: 'jf_mirror_failure_total',
	WORKER_SATURATION: 'jf_worker_saturation',
	WORKER_JOB_DURATION: 'jf_worker_job_duration_ms',
	WORKER_ACTION_REQUEST_TOTAL: 'jf_worker_action_request_total',
	BACK_SYNC_CARD_TOTAL: 'jf_back_sync_total'
}

/**
 * @summary Measure duration of a promise execution and add to metrics
 * @function
 *
 * @param {String} name - metric name
 * @param {Object|Undefined} labels - metric labels
 * @param {Promise} fn - function to execute and measure
 * @returns {Any} promise execution result
 *
 * @example
 * const result = await measureAsync('my_metric', { ... }, myFunction, ...params)
 */
const measureAsync = async (name, labels, fn) => {
	const start = new Date()
	const result = await fn()
	const end = new Date()
	const duration = end.getTime() - start.getTime()
	metrics.histogram(name, duration, labels)
	return result
}

/**
 * @summary Checks if an object looks to be a valid card or not.
 * @function
 *
 * @param {Object} card - object to validate
 * @returns {Boolean} validation result, true if card, false if not
 *
 * @example
 * const result = isCard(card)
 */
const isCard = (card) => {
	if (_.isPlainObject(card) && _.isString(card.type)) {
		return true
	}
	return false
}

/**
 * @summary Create express app using metrics and expose data on /metrics
 * @function
 *
 * @param {Object} context - execution context
 * @returns {Object} express app
 *
 * @example
 * const application = metrics.initExpress(context)
 */
exports.initExpress = (context) => {
	return metrics.collectAPIMetrics(express())
}

/**
 * @summary Expose gathered metrics on /metrics
 * @function
 *
 * @param {Object} context - execution context
 *
 * @example
 * metrics.startServer(context)
 */
exports.startServer = (context) => {
	logger.info(context, 'Starting metrics server')
	const application = express()
	const server = http.Server(application)
	const b64enc = Buffer.from(`monitor:${environment.metrics.token}`).toString('base64')
	const isAuthorized = (req) => {
		return req.get('Authorization') === `Basic ${b64enc}`
	}
	application.use('/metrics', metrics.requestHandler(isAuthorized))
	server.on('listening', () => {
		logger.info(context, `Metrics server listening on :${server.address().port}/app_metrics`)
	})

	// Use default port if possible, otherwise fall back to random port.
	// This is not a problem when running multiple metrics instances on compose or kubernetes.
	server.on('error', (error) => {
		if (error.code === 'EADDRINUSE') {
			server.listen(0)
		} else {
			logger.error(context, 'Metrics server error', {
				error
			})
			throw error
		}
	})
	server.listen(environment.metrics.ports.app)
}

/**
 * @summary Mark that a card was inserted
 * @function
 *
 * @param {Object} card - card that was inserted
 *
 * @example
 * metrics.markCardInsert(card)
 */
exports.markCardInsert = (card) => {
	if (!isCard(card)) {
		return
	}
	metrics.inc(metricNames.CARD_INSERT_TOTAL, 1, {
		type: card.type.split('@')[0]
	})
}

/**
 * @summary Mark that a card was upserted
 * @function
 *
 * @param {Object} card - card that was upserted
 *
 * @example
 * metrics.markCardUpsert(card)
 */
exports.markCardUpsert = (card) => {
	if (!isCard(card)) {
		return
	}
	metrics.inc(metricNames.CARD_UPSERT_TOTAL, 1, {
		type: card.type.split('@')[0]
	})
}

/**
 * @summary Mark that a card was read from the database
 * @function
 *
 * @param {Object} card - card that was read the database
 *
 * @example
 * metrics.markCardReadFromDatabase(card)
 */
exports.markCardReadFromDatabase = (card) => {
	if (!isCard(card)) {
		return
	}
	metrics.inc(metricNames.CARD_READ_TOTAL, 1, {
		type: card.type.split('@')[0],
		source: 'database'
	})
}

/**
 * @summary Mark that a card was read from cache
 * @function
 *
 * @param {Object} card - card that was read from cache
 *
 * @example
 * metrics.markCardReadFromCache(card)
 */
exports.markCardReadFromCache = (card) => {
	if (!isCard(card)) {
		return
	}
	metrics.inc(metricNames.CARD_READ_TOTAL, 1, {
		type: card.type.split('@')[0],
		source: 'cache'
	})
}

/**
 * @summary Mark that a card has been created due to back-sync
 * @function
 *
 * @param {String} integration - name of integration
 *
 * @example
 * metrics.markBackSync('front')
 */
exports.markBackSync = (integration) => {
	metrics.inc(metricNames.BACK_SYNC_CARD_TOTAL, 1, {
		type: integration
	})
}

/**
 * @summary Execute an action request, recording duration and worker saturation
 * @function
 *
 * @param {Object} actionRequest - action request definition
 * @param {Promise} fn - action request function to execute
 * @returns {Any} action request execution result
 *
 * @example
 * const result = await metrics.measureActionRequestExecution(actionRequest, async () => {
 *   worker.execute(id, actionRequest)
 * })
 */
exports.measureActionRequestExecution = async (actionRequest, fn) => {
	const labels = {
		type: actionRequest.data.action.split('@')[0]
	}
	metrics.inc(metricNames.WORKER_ACTION_REQUEST_TOTAL, 1, labels)
	metrics.inc(metricNames.WORKER_SATURATION, 1, labels)
	const result = await measureAsync(metricNames.WORKER_JOB_DURATION, labels, fn).catch((err) => {
		metrics.dec(metricNames.WORKER_SATURATION, 1, labels)
		throw err
	})
	metrics.dec(metricNames.WORKER_SATURATION, 1, labels)
	return result
}

/**
 * @summary Execute a mirror, marking duration and totals
 * @function
 *
 * @param {Object} integration - name of external integration
 * @param {Promise} fn - mirror function to execute
 * @returns {Any} mirror result
 *
 * @example
 * const result = await metrics.measureMirror('github', mirror())
 */
exports.measureMirror = async (integration, fn) => {
	const labels = {
		type: integration
	}
	metrics.inc(metricNames.MIRROR_TOTAL, 1)
	const result = await measureAsync(metricNames.MIRROR_DURATION, labels, fn).catch((err) => {
		metrics.inc(metricNames.MIRROR_FAILURE_TOTAL, 1, labels)
		throw err
	})
	return result
}
