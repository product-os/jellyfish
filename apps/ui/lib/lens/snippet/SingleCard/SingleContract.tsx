import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { Box, Flex } from 'rendition';
import { TagList, UserAvatar } from '../../../components';
import type { UserContract } from '@balena/jellyfish-types/build/core';
import CardFields from '../../../components/CardFields';
import { UI_SCHEMA_MODE } from '../../schema-util';
import ContractNavLink from '../../../components/ContractNavLink';

const CardBox = styled<any>(Box)`
	border-left-style: solid;
	border-left-width: 4px;
	${(props: any) => {
		return props.active
			? `
			background: ${props.theme.colors.info.light};
			border-left-color: ${props.theme.colors.info.main};
		`
			: `
			background: white;
			border-left-color: transparent;
		`;
	}}
`;

export default class SingleCard extends React.Component<any, any> {
	shouldComponentUpdate(nextProps) {
		return !circularDeepEqual(nextProps, this.props);
	}

	render() {
		const { channelData, channels, card } = this.props;
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0],
		});
		const threadTargets = _.map(channels, 'data.target');

		const active =
			_.includes(threadTargets, `${card.slug}@${card.version}`) ||
			_.includes(threadTargets, card.slug) ||
			_.includes(threadTargets, card.id);

		const versionSuffix =
			card.version && card.version !== '1.0.0' ? ` v${card.version}` : '';

		const owner: UserContract = _.first(
			_.get(card, ['links', 'is owned by'], []),
		) as any;

		return (
			<CardBox
				active={active}
				p={3}
				data-test="snippet--card"
				data-test-id={`snippet-card-${card.id}`}
			>
				<Flex justifyContent="space-between">
					<ContractNavLink contract={card} channel={channelData.channel} />
					{!!owner && <UserAvatar user={owner} tooltipPlacement="left" />}
				</Flex>

				<TagList tags={card.tags} mb={1} />

				<CardFields
					card={card}
					type={typeCard}
					viewMode={UI_SCHEMA_MODE.snippet}
				/>
			</CardBox>
		);
	}
}
