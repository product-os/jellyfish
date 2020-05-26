/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const MarkdownScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/markdown-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertIsObjectType
} = require('../graphql-spec-helpers')

const markdownFormatSchema = {
	type: 'string',
	format: 'markdown'
}

ava('`canHandle` matches markdown formatted string JSON schemas', (test) => {
	const handler = new MarkdownScalarHandler(markdownFormatSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new MarkdownScalarHandler(markdownFormatSchema, 0, fakeContext())
	return handler.process()
}, 'Markdown')

assertIsObjectType(function () {
	const handler = new MarkdownScalarHandler(markdownFormatSchema, 0, fakeContext())
	return handler.process()
})
