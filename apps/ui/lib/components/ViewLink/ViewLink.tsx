import { circularDeepEqual } from 'fast-equals';
import React from 'react';
import _ from 'lodash';
import { Button, Box, Flex, Modal } from 'rendition';
import * as helpers from '../../services/helpers';
import * as notifications from '../../services/notifications';
import {
	ActionButton,
	ActionRouterLink,
	ContextMenu,
	Icon,
	MentionsCount,
} from '../';

export default class ViewLink extends React.Component<any, any> {
	constructor(props) {
		super(props);

		this.state = {
			showDeleteModal: false,
			showMenu: false,
		};

		this.setDefault = this.setDefault.bind(this);
		this.toggleMenu = this.toggleMenu.bind(this);
		this.removeView = this.removeView.bind(this);
		this.showDeleteModal = this.showDeleteModal.bind(this);
		this.hideDeleteModal = this.hideDeleteModal.bind(this);
		this.toggleBookmark = this.toggleBookmark.bind(this);
	}

	isBookmarked() {
		const bookmarks = _.get(this.props.card, ['links', 'is bookmarked by'], []);
		return _.find(bookmarks, {
			id: this.props.user.id,
		});
	}

	toggleMenu(event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		this.setState({
			showMenu: !this.state.showMenu,
		});
	}

	showDeleteModal() {
		this.setState({
			showDeleteModal: true,
		});
	}

	hideDeleteModal() {
		this.setState({
			showDeleteModal: false,
		});
	}

	async toggleBookmark() {
		const { sdk, user, card } = this.props;
		if (this.isBookmarked()) {
			await sdk.card.unlink(card, user, 'is bookmarked by');
			notifications.addNotification('success', 'Removed bookmark');
		} else {
			await sdk.card.link(card, user, 'is bookmarked by');
			notifications.addNotification('success', 'Added bookmark');
		}
	}

	setDefault() {
		const { actions, card, isHomeView } = this.props;
		actions.setDefault(isHomeView ? null : card);
	}

	removeView() {
		this.hideDeleteModal();
		this.props.actions.removeView(this.props.card);
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (
			!circularDeepEqual(nextState, this.state) ||
			!circularDeepEqual(nextProps, this.props)
		);
	}

	render() {
		const { label, isHomeView, activeSlice, card, isActive, user, update } =
			this.props;
		const bookmarked = this.isBookmarked();
		const isCustomView = helpers.isCustomView(card, user.slug);

		return (
			<Box>
				<Flex justifyContent="space-between">
					{
						// Todo: Resolve the broken typing on ActionRouterLink
						// @ts-ignore
						<ActionRouterLink
							data-test={`home-channel__item--${card.slug}`}
							key={card.id}
							pl={3}
							pr={isActive ? 0 : 3}
							to={`/${card.slug || card.id}`}
						>
							<Flex justifyContent="space-between" alignItems="center">
								{label || card.name || card.slug}
								{isHomeView && (
									<Box
										fontSize="80%"
										color="gray.dark"
										mx={2}
										tooltip="Default view"
									>
										<Icon name="home" />
									</Box>
								)}
								{Boolean(update) && (
									<MentionsCount mr={2}>{update}</MentionsCount>
								)}
							</Flex>
						</ActionRouterLink>
					}
					{isActive && (
						<Button
							data-test="view-link--context-menu-btn"
							pr={3}
							pl={1}
							plain
							onClick={this.toggleMenu}
							icon={<Icon name="ellipsis-v" />}
						/>
					)}
					{this.state.showMenu && (
						<ContextMenu position="left" onClose={this.toggleMenu}>
							<ActionButton
								plain
								data-test="view-link--set-default-btn"
								tooltip={{
									text: `${
										isHomeView ? 'Unset' : 'Set'
									} this view as the default page when logging in`,
									containerStyle: {
										maxWidth: '400px',
									},
								}}
								onClick={this.setDefault}
							>
								{`${isHomeView ? 'Unset' : 'Set'} as default`}
							</ActionButton>
							<ActionButton
								plain
								data-test="view-link--bookmark-btn"
								onClick={this.toggleBookmark}
							>
								{bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
							</ActionButton>
							{isCustomView && (
								<ActionButton
									plain
									data-test="view-link--delete-view-btn"
									tooltip="Delete this view"
									onClick={this.showDeleteModal}
								>
									Delete custom view
								</ActionButton>
							)}
						</ContextMenu>
					)}
				</Flex>

				{this.state.showDeleteModal && (
					<Modal
						title="Are you sure you want to delete this view?"
						cancel={this.hideDeleteModal}
						done={this.removeView}
						action="Yes"
						primaryButtonProps={
							{
								'data-test': 'view-delete__submit',
							} as any
						}
					/>
				)}
			</Box>
		);
	}
}
