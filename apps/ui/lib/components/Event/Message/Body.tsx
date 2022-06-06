import React from 'react';
import _ from 'lodash';
import styled from 'styled-components';
import { Button, Txt, Img } from 'rendition';
import { Markdown } from 'rendition/dist/extra/Markdown';
import type {
	Contract,
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import { HIDDEN_ANCHOR } from '../../Timeline';
import Icon from '../../Icon';
import MessageContainer from './MessageContainer';
import { PlainAutocompleteTextarea } from '../../Timeline/MessageInput';
import Attachments from './attachments';
import Mention from './Mention';
import { linkComponentOverride } from '../../Link';
import * as helpers from '../../../services/helpers';
import ErrorBoundary from '../../ErrorBoundary';

const tagMatchRE = helpers.createPrefixRegExp(helpers.TAG_MATCH_REGEXP_PREFIX);

const MESSAGE_Y_SPACE = '3px';
const MAX_IMAGE_SIZE = '500px';

const EditingAutocompleteTextarea = styled(PlainAutocompleteTextarea)`
	margin: ${MESSAGE_Y_SPACE} 0;
`;

const CollapsibleMarkdown = styled(Markdown)<any>(
	({ messageOverflows, messageCollapsedHeight, expanded }) => {
		return {
			fontSize: 'inherit',
			maxHeight:
				!expanded && messageOverflows ? `${messageCollapsedHeight}px` : 'none',
			overflow: messageOverflows ? 'hidden' : 'initial',
		};
	},
);

const StyledMarkdown = styled(CollapsibleMarkdown)`
	pre::-webkit-scrollbar {
		width: 14px;
	}

	pre::-webkit-scrollbar-track {
		background-color: var(--comment);
		border-radius: 0;
	}

	pre::-webkit-scrollbar-thumb {
		background-color: var(--purple);
		border-radius: 0;
	}

	code[class*='language-'] ::-moz-selection,
	code[class*='language-']::-moz-selection,
	pre[class*='language-'] ::-moz-selection,
	pre[class*='language-']::-moz-selection {
		text-shadow: none;
		background-color: var(--selection);
	}

	code[class*='language-'] ::selection,
	code[class*='language-']::selection,
	pre[class*='language-'] ::selection,
	pre[class*='language-']::selection {
		text-shadow: none;
		background-color: var(--selection);
	}

	pre.line-numbers {
		position: relative;
		padding-left: 3.8em;
		counter-reset: linenumber;
	}

	pre.line-numbers > code {
		position: relative;
		white-space: inherit;
	}

	.line-numbers .line-numbers-rows {
		position: absolute;
		pointer-events: none;
		top: 0;
		font-size: 100%;
		left: -3.8em;
		width: 3em;
		letter-spacing: -1px;
		border-right: 1px solid #999;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
	}

	.line-numbers-rows > span {
		pointer-events: none;
		display: block;
		counter-increment: linenumber;
	}

	.line-numbers-rows > span:before {
		content: counter(linenumber);
		color: #999;
		display: block;
		padding-right: 0.8em;
		text-align: right;
	}

	div.code-toolbar {
		position: relative;
	}

	div.code-toolbar > .toolbar {
		position: absolute;
		top: 0.3em;
		right: 0.2em;
		transition: opacity 0.3s ease-in-out;
		opacity: 0;
	}

	div.code-toolbar:hover > .toolbar {
		opacity: 1;
	}

	div.code-toolbar > .toolbar .toolbar-item {
		display: inline-block;
		padding-right: 20px;
	}

	div.code-toolbar > .toolbar a {
		cursor: pointer;
	}

	div.code-toolbar > .toolbar button {
		background: 0 0;
		border: 0;
		color: inherit;
		font: inherit;
		line-height: normal;
		overflow: visible;
		padding: 0;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	div.code-toolbar > .toolbar a,
	div.code-toolbar > .toolbar button,
	div.code-toolbar > .toolbar span {
		color: var(--foreground);
		font-size: 0.8em;
		padding: 0.5em;
		background: var(--comment);
		border-radius: 0.5em;
	}

	div.code-toolbar > .toolbar a:focus,
	div.code-toolbar > .toolbar a:hover,
	div.code-toolbar > .toolbar button:focus,
	div.code-toolbar > .toolbar button:hover,
	div.code-toolbar > .toolbar span:focus,
	div.code-toolbar > .toolbar span:hover {
		color: inherit;
		text-decoration: none;
		background-color: var(--green);
	}

	@media print {
		code[class*='language-'],
		pre[class*='language-'] {
			text-shadow: none;
		}
	}

	code[class*='language-'],
	pre[class*='language-'] {
		color: var(--foreground);
		background: var(--background);
		text-shadow: none;
		font-family: PT Mono, Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono',
			monospace;
		text-align: left;
		white-space: pre;
		word-spacing: normal;
		word-break: normal;
		word-wrap: normal;
		line-height: 1.5;
		-moz-tab-size: 4;
		-o-tab-size: 4;
		tab-size: 4;
		-webkit-hyphens: none;
		-moz-hyphens: none;
		-ms-hyphens: none;
		hyphens: none;
	}

	pre[class*='language-'] {
		background: var(--background);
		border-radius: 0.5em;
		padding: 1em;
		margin: 0.5em 0;
		overflow: auto;
		height: auto;
	}

	:not(pre) > code[class*='language-'],
	pre[class*='language-'] {
		background: var(--background);
	}

	:not(pre) > code[class*='language-'] {
		padding: 4px 7px;
		border-radius: 0.3em;
		white-space: normal;
	}

	.limit-300 {
		height: 300px !important;
	}

	.limit-300 {
		height: 400px !important;
	}

	.limit-500 {
		height: 500px !important;
	}

	.limit-600 {
		height: 600px !important;
	}

	.limit-700 {
		height: 700px !important;
	}

	.limit-800 {
		height: 800px !important;
	}

	.language-css {
		color: var(--purple);
	}

	.token {
		color: var(--pink);
	}

	.language-css .token {
		color: var(--pink);
	}

	.token.script {
		color: var(--foreground);
	}

	.token.bold {
		font-weight: 700;
	}

	.token.italic {
		font-style: italic;
	}

	.token.atrule,
	.token.attr-name,
	.token.attr-value {
		color: var(--green);
	}

	.language-css .token.atrule {
		color: var(--purple);
	}

	.language-html .token.attr-value,
	.language-markup .token.attr-value {
		color: var(--yellow);
	}

	.token.boolean {
		color: var(--purple);
	}

	.token.builtin,
	.token.class-name {
		color: var(--cyan);
	}

	.token.comment {
		color: var(--comment);
	}

	.token.constant {
		color: var(--purple);
	}

	.language-javascript .token.constant {
		color: var(--orange);
		font-style: italic;
	}

	.token.entity {
		color: var(--pink);
	}

	.language-css .token.entity {
		color: var(--green);
	}

	.language-html .token.entity.named-entity {
		color: var(--purple);
	}

	.language-html .token.entity:not(.named-entity) {
		color: var(--pink);
	}

	.language-markup .token.entity.named-entity {
		color: var(--purple);
	}

	.language-markup .token.entity:not(.named-entity) {
		color: var(--pink);
	}

	.token.function {
		color: var(--green);
	}

	.language-css .token.function {
		color: var(--cyan);
	}

	.token.important,
	.token.keyword {
		color: var(--pink);
	}

	.token.prolog {
		color: var(--foreground);
	}

	.token.property {
		color: var(--orange);
	}

	.language-css .token.property {
		color: var(--cyan);
	}

	.token.punctuation {
		color: var(--pink);
	}

	.language-css .token.punctuation {
		color: var(--orange);
	}

	.language-html .token.punctuation,
	.language-markup .token.punctuation {
		color: var(--foreground);
	}

	.token.selector {
		color: var(--pink);
	}

	.language-css .token.selector {
		color: var(--green);
	}

	.token.regex {
		color: var(--red);
	}

	.language-css .token.rule:not(.atrule) {
		color: var(--foreground);
	}

	.token.string {
		color: var(--yellow);
	}

	.token.tag {
		color: var(--pink);
	}

	.token.url {
		color: var(--cyan);
	}

	.language-css .token.url {
		color: var(--orange);
	}

	.token.variable {
		color: var(--comment);
	}

	.token.number {
		color: rgba(189, 147, 249, 1);
	}

	.token.operator {
		color: rgba(139, 233, 253, 1);
	}

	.token.char {
		color: rgba(255, 135, 157, 1);
	}

	.token.symbol {
		color: rgba(255, 184, 108, 1);
	}

	.token.deleted {
		color: #e2777a;
	}

	.token.namespace {
		color: #e2777a;
	}

	.highlight-line {
		color: inherit;
		display: inline-block;
		text-decoration: none;
		border-radius: 4px;
		padding: 2px 10px;
	}

	.highlight-line:empty:before {
		content: ' ';
	}

	.highlight-line:not(:last-child) {
		min-width: 100%;
	}

	.highlight-line .highlight-line:not(:last-child) {
		min-width: 0;
	}

	.highlight-line-isdir {
		color: var(--foreground);
		background-color: var(--selection-30);
	}

	.highlight-line-active {
		background-color: var(--comment-30);
	}

	.highlight-line-add {
		background-color: var(--green-30);
	}

	.highlight-line-remove {
		background-color: var(--red-30);
	}
`;

/*
 * This message text is added by Front when syncing whispers. It should be hidden in the message
 * text in Jellyfish.
 */
export const RE_FRONT_HIDDEN_URL =
	/https:\/\/www\.balena-cloud\.com\?hidden=whisper.*/;

const DISCOURSE_IMAGE_RE = /!\[(.+?)\|\d*x\d*\]\(upload:\/\/(.+?\..+?)\)/g;
const DISCOURSE_ATTACHMENT_RE =
	/\[(.+?)\|attachment\]\(upload:\/\/(.+?\..+?)\)/g;
const FRONT_MARKDOWN_IMG_RE =
	/\[\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+\]/g;
const FRONT_HTML_IMG_RE =
	/\/api\/1\/companies\/resin_io\/attachments\/[a-z0-9]+\?resource_link_id=\d+/g;
const IMAGE_URL_RE = /^https?:\/\/.*\.(?:png|jpg|gif)(?:\?\S*)*$/;

const OverflowButton = styled(Button)<{ expanded?: boolean }>`
	color: inherit;

	&:hover {
		color: inherit !important;
	}

	${(expanded) => {
		return expanded ? {} : "boxShadow: '0 -5px 5px -5px rgba(0,0,0,0.5)'";
	}}
`;

export const parseMessage = (messageField: string) => {
	let message = messageField;

	if (message.trim().match(IMAGE_URL_RE)) {
		return `![image](${message.trim()})`;
	}

	// Convert inline images from synced Discourse messages into markdown images
	if (message.match(DISCOURSE_IMAGE_RE)) {
		message = message.replace(
			DISCOURSE_IMAGE_RE,
			(_link, filename, urlPrefix) => {
				return `![${filename}](https://forums.balena.io/uploads/short-url/${urlPrefix})`;
			},
		);
	}

	// Convert inline attachments from synced Discourse messages into markdown links
	if (message.match(DISCOURSE_ATTACHMENT_RE)) {
		message = message.replace(
			DISCOURSE_ATTACHMENT_RE,
			(_link, filename, urlPrefix) => {
				return `[${filename}](https://forums.balena.io/uploads/short-url/${urlPrefix})`;
			},
		);
	}

	// Extract attached images embedded in HTML from synced front messages
	if (message.includes('<img src="/api/1/companies/resin_io/attachments')) {
		message = message.replace(FRONT_HTML_IMG_RE, (source) => {
			return `https://app.frontapp.com${source}`;
		});
	}

	// Extract attached images from synced front messages embedded in a different way
	if (message.match(FRONT_MARKDOWN_IMG_RE)) {
		message = message.replace(FRONT_MARKDOWN_IMG_RE, (source) => {
			return `![Attached image](https://app.frontapp.com${source.slice(
				1,
				-1,
			)})`;
		});
	}

	return message
		.split('\n')
		.filter((line) => {
			return !line.includes(HIDDEN_ANCHOR);
		})
		.join('\n');
};

const IMG_STYLE = {
	maxWidth: `min(${MAX_IMAGE_SIZE}, 100%)`,
	maxHeight: MAX_IMAGE_SIZE,
};

const componentOverrides = {
	img: (attribs: any) => {
		return <Img {...attribs} style={IMG_STYLE} />;
	},
	// eslint-disable-next-line id-length
	a: linkComponentOverride({
		blacklist: [RE_FRONT_HIDDEN_URL],
	}),
	mention: (attribs: any) => {
		return <Mention {...attribs} />;
	},
};

interface Props {
	actor: {
		card: Contract;
		proxy?: boolean;
	};
	card: Contract & { pending?: boolean };
	editedMessage: string | null;
	enableAutocomplete?: boolean;
	groups: any;
	isMessage: boolean;
	messageCollapsedHeight: number;
	messageOverflows: boolean;
	onSaveEditedMessage: () => any;
	onUpdateDraft: (event: any) => void;
	sdk: JellyfishSDK;
	sendCommand: string;
	setMessageElement: (element: HTMLElement | null) => void;
	squashBottom?: boolean;
	squashTop?: boolean;
	types: TypeContract[];
	updating: boolean;
	user: UserContract;
}

const Body = (props: Props) => {
	const {
		squashTop,
		squashBottom,
		enableAutocomplete,
		sendCommand,
		types,
		user,
		groups,
		sdk,
		card,
		actor,
		isMessage,
		editedMessage,
		updating,
		onUpdateDraft,
		onSaveEditedMessage,
		messageOverflows,
		setMessageElement,
		messageCollapsedHeight,
	} = props;

	const [expanded, setExpanded] = React.useState(false);

	const expand = React.useCallback(() => {
		setExpanded(!expanded);
	}, [expanded]);

	const message = parseMessage(helpers.getMessage(card));

	const isJustFile = !message && _.get(card, ['data', 'payload', 'file']);

	const decorators = React.useMemo(() => {
		return [
			{
				match: tagMatchRE,
				captureGroupIndex: 2,
				component: 'mention',
				properties: {
					readBy: card.data.readBy,
					slug: user.slug,
					groups,
				},
			},
		];
	}, [card.data.readBy, user.slug, groups]);

	return (
		<React.Fragment>
			<Attachments
				card={card}
				actor={actor}
				sdk={sdk}
				maxImageSize={MAX_IMAGE_SIZE}
				squashTop={squashTop}
				squashBottom={squashBottom}
			/>
			{isMessage && !isJustFile && (
				<MessageContainer
					ref={setMessageElement}
					card={card}
					actor={actor}
					editing={editedMessage !== null}
					squashTop={squashTop}
					squashBottom={squashBottom}
					py={2}
					px={3}
					mr={1}
				>
					{editedMessage !== null && !updating ? (
						<EditingAutocompleteTextarea
							data-test="event__textarea"
							enableAutocomplete={enableAutocomplete}
							sdk={sdk}
							types={types}
							user={user}
							autoFocus
							sendCommand={sendCommand}
							value={editedMessage}
							onChange={onUpdateDraft}
							onSubmit={onSaveEditedMessage}
						/>
					) : (
						<StyledMarkdown
							expanded={expanded}
							messageOverflows={messageOverflows}
							messageCollapsedHeight={messageCollapsedHeight}
							py={MESSAGE_Y_SPACE}
							data-test={
								card.pending || updating
									? 'event-card__message-draft'
									: 'event-card__message'
							}
							flex={0}
							componentOverrides={componentOverrides}
							decorators={decorators}
						>
							{updating ? editedMessage : message}
						</StyledMarkdown>
					)}
					{messageOverflows && (
						<OverflowButton
							className="event-card__expand"
							plain
							width="100%"
							py={1}
							onClick={expand}
							expanded={expanded}
						>
							<Icon name={`chevron-${expanded ? 'up' : 'down'}`} />
						</OverflowButton>
					)}
				</MessageContainer>
			)}
			{!isMessage && Boolean(card.name) && <Txt>{card.name}</Txt>}
		</React.Fragment>
	);
};

export default (props: any) => {
	const getErrorElement = React.useCallback(() => {
		return (
			<MessageContainer
				data-test="eventBody__errorMessage"
				ref={props.setMessageElement}
				card={props.card}
				actor={props.actor}
				py={2}
				px={3}
				mr={1}
				error={true}
			>
				An error occured while attempting to render this message
			</MessageContainer>
		);
	}, [props.setMessageElement, props.card, props.actor]);

	return (
		<ErrorBoundary getErrorElement={getErrorElement}>
			<Body {...props} />
		</ErrorBoundary>
	);
};
