/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import ava from 'ava'
import {
	getMessage
} from '../EventBody'

ava('getMessage() should prefix Front image embedded in img tags', (test) => {
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

ava('getMessage() should prefix multitple Front images embedded in img tags', (test) => {
	const url = '/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787'
	const formatted = getMessage({
		data: {
			payload: {
				message: `<img src="${url}"><img src="${url}"><img src="${url}"><img src="${url}">`
			}
		}
	})

	test.is(formatted, `<img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}">`)
})

ava('getMessage() should prefix Front image embedded in square brackets', (test) => {
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

ava('getMessage() should prefix multiple Front images embedded in square brackets', (test) => {
	const url = '/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787'
	const formatted = getMessage({
		data: {
			payload: {
				message: `[${url}] [${url}] [${url}]`
			}
		}
	})

	test.is(formatted, `![Attached image](https://app.frontapp.com${url}) ![Attached image](https://app.frontapp.com${url}) ![Attached image](https://app.frontapp.com${url})`)
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
