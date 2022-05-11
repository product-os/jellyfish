import * as _ from 'lodash';
import React from 'react';
import { Flex, Tab } from 'rendition';
import { LensContract, LensRendererProps } from '../../../types';
import Dashboard from './Dashboard';
import LiveCollection from '../../common/LiveCollection';
import TabbedContractLayout from '../../../layouts/TabbedContractLayout';

interface State {
	mineQuery: any;
	unownedQuery: any;
	agentsQuery: any;
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

		const agentsQuery = {
			title: 'Users marked as agents for this channel',
			type: 'object',
			properties: {
				type: {
					const: 'user@1.0.0',
				},
			},
			$$links: {
				'is agent for': {
					type: 'object',
					properties: {
						id: {
							const: card.id,
						},
					},
				},
			},
		};

		this.state = {
			mineQuery,
			unownedQuery,
			agentsQuery,
		};
	}

	render() {
		const { card, channel } = this.props;

		return (
			<TabbedContractLayout
				card={card}
				channel={channel}
				primaryTabTitle="Dashboard"
				tabs={[
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
					</Tab>,

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
					</Tab>,

					<Tab title="Unowned">
						<Flex
							flexDirection="column"
							flex="1"
							style={{
								maxWidth: '100%',
							}}
						>
							<LiveCollection
								key={3}
								hideFooter
								channel={this.props.channel}
								query={this.state.unownedQuery}
								card={this.props.card}
							/>
						</Flex>
					</Tab>,

					<Tab title="Agents">
						<Flex
							flexDirection="column"
							flex="1"
							style={{
								maxWidth: '100%',
							}}
						>
							<LiveCollection
								key={4}
								hideFooter
								channel={this.props.channel}
								query={this.state.agentsQuery}
								card={this.props.card}
							/>
						</Flex>
					</Tab>,
				]}
			>
				<Dashboard filter={(card.data.filter as any).schema} />
			</TabbedContractLayout>
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
