import { circularDeepEqual } from 'fast-equals';
import _ from 'lodash';
import React from 'react';
import { Box, Txt } from 'rendition';
import { Collapsible, TagList } from '../../../components';
import * as helpers from '../../../services/helpers';
import CardFields from '../../../components/CardFields';
import Timeline from '../../list/Timeline';
import CardLayout from '../../../layouts/CardLayout';

export default class Thread extends React.Component<any, any> {
	shouldComponentUpdate(nextProps) {
		return !circularDeepEqual(nextProps, this.props);
	}

	render() {
		const { card, channel, types } = this.props;

		const typeCard = _.find(types, {
			slug: card.type.split('@')[0],
		});

		return (
			<CardLayout
				card={card}
				channel={channel}
				title={
					<Txt mb={[0, 0, 3]}>
						<strong>
							Thread created at {helpers.formatTimestamp(card.created_at)}
						</strong>
					</Txt>
				}
			>
				<Collapsible
					title="Details"
					px={3}
					maxContentHeight="50vh"
					lazyLoadContent
					data-test="thread-details"
				>
					<TagList tags={card.tags} my={1} />

					<CardFields card={card} type={typeCard} />
				</Collapsible>

				<Box
					flex="1"
					style={{
						minHeight: 0,
					}}
				>
					<Timeline.data.renderer card={this.props.card} />
				</Box>
			</CardLayout>
		);
	}
}
