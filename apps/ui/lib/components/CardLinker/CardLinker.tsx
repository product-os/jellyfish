import _ from 'lodash';
import React from 'react';
import { DragSource } from 'react-dnd';
import { ActionButton, ContextMenu, PlainButton, Icon } from '../';
import { LinkModal, UnlinkModal } from '../LinkModal';

class CardLinker extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.state = {
			showMenu: false,
			showLinkModal: null,
		};

		this.openLinkModal = this.openLinkModal.bind(this);
		this.openUnlinkModal = this.openUnlinkModal.bind(this);
		this.hideLinkModal = this.hideLinkModal.bind(this);
		this.toggleMenu = this.toggleMenu.bind(this);
		this.openCreateChannel = this.openCreateChannel.bind(this);
	}

	openLinkModal() {
		this.setState({
			showLinkModal: 'link',
			showMenu: false,
		});
	}

	openUnlinkModal() {
		this.setState({
			showLinkModal: 'unlink',
			showMenu: false,
		});
	}

	hideLinkModal() {
		this.setState({
			showLinkModal: null,
			showMenu: false,
		});
	}

	toggleMenu() {
		this.setState({
			showMenu: !this.state.showMenu,
		});
	}

	openCreateChannel() {
		this.props.actions.addChannel({
			head: {
				seed: {
					loop: this.props.card.loop || this.props.activeLoop,
					markers: this.props.card.markers,
				},
				onDone: {
					action: 'link',
					targets: [this.props.card],
				},
			},
			format: 'create',
			canonical: false,
		});
	}

	render() {
		const { card, connectDragSource, types } = this.props;
		const { showLinkModal } = this.state;

		const type = card.type.split('@')[0];

		if (
			!_.some(this.props.relationships, ['data.from.type', card.type]) &&
			!_.some(this.props.relationships, ['data.from.type', type])
		) {
			return null;
		}
		const typeCard =
			_.find(types, ['slug', card.type]) || _.find(types, ['slug', type]);
		const typeName = typeCard ? typeCard.name : type;

		return connectDragSource(
			<div>
				<span>
					<PlainButton
						data-test="card-linker-action"
						onClick={this.toggleMenu}
						tooltip={{
							placement: 'left',
							text: `Manage links for this ${typeName}`,
						}}
					>
						<Icon name="bezier-curve" />
					</PlainButton>

					{this.state.showMenu && (
						<ContextMenu position="bottom" onClose={this.toggleMenu}>
							<ActionButton
								plain
								onClick={this.openLinkModal}
								data-test="card-linker-action--existing"
							>
								Link to existing element
							</ActionButton>

							<ActionButton
								plain
								onClick={this.openCreateChannel}
								data-test="card-linker-action--new"
							>
								Create a new element to link to
							</ActionButton>

							<ActionButton
								plain
								onClick={this.openUnlinkModal}
								data-test="card-linker-action--unlink"
							>
								Unlink from existing element
							</ActionButton>
						</ContextMenu>
					)}
				</span>

				{showLinkModal === 'link' && (
					<LinkModal
						cards={[card]}
						targetTypes={types}
						onHide={this.hideLinkModal}
					/>
				)}

				{showLinkModal === 'unlink' && (
					<UnlinkModal cards={[card]} onHide={this.hideLinkModal} />
				)}
			</div>,
		);
	}
}

const collect = (connector, monitor) => {
	return {
		connectDragSource: connector.dragSource(),
		isDragging: monitor.isDragging(),
	};
};

const cardSource = {
	beginDrag(props) {
		return props.card;
	},
};

const DragSourceCardLinker = DragSource(
	'channel',
	cardSource,
	collect,
)(CardLinker);

// TypeScript doesn't know how to handle DragSource as an input to redux's connect() function
// so we just wrap it in a simple functional component.
export default (props) => <DragSourceCardLinker {...props} />;
