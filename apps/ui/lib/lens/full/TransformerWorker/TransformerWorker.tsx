/* eslint-disable camelcase */

import React from 'react';
import _ from 'lodash';
import { Box, Heading, Flex, Tab, Table, Txt } from 'rendition';
import { DeviceMetrics } from '../../../components/Metrics/DeviceMetrics';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

export const SLUG = 'lens-full-transformer-worker';

const TRANSFORMER_COLUMNS = [
	{
		label: 'ID',
		field: 'id',
		sortable: true,
	},
	{
		label: 'Ref',
		field: 'ref',
		sortable: true,
	},
	{
		label: 'Count',
		field: 'count',
		sortable: true,
	},
];

const Field = ({ label, value, ...rest }) => {
	if (!value) {
		return null;
	}
	return (
		<Box {...rest}>
			<Heading.h5>{label}</Heading.h5>
			<Txt>{value}</Txt>
		</Box>
	);
};

const TransformerWorker = ({ card, channel }) => {
	const os = _.get(card, ['data', 'os']);
	const architecture = _.get(card, ['data', 'architecture']);

	const metrics = React.useMemo(() => {
		const cpuUsage = _.get(card, ['data', 'cpu_load']);
		const memoryTotal = _.get(card, ['data', 'ram', 'total_mb']);
		const memoryAvailable = _.get(card, ['data', 'ram', 'available']);
		const storageTotal = _.get(card, ['data', 'storage', 'total_mb']);
		const storageAvailable = _.get(card, ['data', 'storage', 'available']);
		return {
			cpu_usage: cpuUsage,
			cpu_temp: null,
			memory_usage: memoryAvailable - memoryTotal,
			memory_total: memoryAvailable,
			storage_usage: storageAvailable - storageTotal,
			storage_total: storageAvailable,
		};
	}, [card]);

	return (
		<TabbedContractLayout
			data-test={`lens--${SLUG}`}
			card={card}
			channel={channel}
			tabs={[
				<Tab title="Transformers">
					<Flex flex={1} p={3} flexDirection="column" justifyContent="stretch">
						<Table
							data={_.get(card, ['data', 'transformers'], [])}
							columns={TRANSFORMER_COLUMNS}
						/>
					</Flex>
				</Tab>,
			]}
		>
			<>
				<Field label="Operating System" value={os} mb={3} />
				<Field label="Architecture" value={architecture} mb={3} />
				<Flex flex={1} my={3} flexDirection="column" justifyContent="stretch">
					<DeviceMetrics metrics={metrics} />
				</Flex>
			</>
		</TabbedContractLayout>
	);
};

export default TransformerWorker;
