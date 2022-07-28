import _ from 'lodash';
import React from 'react';
import { Box, Divider, Flex } from 'rendition';
import type {
	Contract,
	JsonSchema,
	UserContract,
	ViewContract,
} from 'autumndb';
import {
	ActionLink,
	CloseButton,
	UserAvatarLive,
} from '../../../../components';
import * as helpers from '../../../../services/helpers';
import CardActions from '../../../../components/CardActions';
import Markers from '../../../../components/Markers';
import type { ChannelContract } from '../../../../types';
import CSVDownloadModal from '../../../../components/CSVDownloadModal';

interface HeaderProps {
	channel: ChannelContract;
	contract: ViewContract;
	isMobile: boolean;
	results?: null | Contract[];
	query: JsonSchema | null;
	user: UserContract;
}

export default React.memo<HeaderProps>((props: HeaderProps) => {
	const { channel, query, contract, user } = props;

	if (!contract) {
		return null;
	}

	const [displayCSVModal, setDisplayCSVModal] = React.useState(false);

	const participants = React.useMemo(() => {
		return (contract?.data?.actors as string[]).filter(
			(slug) => slug !== user.slug,
		);
	}, [contract]);

	return (
		<Box>
			<Flex
				p={3}
				pb={0}
				flexDirection={['column-reverse', 'column-reverse', 'row']}
				justifyContent="space-between"
				alignItems="center"
			>
				<Box>
					{participants.map((slug) => {
						return (
							<Flex>
								<UserAvatarLive mr={2} userId={slug} />
								{slug.replace('user-', '')}
							</Flex>
						);
					})}
					<Markers px={0} card={contract} />
				</Box>
				<Flex alignSelf={['flex-end', 'flex-end', 'flex-start']}>
					<CardActions card={contract}>
						<ActionLink onClick={() => setDisplayCSVModal(true)}>
							Download results as CSV
						</ActionLink>
					</CardActions>

					<CloseButton
						flex={0}
						p={3}
						py={2}
						mr={-2}
						mt={[-2, -2, 0]}
						channel={channel}
					/>
				</Flex>
			</Flex>

			<Divider width="100%" color={helpers.colorHash('view')} />

			{displayCSVModal && !!query && (
				<CSVDownloadModal
					query={query}
					onDone={() => setDisplayCSVModal(false)}
				/>
			)}
		</Box>
	);
});
