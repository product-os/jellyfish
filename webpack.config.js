const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

const root = path.resolve(__dirname, '.')
const indexFilePath = path.join(root, 'lib', 'ui', 'index.html')
const outDir = path.join(root, 'dist')

module.exports = {
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
				loader: 'ts-loader'
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
		new HtmlWebpackPlugin({
			template: indexFilePath
		})
	]
}
