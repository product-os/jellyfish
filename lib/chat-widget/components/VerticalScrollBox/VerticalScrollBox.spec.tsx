import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { VerticalScrollBox } from './VerticalScrollBox';

ava('Should render VerticalScrollBox', t => {
	const wrapper = shallow(<VerticalScrollBox />);

	t.true(wrapper.exists());
});
