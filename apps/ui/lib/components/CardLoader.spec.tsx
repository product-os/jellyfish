import { getWrapper } from '../../test/ui-setup';
import React from 'react';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { CardLoader } from './CardLoader';

const sandbox = sinon.createSandbox();

const testCard = {
	id: '1',
	type: 'user',
	version: '1.0.0',
	slug: 'user-test',
};

const getWrappingComponent = (card: any) => {
	return getWrapper(
		{},
		{
			getCard: sandbox.stub().resolves(card),
			selectCard: sandbox.stub().returns(sandbox.stub().returns(card)),
		},
	).wrapper;
};

afterEach(() => {
	sandbox.restore();
});

test('CardLoader children must be a function', async () => {
	expect(() => {
		mount(
			<CardLoader id="1" type="user" card={null} withLinks={['is member of']}>
				{/* @ts-ignore */}
				<div>Test</div>
			</CardLoader>,
			{
				wrappingComponent: getWrappingComponent(testCard),
			},
		);
	}).toThrow();
});

test('CardLoader passes card to its child function', async () => {
	const children = sinon.fake.returns(<div>Test</div>);
	await mount(
		<CardLoader
			id={testCard.id}
			type={testCard.type}
			withLinks={['is member of']}
		>
			{children}
		</CardLoader>,
		{
			wrappingComponent: getWrappingComponent(testCard),
		},
	);
	expect(children.callCount).toBe(1);
	expect(children.getCall(0).args[0]).toBe(testCard);
});

test('CardLoader calls getCard callback if card prop is null', async () => {
	const children = sinon.fake.returns(<div>Test</div>);
	const getCard = sandbox.stub().resolves(null);
	await mount(
		<CardLoader
			id={testCard.id}
			type={testCard.type}
			withLinks={['is member of']}
		>
			{children}
		</CardLoader>,
		{
			wrappingComponent: getWrapper(
				{},
				{
					getCard,
					selectCard: sandbox.stub().returns(sandbox.stub().returns(null)),
				},
			).wrapper,
		},
	);
	expect(getCard.callCount).toBe(1);
	expect(getCard.getCall(0).args).toEqual([
		testCard.id,
		testCard.type,
		['is member of'],
	]);
});
