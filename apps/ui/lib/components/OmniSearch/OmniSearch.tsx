import React from 'react';
import path from 'path';
import _ from 'lodash';
import classnames from 'classnames';
import { Box, Input, Txt } from 'rendition';
import styled from 'styled-components';
import { Icon } from '@balena/jellyfish-ui-components';

const TipTxt = styled(Txt)`
	opacity: 0;
	transition: opacity ease-in-out 300ms;
	&.active {
		opacity: 1;
	}
`;

const SearchWrapper = styled<any>(Box)`
	position: relative;
`;

const IconWrapper = styled(Box)`
	position: absolute;
	left: 8px;
	top: 50%;
	transform: translateY(-50%);
`;

const SearchInput = styled(Input)`
	padding-left: 26px;
`;

export const OmniSearch = ({ actions, channels, types, history, ...rest }) => {
	const [searchTerm, setSearchTerm] = React.useState('');
	const tipCN = classnames({
		active: Boolean(searchTerm),
	});
	const onKeyPress = (event) => {
		if (searchTerm && event.key === 'Enter') {
			const searchChannel = _.find(channels, {
				data: {
					target: 'search',
				},
			});
			if (searchChannel) {
				actions.updateChannel(
					_.merge({}, searchChannel, {
						data: {
							seed: {
								searchTerm,
							},
						},
					}),
				);
			} else {
				actions.addChannel({
					format: 'search',
					target: 'search',
					options: {},
					head: {},
					seed: {
						searchTerm,
					},
					canonical: false,
				});
				history.push(path.join(window.location.pathname, 'search'));
			}
			setSearchTerm('');
		}
	};
	return (
		<Box {...rest}>
			<SearchWrapper alignItems="center">
				<IconWrapper>
					<Icon name="search" />
				</IconWrapper>
				<SearchInput
					value={searchTerm}
					onKeyPress={onKeyPress}
					onChange={(event) => {
						setSearchTerm(event.target.value);
					}}
					placeholder="Search Jellyfish..."
				/>
			</SearchWrapper>
			<TipTxt className={tipCN} fontSize="10px">
				Press enter to search
			</TipTxt>
		</Box>
	);
};
