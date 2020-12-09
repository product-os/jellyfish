/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable max-len */
const SLUG = 'blog-post'

module.exports = ({
	mixin, withRelationships, uiSchemaDef
}) => {
	return mixin(withRelationships(SLUG))({
		slug: SLUG,
		name: 'Blog post',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string'
					},
					data: {
						type: 'object',
						properties: {
							post_header_meta: {
								title: 'Post header and meta',
								type: 'object',
								properties: {
									meta_title: {
										type: 'string',
										title: 'Meta title'
									},
									meta_desc: {
										type: 'string',
										title: 'Meta description'
									},
									date: {
										type: 'string',
										format: 'date',
										title: 'Publish date'
									},
									featured_img: {
										type: 'string',
										format: 'data-url',
										title: 'Featured image'
									},
									og_img: {
										type: 'string',
										format: 'data-url',
										title: 'Open graph/social image'
									},
									post_info: {
										title: 'Additional Info',
										type: 'object',
										properties: {
											difficulty: {
												title: 'Difficulty Level',
												type: 'string',
												enum: [ 'Easy', 'Medium', 'Hard' ]
											},
											completion_time: {
												title: 'Approx. completion time',
												type: 'string',
												enum: [ '30m', '2hr', '4hr+' ]
											},
											project_cost: {
												title: 'Project cost',
												type: 'string',
												enum: [ '$', '$$$', '$$$$$$' ]
											}
										}
									}
								}
							},
							subheader: {
								type: 'string',
								title: 'Subheader'
							},
							content: {
								title: 'Post body',
								type: 'array',
								items: {
									type: 'object',
									anyOf: [
										{
											type: 'object',
											title: 'Text',
											properties: {
												text: {
													title: 'value',
													type: 'string',
													format: 'markdown'
												}
											}
										},
										{
											type: 'object',
											title: 'Project step',
											properties: {
												project_step: {
													title: 'value',
													type: 'string'
												}
											}
										},
										{
											title: 'Media (youtube/vimeo)',
											type: 'object',
											properties: {
												media_title: {
													title: 'Media title',
													type: 'string'
												},
												media_url: {
													title: 'Media URL',
													format: 'uri',
													type: 'string'
												}
											}
										},
										{
											title: 'Images',
											type: 'object',
											properties: {
												image_url: {
													title: 'Image URL',
													type: 'string'
												},
												image_alt: {
													title: 'Image alt text',
													type: 'string'
												},
												image_caption: {
													title: 'Image caption',
													type: 'string'
												}
											}
										},
										{
											type: 'string',
											title: 'Editor\'s note',
											properties: {
												editors_note: {
													title: 'value',
													type: 'string',
													format: 'markdown'
												}
											}
										},
										{
											title: 'Promotional object',
											type: 'object',
											properties: {
												cta_subhead: {
													title: 'CTA subhead',
													type: 'string'
												},
												cta_copy: {
													title: 'CTA text',
													type: 'string'
												},
												cta_style: {
													title: 'CTA style',
													type: 'string',
													enum: [ 'Sign up', 'Check it out', 'Learn more' ]
												},
												cta_url: {
													title: 'Target URL',
													format: 'uri',
													type: 'string'
												},
												cta_utm_medium: {
													title: 'UTM: medium',
													type: 'string'
												},
												cta_utm_campaign: {
													title: 'UTM: campaign',
													type: 'string'
												},
												cta_utm_content: {
													title: 'UTM: content',
													type: 'string'
												}
											}
										}
									]
								}
							},
							post_promo: {
								title: 'Post promotional content',
								type: 'array',
								items: {
									type: 'object',
									anyOf: [
										{
											type: 'string',
											properties: {
												social_snippet: {
													title: 'Social snippet',
													type: 'string'
												}
											}
										},
										{
											type: 'string',
											properties: {
												efp_snippet: {
													title: 'EFP snippet',
													type: 'string'
												}
											}
										},
										{
											type: 'string',
											properties: {
												email_newsletter_blurb: {
													title: 'Email newsletter blurb',
													type: 'string'
												}
											}
										}
									]
								}
							}
						}
					}
				}
			},
			uiSchema: {
				fields: {
					data: {
						'ui:order': [
							'subheader',
							'content',
							'post_header_meta',
							'post_promo'
						],
						post_header_meta: {
							date: {
								$ref: uiSchemaDef('date')
							},
							featured_img: null,
							og_img: null
						},
						content: {
							'ui:title': null,
							items: {
								'ui:title': null,
								text: {
									'ui:title': null,
									'ui:widget': 'Markdown'
								}
							}
						}
					}
				}
			},
			fieldOrder: [ 'post_header_meta', 'subheader', 'content', 'post_promo' ]
		}
	})
}
