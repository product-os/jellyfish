import * as _ from 'lodash';
import * as React from 'react';
import { DropTarget } from 'react-dnd';
import { Alert, Box, Modal } from 'rendition';
import { LINKS } from '../constants';
import { createLink } from '../services/link';
import { Card, RendererProps } from '../types';
import { ErrorBoundary } from './ErrorBoundary';

// Load lens service
import LensService from '../lens';

interface ChannelRendererProps extends RendererProps {
	connectDropTarget: any;
	isOver: any;
}

// Selects an appropriate renderer for a card
class ChannelRenderer extends React.Component<ChannelRendererProps, {
	showLinkModal: false;
	linkFrom: null | Card;
}> {
	constructor(props: ChannelRendererProps) {
		super(props);

		this.state = {
			showLinkModal: false,
			linkFrom: null,
		};
	}

	public link(): void {
		const fromCard = this.state.linkFrom!;
		const toCard = this.props.channel.data.head!;
		const linkName = _.get(LINKS, [fromCard.type, toCard.type], 'is attached to');

		createLink(fromCard, toCard, linkName);

		this.setState({
			showLinkModal: false,
			linkFrom: null,
		});
	}

	public render(): React.ReactNode {
		const { channel, connectDropTarget, isOver } = this.props;
		if (!channel.data.head) {
			if (channel.data.error) {
				return <Alert m={2} danger={true}>{channel.data.error.toString()}</Alert>;
			}

			return (
				<Box flex="1">
					<Box p={3}>
						<i className="fas fa-cog fa-spin" />
					</Box>
				</Box>
			);

		}

		const lens = LensService.getLens(channel.data.head!);

		return (
			<ErrorBoundary>
				{connectDropTarget(
					<div
						style={{
							flex: this.props.flex,
							background: isOver ? '#ccc' : 'none',
							borderLeft: '1px solid #eee',
							minWidth: 0,
						}}
					>
						<lens.data.renderer card={channel.data.head} level={0} {...this.props} />
					</div>,
				)}

				{this.state.showLinkModal && (
					<Modal
						cancel={() => this.setState({ showLinkModal: false })}
						done={() => this.link()}
					>
						Link {this.state.linkFrom!.type} <strong>{this.state.linkFrom!.name}</strong> to {this.props.channel.data.head!.type} <strong>{this.props.channel.data.head!.name}</strong>
					</Modal>
				)}
			</ErrorBoundary>
		);
	}
}

const squareTarget = {
	drop(_props: any, monitor: any, component: any): void {
		component.setState({
			showLinkModal: true,
			linkFrom: monitor.getItem(),
		});
	},
};

function collect(connect: any, monitor: any): any {
	return {
		connectDropTarget: connect.dropTarget(),
		isOver: monitor.isOver(),
	};
}

export default DropTarget('channel', squareTarget, collect)(ChannelRenderer);
