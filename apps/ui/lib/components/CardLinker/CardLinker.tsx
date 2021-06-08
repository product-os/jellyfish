/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash';
import React from 'react';
import { DragSource } from 'react-dnd';
import { linkConstraints as LINKS } from '@balena/jellyfish-client-sdk';
import {
	ActionButton,
	ContextMenu,
	PlainButton,
	Icon,
} from '@balena/jellyfish-ui-components';
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
		this.openVisualizeChannel = this.openVisualizeChannel.bind(this);
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
					loop: this.props.card.loop,
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

	openVisualizeChannel() {
		this.props.actions.addChannel({
			head: {
				card: this.props.card,
			},
			format: 'visualizeLinks',
			canonical: false,
		});
	}

	getAvailableTypes() {
		const { card, types } = this.props;

		const availableTypes = types.filter((type) => {
			return _.find(LINKS, {
				data: {
					from: card.type.split('@')[0],
				},
			});
		});

		return availableTypes;
	}

	render() {
		const { card, connectDragSource, types } = this.props;
		const { showLinkModal } = this.state;

		const type = card.type.split('@')[0];

		if (
			!_.some(LINKS, ['data.from', card.type]) &&
			!_.some(LINKS, ['data.from', type])
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

							<ActionButton
								plain
								onClick={this.openVisualizeChannel}
								data-test="card-linker-action--visualize"
							>
								Visualize links
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

export default DragSource('channel', cardSource, collect)(CardLinker);
