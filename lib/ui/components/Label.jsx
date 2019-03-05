/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const rendition = require('rendition')
const styledComponents = require('styled-components')
exports.default = styledComponents.default(rendition.Txt) `
	color: #252629;
	font-size: 11px;
	text-transform: uppercase;
	margin-bottom: 6px;
`
