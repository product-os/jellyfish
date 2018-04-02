import * as _ from 'lodash';
import * as React from 'react';
import { Box, Divider, Heading, Text } from 'rendition';
import { Card } from '../../Types';
import CardActions from './CardActions';

const RepoField = ({ field, payload }: {
	field: string;
	payload: { [key: string]: any };
}) =>
	<React.Fragment>
		<Heading.h4 my={3}>{field}</Heading.h4>
		<Text>{`${payload[field]}`}</Text>
	</React.Fragment>;

interface RepoProps {
	card: Card;
	fieldOrder?: string[];
	refresh: () => void;
}

export default class Repo extends React.Component<RepoProps, {}> {
	public render() {
		const payload = this.props.card.data;
		const { fieldOrder } = this.props;

		const unorderedKeys = _.filter(
			_.keys(payload),
			(key) => !_.includes(fieldOrder, key),
		);

		return (
			<React.Fragment>
				<Box mb={3}>
					<CardActions card={this.props.card} refresh={this.props.refresh} />

					<Heading.h3 my={3}>{this.props.card.name}</Heading.h3>

					{_.map(fieldOrder, (key) =>
						!!payload[key] ?
							<RepoField key={key} field={key} payload={payload} />
							: null)
					}

					{_.map(unorderedKeys, (key) =>
						<RepoField key={key} field={key} payload={payload} />)}

				</Box>
				<Divider color='#ccc' mb={4} />
			</React.Fragment>
		);
	}
}
