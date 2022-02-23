import * as React from 'react';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import { Contract } from '@balena/jellyfish-types/build/core';
import * as _ from 'lodash';

// Takes an expanded tree of contracts and converts them into a mermaidjs graph.
// Each node in the graph shows the contracts name or slug and its version.
const makeGraph = (
	baseContracts: Contract[],
	showVersion = false,
	showType = false,
) => {
	const escapeMermaid = (s: string) => `"${s.replace(/"/g, "'")}"`;

	const shorten = (s: string) => (s.length > 16 ? s.substr(0, 20) + '…' : s);

	const formatContract = (contract: Contract) => {
		const version = showVersion ? `<br/>v${shorten(contract.version)}` : '';
		const type = showType ? `⟪${contract.type}⟫<br/>` : '';
		const label = `${type}${contract.name || contract.slug}${version}`;
		return `${contract.id}(${escapeMermaid(label)})`;
	};

	const buildGraphCode = (contract: Contract): string[] => {
		const buf: string[] = [];
		const contractNodeDeclaration = formatContract(contract);
		// Always push add the contract to the output, even if it's not connected to anything
		buf.push(contractNodeDeclaration);
		_.forEach(contract.links, (nodes, verb) => {
			for (const output of nodes) {
				buf.push(
					`${contractNodeDeclaration} -->|${verb}| ${formatContract(output)}`,
				);
				buf.push(...buildGraphCode(output));
			}
		});

		buf.push(`click ${contract.id} "/${contract.slug}@${contract.version}"`);

		return buf;
	};

	const graph = _.concat(
		['graph TD'],
		...baseContracts.map((b) => buildGraphCode(b)),
	).join('\n');

	console.log(graph);

	return graph;
};

interface Props {
	contracts: Contract[];
	showVersion?: boolean;
	showType?: boolean;
}

export default function ContractGraph(props: Props) {
	const { contracts, showVersion, showType } = props;
	const mermaidInput = makeGraph(contracts, showVersion, showType);
	return <Mermaid value={mermaidInput} />;
}
