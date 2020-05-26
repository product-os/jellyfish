/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const skhema = require('skhema')

// More specific handler for schemas that look like Email addresses.
//
// For historical reasons it's possible than an email address field can be
// defined as one of three schemas in our model;
//
// 1. A string with an email format.
// 2. An array of strings with email format.
// 3. An `anyOf` consisting of the two previous options.
//
// This handler handles the latter two cases (see also `EmailScalarHandler`) and
// results in a list of emails.  Unfortunately this requires a rather extensive
// matching schema.

const emailFormatSchema = {
	type: 'object',
	properties: {
		type: {
			const: 'string'
		},
		format: {
			const: 'email'
		}
	},
	required: [ 'type', 'format' ]
}

const arrayOfEmailFormatSchema = {
	type: 'object',
	properties: {
		type: {
			const: 'array'
		},
		items: emailFormatSchema
	},
	required: [ 'type', 'items' ]
}

const arrayOrStringFormatSchema = {
	type: 'object',
	properties: {
		type: {
			type: 'array',
			anyOf: [
				{
					items: [
						{
							const: 'string'
						},
						{
							const: 'array'
						}
					]
				},
				{
					items: [
						{
							const: 'array'
						},
						{
							const: 'string'
						}
					]
				}
			]
		},
		format: {
			const: 'email'
		}
	},
	required: [ 'type', 'format' ]
}

const anyOfEmailTypeSchema = {
	type: 'object',
	properties: {
		anyOf: {
			type: 'array',
			items: {
				anyOf: [ emailFormatSchema, arrayOfEmailFormatSchema ]
			}
		}
	},
	required: [ 'anyOf' ]
}

module.exports = class EmailScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			anyOf: [ arrayOfEmailFormatSchema, anyOfEmailTypeSchema, arrayOrStringFormatSchema ]
		}, this.chunk)
	}

	weight () {
		return 300
	}

	process (_childResults) {
		return graphql.GraphQLList(graphql.GraphQLNonNull(this.context.getType('Email')))
	}
}
