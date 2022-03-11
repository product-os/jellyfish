import { getWrapper } from '../../../test/ui-setup';
import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { Link } from './Link';
import { getLinkProps } from './index';

const sandbox = sinon.createSandbox();

const wrappingComponent = getWrapper().wrapper;

afterEach(() => {
	sandbox.restore();
});

test('getLinkProps populates append for relative URLs', () => {
	expect(getLinkProps('/test?a=b')).toEqual({
		append: 'test?a=b',
	});
});

test('getLinkProps populates append for local URLs', () => {
	expect(getLinkProps(`https://${window.location.host}/test?a=b`)).toEqual({
		append: 'test?a=b',
	});
});

test('getLinkProps populates to and blank for external URLs', () => {
	expect(getLinkProps('https://other.com/test?a=b')).toEqual({
		to: 'https://other.com/test?a=b',
		blank: true,
	});
});

test('Link calls history.push when blank prop is not set', async () => {
	const history = {
		push: sandbox.stub(),
	};
	const component = await mount(
		<Link
			// @ts-ignore
			history={history}
			blank={false}
			to="http://google.com"
		/>,
		{
			wrappingComponent,
		},
	);

	component.simulate('click');

	expect(history.push.calledOnce).toBe(true);
	expect(history.push.getCall(0).args[0]).toBe('http://google.com');
});

test('Link does not call history.push when blank prop is set', async () => {
	const history = {
		push: sandbox.stub(),
	};
	const component = await mount(
		<Link
			// @ts-ignore
			history={history}
			blank
			to="http://google.com"
		/>,
		{
			wrappingComponent,
		},
	);

	component.simulate('click');

	expect(history.push.notCalled).toBe(true);
});
