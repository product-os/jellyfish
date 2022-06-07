import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from 'rendition';
import styled from 'styled-components';
import { useSetup } from './SetupProvider';
import * as selectors from '../store/selectors';
import { Contract } from '@balena/jellyfish-types/build/core';
import { JellyfishCursor } from '@balena/jellyfish-client-sdk/build/cursor';
import _ from 'lodash';
import { actionCreators } from '../store';

const getFontSize = (text: any) => {
	if (text.length === 1) {
		return 14;
	}

	if (text.length === 2) {
		return 12;
	}

	return 10;
};

const Container = styled(Box)`
	background: rgb(255, 197, 35);
	color: white;
	width: auto;
	min-width: 18px;
	height: 18px;
	padding: 0px 4px;
	border-radius: 18px;
	transform: translateX(6px);
	display: inline-flex;
	justify-content: center;
	align-items: center;
	font-weight: bold;
	font-size: ${(props) => {
		return getFontSize(props.children);
	}}px;
`;

const MentionsCount = () => {
	const { sdk } = useSetup()!;
	const [mentions, setMentions] = React.useState<Contract[]>([]);
	const inboxQuery = useSelector(selectors.getInboxQuery());
	const dispatch = useDispatch();

	React.useEffect(() => {
		dispatch(actionCreators.setMentionsCount(mentions.length));
	}, [mentions.length]);

	React.useEffect(() => {
		let cursor: JellyfishCursor;

		(async () => {
			cursor = sdk.getCursor(inboxQuery, {
				limit: 100,
			});

			const results = await cursor.query();
			setMentions(results);

			cursor.onUpdate(((response: {
				data: { type: any; id: any; after: any };
			}) => {
				const { id, after } = response.data;

				// If card is null then it has been set to inactive or deleted
				if (after === null) {
					setMentions((prevState) => {
						return prevState.filter((contract) => contract.id !== id);
					});
					return;
				}

				// Otherwise perform an upsert
				setMentions((prevState) => {
					const exists = _.some(prevState, { id });

					// If an item is found we don't need to do anything, because count is the same
					if (exists) {
						return prevState;
					}
					// Otherwise add it to the results
					return prevState ? prevState.concat(after) : [after];
				});
			}) as any);
		})();

		return () => {
			cursor.close();
		};
	}, []);

	if (!mentions.length) {
		return null;
	}

	return (
		<Container
			style={{
				position: 'absolute',
				left: '30px',
				bottom: '10px',
			}}
			tooltip={`${mentions.length} notifications`}
			data-test="homechannel-mentions-count"
		>
			{mentions.length >= 100 ? '99+' : mentions.length}
		</Container>
	);
};

export default MentionsCount;
