import '../../../../test/ui-setup';
import { shallow } from 'enzyme';
import React from 'react';
import Login from './Login';

describe('Login', () => {
	test('should render', () => {
		expect(() => {
			shallow(<Login />);
		}).not.toThrow();
	});
});
