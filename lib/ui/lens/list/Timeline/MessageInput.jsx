/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Box,
	Button,
	Flex
} from 'rendition'
import AutocompleteTextarea from '../../../shame/AutocompleteTextarea'
import Icon from '../../../shame/Icon'

export default class MessageInput extends React.PureComponent {
	constructor (props) {
		super(props)

		this.bindFileInput = this.bindFileInput.bind(this)
		this.handleUploadButtonClick = this.handleUploadButtonClick.bind(this)
	}

	bindFileInput (ref) {
		this.fileInputElement = ref
	}

	handleUploadButtonClick () {
		const element = this.fileInputElement
		if (element) {
			element.click()
		}
	}

	render () {
		const {
			allowWhispers,
			whisper,
			toggleWhisper,
			user,
			value,
			onChange,
			onSubmit,
			onFileChange
		} = this.props

		return (
			<Flex
				style={{
					borderTop: '1px solid #eee'
				}}
				bg={whisper ? '#eee' : 'white'}
			>
				{allowWhispers && (
					<Button
						px={2}
						mb={1}
						plain
						onClick={toggleWhisper}
						data-test="timeline__whisper-toggle"
						tooltip={{
							placement: 'right',
							text: `Toggle response visibility (currently ${whisper ? 'private' : 'public'})`
						}}
						icon={<Icon name={whisper ? 'eye-slash' : 'eye'}/>}
					/>
				)}

				<Box
					flex="1"
					pt={3}
					pb={2}
					pr={3}
					pl={allowWhispers ? 0 : 3}
				>
					<AutocompleteTextarea
						user={user}
						className="new-message-input"
						value={value}
						onChange={onChange}
						onSubmit={onSubmit}
						placeholder={whisper ? 'Type your private comment...' : 'Type your public reply...'}
					/>
				</Box>

				<Button
					plain
					mr={3}
					mb={1}
					onClick={this.handleUploadButtonClick}
					icon={<Icon name="image"/>}
				/>

				<input
					style={{
						display: 'none'
					}}
					type="file"
					ref={this.bindFileInput}
					onChange={onFileChange}
				/>
			</Flex>
		)
	}
}
