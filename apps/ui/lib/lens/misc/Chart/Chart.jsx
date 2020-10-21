/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React, {
	useState
} from 'react'
import PlotlyEditor from 'react-chart-editor'
import 'react-chart-editor/lib/react-chart-editor.css'
import * as flatten from 'flat'
import {
	createGlobalStyle
} from 'styled-components'

// HACK: Work-around for the fact that plotly throws a fit if you run it outside
// of a browser environment.
const plotly = window.isUnitTest ? null : require('plotly.js/dist/plotly')

// The plotly styles don't render 100% correctly on JF, causing the panel
// headers to get squashed. This fixes the issue
const GlobalStyle = createGlobalStyle `
	.plotly_editor .editor_controls .fold__top {
			height: 30px;
	}
`

const config = {
	editable: true
}

export default React.memo(({
	tail
}) => {
	// Flatten all the cards into single level objects so that plotly can handle
	// the data
	const getDataSources = React.useCallback(() => {
		const flattenedData = _.map(tail, flatten)
		const combinedFlatKeys = _.uniq(_.flatMap(flattenedData, _.keys))

		const dataSources = _.mapValues(_.keyBy(combinedFlatKeys), (key) => _.map(flattenedData, key))

		const dataSourceOptions = Object.keys(dataSources).map((name) => ({
			value: name,
			label: name
		}))
		return {
			dataSources, dataSourceOptions
		}
	}, [ tail ])

	const {
		dataSources, dataSourceOptions
	} = getDataSources()

	const defaultSettings = {
		data: [
			// This config sets up a simple histogram that groups data by day, using
			// the `created_at` field.
			{
				type: 'histogram',
				mode: 'markers',
				// eslint-disable-next-line id-length
				x: dataSources.created_at,
				xsrc: 'created_at',
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
	}

	const [ settings, setSettings ] = useState(defaultSettings)

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
