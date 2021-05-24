/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { Box, Flex, Txt } from 'rendition';
import { helpers, Icon, Link, TagList } from '@balena/jellyfish-ui-components';
import CardFields from '../../../components/CardFields';
import { UI_SCHEMA_MODE } from '../../schema-util';

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
		const { channel, channels, card } = this.props;
		const typeCard = _.find(this.props.types, {
			slug: card.type.split('@')[0],
		});
		const threadTargets = _.map(channels, 'data.target');

		const active =
			_.includes(threadTargets, `${card.slug}@${card.version}`) ||
			_.includes(threadTargets, card.slug) ||
			_.includes(threadTargets, card.id);

		// Count the number of non-event links the card has
		const numLinks = _.reduce(
			card.links,
			(carry, value, key) => {
				return key === 'has attached element' ? carry : carry + value.length;
			},
			0,
		);

		return (
			<CardBox
				active={active}
				p={3}
				data-test="snippet--card"
				data-test-id={`snippet-card-${card.id}`}
			>
				<Flex justifyContent="space-between">
					<Txt>
						<Link to={helpers.appendToChannelPath(channel, card)}>
							<strong>{card.name || card.slug}</strong>
						</Link>
					</Txt>

					{numLinks > 0 && (
						<Box>
							{numLinks} <Icon name="bezier-curve" />
						</Box>
					)}
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
