/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	shallow
} from 'enzyme'
import React from 'react'
import Event, {
	getMessage
} from '../Event'
import {
	card
} from './fixtures'

const actions = {
	getActor: async () => {
		return {
			name: 'johndoe',
			email: 'johndoe@example.com',
			proxy: false,
			card: {}
		}
	}
}

ava('It should render', (test) => {
	test.notThrows(() => {
		shallow(
			<Event
				actions={actions}
				card={card}
			/>
		)
	})
})

ava('getMessage() should prefix Front images embedded in img tags', (test) => {
	const url = '/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787'
	const formatted = getMessage({
		data: {
			payload: {
				message: `<img src="${url}">`
			}
		}
	})

	test.is(formatted, `<img src="https://app.frontapp.com${url}">`)
})

ava('getMessage() should prefix Front images embedded in square brackets', (test) => {
	const url = '/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787'
	const formatted = getMessage({
		data: {
			payload: {
				message: `[${url}]`
			}
		}
	})

	test.is(formatted, `![Attached image](https://app.frontapp.com${url})`)
})

ava('getMessage() should hide "#jellyfish-hidden" messages', (test) => {
	const formatted = getMessage({
		data: {
			payload: {
				message: '#jellyfish-hidden'
			}
		}
	})

	test.is(formatted, '')
})
