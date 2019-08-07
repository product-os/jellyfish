import ava from 'ava';
import { shallow } from 'enzyme';
import * as React from 'react';
import * as sinon from 'sinon';
import { NewMessage } from '../SupportChat/SupportChat';
import { MessageTextInput } from './MessageTextInput';

ava('Should render MessageTextInput', t => {
	const handleChange = sinon.spy();

	const initialValue: NewMessage = {
		id: '',
		text: '',
		subject: '',
		attachments: [],
	};

	const wrapper = shallow(
		<MessageTextInput value={initialValue} onChange={handleChange} />,
	);

	const newText = 'foo bar';

	wrapper.simulate('change', { target: { value: newText } });

	t.is(handleChange.args[0][0].text, newText);
});
