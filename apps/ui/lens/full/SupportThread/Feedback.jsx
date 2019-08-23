/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React, {
	useState
} from 'react'
import {
	Box,
	Button,
	Flex,
	Modal,
	Textarea
} from 'rendition'
import Icon from '@jellyfish/ui-components/shame/Icon'

// TODO: Render this form using the rendition Form component and the
// feedback-item type schema
const CATEGORIES = [
	{
		name: 'Empathy',
		slug: 'empathy'
	},
	{
		name: 'Technical knowledge',
		slug: 'knowledge'
	},
	{
		name: 'Procedure',
		slug: 'process'
	},
	{
		name: 'Grammar',
		slug: 'grammar'
	},
	{
		name: 'Going the extra mile',
		slug: 'effort'
	}
]

const FeedbackRow = (props) => {
	const slug = props.category.slug

	return (
		<Flex justifyContent="space-between">
			{props.category.name}

			<span>
				<Button
					data-test={`feedback-form__${slug}--positive`}
					plain
					style={{
						opacity: props.value === 1 ? 1 : 0.5
					}}
					onClick={() => props.onPositiveResponse(slug)}
					icon={<Icon name="thumbs-up" />}
					p={1}
				/>
				<Button
					data-test={`feedback-form__${slug}--neutral`}
					plain
					style={{
						opacity: props.value === 0 ? 1 : 0.5
					}}
					onClick={() => props.onNeutralResponse(slug)}
					icon={<Icon name="minus" />}
					p={1}
					mx={2}
				/>
				<Button
					data-test={`feedback-form__${slug}--negative`}
					plain
					style={{
						opacity: props.value === -1 ? 1 : 0.5
					}}
					onClick={() => props.onNegativeResponse(slug)}
					icon={<Icon name="thumbs-down" />}
					p={1}
				/>
			</span>
		</Flex>
	)
}

export default function Feedback (props) {
	// Declare a state variable for storing the quick feedback response items
	// It will be initialised as an empty object, and the feedback responses will
	// be added as key pair values
	const [ quickResponse, setQuickResponse ] = useState({})

	// Declare a state variable for storing an optional message response
	const [ message, setMessage ] = useState('')

	// A generator that creates handlers for setting quick response values
	const makeQuickResponseHandler = (value) => (label) => {
		setQuickResponse({
			...quickResponse,
			[label]: value
		})
	}

	const submit = () => {
		props.done({
			message,
			...quickResponse
		})
	}

	return (
		<Modal
			title={`Feedback for ${props.user.name || props.user.slug.slice(5)}`}
			done={submit}
			primaryButtonProps={{
				'data-test': 'feedback-form__submit'
			}}
		>
			<Box data-test="feedback-form">
				{CATEGORIES.map((category) => (
					<FeedbackRow
						key={category.slug}
						category={category}
						value={quickResponse[category.slug]}
						onPositiveResponse={makeQuickResponseHandler(1)}
						onNeutralResponse={makeQuickResponseHandler(0)}
						onNegativeResponse={makeQuickResponseHandler(-1)}
					/>
				))}

				<Textarea
					mt={3}
					value={message}
					onChange={(event) => setMessage(event.target.value)}
				/>
			</Box>
		</Modal>
	)
}
