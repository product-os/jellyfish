/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const _ = require('lodash')
const {
	pascalCase
} = require('change-case')

class Logger {
	constructor (logger, context) {
		this.logger = logger
		this.context = context
	}

	debug (message, data) {
		this.logger.debug(this.context, message, data)
	}
	error (message, data) {
		this.logger.error(this.context, message, data)
	}
	info (message, data) {
		this.logger.info(this.context, message, data)
	}
	warn (message, data) {
		this.logger.warn(this.context, message, data)
	}
}

module.exports = class SchemaGeneratorContext {
	constructor (baseTypes, baseCards, logger, logContext) {
		this.typeRegistry = baseTypes
		this.baseCards = baseCards
		this.nameStack = []
		this.logger = new Logger(logger, logContext)
		this.anonymousTypeCounters = {}
	}

	getType (name) {
		const existingType = this.typeRegistry[name]
		if (typeof (existingType) === 'function') {
			this.typeRegistry[name] = existingType(this)
			return this.typeRegistry[name]
		}
		if (typeof (existingType) === 'object') {
			return existingType
		}

		return null
	}

	registerType (name, type) {
		if (Object.hasOwnProperty(this.typeRegistry, name)) {
			throw new Error(`Type ${name} already registered`)
		}
		this.typeRegistry[name] = type
	}

	getCardTypes () {
		const cardInterface = this.getType('Card')
		return Object.values(this.typeRegistry).filter((type) => {
			return graphql.isObjectType(type) &&
				_.includes(type.getInterfaces(), cardInterface)
		})
	}

	generateAnonymousTypeName (underlyingType) {
		const typeClass = pascalCase(underlyingType)
		if (!this.anonymousTypeCounters[typeClass]) {
			this.anonymousTypeCounters[typeClass] = 0
		}
		return `Anonymous${typeClass}Type${this.anonymousTypeCounters[typeClass]++}`
	}

	pushName (name) {
		this.nameStack.push(name)
	}

	popName () {
		this.nameStack.pop()
	}

	peekName () {
		return this.nameStack.slice(-1).shift()
	}
}
