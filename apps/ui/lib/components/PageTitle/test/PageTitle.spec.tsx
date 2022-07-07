import '../../../../test/ui-setup';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import PageTitle from '../PageTitle';
import ViewAllIssues from './fixtures/view-all-issues';
import SupportThread from './fixtures/support-thread';
import ViewAllIssuesLoading from './fixtures/view-all-issues-loading';

const sandbox = sinon.createSandbox();

describe('PageTitle', () => {
	afterEach(async () => {
		sandbox.restore();
	});

	test("displays 'Jellyfish' if only the home channel is displayed", async () => {
		const component = shallow(
			<PageTitle siteName="Jellyfish" activeChannel={null} unreadCount={0} />,
		);
		const title = component.find('title');
		expect(title.text()).toBe('Jellyfish');
	});

	test('displays unread message count', async () => {
		const component = shallow(
			<PageTitle siteName="Jellyfish" activeChannel={null} unreadCount={3} />,
		);
		const title = component.find('title');
		expect(title.text()).toBe('(3) | Jellyfish');
	});

	test('displays channel card name if set', async () => {
		const component = shallow(
			<PageTitle
				siteName="Jellyfish"
				activeChannel={ViewAllIssues}
				unreadCount={0}
			/>,
		);
		const title = component.find('title');
		expect(title.text()).toBe('All GitHub issues | Jellyfish');
	});

	test('displays channel card slug if name not set', async () => {
		const component = shallow(
			<PageTitle
				siteName="Jellyfish"
				activeChannel={SupportThread}
				unreadCount={0}
			/>,
		);
		const title = component.find('title');
		expect(title.text()).toBe('support-thread-b98847cc-a80... | Jellyfish');
	});

	test('displays channel target if card not set', async () => {
		const component = shallow(
			<PageTitle
				siteName="Jellyfish"
				activeChannel={ViewAllIssuesLoading}
				unreadCount={0}
			/>,
		);
		const title = component.find('title');
		expect(title.text()).toBe('view-all-issues | Jellyfish');
	});

	test('displays unread message count and channel details', async () => {
		const component = shallow(
			<PageTitle
				siteName="Jellyfish"
				activeChannel={ViewAllIssues}
				unreadCount={3}
			/>,
		);
		const title = component.find('title');
		expect(title.text()).toBe('(3) All GitHub issues | Jellyfish');
	});
});
