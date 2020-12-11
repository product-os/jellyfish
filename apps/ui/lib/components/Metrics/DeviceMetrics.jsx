/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-undefined */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Flex,
	ProgressBar,
	Txt,
	Card
} from 'rendition'
import {
	Icon
} from '@balena/jellyfish-ui-components'

// TODO: Move all this code into Rendition!

// https://gist.github.com/thomseddon/3511330
const formatSize = (bytes, base = 1000) => {
	if (typeof bytes !== 'number' || bytes < 0) {
		return null
	}
	const units = [ 'bytes', 'KB', 'MB', 'GB', 'TB', 'PB' ]
	let order = Math.floor(Math.log(bytes) / Math.log(base))
	if (order >= units.length) {
		order = units.length - 1
	}
	const size = bytes / Math.pow(base, order)
	let result = null
	if (order < 0) {
		result = bytes
		order = 0
	} else if (order >= 3 && size !== Math.floor(size)) {
		result = size.toFixed(1)
	} else {
		result = size.toFixed()
	}
	return `${result} ${units[order]}`
}

const formatMb = (mb) => {
	if (mb === null) {
		return '-'
	}

	return formatSize(mb * 1024 * 1024, 1024) || '-'
}

const getDiscreteBarValue = (
	value,
	numSlices,
	index
) => {
	const highlightedNumSlices = Math.ceil(value / (100 / numSlices))
	if (numSlices <= 1) {
		return value
	}

	return highlightedNumSlices > index ? 100 : 0
}

const ValueWithMaxTitle = ({
	value, max
}) => (
	<React.Fragment>
		<Txt.span>{value}</Txt.span>/
		<Txt.span color="tertiary.main">{max}</Txt.span>
	</React.Fragment>
)

const DiscreteBar = ({
	value, numSlices, ...props
}) => {
	return (
		<Flex flexDirection="row">
			{_.range(numSlices).map((idx) => {
				return (
					<Box key={idx} flex={1} mr={idx === numSlices - 1 ? 0 : 2}>
						<ProgressBar
							value={getDiscreteBarValue(value, numSlices, idx)}
							{...props}
						/>
					</Box>
				)
			})}
		</Flex>
	)
}

const StatsBar = ({
	title,
	statsLabel,
	value,
	max,
	numSlices,
	...props
}) => {
	const percentage = (value / (max || 100)) * 100

	// ProgressBar checks for the existence of a field rather than checking for true/false, so we have to do it this way.
	const bg = {
		...(percentage <= 60 ? {
			success: true
		} : {}),
		...(percentage > 60 && percentage <= 80 ? {
			warning: true
		} : {}),
		...(percentage > 80 ? {
			danger: true
		} : {})
	}

	return (
		<Flex flex={1} minWidth={152} flexDirection="column" {...props}>
			<Flex
				mb={2}
				flexDirection="row"
				alignItems="flex-start"
				justifyContent="space-between"
			>
				<Txt.span>{title}</Txt.span>
				<Txt.span>{statsLabel}</Txt.span>
			</Flex>
			<DiscreteBar numSlices={numSlices || 1} value={percentage} {...bg} />
		</Flex>
	)
}

const StatsTitle = ({
	icon,
	title,
	description
}) => {
	return (
		<Flex
			flexDirection="column"
			alignItems="flex-start"
			justifyContent="flex-start"
		>
			<Box>
				<Txt.span mr={1} color="tertiary.semilight">
					<Icon name={icon} />
				</Txt.span>
				<Txt.span>{title}</Txt.span>
			</Box>
			{/* We add a zero-width character so the span always keeps its size */}
			<Txt.span color="tertiary.main" style={{
				lineHeight: 1
			}} fontSize={0}>
				{description || '\u200b'}
			</Txt.span>
		</Flex>
	)
}

export const DeviceMetrics = ({
	metrics
}) => {
	const hasSomeMetrics =
		metrics.cpu_usage !== null ||
		metrics.cpu_temp !== null ||
		metrics.memory_usage !== null ||
		metrics.storage_usage

	if (!metrics || !hasSomeMetrics) {
		return null
	}

	return (
		<Card small mb={3}>
			<Flex flexDirection={'row'} flexWrap="wrap">
				<Flex flex={1} flexDirection="row">
					{metrics.cpu_usage !== null && (
						<StatsBar
							mx={2}
							my={1}
							title={<StatsTitle icon="microchip" title="CPU" />}
							statsLabel={`~${metrics.cpu_usage}%`}
							value={metrics.cpu_usage}
							max={100}
							numSlices={5}
						/>
					)}
					{metrics.cpu_temp && (
						<StatsBar
							mx={2}
							my={1}
							title={<StatsTitle icon="microchip" title="Temperature" />}
							statsLabel={`~${metrics.cpu_temp}C`}
							value={metrics.cpu_temp}
							max={100}
						/>
					)}
				</Flex>
				<Flex flex={1} flexDirection="row">
					{metrics.memory_usage && (
						<StatsBar
							mx={2}
							my={1}
							title={<StatsTitle icon="memory" title="Memory" />}
							statsLabel={
								<ValueWithMaxTitle
									value={formatMb(metrics.memory_usage)}
									max={formatMb(metrics.memory_total)}
								/>
							}
							value={metrics.memory_usage}
							max={metrics.memory_total}
						/>
					)}
					{metrics.storage_usage && (
						<StatsBar
							mx={2}
							my={1}
							title={
								<StatsTitle
									icon="hdd"
									title="Storage"
									description={
										metrics.storage_block_device
											? `(${metrics.storage_block_device})`
											: undefined
									}
								/>
							}
							statsLabel={
								<ValueWithMaxTitle
									value={formatMb(metrics.storage_usage)}
									max={formatMb(metrics.storage_total)}
								/>
							}
							value={metrics.storage_usage}
							max={metrics.storage_total}
						/>
					)}
				</Flex>
			</Flex>
		</Card>
	)
}
