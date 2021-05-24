/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
