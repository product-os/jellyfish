/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const EnumHandler = require('../../../../../../apps/server/graphql/card-handlers/enum-handler')
const {
	fakeContext, assertTypeIsEnum
} = require('../graphql-spec-helpers')

const enumStringSchema = {
	enum: [ 'Marty', 'Doc Brown', '30m', '4hr+', '$$$' ]
}

const enumNumberSchema = {
	enum: [ 1, -21 ]
}

ava('`canHandle` matches an enum of strings schema', (test) => {
	const handler = new EnumHandler(enumStringSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches an enum of numbers schema', (test) => {
	const handler = new EnumHandler(enumNumberSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeIsEnum(function () {
	const handler = new EnumHandler(enumStringSchema, 0, fakeContext())
	return handler.process()
})

ava('generated type has the correct values for string enums', (test) => {
	const handler = new EnumHandler(enumStringSchema, 0, fakeContext())
	const type = handler.process()

	const optionNames = type
		.getValues()
		.map((value) => { return value.name })

	const optionValues = type
		.getValues()
		.map((value) => { return value.value })

	test.deepEqual(optionNames, [ 'MARTY', 'DOC_BROWN', 'OPTION_30M', 'OPTION_4HRPLUS', 'DOLLARDOLLARDOLLAR' ])
	test.deepEqual(optionValues, [ 'Marty', 'Doc Brown', '30m', '4hr+', '$$$' ])
})

ava('generated type has the correct values for numeric enums', (test) => {
	const handler = new EnumHandler(enumNumberSchema, 0, fakeContext())
	const type = handler.process()

	const optionNames = type
		.getValues()
		.map((value) => { return value.name })

	const optionValues = type
		.getValues()
		.map((value) => { return value.value })

	test.deepEqual(optionNames, [ 'OPTION_1', 'OPTION_NEG21' ])
	test.deepEqual(optionValues, [ 1, -21 ])
})
