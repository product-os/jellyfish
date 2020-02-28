/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Button,
	Flex,
	Txt,
	useTheme
} from 'rendition'
import styled from 'styled-components'
import AutocompleteTextarea from '../shame/AutocompleteTextarea'
import UseSecretIcon from 'react-icons/lib/fa/user-secret'
import {
	FilesInput
} from '../FileUploader'

const PlainAutocompleteTextarea = styled(AutocompleteTextarea) `
	border: 0 !important;
	background-color: transparent !important;
	box-shadow: none !important;
	outline: none !important;
	padding: 0 !important;
	color: inherit;
`

const InputWrapper = styled(Box) `
	position: relative;
	border: solid 1px ${(props) => { return props.borderColor || props.theme.colors.gray.main }};
	border-radius: ${(props) => { return props.theme.radius }}px;

	&:focus-within {
		border-color: ${(props) => { return props.borderColorWhenFocused || props.theme.colors.secondary.main }};
	}

	${(props) => {
		return props.bubble ? `
			&::after {
				content: ' ';
				position: absolute;
				top: calc(50% - 6px);
				right: -6px;
				width: 0;
				height: 0;
				border-top: 6px solid transparent;
				border-bottom: 6px solid transparent;
				border-left: 6px solid ${props.borderColor};
			}
		` : ''
	}}
`

const MessageInput = React.memo(({
	allowWhispers,
	whisper,
	placeholder = whisper ? 'Type your private comment...' : 'Type your public reply...',
	toggleWhisper,
	sendCommand,
	value,
	onChange,
	onSubmit,
	files,
	onFileChange,
	wide = true,
	style,
	enableAutocomplete,
	types,
	user,
	sdk,
	...rest
}) => {
	const theme = useTheme()

	const textInput = (
		<InputWrapper
			bubble={whisper}
			py={2}
			px={3}
			{...(whisper ? {
				color: 'white',
				bg: theme.colors.secondary.main,
				borderColor: theme.colors.secondary.main
			} : {
				color: theme.text.main,
				borderColor: 'white',
				bg: 'white',
				borderColorWhenFocused: 'white',
				...(wide ? {
					px: 0
				} : {})
			})}>
			<PlainAutocompleteTextarea
				enableAutocomplete={enableAutocomplete}
				sdk={sdk}
				types={types}
				user={user}
				sendCommand={sendCommand}
				className="new-message-input"
				value={value}
				onChange={onChange}
				onSubmit={onSubmit}
				placeholder={placeholder}
			/>
		</InputWrapper>
	)

	const toggleWhisperButton = Boolean(allowWhispers) && (
		<Button
			p={1}
			fontSize="18px"
			plain
			onClick={toggleWhisper}
			data-test="timeline__whisper-toggle"
			tooltip={{
				placement: 'left',
				text: `Toggle response visibility (currently ${whisper ? 'private' : 'public'})`
			}}
			icon={<UseSecretIcon />}
			style={{
				opacity: whisper ? 1 : 0.6
			}}
		/>
	)

	const fileUploadButton = (
		<FilesInput
			value={files}
			onChange={onFileChange}
		/>
	)

	const sendCommandText = sendCommand && (
		<Txt fontSize={11} italic color="#859CB0">
			Press {sendCommand} to send
		</Txt>
	)

	if (wide) {
		return (
			<Box
				{...rest}
				pt={3}
				pb={1}
				pl={3}
				bg="white"
				style={{
					...style,
					display: 'grid',
					gridTemplateColumns: 'auto fit-content(100%)',
					gridTemplateRows: 'auto auto',
					alignItems: 'center'
				}}
			>
				<Box flex={1} style={{
					gridColumn: 1,
					gridRow: 1
				}}>
					{textInput}
				</Box>
				<Flex px={2} style={{
					gridColumn: 2,
					gridRow: 1
				}}>
					{toggleWhisperButton}
					{fileUploadButton}
				</Flex>
				<Box style={{
					gridColumn: 1,
					gridRow: 2
				}}>
					{sendCommandText}
				</Box>
			</Box>
		)
	}

	return (
		<Flex
			{...rest}
			style={style}
			bg="white"
			flexDirection="column"
		>
			<Box
				flex="1"
				px={1}
			>
				{textInput}
			</Box>

			<Flex px={2} style={{
				borderTop: 'solid 1px rgb(238, 238, 238)',
				borderTopStyle: 'dashed'
			}}>
				<Flex alignSelf="flex-start" p={1}>
					{toggleWhisperButton}
					{fileUploadButton}
				</Flex>
				<Box style={{
					marginLeft: 'auto'
				}}>
					{sendCommandText}
				</Box>
			</Flex>
		</Flex>
	)
})

export default MessageInput
