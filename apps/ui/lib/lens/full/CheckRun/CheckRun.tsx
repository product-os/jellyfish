import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Link, Tabs, Txt } from 'rendition';
import styled from 'styled-components';
import * as helpers from '../../../services/helpers';
import CardFields from '../../../components/CardFields';
import { UI_SCHEMA_MODE } from '../../schema-util';
import { ContractGraph } from '../../common';
import type { Contract } from '@balena/jellyfish-types/build/core';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';
import { Setup, withSetup } from '../../../components/SetupProvider';

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

const hourInMs = 60 * 60 * 1000;

const makeLogLink = (commit?: Contract) => {
	if (!commit) {
		return '';
	}
	const startUnix = new Date(commit.created_at).getTime();
	const endUnix = startUnix + 2 * hourInMs;
	const sha = (commit.data as any).head.sha;
	return `https://monitor.balena-cloud.com/explore?orgId=1&left=%5B%22${startUnix}%22,%22${endUnix}%22,%22loki%22,%7B%22expr%22:%22%7Bfleet%3D%5C%22transformers-workers%5C%22,service!%3D%5C%22fleet-launcher%5C%22,service!%3D%5C%22balena_supervisor%5C%22,service!%3D%5C%22logshipper%5C%22,service!%3D%5C%22garbage-collector%5C%22,source_type%3D%5C%22balena%5C%22%7D%20%7C%20json%20%7C%20%20line_format%20%5C%22%7B%7B.name_extracted%7D%7D:%20%7B%7B.msg%7D%7D%20%7B%7B.line_status%7D%7D%20%7B%7B.slug%7D%7D%20%7B%7B.version%7D%7D%20%7B%7B.id%7D%7D%5C%22%5Cn%20%20%7C%20commit%3D%5C%22${sha}%5C%22%22,%22refId%22:%22A%22%7D%5D`;
};

export default withSetup(
	class CheckRun extends React.Component<
		{ card: Contract; channel: any; types: any; actionItems: any } & Setup,
		{ tree?: Contract; commit?: Contract }
	> {
		interval: NodeJS.Timeout | null = null;

		constructor(props) {
			super(props);
		}

		shouldComponentUpdate(nextProps, nextState) {
			return (
				!circularDeepEqual(nextState, this.state) ||
				!circularDeepEqual(nextProps, this.props)
			);
		}

		componentDidMount() {
			this.interval = setInterval(async () => {
				try {
					await this.loadTransformerData();
				} catch (error) {
					console.error(error);
				}
			}, 5000);
		}

		componentWillUnmount() {
			if (this.interval) {
				clearInterval(this.interval);
			}
		}

		// Loads the commit contract attached to this check run and then recursively loads all
		// contracts that it was built into, creating a tree of contracts that can be used to
		// represent a chain of transformers
		async loadTransformerData() {
			const { card } = this.props;
			const withCommit = await this.props.sdk.card.getWithLinks(card.id, [
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
									[BUILT_VERB]: {
										type: 'object',
										...fragment,
									},
								},
							},
							{
								$$links: {
									[MERGE_VERB]: {
										type: 'object',
									},
								},
							},
							true,
						],
					};
				});

				const [contractWithLinks] = await this.props.sdk.query({
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
				commit,
			});
		}

		render() {
			const { card, channel, types } = this.props;

			const type = helpers.getType(card.type, types);

			return (
				<TabbedContractLayout card={card} channel={channel}>
					<>
						<CardFields
							card={card}
							type={type}
							viewMode={UI_SCHEMA_MODE.fields}
						/>

						<Txt pb={3}>
							The logs for all transformer runs can be found{' '}
							<Link target="_blank" href={makeLogLink(this.state.commit)}>
								here
							</Link>
							.
						</Txt>

						{!!this.state.tree && (
							<ContractGraph
								draggable
								contracts={[this.state.tree]}
								showVersion
								showType
							/>
						)}
					</>
				</TabbedContractLayout>
			);
		}
	},
);
