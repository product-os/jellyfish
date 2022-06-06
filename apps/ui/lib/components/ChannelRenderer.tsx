import _ from 'lodash';
import React from 'react';
import { DropTarget, ConnectDropTarget } from 'react-dnd';
import { Alert, Box } from 'rendition';
import { v4 as isUUID } from 'is-uuid';
import { ErrorBoundary, Icon } from '.';
import { LinkModal } from './LinkModal';
import ChannelNotFound from './ChannelNotFound';
import { ChannelContextProvider } from '../hooks';
import { getLens } from '../lens';
import {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import { BoundActionCreators, ChannelContract } from '../types';
import { actionCreators } from '../store';
import { JsonSchema } from '@balena/jellyfish-types';
import { Setup, withSetup } from './SetupProvider';
import { compose } from 'redux';
import { ExtendedSocket } from '@balena/jellyfish-client-sdk/build/types';

const createChannelQuery = (
	idOrSlug: string,
	user: UserContract,
): JsonSchema => {
	let properties = {};
	if (isUUID(idOrSlug)) {
		properties = {
			id: {
				const: idOrSlug,
			},
		};
	} else {
		const [slug, version] = idOrSlug.split('@');
		properties = {
			slug: {
				const: slug,
			},

			// We MUST specify the version otherwise the query will return all versions
			// and randomly show one of them
			version: {
				const: version || '1.0.0',
			},
		};
	}

	const query = {
		type: 'object',
		anyOf: [
			{
				$$links: {
					'is bookmarked by': {
						type: 'object',
						required: ['type', 'id'],
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
			true,
		],
		properties,
	};
	return query as any as JsonSchema;
};

interface OwnProps {
	types: TypeContract[];
	actions: BoundActionCreators<typeof actionCreators>;
	user: UserContract;
	channel: ChannelContract;
	space: {
		left: number;
		width: number;
	};
}

interface ReactDnDProps {
	connectDropTarget: ConnectDropTarget;
	isOver: boolean;
}

type Props = OwnProps & ReactDnDProps & Setup;

interface State {
	showLinkModal: boolean;
	linkFrom: null | Contract;
	head: null | Contract;
	loading: boolean;
}

// Selects an appropriate renderer for a card
class ChannelRenderer extends React.Component<Props, State> {
	stream: ExtendedSocket | null = null;

	constructor(props) {
		super(props);
		this.state = {
			showLinkModal: false,
			linkFrom: null,
			head: null,
			loading: true,
		};

		this.closeLinkModal = this.closeLinkModal.bind(this);
	}

	async componentDidMount() {
		const {
			user,
			channel: { data },
		} = this.props;

		if (data.canonical === false) {
			return;
		}

		const query = createChannelQuery(data.target, user);

		this.props.sdk
			.query(query, { limit: 1 })
			.then(([result]) => {
				if (result) {
					this.setState({
						head: result,
					});
				}
				this.setState({
					loading: false,
				});
			})
			.catch(console.error);

		const stream = this.props.sdk.stream(query);
		this.stream = stream;

		stream.on('update', (response) => {
			const { after: card } = response.data;
			this.setState({ head: card });
		});
	}

	componentWillUnmount() {
		if (this.stream) {
			this.stream.close();
		}
	}

	closeLinkModal() {
		this.setState({
			showLinkModal: false,
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

		const { error, canonical } = channel.data;
		const { loading } = this.state;
		// TODO: Cleanup the handling of non-canonical lenses (e.g. create/edit pages)
		const head = canonical ? this.state.head : channel.data.head;

		const { linkFrom, showLinkModal } = this.state;

		const style: any = {
			position: 'absolute',
			width: _.get(this.props.space, ['width'], 'auto'),
			left: _.get(this.props.space, ['left'], 'auto'),
			height: '100%',
			transition: 'all ease-in-out 150ms',
			minWidth: 0,
			maxWidth: '100%',
			overflow: 'hidden',
		};

		if (canonical) {
			if (loading) {
				return (
					<Box style={style}>
						<Box p={3}>
							<Icon spin name="cog" />
						</Box>
					</Box>
				);
			}

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
			}
		}

		// TODO: Cleanup structures for non-canonical channels
		const lensSelectionData =
			!canonical && (head as any)?.card ? (head as any).card : head;

		const lens = getLens(
			_.get(channel.data, ['format'], 'full'),
			lensSelectionData,
			user,
		);

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

const dndTarget = {
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

const dndCollect = (connector, monitor) => {
	return {
		connectDropTarget: connector.dropTarget(),
		isOver: monitor.isOver(),
	};
};

export default compose(
	withSetup,
	DropTarget('channel', dndTarget, dndCollect),
)(ChannelRenderer);
