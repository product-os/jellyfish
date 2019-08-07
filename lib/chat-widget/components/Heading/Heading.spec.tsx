import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { Heading } from './Heading';

ava('Should render heading', t => {
	const primaryText = 'Test primary text';
	const secondaryText = 'Test secondary text';

	const wrapper = shallow(
		<Heading primaryText={primaryText} secondaryText={secondaryText} />,
	);

	t.true(wrapper.contains(primaryText));
	t.true(wrapper.contains(secondaryText));
});
