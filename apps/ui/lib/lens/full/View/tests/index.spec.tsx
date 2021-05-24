/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
];

const types = [supportThreadType];

let context: any = {};

describe('SupportThreads lens', () => {
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

		const wrapper = shallow(
			<ViewRenderer {...commonProps} userActiveSlice={userActiveSlice} />,
		);

		expect(wrapper.state().activeSlice).toEqual(userActiveSlice);
	});

	test("Active slice is initialized to the slice specified by a custom view's filters, if set", () => {
		const { commonProps } = context;

		const wrapper = shallow(
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
				type: 'object',
				anyOf: [
					{
						$id: 'properties.data.properties.status',
						type: 'object',
						title: 'user-generated-filter',
						properties: {
							data: {
								type: 'object',
								properties: {
									status: {
										const: 'archived',
										title: 'status',
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

		const wrapper = shallow(<ViewRenderer {...commonProps} />);

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
						properties: {
							data: {
								type: 'object',
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

		const wrapper = shallow(
			<ViewRenderer
				{...commonProps}
				lenses={lenses}
				userActiveLens="lens-chart"
			/>,
		);

		expect(wrapper.state().activeLens).toBe('lens-chart');
	});
});
