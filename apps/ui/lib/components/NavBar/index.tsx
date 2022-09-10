import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import _ from 'lodash';
import { actionCreators, selectors } from '../../store';
import { Box, Divider, Fixed, Flex, Txt } from 'rendition';
import styled from 'styled-components';
import { breakPoints } from '../../utils/mediaquery';
import {
	ActionButton,
	ActionRouterLink,
	MentionsCount,
	MenuPanel,
	UserAvatarLive,
} from '../';
import UserStatusMenuItem from '../UserStatusMenuItem';
import OmniSearch from '../OmniSearch';
import { LoopSelector } from '../LoopSelector';

const Wrapper = styled(Flex)`
	background-color: #8c31ff;
	z-index: 1;
`;

const StyledTxt = styled(Txt)`
	text-overflow: 'ellipsis';
	flex: '1 1 0%';
	font-weight: 600;
	white-space: 'nowrap';
	overflow: 'hidden';
	@media only screen and (max-width: ${breakPoints.mobile}) {
		display: none;
	}
`;

const NavBar = () => {
	const [showMenu, setShowMenu] = React.useState(false);
	const user = useSelector(selectors.getCurrentUser());
	const dispatch = useDispatch();
	const username = user ? user.name || user.slug.replace(/user-/, '') : null;

	if (!user) {
		return null;
	}

	return (
		<Wrapper alignItems="center">
			<Flex
				className="user-menu-toggle"
				py={2}
				pl={2}
				pr={2}
				alignItems="center"
				width="180px"
				onClick={() => setShowMenu(!showMenu)}
				style={{
					cursor: 'pointer',
					position: 'relative',
				}}
			>
				<UserAvatarLive userId={user.id} />
				{Boolean(username) && (
					<StyledTxt color="white" mx={2}>
						{username}
					</StyledTxt>
				)}

				<MentionsCount />
			</Flex>

			{showMenu && (
				<Fixed
					top={true}
					right={true}
					bottom={true}
					left={true}
					z={10}
					onClick={() => setShowMenu(false)}
				>
					<MenuPanel className="user-menu" mx={3} py={2}>
						{user && <UserStatusMenuItem />}

						{user && (
							// Todo: Resolve the broken typing on ActionRouterLink
							// @ts-ignore
							<ActionRouterLink to={`/${user.slug}`}>Profile</ActionRouterLink>
						)}

						<ActionRouterLink to="/inbox">Inbox</ActionRouterLink>

						<Box mx={3}>
							<Divider height={1} />
						</Box>

						<ActionButton
							className="user-menu__logout"
							plain
							onClick={() => dispatch(actionCreators.logout())}
						>
							Log out
						</ActionButton>
					</MenuPanel>
				</Fixed>
			)}

			<div style={{ marginRight: '10px' }}>
				<LoopSelector />
			</div>
			<OmniSearch ml={3} mr={2} style={{ marginLeft: 'auto' }} />
		</Wrapper>
	);
};

export default NavBar;
