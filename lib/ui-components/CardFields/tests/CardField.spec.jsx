/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	mount,
	shallow
} from 'enzyme'
import React from 'react'
import supportThread from './fixtures/support-thread.json'
import CardField from '../CardField'
import {
	slugify
} from '../../services/helpers'

const wrappingComponent = getWrapper().wrapper

const mountCardField = (props) => {
	return mount(<CardField {...props} />, {
		wrappingComponent
	})
}

const shallowCardField = (props) => {
	return shallow(<CardField {...props} />)
}

const findCardFieldComponent = (wrapper, section, key) => {
	return wrapper.find(`[data-test="card-field__${section}--${slugify(key.toString())}"]`).first()
}

const findTitleComponent = (wrapper, key) => {
	return findCardFieldComponent(wrapper, 'title', key)
}

const findLabelComponent = (wrapper, key) => {
	return findCardFieldComponent(wrapper, 'label', key)
}

const findValueComponent = (wrapper, key) => {
	return findCardFieldComponent(wrapper, 'value', key)
}

ava('CardField renders a complex nested object', async (test) => {
	const props = {
		field: 'data',
		payload: supportThread
	}

	await test.notThrowsAsync(async () => {
		await mountCardField(props)
	})
})

ava('CardField renders null if the field starts with $$', async (test) => {
	const props = {
		field: '$$links',
		payload: {
			$$links: {
				'is attached to': []
			}
		}
	}
	const component = shallowCardField(props)

	test.falsy(component.get(0))
})

ava('CardField renders null if the field value is undefined', async (test) => {
	const props = {
		field: 'the key',
		payload: {
			somethingElse: 'test'
		}
	}
	const component = shallowCardField(props)

	test.falsy(component.get(0))
})

ava('CardField renders an array item without a label', async (test) => {
	const props = {
		field: 0,
		payload: [
			'item1',
			'item2'
		]
	}
	const component = shallowCardField(props)

	const labelComponent = findLabelComponent(component, props.field)
	test.falsy(labelComponent.get(0))

	const valueComponent = findValueComponent(component, props.field)
	test.is(valueComponent.props().fieldValue, props.payload[props.field])
})

ava('CardField renders a primitive item with a label', async (test) => {
	const props = {
		field: 'id',
		payload: {
			id: 'test'
		}
	}
	const component = shallowCardField(props)

	const labelComponent = findLabelComponent(component, props.field)
	test.is(labelComponent.props().children, props.field)

	const valueComponent = findValueComponent(component, props.field)
	test.is(valueComponent.props().fieldValue, props.payload[props.field])
})
