import React from 'react';
import format from 'date-fns/format';
import { mount, shallow } from 'enzyme';
import { getWrapper } from '../../../../test/ui-setup';
import Context from './Context';
import Icon from '../../Icon';

const { wrapper } = getWrapper();

const TIMESTAMP_DATE = new Date();

const ACTOR = {
	name: 'fake-actor',
};

const CARD = {
	data: {
		timestamp: TIMESTAMP_DATE.toISOString(),
	},
};

test('Renders a pencil icon if the card has no name', async () => {
	const header = shallow(<Context card={CARD} actor={ACTOR} />);
	const icon = header.find(Icon);
	expect(icon.props()).toEqual({
		name: 'pencil-alt',
	});
});

test('Renders a lightbulb icon if the card has a name', () => {
	const card = {
		...CARD,
		name: 'Reopen due to activity',
	};
	const header = shallow(<Context card={card} actor={ACTOR} />);
	const icon = header.find(Icon);
	expect(icon.props()).toEqual({
		name: 'lightbulb',
	});
});

test(
	'If the card has no name, Context renders a message ' +
		' with the actor name and when they made the update',
	async () => {
		const header = mount(<Context card={CARD} actor={ACTOR} />, {
			wrappingComponent: wrapper,
		});
		expect(header.text()).toBe(
			`${ACTOR.name} updated this at ${format(TIMESTAMP_DATE, 'HH:mm')}`,
		);
	},
);

test(
	'If the card has no name and the actor is not present, ' +
		'Context renders a message with when the update was made',
	async () => {
		const header = mount(<Context card={CARD} />, {
			wrappingComponent: wrapper,
		});
		expect(header.text()).toBe(
			`updated this at ${format(TIMESTAMP_DATE, 'HH:mm')}`,
		);
	},
);

test(
	'If the card has a name, Context uses the name to render' +
		' a message including the reason for the update',
	() => {
		const card = {
			...CARD,
			name: 'Support Thread reopened due to activity',
		};
		const header = mount(<Context card={card} />, {
			wrappingComponent: wrapper,
		});
		expect(header.text()).toBe(
			`Support Thread reopened due to activity at ${format(
				TIMESTAMP_DATE,
				'HH:mm',
			)}`,
		);
	},
);

test('If there is no timestamp on the card, the created_at field is used instead', async () => {
	const createdAtDate = new Date();

	const card = {
		created_at: createdAtDate.toISOString(),
	};

	const header = mount(<Context actor={ACTOR} card={card} />, {
		wrappingComponent: wrapper,
	});
	expect(header.text()).toBe(
		`${ACTOR.name} updated this at ${format(createdAtDate, 'HH:mm')}`,
	);
});
