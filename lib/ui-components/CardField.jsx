/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Txt
} from 'rendition'
import RouterLink from './Link'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	Mermaid
} from 'rendition/dist/extra/Mermaid'
import Label from './Label'
import * as helpers from '../../lib/ui-components/services/helpers'

const transformMirror = (mirror) => {
	if (mirror.includes('frontapp.com')) {
		const id = mirror.split('/').pop()
		return `https://app.frontapp.com/open/${id}`
	}
	return mirror
}

const CardField = ({
	field, payload, schema
}) => {
	const value = payload[field]
	if (typeof value === 'undefined') {
		return null
	}

	if (field === 'mirrors') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				{_.map(value, (mirror) => {
					const url = transformMirror(mirror)
					return <div><RouterLink blank to={url} key={mirror}>{url}</RouterLink></div>
				})}
			</React.Fragment>
		)
	}

	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}

	// Rendering can be optimzed for some known fields
	if (field === 'timestamp') {
		return <Txt my={3} color="#777">{helpers.formatTimestamp(value)}</Txt>
	}
	if (schema && schema.format === 'mermaid') {
		return (<React.Fragment>
			<Label my={3}>{field}</Label>
			<Mermaid value={value}/>
		</React.Fragment>)
	}
	if (schema && schema.format === 'markdown') {
		return (<React.Fragment>
			<Label my={3}>{field}</Label>
			<Markdown>{value}</Markdown>
		</React.Fragment>)
	}
	return (
		<React.Fragment>
			<Label my={3}>{_.get(schema, [ 'title' ]) || field}</Label>

			{_.isObject(payload[field]) ? _.map(payload[field], (item, key) => {
				return (
					<CardField
						key={key}
						field={key}
						payload={payload[field]}
						schema={_.get(schema, [ 'properties', key ], {})}
					/>
				)
			})
				: <Txt data-test={`card-field--${helpers.slugify(field.toString())}`}>{`${payload[field]}`}</Txt>
			}
		</React.Fragment>
	)
}

export default CardField
