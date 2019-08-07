import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import * as sinon from 'sinon';
import { SavedOrDraftMessage } from '../../state/reducer';
import { StoreProvider } from '../StoreProvider/StoreProvider';
import { TimeSince } from '../TimeSince/TimeSince';
import { MessageListItem } from './MessageListItem';

ava('Should render MessageListItem', t => {
	const message: SavedOrDraftMessage = {
		id: '',
		created_at: null,
		body: 'foo bar',
		is_inbound: true,
		subject: '',
		attachments: [],
		metadata: {
			headers: {
				externalId: '',
			},
		},
	};

	const handleAttachmentDownload = sinon.spy();

	const wrapper = mount(
		<Provider>
			<StoreProvider token="" apiHost="">
				<MessageListItem
					message={message}
					onAttachmentDownload={handleAttachmentDownload}
				/>
			</StoreProvider>
		</Provider>,
	);

	t.false(wrapper.exists(TimeSince));

	wrapper.setProps({
		children: (
			<StoreProvider token="" apiHost="">
				<MessageListItem
					message={
						({ ...message, created_at: 123 } as unknown) as SavedOrDraftMessage
					}
					onAttachmentDownload={handleAttachmentDownload}
				/>
			</StoreProvider>
		),
	});

	t.true(wrapper.exists(TimeSince));
});
