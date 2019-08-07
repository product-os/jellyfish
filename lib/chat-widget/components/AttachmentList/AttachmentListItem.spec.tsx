import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { AttachmentListItem } from './AttachmentListItem';

ava('Should render attachment list item', t => {
	const handleDelete = sinon.spy();
	const handleDownload = sinon.spy();

	const wrapper = shallow(
		<AttachmentListItem
			attachment={new File(['foo'], 'bar.txt')}
			onDelete={handleDelete}
			onDownload={handleDownload}
		/>,
	);

	t.false(
		wrapper.exists('[data-test-id="delete-button"]'),
		'should not render delete button by default',
	);

	wrapper.setProps({
		canDelete: true,
	});

	const deleteButtonWrapper = wrapper.find('[data-test-id="delete-button"]');
	t.true(deleteButtonWrapper.exists(), 'should render delete button');

	deleteButtonWrapper.simulate('click');
	t.true(handleDelete.calledOnce, 'delete handler should be called');
});
