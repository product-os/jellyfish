import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { TimeSince } from './TimeSince';

ava('Should render TimeSince', t => {
	const wrapper = shallow(<TimeSince date={Date.now()} />);

	t.is(wrapper.text(), 'a few seconds ago');

	wrapper.setProps({
		date: Date.now() - 10 * 1000 * 60 * 60 * 24,
	});

	t.is(wrapper.text(), '10 days ago');
});
