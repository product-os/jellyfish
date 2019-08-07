import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { Header } from './Header';

ava('Should render header', t => {
	const wrapper = shallow(<Header isSupportAgentOnline />);

	t.true(wrapper.exists());
});
