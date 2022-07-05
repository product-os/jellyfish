import * as React from 'react';
import { Flex } from 'rendition';
import * as _ from 'lodash';
import { LensRendererProps } from '../../types';
import ContractGraph from './ContractGraph';
import type {
	Contract,
	TypeContract,
} from '@balena/jellyfish-types/build/core';

type Props = Pick<LensRendererProps, 'channel' | 'tail' | 'card'> & {
	types: TypeContract[];
	linkVerbs: string[];
};

export default class DraggableContractGraph extends React.Component<Props> {
	render() {
		const { card, tail, types } = this.props;
		if (!tail) {
			return null;
		}
		const contracts = tail.slice();
		const typeSlugs = _.uniq(_.map(contracts, 'type'));
		// If the head contract is of the same type as the tail, include it in the ouput
		// This allows for the current targeted contract to appear as a node in the graph
		if (card && typeSlugs.includes(card.type)) {
			contracts.push(card);
		}

		if (contracts.length === 0) {
			return null;
		}

		// We're only interesting in displaying the "is required by" links
		const processedContracts: Contract[] = contracts.map((t) => {
			const links = _.pick(t.links, this.props.linkVerbs);
			return {
				...t,
				links,
			} as Contract;
		});

		return (
			<Flex justifyContent="center" py={2}>
				<ContractGraph draggable types={types} contracts={processedContracts} />
			</Flex>
		);
	}
}
