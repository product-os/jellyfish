import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { SeeAllConversationsButton } from './SeeAllConversationsButton';

ava('Should render SeeAllConversationsButton', t => {
	const handleClick = sinon.spy();

	const wrapper = shallow(<SeeAllConversationsButton onClick={handleClick} />);

	wrapper.simulate('click');

	t.true(handleClick.calledOnce);
});
