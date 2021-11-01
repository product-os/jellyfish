import * as React from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuid } from 'uuid';
import uniq from 'lodash/uniq';
import { Badge, Box, Button } from 'rendition';
import styled from 'styled-components';
import { Icon, useSetup } from '@balena/jellyfish-ui-components';
import type { JSONSchema, core } from '@balena/jellyfish-types';
import { selectors } from '../../core';

const StyledBadge = styled(Badge)`
	position: absolute;
	top: -8px;
	left: 10px;
	transform: scale(0.7);
	pointer-events: none;
`;

const Container = styled(Box)`
	position: relative;
	display: inline-block;
`;

export const ChatButton = ({ onClick, ...rest }) => {
	const { sdk } = useSetup()!;
	const [notifications, setNotifications] = React.useState<null | any[]>(null);
	const currentUser = useSelector<any, core.UserContract>(
		selectors.getCurrentUser,
	);

	React.useEffect(() => {
		let stream: any = null;

		(async () => {
			const query: JSONSchema = {
				type: 'object',
				required: ['type'],
				properties: {
					type: {
						const: 'notification@1.0.0',
					},
				},
				$$links: {
					'is attached to': {
						type: 'object',
						required: ['type'],
						properties: {
							type: {
								const: 'message@1.0.0',
							},
						},
						$$links: {
							'is attached to': {
								required: ['type', 'data'],
								properties: {
									type: {
										const: 'support-thread@1.0.0',
									},
									data: {
										type: 'object',
										required: ['product'],
										properties: {
											product: {
												const: 'jellyfish',
											},
										},
									},
								},
							},
						},
					},
				},
				not: {
					$$links: {
						'is read by': {
							type: 'object',
							required: ['type', 'id'],
							properties: {
								type: {
									const: 'user@1.0.0',
								},
								id: {
									const: currentUser.id,
								},
							},
						},
					},
				},
			};

			stream = sdk.stream(query);

			stream.on('dataset', ({ data: { cards } }) => {
				setNotifications(cards);
			});

			stream.on('update', ({ data: { id, type, after: card } }) => {
				if (type === 'insert' || type === 'update') {
					setNotifications((existingNotifications) => {
						return uniq(existingNotifications!.concat(card));
					});
				} else if (type === 'unmatch') {
					setNotifications((existingNotifications) => {
						return existingNotifications!.filter((existingNotification) => {
							return existingNotification.id !== id;
						});
					});
				}
			});

			stream.emit('queryDataset', {
				id: uuid(),
				data: {
					schema: query,
				},
			});
		})();

		return () => {
			if (stream) {
				stream.close();
			}
		};
	}, [sdk, currentUser.id]);

	return (
		<Container {...rest}>
			<Button
				ml={2}
				plain
				icon={<Icon name="comment-alt" />}
				data-test="open-chat-widget"
				onClick={onClick}
				tooltip={{
					placement: 'right',
					text: 'Open the JellyFish support chat',
				}}
			/>
			{Boolean(notifications && notifications.length) && (
				<StyledBadge shade={5}>{notifications!.length.toString()}</StyledBadge>
			)}
		</Container>
	);
};
