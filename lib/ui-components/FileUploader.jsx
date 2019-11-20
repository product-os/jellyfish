/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import {
	Button
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
