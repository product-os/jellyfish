import '../../../../../test/ui-setup';
import _ from 'lodash';
import sinon from 'sinon';
import { shallow } from 'enzyme';
import React from 'react';
import { ViewRenderer } from '..';
import {
	paidSupport,
	archivedPaidSupport,
	supportThreadType,
} from './fixtures';

const sandbox = sinon.createSandbox();

const user = {
	id: 'u1',
	slug: 'user-1',
	data: {
		profile: {},
	},
};

const lenses = [
	{
		slug: 'lens-chart',
		data: {
			renderer: _.constant(null),
		},
	},
	{
		slug: 'lens-support-threads',
		data: {
			renderer: _.constant(null),
		},
	},
	{
		slug: 'lens-kanban',
		data: {
			supportsSlices: true,
			renderer: _.constant(null),
		},
	},
];

const types = [supportThreadType];

let context: any = {};

describe('View lens', () => {
	beforeEach(() => {
		context = {
			commonProps: {
				channel: paidSupport,
				user,
				types,
				actions: {
					clearViewData: sandbox.stub(),
					loadViewData: sandbox.stub(),
					loadMoreViewData: sandbox.stub(),
					setViewData: sandbox.stub(),
					setViewLens: sandbox.stub(),
					setViewSlice: sandbox.stub(),
				},
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test("Active slice is initialized to the user's view slice, if set", () => {
		const { commonProps } = context;

		const userActiveSlice = {
			title: 'Status: archived',
			value: {
				path: 'properties.data.properties.status',
				value: 'archived',
			},
		};

		const wrapper = shallow<ViewRenderer>(
			<ViewRenderer {...commonProps} userActiveSlice={userActiveSlice} />,
		);

		expect(wrapper.state().activeSlice).toEqual(userActiveSlice);
	});

	test("Active slice is initialized to the slice specified by a custom view's filters, if set", () => {
		const { commonProps } = context;

		const wrapper = shallow<ViewRenderer>(
			<ViewRenderer {...commonProps} channel={archivedPaidSupport} />,
		);

		expect(wrapper.state().activeSlice).toEqual({
			title: 'Status: archived',
			value: {
				path: 'properties.data.properties.status',
				value: 'archived',
			},
		});

		expect(wrapper.state().filters).toEqual([
			{
				$id: 'properties.data.properties.status',
				anyOf: [
					{
						$id: 'properties.data.properties.status',
						type: 'object',
						title: 'user-generated-filter',
						required: ['data'],
						properties: {
							data: {
								type: 'object',
								required: ['status'],
								properties: {
									status: {
										const: 'archived',
									},
								},
							},
						},
						description: 'Status: archived',
					},
				],
			},
		]);
	});

	test('Active slice is initialized to the first slice option if not set in user profile or view filter', () => {
		const { commonProps } = context;

		const wrapper = shallow<ViewRenderer>(<ViewRenderer {...commonProps} />);

		expect(wrapper.state().activeSlice).toEqual({
			title: 'Status: open',
			value: {
				path: 'properties.data.properties.status',
				value: 'open',
			},
		});

		expect(wrapper.state().filters).toEqual([
			{
				$id: 'properties.data.properties.status',
				anyOf: [
					{
						$id: 'properties.data.properties.status',
						type: 'object',
						title: 'user-generated-filter',
						required: ['data'],
						properties: {
							data: {
								type: 'object',
								required: ['status'],
								properties: {
									status: {
										const: 'open',
									},
								},
							},
						},
						description: 'Status: open',
					},
				],
			},
		]);
	});

	test("Active lens is initialized to the user's active lens for that view, if set", () => {
		const { commonProps } = context;

		const wrapper = shallow<ViewRenderer>(
			<ViewRenderer
				{...commonProps}
				lenses={lenses}
				userActiveLens="lens-chart"
			/>,
		);

		expect(wrapper.state().activeLens).toBe('lens-chart');
	});

	test('Slice filter is ignored if lens supports slices', () => {
		const { commonProps } = context;

		// First load with a lens that does *not* support slices
		let wrapper = shallow<ViewRenderer>(
			<ViewRenderer
				{...commonProps}
				lenses={lenses}
				userActiveLens="lens-chart"
			/>,
		);

		expect(wrapper.state().activeLens).toBe('lens-chart');
		let filters = wrapper.state().filters;
		let sliceFilter = filters.find((filter) => {
			return (
				_.get(filter, ['anyOf', 0, '$id']) ===
				'properties.data.properties.status'
			);
		});
		// An active slice filter is set
		expect(sliceFilter).not.toBeUndefined();

		// Now load with a lens that *does* support slices
		wrapper = shallow(
			<ViewRenderer
				{...commonProps}
				lenses={lenses}
				userActiveLens="lens-kanban"
			/>,
		);

		expect(wrapper.state().activeLens).toBe('lens-kanban');
		filters = wrapper.state().filters;
		sliceFilter = filters.find((filter) => {
			return (
				_.get(filter, ['anyOf', 0, '$id']) ===
				'properties.data.properties.status'
			);
		});
		// A slice filter is *not* set
		expect(sliceFilter).toBeUndefined();
	});
});
