/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	getWrapper,
	flushPromises
} from '../../../../test/ui-setup'
import _ from 'lodash'
import React from 'react'
import ava from 'ava'
import {
	mount
} from 'enzyme'
import sinon from 'sinon'
import {
	SetupProvider
} from '@balena/jellyfish-ui-components'
import {
	Chart,
	stringifySettings
} from './Chart'

const channel = {
	data: {
		target: 'view-all-cards',
		head: {
			id: '1'
		}
	}
}

const card = {
	id: 2,
	slug: 'c-2',
	type: 'card@1.0.0'
}

const newSettings = {
	data: 'data'
}

const newChartConfigCard = {
	id: 'c-1',
	slug: 'chart-configuration-1',
	name: 'New test config',
	data: {
		settings: stringifySettings(newSettings)
	}
}

const {
	wrapper: Wrapper
} = getWrapper({
	core: {}
})

const wrapperWithSetup = ({
	children,
	sdk,
	analytics
}) => {
	return (
		<Wrapper>
			<SetupProvider sdk={sdk} analytics={analytics}>
				{ children }
			</SetupProvider>
		</Wrapper>
	)
}

const sandbox = sinon.createSandbox()

const addChannel = (options) => {
	options.head.onDone.callback(_.omit(newChartConfigCard, 'data'))
}

const mountChart = async (commonProps) => {
	const component = await mount(<Chart {...commonProps} />, {
		wrappingComponent: wrapperWithSetup,
		wrappingComponentProps: {
			sdk: commonProps.sdk,
			analytics: {
				track: sandbox.stub()
			}
		}
	})
	await flushPromises()
	return component
}

const selectText = (chart) => chart.find('div.chart-config-select__single-value').text()
const saveButton = (chart) => chart.find('button[data-test="btn_chart-config--save"]')
const saveAsButton = (chart) => chart.find('button[data-test="btn_chart-config--save-as"]')
const viewButton = (chart) => chart.find('button[data-test="btn_chart-config--view"]')

ava.beforeEach((test) => {
	test.context.commonProps = {
		ChartComponent: () => <div data-test="chart-component">Chart</div>,
		channel,
		chartConfigurationType: {
			id: 't-1',
			slug: 'chart-configuration',
			type: 'type@1.0.0'
		},
		actions: {
			addChannel: sandbox.spy(addChannel)
		},
		history: {
			push: sandbox.fake()
		},
		sdk: {
			card: {
				update: sandbox.stub().resolves(newChartConfigCard),
				get: sandbox.stub().resolves(newChartConfigCard)
			}
		},
		tail: [ card ]
	}
})

ava.afterEach(() => {
	sandbox.restore()
})

ava('Default chart configuration is loaded initially', async (test) => {
	const {
		commonProps
	} = test.context

	const chart = await mountChart(commonProps)

	test.is(selectText(chart), 'New chart')
	test.true(saveButton(chart).prop('disabled'))
	test.true(saveAsButton(chart).prop('disabled'))
	test.true(viewButton(chart).prop('disabled'))
})

ava('Changes to the default chart configuration can be saved as a new chart configuration', async (test) => {
	const {
		commonProps
	} = test.context

	commonProps.sdk.card.get = sandbox.stub().returns(newChartConfigCard)

	const chart = await mountChart(commonProps)

	// Simulate an update to the chart settings
	const chartComponent = chart.find('ChartComponent')
	chartComponent.prop('onUpdate')(newSettings)
	chart.update()

	// The Save button is still disabled as this is a new chart configuration
	test.true(chart.find('button[data-test="btn_chart-config--save"]').prop('disabled'))

	// ...but the Save As button is now enabled - so click it!
	test.false(saveAsButton(chart).prop('disabled'))
	saveAsButton(chart).simulate('click')

	// A new channel should be added, with the settings in the seed data.
	test.true(commonProps.actions.addChannel.calledOnce)
	const options = commonProps.actions.addChannel.getCall(0).firstArg
	test.is(options.head.seed.data.settings, stringifySettings(newSettings))

	// (Our simulated addChannel method immediately calls the onDone callback with
	// a 'newly created' chart-configuration card)

	await flushPromises()
	chart.update()

	// The newly saved chart is now the selected one
	test.is(selectText(chart), newChartConfigCard.name)

	// ...and the Save As button is now disabled again
	test.true(saveAsButton(chart).prop('disabled'))

	// ...and the View button is now enabled as we have a valid chart-configuration card we can view
	test.false(viewButton(chart).prop('disabled'))
})

ava('Clicking on the view button loads the current chart-configuration\'s card in a new channel', async (test) => {
	const {
		commonProps
	} = test.context

	const chart = await mountChart(commonProps)

	chart.find('AutoCompleteCardSelect').prop('onChange')(newChartConfigCard)
	chart.update()

	test.false(viewButton(chart).prop('disabled'))
	viewButton(chart).simulate('click')

	test.true(commonProps.history.push.calledOnce)
	const newLocation = commonProps.history.push.getCall(0).firstArg
	test.true(newLocation.endsWith(`/${newChartConfigCard.slug}`))
})

ava('Clicking on the save button saves the current chart-configuration\'s card', async (test) => {
	const {
		commonProps
	} = test.context

	const chart = await mountChart(commonProps)

	// Load a chart-configuration and Simulate an update to the chart settings
	chart.find('AutoCompleteCardSelect').prop('onChange')(newChartConfigCard)
	chart.find('ChartComponent').prop('onUpdate')(newSettings)
	chart.update()

	// The Save button is now enabled - so click it!
	test.false(saveButton(chart).prop('disabled'))
	saveButton(chart).simulate('click')

	// The data.settings field of the chart-configuration card is updated via the SDK
	test.true(commonProps.sdk.card.update.calledOnce)
	const patch = commonProps.sdk.card.update.getCall(0).args[2][0]
	test.deepEqual(patch, {
		op: 'replace',
		path: '/data/settings',
		value: stringifySettings(newSettings)
	})
})
