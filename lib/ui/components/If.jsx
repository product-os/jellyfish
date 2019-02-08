/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const React = require('react')
exports.If = ({
	condition, children
}) => {
	if (condition) {
		return (<React.Fragment>
			{children}
		</React.Fragment>)
	}
	return null
}
