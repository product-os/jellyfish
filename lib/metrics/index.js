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
	MIRROR_DURATION: 'jf_mirror_duration_seconds',
	MIRROR_FAILURE_TOTAL: 'jf_mirror_failure_total',
	WORKER_SATURATION: 'jf_worker_saturation',
	WORKER_JOB_DURATION: 'jf_worker_job_duration_seconds',
	WORKER_CONCURRENCY: 'jf_worker_concurrency',
	WORKER_ACTION_REQUEST_TOTAL: 'jf_worker_action_request_total',
	BACK_SYNC_CARD_TOTAL: 'jf_back_sync_total',
	TRANSLATE_TOTAL: 'jf_translate_total',
	TRANSLATE_DURATION: 'jf_translate_duration_seconds',

	HTTP_QUERY_DURATION: 'jf_http_api_query_duration',
	HTTP_TYPE_DURATION: 'jf_http_api_type_duration',
	HTTP_ID_DURATION: 'jf_http_api_id_duration',
	HTTP_SLUG_DURATION: 'jf_http_api_slug_duration',
	HTTP_ACTION_DURATION: 'jf_http_api_action_duration',
	HTTP_WHOAMI_DURATION: 'jf_http_whoami_query_duration',

	HTTP_QUERY_TOTAL: 'jf_http_api_query_total',
	HTTP_TYPE_TOTAL: 'jf_http_api_type_total',
	HTTP_ID_TOTAL: 'jf_http_api_id_total',
	HTTP_SLUG_TOTAL: 'jf_http_api_slug_total',
	HTTP_ACTION_TOTAL: 'jf_http_api_action_total',
	HTTP_WHOAMI_TOTAL: 'jf_http_whoami_query_total',

	HTTP_QUERY_FAILURE_TOTAL: 'jf_http_api_query_failure_total',
	HTTP_TYPE_FAILURE_TOTAL: 'jf_http_api_type_failure_total',
	HTTP_ID_FAILURE_TOTAL: 'jf_http_api_id_failure_total',
	HTTP_SLUG_FAILURE_TOTAL: 'jf_http_api_slug_failure_total',
	HTTP_ACTION_FAILURE_TOTAL: 'jf_http_api_action_failure_total',
	HTTP_WHOAMI_FAILURE_TOTAL: 'jf_http_whoami_query_failure_total',

	SQL_GEN_DURATION: 'jf_sql_gen_duration_seconds',
	QUERY_DURATION: 'jf_query_duration_seconds',

	STREAMS_SATURATION: 'jf_streams_saturation',
	STREAMS_LINK_QUERY_TOTAL: 'jf_streams_link_query_total',
	STREAMS_ERROR_TOTAL: 'jf_streams_error_total'
}

// Describe each metric
const latencyBuckets = metrics.client.exponentialBuckets(0.004, Math.SQRT2, 29).map((bucket) => {
	return bucket.toFixed(3)
})

const queryLatencyBuckets = metrics.client.exponentialBuckets(0.0011, Math.SQRT2, 30).map((bucket) => {
	return bucket.toFixed(4)
})

metrics.describe.counter(metricNames.CARD_UPSERT_TOTAL, 'number of cards upserted')
metrics.describe.counter(metricNames.CARD_INSERT_TOTAL, 'number of cards inserted')
metrics.describe.counter(metricNames.CARD_READ_TOTAL, 'number of cards read from database/cache')
metrics.describe.counter(metricNames.MIRROR_TOTAL, 'number of mirror calls')
metrics.describe.counter(metricNames.MIRROR_FAILURE_TOTAL, 'number of mirror call failures')
metrics.describe.gauge(metricNames.WORKER_SATURATION, 'number of jobs being processed in worker queues')
metrics.describe.gauge(metricNames.WORKER_CONCURRENCY, 'number of jobs worker queues can process concurrently')
metrics.describe.counter(metricNames.WORKER_ACTION_REQUEST_TOTAL, 'number of received action requests')
metrics.describe.counter(metricNames.TRANSLATE_TOTAL, 'number of translate calls')
metrics.describe.counter(metricNames.HTTP_QUERY_TOTAL, 'number of /query requests')
metrics.describe.counter(metricNames.HTTP_TYPE_TOTAL, 'number of /type requests')
metrics.describe.counter(metricNames.HTTP_ID_TOTAL, 'number of /id requests')
metrics.describe.counter(metricNames.HTTP_SLUG_TOTAL, 'number of /slug requests')
metrics.describe.counter(metricNames.HTTP_ACTION_TOTAL, 'number of /action requests')
metrics.describe.counter(metricNames.HTTP_WHOAMI_TOTAL, 'number of /whoami requests')
metrics.describe.counter(metricNames.HTTP_QUERY_FAILURE_TOTAL, 'number of /query request failures')
metrics.describe.counter(metricNames.HTTP_TYPE_FAILURE_TOTAL, 'number of /type request failures')
metrics.describe.counter(metricNames.HTTP_ID_FAILURE_TOTAL, 'number of /id request failures')
metrics.describe.counter(metricNames.HTTP_SLUG_FAILURE_TOTAL, 'number of /slug request failures')
metrics.describe.counter(metricNames.HTTP_ACTION_FAILURE_TOTAL, 'number of /action request failures')
metrics.describe.counter(metricNames.HTTP_WHOAMI_FAILURE_TOTAL, 'number of /whoami request failures')
metrics.describe.gauge(metricNames.STREAMS_SATURATION, 'number of streams open')
metrics.describe.counter(metricNames.STREAMS_LINK_QUERY_TOTAL, 'number of times streams query links')
metrics.describe.counter(metricNames.STREAMS_ERROR_TOTAL, 'number of stream errors')

