import _ from 'lodash';
import React from 'react';
import { Box, Divider, Flex, Txt } from 'rendition';
import type {
	Contract,
	ViewContract,
} from '@balena/jellyfish-types/build/core';
import { ActionLink, CloseButton } from '../../../../components';
import * as helpers from '../../../../services/helpers';
import CardActions from '../../../../components/CardActions';
import Markers from '../../../../components/Markers';
import type { ChannelContract } from '../../../../types';
import CSVDownloadModal from '../../../../components/CSVDownloadModal';
import type { JsonSchema } from '@balena/jellyfish-types';

interface HeaderProps {
	channel: ChannelContract;
	contract: ViewContract;
	isMobile: boolean;
	results?: null | Contract[];
	query: JsonSchema | null;
}

export default React.memo<HeaderProps>((props: HeaderProps) => {
	const { channel, query, contract } = props;

	if (!contract) {
		return null;
	}

	const [displayCSVModal, setDisplayCSVModal] = React.useState(false);

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
					{contract.name && <Txt bold>{contract.name}</Txt>}
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
