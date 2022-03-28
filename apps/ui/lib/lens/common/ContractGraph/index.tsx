import * as React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import { Box } from 'rendition';
import { Contract, TypeContract } from '@balena/jellyfish-types/build/core';
import * as _ from 'lodash';
import interact from 'interactjs';
import styled from 'styled-components';
import { v4 as uuid } from 'uuid';
import { LinkModal } from '../../../components/LinkModal';

const ChartWrapper = styled(Box)`
	.node.drop-target > rect {
		stroke-width: 3px !important;
	}
`;

const ONCLICK_CALLBACK = 'jellyfishContractGraphOnClickCallback';

interface OwnProps {
	contracts: Contract[];
	showVersion?: boolean;
	showType?: boolean;
	types?: TypeContract[];
	draggable?: boolean;
}

type Props = OwnProps & RouteComponentProps;

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

		return buf;
	};

	const graph = _.concat(
		['graph TD'],
		...baseContracts.map((b) => buildGraphCode(b)),
	).join('\n');

	return graph;
};

const getNodeId = (element: HTMLElement): string | null => {
	const id = element.getAttribute('id');
	if (!id) {
		return null;
	}
	// Mermaid DOM node ids are prefixed with the chart type and suffixed with a numerical id
	// We need to cut off these parts to get the raw node id
	const parsedId = id.replace(/(^\w*-|-\d+$)/g, '');
	return parsedId;
};

const ContractGraph = (props: Props) => {
	const { contracts, draggable, showVersion, showType, types } = props;

	const [identifier] = React.useState(`contract-graph-${uuid()}`);
	const [linkTargets, setLinkTargets] = React.useState<{
		to: Contract;
		from: Contract;
	} | null>(null);

	if (draggable && types) {
		// TODO: Move logic to rendition
		// Add handlers for manipulating mermaid nodes
		React.useEffect(() => {
			const nodes = document.querySelectorAll('g.node');
			nodes.forEach((el) =>
				el.addEventListener('click', (event) => {
					if (event.currentTarget) {
						// A drop event cna trigger this click, so don't do anything if the node is being dragged
						if (
							Array.from((event.currentTarget as any).classList).includes(
								'dragging',
							)
						) {
							return;
						}
						const id = getNodeId(event.currentTarget as any);
						if (id) {
							props.history.push(`${props.location.pathname}/${id}`);
						}
					}
				}),
			);

			interact(`#${identifier} g.node`).draggable({
				listeners: {
					move(event) {
						const target = event.target;
						let dataX = parseFloat(target.getAttribute('data-x')) || 0;
						let dataY = parseFloat(target.getAttribute('data-y')) || 0;
						// Mermaid uses the `transform` html attribute to position elements, so we have to take that into account when positioning nodes
						const transformAttr = target.getAttribute('transform');
						if ((!dataX || !dataY) && transformAttr) {
							const matches = transformAttr.match(
								/translate\((\d+\.*\d*),\s*(\d+\.*\d*)\)/,
							);
							if (matches) {
								dataX = parseFloat(matches[1]);
								dataY = parseFloat(matches[2]);
							}
						}
						// keep the dragged position in the data-x/data-y attributes
						const x = dataX + event.dx;
						const y = dataY + event.dy;

						// translate the element
						target.style.transform =
							'translate(' + x + 'px, ' + y + 'px) rotate(2deg)';

						// update the posiion attributes
						target.setAttribute('data-x', x);
						target.setAttribute('data-y', y);
					},
					start: (event) => {
						event.target.classList.add('dragging');
					},
					end: (event) => {
						const target = event.target;
						// Reset the element
						target.style.transform = '';
						target.setAttribute('data-x', 0);
						target.setAttribute('data-y', 0);
						// The setTimeout skips this event loop and ensures that the `dragging` class is still present when the `click` event fires
						// This allows us to check for the "dragging" class and avoid navigation if the user is dragging a node instead of simply clicking on it
						setTimeout(() => {
							target.classList.remove('dragging');
						});
					},
				},
				modifiers: [
					interact.modifiers.restrictRect({
						restriction: 'parent',
						endOnly: true,
					}),
				],
			});

			// enable draggables to be dropped into this
			interact(`#${identifier} g.node`).dropzone({
				// only accept elements matching this CSS selector
				accept: 'g.node',
				// Require a 75% element overlap for a drop to be possible
				overlap: 0.5,

				// listen for drop related events:

				ondragenter(event) {
					const dropzoneElement = event.target;

					// feedback the possibility of a drop
					dropzoneElement.classList.add('drop-target');
				},
				ondragleave(event) {
					// remove the drop feedback style
					event.target.classList.remove('drop-target');
				},
				ondrop(event) {
					const fromId = getNodeId(event.currentTarget as any);
					const toId = getNodeId(event.relatedTarget as any);
					const from = _.find(props.contracts, { id: fromId }) as any;
					const to = _.find(props.contracts, { id: toId }) as any;
					if (from && to) {
						setLinkTargets({
							from,
							to,
						});
					}
				},
				ondropdeactivate(event) {
					// remove active dropzone feedback
					event.target.classList.remove('drop-target');
				},
			});
		}, []);
	}

	const mermaidInput = makeGraph(contracts, showVersion, showType);

	return (
		<ChartWrapper id={identifier}>
			<Mermaid value={mermaidInput} />
			{!!linkTargets && (
				<LinkModal
					target={linkTargets.to}
					cards={[linkTargets.from]}
					targetTypes={types}
					onHide={() => setLinkTargets(null)}
				/>
			)}
		</ChartWrapper>
	);
};

export default withRouter(ContractGraph);
