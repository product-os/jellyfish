/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box
} from 'rendition'
import Icon from '../../../../../lib/ui-components/shame/Icon'

const sortTail = (tail, options) => {
	if (!tail) {
		return null
	}
	const sortedTail = _.sortBy(tail, options.sortBy)
	if (options.sortDir) {
		return sortedTail.reverse()
	}
	return sortedTail
}

export default class Content extends React.Component {
	render () {
		const {
			lens,
			activeLens,
			tail,
			channel,
			getQueryOptions,
			tailType,
			setPage,
			pageOptions
		} = this.props
		const options = getQueryOptions(activeLens)
		const sortedTail = sortTail(tail, options)

		return (
			<React.Fragment>
				{!sortedTail && (
					<Box p={3}>
						<Icon spin name="cog"/>
					</Box>
				)}
				{Boolean(tail) && Boolean(lens) && (
					<lens.data.renderer
						channel={channel}
						tail={sortedTail}
						setPage={setPage}
						pageOptions={pageOptions}
						page={pageOptions.page}
						totalPages={pageOptions.totalPages}
						type={tailType}
					/>
				)}
			</React.Fragment>
		)
	}
}
