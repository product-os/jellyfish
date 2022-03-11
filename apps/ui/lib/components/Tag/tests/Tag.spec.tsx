import '../../../../test/ui-setup';
import { shallow } from 'enzyme';
import React from 'react';
import { Tag } from '../';

test('It should render', () => {
	shallow(<Tag>#foobar</Tag>);
});
