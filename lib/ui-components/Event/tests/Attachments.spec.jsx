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
import {
	mount
} from 'enzyme'
import React from 'react'
import Attachments from '../Attachments'
import {
	card
} from './fixtures'

const user = {
	slug: 'user-johndoe'
}

const actor = {
	name: 'johndoe',
	email: 'johndoe@example.com',
	proxy: false,
	card: {}
}

const {
	wrapper
} = getWrapper()

const sandbox = sinon.createSandbox()

const actions = {
	addNotification: sandbox.fake()
}

const commonProps = {
	actions,
	user,
	actor
}

ava.afterEach(() => {
	sandbox.restore()
})
ava('An AuthenticatedImage is displayed when an image is attached', (test) => {
	const sdk = {
		getFile: sandbox.stub()
	}

	sdk.getFile.resolves()

	const attachment = {
		url: 'fake-image',
		mime: 'image/jpeg',
		name: 'fake-image'
	}

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [ attachment ]
			}
		}
	}
	const event = mount(
		<Attachments
			{...commonProps}
			card={cardWithAttachments}
			sdk={sdk}
		/>, {
			wrappingComponent: wrapper
		}
	)

	test.is(sdk.getFile.callCount, 1)
	test.deepEqual(sdk.getFile.args, [ [ card.id, 'fake-image' ] ])
	const image = event.find('AuthenticatedImage[data-test="event-card__image"]')
	test.is(image.filename)
})

ava('A download button is displayed for an attachment when it is not an image', (test) => {
	const attachment = {
		url: 'fake-pdf',
		mime: 'application/pdf',
		name: 'fake-pdf'
	}

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [ attachment ]
			}
		}
	}
	const event = mount(
		<Attachments
			{...commonProps}
			card={cardWithAttachments}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const button = event.find('button[data-test="event-card__file"]')
	test.is(button.length, 1)
	test.is(button.text(), attachment.name)

	const image = event.find('AuthenticatedImage[data-test="event-card__image"]')
	test.is(image.length, 0)
})

ava('A download button is displayed for each image when there is three or more images attached to a message', (test) => {
	const attachment = {
		url: 'fake-image',
		mime: 'image/jpeg',
		name: 'fake-image'
	}

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [ attachment, attachment, attachment ]
			}
		}
	}
	const event = mount(
		<Attachments
			{...commonProps}
			card={cardWithAttachments}
		/>, {
			wrappingComponent: wrapper
		}
	)
	const button = event.find('button[data-test="event-card__file"]')
	test.is(button.length, 3)

	const image = event.find('AuthenticatedImage[data-test="event-card__image"]')
	test.is(image.length, 0)
})
