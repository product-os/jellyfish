import { withDefaults } from '../../../test/ui-setup';
import { shallow } from 'enzyme';
import sinon from 'sinon';
import React from 'react';
import { LoopSelector } from './LoopSelector';
import type { LoopContract } from '@balena/jellyfish-types/build/core';

const sandbox = sinon.createSandbox();

const loop1 = withDefaults({
	type: 'loop@1.0.0',
	slug: 'loop-1',
	name: 'Loop 1',
	data: {},
});

const loop2 = withDefaults({
	type: 'loop@1.0.0',
	slug: 'loop-2',
	name: 'Loop 2',
	data: {},
});

describe('LoopSelector', () => {
	const loops: LoopContract[] = [loop1, loop2];
	const onSetLoop = sandbox.stub();

	afterEach(() => {
		sandbox.reset();
	});

	it('displays the loop options', () => {
		const component = shallow(
			<LoopSelector onSetLoop={onSetLoop} loops={loops} activeLoop="" />,
		);
		const select = component.find('#loopselector__select');
		expect(select.prop('options')).toEqual([
			{
				name: 'All loops',
				slug: null,
			},
			...loops,
		]);
	});

	it('defaults to "All loops" if no activeLoop is specified', () => {
		const component = shallow(
			<LoopSelector onSetLoop={onSetLoop} loops={loops} activeLoop="" />,
		);
		const select = component.find('#loopselector__select');
		expect(select.prop('value')).toEqual({
			name: 'All loops',
			slug: null,
		});
	});

	it('defaults to the activeLoop if specified', () => {
		const component = shallow(
			<LoopSelector
				onSetLoop={onSetLoop}
				loops={loops}
				activeLoop={`${loop1.slug}@${loop1.version}`}
			/>,
		);
		const select: any = component.find('#loopselector__select');
		expect(select.prop('value').slug).toBe(loop1.slug);
	});

	it('calls onSetLoop when a loop is selected', () => {
		const component = shallow(
			<LoopSelector onSetLoop={onSetLoop} loops={loops} activeLoop="" />,
		);
		const select: any = component.find('#loopselector__select');
		select.prop('onChange')({ value: loop1 });
		expect(onSetLoop.calledOnce).toBe(true);
		expect(onSetLoop.getCall(0).firstArg).toBe(
			`${loop1.slug}@${loop1.version}`,
		);
	});
});
