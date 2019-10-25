/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const utils = require('axios/lib/utils')
const settle = require('axios/lib/core/settle')
const buildURL = require('axios/lib/helpers/buildURL')
const parseHeaders = require('axios/lib/helpers/parseHeaders')
const isURLSameOrigin = require('axios/lib/helpers/isURLSameOrigin')
const createError = require('axios/lib/core/createError')
const btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('axios/lib/helpers/btoa')

const getCorsWindow = (function () {
	let frame = null
	let loaded = false

	return async (iframeSrc) => {
		if (loaded) {
			return frame.contentWindow
		}

		return new Promise((resolve, reject) => {
			if (!frame) {
				frame = document.createElement('iframe')
				frame.src = iframeSrc
				frame.style.position = 'absolute'
				frame.style.left = '-9999px'
				document.body.appendChild(frame)
			}

			frame.addEventListener('load', () => {
				loaded = true
				resolve(frame.contentWindow)
			}, {
				once: true
			})

			frame.addEventListener('error', (event) => {
				reject(event.error)
			}, {
				once: true
			})
		})
	}
}())

/*
 * See original source: https://github.com/axios/axios/blob/v0.19.0/lib/adapters/xhr.js
 * Could not change `XMLHttpRequest` in original source, so had to copy all code.
 */
const xhrAdapter = (config, XhrFactory) => {
	return new Promise((resolve, reject) => {
		let requestData = config.data
		const requestHeaders = config.headers

		if (utils.isFormData(requestData)) {
			// Let the browser set it
			Reflect.deleteProperty(requestHeaders, 'Content-Type')
		}

		let request = new XhrFactory()
		const loadEvent = 'onreadystatechange'

		// HTTP basic authentication
		if (config.auth) {
			const username = config.auth.username || ''
			const password = config.auth.password || ''
			requestHeaders.Authorization = `Basic ${btoa(`${username}:${password}`)}`
		}

		request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true)

		// Set the request timeout in MS
		request.timeout = config.timeout

		// Listen for ready state
		request[loadEvent] = () => {
			if (!request || request.readyState !== 4) {
				return
			}

			// The request errored out and we didn't get a response, this will be
			// handled by onerror instead
			// With one exception: request that using file: protocol, most browsers
			// will return status as 0 even though it's a successful request
			if (request.status === 0 && !(request.responseURL && request.responseURL.startsWith('file:'))) {
				return
			}

			// Prepare the response
			const responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null
			const responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response
			const response = {
				data: responseData,

				// IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
				status: request.status === 1223 ? 204 : request.status,
				statusText: request.status === 1223 ? 'No Content' : request.statusText,
				headers: responseHeaders,
				config,
				request
			}

			settle(resolve, reject, response)

			// Clean up request
			request = null
		}

		// Handle low level network errors
		request.onerror = () => {
			// Real errors are hidden from us by the browser
			// onerror should only fire if it's a network error
			reject(createError('Network Error', config, null, request))

			// Clean up request
			request = null
		}

		// Handle timeout
		request.ontimeout = () => {
			reject(createError(`timeout of ${config.timeout}ms exceeded`, config, 'ECONNABORTED',
				request))

			// Clean up request
			request = null
		}

		// Add xsrf header
		// This is only done if running in a standard browser environment.
		// Specifically not if we're in a web worker, or react-native.
		if (utils.isStandardBrowserEnv()) {
			const cookies = require('axios/lib/helpers/cookies')

			// Add xsrf header
			const xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName
				? cookies.read(config.xsrfCookieName)
				: null

			if (xsrfValue) {
				requestHeaders[config.xsrfHeaderName] = xsrfValue
			}
		}

		// Add headers to the request
		if ('setRequestHeader' in request) {
			utils.forEach(requestHeaders, (val, key) => {
				if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
					// Remove Content-Type if data is undefined
					Reflect.deleteProperty(requestHeaders, key)
				} else {
					// Otherwise add header to the request
					request.setRequestHeader(key, val)
				}
			})
		}

		// Add withCredentials to request if needed
		if (config.withCredentials) {
			request.withCredentials = true
		}

		// Add responseType to request if needed
		if (config.responseType) {
			try {
				request.responseType = config.responseType
			} catch (err) {
				// Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
				// But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
				if (config.responseType !== 'json') {
					throw err
				}
			}
		}

		// Handle progress if needed
		if (typeof config.onDownloadProgress === 'function') {
			request.addEventListener('progress', config.onDownloadProgress)
		}

		// Not all browsers support upload events
		if (typeof config.onUploadProgress === 'function' && request.upload) {
			request.upload.addEventListener('progress', config.onUploadProgress)
		}

		if (config.cancelToken) {
			// Handle cancellation
			config.cancelToken.promise.then((cancel) => {
				if (!request) {
					return
				}

				request.abort()
				reject(cancel)

				// Clean up request
				request = null
			})
		}

		if (typeof requestData === 'undefined') {
			requestData = null
		}

		// Send the request
		request.send(requestData)
	})
}

/*
 * See: https://github.com/axios/axios/blob/v0.19.0/lib/defaults.js#L16
 */
module.exports = (apiUrl) => {
	// For node use HTTP adapter
	if (typeof process !== 'undefined' && Reflect.apply(Object.prototype.toString, process, []) === '[object process]') {
		return require('axios/lib/adapters/http')
	}

	// For browsers use XHR adapter
	return async (config) => {
		let global = null
		let err = null

		try {
			global = await getCorsWindow(`${apiUrl}/cors.html`)
		} catch (error) {
			err = error
		}

		if (!global) {
			console.warn('Could not load /cors.html iframe window. Falling back to parent window', err)
			global = window
		}

		return xhrAdapter(config, global.XMLHttpRequest)
	}
}
