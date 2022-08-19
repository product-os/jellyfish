import React from 'react';
import * as _ from 'lodash';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { Flex, DropDownButton, Button } from 'rendition';
import styled from 'styled-components';
import { ActionLink, Icon, Setup } from '../../../components';
import type { BoundActionCreators, ChannelContract } from '../../../types';
import { actionCreators, getSeedData } from '../../../store';
import type { Contract, TypeContract, UserContract } from 'autumndb';
import type { ChannelContextProps } from '../../../hooks/channel-context';
import * as helpers from '../../../services/helpers';
import * as notifications from '../../../services/notifications';
import { RelationshipContract } from 'autumndb';

const Footer = styled(Flex)`
	position: absolute;
	bottom: 16px;
	right: 16px;
	z-index: 9;
`;

const DropUpButton = styled(DropDownButton).attrs({
	dropUp: true,
})`
	& > div:last-child {
		max-height: 80vh;
	}
`;
const isSynchronous = (type: TypeContract) => {
	return type.slug === 'thread';
};

const cardReference = (contract: Contract) => {
	return contract.slug ? `${contract.slug}@${contract.version}` : contract.id;
};

const ButtonLabel: any = ({
	type,
	isBusy,
}: {
	type: TypeContract;
	isBusy: boolean;
}) => {
	return isBusy ? <Icon spin name="cog" /> : `Add ${type.name || type.slug}`;
};

export interface StateProps {
	user: UserContract;
	relationships: RelationshipContract[];
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
	relationships,
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
						const headTypeBase = helpers.getTypeBase(head.type);
						const match = _.first(
							helpers.findRelationships(relationships, headTypeBase, type.slug),
						);

						if (match) {
							const { isInverse, relationship } = match;
							await sdk.card.link(
								newCard,
								head,
								isInverse ? relationship.data.inverseName! : relationship.name!,
							);
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
		<Footer flex={0} mr={1} {...rest} justifyContent="flex-end">
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
					width={38}
					data-test={`viewfooter__add-btn--${types[0].slug}`}
					onClick={() => {
						handleAsyncError(onAddCard(types[0]));
					}}
					tooltip={{
						text: `Add ${types[0].name || types[0].slug}`,
						placement: 'left',
					}}
					icon={isBusy ? <Icon spin name="cog" /> : <Icon name="plus" />}
				/>
			)}
		</Footer>
	);
};
