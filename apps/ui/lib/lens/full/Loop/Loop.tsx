/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Card, Divider, Flex, Tab, Tabs, Theme } from 'rendition';
import styled from 'styled-components';
import { helpers, Icon, Link } from '@balena/jellyfish-ui-components';
import CardLayout from '../../../layouts/CardLayout';
import Timeline from '../../list/Timeline';
import { RelationshipsTab, customQueryTabs } from '../../common';
import { sdk } from '../../../core';
import { Contract } from '@balena/jellyfish-types/build/core';

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
	projects: {
		type: 'project@1.0.0',
		status: 'implementation',
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

export const SingleCardTabs = styled(Tabs)`
	flex: 1;
	> [role='tablist'] {
		height: 100%;
	}
	> [role='tabpanel'] {
		flex: 1;
	}
`;

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
				<br />({total === null ? <Icon spin name="cog" /> : total}
				{total === 1000 ? '+' : ''})
			</Link>
		</Card>
	);
};

export default class LoopFull extends React.Component<any, any> {
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
			support: null,
			patterns: null,
			improvements: null,
			projects: null,
			pulls: null,
			topics: null,
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
		const { slug, version } = this.props.card;
		const versionedSlug = `${slug}@${version}`;

		_.map(LOOP_CONTRACTS, (data, property) => {
			const query: any = {
				type: 'object',
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

			sdk.query(query).then((results) => {
				this.setState({
					[property]: results.length,
				});
			});
		});
	}

	render() {
		const { card, channel, types, actionItems } = this.props;

		const type = helpers.getType(card.type, types);

		const tail = _.get(card.links, ['has attached element'], []);

		const { support, patterns, improvements, projects, pulls, topics } =
			this.state;

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
							<Box width={420} mx="auto">
								<Flex alignItems="center">
									<Corner rotate={90} />

									<Card
										p={2}
										small
										width={WIDTH}
										style={{ textAlign: 'center' }}
									>
										Environment
									</Card>

									<Corner rotate={180} />
								</Flex>

								<Flex justifyContent="space-between" alignItems="center">
									<LinkBox
										label="Pull Requests"
										path="/view-all-pull-requests"
										total={pulls}
									/>

									<LinkBox
										label="Support"
										path={'/view-all-support-threads'}
										total={support}
									/>
								</Flex>

								<Flex justifyContent="space-between" alignItems="center">
									<Arrow rotate={0} />

									<LinkBox
										label="Brainstorm Topics"
										path="/view-all-brainstorm-topics"
										total={topics}
									/>

									<Arrow rotate={180} />
								</Flex>

								<Flex justifyContent="space-between" alignItems="center">
									<LinkBox
										label="Projects"
										path="/view-all-projects"
										total={projects}
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
										label="Improvements"
										path="/view-all-improvements"
										total={improvements}
									/>

									<Corner rotate={270} />
								</Flex>
							</Box>
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
