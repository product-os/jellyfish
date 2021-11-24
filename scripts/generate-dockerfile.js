/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const fs = require('fs');
const path = require('path');

/*
 * Root of the project
 */
const ROOT = path.resolve(__dirname, '../')
const PROJECT_WORKDIR = '/usr/src/app'
const NODE_BASE_IMAGE = 'balena/open-balena-base:v12.2.0'

const specialCharacterMap = {
    '@': '',
    '/': '-',
};

const escapeSpecialCharacters = (str) => {
    return Object.keys(specialCharacterMap).reduce((result, key) => {
        return result.split(key).join(specialCharacterMap[key])
    }, str)
}

/*
 * All packages
 */
const packages = [
    './apps',
    './libs'
].reduce((result, folderName) => {
    return result.concat(fs.readdirSync(path.resolve(ROOT, folderName))
        .reduce((modules, moduleFolderName) => {
            const dir = folderName + '/' + moduleFolderName

            let stat = null
            let err = null
            try {
                stat = fs.statSync(path.resolve(ROOT, dir))
            }
            catch (_err) {
                err = _err
                stat = null
            }

            if (!stat || !stat.isDirectory()) {
                console.warn(`Skipping folder "${path.resolve(ROOT, dir)}" since it's not a module`, err)
                return modules
            }

            const files = [
                [
                    'package.json',
                    undefined,
                    JSON.parse
                ],
                [
                    'Dockerfile',
                    `
                    FROM ${NODE_BASE_IMAGE}
                    WORKDIR ${PROJECT_WORKDIR}
                    COPY package*.json ./
                    RUN npm i
                    COPY . .
                    RUN npm pack --unsafe-perm
                    `
                ]
            ].reduce((result, [ fileName, defaultContent, parser ]) => {
                const p = path.resolve(ROOT, dir, fileName)

                let content
                if (fs.existsSync(p)) {
                    content = fs.readFileSync(p, 'utf8')
                }
                else {
                    content = defaultContent
                }

                if (parser) {
                    content = parser(content)
                }

                result[fileName] = content
                return result
            }, {})

            return modules.concat({
                dir,
                files
            })
        }, []))
}, [])

/*
 * Get package dependencies
 */
const getPackageDependencies = (package) => {
    return Object.keys({
        ...package.files['package.json'].dependencies,
        ...package.files['package.json'].devDependencies
    }).map((name) => {
        return packages.find((package) => {
            return package.files['package.json'].name === name
        })
    }).filter((package) => {
        return package
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

const getPackageWorkdir = (package) => {
    return readDockerfileInstructions(package.files['Dockerfile'])
        .find((instruction) => {
            return instruction.type === 'WORKDIR'
        }).args[0]
}

const sortPackagesByDependencies = (packages) => {
    const notResolveds = [ ...packages ]
    const areResolveds = []

    let i = 0
    while (notResolveds.length) {
        const notResolved = notResolveds[i]
        const deps = getPackageDependencies(notResolved)

        if (deps.every((dep) => {
            return areResolveds.includes(dep)
        })) {
            notResolveds.splice(i, 1)
            areResolveds.push(notResolved)
            i = i % notResolveds.length
        }
        else {
            i = (i + 1) % notResolveds.length
        }
    }

    return areResolveds
}

const template = `
${sortPackagesByDependencies(packages).map((package) => {
    return readDockerfileInstructions(package.files['Dockerfile'])
        .reduce((instructions, instruction) => {
            if (instruction.type === 'FROM') {
                if (instruction.args[1] === 'as') {
                    instructions.push({
                        ...instruction,
                        args: [ `${instruction.args[0]} as ${package.files['package.json'].name}__intermediate__${instruction.args[2]}` ]
                    })
                }
                else {
                    instructions.push({
                        ...instruction,
                        args: instruction.args.concat(`as ${escapeSpecialCharacters(package.files['package.json'].name)}`)
                    })
                }
            }
            else if (instruction.type === 'COPY') {
                const args = []
                if (instruction.args[0].startsWith('--from')) {
                    const [ , from ] = instruction.args[0].split('=')
                    args.push(
                        `--from=${package.files['package.json'].name}__intermediate__${from}`,
                        ...instruction.args.slice(1, instruction.args.length - 1).map((fromArg) => {
                            return path.resolve('/usr/src/app', fromArg)
                        })
                    )
                }
                else {
                    args.push(
                        ...instruction.args.slice(0, instruction.args.length - 1).map((fromArg) => {
                            return path.join(package.dir, fromArg)
                        })
                    )
                }

                args.push(
                    instruction.args[instruction.args.length - 1]
                )

                instructions.push({
                    ...instruction,
                    args,
                })
            }
            else if (instruction.type === 'RUN') {
                instructions.push(instruction);

                if (instruction.args.join(' ').includes('npm i') || instruction.args.join(' ').includes('npm ci')) {
                    const deps = getPackageDependencies(package)

                    if (deps.length) {
                        for (const dep of deps) {
                            instructions.push({
                                type: 'COPY',
                                args: [
                                    `--from=${escapeSpecialCharacters(dep.files['package.json'].name)}`,
                                    `${getPackageWorkdir(dep)}/${escapeSpecialCharacters(dep.files['package.json'].name)}-${dep.files['package.json'].version}.tgz`,
                                    `./libs/`,
                                ]
                            })
                        }

                        instructions.push({
                            type: 'RUN',
                            args: [
                                `npm i ${deps.map(dep => `./libs/${escapeSpecialCharacters(dep.files['package.json'].name)}-${dep.files['package.json'].version}.tgz`).join(' ')}`
                            ],
                        });
                    }
                }
            }
            else {
                instructions.push(instruction);
            }

            return instructions;
        }, [])
        .map((instruction) => {
            return [ instruction.type, ...instruction.args ].join(' ')
        })
        .join('\n')
}).join('\n\n')}
`

const targetpath = path.resolve(ROOT, 'Dockerfile');
fs.writeFileSync(
    targetpath,
    template,
    'utf8'
)

console.log('Dockerfile succesfully generated. Path:', targetpath)
