/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const QueryFile = require('./pg-promise').QueryFile
const logger = require('../../../logger').getLogger(__filename)
const path = require('path')

/**
 * @summary Prepare a function SQL file for execution. Using minify option to remove comments.
 * @function
 *
 * @param {String} file - name of file under "functions" directory to execute
 * @returns {Object} object containing filename and prepared SQL
 *
 * @example
 * const sqlFunction = loadFunction('my-function.sql')
 */
const loadFunction = (file) => {
	return {
		file,
		query: new QueryFile(path.join(__dirname, 'functions', file), {
			minify: true
		})
	}
}

/**
 * @summary Prepare and execute SQL files located under "./functions"
 * @function
 *
 * @param {Object} context - session context
 * @param {Object} connection - Postgres database connection
 *
 * @example
 * await functions.setup(context, connection)
 */
exports.setup = async (context, connection) => {
	await Bluebird.each([
		loadFunction('immutable-array-to-string.sql')
	], async (func) => {
		if (!func) {
			return
		}

		logger.info(context, 'Creating Postgres function', {
			file: func.file
		})

		await connection.any(func.query)
	})
}
