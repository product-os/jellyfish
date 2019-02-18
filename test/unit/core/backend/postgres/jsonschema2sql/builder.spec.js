/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const builder = require('../../../../../../lib/core/backend/postgres/jsonschema2sql/builder')

ava('.valueToPostgres() should take numbers', (test) => {
	test.is(builder.valueToPostgres(5), '\'5\'')
})

ava('.isRootProperty() should return false given a null prefix', (test) => {
	test.false(builder.isRootProperty([ null ]))
})

ava('.isRootProperty() should return true given a prefix', (test) => {
	test.true(builder.isRootProperty([ 'cards' ]))
})

ava('.isRootProperty() should return false given a prefix and a property', (test) => {
	test.false(builder.isRootProperty([ 'cards', 'data' ]))
})

ava('.isRootProperty() should return false given a prefix and a nested property', (test) => {
	test.false(builder.isRootProperty([ 'cards', 'data', 'foo' ]))
})

ava('.isRootProperty() should return false given an empty path', (test) => {
	test.false(builder.isRootProperty([]))
})

ava('.isTopLevelProperty() should return false given a null prefix', (test) => {
	test.false(builder.isTopLevelProperty([ null ]))
})

ava('.isTopLevelProperty() should return false given a prefix', (test) => {
	test.false(builder.isTopLevelProperty([ 'cards' ]))
})

ava('.isTopLevelProperty() should return true given a prefix and a property', (test) => {
	test.true(builder.isTopLevelProperty([ 'cards', 'data' ]))
})

ava('.isTopLevelProperty() should return false given a prefix and a nested property', (test) => {
	test.false(builder.isTopLevelProperty([ 'cards', 'data', 'foo' ]))
})

ava('.isTopLevelProperty() should return false given an empty path', (test) => {
	test.false(builder.isTopLevelProperty([]))
})

ava('.isPrefixedProperty should return false given an empty path', (test) => {
	test.false(builder.isPrefixedProperty([]))
})

ava('.isPrefixedProperty should return true given a prefix', (test) => {
	test.true(builder.isPrefixedProperty([ 'cards' ]))
})

ava('.isPrefixedProperty should return true given a prefix and a property', (test) => {
	test.true(builder.isPrefixedProperty([ 'cards', 'foo' ]))
})

ava('.isPrefixedProperty() should return false given a null prefix', (test) => {
	test.false(builder.isPrefixedProperty([ null ]))
})

ava('.isColumn() should return false given a null prefix', (test) => {
	test.false(builder.isColumn([ null ]))
})

ava('.isColumn() should return false given a prefix', (test) => {
	test.false(builder.isColumn([ 'cards' ]))
})

ava('.isColumn() should return false given a prefix a non top level column', (test) => {
	test.false(builder.isColumn([ 'cards', 'xxx' ]))
})

ava('.isColumn() should return true given a prefix a top level column', (test) => {
	test.true(builder.isColumn([ 'cards', 'data' ]))
})

ava('.isColumn() should return false given a prefix a top level column with a nested property', (test) => {
	test.false(builder.isColumn([ 'cards', 'data', 'foo' ]))
})

ava('.isRequiredColumn() should return false given a null prefix', (test) => {
	test.false(builder.isRequiredColumn([ null ]))
})

ava('.isRequiredColumn() should return false given a null prefix and a required column', (test) => {
	test.false(builder.isRequiredColumn([ null, 'data' ]))
})

ava('.isRequiredColumn() should return false given a prefix', (test) => {
	test.false(builder.isRequiredColumn([ 'cards' ]))
})

ava('.isRequiredColumn() should return false given a prefix a non top level column', (test) => {
	test.false(builder.isRequiredColumn([ 'cards', 'xxx' ]))
})

ava('.isRequiredColumn() should return true given a prefix and a required top level column', (test) => {
	test.true(builder.isRequiredColumn([ 'cards', 'data' ]))
})

ava('.isRequiredColumn() should return false given a prefix and optional top level column', (test) => {
	test.false(builder.isRequiredColumn([ 'cards', 'name' ]))
})

ava('.isRequiredColumn() should return false given a prefix and a required top level column with a nested property', (test) => {
	test.false(builder.isRequiredColumn([ 'cards', 'data', 'foo' ]))
})

ava('.columnIsOfType() should return true given the right type', (test) => {
	test.true(builder.columnIsOfType([ 'cards', 'data' ], 'object'))
})

ava('.columnIsOfType() should return false given the wrong type', (test) => {
	test.false(builder.columnIsOfType([ 'cards', 'data' ], 'string'))
})

