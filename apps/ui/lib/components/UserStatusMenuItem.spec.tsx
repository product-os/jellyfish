import '../../test/ui-setup';
import { user } from '../../test/fixtures/types';
import React from 'react';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import { Icon } from '.';
import UserStatusMenuItem from './UserStatusMenuItem';

const DND = {
	title: 'Do Not Disturb',
	value: 'DoNotDisturb',
};

const Available = {
	title: 'Available',
	value: 'Available',
};

const types = [user];

const getUser = (status) => {
	return {
		id: '1',
		data: {
			status,
		},
	};
};

const sandbox = sinon.createSandbox();

describe('UserStatusMenuItem', () => {
	afterEach(async () => {
		sandbox.restore();
	});

	test('should render', () => {
		const actions = {
			updateUser: sandbox.fake(),
		};
		expect(() => {
			shallow(
				<UserStatusMenuItem
					user={getUser(DND)}
					actions={actions}
					types={types}
				/>,
			);
		}).not.toThrow();
	});

	test('Tooltip and icon set correctly if status is DoNotDisturb', () => {
		const actions = {
			updateUser: sandbox.stub(),
		};
		const component = shallow(
			<UserStatusMenuItem
				user={getUser(DND)}
				actions={actions}
				types={types}
			/>,
		);

		const btn = component.find('[data-test="button-dnd"]');
		expect((btn.props() as any).tooltip.text).toBe('Turn off Do Not Disturb');

		const icon = component.find(Icon);
		expect(icon.props().name).toBe('check');
	});

	test('Tooltip and icon set correctly if status is NOT DoNotDisturb', () => {
		const actions = {
			updateUser: sandbox.stub(),
		};
		const component = shallow(
			<UserStatusMenuItem
				user={getUser(Available)}
				actions={actions}
				types={types}
			/>,
		);

		const btn = component.find('[data-test="button-dnd"]');
		expect((btn.props() as any).tooltip.text).toBe('Turn off notifications');

		const icon = component.find('Icon');
		expect(icon.length).toBe(0);
	});

	test('Clicking button sets status to Available if currently DoNotDisturb', () => {
		const actions = {
			updateUser: sandbox.stub(),
		};
		const component = shallow(
			<UserStatusMenuItem
				user={getUser(DND)}
				actions={actions}
				types={types}
			/>,
		);

		const btn = component.find('[data-test="button-dnd"]');
		btn.simulate('click');

		expect(actions.updateUser.calledOnce).toBe(true);
		expect(actions.updateUser.getCall(0).args[0]).toEqual([
			{
				op: 'replace',
				path: '/data/status/value',
				value: Available.value,
			},
			{
				op: 'replace',
				path: '/data/status/title',
				value: Available.title,
			},
		]);
	});

	test('Clicking button sets status to DoNotDisturb if currently Available', () => {
		const actions = {
			updateUser: sandbox.stub(),
		};
		const component = shallow(
			<UserStatusMenuItem
				user={getUser(Available)}
				actions={actions}
				types={types}
			/>,
		);

		const btn = component.find('[data-test="button-dnd"]');
		btn.simulate('click');

		expect(actions.updateUser.calledOnce).toBe(true);
		expect(actions.updateUser.getCall(0).args[0]).toEqual([
			{
				op: 'replace',
				path: '/data/status/value',
				value: DND.value,
			},
			{
				op: 'replace',
				path: '/data/status/title',
				value: DND.title,
			},
		]);
	});
});
