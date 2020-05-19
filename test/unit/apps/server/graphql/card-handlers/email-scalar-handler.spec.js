/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const EmailScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/email-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const emailFormatSchema = {
	type: 'string',
	format: 'email'
}

const arrayOfEmailFormatSchema = {
	type: 'array',
	items: emailFormatSchema
}

const arrayOrStringFormatSchema = {
	type: [ 'string', 'array' ],
	format: 'email',
	minItems: 1,
	uniqueItems: true,
	items: {
		type: 'string', format: 'email'
	}
}

const anyOfEmailFormatSchema = {
	anyOf: [
		emailFormatSchema,
		arrayOfEmailFormatSchema
	]
}

ava('`canHandle` matches email formatted string JSON schemas', (test) => {
	const handler = new EmailScalarHandler(emailFormatSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`canHandle` matches array of email formatted string JSON schemas', (test) => {
	const handler = new EmailScalarHandler(arrayOfEmailFormatSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`canHandle` matches any of email formatted string JSON schemas', (test) => {
	const handler = new EmailScalarHandler(anyOfEmailFormatSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`canHandle` matches array or string email formatted JSON schemas', (test) => {
	const handler = new EmailScalarHandler(arrayOrStringFormatSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new EmailScalarHandler(emailFormatSchema, 0, fakeContext())
	return handler.process()
}, 'Email')

assertTypeIsScalar(function () {
	const handler = new EmailScalarHandler(emailFormatSchema, 0, fakeContext())
	return handler.process()
})
