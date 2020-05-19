/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const AnyOfHandler = require('./any-of-handler')
const CardHandler = require('./card-handler')
const CardInterfaceHandler = require('./card-interface-handler')
const DateScalarHandler = require('./date-scalar-handler')
const EmailScalarHandler = require('./email-scalar-handler')
const EmptyTypeArrayHandler = require('./empty-type-array-handler')
const EmptyTypeObjectHandler = require('./empty-type-object-handler')
const EnumHandler = require('./enum-handler')
const MarkdownScalarHandler = require('./markdown-scalar-handler')
const NumberScalarHandler = require('./number-scalar-handler')
const OneOfHandler = require('./one-of-handler')
const SemverScalarHandler = require('./semver-scalar-handler')
const SlugScalarHandler = require('./slug-scalar-handler')
const StringScalarHandler = require('./string-scalar-handler')
const TypeArrayHandler = require('./type-array-handler')
const TypeArrayOfStringsHandler = require('./type-array-of-strings-handler')
const TypeBooleanHandler = require('./type-boolean-handler')
const TypeNullHandler = require('./type-null-handler')
const TypeObjectHandler = require('./type-object-handler')
const UuidScalarHandler = require('./uuid-scalar-handler')

module.exports = [
	AnyOfHandler,
	CardHandler,
	CardInterfaceHandler,
	DateScalarHandler,
	EmailScalarHandler,
	EmptyTypeArrayHandler,
	EmptyTypeObjectHandler,
	EnumHandler,
	MarkdownScalarHandler,
	NumberScalarHandler,
	OneOfHandler,
	SemverScalarHandler,
	SlugScalarHandler,
	StringScalarHandler,
	TypeArrayHandler,
	TypeArrayOfStringsHandler,
	TypeBooleanHandler,
	TypeNullHandler,
	TypeObjectHandler,
	UuidScalarHandler
]
