/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	MarkdownWidget
} from 'rendition/dist/extra/Renderer/MarkdownWidget'
import {
	MermaidWidget
} from 'rendition/dist/extra/Renderer/MermaidWidget'
import {
	withOptionProps
} from 'rendition/dist/components/Renderer/widgets/widget-util'

export const JellyfishWidgets = [
	{
		name: 'markdown',
		format: '.*',
		widget: MarkdownWidget
	},
	{
		name: 'mermaid',
		format: '.*',
		widget: MermaidWidget
	},
	...[].map((widget) => ({
		name: widget.displayName,
		format: '.*',
		widget: widget.uiOptions
			? withOptionProps(widget.uiOptions)(widget)
			: widget
	}))
]
