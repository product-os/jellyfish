/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const mergeWithUniqConcatArrays = (objValue, srcValue) => {
	if (_.isArray(objValue)) {
		return _.uniq(objValue.concat(srcValue))
	}
	// eslint-disable-next-line no-undefined
	return undefined
}

module.exports = {
	withEvents: require('./with-events'),
	generateRelationshipSchema: require('./generate-relationship-schema'),
	sensibleDefaults: require('./sensible-defaults'),

	mixin: (...mixins) => {
		return (base) => {
			return _.mergeWith({}, base, ...mixins, mergeWithUniqConcatArrays)
		}
	}
}
