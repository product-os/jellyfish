/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// TODO move this editor into a standalone package
import * as _ from 'lodash'
import React from 'react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js'
import {
	Box,
	Button,
	Flex,
	Provider
} from 'rendition'
import {
	Mermaid
} from 'rendition/dist/extra/Mermaid'
import './monaco-theme'

self.MonacoEnvironment = {
	getWorkerUrl (moduleId, label) {
		if (label === 'json') {
			return './json.worker.js'
		}
		if (label === 'css') {
			return './css.worker.js'
		}
		if (label === 'html') {
			return './html.worker.js'
		}
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.js'
		}
		return './editor.worker.js'
	}
}

class MermaidEditor extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			preview: false,
			fullscreen: false,
			splitview: false,
			previewValue: this.props.value
		}

		this.setSplitView = this.setSplitView.bind(this)
		this.setFullScreen = this.setFullScreen.bind(this)
		this.setPreview = this.setPreview.bind(this)

		// Debouncing setting the preview value improves performance as it will only
		// periodically update the preview, instead of re-rendering it on every
		// change
		this.setPreviewValue = _.debounce(this.setPreviewValue.bind(this), 500)
	}

	componentDidMount () {
		this.initMonaco()
	}

	componentDidUpdate () {
		this.setPreviewValue(this.props.value)
	}

	setPreviewValue (previewValue) {
		this.setState({
			previewValue
		})
	}

	initMonaco () {
		const {
			renderArea
		} = this

		if (!renderArea) {
			return
		}

		const editor = monaco.editor.create(renderArea, {
			theme: 'mermaid-theme',
			value: this.props.value,
			language: 'mermaid',
			automaticLayout: true
		})

		editor.onDidChangeModelContent(() => {
			this.props.onChange(editor.getValue())
		})
	}

	setPreview () {
		if (this.state.preview) {
			this.setState({
				preview: false
			})
		} else {
			this.setState({
				preview: true,
				splitview: false
			})
		}
	}

	setSplitView () {
		if (this.state.splitview) {
			this.setState({
				splitview: false,
				preview: false
			})
		} else {
			this.setState({
				fullscreen: true,
				splitview: true,
				preview: false
			})
		}
	}

	setFullScreen () {
		if (this.state.fullscreen) {
			this.setState({
				fullscreen: false,
				splitview: false
			})
		} else {
			this.setState({
				fullscreen: true,
				splitview: false
			})
		}
	}

	render () {
		const {
			preview,
			splitview,
			fullscreen
		} = this.state

		const fullScreenStyle = {
			position: 'fixed',
			background: 'white',
			top: 0,
			bottom: 0,
			left: 0,
			right: 0,
			zIndex: 9
		}

		const smallscreenstyle = {
			minHeight: 600,
			maxHeight: 500,
			border: '1px solid #bbb',
			borderRadius: 4,
			overflow: 'hidden'
		}

		return (
			<Provider>
				<Flex flexDirection='column' style={fullscreen || splitview ? fullScreenStyle : smallscreenstyle}>
					<Box style={{
						borderBottom: '1px solid #bbb', padding: 9
					}}>
						<Button
							p={1}
							m={1}
							icon={<i className="fas fa-eye" />}
							plain
							onClick={this.setPreview}
						/>

						<Button
							p={1}
							m={1}
							icon={<i className="fas fa-columns" />}
							plain
							onClick={this.setSplitView}
						/>

						<Button
							p={1}
							m={1}
							icon={<i className="fas fa-expand-arrows-alt" />}
							plain onClick={this.setFullScreen}
						/>
					</Box>
					<Flex flex='1' style={{
						minHeight: 0
					}}>
						<div
							style={{
								display: (!splitview && !preview) || splitview ? 'block' : 'none',
								minHeight: '100%',
								width: splitview ? '50%' : '100%'
							}}
							ref={(element) => { return (this.renderArea = element) }}
						/>

						{(splitview || preview) && (
							<Box flex={1} style={{
								overflowY: 'scroll'
							}}>
								<Mermaid
									key={this.state.previewValue}
									flex={1} value={this.state.previewValue}
								/>
							</Box>
						)}
					</Flex>
				</Flex>
			</Provider>
		)
	}
}

export default MermaidEditor
