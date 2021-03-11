/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'

// HACK: Work-around for the fact that plotly throws a fit if you run it outside
// of a browser environment.
const plotly = window.isUnitTest ? null : require('plotly.js/dist/plotly')
const PlotlyEditor = window.isUnitTest ? _.constant(null) : require('react-chart-editor').default

const config = {
	editable: true
}

export default React.memo(({
	settings,
	dataSources,
	dataSourceOptions,
	onUpdate
}) => {
	const onPlotlyUpdate = React.useCallback((data, layout, frames) => {
		onUpdate({
			data, layout, frames
		})
	}, [ onUpdate ])
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
	)
})
