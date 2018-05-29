interface EvaluateOptions {
	input: any;
	context?: any;
}

export declare function evaluate(expression: string, options: EvaluateOptions): {
	value: any;
	watchers: Array<{ [k: string]: any }>;
};
