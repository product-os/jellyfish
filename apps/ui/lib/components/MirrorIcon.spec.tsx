import '../../test/ui-setup';
import React from 'react';
import { shallow } from 'enzyme';
import { ThreadMirrorIcon, MirrorIcon } from './MirrorIcon';

const mirrorTests = [
	{
		name: 'Front',
		mirrors: ['https://api2.frontapp.com/conversations/cnv_5fux3ur'],
		iconSelector: 'img',
	},
	{
		name: 'Discourse',
		mirrors: ['https://forums.balena.io/t/80953'],
		iconSelector: 'i',
	},
	{
		name: 'GitHub',
		mirrors: ['https://github.com/balena-io/etcher/issues/2020'],
		iconSelector: 'i',
	},
];

test('MirrorIcon identifies mirror source in tooltip', () => {
	for (const { name, mirrors } of mirrorTests) {
		const mirrorIcon = shallow(<MirrorIcon mirrors={mirrors} />);
		const wrapper: any = mirrorIcon.find('[data-test="mirror-icon"]');

		expect(wrapper.props().className).toBe('synced');
		expect(wrapper.props().tooltip).toBe(`Synced with ${name}`);
	}
});

test('ThreadMirrorIcon identifies mirror source in tooltip and displays mirror icon', () => {
	for (const { name, mirrors, iconSelector } of mirrorTests) {
		const mirrorIcon = shallow(<ThreadMirrorIcon mirrors={mirrors} />);
		const wrapper: any = mirrorIcon.find('[data-test="thread-mirror-icon"]');
		const icon = wrapper.find(iconSelector);
		expect(wrapper.props().tooltip).toBe(`Synced with ${name}`);
		expect(icon).toBeTruthy();
	}
});

test('MirrorIcon indicates if the mirror is not synced', () => {
	const mirrorIcon = shallow(<MirrorIcon mirrors={[]} />);
	const wrapper: any = mirrorIcon.find('[data-test="mirror-icon"]');
	expect(wrapper.props().className).toBe('unsynced');
	expect(wrapper.props().tooltip).toBe('Not yet synced');
});
