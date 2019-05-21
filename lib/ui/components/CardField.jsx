import * as _ from 'lodash'
import React from 'react'
import {
	Txt
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	Mermaid
} from 'rendition/dist/extra/Mermaid'
import Label from '../components/Label'
import * as helpers from '../services/helpers'

const CardField = ({
	field, payload, schema
}) => {
	const value = payload[field]
	if (typeof value === 'undefined') {
		return null
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
			<Label.default my={3}>{field}</Label.default>
			<Mermaid value={value}/>
		</React.Fragment>)
	}
	if (schema && schema.format === 'markdown') {
		return (<React.Fragment>
			<Label.default my={3}>{field}</Label.default>
			<Markdown>{value}</Markdown>
		</React.Fragment>)
	}
	return (
		<React.Fragment>
			<Label.default my={3}>{field}</Label.default>

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
				: <Txt>{`${payload[field]}`}</Txt>
			}
		</React.Fragment>
	)
}

export default CardField
