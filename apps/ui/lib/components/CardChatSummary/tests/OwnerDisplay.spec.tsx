import '../../../../test/ui-setup';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import userWithOrg from './fixtures/user-2.json';
import { OwnerDisplay } from '../OwnerDisplay';

const sandbox = sinon.createSandbox();

afterEach(() => {
	sandbox.restore();
});

test('OwnerDisplay displays the user avatar and the message text', async () => {
	const component = shallow(<OwnerDisplay owner={userWithOrg} />);

	const userIcon = component.find('Icon');
	expect(userIcon.props().name).toBe('user');

	const avatar: any = component.find('Memo()');
	expect(avatar.props().userId).toBe(userWithOrg.id);
});
