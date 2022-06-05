import React from 'react';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { Flex, DropDownButton, Button } from 'rendition';
import styled from 'styled-components';
import { linkConstraints } from '@balena/jellyfish-client-sdk';
import { ActionLink, Icon, Setup } from '../../../components';
import { BoundActionCreators, ChannelContract } from '../../../types';
import { actionCreators, getSeedData } from '../../../store';
import { TypeContract, UserContract } from '@balena/jellyfish-types/build/core';
import type { ChannelContextProps } from '../../../hooks/channel-context';
import * as helpers from '../../../services/helpers';
import * as notifications from '../../../services/notifications';

const Footer = styled(Flex)`
	border-top: 1px solid #eee;
`;

const DropUpButton = styled(DropDownButton).attrs({
	dropUp: true,
})`
	& > div:last-child {
		max-height: 80vh;
	}
`;
const isSynchronous = (type) => {
	return type.slug === 'thread';
};

const cardReference = (contract) => {
	return contract.slug ? `${contract.slug}@${contract.version}` : contract.id;
};

const ButtonLabel: any = ({ type, isBusy }) => {
	return isBusy ? <Icon spin name="cog" /> : `Add ${type.name || type.slug}`;
};

export interface StateProps {
	user: UserContract;
}

export interface DispatchProps {
	actions: BoundActionCreators<typeof actionCreators>;
}

export interface OwnProps {
	types: TypeContract[];
	channel: ChannelContract;
}

type Props = StateProps &
	OwnProps &
	DispatchProps &
	ChannelContextProps &
	Setup;

export const ViewFooter: React.FunctionComponent<Props> = ({
	channelData,
	types,
	user,
	actions,
	errorReporter: { handleAsyncError },
	sdk,
	analytics,
	...rest
}) => {
	const [isBusy, setIsBusy] = React.useState(false);

	const handleButtonClick = React.useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();
			handleAsyncError(onAddCard(types[0]));
		},
		[types],
	);

	const onAddCard = React.useCallback(
		async (type) => {
			setIsBusy(true);
			const { head } = channelData;
			const options = {
				synchronous: isSynchronous(type),
			};
			if (head) {
				if (options.synchronous) {
					const cardData = _.merge(
						{
							slug: `${type.slug}-${uuid()}`,
							type: type.slug,
							data: {},
						},
						getSeedData(head, user),
					);

					try {
						const newCard = await sdk.card.create(cardData);
						const current = head.slug;
						const newPath = path.join(
							window.location.pathname.split(current)[0],
							current,
							cardReference(newCard),
						);
						actions.pushLocation(newPath);
						const linkConstraint = _.find(linkConstraints, {
							data: {
								from: type.slug,
								to: helpers.getTypeBase(head.type),
							},
						});
						if (linkConstraint) {
							await sdk.card.link(newCard, head, linkConstraint.name);
						}
						analytics.track('element.create', {
							element: {
								type: cardData.type,
							},
						});
					} catch (error: any) {
						notifications.addNotification('danger', error.message);
					}
				} else {
					actions.openCreateChannel(head, _.castArray(type));
				}
			}

			setIsBusy(false);
		},
		[channelData.head, types],
	);

	return (
		<Footer flex={0} p={3} {...rest} justifyContent="flex-end">
			{types.length > 1 ? (
				<DropUpButton
					alignRight
					disabled={isBusy}
					success
					data-test="viewfooter__add-dropdown"
					onClick={handleButtonClick}
					label={<ButtonLabel isBusy={isBusy} type={types[0]} />}
				>
					{types.slice(1).map((type) => (
						<ActionLink
							key={type.slug}
							data-test={`viewfooter__add-link--${type.slug}`}
							onClick={() => {
								handleAsyncError(onAddCard(type));
							}}
						>
							Add {type.name || type.slug}
						</ActionLink>
					))}
				</DropUpButton>
			) : (
				<Button
					disabled={isBusy}
					success
					data-test={`viewfooter__add-btn--${types[0].slug}`}
					onClick={() => {
						handleAsyncError(onAddCard(types[0]));
					}}
				>
					<ButtonLabel isBusy={isBusy} type={types[0]} />
				</Button>
			)}
		</Footer>
	);
};
