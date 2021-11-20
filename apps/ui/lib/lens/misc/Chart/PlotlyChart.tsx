import React from 'react';
import _ from 'lodash';

// tslint:disable: no-var-requires
// HACK: Work-around for the fact that plotly throws a fit if you run it outside
// of a browser environment.
const plotly = (window as any).isUnitTest
	? null
	: require('plotly.js/dist/plotly');
const PlotlyEditor = (window as any).isUnitTest
	? _.constant(null)
	: require('react-chart-editor').default;

const config = {
	editable: true,
};

export default React.memo<any>(
	({ settings, dataSources, dataSourceOptions, onUpdate }) => {
		const onPlotlyUpdate = React.useCallback(
			(data, layout, frames) => {
				onUpdate({
					data,
					layout,
					frames,
				});
			},
			[onUpdate],
		);
		return (
			<PlotlyEditor
				{...settings}
				config={config}
				dataSources={dataSources}
				dataSourceOptions={dataSourceOptions}
				plotly={plotly}
				onUpdate={onPlotlyUpdate}
				useResizeHandler
				debug
				advancedTraceTypeSelector
			/>
		);
	},
);
