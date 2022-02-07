import _ from 'lodash';
import React from 'react';
import 'react-chart-editor/lib/react-chart-editor.css';
import flatten from 'flat';
import styled, { createGlobalStyle } from 'styled-components';
import { Button, Flex, Heading } from 'rendition';
import { Icon, helpers } from '@balena/jellyfish-ui-components';
import { AutoCompleteCardSelect } from '../../../components/AutoCompleteCardSelect';
import SaveCardButton from '../../../components/SaveCardButton';

const NEW_CHART_CONFIGURATION_ID = '00000000-0000-0000-0000-000000000000';

const ChartConfigurationAutoSelect = styled(AutoCompleteCardSelect)`
	min-width: 220px;
`;

export const parseSettings = (chart) => {
	return JSON.parse(chart.data.settings);
};

export const stringifySettings = (settings) => {
	return JSON.stringify(settings, null, 2);
};

// The plotly styles don't render 100% correctly on JF, causing the panel
// headers to get squashed. This fixes the issue
const GlobalStyle = createGlobalStyle`
	.plotly_editor {
		border-top: 1px solid #eee;
	}
	.plotly_editor .editor_controls .fold__top {
			height: 30px;
	}
`;

const ViewIcon = <Icon name="eye" />;

export const Chart = React.memo<any>(
	({
		actions,
		activeLoop,
		channel,
		chartConfigurationType,
		history,
		sdk,
		tail,
		ChartComponent,
	}) => {
		// Flatten all the cards into single level objects so that plotly can handle
		// the data
		const { dataSources, dataSourceOptions, defaultChartConfiguration } =
			React.useMemo(() => {
				const flattenedData = _.map(tail, flatten);
				const combinedFlatKeys = _.uniq(_.flatMap(flattenedData, _.keys));

				const sources = _.mapValues(_.keyBy(combinedFlatKeys), (key) =>
					_.map(flattenedData, key),
				);

				const sourceOptions = Object.keys(sources).map((name) => ({
					value: name,
					label: name,
				}));

				const defaultChartConfig = {
					id: NEW_CHART_CONFIGURATION_ID,
					type: `${chartConfigurationType.slug}@${chartConfigurationType.version}`,
					name: 'New chart',
					data: {
						settings: stringifySettings({
							data: [
								// This config sets up a simple histogram that groups data by day, using
								// the `created_at` field.
								{
									type: 'histogram',
									mode: 'markers',
									// eslint-disable-next-line id-length
									x: sources.created_at,
									xsrc: 'created_at',
									xbins: {
										size: 86400000,
									},
									marker: {
										color: 'rgb(0, 174, 239)',
									},
								},
							],
							layout: {
								bargap: 0.09,
							},
							frames: [],
						}),
					},
				};

				return {
					dataSources: sources,
					dataSourceOptions: sourceOptions,
					defaultChartConfiguration: defaultChartConfig,
				};
			}, [tail]);

		const linkedToViewFilter = React.useMemo(() => {
			return {
				$$links: {
					'is attached to': {
						type: 'object',
						properties: {
							id: {
								const: channel.data.head.id,
							},
						},
					},
				},
			};
		}, [channel.data.head.id]);

		// The save count is used as the key to the AutoCompleteCardSelect.
		// We increment this value whenever a card is updated or a new card is saved,
		// triggering a refetch of the available chart configurations.
		const [saveCount, setSaveCount] = React.useState(0);
		const [isDirty, setIsDirty] = React.useState(false);
		const [selectedChart, setSelectedChart] = React.useState<any>(
			defaultChartConfiguration,
		);
		const [settings, setSettings] = React.useState(
			parseSettings(defaultChartConfiguration),
		);

		const onPlotlyEditorUpdate = React.useCallback(
			(newSettings) => {
				setSettings(newSettings);
				setIsDirty(true);
			},
			[setSettings, setIsDirty],
		);

		const onChartSaved = React.useCallback(() => {
			setIsDirty(false);
			setSaveCount(saveCount + 1);
		}, [setIsDirty, setSaveCount]);

		const onSaveAs = React.useCallback(() => {
			actions.addChannel({
				head: {
					types: chartConfigurationType,
					seed: {
						markers: channel.data.head.markers,
						loop: channel.data.head.loop || activeLoop,
						data: {
							settings: stringifySettings(settings),
						},
					},
					onDone: {
						action: 'link',
						targets: [channel.data.head],
						callback: onNewChartConfigurationSaved,
					},
				},
				format: 'create',
				canonical: false,
			});
		}, [
			actions.addChannel,
			chartConfigurationType,
			channel.data.head,
			settings,
		]);

		const onNewChartConfigurationSaved = async (chartConfigurationSummary) => {
			const chartConfiguration = await sdk.card.get(
				chartConfigurationSummary.id,
			);
			setSaveCount(saveCount + 1);
			selectChartConfiguration(chartConfiguration);
		};

		const selectChartConfiguration = React.useCallback(
			(chartConfiguration) => {
				const newChartConfiguration =
					chartConfiguration || defaultChartConfiguration;
				setSelectedChart(newChartConfiguration);
				setSettings(parseSettings(newChartConfiguration));
				setIsDirty(false);
			},
			[setSelectedChart, setSettings, setIsDirty, defaultChartConfiguration],
		);

		const openChartConfigurationChannel = React.useCallback(() => {
			history.push(helpers.appendToChannelPath(channel, selectedChart));
		}, [history, channel, selectedChart]);

		const getChartConfigurationPatch = React.useCallback(() => {
			return [
				{
					op: 'replace',
					path: '/data/settings',
					value: stringifySettings(settings),
				},
			];
		}, [settings]);

		return (
			<React.Fragment>
				<GlobalStyle />

				<Flex flexDirection="row" m={2} mb={3} alignItems="center">
					<Heading.h5 mr={2}>Chart configuration:</Heading.h5>
					<ChartConfigurationAutoSelect
						key={saveCount}
						classNamePrefix="chart-config-select"
						cardType="chart-configuration"
						value={selectedChart}
						onChange={selectChartConfiguration}
						cardFilter={linkedToViewFilter}
					/>
					<SaveCardButton
						sdk={sdk}
						card={selectedChart}
						patch={getChartConfigurationPatch}
						onDone={onChartSaved}
						disabled={
							!isDirty || selectedChart.id === NEW_CHART_CONFIGURATION_ID
						}
						ml={2}
						data-test="btn_chart-config--save"
					/>
					<Button
						disabled={!isDirty}
						onClick={onSaveAs}
						tooltip="Save current settings as a new chart configuration"
						ml={2}
						data-test="btn_chart-config--save-as"
					>
						Save as...
					</Button>
					<Button
						disabled={selectedChart.id === NEW_CHART_CONFIGURATION_ID}
						onClick={openChartConfigurationChannel}
						icon={ViewIcon}
						tooltip="View chart configuration card"
						ml={2}
						data-test="btn_chart-config--view"
					/>
				</Flex>

				<ChartComponent
					settings={settings}
					dataSources={dataSources}
					dataSourceOptions={dataSourceOptions}
					onUpdate={onPlotlyEditorUpdate}
				/>
			</React.Fragment>
		);
	},
);
