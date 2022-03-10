import React from 'react';
import format from 'date-fns/format';
import { mount, shallow } from 'enzyme';
import { getWrapper } from '../../../../test/ui-setup';
import Icon from '../../shame/Icon';
import Context from './Context';

const { wrapper } = getWrapper();

const TIMESTAMP_DATE = new Date();

const ACTOR = {
	name: 'fake-actor',
};

const CARD = {
	created_at: TIMESTAMP_DATE.toString(),
};

const LINKED_CARD = {
	type: 'user@1.0.0',
};

test('Renders a link icon', async () => {
	const header = shallow(
		<Context card={CARD} actor={ACTOR} linkedCardInfo={LINKED_CARD} />,
	);
	const icon = header.find(Icon);
	expect(icon.props()).toEqual({
		name: 'link',
	});
});

test('Renders a message about the link (who made the link, what card type it is, and when it was linked)', async () => {
	const createdAtDate = new Date();

	const card = {
		created_at: createdAtDate.toString(),
	};

	const header = mount(
		<Context actor={ACTOR} card={card} linkedCardInfo={LINKED_CARD} />,
		{
			wrappingComponent: wrapper,
		},
	);
	expect(header.text()).toBe(
		`${ACTOR.name} added link to User at ${format(createdAtDate, 'HH:mm')}`,
	);
});
