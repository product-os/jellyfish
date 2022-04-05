import _ from 'lodash';
import React from 'react';
import { CSVLink } from 'react-csv';
import { Box, Divider, Flex, Search, Txt } from 'rendition';
import styled from 'styled-components';
import { Contract, ViewContract } from '@balena/jellyfish-types/build/core';
import { flatten } from 'flat';
import { CloseButton } from '../../../../components';
import * as helpers from '../../../../services/helpers';
import CardActions from '../../../../components/CardActions';
import Markers from '../../../../components/Markers';
import { ChannelContract } from '../../../../types';

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
}

export default React.memo<HeaderProps>((props) => {
	const { channel, results, contract } = props;

	if (!contract) {
		return null;
	}

	const csvName = `${contract.slug}_${new Date().toISOString()}.csv`;
	const csvData = results
		? results.map((item) => {
				// To keep the CSV functionality simple, don't include any link data in the output
				const flattened: any = flatten(
					{
						...item,
						links: {},
						linked_at: item.linked_at || {},
					},
					{
						// "safe" option preserves arrays, preventing a new header being created for each tag/marker
						safe: true,
					},
				);
				// react-csv does not correctly escape double quotes in fields, so it has to be done here.
				// Once https://github.com/react-csv/react-csv/pull/287 is resolved, we need to remove this code
				return _.mapValues(flattened, (field) => {
					// escape all non-escaped double-quotes (double double-quotes escape them in CSV)
					return _.isString(field)
						? field.replace(/([^"]|^)"(?=[^"]|$)/g, '$1""')
						: field;
				});
		  })
		: [];

	const csvHeaders = csvData.length
		? Object.keys(csvData[0]).map((key) => {
				return {
					key,
					label: key,
				};
		  })
		: [];

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
						<CSVLinkWrapper>
							<CSVLink
								data={csvData}
								headers={csvHeaders as any}
								filename={csvName}
							>
								Download results as CSV
							</CSVLink>
						</CSVLinkWrapper>
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
		</Box>
	);
});
