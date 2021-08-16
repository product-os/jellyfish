/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const fs = require('fs')
const path = require('path')

/*
 * Root of the main project
 */
const ROOT = path.resolve(__dirname, '../')
const PROJECT_WORKDIR = '/usr/src/app'
const BASE_NODE_IMAGE = 'balenalib/%%BALENA_MACHINE_NAME%%-node:15-stretch-build'

/*
 * Get package dependencies
 */
const getPackageDependencies = (targetPackage) => {
	return Object.keys({
		...targetPackage.files['package.json'].dependencies,
		...targetPackage.files['package.json'].devDependencies
	}).map((name) => {
		return packages.find((pack) => {
			return pack.files['package.json'].name === name
		})
	}).filter((pack) => {
		return pack
	})
}

const readDockerfileInstructions = (dockerfile) => {
	return dockerfile.split('\n').map((line) => {
		const [ type, ...args ] = line.trim().split(' ')

		return {
			type,
			args
		}
	})
}

const sortPackagesByDependencies = (packages) => {
	const notResolveds = [ ...packages ]
	const areResolveds = []

	let index = 0
	while (notResolveds.length) {
		const notResolved = notResolveds[index]
		const deps = getPackageDependencies(notResolved)

		if (deps.every((dep) => {
			return areResolveds.includes(dep)
		})) {
			notResolveds.splice(index, 1)
			areResolveds.push(notResolved)
			index %= notResolveds.length
		} else {
			index = (index + 1) % notResolveds.length
		}
	}

	return areResolveds
}

/*
 * Read all packages
 * TODO: Find out where packages are by reading lerna.json instead of hardcoding directories below
 */
const packages = [
	'./apps',
	'./.libs'
].reduce((packs, folderName) => {
	return packs.concat(fs.readdirSync(path.resolve(ROOT, folderName))
		.filter((moduleFolderName) => {
			return moduleFolderName === 'server' || moduleFolderName === 'jellyfish-worker'
		})
		.map((moduleFolderName) => {
			const dir = `${folderName}/${moduleFolderName}`
			const files = [
				[
					'package.json',
					null,
					JSON.parse
				],
				[
					'Dockerfile.template',
					`
                    FROM ${BASE_NODE_IMAGE}
                    WORKDIR ${PROJECT_WORKDIR}
                    COPY package*.json ./
                    RUN npm i
                    COPY . .
                    RUN npm run build --if-present
                    `,
					readDockerfileInstructions
				]
			].reduce((result, [ fileName, defaultContent, parser ]) => {
				const filePath = path.resolve(ROOT, dir, fileName)

				let content = null
				if (fs.existsSync(filePath)) {
					content = fs.readFileSync(filePath, 'utf8')
				} else {
					content = defaultContent
				}

				if (parser) {
					content = parser(content)
				}

				result[fileName] = content
				return result
			}, {})

			return {
				dir,
				files
			}
		}))
}, [])

const template = `
FROM ${BASE_NODE_IMAGE} as base
# Install git
RUN install_packages git
# Defines our working directory in container
WORKDIR ${PROJECT_WORKDIR}
# Copies the package.json first for better cache on later pushes
COPY package*.json ./
# This install npm dependencies on the balena build server,
# making sure to clean up the artifacts it creates in order to reduce the image size.
RUN JOBS=MAX npm install --unsafe-perm && npm cache verify && rm -rf /tmp/*
# Prepare for bootstrap
COPY lerna.json ./
${sortPackagesByDependencies(packages).map((pack) => {
		return pack.files['Dockerfile.template'].reduce((instructions, instruction) => {
			/*
			 * Each module dockerfile becomes a stage in main dockerfile,
			 * so here we're adding name of the stage
			 */
			if (instruction.type === 'FROM') {
				if (instruction.args[0] === BASE_NODE_IMAGE) {
					instructions.push({
						...instruction,
						args: [ `base as ${pack.files['package.json'].name}` ]
					})
				} else {
					instructions.push({
						...instruction,
						args: instruction.args.concat(`as ${pack.files['package.json'].name}`)
					})
				}
			} else

			/*
			 * Changing build context from module dir to monorepo dir
			 */
			if (instruction.type === 'WORKDIR') {
				instructions.push({
					...instruction,
					args: [ path.join(PROJECT_WORKDIR, pack.dir) ]
				})
			} else

			/*
			 * Changing build context from module dir to monorepo dir.
			 * Need to change only from args, since `to` is changed by modifying WORKDIR above.
			 */
			if (instruction.type === 'COPY') {
				const fromArgs = instruction.args.slice(0, instruction.args.length - 1)
				const to = instruction.args[instruction.args.length - 1]
				instructions.push({
					...instruction,
					args: [
						...fromArgs.map((fromArg) => {
							return path.join(pack.dir, fromArg)
						}),
						to
					]
				})
			} else

			/*
			 * Change npm install with:
			 * 1. Adding necessary dependencies
			 * 2. Bootstraping specific module
			 */
			if (instruction.type === 'RUN') {
				if (instruction.args[0] === 'npm' &&
                [ 'i', 'ci' ].some((cmd) => { return cmd === instruction.args[1] })
				) {
					const deps = getPackageDependencies(pack)
					for (const dep of deps) {
						instructions.push({
							type: 'COPY',
							args: [
								`--from=${dep.files['package.json'].name}`,
								`${path.join(PROJECT_WORKDIR, dep.dir)}`,
								`${path.relative(pack.dir, dep.dir)}`
							]
						})
					}
					instructions.push({
						type: 'RUN',
						args: [
							`cd ${path.relative(pack.dir, '.')} &&`,
							`./node_modules/.bin/lerna bootstrap
                            --scope="${pack.files['package.json'].name}"
                            --include-dependencies`
						]
					})
				} else {
					instructions.push(instruction)
				}
			} else if (instruction.type !== 'CMD') {
				instructions.push(instruction)
			}
			return instructions
		}, []).map((instruction) => {
			return [ instruction.type, ...instruction.args ].join(' ')
		}).join('\n')
	}).join('\n')}
# We could skip all steps below if balena supported \`target\` field in docker-compose.
FROM base
${packages.map((pack) => {
		return `COPY --from=${pack.files['package.json'].name} ${path.join(PROJECT_WORKDIR, pack.dir)} ${pack.dir}`
	}).join('\n')}
CMD ${packages.filter((pack) => {
		return pack.files['package.json'].scripts && pack.files['package.json'].scripts.start
	}).map((pack) => {
		return `npm start --prefix ${pack.dir}`
	}).join(' & ')}
`

fs.writeFileSync(
	path.resolve(ROOT, 'Dockerfile.template'),
	template,
	'utf8'
)
