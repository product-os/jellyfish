/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	FaPaperclip
} from 'react-icons/fa'
import {
	Box,
	Button,
	Flex,
	Tag
} from 'rendition'
import styled from 'styled-components'

const HiddenFileInput = styled.input.attrs({
	type: 'file'
}) `
    display: none;
`

export const FileUploader = ({
	onChange,
	multiple = false,
	children
}) => {
	const inputRef = React.useRef(null)

	const handleStartUpload = React.useCallback(() => {
		inputRef.current.click()
	}, [ inputRef.current ])

	const handleChange = React.useCallback((event) => {
		const files = Array.from(event.target.files)
		event.target.value = ''
		onChange(files)
	}, [])

	return (
		<React.Fragment>
			{children(handleStartUpload)}
			<HiddenFileInput
				ref={inputRef}
				onChange={handleChange}
				multiple={multiple}
			/>
		</React.Fragment>
	)
}

export const FileUploadButton = ({
	onChange, ...rest
}) => {
	return (
		<FileUploader onChange={onChange}>
			{(startUpload) => { return <Button onClick={startUpload} {...rest} /> }}
		</FileUploader>
	)
}

const FileTag = ({
	file, onRemove, ...rest
}) => {
	const handleRemove = React.useCallback(() => {
		onRemove(file)
	}, [ file, onRemove ])

	return (
		<Tag onClose={handleRemove} {...rest} name={file.name} />
	)
}

export const FilesInput = ({
	value = [],
	onChange,
	multiple,
	...rest
}) => {
	const handleRemove = React.useCallback((file) => {
		onChange(value.filter((item) => {
			return item !== file
		}))
	}, [ value ])

	return (
		<Flex {...rest} alignItems="center">
			{(multiple || !value.length) && (
				<Box style={{
					lineHeight: 1
				}}>
					<FileUploadButton
						p={2}
						fontSize="18px"
						plain
						multiple={multiple}
						onChange={onChange}
						icon={<FaPaperclip />}
					/>
				</Box>
			)}
			<Box flex="1">
				{value.map((file) => {
					return (
						<FileTag ml={1} key={file.name} file={file} onRemove={handleRemove} />
					)
				})}
			</Box>
		</Flex>
	)
}
