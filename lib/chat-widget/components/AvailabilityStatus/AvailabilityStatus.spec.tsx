import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import {
	AvailabilityStatus,
	AvailabilityStatusOffline,
	AvailabilityStatusOnline,
} from './AvailabilityStatus';

ava('Should correctly show availability status', t => {
	const wrapper = shallow(<AvailabilityStatus isSupportAgentOnline />);

	t.true(wrapper.contains(<AvailabilityStatusOnline />));

	wrapper.setProps({
		isSupportAgentOnline: false,
	});

	t.true(wrapper.contains(<AvailabilityStatusOffline />));
});
