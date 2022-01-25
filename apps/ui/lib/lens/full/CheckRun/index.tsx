import { circularDeepEqual } from 'fast-equals';
import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Box, Divider, Link, Tab, Tabs, Theme, Txt } from 'rendition';
import { Mermaid } from 'rendition/dist/extra/Mermaid';
import styled from 'styled-components';
import { helpers } from '@balena/jellyfish-ui-components';
import { Contract } from '@balena/jellyfish-types/build/core';
import { RelationshipsTab, customQueryTabs } from '../../common';
import Timeline from '../../list/Timeline';
import { UI_SCHEMA_MODE } from '../../schema-util';
import CardFields from '../../../components/CardFields';
import { actionCreators, sdk, selectors } from '../../../core';
import CardLayout from '../../../layouts/CardLayout';
import {
	BoundActionCreators,
	LensContract,
	LensRendererProps,
} from '../../../types';
import { core } from '@balena/jellyfish-types';

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
	const escapeMermaid = (s: string) => `"${s.replaceAll('"', "'")}"`;

	const shorten = (s: string) => (s.length > 16 ? s.substr(0, 20) + '…' : s);

	const formatContract = (contract: Contract) => {
		const label = `⟪${contract.type}⟫<br/>${
			contract.name || contract.slug
		}<br/>v${shorten(contract.version)}`;
		return `${contract.id}(${escapeMermaid(label)})`;
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

		buf.push(`click ${contract.id} "/${contract.slug}@${contract.version}"`);

		return buf;
	};

	const graph = ['graph TD'].concat(buildGraphCode(baseContract)).join('\n');

	return graph;
};

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

interface StateProps {
	types: core.TypeContract[];
}

interface DispatchProps {
	actions: BoundActionCreators<
		Pick<
			typeof actionCreators,
			'createLink' | 'addChannel' | 'getLinks' | 'queryAPI'
		>
	>;
}

type OwnProps = LensRendererProps;

type Props = OwnProps & StateProps & DispatchProps;

interface State {
	tree?: Contract;
	commit?: Contract;
	activeIndex: number;
}

class CheckRun extends React.Component<Props, State> {
	interval: NodeJS.Timeout | null = null;

	constructor(props) {
		super(props);

		const tail = _.get(this.props.card.links, ['has attached element'], []);

		const comms = _.filter(tail, (item) => {
			const typeBase = item.type.split('@')[0];
			return typeBase === 'message' || typeBase === 'whisper';
		});

		this.state = {
			activeIndex: comms.length ? 1 : 0,
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
			commit,
		});
	}

	render() {
		const { card, channel, types } = this.props;

		const type = helpers.getType(card.type, types);

		const tail = _.get(card.links, ['has attached element'], []);

		return (
			<CardLayout overflowY card={card} channel={channel}>
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

							<Txt pb={3}>
								The logs for all transformer runs can be found{' '}
								<Link target="_blank" href={makeLogLink(this.state.commit)}>
									here
								</Link>
								.
							</Txt>

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

const mapStateToProps = (state) => {
	return {
		types: selectors.getTypes(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		actions: bindActionCreators(
			_.pick(actionCreators, [
				'createLink',
				'addChannel',
				'getLinks',
				'queryAPI',
			]),
			dispatch,
		),
	};
};

const lens: LensContract = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: connect<StateProps, DispatchProps, OwnProps>(
			mapStateToProps,
			mapDispatchToProps,
		)(CheckRun),
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'check-run@1.0.0',
				},
			},
		},
	},
};

export default lens;
