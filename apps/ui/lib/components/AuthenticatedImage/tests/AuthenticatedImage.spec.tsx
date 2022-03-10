import { getWrapper, flushPromises } from '../../../../test/ui-setup';
import { mount } from 'enzyme';
import React from 'react';
import sinon from 'sinon';
import AuthenticatedImage from '../index';
import Icon from '../../Icon';

const { wrapper } = getWrapper();

const sandbox = sinon.createSandbox();
let context: any = {};

beforeEach(() => {
	const imageSrc = 'https://jel.ly.fish/icons/jellyfish.svg';
	const createObjectURL = sandbox.stub();
	createObjectURL.returns(imageSrc);
	global.URL.createObjectURL = createObjectURL;

	const getFile = sandbox.stub();
	getFile.resolves();

	const openFile = sandbox.stub();
	openFile.resolves();
	global.window.open = openFile;

	context = {
		...context,
		imageSrc,
		sdk: {
			getFile,
		},
	};
});

afterEach(() => {
	sandbox.restore();
});

test('Renders the spinning icon when the image has not loaded', () => {
	const { sdk } = context;

	const component = mount(
		<AuthenticatedImage
			// @ts-ignore
			sdk={sdk}
		/>,
		{
			wrappingComponent: wrapper,
		},
	);
	const icon = component.find(Icon);
	expect(icon.prop('name')).toBe('cog');
	expect(icon.prop('spin')).toBe(true);
});

test('An error message is rendered when the getFile commands returns an error', async () => {
	const { sdk } = context;

	sdk.getFile.rejects(new Error('Could not retrieve image'));

	const component = mount(
		<AuthenticatedImage
			// @ts-ignore
			sdk={sdk}
			data-test="generic-error-message"
		/>,
		{
			wrappingComponent: wrapper,
		},
	);
	await flushPromises();
	component.update();

	const genericMessage = component.find(
		'span[data-test="generic-error-message"]',
	);
	expect(genericMessage.text()).toBe('An error occurred whilst loading image');
});

test('Renders the image returned by the sdk.getFile function', async () => {
	const { imageSrc, sdk } = context;
	const component = mount(
		<AuthenticatedImage
			// @ts-ignore
			sdk={sdk}
		/>,
		{
			wrappingComponent: wrapper,
		},
	);
	await flushPromises();
	component.update();

	const img = component.find('img');
	expect(img.length).toBe(1);
	expect(img.prop('src')).toBe(imageSrc);
});
