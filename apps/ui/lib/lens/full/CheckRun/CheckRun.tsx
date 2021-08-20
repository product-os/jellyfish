/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Divider, Tab, Tabs, Theme } from 'rendition';
import styled from 'styled-components';
import { helpers } from '@balena/jellyfish-ui-components';
import CardFields from '../../../components/CardFields';
import CardLayout from '../../../layouts/CardLayout';
import Timeline from '../../list/Timeline';
import { UI_SCHEMA_MODE } from '../../schema-util';
import { RelationshipsTab, customQueryTabs } from '../../common';
import { sdk } from '../../../core';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import { Contract } from '@balena/jellyfish-types/build/core';

export const SingleCardTabs = styled(Tabs)`
	flex: 1;
	> [role='tablist'] {
		height: 100%;
	}
	> [role='tabpanel'] {
		flex: 1;
	}
`;

// The maximum depth to explore the graph
const GRAPH_DEPTH = 3;
const BUILT_VERB = 'was built into';
const MERGE_VERB = 'was merged as';

// Takes an expanded tree of contracts and converts them into a mermaidjs graph.
// Each node in the graph shows the contracts name or slug and its version.
// TODO: Make this a generic tool
const makeGraph = (baseContract: Contract) => {
	const formatContract = (contract: Contract) => {
		return `${contract.id}(${contract.name || contract.slug}<br/>v${
			contract.version
		})`;
	};

	const buildGraphCode = (contract: Contract): string[] => {
		const buf: string[] = [];
		_.forEach(contract.links, (nodes, verb) => {
			for (const output of nodes) {
				buf.push(
					`${formatContract(contract)} -->|${verb}| ${formatContract(output)}`,
				);
				buf.push(...buildGraphCode(output));
			}
		});

		buf.push(`click ${contract.id} "/${contract.slug}"`);

		return buf;
	};

	const graph = ['graph TD'].concat(buildGraphCode(baseContract)).join('\n');

	return graph;
};

export default class SingleCardFull extends React.Component<any, any> {
	constructor(props) {
		super(props);

		const tail = _.get(this.props.card.links, ['has attached element'], []);

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0];
			return typeBase === 'message' || typeBase === 'whisper';
		});

		this.state = {
			activeIndex: comms.length ? 1 : 0,
			tree: null,
		};

		this.setActiveIndex = this.setActiveIndex.bind(this);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	setActiveIndex(activeIndex) {
		this.setState({
			activeIndex,
		});
	}

	componentDidMount() {
		this.loadTransformerData();
	}

	// Loads the commit contract attached to this check run and then recursively loads all
	// contracts that it was built into, creating a tree of contracts that can be used to
	// represent a chain of transformers
	async loadTransformerData() {
		const { card } = this.props;
		const withCommit = await sdk.card.getWithLinks(card.id, [
			'is attached to commit',
		]);
		if (!withCommit || !withCommit.links) {
			return;
		}
		const commit = withCommit.links['is attached to commit'][0];

		const getWasBuiltInto = async (contract: Contract) => {
			// Build a recursive links query to a maximum depth
			let fragment = {};
			_.times(GRAPH_DEPTH, () => {
				fragment = {
					anyOf: [
						{
							$$links: {
								[MERGE_VERB]: {
									type: 'object',
								},
								[BUILT_VERB]: {
									type: 'object',
									...fragment,
								},
							},
						},
						true,
					],
				};
			});

			const [contractWithLinks] = await sdk.query({
				type: 'object',
				properties: {
					id: {
						const: contract.id,
					},
				},
				...fragment,
			});

			return contractWithLinks;
		};

		const result = await getWasBuiltInto(commit);

		this.setState({
			tree: result,
		});
	}

	render() {
		const { card, channel, types, actionItems } = this.props;

		const type = helpers.getType(card.type, types);

		const tail = _.get(card.links, ['has attached element'], []);

		return (
			<CardLayout
				overflowY
				card={card}
				channel={channel}
				actionItems={actionItems}
			>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<SingleCardTabs
					activeIndex={this.state.activeIndex}
					onActive={this.setActiveIndex}
				>
					<Tab title="Info">
						<Box
							p={3}
							flex={1}
							style={{
								maxWidth: Theme.breakpoints[2],
							}}
						>
							<CardFields
								card={card}
								type={type}
								viewMode={UI_SCHEMA_MODE.fields}
							/>
							{!!this.state.tree && (
								<Mermaid value={makeGraph(this.state.tree)} />
							)}
						</Box>
					</Tab>

					<Tab title="Timeline">
						<Timeline.data.renderer card={card} allowWhispers tail={tail} />
					</Tab>

					{customQueryTabs(card, type)}
					<RelationshipsTab card={card} />
				</SingleCardTabs>
			</CardLayout>
		);
	}
}
