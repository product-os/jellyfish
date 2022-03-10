import React from 'react';
import { Box, ButtonProps, Flex, Tag, TagProps } from 'rendition';
import styled from 'styled-components';
import { PlainButton } from './PlainButton';
import Icon from './shame/Icon';

const HiddenFileInput = styled.input.attrs({
	type: 'file',
})`
	display: none;
`;

export interface FileUploaderProps {
	onChange: (files: File[]) => unknown;
	multiple?: boolean;
	children: (startUpload: () => unknown) => JSX.Element;
}

export const FileUploader: React.FunctionComponent<FileUploaderProps> = ({
	onChange,
	multiple = false,
	children,
}) => {
	const inputRef = React.useRef<HTMLInputElement>(null);

	const handleStartUpload = React.useCallback(() => {
		inputRef.current!.click();
	}, [inputRef.current]);

	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const files = Array.from(event.target.files!);
			event.target.value = '';
			onChange(files);
		},
		[onChange],
	);

	return (
		<React.Fragment>
			{children(handleStartUpload)}
			<HiddenFileInput
				ref={inputRef}
				onChange={handleChange}
				multiple={multiple}
			/>
		</React.Fragment>
	);
};

export interface FileUploadButtonProps
	extends Omit<ButtonProps, 'onChange'>,
		Pick<FileUploaderProps, 'onChange' | 'multiple'> {}

export const FileUploadButton: React.FunctionComponent<
	FileUploadButtonProps
> = ({ onChange, ...rest }) => {
	return (
		<FileUploader onChange={onChange}>
			{(startUpload) => {
				return <PlainButton onClick={startUpload} fontSize="18px" {...rest} />;
			}}
		</FileUploader>
	);
};

export interface FileTagProps extends TagProps {
	file: File;
	onRemove: (file: File) => unknown;
}

const FileTag: React.FunctionComponent<FileTagProps> = ({
	file,
	onRemove,
	...rest
}) => {
	const handleRemove = React.useCallback(() => {
		onRemove(file);
	}, [file, onRemove]);

	return <Tag onClose={handleRemove} {...rest} name={file.name} />;
};

export interface FilesInputProps
	extends Pick<FileUploadButtonProps, 'multiple' | 'onChange'> {
	value: File[];
}

export const FilesInput: React.FunctionComponent<FilesInputProps> = ({
	value = [],
	onChange,
	multiple,
	...rest
}) => {
	const handleRemove = React.useCallback(
		(file) => {
			onChange(
				value.filter((item) => {
					return item !== file;
				}),
			);
		},
		[onChange, value],
	);

	return (
		<Flex {...rest} alignItems="center">
			{(multiple || !value.length) && (
				<Box
					style={{
						lineHeight: 1,
					}}
				>
					<FileUploadButton
						multiple={multiple}
						onChange={onChange}
						icon={<Icon name="paperclip" />}
					/>
				</Box>
			)}
			<Box flex="1">
				{value.map((file) => {
					return (
						<FileTag
							ml={1}
							key={file.name}
							file={file}
							onRemove={handleRemove}
						/>
					);
				})}
			</Box>
		</Flex>
	);
};
