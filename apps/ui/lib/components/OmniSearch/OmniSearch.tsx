import React from 'react';
import path from 'path';
import _ from 'lodash';
import { Box, Input } from 'rendition';
import styled from 'styled-components';
import { Icon } from '../';

const SearchWrapper = styled<any>(Box)`
	position: relative;
`;

const IconWrapper = styled(Box)`
	position: absolute;
	left: 8px;
	top: 54%;
	transform: translateY(-50%);
	color: white;
	z-index: 1;
	font-size: 12px;
`;

const SearchInput = styled(Input)`
	padding-left: 26px;
	background-color: #c8aff9;
	border-width: 0;
	&::placeholder {
		color: white;
	}
`;

export const OmniSearch = ({ actions, channels, types, history, ...rest }) => {
	const [searchTerm, setSearchTerm] = React.useState('');
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
					placeholder="Search"
				/>
			</SearchWrapper>
		</Box>
	);
};
