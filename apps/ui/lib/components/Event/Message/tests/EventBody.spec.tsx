import { getWrapper } from '../../../../../test/ui-setup';
import _ from 'lodash';
import sinon from 'sinon';
import { mount } from 'enzyme';
import React from 'react';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { SetupProvider } from '../../../SetupProvider';
import Analytics from '../../../../services/analytics';
import { card } from './fixtures';
import Body from '../Body';

const wrappingComponent = getWrapper().wrapper;
const sandbox = sinon.createSandbox();

const { wrapper: Wrapper } = getWrapper({
	core: {},
});

const wrapperWithSetup = ({
	children,
	sdk,
	analytics,
}: {
	children: React.ReactNode;
	sdk: JellyfishSDK;
	analytics: Analytics;
}) => {
	return (
		<Wrapper>
			{/* @ts-ignore: TS-TODO - add missing props to SetupProvider test instance */}
			<SetupProvider sdk={sdk} analytics={analytics}>
				{children}
			</SetupProvider>
		</Wrapper>
	);
};

const context: any = {};

beforeEach(() => {
	context.commonProps = {
		enableAutocomplete: false,
		sendCommand: 'enter',
		onUpdateDraft: sandbox.fake(),
		onSaveEditedMessage: sandbox.fake(),
		types: [],
		user: {
			slug: 'test-user',
		},
		sdk: {
			getFile: sandbox.stub().resolves('abc'),
		},
		card,
		actor: {},
		isMessage: true,
		editedMessage: null,
		updating: false,
		messageOverflows: false,
		setMessageElement: sandbox.fake(),
		messageCollapsedHeight: 400,
	};
});

afterEach(() => {
	sandbox.restore();
});

test('Auto-complete textarea is shown if message is being edited', () => {
	const { commonProps } = context;
	const eventBody = mount(
		<Body {...commonProps} editedMessage="test message" updating={false} />,
		{
			wrappingComponent,
		},
	);
	const autoCompleteTextarea = eventBody.find(
		'div[data-test="event__textarea"]',
	);
	expect(autoCompleteTextarea.length).toBe(1);
});

test('Edited message is shown in markdown if message is being updated', () => {
	const { commonProps } = context;
	const editedMessage = 'test message';
	const eventBody = mount(
		<Body {...commonProps} editedMessage={editedMessage} updating />,
		{
			wrappingComponent,
		},
	);
	const autoCompleteTextarea = eventBody.find(
		'div[data-test="event__textarea"]',
	);
	expect(autoCompleteTextarea.length).toBe(0);
	const messageText = eventBody.find(
		'div[data-test="event-card__message-draft"]',
	);
	expect(messageText.text()).toBe(editedMessage);
});

test('Hidden front URLs are not displayed in the message', () => {
	const { commonProps } = context;

	const frontCard = _.merge({}, card, {
		data: {
			payload: {
				message:
					'Line1\n[](https://www.balena-cloud.com?hidden=whisper&source=flowdock)',
			},
		},
	});

	const eventBody: any = mount(<Body {...commonProps} card={frontCard} />, {
		wrappingComponent,
	});

	const message = eventBody.first('[data-test="event-card__message"]');
	expect(message.text().trim()).toBe('Line1');
});

test('Messages with file attachments and no text content only display the file attachment', () => {
	const { commonProps } = context;

	const fileUploadCard = _.merge({}, card, {
		data: {
			payload: {
				file: {
					mime: 'image/jpeg',
					name: 'test.jpg',
					slug: '5c0844ce-929c-4c4c-86d6-5c381a1dd811.test.jpg',
					bytesize: 795366,
				},
				message:
					'[](#jellyfish-hidden)A file has been uploaded using Jellyfish: http://localhost:9000/5dab83ea-c9b0-4698-aaee-e063bd871e80',
			},
		},
	});

	const eventBody: any = mount(
		<Body {...commonProps} card={fileUploadCard} />,
		{
			wrappingComponent: wrapperWithSetup,
			wrappingComponentProps: {
				sdk: commonProps.sdk,
				analytics: {
					track: sandbox.stub(),
				},
			},
		},
	);

	const image = eventBody.find(
		'AuthenticatedImage[data-test="event-card__image"]',
	);
	expect(image.length).toBe(1);
	const message = eventBody.find('div[data-test="event-card__message"]');
	expect(message.length).toBe(0);
});
