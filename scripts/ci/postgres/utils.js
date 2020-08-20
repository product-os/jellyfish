/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const AWS = require('aws-sdk')
const path = require('path')
const utils = require('../utils')

// This directory is the directory used when importing and exporting dumps
const WORK_DIR = '/tmp'

// Key prefix for dumps on S3
exports.S3_KEY_PREFIX = 'dumps'

/**
 * @summary Get dump base name
 * @function
 *
 * @param {String} hash - git commit hash
 * @param {String} type - dump type
 * @returns {String} dump base name
 *
 * @example
 * const hash = utils.getCommitHash(false)
 * const type = 'e2e-server'
 * const dumpName = utils.getDumpName(hash, type)
 * console.log(dumpName)
 */
exports.getDumpName = (hash, type) => {
	return `${hash}_${type}`
}

/**
 * @summary Get dump archive name
 * @function
 *
 * @param {String} hash - git commit hash
 * @param {String} type - dump type
 * @returns {String} dump archive name
 *
 * @example
 * const hash = utils.getCommitHash(false)
 * const type = 'e2e-server'
 * const dumpArchiveName = utils.getDumpArchiveName(hash, type)
 * console.log(dumpArchiveName)
 */
exports.getDumpArchiveName = (hash, type) => {
	return `${exports.getDumpName(hash, type)}.gz`
}

/**
 * @summary Get dump archive path
 * @function
 *
 * @param {String} hash - git commit hash
 * @param {String} type - dump type
 * @returns {String} dump archive path
 *
 * @example
 * const hash = utils.getCommitHash(false)
 * const type = 'e2e-server'
 * const dumpArchivePath = utils.getDumpArchivePath(hash, type)
 * console.log(dumpName)
 */
exports.getDumpArchivePath = (hash, type) => {
	return path.resolve(WORK_DIR, exports.getDumpArchiveName(hash, type))
}

/**
 * @summary Check that required options are set as valid strings
 * @function
 *
 * @param {String} type - option subset type
 * @param {Array} keys - list of required option names
 * @param {Object} options - full list of options to validate
 *
 * @example
 * const keys = [ 'host', 'database', 'user', 'password' ]
 * const options = {
 *   host: 'localhost',
 *   database: 'jellyfish',
 *   user: 'jellyfish',
 *   password: 'jellyfish'
 * }
 * checkOptions('postgres', keys, options)
 */
exports.checkOptions = (type, keys, options) => {
	keys.forEach((key) => {
		if (!utils.isValidString(options[key])) {
			utils.handleError(`Must set ${type} option: ${key}`)
		}
	})
}

/**
 * @summary Validate options
 * @function
 *
 * @param {Object} options - required options to check
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * validate(options)
 */
exports.validate = (options) => {
	// Check that dump type is set
	if (!utils.isValidString(options.type)) {
		utils.handleError('Dump type not set')
	}

	// Check Postgres options
	exports.checkOptions('postgres', [
		'host',
		'database',
		'user',
		'password'
	], options.postgres)

	// Check AWS S3 options
	exports.checkOptions('aws', [
		'accessKeyId',
		'secretAccessKey',
		's3BucketName'
	], options.aws)
}

/**
 * @summary Create and return an AWS S3 client instance
 * @function
 *
 * @param {Object} options - process options
 * @returns {Object} AWS S3 client instance
 *
 * @example
 * const options = {
 *   type: 'e2e-server',
 *   postgres: environment.postgres,
 *   aws: environment.aws
 * }
 * const s3 = initS3(options)
 */
exports.initS3 = (options) => {
	return new AWS.S3({
		accessKeyId: options.aws.accessKeyId,
		secretAccessKey: options.aws.secretAccessKey
	})
}

exports.handleError = utils.handleError
