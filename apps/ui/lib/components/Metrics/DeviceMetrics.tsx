/* eslint-disable no-undefined */

import React from 'react';
import { Flex, StatsBar, StatsTitle, Txt, Card } from 'rendition';
import { formatMb } from '@balena/jellyfish-ui-components';

const ValueWithMaxTitle = ({ value, max }) => (
	<React.Fragment>
		<Txt.span>{formatMb(value)}</Txt.span>/
		<Txt.span color="tertiary.main">{formatMb(max)}</Txt.span>
	</React.Fragment>
);

export const DeviceMetrics = ({ metrics }) => {
	const hasSomeMetrics =
		metrics.cpu_usage !== null ||
		metrics.cpu_temp !== null ||
		metrics.memory_usage !== null ||
		metrics.storage_usage;

	if (!metrics || !hasSomeMetrics) {
		return null;
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
							labelFormatter={({ value }) => {
								return `~${value}%`;
							}}
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
							labelFormatter={({ value }) => {
								return `~${value}C`;
							}}
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
							labelFormatter={ValueWithMaxTitle}
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
							labelFormatter={ValueWithMaxTitle}
							value={metrics.storage_usage}
							max={metrics.storage_total}
						/>
					)}
				</Flex>
			</Flex>
		</Card>
	);
};
