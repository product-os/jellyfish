import { getWrapper } from '../../../../../test/ui-setup';
import sinon from 'sinon';
import { mount } from 'enzyme';
import React from 'react';
import Attachments from '../attachments';
import { card } from './fixtures';
import { SetupProvider } from '../../../SetupProvider';

const user = {
	slug: 'user-johndoe',
};

const actor = {
	name: 'johndoe',
	email: 'johndoe@example.com',
	proxy: false,
	card: {},
};

const { wrapper } = getWrapper();

const sandbox = sinon.createSandbox();

const commonProps = {
	user,
	actor,
};

afterEach(() => {
	sandbox.restore();
});
test('An AuthenticatedImage is displayed when an image is attached', () => {
	const sdk: any = {
		getFile: sandbox.stub(),
	};

	sdk.getFile.resolves();

	const attachment = {
		url: 'fake-image',
		mime: 'image/jpeg',
		name: 'fake-image',
	};

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [attachment],
			},
		},
	};
	const event = mount(
		// @ts-ignore
		<SetupProvider sdk={sdk}>
			<Attachments {...commonProps} card={cardWithAttachments} sdk={sdk} />
		</SetupProvider>,
		{
			wrappingComponent: wrapper,
		},
	);

	expect(sdk.getFile.callCount).toBe(1);
	expect(sdk.getFile.args).toEqual([[card.id, 'fake-image']]);
	const image = event.find('AuthenticatedImage[data-test="event-card__image"]');
	expect(image).toBeTruthy();
});

test('A download button is displayed for an attachment when it is not an image', () => {
	const attachment = {
		url: 'fake-pdf',
		mime: 'application/pdf',
		name: 'fake-pdf',
	};

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [attachment],
			},
		},
	};
	const event = mount(
		<Attachments {...commonProps} card={cardWithAttachments} />,
		{
			wrappingComponent: wrapper,
		},
	);
	const button = event.find('button[data-test="event-card__file"]');
	expect(button.length).toBe(1);
	expect(button.text()).toBe(attachment.name);

	const image = event.find('AuthenticatedImage[data-test="event-card__image"]');
	expect(image.length).toBe(0);
});

test('A download button is displayed for each image when there is three or more images attached to a message', () => {
	const attachment = {
		url: 'fake-image',
		mime: 'image/jpeg',
		name: 'fake-image',
	};

	const cardWithAttachments = {
		...card,
		data: {
			payload: {
				attachments: [attachment, attachment, attachment],
			},
		},
	};
	const event = mount(
		<Attachments {...commonProps} card={cardWithAttachments} />,
		{
			wrappingComponent: wrapper,
		},
	);
	const button = event.find('button[data-test="event-card__file"]');
	expect(button.length).toBe(3);

	const image = event.find('AuthenticatedImage[data-test="event-card__image"]');
	expect(image.length).toBe(0);
});
