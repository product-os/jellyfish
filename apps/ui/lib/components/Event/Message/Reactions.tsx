import React, { useMemo } from 'react';
import emoji from 'node-emoji';
import styled from 'styled-components';
import { Button } from 'rendition';
import { useSetup } from '../../SetupProvider';
import { selectors } from '../../../store';
import { useSelector } from 'react-redux';
import { Contract } from 'autumndb';

const Emoji = ({ symbol, ...rest }) => {
	const em = React.useMemo(() => {
		return emoji.emojify(symbol);
	}, [symbol]);

	return <div {...rest}>{em}</div>;
};

const EmojiButton = styled(Button)`
	border-radius: 4px;
	&:hover {
		background: #eeeeee !important;
	}
`;

export const Reactions = ({ message }) => {
	const currentUser = useSelector(selectors.getCurrentUser());
	const [groupReactions, setGroupReactions] = React.useState({});
	const { sdk } = useSetup()!;

	const reactions = useMemo(
		() =>
			message.links?.['has attached element']?.filter((contract) => {
				return contract.type === 'reaction@1.0.0';
			}),
		[message],
	);

	React.useEffect(() => {
		(async () => {
			if (!reactions) {
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
						enum: reactions.map((reactionContract) => reactionContract.id),
					},
				},
			});

			const result = reactionsArray.reduce((map, reactionContract) => {
				const symbol = reactionContract.data.reaction as string;
				map[symbol] = map[symbol] || [];
				map[symbol].push(reactionContract);
				return map;
			}, {} as { [key: string]: Contract[] });

			setGroupReactions(result);
		})();
	}, [reactions]);

	const onClick = React.useCallback(
		async (symbol) => {
			const reactionByCurrentUser = currentUser
				? (groupReactions ?? {})[symbol]?.filter(
						(eachReaction) =>
							eachReaction.links?.['was created by']?.[0].id ===
							currentUser['id'],
				  )
				: null;

			if (symbol in (groupReactions ?? {}) && reactionByCurrentUser) {
				return;
			}
			await sdk.card.create({
				type: 'reaction',
				data: {
					reaction: symbol,
				},
				links: {
					'is attached to': [message],
				},
			});
		},
		[message, groupReactions],
	);

	return (
		<div flex-wrap="wrap">
			{[
				':+1:',
				':heart:',
				':100:',
				':smile:',
				':pensive:',
				':sunglasses:',
				':rocket:',
				':thinking_face:',
				':smirk:',
				':face_with_rolling_eyes:',
				':face_palm:',
				':scream:',
				':smiling_face_with_tear:',
				':grimacing:',
				':eyes:',
				':point_up_2:',
				':crossed_fingers:',
				':wave:',
				':raised_hand:',
				':raised_hands:',
				':muscle:',
			].map((symbol, i) => {
				return (
					<EmojiButton
						p={1}
						mx={1}
						onClick={() => onClick(symbol)}
						plain
						key={i}
					>
						<Emoji symbol={symbol} />
					</EmojiButton>
				);
			})}
		</div>
	);
};
