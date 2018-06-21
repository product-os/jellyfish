const CopyWebpackPlugin = require('copy-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const DefinePlugin = require('webpack/lib/DefinePlugin')
const IgnorePlugin = require('webpack/lib/IgnorePlugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const root = path.resolve(__dirname, '.')
const uiRoot = path.join(root, 'lib', 'ui')
const indexFilePath = path.join(uiRoot, 'index.html')
const iconsFolderPath = path.join(uiRoot, 'icons')
const audioFolderPath = path.join(uiRoot, 'audio')
const outDir = path.join(root, 'dist')

const config = {
	mode: 'development',
	entry: path.join(root, 'lib', 'ui', 'index.tsx'),
	output: {
		filename: 'bundle.[hash].js',
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
			},
			{
				from: audioFolderPath,
				to: 'audio'
			}
		]),

		new ForkTsCheckerWebpackPlugin(),

		new HtmlWebpackPlugin({
			template: indexFilePath
		}),

		new DefinePlugin({
			'process.env': {
				API_URL: JSON.stringify(process.env.API_URL),
				API_PREFIX: JSON.stringify(process.env.API_PREFIX || 'api/v1/'),
				NODE_ENV: JSON.stringify(process.env.NODE_ENV)
			}
		}),

		// The moment.js package includes its locales by default, they are huge and
		// we don't use them, we're going to ignore them
		new IgnorePlugin(/^\.\/locale$/, /moment$/),

		new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: '../webpack-bundle-report.html',
			openAnalyzer: false
		})
	]
}

if (process.env.NODE_ENV !== 'dev') {
	config.mode = 'production'
	config.optimization = {
		minimize: true
	}
}

module.exports = config
