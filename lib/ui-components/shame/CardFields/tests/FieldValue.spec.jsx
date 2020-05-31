/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../../../test/ui-setup'
import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import FieldValue from '../FieldValue'
import {
	slugify
} from '../../../services/helpers'

const mountFieldValue = (props) => {
	return shallow(<FieldValue {...props} data-test={`card-field__value--${slugify(props.fieldKey)}`} />)
}

const findValueComponent = (component, key) => {
	return component.find(`[data-test="card-field__value--${slugify(key)}"]`)
}

ava('FieldValue renders a string field', async (test) => {
	const props = {
		fieldValue: 'a string',
		fieldKey: 'the key'
	}
	const component = await mountFieldValue(props)
	const valueComponent = findValueComponent(component, props.fieldKey)

	test.is(valueComponent.props().children, 'a string')
})

ava('FieldValue formats a date-time field', async (test) => {
	const props = {
		fieldValue: '2019-05-26T05:15:54.330Z',
		fieldKey: 'the key',
		schema: {
			format: 'date-time'
		}
	}
	const component = await mountFieldValue(props)
	const valueComponent = findValueComponent(component, props.fieldKey)

	// Avoid testing for the exact string due to timezone differences
	test.true(valueComponent.props().children.startsWith('May'))
})

ava('FieldValue uses Mermaid if the schema specifies it', async (test) => {
	const props = {
		fieldValue: `
		graph TD;
				A-->B;
				A-->C;
				B-->D;
				C-->D;
		`,
		fieldKey: 'the key',
		schema: {
			format: 'mermaid'
		}
	}
	const component = await mountFieldValue(props)
	const valueComponent = findValueComponent(component, props.fieldKey)

	test.is(valueComponent.name(), 'Mermaid')
})
