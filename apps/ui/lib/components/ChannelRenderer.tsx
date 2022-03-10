import _ from 'lodash';
import React from 'react';
import { DropTarget } from 'react-dnd';
import { Alert, Box } from 'rendition';
import { ErrorBoundary, Icon } from '.';
import { LinkModal } from './LinkModal';
import ChannelNotFound from './ChannelNotFound';
import { ChannelContextProvider } from '../hooks';
import { getLens } from '../lens';

// Selects an appropriate renderer for a card
class ChannelRenderer extends React.Component<any, any> {
	constructor(props) {
		super(props);
		this.state = {
			showLinkModal: false,
			linkFrom: null,
		};

		this.closeLinkModal = this.closeLinkModal.bind(this);
		this.link = this.link.bind(this);
	}

	closeLinkModal() {
		this.setState({
			showLinkModal: false,
		});
	}

	link() {
		const fromCard = this.state.linkFrom;
		const toCard = this.props.channel.data.head;
		this.props.actions.createLink(fromCard, toCard);
		this.setState({
			showLinkModal: false,
			linkFrom: null,
		});
	}

	displayLinkUI(from) {
		this.setState({
			showLinkModal: true,
			linkFrom: from,
		});
	}

	render() {
		const { channel, connectDropTarget, isOver, types, user } = this.props;

		const { head, error } = channel.data;

		const { linkFrom, showLinkModal } = this.state;

		const style: any = {
			position: 'absolute',
			width: _.get(this.props.space, ['width'], 'auto'),
			left: _.get(this.props.space, ['left'], 'auto'),
			height: '100%',
			transition: 'all ease-in-out 150ms',
			background: isOver ? '#ccc' : 'white',
			borderLeft: '1px solid #eee',
			minWidth: 0,
			maxWidth: '100%',
			overflow: 'hidden',
		};

		if (!head) {
			if (error) {
				return (
					<Alert m={2} danger={true} style={style}>
						{error.toString()}
					</Alert>
				);
			}

			if (head === null) {
				return (
					<div style={style}>
						<ChannelNotFound channel={channel} />
					</div>
				);
			}

			return (
				<Box style={style}>
					<Box p={3}>
						<Icon spin name="cog" />
					</Box>
				</Box>
			);
		}

		const lens = getLens(_.get(channel.data, ['format'], 'full'), head, user);

		return (
			<ChannelContextProvider channel={channel}>
				<ErrorBoundary style={style}>
					{connectDropTarget(
						<div style={style}>
							<lens.data.renderer card={head} {...this.props} />
						</div>,
					)}

					{showLinkModal && (
						<LinkModal
							target={head}
							cards={[linkFrom]}
							targetTypes={types}
							onHide={this.closeLinkModal}
						/>
					)}
				</ErrorBoundary>
			</ChannelContextProvider>
		);
	}
}

const target = {
	drop(props, monitor, component) {
		const fromCard = monitor.getItem();
		const toCard = props.channel.data.head;

		// Make sure we don't link a card to itself
		if (fromCard.id === toCard.id) {
			return;
		}

		component.displayLinkUI(monitor.getItem());
	},
};

const collect = (connector, monitor) => {
	return {
		connectDropTarget: connector.dropTarget(),
		isOver: monitor.isOver(),
	};
};

export default DropTarget('channel', target, collect)(ChannelRenderer);
