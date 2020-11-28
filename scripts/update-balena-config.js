#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/*
 * This script is used to automatically add and remove a developer's
 * npm token to and from our balena configuration file. Primarily to
 * make the Livepush-based development more seemless.
 * Add token: ./scripts/update-balena-config.js set-npm-token
 * Remove token: ./scripts/update-balena-config.js remove-npm-token
 */

const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const path = require('path')
const uuid = require('uuid')
const yaml = require('js-yaml')

// Assume that the balena config exists at the root of the repository
const BALENA_CONFIG = path.join(process.cwd(), '.balena', 'balena.yml')

/**
 * @summary Output error message and exit script
 * @function
 *
 * @param {String} msg - error message
 */
const abort = (msg) => {
	console.error(`[${path.parse(__filename).name}] ${msg}`)
	process.exit(1)
}

/**
 * @summary Read in balena config
 * @function
 *
 * @returns {Object} balena config in object form
 */
const getConfig = () => {
	let config = {}
	try {
		config = yaml.safeLoad(fs.readFileSync(BALENA_CONFIG))
	} catch (err) {
		abort(`Failed to load balena config from ${BALENA_CONFIG}: ${err}`)
	}
	return config
}

/**
 * @summary Get and return NPM_TOKEN from env var or npmrc file
 * @function
 *
 * @returns {String} npm token
 */
const getToken = () => {
	// First try to grab from environment variable
	if (uuid.validate(process.env.NPM_TOKEN)) {
		return process.env.NPM_TOKEN
	}

	// Now try to grab from .npmrc file
	const npmrcPath = path.join(os.homedir(), '.npmrc')
	if (!fs.existsSync(npmrcPath)) {
		abort(`Could not find .npmrc file at ${npmrcPath}`)
	}
	const lines = fs.readFileSync(npmrcPath, 'utf8').split('\n').map((line) => {
		return line.trim()
	})
	const tokenLine = lines.find((line) => {
		return line.startsWith('//registry.npmjs.org/:') && line.includes('authToken=')
	})
	if (!tokenLine) {
		abort(`Could not find npmjs registry token in ${npmrcPath}`)
	}
	const token = tokenLine.split('authToken=')[1]
	if (!uuid.validate(token)) {
		abort(`Found token, but not in proper UUID format: ${token}`)
	}

	return token
}

/**
 * @summary Remove NPM_TOKEN global build variables from balena config
 * @function
 *
 * @param {Object} config - balena config
 */
const removeToken = (config) => {
	if (_.has(config, [ 'build-variables', 'global' ]) && _.isArray(config['build-variables'].global)) {
		// Remove NPM_TOKEN entries
		_.remove(config['build-variables'].global, (item) => {
			return _.startsWith(item, 'NPM_TOKEN=')
		})

		// Remove 'build-variables' and 'build-variables.global' sections if empty
		if (_.size(config['build-variables'].global) < 1) {
			Reflect.deleteProperty(config['build-variables'], 'global')
		}
		if (_.size(config['build-variables']) < 1) {
			Reflect.deleteProperty(config, 'build-variables')
		}

		// Save modified config
		try {
			fs.writeFileSync(BALENA_CONFIG, yaml.safeDump(config))
		} catch (err) {
			abort(`Failed to save balena config to ${BALENA_CONFIG}: ${err}`)
		}
	}
}

/**
 * @summary Set npm token as global build variable in balena config
 * @function
 *
 * @param {Object} config - balena config
 * @param {String} token - npm token
 */
const setToken = (config, token) => {
	// Remove any currently set npm tokens first
	removeToken()

	// Add parent sections if they do not already exist
	if (!_.has(config, [ 'build-variables', 'global' ])) {
		if (!_.has(config, [ 'build-variables' ])) {
			config['build-variables'] = {}
		}
		config['build-variables'].global = []
	}
	config['build-variables'].global.push(`NPM_TOKEN=${token}`)
	try {
		fs.writeFileSync(BALENA_CONFIG, yaml.safeDump(config))
	} catch (err) {
		abort(`Failed to add token to balena config at ${BALENA_CONFIG}: ${err}`)
	}
}

// Check expected argument
const args = process.argv.slice(2)
const action = args[0]
if (!action.match(/^(set-npm-token|remove-npm-token)$/)) {
	abort('Must pass argument of either set-npm-token or remove-npm-token')
}

// Execute action
const config = getConfig()
if (action === 'set-npm-token') {
	setToken(config, getToken())
} else {
	removeToken(config)
}
