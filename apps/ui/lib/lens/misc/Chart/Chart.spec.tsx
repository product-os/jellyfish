import { getWrapper, flushPromises } from '../../../../test/ui-setup';
import _ from 'lodash';
import React from 'react';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { SetupProvider } from '@balena/jellyfish-ui-components';
import { strict as assert } from 'assert';
import { Chart, stringifySettings } from './Chart';

const channel = {
	data: {
		target: 'view-all-cards',
		head: {
			id: '1',
		},
	},
};

const card = {
	id: 2,
	slug: 'c-2',
	type: 'card@1.0.0',
};

const newSettings = {
	data: 'data',
};

const newChartConfigCard = {
	id: 'c-1',
	slug: 'chart-configuration-1',
	name: 'New test config',
	data: {
		settings: stringifySettings(newSettings),
	},
};

const { wrapper: Wrapper } = getWrapper({
	core: {},
});

const wrapperWithSetup = ({ children, sdk, analytics }) => {
	return (
		<Wrapper>
			{/* @ts-ignore: TS-TODO - add missing props to SetupProvider test instance */}
			<SetupProvider sdk={sdk} analytics={analytics}>
				{children}
			</SetupProvider>
		</Wrapper>
	);
};

const sandbox = sinon.createSandbox();

const addChannel = (options) => {
	options.head.onDone.callback(_.omit(newChartConfigCard, 'data'));
};

const mountChart = async (commonProps) => {
	const component = await mount<typeof Chart>(<Chart {...commonProps} />, {
		wrappingComponent: wrapperWithSetup,
		wrappingComponentProps: {
			sdk: commonProps.sdk,
			analytics: {
				track: sandbox.stub(),
			},
		},
	});
	await flushPromises();
	return component;
};

const selectText = (chart) =>
	chart.find('div.chart-config-select__single-value').text();
const saveButton = (chart) =>
	chart.find('button[data-test="btn_chart-config--save"]');
const saveAsButton = (chart) =>
	chart.find('button[data-test="btn_chart-config--save-as"]');
const viewButton = (chart) =>
	chart.find('button[data-test="btn_chart-config--view"]');

let context: any = {};

describe('Chart lens', () => {
	beforeEach(() => {
		context = {
			commonProps: {
				ChartComponent: () => <div data-test="chart-component">Chart</div>,
				channel,
				chartConfigurationType: {
					id: 't-1',
					slug: 'chart-configuration',
					type: 'type@1.0.0',
				},
				actions: {
					addChannel: sandbox.spy(addChannel),
				},
				history: {
					push: sandbox.fake(),
				},
				sdk: {
					card: {
						update: sandbox.stub().resolves(newChartConfigCard),
						get: sandbox.stub().resolves(newChartConfigCard),
					},
				},
				tail: [card],
			},
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	test('Default chart configuration is loaded initially', async () => {
		const { commonProps } = context;

		const chart = await mountChart(commonProps);

		expect(selectText(chart)).toBe('New chart');
		expect(saveButton(chart).prop('disabled')).toBe(true);
		expect(saveAsButton(chart).prop('disabled')).toBe(true);
		expect(viewButton(chart).prop('disabled')).toBe(true);
	});

	test('Changes to the default chart configuration can be saved as a new chart configuration', async () => {
		const { commonProps } = context;

		commonProps.sdk.card.get = sandbox.stub().returns(newChartConfigCard);

		const chart = await mountChart(commonProps);

		// Simulate an update to the chart settings
		const chartComponent = chart.find('ChartComponent');
		const updateFn: any = chartComponent.prop('onUpdate');

		updateFn(newSettings);
		chart.update();

		// The Save button is still disabled as this is a new chart configuration
		expect(
			chart.find('button[data-test="btn_chart-config--save"]').prop('disabled'),
		).toBe(true);

		// ...but the Save As button is now enabled - so click it!
		expect(saveAsButton(chart).prop('disabled')).toBe(false);
		saveAsButton(chart).simulate('click');

		// A new channel should be added, with the settings in the seed data.
		expect(commonProps.actions.addChannel.calledOnce).toBe(true);
		const options = commonProps.actions.addChannel.getCall(0).firstArg;
		expect(options.head.seed.data.settings).toBe(
			stringifySettings(newSettings),
		);

		// (Our simulated addChannel method immediately calls the onDone callback with
		// a 'newly created' chart-configuration card)

		await flushPromises();
		chart.update();

		// The newly saved chart is now the selected one
		expect(selectText(chart)).toBe(newChartConfigCard.name);

		// ...and the Save As button is now disabled again
		expect(saveAsButton(chart).prop('disabled')).toBe(true);

		// ...and the View button is now enabled as we have a valid chart-configuration card we can view
		expect(viewButton(chart).prop('disabled')).toBe(false);
	});

	test("Clicking on the view button loads the current chart-configuration's card in a new channel", async () => {
		const { commonProps } = context;

		const chart = await mountChart(commonProps);

		const select = chart.find('AutoCompleteCardSelect');
		assert(select);
		(select.prop('onChange') as any)(newChartConfigCard);
		chart.update();

		expect(viewButton(chart).prop('disabled')).toBe(false);
		viewButton(chart).simulate('click');

		expect(commonProps.history.push.calledOnce).toBe(true);
		const newLocation = commonProps.history.push.getCall(0).firstArg;
		expect(newLocation.endsWith(`/${newChartConfigCard.slug}`)).toBe(true);
	});

	test("Clicking on the save button saves the current chart-configuration's card", async () => {
		const { commonProps } = context;

		const chart = await mountChart(commonProps);

		// Load a chart-configuration and Simulate an update to the chart settings
		const select = chart.find('AutoCompleteCardSelect');
		assert(select);
		(select.prop('onChange') as any)(newChartConfigCard);

		const component = chart.find('ChartComponent');
		assert(component);
		(component.prop('onUpdate') as any)(newSettings);
		chart.update();

		// The Save button is now enabled - so click it!
		expect(saveButton(chart).prop('disabled')).toBe(false);
		saveButton(chart).simulate('click');

		// The data.settings field of the chart-configuration card is updated via the SDK
		expect(commonProps.sdk.card.update.calledOnce).toBe(true);
		const patch = commonProps.sdk.card.update.getCall(0).args[2][0];
		expect(patch).toEqual({
			op: 'replace',
			path: '/data/settings',
			value: stringifySettings(newSettings),
		});
	});
});
