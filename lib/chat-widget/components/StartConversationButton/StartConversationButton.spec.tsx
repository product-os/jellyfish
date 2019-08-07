import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { StartConversationButton } from './StartConversationButton';

ava('Should render StartConversationButton', t => {
	const handleClick = sinon.spy();

	const wrapper = shallow(<StartConversationButton onClick={handleClick} />);

	wrapper.simulate('click');

	t.true(handleClick.calledOnce);
});
