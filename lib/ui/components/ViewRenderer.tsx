import * as React from 'react';
import { Box, Link } from 'rendition';
import * as sdk from '../services/sdk';
import CardRenderer from './CardRenderer';

export default class ViewRenderer extends CardRenderer {
	public loadView() {
		const getViewData = sdk.queryView(this.props.card.id);

		this.props.openChannel(getViewData);
	}

	public render() {
		const { card } = this.props;
		return (
			<Box mb={3}>
				<Link onClick={() => this.loadView()}>{card.name}</Link>
			</Box>
		);
	}

}
