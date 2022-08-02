/* tslint:disable no-floating-promises */
import React from 'react';
import _ from 'lodash';
import * as notifications from '../../services/notifications';
import * as helpers from '../../services/helpers';
import {
	ActionLink,
	ContextMenu,
	Icon,
	PlainButton,
	UserAvatarLive,
} from '../';
import { Contract, JsonSchema, TypeContract, UserContract } from 'autumndb';
import { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { useCursorEffect } from '../../hooks';

interface Props {
	card: Contract;
	sdk: JellyfishSDK;
	types: TypeContract[];
	user: UserContract;
}

const CardOwner = (props: Props) => {
	const [isChangingOwner, setIsChangingOwner] = React.useState(false);
	const [showMenu, setShowMenu] = React.useState(false);
	const [owner, setOwner] = React.useState<UserContract | null>(null);
	const { card, sdk, types, user } = props;
	const cardTypeName = helpers.getType(card.type, types).name;
	const query: JsonSchema = React.useMemo(() => {
		return {
			type: 'object',
			properties: {
				id: {
					const: card.id,
				},
			},
			$$links: {
				'is owned by': {
					type: 'object',
					properties: {
						type: {
							const: 'user@1.0.0',
						},
					},
				},
			},
		};
	}, [card]);

	// TODO: Simplify this streaming logic.
	// Streaming the link between contract and contract owner is
	// necessary due to a bug in AutumnDB that means there are no events
	// emitted for subsequent links of the same name
	// See https://github.com/product-os/autumndb/pull/1419
	const linkQuery: JsonSchema = React.useMemo(() => {
		return {
			type: 'object',
			properties: {
				type: {
					const: 'link@1.0.0',
				},
				name: {
					const: 'is owned by',
				},
				active: {
					const: true,
				},
				data: {
					type: 'object',
					properties: {
						from: {
							type: 'object',
							properties: {
								id: {
									const: card.id,
								},
							},
						},
						to: {
							type: 'object',
							properties: {
								type: {
									const: 'user@1.0.0',
								},
							},
						},
					},
				},
			},
		};
	}, [card]);

	const [[link]] = useCursorEffect(linkQuery);

	React.useEffect(() => {
		sdk
			.query(query)
			.then((result) => {
				if (result.length > 0) {
					setOwner(
						(result[0]?.links?.['is owned by'][0] as UserContract) || null,
					);
				} else {
					setOwner(null);
				}
			})
			.catch(console.error);
	}, [link]);

	const assignToMe = React.useCallback(async () => {
		setIsChangingOwner(true);

		try {
			if (owner) {
				await sdk.card.unlink(card, owner, 'is owned by');
			}

			await sdk.card.link(card, user, 'is owned by');

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

		setIsChangingOwner(false);
	}, [owner, card, sdk, types, user]);

	const unassign = React.useCallback(async () => {
		setIsChangingOwner(true);

		try {
			if (owner) {
				await sdk.card.unlink(card, owner, 'is owned by');

				notifications.addNotification('success', `Unassigned ${cardTypeName}`);
			}
		} catch (err) {
			notifications.addNotification(
				'danger',
				`Failed to unassign ${cardTypeName}`,
			);
			console.error('Failed to create link', err);
		}

		setIsChangingOwner(false);
	}, [owner, card, sdk, types]);

	const toggleMenu = React.useCallback(() => {
		setShowMenu(!showMenu);
	}, [showMenu]);

	if (isChangingOwner) {
		return <PlainButton px={10} icon={<Icon name="cog" spin />} />;
	}

	if (!owner) {
		return (
			<PlainButton
				onClick={assignToMe}
				tooltip={{
					text: `This ${cardTypeName} is unassigned. Assign it to me`,
					placement: 'left',
				}}
				icon={<Icon name="user-plus" />}
			/>
		);
	}

	return (
		<span>
			<PlainButton p={'4px'} px={2} onClick={toggleMenu}>
				<UserAvatarLive
					userId={owner.id}
					tooltipPlacement="left"
					tooltipText={`${helpers.userDisplayName(
						owner as UserContract,
					)} owns this ${cardTypeName}`}
				/>
			</PlainButton>

			{showMenu && (
				<ContextMenu position="bottom" onClose={toggleMenu}>
					{owner && owner.id !== user.id && (
						<ActionLink
							onClick={assignToMe}
							data-test="card-owner-menu__assign-to-me"
						>
							Assign to me
						</ActionLink>
					)}

					{owner && (
						<ActionLink
							onClick={unassign}
							data-test="card-owner-menu__unassign"
						>
							Unassign
						</ActionLink>
					)}
				</ContextMenu>
			)}
		</span>
	);
};

export default CardOwner;