ava('.columnIsOfType() should return true given a non column', (test) => {
	test.false(builder.columnIsOfType([ 'cards', 'xxx' ], 'object'))
})

ava('.columnIsOfType() should return false given no prefix', (test) => {
	test.false(builder.columnIsOfType([ null, 'data' ], 'object'))
})

ava('.isOfType() should return true for the root property and type object', (test) => {
	test.true(builder.isOfType([ 'cards' ], 'object'))
})

ava('.isOfType() should return false for no property', (test) => {
	test.false(builder.isOfType([], 'object'))
})

ava('.isOfType() should return true given a top level column and the right type', (test) => {
	test.true(builder.isOfType([ 'cards', 'data' ], 'object'))
})

ava('.isOfType() should return false given a top level column and the wrong type', (test) => {
	test.false(builder.isOfType([ 'cards', 'data' ], 'string'))
})

ava('.isOfType() should expand given a top level column without prefix and the right type', (test) => {
	test.is(builder.isOfType([ null, 'data' ], 'object'),
		'jsonb_typeof(data) = \'object\'')
})

ava('.isOfType() should expand given a non top level column', (test) => {
	test.is(builder.isOfType([ 'cards', 'data', 'foo' ], 'string'),
		'jsonb_typeof(cards.data->\'foo\') = \'string\'')
})

ava('.exists() should return false given a prefix', (test) => {
	test.false(builder.exists([ 'cards' ]))
})

ava('.exists() should return false given no path', (test) => {
	test.false(builder.exists([]))
})

ava('.exists() should return true given a top level required property', (test) => {
	test.true(builder.exists([ 'cards', 'data' ]))
})

ava('.exists() should expand given a top level optional property', (test) => {
	test.is(builder.exists([ 'cards', 'name' ]), 'cards.name IS NOT NULL')
})

ava('.exists() should expand given an invalid top level optional property', (test) => {
	test.is(builder.exists([ 'cards', 'xxx' ]), 'cards.xxx IS NOT NULL')
})

ava('.exists() should expand given an top level required property without a prefix', (test) => {
	test.is(builder.exists([ null, 'data' ]), 'data IS NOT NULL')
})

ava('.notExists() should return true given a prefix', (test) => {
	test.true(builder.notExists([ 'cards' ]))
})

ava('.notExists() should return true given no path', (test) => {
	test.true(builder.notExists([]))
})

ava('.notExists() should return false given a top level required property', (test) => {
	test.false(builder.notExists([ 'cards', 'data' ]))
})

ava('.notExists() should expand given a top level optional property', (test) => {
	test.is(builder.notExists([ 'cards', 'name' ]), 'cards.name IS NULL')
})

ava('.notExists() should expand given an invalid top level optional property', (test) => {
	test.is(builder.notExists([ 'cards', 'xxx' ]), 'cards.xxx IS NULL')
})

ava('.notExists() should expand given an top level required property without a prefix', (test) => {
	test.is(builder.notExists([ null, 'data' ]), 'data IS NULL')
})

ava('.and() should return true given nothing', (test) => {
	test.true(builder.and())
})

ava('.and() should return true given a single true conjunct', (test) => {
	test.true(builder.and(true))
})

ava('.and() should return true given all true conjuncts', (test) => {
	test.true(builder.and(true, true, true))
})

ava('.and() should return false given one false conjunct', (test) => {
	test.false(builder.and(false))
})

ava('.and() should return false given one false conjunct along other true ones', (test) => {
	test.false(builder.and(true, false, true))
})

ava('.and() should return false given one false conjunct and an expression', (test) => {
	test.false(builder.and('cards.data IS NOT NULL', false))
})

ava('.and() should return a single expression', (test) => {
	test.is(builder.and('cards.data IS NOT NULL'), 'cards.data IS NOT NULL')
})

ava('.and() should join two expressions', (test) => {
	test.is(builder.and('cards.data IS NOT NULL', 'cards.name IS NULL'),
		'(cards.data IS NOT NULL)\nAND\n(cards.name IS NULL)')
})

ava('.and() should join three expressions', (test) => {
	test.is(builder.and(
		'cards.data IS NOT NULL',
		'cards.name IS NULL',
		'cards.slug IS \'foo\''),
	'(cards.data IS NOT NULL)\nAND\n(cards.name IS NULL)\nAND\n(cards.slug IS \'foo\')')
})

ava('.getProperty() should return null given no path', (test) => {
	test.deepEqual(builder.getProperty([]), null)
})

ava('.getProperty() should return null given a prefix', (test) => {
	test.deepEqual(builder.getProperty([ 'cards' ]), null)
})

