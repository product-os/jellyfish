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
	UserAvatarLive,
} from '../';

const NAME_MAX_LENGTH = 30;

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

	truncateName(name: string) {
		if (name.length > NAME_MAX_LENGTH) {
			return `${name.substring(0, NAME_MAX_LENGTH - 1)}...`;
		}
		return name;
	}

	render() {
		const { isHomeView, activeSlice, card, isActive, user } = this.props;
		const bookmarked = this.isBookmarked();
		const isCustomView = helpers.isCustomView(card, user.slug);

		let label = this.props.label;

		const isDM = card.data.dms && card.data.actors;

		if (isDM) {
			label = card.data.actors
				.filter((actor) => actor !== user.slug)
				.map((actor) => actor.replace('user-', ''))
				.join(', ');
		}

		// Truncate name and set tooltip if necessary
		let name = label || card.name || card.slug;
		let tooltip = '';
		if (name.length > NAME_MAX_LENGTH) {
			tooltip = name;
			name = this.truncateName(name);
		}

		return (
			<Box tooltip={{ text: tooltip, placement: 'right' }}>
				<Flex
					justifyContent="space-between"
					bg={isActive && !activeSlice ? '#eee' : 'none'}
				>
					{
						// Todo: Resolve the broken typing on ActionRouterLink
						// @ts-ignore
						<ActionRouterLink
							data-test={`home-channel__item--${card.slug}`}
							key={card.id}
							pl={3}
							pr={isActive ? 0 : 3}
							color="#333"
							to={`/${card.slug || card.id}`}
						>
							<Flex justifyContent="space-between" alignItems="center">
								<Flex>
									{isDM &&
										card.data.actors.map((slug) => {
											if (slug === user.slug) {
												return null;
											}
											return <UserAvatarLive key={slug} mr={2} userId={slug} />;
										})}

									{name}
								</Flex>

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
