import React from 'react';
import { shallow } from 'enzyme';
import '../../../../test/ui-setup';
import { Txt } from 'rendition';
import Icon from '../../shame/Icon';
import Body from './Body';

const CARD = {
	data: {
		payload: [
			{
				op: 'add',
				path: '/data/participants',
				value: ['fake participant 1', 'fake participant 2'],
			},
		],
	},
};

test('An arrow icon is rendered by the Body component', async () => {
	const content = shallow(<Body card={CARD} />);
	const icon = content.find(Icon);
	expect(icon.props()).toEqual({
		name: 'level-up-alt',
		rotate: '90',
	});
});

test('Nothing is rendered if the name is present on the card', async () => {
	const cardWithName = {
		name: 'reason for update',
	};
	const content = shallow(<Body card={cardWithName} />);
	expect(content.isEmptyRender()).toBe(true);
});

test('A description of the operations is rendered when the name is not present on the card', async () => {
	const content = shallow(<Body card={CARD} />);
	const txt = content.find(Txt);
	expect(txt.text()).toBe('added value to path "/data/participants"');
});

test(
	"A description of multiple operations is rendered as a list with an 'and'" +
		' between the last two operations',
	async () => {
		const card = {
			data: {
				payload: [
					{
						op: 'add',
						path: '/data/participants',
						value: ['fake participant 1', 'fake participant 2'],
					},
					{
						op: 'replace',
						path: '/data/owner',
						value: 'fake-owner',
					},
					{
						op: 'remove',
						path: '/data/mirrors',
					},
				],
			},
		};
		const content = shallow(<Body card={card} />);
		const txt = content.find(Txt);
		expect(txt.text()).toBe(
			'added value to path "/data/participants", changed ' +
				'value at path "/data/owner" and removed path "/data/mirrors"',
		);
	},
);
