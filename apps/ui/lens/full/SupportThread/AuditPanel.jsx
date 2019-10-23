/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as Bluebird from 'bluebird'
import * as _ from 'lodash'
import React, {
	useState,
	useEffect
} from 'react'
import {
	Box,
	Steps,
	Step,
	Button,
	Txt,
	Flex
} from 'rendition'
import {
	sdk
} from '../../../core'
import Icon from '@jellyfish/ui-components/shame/Icon'
import Feedback from './Feedback'

export default function AuditPanel (props) {
	const [ feedbackFor, setFeedbackFor ] = useState(null)
	const [ agents, setAgents ] = useState([])
	const [ step, setStep ] = useState(0)
	const [ feedbackItems, setFeedbackItems ] = useState([])

	// Call "useEffect" with an empty dependency array to load the participating
	// agents only once, on render
	useEffect(() => {
		const actorIds = _.uniq(_.map(
			_.get(props.card, [ 'links', 'has attached element' ], []),
			'data.actor'
		))

		Bluebird.map(actorIds, props.actions.getActor)
			.then((actors) => {
				setAgents(
					_.filter(actors, {
						proxy: false
					})
				)
			})
	}, [])

	// Load linked feedback items, once on render and then everytime the
	// "linked_at" field changes on the source card
	useEffect(() => {
		sdk.card.getWithLinks(props.card.id, 'is source for')
			.then((result) => {
				if (result) {
					setFeedbackItems(_.get(result, [ 'links', 'is source for' ]))
				}
			})
	}, [ props.card.linked_at['is source for'] ])

	const skipStep = () => {
		setStep(step + 1)
	}

	const createProductImprovement = () => {
		props.actions.addChannel({
			head: {
				action: 'create',
				types: _.find(props.types, {
					slug: 'product-improvement'
				}),
				onDone: {
					action: 'link',
					name: 'support thread is attached to product improvement',
					target: props.card,
					callback: skipStep
				}
			},
			canonical: false
		})
	}

	const createFeedback = (feedback) => {
		const agent = feedbackFor

		setFeedbackFor(null)

		sdk.card.create({
			type: 'feedback-item',
			data: {
				feedback,
				actor: agent.id
			}
		})
			.then((result) => {
				props.actions.addNotification('success', 'Created feedback item')
				return Bluebird.all([
					sdk.card.link(
						props.card,
						result,
						'is source for'
					),
					sdk.card.link(
						result,
						agent,
						'is feedback for'
					)
				])
			})
			.catch((error) => {
				props.actions.addNotification('danger', error.message || error)
			})
	}

	return (
		<Box
			mt={2}
			style={{
				border: '1px solid rgb(238, 238, 238)',
				borderLeft: 0,
				borderRight: 0
			}}
			data-test="audit-panel"
		>
			<Steps
				m={3}
				titleText="Audit"
			>
				<Step
					status={step > 0 ? 'completed' : 'pending'}
					onClick={step > 0 ? () => setStep(0) : null}
				>
					Suggest product improvements
				</Step>
				<Step
					status={step > 1 ? 'completed' : 'pending'}
					onClick={step > 1 ? () => setStep(1) : null}
				>
					Provide agent feedback
				</Step>
				<Step
					status={step > 2 ? 'completed' : 'pending'}
					onClick={step > 2 ? () => setStep(2) : null}
				>
					Finished
				</Step>
			</Steps>
			<Flex
				style={{
					minHeight: 200
				}}
				p={3}
				flexDirection="column"
				justifyContent="space-between"
			>
				{step === 0 && (
					<React.Fragment>
						<Box>
							<Txt>Is there a product feature that can reduce this friction in the future?</Txt>
							<Txt>Can we improve documentation to remove friction for our users?</Txt>
						</Box>

						<Flex mt={4}>
							<Button
								mr={2}
								primary
								onClick={createProductImprovement}
								data-test="create-product-improvement"
							>
								Suggest a product improvement
							</Button>

							<Button
								onClick={skipStep}
								data-test="skip-step"
							>
								Skip this step
							</Button>
						</Flex>
					</React.Fragment>
				)}

				{step === 1 && (
					<React.Fragment>
						{agents && (
							<Box>
								Provide feedback for agents:
								{_.map(agents, (agent) => {
									return (
										<Flex my={3} key={agent.card.id} justifyContent="space-between">
											<Txt><strong>{agent.card.slug.slice(5)}</strong></Txt>
											{_.find(feedbackItems, [ 'data.actor', agent.card.id ]) ? (
												<span>
													<del>write feedback</del>{' '}<Icon name="check" />
												</span>
											) : (
												<Button
													plain
													primary
													data-test="open-agent-feedback-modal"
													onClick={() => setFeedbackFor(agent.card)}
												>
													write feedback
												</Button>
											)}
										</Flex>
									)
								})}
							</Box>
						)}

						<Flex mt={4}>
							<Button
								data-test="skip-step"
								onClick={skipStep}
							>
								Done
							</Button>
						</Flex>
					</React.Fragment>
				)}

				{step === 2 && (
					<Flex mt={4} justifyContent="space-around">
						<Button
							mr={2}
							primary
							data-test="finish-auditing"
							onClick={props.archiveCard}
						>
							Finish auditing and archive this thread
						</Button>
					</Flex>
				)}
			</Flex>

			{feedbackFor && (
				<Feedback
					user={feedbackFor}
					done={createFeedback}
				/>
			)}
		</Box>
	)
}
