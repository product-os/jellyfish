/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const LogWrapper = require('./helpers/log-wrapper')
const graphql = require('graphql')
const _ = require('lodash')
const {
	pascalCase
} = require('change-case')

// `SchemaGeneratorContext` is a shared, mutable object used to store
// information about and side-effects of the schema generation process.
//
// The most obvious side-effect is that of the type registry - a dictionary of
// all generated types and their names.
//
// It also contains the name stack which is used by the handler's to generate
// type names and the anonymous type counters (to generate names for types for
// which no sensible name could be found).
module.exports = class SchemaGeneratorContext {
	constructor (baseTypes, baseCards, logger, logContext) {
		this.typeRegistry = baseTypes
		this.baseCards = baseCards
		this.nameStack = []
		this.logger = new LogWrapper(logger, logContext)
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
