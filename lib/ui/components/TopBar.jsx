/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const React = require('react')
const rendition = require('rendition')
exports.default = ({
	children
}) => {
	return (<rendition.Flex justifyContent="space-between" align="center" style={{
		boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
	}}>
		{children}
	</rendition.Flex>)
}
