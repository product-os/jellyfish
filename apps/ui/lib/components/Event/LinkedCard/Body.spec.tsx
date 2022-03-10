import React from 'react';
import { shallow } from 'enzyme';
import '../../../../test/ui-setup';
import { Txt } from 'rendition';
import Icon from '../../shame/Icon';
import { Link } from '../../Link';
import Body from './Body';

const CARD = {
	id: 'fake_id',
};

test('An arrow icon is rendered by the Body component', async () => {
	const content = shallow(<Body card={CARD} />);
	const icon = content.find(Icon);
	expect(icon.props()).toEqual({
		name: 'level-up-alt',
		rotate: '90',
	});
});

test('Renders a link to the Linked card', async () => {
	const content = shallow(<Body card={CARD} />);
	const link = content.find(Link);
	const props = link.props();
	expect((props as any).to).toBe(`https://jel.ly.fish/${CARD.id}`);
});

test('Renders the name of the linked card when its present', async () => {
	const card = {
		id: 'fake-id',
		slug: 'fake-slug',
		name: 'fake-name',
	};
	const content = shallow(<Body card={card} />);
	const txt = content.find(Txt);
	expect(txt.text()).toBe(card.name);
});

test('Renders the slug of the linked card when the name is not present', async () => {
	const card = {
		id: 'fake-id',
		slug: 'fake-slug',
	};
	const content = shallow(<Body card={card} />);
	const txt = content.find(Txt);
	expect(txt.text()).toBe(card.slug);
});

test("Renders the id of the linked card when the name and the slug aren't present", async () => {
	const content = shallow(<Body card={CARD} />);
	const txt = content.find(Txt);
	expect(txt.text()).toBe(CARD.id);
});
