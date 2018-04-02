const CopyWebpackPlugin = require('copy-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

const root = path.resolve(__dirname, '.')
const uiRoot = path.join(root, 'lib', 'ui')
const indexFilePath = path.join(uiRoot, 'index.html')
const iconsFolderPath = path.join(uiRoot, 'icons')
const outDir = path.join(root, 'dist')

module.exports = {
	mode: 'development',
	entry: path.join(root, 'lib', 'ui', 'index.tsx'),
	output: {
		filename: 'bundle.js',
		path: outDir
	},

	// Enable sourcemaps for debugging webpack's output.
	devtool: 'source-map',

	resolve: {
		// Add '.ts' and '.tsx' as resolvable extensions.
		extensions: [ '.ts', '.tsx', '.js', '.json' ]
	},

	module: {
		rules: [
			// All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
			{
				test: /\.tsx?$/,
				use: [
					{
						loader: 'cache-loader'
					},
					{
						loader: 'thread-loader',
						options: {
							// There should be 1 cpu for the fork-ts-checker-webpack-plugin
							workers: require('os').cpus().length - 1
						}
					},
					{
						loader: 'ts-loader',
						options: {
							// Disable type checker - we will use it in fork plugin
							transpileOnly: true,
							happyPackMode: true
						}
					}
				]
			},

			// All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
			{
				enforce: 'pre',
				test: /\.js$/,
				loader: 'source-map-loader'
			}
		]
	},

	devServer: {
		contentBase: outDir,
		compress: true,
		port: 9000
	},

	plugins: [
		new CopyWebpackPlugin([
			{
				from: iconsFolderPath,
				to: 'icons'
			}
		]),
		new ForkTsCheckerWebpackPlugin(),
		new HtmlWebpackPlugin({
			template: indexFilePath
		})
	]
}
