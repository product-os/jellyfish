import * as _ from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Flex, Divider, Tab, Tabs, Theme } from 'rendition';
import * as helpers from '../../../services/helpers';
import { actionCreators, selectors } from '../../../core';
import { LensContract, LensRendererProps } from '../../../types';
import CardLayout from '../../../layouts/CardLayout';
import styled from 'styled-components';
import Dashboard from './Dashboard';
import LiveCollection from '../../common/LiveCollection';

export const SingleCardTabs = styled(Tabs)`
	flex: 1;
	> [role='tablist'] {
		height: 100%;
	}
	> [role='tabpanel'] {
		flex: 1;
		overflow-y: auto;
	}
`;

interface State {
	mineQuery: any;
	unownedQuery: any;
}

class ChannelRenderer extends React.Component<LensRendererProps, State> {
	constructor(props: LensRendererProps) {
		super(props);

		const { card, user } = this.props;

		const mineQuery = {
			allOf: [
				(card.data.filter as any).schema,
				{
					title: 'Contracts owned by me',
					type: 'object',
					$$links: {
						'is owned by': {
							type: 'object',
							properties: {
								type: {
									const: 'user@1.0.0',
								},
								id: {
									const: user.id,
								},
							},
						},
					},
				},
			],
		};

		const unownedQuery = {
			allOf: [
				(card.data.filter as any).schema,
				{
					title: 'Unownted Contracts',
					type: 'object',
					not: {
						$$links: {
							'is owned by': {
								type: 'object',
								properties: {
									type: {
										const: 'user@1.0.0',
									},
									id: {
										const: user.id,
									},
								},
							},
						},
					},
				},
			],
		};

		this.state = {
			mineQuery,
			unownedQuery,
		};
	}

	render() {
		const { card } = this.props;

		return (
			<CardLayout {...this.props}>
				<Divider width="100%" color={helpers.colorHash(card.type)} />

				<SingleCardTabs>
					<Tab title="Dashboard">
						<Dashboard filter={(card.data.filter as any).schema} />
					</Tab>
					<Tab title="Owned by me">
						<Flex
							flexDirection="column"
							flex="1"
							style={{
								maxWidth: '100%',
							}}
						>
							<LiveCollection
								key={1}
								hideFooter
								channel={this.props.channel}
								query={this.state.mineQuery}
								card={this.props.card}
							/>
						</Flex>
					</Tab>

					<Tab title="All">
						<Flex
							flexDirection="column"
							flex="1"
							style={{
								maxWidth: '100%',
							}}
						>
							<LiveCollection
								key={2}
								hideFooter
								channel={this.props.channel}
								query={(card.data.filter as any).schema}
								card={this.props.card}
							/>
						</Flex>
					</Tab>

					<Tab title="Unowned">
						<Flex
							flexDirection="column"
							flex="1"
							style={{
								maxWidth: '100%',
							}}
						>
							<LiveCollection
								key={2}
								hideFooter
								channel={this.props.channel}
								query={this.state.unownedQuery}
								card={this.props.card}
							/>
						</Flex>
					</Tab>
				</SingleCardTabs>
			</CardLayout>
		);
	}
}

const lens: LensContract = {
	slug: 'lens-full-default',
	type: 'lens',
	version: '1.0.0',
	name: 'Default lens',
	data: {
		format: 'full',
		icon: 'address-card',
		renderer: ChannelRenderer,
		filter: {
			type: 'object',
			properties: {
				type: {
					const: 'channel@1.0.0',
				},
			},
		},
	},
};

export default lens;
