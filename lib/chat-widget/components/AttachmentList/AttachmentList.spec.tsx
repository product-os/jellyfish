import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { Attachment } from '../../utils/sdk/sdk';
import { AttachmentList } from './AttachmentList';
import { AttachmentListItem } from './AttachmentListItem';

const attachments: Attachment[] = [
	{
		id: '1',
		filename: 'first.txt',
		url: 'https://fake.com/1',
		contentType: 'text/plain',
		size: 200,
		metadata: {},
	},
	{
		id: '2',
		filename: 'second.txt',
		url: 'https://fake.com/2',
		contentType: 'text/plain',
		size: 202,
		metadata: {},
	},
];

ava('Should render AttachmentListItems', t => {
	const wrapper = shallow(<AttachmentList value={attachments} />);

	t.is(wrapper.find(AttachmentListItem).length, attachments.length);
});

ava('Should be able to delete attachment', t => {
	const handleChange = sinon.spy();

	const wrapper = shallow(
		<AttachmentList value={attachments} onChange={handleChange} />,
	);

	(wrapper.instance() as AttachmentList).handleItemDelete(attachments[0]);
	t.deepEqual(handleChange.args[0][0], [attachments[1]]);
});
