import React, { useMemo } from 'react';
import emoji from 'node-emoji';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { Button, Txt, useRequest } from 'rendition';
import { useSetup } from '../../SetupProvider';
import { selectors } from '../../../store';
import { Contract } from 'autumndb';
import _ from 'lodash';

const Emoji = ({ symbol, count, ...rest }) => {
	const em = React.useMemo(() => {
		return emoji.emojify(symbol);
	}, [symbol]);

	return (
		<Txt {...rest}>
			{em}
			<span>{count}</span>
		</Txt>
	);
};

const Wrapper = styled.section`
	display: flex;
	flex-direction: row;
	align-content: space-between;
	width: 200px;
`;

export const DisplayReactions = ({ message }: { message: Contract }) => {
	const currentUser = useSelector(selectors.getCurrentUser());
	const { sdk } = useSetup()!;

	const reactions = useMemo(
		() =>
			message.links?.['has attached element']?.filter((contract) => {
				return contract.type === 'reaction@1.0.0';
			}),
		[message],
	);

	const [groupReactions, , , forcePoll] = useRequest(
		async () => {
			if (!reactions || _.isEmpty(reactions)) {
				return {} as { [key: string]: Contract[] };
			}

			const reactionsIds = reactions.map(
				(reactionContract) => reactionContract.id,
			);
			// Avoid querying with an empty enum below
			if (!reactionsIds || _.isEmpty(reactionsIds)) {
				return {} as { [key: string]: Contract[] };
			}
			const reactionsArray = await sdk.query({
				type: 'object',
				$$links: {
					'was created by': {
						type: 'object',
					},
				},
				properties: {
					id: {
						enum: reactionsIds,
					},
				},
			});
			return reactionsArray.reduce((map, reactionContract) => {
				const symbol = reactionContract.data.reaction as string;
				map[symbol] = map[symbol] || [];
				map[symbol].push(reactionContract);
				return map;
			}, {} as { [key: string]: Contract[] });
		},
		[reactions],
		{ polling: true },
	);

	// TODO: Remove this workaround when this is resolved
	// https://github.com/product-os/autumndb/issues/1333

	const handleClick = React.useCallback(
		async (symbol) => {
			const reactionByCurrentUser = currentUser
				? (groupReactions ?? {})[symbol].find(
						(reaction) =>
							reaction.links?.['was created by']?.[0].id === currentUser['id'],
				  )
				: null;
			if ((groupReactions ?? {})[symbol] && reactionByCurrentUser) {
				await sdk.card.remove(
					reactionByCurrentUser.id,
					reactionByCurrentUser.type,
				);
			} else {
				const newReaction = await sdk.card.create({
					type: 'reaction',
					name: symbol,
					data: {
						reaction: symbol,
					},
				});

				await sdk.card.link(message, newReaction, 'has attached element');
			}
			forcePoll();
		},
		[groupReactions, message],
	);
	if (!Object.entries(groupReactions ?? {}).length) {
		return null;
	}

	return (
		<Wrapper>
			{Object.entries(groupReactions ?? {}).map(
				([symbol, reactionsContract], i) => {
					return (
						<Button
							key={i}
							onClick={() => handleClick(symbol)}
							py={0}
							px={2}
							mr={1}
							mt={2}
							style={{ height: 26 }}
							tooltip={{
								placement: 'bottom',
								text: reactionsContract
									.map((user) =>
										user.links?.['was created by']?.[0].slug.slice(5),
									)
									.join(', '),
							}}
						>
							<Emoji symbol={symbol} count={reactionsContract.length} />
						</Button>
					);
				},
			)}
		</Wrapper>
	);
};
