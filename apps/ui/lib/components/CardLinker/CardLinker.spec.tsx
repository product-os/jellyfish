import '../../../test/ui-setup';
import { shallow } from 'enzyme';
import React from 'react';
import CardLinker from './CardLinker';

describe('CardLinker', () => {
	test('should render', () => {
		expect(() => {
			shallow(<CardLinker />);
		}).not.toThrow();
	});
});
