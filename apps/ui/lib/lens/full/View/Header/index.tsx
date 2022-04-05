import _ from 'lodash';
import React from 'react';
import { CSVLink } from 'react-csv';
import { Box, Divider, Flex, Search, Txt } from 'rendition';
import styled from 'styled-components';
import { Contract, ViewContract } from '@balena/jellyfish-types/build/core';
import { flatten } from 'flat';
import { ActionLink, CloseButton } from '../../../../components';
import * as helpers from '../../../../services/helpers';
import CardActions from '../../../../components/CardActions';
import Markers from '../../../../components/Markers';
import { ChannelContract } from '../../../../types';
import CSVDownloadModal from '../../../../components/CSVDownloadModal';
import { JsonSchema } from '@balena/jellyfish-types';

// Style CSV link to match rendition theme
const CSVLinkWrapper = styled(Box)`
	a {
		display: block;
		font-size: 14px;
		color: #00aeef;
		text-decoration: none;
		padding: 8px 16px;
		width: 100%;
		display: block !important;
		cursor: pointer;
		margin: 0;

		&: hover {
			color: #008bbf;
			background-color: #f4f4f4 !important;
		}
	}
`;

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
