/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import moment from 'moment'
import React from 'react'
import Plot from 'react-plotly.js'
import Column from '@balena/jellyfish-ui-components/lib/shame/Column'
import {
	colorHash
} from '@balena/jellyfish-ui-components/lib/services/helpers'

/* eslint-disable id-length */

const chartStyle = {
	width: '100%',
	height: '100%'
}

const chartConfig = {
	displayModeBar: false
}

const dates = _.range(29, -1)

const SupportAuditChart = ({
	tail
}) => {
	const processDataSets = React.useCallback(() => {
		// Create a range of dates over the last 30 days, starting from 30 days ago
		// and finishing on today
		const range = dates.map((timeAgo) => {
			return moment().subtract(timeAgo, 'day')
		})

		// Group the items by inbox
		const inboxes = _.groupBy(tail, 'data.inbox')

		const sets = _.map(inboxes, (sourceData, inbox) => {
			const set = {
				label: inbox,
				backgroundColor: colorHash(inbox),
				data: []
			}

			const groups = _.groupBy(sourceData, (item) => {
				return item.created_at.slice(0, 10)
			})

			// For each day of the last 30 days, count the number of threads created on
			// that day
			for (const day of range) {
				const dayStamp = day.format('YYYY-MM-DD')

				set.data.push(_.has(groups, dayStamp) ? groups[dayStamp].length : 0)
			}

			return set
		})

		const baseTrace = {
			x: range.map((time) => {
				return time.format('MMM Do')
			}),
			type: 'bar'
		}

		return sets.map((set) => ({
			...baseTrace,
			name: set.label,
			y: set.data,
			marker: {
				color: set.backgroundColor
			}
		}))
	}, [ tail ])

	const data = processDataSets()

	const getTotal = React.useCallback(() => {
		return _.reduce(data, (carry, trace) => {
			return carry + _.sum(trace.y)
		}, 0)
	}, [ data ])

	return (
		<Column flex="1" p={3}>
			<Plot
				data={data}
				config={chartConfig}
				style={chartStyle}
				useResizeHandler
				layout={{
					title: `Support threads created over the last 30 days (${getTotal()} total)`,
					barmode: 'stack',
					autosize: true,
					legend: {
						x: 0.5,
						xanchor: 'auto',
						y: 1.08,
						orientation: 'h',
						traceorder: 'normal'
					}
				}}
			/>
		</Column>
	)
}

export default React.memo(SupportAuditChart)
