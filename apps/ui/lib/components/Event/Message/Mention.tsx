import _ from 'lodash';
import React from 'react';
import { Box, Popover } from 'rendition';
import styled from 'styled-components';
import * as helpers from '../../../services/helpers';
import { tagStyle } from '../../Tag';

// Adds attributes to the spans that wrap matched tokens
// (usernames, groups, hashtags etc) in messages.
const prefixRE = new RegExp(`^(${helpers.TAG_MATCH_REGEXP_PREFIX})`);

export const highlightTags = (
	element: HTMLElement,
	readBy: any[],
	username: string,
	groups: any,
) => {
	const text = element.innerText || element.textContent!;
	if (text.charAt(0) === '#') {
		return;
	}

	const trimmed = text.replace(prefixRE, '').toLowerCase();
	const group = groups && groups[trimmed];

	if (group && group.isMine) {
		element.className += ' rendition-tag--personal';
	} else if (trimmed === username) {
		element.className += ' rendition-tag--personal';
	}

	if (text.charAt(0) === '!') {
		element.className += ' rendition-tag--alert';
	}

	if (!readBy.length) {
		return;
	}

	if (group) {
		const readByCount = _.intersection(readBy, group.users).length;
		element.setAttribute('data-read-by-count', '' + readByCount);
		element.className += ' rendition-tag--read-by';
	}

	if (_.includes(readBy, `user-${trimmed}`)) {
		element.className += ' rendition-tag--read';
	}
};

const Container = styled(Box)`
	display: inline;
	position: relative;
	${tagStyle}
	background: none;
	color: inherit;
	border-color: inherit;

	&.rendition-tag--personal {
		background: ${(props) => {
			return props.theme.colors.warning.light;
		}};
		border-color: ${(props) => {
			return props.theme.colors.warning.main;
		}};
		color: ${(props) => {
			return props.theme.colors.warning.dark;
		}};

		&.rendition-tag--alert {
			background: ${(props) => {
				return props.theme.colors.danger.light;
			}};
			border-color: ${(props) => {
				return props.theme.colors.danger.main;
			}};
			color: ${(props) => {
				return props.theme.colors.danger.dark;
			}};

			&.rendition-tag--read:after,
			&.rendition-tag--read-by:after {
				background: ${(props) => {
					return props.theme.colors.danger.main;
				}};
				color: ${(props) => {
					return props.theme.colors.danger.light;
				}};
			}
		}
		&.rendition-tag--read:after,
		&.rendition-tag--read-by:after {
			background: ${(props) => {
				return props.theme.colors.warning.main;
			}};
			color: ${(props) => {
				return props.theme.colors.warning.light;
			}};
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			line-height: 1.5em;
			vertical-align: middle;
			text-align: center;
			font-size: 8px;
		}
	}
	&.rendition-tag--read:after {
		content: '✔';
		position: absolute;
		top: -4px;
		right: -4px;
		font-size: 10px;
	}
	&.rendition-tag--read-by:after {
		content: attr(data-read-by-count);
		position: absolute;
		top: -4px;
		right: -4px;
		font-size: 10px;
	}
`;

const Mention = ({ readBy = '', slug, groups, children, ...rest }: any) => {
	const [target, setTarget] = React.useState<HTMLElement | null>(null);
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		if (target) {
			highlightTags(
				target,

				// Rehype-react serializes array, we need to deserialize it.
				// See: https://github.com/rehypejs/rehype-react/issues/23
				// See: https://github.com/syntax-tree/hast-to-hyperscript/issues/18
				readBy ? readBy.split(' ') : [],
				slug.slice(5),
				groups,
			);
		}
	}, [target, readBy, slug, groups]);

	const group = React.useMemo(() => {
		const name = children[0].split('@@')[1];
		return groups[name];
	}, [children, groups]);

	const handleClick = React.useCallback(() => {
		setOpen(true);
	}, []);

	const handleDismiss = React.useCallback(() => {
		setOpen(false);
	}, []);

	return (
		<>
			{target && group && open && (
				<Popover target={target} placement="top" onDismiss={handleDismiss}>
					<Box py={1} pr={1}>
						{group.users.map((groupUserSlug: string) => {
							return (
								<Mention
									ml={1}
									key={groupUserSlug}
									readBy={readBy}
									slug={slug}
									groups={groups}
								>
									{helpers.username(groupUserSlug)}
								</Mention>
							);
						})}
					</Box>
				</Popover>
			)}
			<Container {...rest} ref={setTarget} onClick={handleClick}>
				{children}
			</Container>
		</>
	);
};

export default Mention;
