/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = function (realFieldName) {
	return function (source, _args, _context, _info) {
		return source[realFieldName]
	}
}
