/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import React from 'react'

import CardField from './'

const {
	wrapper
} = getWrapper({
	core: {
		types: []
	}
})

ava.serial('When the field is a string: displays one label and one field value component', async (test) => {
	const field = 'email'
	const payload = {
		[field]: 'fake@email.com'
	}
	const component = mount(
		<CardField
			field={field}
			payload={payload}
			schema={{
				type: 'string'
			}}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const label = component.find(`Txt[data-test="card-field-label--${field}"]`)
	test.is(label.text(), field)

	const cardValue = component.find(`Txt[data-test="card-field--${payload[field]}"]`)
	test.is(cardValue.text(), payload[field])
})

ava.serial('When the field is an array: displays one label ' +
'and one <ul> list with a <li> for each item in a list', async (test) => {
	const field = 'mentionsuser'
	const payload = {
		[field]: [ 'first', 'second', 'third' ]
	}
	const schema = {
		type: 'array',
		items: {
			type: 'string'
		}
	}

	const component = mount(
		<CardField
			field={field}
			payload={payload}
			schema={schema}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const label = component.find(`Txt[data-test="card-field-label--${field}"]`)
	test.is(label.text(), field)

	const list = component.find('ul')
	test.is(list.length, 1)

	const fields = list.find('li')
	test.is(fields.length, 3)

	const fieldValue = payload[field]

	for (const index in fieldValue) {
		const txt = component.find(`Txt[data-test="card-field--${fieldValue[index]}"]`)
		test.is(txt.text(), fieldValue[index])
	}
})

ava.serial('When the field is an object: displays one ul for each object' +
' with a <li> for each key/value pair. The li should display as "key: value"', async (test) => {
	const field = 'object'
	const first = 'a'
	const second = 'b'
	const third = 'c'

	const schema = {
		type: 'object',
		properties: {
			first: {
				type: 'string'
			},
			second: {
				type: 'string'
			},
			third: {
				type: 'string'
			}
		}
	}

	const payload = {
		[field]: {
			first,
			second,
			third
		}
	}

	const component = mount(
		<CardField
			field={field}
			payload={payload}
			schema={schema}
		/>, {
			wrappingComponent: wrapper
		}
	)

	const label = component.find(`Txt[data-test="card-field-label--${field}"]`)
	test.is(label.text(), field)

	const list = component.find('ul')
	test.is(list.length, 1)

	const li = list.find('li')
	test.is(li.length, 3)

	const firstItem = component.find('Txt[data-test="card-field--first"]')
	test.is(firstItem.text(), `first: ${first}`)

	const secondItem = component.find('Txt[data-test="card-field--second"]')
	test.is(secondItem.text(), `second: ${second}`)

	const thirdItem = component.find('Txt[data-test="card-field--third"]')
	test.is(thirdItem.text(), `third: ${third}`)
})
