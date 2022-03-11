import { getWrapper } from '../../../../test/ui-setup';
import sinon from 'sinon';
import { mount } from 'enzyme';
import React from 'react';
import userWithOrg from './fixtures/user-with-org.json';
import { UserAvatarLive } from '../';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper(
	{},
	{
		getCard: sandbox.stub(),
		selectCard: sandbox.stub().returns(sandbox.stub().returns(userWithOrg)),
	},
).wrapper;

let context: any = {};

beforeEach(() => {
	context = {
		...context,
		commonProps: {
			emphasized: false,
			userId: userWithOrg.id,
		},
	};
	sandbox.restore();
});

afterEach(() => {
	sandbox.restore();
});

test('UserAvatarLive displays the user`s avatar, tooltip and status', async () => {
	const { commonProps } = context;

	const component = await mount(<UserAvatarLive {...commonProps} />, {
		wrappingComponent,
	});

	const avatar: any = component.find('BaseAvatar');
	expect(avatar.props().emphasized).toBe(false);
	expect(avatar.props().firstName).toBe('Test');
	expect(avatar.props().lastName).toBe('User');
	expect(avatar.props().src).toBe('https://via.placeholder.com/150');

	const statusIcon: any = component.find('UserStatusIcon');
	expect(statusIcon.props().small).toBe(!commonProps.emphasized);
	expect(statusIcon.props().userStatus.value).toEqual('DoNotDisturb');

	const avatarBox: any = component.find('[data-test="avatar-wrapper"]').first();
	expect(avatarBox.props().tooltip).toEqual({
		text: 'Test User\ntest@jel.ly.fish\njellyfish',
		placement: 'top',
	});
});
