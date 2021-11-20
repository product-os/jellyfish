import React from 'react';
import _ from 'lodash';
import path from 'path';
import { Txt, DropDownButton } from 'rendition';
import styled from 'styled-components';
import {
	ActionLink,
	Icon,
	notifications,
	helpers,
} from '@balena/jellyfish-ui-components';

const OwnerTxt = styled(Txt.span)`
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 120px;
`;

export default class CardOwner extends React.Component<any, any> {
	constructor(props) {
		super(props);
		this.assignToMe = this.assignToMe.bind(this);
		this.unassign = this.unassign.bind(this);
		this.openOwnerChannel = this.openOwnerChannel.bind(this);
		this.handleButtonClick = this.handleButtonClick.bind(this);

		this.state = {
			isChangingOwner: false,
		};
	}

	async assignToMe() {
		const { cardOwner, card, sdk, types, user } = this.props;
		const cardTypeName = helpers.getType(card.type, types).name;
		this.setState({ isChangingOwner: true });

		try {
			if (cardOwner) {
				await sdk.card.unlink(card, cardOwner, 'is owned by');
			}

			await sdk.card.link(card, user, 'is owned by');

			this.props.updateCardOwnerCache(user);

			notifications.addNotification(
				'success',
				`${cardTypeName} assigned to me`,
			);
		} catch (err) {
			notifications.addNotification(
				'danger',
				`Failed to assign ${cardTypeName}`,
			);
			console.error('Failed to create link', err);
		}

		this.setState({ isChangingOwner: false });
	}

	async unassign() {
		const { cardOwner, card, sdk, types } = this.props;
		const cardTypeName = helpers.getType(card.type, types).name;
		this.setState({ isChangingOwner: true });

		try {
			if (cardOwner) {
				await sdk.card.unlink(card, cardOwner, 'is owned by');

				this.props.updateCardOwnerCache(null);

				notifications.addNotification('success', `Unassigned ${cardTypeName}`);
			}
		} catch (err) {
			notifications.addNotification(
				'danger',
				`Failed to unassign ${cardTypeName}`,
			);
			console.error('Failed to create link', err);
		}

		this.setState({ isChangingOwner: false });
	}

	openOwnerChannel() {
		const { cardOwner, history } = this.props;

		history.push(path.join(window.location.pathname, cardOwner.slug));
	}

	handleButtonClick(event) {
		event.preventDefault();
		event.stopPropagation();

		const { cardOwner } = this.props;

		if (cardOwner) {
			this.openOwnerChannel();
		} else {
			this.assignToMe();
		}
	}

	render() {
		const { card, cardOwner, types, user } = this.props;
		const { isChangingOwner } = this.state;

		const cardTypeName = helpers.getType(card.type, types).name;

		return (
			<DropDownButton
				data-test="card-owner-dropdown"
				px={2}
				tertiary={cardOwner && cardOwner.id === user.id}
				quartenary={cardOwner && cardOwner.id !== user.id}
				onClick={this.handleButtonClick}
				label={
					isChangingOwner ? (
						<Icon name="cog" spin />
					) : cardOwner ? (
						<OwnerTxt
							bold
							data-test="card-owner-dropdown__label--assigned"
							tooltip={{
								text: `${helpers.userDisplayName(
									cardOwner,
								)} owns this ${cardTypeName}`,
								placement: 'bottom',
							}}
						>
							{helpers.userDisplayName(cardOwner)}
						</OwnerTxt>
					) : (
						<OwnerTxt
							bold
							italic
							data-test="card-owner-dropdown__label--assign-to-me"
							tooltip={{
								text: `This ${cardTypeName} is unassigned. Assign it to me`,
								placement: 'bottom',
							}}
						>
							Assign to me
						</OwnerTxt>
					)
				}
			>
				{cardOwner && cardOwner.id !== user.id && (
					<ActionLink
						mx={-3}
						onClick={this.assignToMe}
						data-test="card-owner-menu__assign-to-me"
					>
						Assign to me
					</ActionLink>
				)}

				{cardOwner && (
					<ActionLink
						mx={-3}
						onClick={this.unassign}
						data-test="card-owner-menu__unassign"
					>
						Unassign
					</ActionLink>
				)}
			</DropDownButton>
		);
	}
}
