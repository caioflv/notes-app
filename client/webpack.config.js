import path from "path"

import HtmlWebpackPlugin from "html-webpack-plugin"
import CopyWebpackPlugin from "copy-webpack-plugin"
import MiniCssExtractPlugin from "mini-css-extract-plugin"

import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default (env, argv) => {
	const isProd = argv.mode === "production"
	console.log("🔧 Modo atual:", argv.mode)

	return {
		target: "web",
		mode: isProd ? "production" : "development",

		entry: path.resolve(__dirname, "src", "main.js"),
		output: {
			filename: isProd ? "[name].[contenthash].js" : "main.js",
			path: path.resolve(__dirname, "dist"),
			publicPath: isProd ? "./" : "/",
		},

		devServer: {
			static: {
				directory: path.resolve(__dirname, "dist"),
			},
			port: 3005,

			open: true,
			liveReload: true,
			hot: false,
		},

		module: {
			rules: [
				{
					test: /\.css$/,
					use: [
						isProd ? MiniCssExtractPlugin.loader : "style-loader",
						"css-loader",
					],
				},
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: {
						loader: "babel-loader",
						options: {
							presets: ["@babel/preset-env"],
						},
					},
				},
			],
		},

		optimization: {
			splitChunks: {
				cacheGroups: {
					styles: {
						name: "styles",
						type: "css/mini-extract",
						chunks: "all",
						enforce: true,
					},
				},
			},
		},

		plugins: [
			new HtmlWebpackPlugin({
				template: path.resolve(__dirname, "src", "index.html"),
				filename: "index.html",
				// favicon: path.resolve("src", "assets", "scissors.svg"),
			}),

			new MiniCssExtractPlugin({
				filename: "[name].[contenthash].css",
			}),

			new CopyWebpackPlugin({
				patterns: [
					{
						from: path.resolve(__dirname, "src", "assets"),
						to: path.resolve(__dirname, "dist", "assets"),
					},
				],
			}),
		],
	}
}
