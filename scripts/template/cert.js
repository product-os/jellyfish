/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const crypto = require('crypto')
const {
	md, pki, ssh
} = require('node-forge')

const generateKeyPair = () => {
	return pki.rsa.generateKeyPair({
		bits: 4096
	})
}

// Turns forge RSA keypair into PEM format keypair
const getPemKeys = (keys) => {
	return {
		privateKey: ssh.privateKeyToOpenSSH(keys.privateKey),
		publicKey: ssh.publicKeyToOpenSSH(keys.publicKey)
	}
}

const generateCertificate = (details) => {
	if (!details.ca && !details.signingKey) {
		throw new Error('Non CA needs a signing key')
	}

	const keys = generateKeyPair()
	const pemKeys = getPemKeys(keys)

	// If this is a CA, then any issuer attrs are ignored
	const now = new Date()
	const serial = crypto.randomBytes(19)
	const certificate = pki.createCertificate()

	certificate.publicKey = keys.publicKey
	certificate.serialNumber = `7${serial.toString('hex')}`
	certificate.validity.notBefore = now
	certificate.validity.notAfter.setFullYear(
		certificate.validity.notBefore.getFullYear() + details.yearsValid
	)
	certificate.setSubject(details.attributes)
	if (details.extensions) {
		certificate.setExtensions(details.extensions)
	}
	certificate.setIssuer(
		details.ca ? details.attributes : details.issuerAttributes || []
	)
	certificate.sign(details.signingKey || keys.privateKey, md.sha256.create())

	const pemCertificate = pki.certificateToPem(certificate)

	// Return full cert details
	return {
		certificate,
		pemCertificate,
		keys,
		pemKeys
	}
}

/*
 * Generate SSL certificates for enabling https
 */
exports.generateCaAndEec = (details) => {
	// Create the CA keys and CA. Store them in the haproxy dir
	const caAttrs = [
		{
			name: 'commonName',
			value: `${details.tld} CA`
		}
	]

	const ca = generateCertificate({
		directory: details.directory,
		name: 'ca',
		ca: true,
		attributes: caAttrs,
		extensions: [
			{
				name: 'basicConstraints',
				cA: true
			}
		],
		yearsValid: 10
	})

	// Create the EEC keys and EEC itself. Also store in haproxy dir
	const eec = generateCertificate({
		directory: details.directory,
		name: 'eec',
		ca: false,
		attributes: [
			{
				name: 'commonName',
				value: `*.${details.tld}`
			}
		],
		issuerAttributes: caAttrs,
		extensions: [
			{
				name: 'keyUsage',
				keyCertSign: true,
				digitalSignature: true,
				nonRepudiation: true,
				keyEncipherment: true,
				dataEncipherment: true
			},
			{
				name: 'subjectAltName',
				altNames: [
					{
						type: 2,
						value: `*.${details.tld}`
					}
				]
			}
		],
		signingKey: ca.keys.privateKey,
		yearsValid: 4
	})

	return {
		ca: ca.pemCertificate,
		key: eec.pemKeys.privateKey,
		crt: eec.pemCertificate
	}
}
