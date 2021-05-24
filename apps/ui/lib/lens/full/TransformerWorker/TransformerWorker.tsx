/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable camelcase */

import React from 'react';
import _ from 'lodash';
import { Box, Heading, Flex, Tab, Table, Txt, Divider } from 'rendition';
import { helpers } from '@balena/jellyfish-ui-components';
import Segment from '../../common/Segment';
import CardLayout from '../../../layouts/CardLayout';
import { DeviceMetrics } from '../../../components/Metrics/DeviceMetrics';
import { SingleCardTabs } from '../SingleCard';

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

export const TransformerWorker = ({
	actions,
	actionItems,
	card,
	channel,
	types,
}) => {
	const [activeIndex, setActiveIndex] = React.useState(0);

	const type = _.find(types, {
		slug: card.type.split('@')[0],
	});

	const os = _.get(card, ['data', 'os']);
	const architecture = _.get(card, ['data', 'architecture']);
	const relationships = _.get(type, ['data', 'meta', 'relationships']);

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
		<CardLayout
			data-test={`lens--${SLUG}`}
			card={card}
			overflowY
			channel={channel}
			actionItems={actionItems}
			title={<Heading.h4>{card.name || card.slug}</Heading.h4>}
		>
			<Divider width="100%" color={helpers.colorHash(card.type)} />

			<SingleCardTabs activeIndex={activeIndex} onActive={setActiveIndex}>
				<Tab title="Metrics">
					<Box flex={1} p={3}>
						<Field label="Operating System" value={os} mb={3} />
						<Field label="Architecture" value={architecture} mb={3} />
						<Flex
							flex={1}
							my={3}
							flexDirection="column"
							justifyContent="stretch"
						>
							<DeviceMetrics metrics={metrics} />
						</Flex>
					</Box>
				</Tab>
				<Tab title="Transformers">
					<Flex flex={1} p={3} flexDirection="column" justifyContent="stretch">
						<Table
							data={_.get(card, ['data', 'transformers'], [])}
							columns={TRANSFORMER_COLUMNS}
						/>
					</Flex>
				</Tab>
				{_.map(relationships, (segment, index) => {
					return (
						<Tab title={segment.title} key={segment.title}>
							<Segment
								card={card}
								segment={segment}
								types={types}
								actions={actions}
							/>
						</Tab>
					);
				})}
			</SingleCardTabs>
		</CardLayout>
	);
};
