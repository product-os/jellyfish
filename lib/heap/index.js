/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const memwatch = require('@airbnb/node-memwatch')

let data = null

exports.sample = () => {
	data = new memwatch.HeapDiff()
}

exports.diff = () => {
	if (!data) {
		return null
	}

	const result = data.end()
	data = null
	return result
}
