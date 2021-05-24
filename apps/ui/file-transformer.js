/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const path = require('path')

module.exports = {
	process (src, filename, config, options) {
		return `module.exports = ${JSON.stringify(path.basename(filename))};`
	}
}
