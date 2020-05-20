/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Link,
	Txt
} from 'rendition'
import {
	Markdown
} from 'rendition/dist/extra/Markdown'
import {
	Mermaid
} from 'rendition/dist/extra/Mermaid'
import Label from '../Label'
import * as helpers from '../services/helpers'

const transformMirror = (mirror) => {
	if (mirror.includes('frontapp.com')) {
		const id = mirror.split('/').pop()
		return `https://app.frontapp.com/open/${id}`
	}
	return mirror
}

const StringField = ({
	fieldValue,
	fieldName
}) => {
	const value = fieldName ? `${fieldName}: ${fieldValue}` : fieldValue
	return (
		<Txt
			data-test={`card-field--${fieldName || fieldValue}`}>
			{ value }
		</Txt>
	)
}

const Field = ({
	schema, fieldValue, fieldName
}) => {
	if (schema.type === 'string') {
		return (
			<StringField fieldValue={fieldValue} fieldName={fieldName} />
		)
	}

	if (schema.type === 'array') {
		return (
			<ul>
				{
					_.map(fieldValue, (item, key) => {
						return (
							<li key={key}>
								<Field
									fieldValue={item}
									schema={schema.items}/>
							</li>
						)
					})
				}
			</ul>
		)
	}
	return (
		<ul>
			{
				_.map(fieldValue, (item, key) => {
					return (
						<li key={key}>
							<Field
								fieldName={key}
								fieldValue={item}
								schema={schema.properties[key]}/>
						</li>
					)
				})
			}
		</ul>
	)
}

const CardField = ({
	field, payload, schema
}) => {
	const fieldValue = payload[field]
	if (typeof fieldValue === 'undefined') {
		return null
	}

	if (field === 'mirrors') {
		return (
			<React.Fragment>
				<Label my={3}>{field}</Label>
				{_.map(fieldValue, (mirror) => {
					const url = transformMirror(mirror)
					return <div><Link blank href={url} key={mirror}>{url}</Link></div>
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
		return <Txt my={3} color="#777">{helpers.formatTimestamp(fieldValue)}</Txt>
	}
	if (schema && schema.format === 'mermaid') {
		return (<React.Fragment>
			<Label my={3}>{field}</Label>
			<Mermaid value={fieldValue}/>
		</React.Fragment>)
	}
	if (schema && schema.format === 'markdown') {
		return (<React.Fragment>
			<Label my={3}>{field}</Label>
			<Markdown>{fieldValue}</Markdown>
		</React.Fragment>)
	}

	const stringValue = helpers.slugify(field.toString())
	return (
		<React.Fragment>
			<Label
				my={3}
				data-test={`card-field-label--${stringValue}`}
			>
				{_.get(schema, [ 'title' ]) || field}
			</Label>
			<Field fieldValue={fieldValue} schema={schema} />
		</React.Fragment>
	)
}

export default CardField