metrics.describe.histogram(metricNames.HTTP_QUERY_DURATION,
	'histogram of durations taken to process /query requests in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.HTTP_TYPE_DURATION,
	'histogram of durations taken to process /type requests in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.HTTP_ID_DURATION,
	'histogram of durations taken to process /id requests in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.HTTP_SLUG_DURATION,
	'histogram of durations taken to process /slug requests in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.HTTP_WHOAMI_DURATION,
	'histogram of durations taken to process /whoami requests in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.MIRROR_DURATION,
	'histogram of durations taken to make mirror calls in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.TRANSLATE_DURATION,
	'histogram of durations taken to run translate calls in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.WORKER_JOB_DURATION,
	'histogram of durations taken to complete worker jobs in ms',
	{
		buckets: latencyBuckets
	})

metrics.describe.histogram(metricNames.SQL_GEN_DURATION,
	'histogram of durations taken to generate sql with jsonschema2sql',
	{
		buckets: queryLatencyBuckets
	})

metrics.describe.histogram(metricNames.QUERY_DURATION,
	'histogram of durations taken to query the database',
	{
		buckets: queryLatencyBuckets
	})

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
 * @summary Extract actor name from context ID
 * @function
 *
 * @param {Object} context - caller context
 * @returns {String} actor name
 *
 * @example
 * const actorName = actorFromContext(context)
 */
const actorFromContext = (context) => {
	if (_.has(context, [ 'id' ]) && _.isString(context.id)) {
		return _.dropRight(context.id.split('-'), 6).join('-').toLowerCase()
	}
	return 'unknown'
}

/**
 * @summary Create express app using metrics and expose data on /metrics
 * @function
 *
 * @param {Object} context - execution context
 * @returns {Object} express app
 * @example
 * const application = metrics.initExpress(context)
 */
exports.initExpress = (context) => {
	return metrics.collectAPIMetrics(express())
}

/**
 * Expose gathered metrics on /metrics
 * Reassign port to random port number on collision
 *
 * @function
 *
 * @param {Object} context - execution context
 * @param {Number} port - port to expose metrics on
 *
 * @example
 * metrics.startServer(context, 9000)
 */
