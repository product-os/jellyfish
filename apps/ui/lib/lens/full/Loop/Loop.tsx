import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Card, Divider, Flex, Txt, Heading } from 'rendition';
import { Icon, Link } from '../../../components';
import { sdk } from '../../../core';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

const WIDTH = 160;

const LOOP_CONTRACTS = {
	support: {
		type: 'support-thread@1.0.0',
		status: 'open',
	},
	patterns: {
		type: 'pattern@1.0.0',
	},
	improvements: {
		type: 'improvement@1.0.0',
	},
	pulls: {
		type: 'pull-request@1.0.0',
		status: 'open',
	},
	topics: {
		type: 'brainstorm-topic@1.0.0',
		status: 'open',
	},
};

const Corner = (props: { rotate: number } = { rotate: 0 }) => {
	return (
		<svg
			stroke="#DDE1f0"
			fill="#DDE1f0"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 68 68"
			width={`${WIDTH}px`}
			version="1.0"
			preserveAspectRatio="xMidYMid meet"
			style={{ transform: `rotate(${props.rotate}deg)` }}
		>
			<path
				d="M34,4 C34,5 34,34 68,34"
				transform="translate(0, 3)"
				fill="none"
				stroke-width="1"
				stroke-linejoin="round"
				stroke-linecap="round"
			></path>
			<polygon
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1"
				transform="translate(31, 1) rotate(-3)"
				points="2.5,0 5,5 0,5"
			></polygon>
		</svg>
	);
};

const Arrow = (props: { rotate: number } = { rotate: 0 }) => {
	return (
		<svg
			stroke="#DDE1f0"
			fill="#DDE1f0"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 68 56"
			width={`${WIDTH}px`}
			version="1.0"
			preserveAspectRatio="xMidYMid meet"
			style={{ transform: `rotate(${props.rotate}deg)` }}
		>
			<path
				d="M34,4 34,56"
				transform="translate(0, 3)"
				fill="none"
				stroke-width="1"
				stroke-linejoin="round"
				stroke-linecap="round"
			></path>
			<polygon
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="1"
				transform="translate(31.5, 1)"
				points="2.5,0 5,5 0,5"
			></polygon>
		</svg>
	);
};

const LinkBox = ({
	label,
	path,
	total,
}: {
	label: string;
	path: string;
	total: number | null;
}) => {
	return (
		<Card p={2} small width={WIDTH} style={{ textAlign: 'center' }}>
			<Link append={path}>
				{label}
				<br />
				{total === null ? <Icon spin name="cog" /> : total}
				{total === 1000 ? '+' : ''}
			</Link>
		</Card>
	);
};

