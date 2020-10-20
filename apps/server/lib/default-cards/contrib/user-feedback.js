/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable max-len */
/* eslint-disable no-template-curly-in-string */

module.exports = ({
	uiSchemaDef
}) => {
	return {
		slug: 'user-feedback',
		name: 'User Feedback',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				required: [
					'data'
				],
				properties: {
					data: {
						type: 'object',
						properties: {
							user: {
								title: 'Username',
								type: [ 'string', 'null' ],
								fullTextSearch: true
							},
							howDidYouFirstHearAboutBalenaCloud: {
								title: 'How did you first hear about balenaCloud?',
								type: 'string',
								fullTextSearch: true
							},
							howWouldYouDescribeYourRole: {
								title: 'How would you describe your role?',
								type: 'string',
								fullTextSearch: true
							},
							couldYouBrieflyDescribeYourUsecase: {
								title: 'Could you briefly describe your use case?',
								type: 'string',
								fullTextSearch: true
							},
							howHasYourExperienceBeenSoFar: {
								title: 'How has your experience been so far? What can we improve? We count on your honest feedback to make balenaCloud better.',
								type: 'string',
								fullTextSearch: true
							},
							howLikelyAreYouToRecommendBalenaCloud: {
								title: 'How likely are you to recommend balenaCloud to a friend or co-worker?',
								type: 'number'
							},
							curatedOrigin: {
								title: 'Curated Origin',
								type: 'string',
								fullTextSearch: true
							},
							originDetail: {
								title: 'Curated Origin Detail',
								type: 'string',
								fullTextSearch: true
							},
							role: {
								title: 'Curated Role',
								type: 'string',
								fullTextSearch: true
							},
							useCaseSegment: {
								title: 'Curated Use Case Segment',
								type: 'string',
								fullTextSearch: true
							},
							useCaseDetail: {
								title: 'Curated Use Case Detail',
								type: 'string',
								fullTextSearch: true
							},
							experienceEvaluation: {
								title: 'Curated Experierience Evaluation',
								type: 'string',
								fullTextSearch: true,
								enum: [
									'Very Positive',
									'Somewhat Positive',
									'Neutral',
									'Somewhat Negative',
									'Very Negative'
								]
							},
							issuesWants: {
								title: 'Curated Issues/Wants',
								type: 'string',
								fullTextSearch: true
							},
							highlights: {
								title: 'Curated Highlights',
								type: 'string',
								fullTextSearch: true
							}
						}
					}
				}
			},
			uiSchema: {
				fields: {
					data: {
						'ui:order': [
							'user',
							'howDidYouFirstHearAboutBalenaCloud',
							'howWouldYouDescribeYourRole',
							'couldYouBrieflyDescribeYourUsecase',
							'howHasYourExperienceBeenSoFar',
							'howLikelyAreYouToRecommendBalenaCloud',
							'curatedOrigin',
							'originDetail',
							'role',
							'useCaseSegment',
							'useCaseDetail',
							'experienceEvaluation',
							'issuesWants',
							'highlights',
							'*'
						]
					}
				},
				snippet: {
					$ref: uiSchemaDef('reset'),
					data: null
				},
				edit: {
					$ref: '#/data/uiSchema/definitions/form'
				},
				create: {
					$ref: '#/data/uiSchema/edit'
				},
				definitions: {
					form: {
						data: {
							'ui:order': [
								'howDidYouFirstHearAboutBalenaCloud',
								'howWouldYouDescribeYourRole',
								'couldYouBrieflyDescribeYourUsecase',
								'howHasYourExperienceBeenSoFar',
								'howLikelyAreYouToRecommendBalenaCloud',
								'curatedOrigin',
								'originDetail',
								'role',
								'useCaseSegment',
								'useCaseDetail',
								'experienceEvaluation',
								'issuesWants',
								'highlights',
								'*'
							],
							curatedOrigin: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.curatedOrigin'
								}
							},
							originDetail: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.originDetail'
								}
							},
							role: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.role'
								}
							},
							useCaseSegment: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.useCaseSegment'
								}
							},
							useCaseDetail: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.useCaseDetail'
								}
							},
							issuesWants: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.issuesWants'
								}
							},
							highlights: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'user-feedback',
									keyPath: 'data.highlights'
								}
							}
						}
					}
				}
			}
		}
	}
}
