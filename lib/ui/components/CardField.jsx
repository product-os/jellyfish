import * as _ from 'lodash'
import React from 'react'
import styled from 'styled-components'
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
import * as storeHelpers from '../services/store-helpers'

const Badge = styled(Txt) `
	display: inline-block;
	background: #555;
	color: white;
	border-radius: 4px;
	padding: 1px 8px;
	margin-right: 4px;
	font-size: 14px;
`
const DataContainer = styled.pre `
	background: none;
	color: inherit;
	border: 0;
	margin: 0;
	padding: 0;
	font-size: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
`

const CardField = ({
	field, payload, users, schema
}) => {
	const value = payload[field]
	if (typeof value === 'undefined') {
		return null
	}

	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}
	if (field === 'alertsUser' || field === 'mentionsUser') {
		const len = value.length
		if (!len || !users) {
			return null
		}
		const names = value.map((id) => {
			return storeHelpers.getActor(id).name
		})
		return (<Badge tooltip={names.join(', ')} my={1}>
			{field === 'alertsUser' ? 'Alerts' : 'Mentions'} {len} user{len !== 1 && 's'}
		</Badge>)
	}
	if (field === 'actor') {
		return <Txt my={3} bold>{storeHelpers.getActor(value).name}</Txt>
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
	return (<React.Fragment>
		<Label.default my={3}>{field}</Label.default>
		{_.isObject(payload[field])
			? <Txt monospace={true}>
				<DataContainer>{JSON.stringify(payload[field], null, 4)}</DataContainer>
			</Txt>
			: <Txt>{`${payload[field]}`}</Txt>}
	</React.Fragment>)
}

export default CardField
