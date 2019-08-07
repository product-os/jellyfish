import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { Provider } from 'rendition';
import { Spinner } from './Spinner';

ava('Should render spinner', t => {
	const wrapper = mount(
		<Provider>
			<Spinner />
		</Provider>,
	);

	t.true(wrapper.text().includes('Loading'), 'should show loading text');

	wrapper.setProps({
		children: <Spinner failed />,
	});

	t.true(wrapper.text().includes('Error'), 'should show error text');
});