ava('.getProperty() should return null given a null prefix', (test) => {
	test.deepEqual(builder.getProperty([ null ]), null)
})

ava('.getProperty() should return a prefix with a property', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo' ]), 'cards.foo')
})

ava('.getProperty() should return a prefix with a property and an index', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo', 4 ]), 'cards.foo->4')
})

ava('.getProperty() should return a prefix with multiple indexes', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo', 4, 'bar', 5 ]), 'cards.foo->4->\'bar\'->5')
})

ava('.getProperty() should return a null prefix with a property', (test) => {
	test.is(builder.getProperty([ null, 'foo' ]), 'foo')
})

ava('.getProperty() should return a prefix with a nested property', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo', 'bar' ]), 'cards.foo->\'bar\'')
})

ava('.getProperty() should get a nested property as text', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo', 'bar' ], {
		text: true
	}), 'cards.foo->>\'bar\'')
})

ava('.getProperty() should get a two level nested property as text', (test) => {
	test.is(builder.getProperty([ 'cards', 'foo', 'bar', 'baz' ], {
		text: true
	}), 'cards.foo->\'bar\'->>\'baz\'')
})

ava('.getProperty() should return a null prefix with a nested property', (test) => {
	test.is(builder.getProperty([ null, 'foo', 'bar' ]), 'foo->\'bar\'')
})

ava('.or() should return true given nothing', (test) => {
	test.true(builder.or())
})

ava('.or() should return true given a single true disjunct', (test) => {
	test.true(builder.or(true))
})

ava('.or() should return true given all true disjuncts', (test) => {
	test.true(builder.or(true, true, true))
})

ava('.or() should return false given one false disjunct', (test) => {
	test.false(builder.or(false))
})

ava('.or() should return true given one false disjunct along other true ones', (test) => {
	test.true(builder.or(true, false, true))
})

ava('.or() should expand one false disjunct and an expression', (test) => {
	test.is(builder.or('cards.data IS NOT NULL', false),
		'cards.data IS NOT NULL')
})

ava('.or() should return a single expression', (test) => {
	test.is(builder.or('cards.data IS NOT NULL'), 'cards.data IS NOT NULL')
})

ava('.or() should join two expressions', (test) => {
	test.is(builder.or('cards.data IS NOT NULL', 'cards.name IS NULL'),
		'(cards.data IS NOT NULL)\nOR\n(cards.name IS NULL)')
})

ava('.or() should join three expressions', (test) => {
	test.is(builder.or(
		'cards.data IS NOT NULL',
		'cards.name IS NULL',
		'cards.slug IS \'foo\''),
	'(cards.data IS NOT NULL)\nOR\n(cards.name IS NULL)\nOR\n(cards.slug IS \'foo\')')
})

ava('.isNotOfType() should return false for the root property and type object', (test) => {
	test.false(builder.isNotOfType([ 'cards' ], 'object'))
})

ava('.isNotOfType() should return true for no property', (test) => {
	test.true(builder.isNotOfType([], 'object'))
})

ava('.isNotOfType() should return false given a top level column and the right type', (test) => {
	test.false(builder.isNotOfType([ 'cards', 'data' ], 'object'))
})

ava('.isNotOfType() should return true given a top level column and the wrong type', (test) => {
	test.true(builder.isNotOfType([ 'cards', 'data' ], 'string'))
})

ava('.isNotOfType() should expand given a top level column without prefix and the right type', (test) => {
	test.is(builder.isNotOfType([ null, 'data' ], 'object'),
		'jsonb_typeof(to_jsonb(data)) != \'object\'')
})

ava('.isNotOfType() should expand given a non top level column', (test) => {
	test.is(builder.isNotOfType([ 'cards', 'data', 'foo' ], 'string'),
		'jsonb_typeof(to_jsonb(cards.data->\'foo\')) != \'string\'')
})

ava('.not() should negate an expression', (test) => {
	test.is(builder.not('cards.data IS NOT NULL'), 'NOT (cards.data IS NOT NULL)')
})

ava('.not() should return false if true', (test) => {
	test.false(builder.not(true))
})

ava('.not() should return true if false', (test) => {
	test.true(builder.not(false))
})

ava('.noneObject() should take an expression', (test) => {
	test.deepEqual(builder.noneObject([ 'cards', 'data' ], 'key IS NOT NULL').split('\n'), [
		'NOT EXISTS (SELECT 1 FROM jsonb_each(cards.data)',
		'WHERE (key IS NOT NULL))'
	])
})

ava('.keys() should expand a property', (test) => {
	test.is(builder.keys([ 'cards', 'data' ]),
		'ARRAY(SELECT jsonb_object_keys(cards.data))')
})
