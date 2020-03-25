/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React, {
	useState
} from 'react'
import plotly from 'plotly.js/dist/plotly'
import PlotlyEditor from 'react-chart-editor'
import 'react-chart-editor/lib/react-chart-editor.css'
import * as flatten from 'flat'
import {
	createGlobalStyle
} from 'styled-components'

// The plotly styles don't render 100% correctly on JF, causing the panel
// headers to get squashed. This fixes the issue
const GlobalStyle = createGlobalStyle `
	.plotly_editor .editor_controls .fold__top {
			height: 30px;
	}
`

export default React.memo((props) => {
	// Flatten all the cards into single level objects so that plotly can handle
	// the data
	const flattenedData = _.map(props.tail, flatten)
	const combinedFlatKeys = _.uniq(_.flatMap(flattenedData, _.keys))

	const dataSources = _.mapValues(_.keyBy(combinedFlatKeys), (key) => _.map(flattenedData, key))

	const dataSourceOptions = Object.keys(dataSources).map((name) => ({
		value: name,
		label: name
	}))

	const [ settings, setSettings ] = useState({
		data: [
			// This config sets up a simple histogram that groups data by day, using
			// the `created_at` field.
			{
				type: 'histogram',
				mode: 'markers',
				xsrc: 'created_at',
				// eslint-disable-next-line
				x: dataSources.created_at,
				xbins: {
					size: 86400000
				},
				marker: {
					color: 'rgb(0, 174, 239)'
				}
			}
		],
		layout: {
			bargap: 0.09
		},
		frames: []
	})

	const config = {
		editable: true
	}

	return (
		<React.Fragment>
			<GlobalStyle />

			<PlotlyEditor
				data={settings.data}
				layout={settings.layout}
				config={config}
				frames={settings.frame}
				dataSources={dataSources}
				dataSourceOptions={dataSourceOptions}
				plotly={plotly}
				onUpdate={(data, layout, frames) => {
					console.log({
						data, layout, frames
					})
					setSettings({
						data,
						layout,
						frames
					})
				}}
				useResizeHandler
				debug
				advancedTraceTypeSelector
			/>
		</React.Fragment>
	)
})
