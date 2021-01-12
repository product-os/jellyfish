/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getPromiseResolver,
	getWrapper
} from '../../../../test/ui-setup'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import React from 'react'
import {
	LinkModal
} from '../LinkModal'
import * as AutoCompleteCardSelect from '../../AutoCompleteCardSelect'
import user from './fixtures/user.json'
import org from './fixtures/org.json'

const sandbox = sinon.createSandbox()

const {
	wrapper: Wrapper
} = getWrapper()

const card = {
	id: 'U1',
	slug: 'user-1',
	type: 'user@1.0.0'
}

const card2 = {
	id: 'U2',
	slug: 'user-2',
	type: 'user@1.0.0'
}

const orgInstanceCard = {
	id: 'O2',
	slug: 'org-1',
	type: 'org@1.0.0'
}

const types = [
	user,
	org
]

const targets = [
	{
		id: 'R1',
		slug: 'org-balena',
		name: 'Balena',
		type: 'org@1.0.0'
	},
	{
		id: 'R2',
		slug: 'org-google',
		name: 'Google',
		type: 'org@1.0.0'
	}
]

const selectedTarget = targets[0]

// Mock the AutoCompleteCardSelect as it doesn't work well outside of the real browser environment
const mockAutoCompleteCardSelect = () => {
	const callbacks = {}
	const FakeAutoCompleteCardSelect = ({
		onChange
	}) => {
		callbacks.onChange = onChange
		return null
	}
	const autoCompleteCardSelectComponentStub = sandbox.stub(AutoCompleteCardSelect, 'default')
	autoCompleteCardSelectComponentStub.callsFake((props) => FakeAutoCompleteCardSelect(props))
	return callbacks
}

const submit = (linkModalComponent) => {
	const button = linkModalComponent.find('button[data-test="card-linker--existing__submit"]')
	button.simulate('click')
}

// TBD: This code assumes that Promise.all in LinkModal will call the async createLink methods
// in the same order as the cards are provided in the cards prop.
const verifyCard = (test, commonProps, callIndex, expectedCard) => {
	const [ theCard, theSelectedTarget, linkTypeName ] = commonProps.actions.createLink.args[callIndex]
	test.deepEqual(theCard, expectedCard)
	test.deepEqual(theSelectedTarget, selectedTarget)
	test.deepEqual(linkTypeName, 'is member of')

	const [ savedSelectedTarget, savedLinkTypeName ] = commonProps.onSaved.args[callIndex]
	test.deepEqual(savedSelectedTarget, selectedTarget)
	test.deepEqual(savedLinkTypeName, 'is member of')
}

ava.beforeEach(async (test) => {
	const onHidePromise = getPromiseResolver()
	const onHide = () => {
		onHidePromise.resolver()
	}
	test.context = {
		...test.context,
		onHidePromise,
		autoCompleteCallbacks: mockAutoCompleteCardSelect(),
		commonProps: {
			onHide,
			onSaved: sandbox.stub(),
			actions: {
				createLink: sandbox.stub().resolves(null)
			}
		}
	}
})

ava.afterEach(async (test) => {
	sandbox.restore()
})

ava('LinkModal can link one card to another card', async (test) => {
	const {
		commonProps,
		onHidePromise,
		autoCompleteCallbacks
	} = test.context

	const linkModalComponent = await mount((
		<LinkModal
			{...commonProps}
			cards={[ card ]}
			types={types}
		/>
	), {
		wrappingComponent: Wrapper
	})

	autoCompleteCallbacks.onChange(selectedTarget)

	submit(linkModalComponent)

	await onHidePromise.promise

	verifyCard(test, commonProps, 0, card)
})

ava('LinkModal can link multiple cards to another card', async (test) => {
	const {
		commonProps,
		onHidePromise,
		autoCompleteCallbacks
	} = test.context

	const linkModalComponent = await mount((
		<LinkModal
			{...commonProps}
			cards={[ card, card2 ]}
			types={types}
		/>
	), {
		wrappingComponent: Wrapper
	})

	autoCompleteCallbacks.onChange(selectedTarget)

	submit(linkModalComponent)

	await onHidePromise.promise

	test.is(commonProps.actions.createLink.callCount, 2)
	test.is(commonProps.onSaved.callCount, 2)

	verifyCard(test, commonProps, 0, card)
	verifyCard(test, commonProps, 1, card2)
})

ava('LinkModal throws exception if card types are different', async (test) => {
	const {
		commonProps
	} = test.context

	test.throws(() => {
		mount((
			<LinkModal
				{...commonProps}
				cards={[ card, orgInstanceCard ]}
				types={types}
			/>
		), {
			wrappingComponent: Wrapper
		})
	}, {
		message: 'All cards must be of the same type'
	})
})
