import * as _ from 'lodash';
import * as React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Box, Divider, Heading, Link, Txt } from 'rendition';
import styled from 'styled-components';
import { Card, Channel } from '../../Types';
import { createChannel } from '../services/helpers';
import { actionCreators } from '../services/store';

const DataContainer = styled.pre`
	background: none;
	color: inherit;
	border: 0;
	margin: 0;
	padding: 0;
	font-size: inherit;
	white-space: pre-wrap;
	word-wrap: break-word;
`;

const CardField = ({ field, payload }: {
	field: string;
	payload: { [key: string]: any };
}) => {
	return (
		<React.Fragment>
			<Heading.h4 my={3}>{field}</Heading.h4>
			{_.isObject(payload[field]) ?
				<Txt monospace>
					<DataContainer>{JSON.stringify(payload[field], null, 4)}</DataContainer>
				</Txt>
				: <Txt>{`${payload[field]}`}</Txt>}
		</React.Fragment>
	);
};

interface CardProps {
	card: Card;
	fieldOrder?: string[];
	actions: typeof actionCreators;
	channel?: Channel;
}

class CardRenderer extends React.Component<CardProps, {}> {
	public openChannel(card: Card) {
		if (!this.props.channel) {
			return;
		}

		this.props.actions.addChannel(createChannel({
			target: card.id,
			head: card,
			parentChannel: this.props.channel.id,
		}));
	}

	public render() {
		const payload = this.props.card.data;
		const { card, fieldOrder } = this.props;

		const unorderedKeys = _.filter(
			_.keys(payload),
			(key) => !_.includes(fieldOrder, key),
		);

		return (
			<React.Fragment>
				<Box mb={3}>
					<Heading.h3 my={3}>
						{!!this.props.channel &&
							<Link onClick={() => this.openChannel(card)}>
								{card.name || card.slug || card.id}
							</Link>
						}
						{!this.props.channel && (card.name || card.slug || card.id)}
					</Heading.h3>

					{_.map(fieldOrder, (key) =>
						!!payload[key] ?
							<CardField key={key} field={key} payload={payload} />
							: null)
					}

					{_.map(unorderedKeys, (key) =>
						<CardField key={key} field={key} payload={payload} />)}

				</Box>
				<Divider color='#ccc' mb={4} />
			</React.Fragment>
		);
	}
}

const mapDispatchToProps = (dispatch: any) => ({
	actions: bindActionCreators(actionCreators, dispatch),
});

export default connect(null, mapDispatchToProps)(CardRenderer);
