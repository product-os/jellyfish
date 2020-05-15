/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../../test/ui-setup'
import React from 'react'
import ava from 'ava'
import sinon from 'sinon'
import {
	shallow,
	mount
} from 'enzyme'
import CardLoader from './CardLoader'

const testCard = {
	id: '1',
	type: 'user',
	version: '1.0.0',
	slug: 'user-test'
}

const getCard = (state) => {
	return testCard
}

ava('CardLoader children must be a function', (test) => {
	test.throws(() => {
		shallow(
			<CardLoader id="1" type="user" card={null} withLinks={[ 'is member of' ]} getCard={getCard}>
				<div>Test</div>
			</CardLoader>
		)
	})
})

ava('CardLoader passes card to its child function', async (test) => {
	const getCardFn = sinon.fake.returns(getCard)
	const children = sinon.fake.returns(<div>Test</div>)
	shallow(
		<CardLoader
			id={testCard.id}
			type={testCard.type}
			card={testCard}
			getCard={getCardFn}
			withLinks={[ 'is member of' ]}
		>
			{children}
		</CardLoader>
	)
	test.is(children.callCount, 1)
	test.is(children.getCall(0).args[0], testCard)
})

ava('CardLoader calls getCard callback if card prop is null', async (test) => {
	const getCardFn = sinon.fake.returns(getCard)
	const children = sinon.fake.returns(<div>Test</div>)
	mount(
		<CardLoader
			id={testCard.id}
			type={testCard.type}
			card={null}
			getCard={getCardFn}
			withLinks={[ 'is member of' ]}
		>
			{children}
		</CardLoader>
	)
	test.is(getCardFn.callCount, 1)
	test.deepEqual(getCardFn.getCall(0).args, [ testCard.id, testCard.type, [ 'is member of' ] ])
})
