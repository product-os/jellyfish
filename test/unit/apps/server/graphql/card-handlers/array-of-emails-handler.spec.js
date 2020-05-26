/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const ArrayOfEmailsHandler = require('../../../../../../apps/server/graphql/card-handlers/array-of-emails-handler')
const {
	fakeContext, assertTypeIsList, assertInnerTypeNamed
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

ava('`canHandle` doesn\'t match email formatted string JSON schemas', (test) => {
	const handler = new ArrayOfEmailsHandler(emailFormatSchema, 0, fakeContext())

	test.false(handler.canHandle())
})

ava('`canHandle` matches array of email formatted string JSON schemas', (test) => {
	const handler = new ArrayOfEmailsHandler(arrayOfEmailFormatSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches any of email formatted string JSON schemas', (test) => {
	const handler = new ArrayOfEmailsHandler(anyOfEmailFormatSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches array or string email formatted JSON schemas', (test) => {
	const handler = new ArrayOfEmailsHandler(arrayOrStringFormatSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeIsList(function () {
	const handler = new ArrayOfEmailsHandler(emailFormatSchema, 0, fakeContext())
	return handler.process()
})

assertInnerTypeNamed(function () {
	const handler = new ArrayOfEmailsHandler(emailFormatSchema, 0, fakeContext())
	return handler.process()
}, 'Email')
