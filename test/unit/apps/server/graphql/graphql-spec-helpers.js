/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const graphql = require('graphql')
const Types = require('../../../../../apps/server/graphql/types')
const SchemaGeneratorContext = require('../../../../../apps/server/graphql/schema-generator-context')
const baseCards = require('../../../../../lib/core/cards')
const {
	camelCase
} = require('change-case')

const isTypeGenerator = (type) => {
	return typeof (type) === 'function'
}

const handleTypeGenerator = (type) => {
	if (isTypeGenerator(type)) {
		return type()
	}
	return type
}

const testDescription = (type, message) => {
	if (isTypeGenerator(type)) {
		return `generated type ${message}`
	}
	return message
}

const assertOutputType = (type) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, 'is a GraphQL output type'), (test) => {
		test.truthy(graphql.isOutputType(realType))
	})
}

const assertIsObjectType = (type) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, 'is a GraphQL object type'), (test) => {
		test.truthy(graphql.isObjectType(realType))
	})
}

const assertTypeNamed = (type, expectedTypeName) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, `is named \`${expectedTypeName}\``), (test) => {
		test.is(realType.name, expectedTypeName)
	})
}

const assertInnerTypeNamed = (type, expectedTypeName) => {
	const realType = handleTypeGenerator(type)
	const innerType = graphql.getNamedType(realType)
	ava(testDescription(type, `is named \`${expectedTypeName}\``), (test) => {
		test.is(innerType.name, expectedTypeName)
	})
}

const assertFieldNamesAreCamelCase = (type) => {
	const fields = handleTypeGenerator(type).getFields()

	for (const field of Object.keys(fields)) {
		ava(testDescription(type, `field \`${field}\` must be camelCase`), (test) => {
			test.is(field, camelCase(field))
		})
	}
}

const assertArrayFieldsItemsAreNotNulllable = (type) => {
	const fields = handleTypeGenerator(type).getFields()

	for (const field of Object.keys(fields)) {
		const fieldType = fields[field].type

		if (graphql.isListType(fieldType)) {
			ava(testDescription(type, `field \`${field}\` as an array type, must not contain a nullable type`), (test) => {
				test.truthy(graphql.isNonNullType(fieldType.ofType))
			})
		}

		if (graphql.isNonNullType(fieldType)) {
			const nullableType = graphql.getNullableType(fieldType)
			if (graphql.isListType(nullableType)) {
				ava(testDescription(type, `field \`${field}\` as an array type, must not contain a nullable type`), (test) => {
					test.truthy(graphql.isNonNullType(nullableType.ofType))
				})
			}
		}
	}
}

const assertOnlyFields = (type, expectedFields) => {
	const realType = handleTypeGenerator(type)
	if (expectedFields.length > 1) {
		const escapedFieldNames = expectedFields
			.sort()
			.map((name) => { return `\`${name}\`` })
		const head = escapedFieldNames.slice(0, -1).join(', ')
		const tail = escapedFieldNames[escapedFieldNames.length - 1]
		const fieldNamesAsSentence = `${head} and ${tail}`

		ava(testDescription(type, `contains only the ${fieldNamesAsSentence} fields`), (test) => {
			const allTypeFields = Object.keys(realType.getFields()).sort()
			test.deepEqual(allTypeFields, expectedFields.sort())
		})
	} else if (expectedFields.length === 1) {
		ava(testDescription(type, `contains only the \`${expectedFields[0]}\` field`), (test) => {
			test.deepEqual(Object.keys(realType.getFields()), expectedFields)
		})
	}
}

const assertFieldIsNonNull = (type, field) => {
	const realType = handleTypeGenerator(type)

	ava(testDescription(type, `field \`${field}\` is not nullable`), (test) => {
		test.truthy(realType.getFields()[field], `no field named \`${field}\` exists.`)
		test.truthy(graphql.isNonNullType(realType.getFields()[field].type))
	})
}

const assertFieldIsOfType = (type, field, expectedTypeName) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, `field \`${field}\` is of type \`${expectedTypeName}\``), (test) => {
		test.truthy(realType.getFields()[field], `no field named \`${field}\` exists.`)
		test.truthy(realType.getFields()[field].type.name, expectedTypeName)
	})
}

const assertFieldIsOfInnerType = (type, field, expectedTypeName) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, `field \`${field}\` has inner type of \`${expectedTypeName}\``), (test) => {
		test.truthy(realType.getFields()[field], `no field named \`${field}\` exists.`)
		test.truthy(graphql.getNamedType(realType.getFields()[field].type).name, expectedTypeName)
	})
}

const assertTypeIsScalar = (type) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, 'is a scalar type'), (test) => {
		test.truthy(graphql.isScalarType(realType))
	})
}

const assertTypeIsEnum = (type) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, 'is an enum type'), (test) => {
		test.truthy(graphql.isEnumType(realType))
	})
}

const assertTypeIsList = (type) => {
	const realType = handleTypeGenerator(type)
	ava(testDescription(type, 'is a list type'), (test) => {
		test.truthy(graphql.isListType(realType))
	})
}

const sharedObjectSpecs = (type, expectedTypeName = null, expectedFields = []) => {
	assertIsObjectType(type)
	assertOutputType(type)
	assertFieldNamesAreCamelCase(type)
	assertArrayFieldsItemsAreNotNulllable(type)

	if (expectedTypeName) {
		assertTypeNamed(type, expectedTypeName)
	}

	if (expectedFields.length > 0) {
		assertOnlyFields(type, expectedFields)
	}
}

const fakeContext = (extraTypes) => {
	return new SchemaGeneratorContext(Object.assign({}, Types, extraTypes), baseCards, console, '')
}

module.exports = {
	assertArrayFieldsItemsAreNotNulllable,
	assertFieldIsNonNull,
	assertFieldIsOfInnerType,
	assertFieldIsOfType,
	assertFieldNamesAreCamelCase,
	assertIsObjectType,
	assertOnlyFields,
	assertOutputType,
	assertTypeIsEnum,
	assertTypeIsList,
	assertTypeIsScalar,
	assertTypeNamed,
	assertInnerTypeNamed,
	fakeContext,
	sharedObjectSpecs
}
