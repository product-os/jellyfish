/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'
import styled from 'styled-components'
import Label from '../Label'
import Collapsible from '../Collapsible'
import * as helpers from '../services/helpers'
import FieldValue from './FieldValue'

const KeyLabel = styled(Label) `
	margin-bottom: 0px;
`

const MARGIN = 2

const CardField = ({
	field, payload, schema, parentKey
}) => {
	// If the field starts with '$$' it is metaData and shouldn't be displayed
	if (_.startsWith(field, '$$')) {
		return null
	}

	const fieldValue = payload[field]

	if (typeof fieldValue === 'undefined') {
		return null
	}

	const title = _.get(schema, [ 'title' ]) || field

	const fieldId = helpers.slugify(field.toString())

	if (_.isObject(fieldValue)) {
		return (
			<Collapsible
				title={<KeyLabel data-test={`card-field__title--${fieldId}`}>{title}</KeyLabel>}
				mt={MARGIN}
				defaultCollapsed={false}
				contentProps={{
					ml: 3
				}}
			>
				{_.map(fieldValue, (item, key) => {
					return (
						<CardField
							key={key}
							field={key}
							payload={fieldValue}
							parentKey={field}
							schema={_.get(schema, [ 'properties', key ], {})}
						/>
					)
				})}
			</Collapsible>
		)
	}

	return (
		<React.Fragment>
			{!_.isArray(payload) && (
				<KeyLabel my={MARGIN} data-test={`card-field__label--${fieldId}`}>
					{title}
				</KeyLabel>
			)}
			<FieldValue
				fieldValue={fieldValue}
				fieldKey={field}
				parentKey={parentKey}
				schema={schema}
				data-test={`card-field__value--${fieldId}`}
			/>
		</React.Fragment>
	)
}

export default CardField
