/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import sinon from 'sinon'
import React from 'react'
import {
	mount
} from 'enzyme'
import {
	ViewFooter
} from './ViewFooter'

const wrappingComponent = getWrapper().wrapper

const type1 = {
	slug: 'user',
	name: 'User'
}

const type2 = {
	slug: 'org',
	name: 'Organization'
}

const types = [ type1, type2 ]

const sandbox = sinon.createSandbox()

ava.beforeEach((test) => {
	test.context.defaultProps = {
		actions: {
			addCard: sandbox.stub()
		},
		channel: {}
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('ViewFooter renders a single button if only one type is supplied', (test) => {
	const {
		defaultProps
	} = test.context
	const component = mount((
		<ViewFooter types={[ type1 ]} {...defaultProps} />
	), {
		wrappingComponent
	})

	const singleButton = component.find('button[data-test="viewfooter__add-btn--user"]').first()
	test.is(singleButton.text(), 'Add User')

	singleButton.simulate('click')
	test.true(defaultProps.actions.addCard.calledOnce)
})

ava('ViewFooter renders a drop-down button if multiple types are supplied', (test) => {
	const {
		defaultProps
	} = test.context
	const component = mount((
		<ViewFooter types={types} {...defaultProps} />
	), {
		wrappingComponent
	})

	const dropDownButton = component.find('button[data-test="viewfooter__add-dropdown"]').first()
	test.is(dropDownButton.text(), 'Add User')

	dropDownButton.simulate('click')
	test.true(defaultProps.actions.addCard.calledOnce)
})

ava('ViewFooter calls addCard action when a dropdown option is clicked', (test) => {
	const {
		defaultProps
	} = test.context
	const component = mount((
		<ViewFooter types={types} {...defaultProps} />
	), {
		wrappingComponent
	})

	const dropDownExpand = component.find('button[data-test="viewfooter__add-dropdown"]').at(1)
	dropDownExpand.simulate('click')
	component.update()

	const dropDownOption = component.find('[data-test="viewfooter__add-link--org"]').first()
	test.is(dropDownOption.text(), 'Add Organization')

	dropDownOption.simulate('click')
	test.true(defaultProps.actions.addCard.calledOnce)
})
