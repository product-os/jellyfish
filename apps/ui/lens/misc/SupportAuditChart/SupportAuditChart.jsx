/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import * as moment from 'moment'
import * as React from 'react'
import {
	Bar
} from 'react-chartjs-2'
import {
	Box
} from 'rendition'
import Column from '@jellyfish/ui-components/shame/Column'
import {
	colorHash
} from '@jellyfish/ui-components/services/helpers'

const processDataSets = (items = []) => {
	// Create a range of dates over the last 30 days, starting from 30 days ago
	// and finishing on today
	const range = _.range(29, -1).map((timeAgo) => {
		return moment().subtract(timeAgo, 'day')
	})

	// Group the items by inbox
	const inboxes = _.groupBy(items, 'data.inbox')

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

	return {
		labels: range.map((time) => {
			return time.format('MMM Do')
		}),
		datasets: sets
	}
}

export default React.memo((props) => {
	const data = processDataSets(props.tail)

	const total = _.reduce(data.datasets, (carry, set) => {
		return carry + _.sum(set.data)
	}, 0)

	const chartOptions = {
		title: {
			display: true,
			text: `Support threads created over the last 30 days (${total} total)`
		},
		scales: {
			xAxes: [
				{
					stacked: true
				}
			],
			yAxes: [
				{
					stacked: true
				}
			]
		}
	}

	return (
		<Column overflowY flex="1">
			<Box p={3}>
				<Bar
					data={data}
					options={chartOptions}
				/>
			</Box>
		</Column>
	)
})
