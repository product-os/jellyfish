/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Flex,
	Txt
} from 'rendition'
import {
	Icon
} from '@balena/jellyfish-ui-components'
import {
	ViewFooter
} from '../../common/ViewFooter'

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
			onAddCard,
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
			<Flex flex={1} flexDirection="column" minWidth="270px">
				<Flex flex={1} flexDirection="column" data-test="inner-flex" style={{
					overflowY: 'auto'
				}}>
					{!sortedTail && (
						<Box p={3}>
							<Icon spin name="cog"/>
						</Box>
					)}
					{Boolean(tail) && tail.length === 0 && (
						<Txt.p p={3}>No results found</Txt.p>
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
				</Flex>

				{Boolean(tailType) && (
					<ViewFooter type={tailType} onAddCard={onAddCard} />
				)}
			</Flex>
		)
	}
}
