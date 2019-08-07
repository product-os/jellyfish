import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import { Button } from 'rendition';
import * as sinon from 'sinon';
import { FileInput } from './FileInput';

ava.failing('Should select files', t => {
	const handleChange = sinon.spy();

	const wrapper = shallow(<FileInput onChange={handleChange} />);

	wrapper.find(Button).simulate('click');

	t.true(handleChange.calledOnce);
});
