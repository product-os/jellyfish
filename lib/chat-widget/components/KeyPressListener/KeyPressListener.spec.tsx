import ava from 'ava';
import { mount } from 'enzyme';
import * as React from 'react';
import { KeyPressListener } from './KeyPressListener';

ava('Should handle keypress event', t => {
	t.plan(3);

	const handleKeyPress = (e: KeyboardEvent) => {
		t.is(e.key, 'g');
		t.true(e.ctrlKey);
	};

	const wrapper = mount(<KeyPressListener onKeyPress={handleKeyPress} />);

	t.true(wrapper.exists());

	document.dispatchEvent(
		new KeyboardEvent('keypress', {
			key: 'g',
			ctrlKey: true,
		}),
	);
});