export default class LoopFull extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.state = {
			tree: null,
			support: null,
			patterns: null,
			implementing: null,
			proposed: null,
			pulls: null,
			topics: null,
		};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	componentDidMount() {
		const { slug, version, name } = this.props.card;
		const versionedSlug = `${slug}@${version}`;

		_.map(LOOP_CONTRACTS, (data, property) => {
			const query: any = {
				type: 'object',
				required: ['loop'],
				properties: {
					loop: { const: versionedSlug },
					type: { const: data.type },
				},
			};
			if ((data as any).status) {
				query.properties.data = {
					type: 'object',
					properties: {
						status: { const: (data as any).status },
					},
				};
			}
			if (data.type === 'pull-request@1.0.0') {
				delete query.properties.loop;
				_.set(query, ['properties', 'data', 'properties', 'repository'], {
					type: 'string',
					pattern: `^${name}\/`,
				});
				query.properties.data.required = ['status', 'repository'];
			}

			sdk
				.query(query, { sortBy: 'created_at', sortDir: 'asc' })
				.then((results) => {
					if (property === 'pulls') {
						console.log('all open pulls', results);
						console.log(results.slice(0, 5));
						this.setState({ oldestOpenPulls: results.slice(0, 5) });
					}
					if (property === 'patterns') {
						console.log('all patterns', results);
						const highestWeightPatterns = _.sortBy(
							results.filter((x) => x.data.hasOwnProperty('weight')),
							'data.weight',
						)
							.reverse()
							.slice(0, 5);
						console.log({ highestWeightPatterns });
						this.setState({ highestWeightPatterns });
					}
					if (property === 'improvements') {
						const [implementing, proposed] = _.partition(
							results.filter((i) => {
								return (
									i.data.status !== 'denied-or-failed' &&
									i.data.status !== 'completed'
								);
							}),
							(i) => i.data.status === 'implementation',
						);
						console.log({ results });
						this.setState({
							implementing: implementing.length,
							proposed: proposed.length,
							improvements: results,
						});
					} else {
						this.setState({
							[property]: results.length,
						});
					}
				})
				.catch(console.error);
		});

		sdk
			.query(
				{
					type: 'object',
					required: ['loop'],
					properties: {
						loop: { const: versionedSlug },
						type: { const: 'improvement@1.0.0' },

						data: {
							type: 'object',
							properties: {
								status: {
									type: 'string',
									const: 'completed',
								},
							},
						},
					},
					$$links: {
						'has attached element': {
							type: 'object',
							properties: {
								type: { const: 'update@1.0.0' },
								data: {
									type: 'object',
									required: ['payload'],
									properties: {
										payload: {
											type: 'array',
											contains: {
												type: 'object',
												required: ['path', 'value'],
												properties: {
													path: {
														type: 'string',
														const: '/data/status',
													},
													value: {
														type: 'string',
														const: 'completed',
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
				{
					links: {
						'has attached element': {
							sortBy: 'created_at',
							sortDir: 'desc',
						},
					},
				},
			)
			.then((results) => {
				console.log('improvement results', results);
				const deltas = results.map((i) => {
					const start = i.created_at;
					const end = i.links!['has attached element'][0].created_at;
					const unixDelta = new Date(end).getTime() - new Date(start).getTime();
					const inDays = unixDelta / (1000 * 60 * 60 * 24);
					return {
						delta: inDays,
						...i,
					};
				});
				console.log('improvement deltas', deltas);
				const average = _.sum(_.map(deltas, 'delta')) / deltas.length;
				this.setState({ averageImprovementLifetime: average });
			})
			.catch(console.error);

		sdk
			.query({
				type: 'object',
				required: ['loop'],
				properties: {
					loop: { const: versionedSlug },
					type: { const: 'improvement@1.0.0' },

					data: {
						type: 'object',
						properties: {
							status: {
								type: 'string',
								const: 'completed',
							},
						},
					},
				},
				$$links: {
					'is attached to': {
						type: 'object',
						properties: {
							type: { const: 'pattern@1.0.0' },
						},
					},
					'has attached element': {
						type: 'object',
						properties: {
							type: { const: 'update@1.0.0' },
							data: {
								type: 'object',
								required: ['payload'],
								properties: {
									payload: {
										type: 'array',
										contains: {
											type: 'object',
											required: ['path', 'value'],
											properties: {
												path: {
													type: 'string',
													const: '/data/status',
												},
												value: {
													type: 'string',
													const: 'completed',
												},
											},
										},
									},
								},
							},
						},
					},
				},
			})
			.then((results) => {
				console.log('pattern results', results);
				const deltas = results.map((i) => {
					const start = i.links!['is attached to'][0].created_at;
					const end = i.links!['has attached element'][0].created_at;
					const unixDelta = new Date(end).getTime() - new Date(start).getTime();
					const inDays = unixDelta / (1000 * 60 * 60 * 24);
					return {
						delta: inDays,
						...i,
					};
				});
				console.log('pattern deltas', deltas);
				const average = results.length
					? _.sum(_.map(deltas, 'delta')) / deltas.length
					: 'n/a';
				this.setState({ averagePatternResolutionTime: average });
			})
			.catch(console.error);

		sdk
			.query(
				{
					type: 'object',
					properties: {
						type: {
							const: 'pull-request@1.0.0',
							type: 'string',
						},
						data: {
							type: 'object',
							required: ['repository', 'merged_at'],
							properties: {
								repository: {
									type: 'string',
									pattern: `^${name}\/`,
								},
								merged_at: {
									type: 'string',
								},
							},
						},
					},
				},
				{
					limit: 100,
					sortBy: 'created_at',
					sortDir: 'desc',
				},
			)
			.then((results) => {
				console.log('PR results', results);
				const deltas = results.map((i) => {
					const start = i.created_at;
					const end = i.data.merged_at as string;
					const unixDelta = new Date(end).getTime() - new Date(start).getTime();
					const inHours = unixDelta / (1000 * 60 * 60);
					return {
						delta: inHours,
						...i,
					};
				});
				console.log('PR deltas ', deltas);
				const average = results.length
					? _.sum(_.map(deltas, 'delta')) / deltas.length
					: 'n/a';
				console.log('PR average', average);
				this.setState({ averagePRmergetime: average });
			})
			.catch(console.error);
	}

	render() {
		const { card, channel } = this.props;
		const {
			oldestOpenPulls,
			highestWeightPatterns,
			support,
			patterns,
			implementing,
			proposed,
			pulls,
			topics,
		} = this.state;

		let snippetLens;

		if (oldestOpenPulls) {
			const { getLenses } = require('../../');
			const lenses = getLenses('snippet', oldestOpenPulls[0], this.props.user);
			snippetLens = lenses[0];
		}

		return (
			<TabbedContractLayout card={card} channel={channel}>
				<Box width={420} mx="auto">
					<Flex alignItems="center">
						<Corner rotate={90} />

						<Card p={2} small width={WIDTH} style={{ textAlign: 'center' }}>
							Environment
						</Card>

						<Corner rotate={180} />
					</Flex>

					<Flex justifyContent="space-between" alignItems="center">
						<LinkBox
							label="Pull Requests (open)"
							path="/view-all-pull-requests"
							total={pulls}
						/>

						<LinkBox
							label="Support threads (open)"
							path={'/view-all-support-threads'}
							total={support}
						/>
					</Flex>

					<Flex justifyContent="space-between" alignItems="center">
						<Arrow rotate={0} />

						<LinkBox
							label="Brainstorm Topics (open)"
							path="/view-all-brainstorm-topics"
							total={topics}
						/>

						<Arrow rotate={180} />
					</Flex>

					<Flex justifyContent="space-between" alignItems="center">
						<LinkBox
							label="Improvements (doing)"
							path="/view-all-improvements"
							total={implementing}
						/>

						<LinkBox
							label="Patterns"
							path="/view-all-patterns"
							total={patterns}
						/>
					</Flex>

					<Flex alignItems="center">
						<Corner rotate={0} />

						<LinkBox
							label="Improvements (proposed)"
							path="/view-all-improvements"
							total={proposed}
						/>

						<Corner rotate={270} />
					</Flex>
				</Box>
				<Flex mx={-3}>
					<Card p={3} mx={3} flex="1">
						<Txt>Average time from improvement creation to completion</Txt>
						{this.state.averageImprovementLifetime ? (
							<Heading.h2 style={{ textAlign: 'center' }} py={4}>
								{Math.ceil(this.state.averageImprovementLifetime)} days
							</Heading.h2>
						) : (
							<Icon spin name="cog" />
						)}
					</Card>
					<Card p={3} mx={3} flex="1">
						<Txt>
							Average time from pattern creation to completed improvement
						</Txt>
						{this.state.averagePatternResolutionTime ? (
							<Heading.h2 style={{ textAlign: 'center' }} py={4}>
								{Math.ceil(this.state.averagePatternResolutionTime)} days
							</Heading.h2>
						) : (
							<Icon spin name="cog" />
						)}
					</Card>
					<Card p={3} mx={3} flex="1">
						<Txt>Average time to merge PR (last 100)</Txt>
						{this.state.averagePRmergetime ? (
							<Heading.h2 style={{ textAlign: 'center' }} py={4}>
								{Math.ceil(this.state.averagePRmergetime)} hours
							</Heading.h2>
						) : (
							<Icon spin name="cog" />
						)}
					</Card>
				</Flex>

				<Card p={3} my={3} flex="1">
					<Txt>Highest weight patterns</Txt>

					<Divider />

					{Boolean(highestWeightPatterns && snippetLens) && (
						<Box mx={-3}>
							{highestWeightPatterns.map((c) => {
								return (
									<snippetLens.data.renderer
										card={c}
										types={this.props.types}
									/>
								);
							})}
						</Box>
					)}
				</Card>

				<Card p={3} my={3} flex="1">
					<Txt>Oldest open Pull Requests</Txt>

					<Divider />

					{Boolean(oldestOpenPulls && snippetLens) && (
						<Box mx={-3}>
							{oldestOpenPulls.map((c) => {
								return (
									<snippetLens.data.renderer
										card={c}
										types={this.props.types}
									/>
								);
							})}
						</Box>
					)}
				</Card>
			</TabbedContractLayout>
		);
	}
}
