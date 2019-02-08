
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const _ = require('lodash')
const React = require('react')
const rendition = require('rendition')
const DataRenderer = (props) => {
	const {
		data, labelText = []
	} = props
	if (_.isPlainObject(data) || _.isArray(data)) {
		return (<React.Fragment>
			{_.map(data, (value, key) => {
				return (<DataRenderer key={key} data={value} labelText={labelText.concat(`${key}`)}/>)
			})}
		</React.Fragment>)
	}
	return (<rendition.Box mb={3}>
		{labelText.length > 0 && <strong>{labelText.join('.')}</strong>}
		<rendition.Txt>
			{`${data}`}
		</rendition.Txt>
	</rendition.Box>)
}
exports.default = DataRenderer
