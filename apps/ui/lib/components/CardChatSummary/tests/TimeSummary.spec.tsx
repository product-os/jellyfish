import '../../../../test/ui-setup';
import { shallow } from 'enzyme';
import React from 'react';
import sub from 'date-fns/sub';
import { TimeSummary } from '../TimeSummary';

const prefix = 'Created';
const timestamp = sub(new Date(), {
	days: 2,
}).toISOString();
const iconName = 'history';

test('TimeSummary displays the icon, tooltip and timeago text', () => {
	const component = shallow(
		<TimeSummary prefix={prefix} timestamp={timestamp} iconName={iconName} />,
	);

	const wrapper: any = component.find('Flex');
	expect(wrapper.props().tooltip).toBe('Created 2 days ago');

	const icon = component.find('Icon');
	expect(icon.props().name).toBe(iconName);

	const txt = component.find('Styled(Txt)');
	expect(txt.text()).toBe('2 days');
});
