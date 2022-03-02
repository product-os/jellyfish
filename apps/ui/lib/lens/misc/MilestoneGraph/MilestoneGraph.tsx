import * as React from 'react';
import { Flex } from 'rendition';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import { Contract } from '@balena/jellyfish-types/build/core';
import * as _ from 'lodash';
import { LensRendererProps } from '../../../types';
import { ContractGraph } from '../../common';

export type Props = LensRendererProps;

export default class MilestoneGraph extends React.Component<Props> {
	render() {
		const { channel, tail } = this.props;
		if (!tail) {
			return null;
		}
		const contracts = tail.slice();
		// If the head contract is also a milestone, include it in the ouput
		if (
			channel.data.head &&
			channel.data.head.type.split('@')[0] === 'milestone'
		) {
			contracts.push(channel.data.head);
		}

		if (contracts.length === 0) {
			return null;
		}

		// We're only interesting in displaying the "is required by" links
		const processedContracts = contracts.map((t) => {
			return {
				...t,
				links: {
					['is required by']: t.links?.['is required by'] || [],
				},
			};
		});
		console.log(processedContracts);
		return (
			<Flex justifyContent="center" py={2}>
				<ContractGraph contracts={processedContracts} />
			</Flex>
		);
	}
}
