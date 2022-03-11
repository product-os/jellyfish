import { getWrapper } from '../../test/ui-setup';
import { mount } from 'enzyme';
import { Txt } from 'rendition';
import React from 'react';
import Collapsible from './Collapsible';

const wrappingComponent = getWrapper().wrapper;

const Content = () => {
	return <Txt data-test="test-content">Content</Txt>;
};

const mountCollapsible = (props: any) => {
	return mount(
		<Collapsible title="Test" {...props}>
			<Content />
		</Collapsible>,
		{
			wrappingComponent,
		},
	);
};

test("Collapsible doesn't render content if collapsed and lazyLoadContent is set", async () => {
	const component = await mountCollapsible({
		lazyLoadContent: true,
	});
	const content = component.find('Txt[data-test="test-content"]');
	expect(content.length).toBe(0);
});

test('Collapsible renders (hidden) content if collapsed and lazyLoadContent is false', async () => {
	const component = await mountCollapsible({
		lazyLoadContent: false,
	});
	const content = component.find('Txt[data-test="test-content"]');
	expect(content.length).toBe(1);
});

test('Collapsible renders content if not collapsed', async () => {
	const component = await mountCollapsible({
		defaultCollapsed: false,
	});
	const content = component.find('Txt[data-test="test-content"]');
	expect(content.length).toBe(1);
});

test('Collapsible header is not displayed if collapsible prop is false', async () => {
	const component = await mountCollapsible({
		collapsible: false,
	});
	const header = component.find(
		'CollapsibleHeader[data-test="collapsible__header"]',
	);
	expect(header.length).toBe(0);
});
