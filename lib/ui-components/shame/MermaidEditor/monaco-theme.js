/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'

// TODO Make monaco mermiad support a standalone package accessible as OSS
// Register a new language
monaco.languages.register({
	id: 'mermaid'
})

const ARROWS = [
	'->>',
	'-->>',
	'->',
	'-->',
	'--x',
	'-x'
]

const NOTES = [
	'note over',
	'note left of',
	'note right of'
]

const NOUNS = [
	'participant',
	'activate',
	'deactivate',
	'loop',
	'end',
	'alt',
	'else',
	'opt',
	'rect'
]

const ACTOR_REGEXP = new RegExp(`(${[ ...ARROWS ].join('|')})(\\s|\\w)+:`, 'gm')
const ARROW_REMOVAL_REGEXP = new RegExp(`(${[ ...ARROWS ].join('|')}|:)`, 'gm')

// Register a tokens provider for the language
monaco.languages.setMonarchTokensProvider('mermaid', {
	tokenizer: {
		root: [
			[ new RegExp(`(${ARROWS.join('|')})`), 'arrow' ],
			[ /(graph\s(TB|BT|RL|LR|TD)|sequenceDiagram|classDiagram|stateDiagrami|gantt|pie)/, 'type' ],
			[ /:.+$/, 'statement' ],
			[ new RegExp(`(${[ ...NOTES, ...NOUNS ].join('|')})`), 'noun' ],
			[ /%%.+$/, 'comment' ]
		]
	}
})

// Define a new theme that contains only rules that match this language
monaco.editor.defineTheme('mermaid-theme', {
	base: 'vs',
	inherit: false,
	rules: [
		{
			token: 'arrow', foreground: 'ffa500', fontStyle: 'bold'
		},
		{
			token: 'type', foreground: 'dc322f', fontStyle: 'bold'
		},
		{
			token: 'statement', foreground: '008800'
		},
		{
			token: 'noun', foreground: '800080'
		},
		{
			token: 'comment', foreground: '999999'
		}
	]
})

// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('mermaid', {
	provideCompletionItems: (model, position) => {
		const value = model.getValue()

		const actors = _.uniq(
			_.invokeMap(value.match(ACTOR_REGEXP), String.prototype.replace, ARROW_REMOVAL_REGEXP, '')
		)

		const suggestions = [ ...actors, ...ARROWS, ...NOTES, ...NOUNS ].map((word) => {
			return {
				label: word,
				kind: monaco.languages.CompletionItemKind.Text,
				insertText: word
			}
		})

		return {
			suggestions
		}
	}
})