exports.startServer = (context, port) => {
	const b64enc = Buffer.from(`monitor:${environment.metrics.token}`).toString('base64')
	const isAuthorized = (req) => {
		return req.get('Authorization') === `Basic ${b64enc}`
	}
	logger.info(context, `Starting metrics server on ${port}`)
	const app = express()
	const server = http.Server(app)
	app.use('/metrics', metrics.requestHandler(isAuthorized))
	server.on('listening', () => {
		logger.info(context, `Metrics server listening on port ${server.address().port}`)
	})
	server.on('error', (err) => {
		if (err.code === 'EADDRINUSE') {
			logger.info(context, `Port ${port} is in use, starting metrics server on a random port`)
			server.listen(0)
		}
	})
	server.listen(port)
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
 * @summary Mark that an action request was received
 * @function
 *
 * @param {String} action - action name
 *
 * @example
 * metrics.markActionRequest('action-create-card')
 */
exports.markActionRequest = (action) => {
	metrics.inc(metricNames.WORKER_ACTION_REQUEST_TOTAL, 1, {
		type: action
	})
}

/**
 * @summary Expose current queue concurrency setting
 * @function
 *
 * @example
 * metrics.markQueueConcurrency()
 */
exports.markQueueConcurrency = () => {
	metrics.gauge(metricNames.WORKER_CONCURRENCY, environment.queue.concurrency)
}

/**
 * @summary Mark that a new job was added to the queue
 * @function
 *
 * @param {String} action - action name
 * @param {String} id - id of the worker
 *
 * @example
 * metrics.markJobAdd('action-create-card', context.id)
 */
exports.markJobAdd = (action, id) => {
	metrics.inc(metricNames.WORKER_SATURATION, 1, {
		type: action,
		worker: id
	})
}

/**
 * @summary Mark that a job in the queue has completed
 * @function
 *
 * @param {String} action - action name
 * @param {String} id - id of the worker
 * @param {String} timestamp - when action was completed
 *
 * @example
 * const action = 'action-create-card'
 * const timestamp = '2020-06-08T09:33:27.481Z'
 * metrics.markJobDone(action, context.id, timestamp)
 */
exports.markJobDone = (action, id, timestamp) => {
	const labels = {
		type: action,
		worker: id
	}
	const duration = new Date().getTime() - new Date(timestamp).getTime()
	metrics.histogram(metricNames.WORKER_JOB_DURATION, duration, labels)
	metrics.dec(metricNames.WORKER_SATURATION, 1, labels)
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
	metrics.inc(metricNames.MIRROR_TOTAL, 1, labels)
	const result = await measureAsync(metricNames.MIRROR_DURATION, labels, fn).catch((err) => {
		metrics.inc(metricNames.MIRROR_FAILURE_TOTAL, 1, labels)
		throw err
	})
	return result
}

/**
 * @summary Execute a translate, marking duration and totals
 * @function
 *
 * @param {Object} integration - name of external integration
 * @param {Promise} fn - mirror function to execute
 * @returns {Any} translate result
 *
 * @example
 * const result = await metrics.measureTranslate('github', translate())
 */
exports.measureTranslate = async (integration, fn) => {
	const labels = {
		type: integration
	}
	metrics.inc(metricNames.TRANSLATE_TOTAL, 1, labels)
	const results = await measureAsync(metricNames.TRANSLATE_DURATION, labels, fn)
	return results
}

/**
 * @summary Generates a generic measurement wrapper for an async function, that
 * tracks total calls, total failures and duration
 * @function
 *
 * @param {String} prefix - metric name prefix
 * @returns {Any} api result
 */
const getAsyncMeasureFn = (prefix) => {
	return async (fn) => {
		const total = `${prefix}_TOTAL`
		const duration = `${prefix}_DURATION`
		const failure = `${prefix}_FAILURE`
		metrics.inc(metricNames[total], 1)
		const result = await measureAsync(metricNames[duration], {}, fn).catch((err) => {
			metrics.inc(metricNames[failure], 1)
			throw err
		})
		return result
	}
}

/**
 * @summary Measure the duration of a request to the /query api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpQuery = getAsyncMeasureFn('HTTP_QUERY')

/**
 * @summary Measure the duration of a request to the /type api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpType = getAsyncMeasureFn('HTTP_TYPE')

/**
 * @summary Measure the duration of a request to the /id api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpId = getAsyncMeasureFn('HTTP_ID')

/**
 * @summary Measure the duration of a request to the /slug api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpSlug = getAsyncMeasureFn('HTTP_SLUG')

/**
 * @summary Measure the duration of a request to the /action api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpAction = getAsyncMeasureFn('HTTP_ACTION')

/**
 * @summary Measure the duration of a request to the /action api endpoint
 * @function
 *
 * @param {Promise} fn - api function to execute
 * @returns {Any} api result
 */
exports.measureHttpWhoami = getAsyncMeasureFn('HTTP_WHOAMI')

/**
 * @summary Mark how long it took to generate an SQL query from a JSON schema
 * @function
 *
 * @param {Number} ms - number of milliseconds it took to generate the query
 */
exports.markSqlGenTime = (ms) => {
	metrics.histogram(metricNames.SQL_GEN_DURATION, ms)
}

/**
 * @summary Mark how long it took to execute an SQL query
 * @function
 *
 * @param {Number} ms - number of milliseconds it took to execute the query
 */
exports.markQueryTime = (ms) => {
	metrics.histogram(metricNames.QUERY_DURATION, ms)
}

/**
 * @summary Mark that a new stream was opened
 * @function
 *
 * @param {Object} context - caller context
 * @param {String} table - table name
 *
 * @example
 * metrics.markStreamOpened(context, 'cards')
 */
exports.markStreamOpened = (context, table) => {
	metrics.inc(metricNames.STREAMS_SATURATION, 1, {
		actor: actorFromContext(context),
		table
	})
}

/**
 * @summary Mark that a stream was closed
 * @function
 *
 * @param {Object} context - caller context
 * @param {String} table - table name
 *
 * @example
 * metrics.markStreamClosed(context, 'cards')
 */
exports.markStreamClosed = (context, table) => {
	metrics.dec(metricNames.STREAMS_SATURATION, 1, {
		actor: actorFromContext(context),
		table
	})
}

/**
 * @summary Mark that a stream is querying links
 * @function
 *
 * @param {Object} context - caller context
 * @param {String} table - table name
 * @param {Object} change - change event object
 *
 * @example
 * metrics.markStreamLinkQuery(context, change)
 */
exports.markStreamLinkQuery = (context, table, change) => {
	metrics.inc(metricNames.STREAMS_LINK_QUERY_TOTAL, 1, {
		table,
		actor: actorFromContext(context),
		type: (_.has(change, [ 'type' ]) && _.isString(change.type)) ? change.type.toLowerCase() : 'unknown',
		card: (_.has(change, [ 'after', 'type' ]) && _.isString(change.after.type)) ? change.after.type.split('@')[0] : 'unknown'
	})
}

/**
 * @summary Mark that a stream error has occurred
 * @function
 *
 * @param {Object} context - caller context
 * @param {String} table - table name
 *
 * @example
 * metrics.markStreamError()
 */
exports.markStreamError = (context, table) => {
	metrics.inc(metricNames.STREAMS_ERROR_TOTAL, 1, {
		actor: actorFromContext(context),
		table
	})
}
