export interface ILogger {
	trace(...args: unknown[]): any;
	debug(...args: unknown[]): any;
	info(...args: unknown[]): any;
	warn(...args: unknown[]): any;
	error(...args: unknown[]): any;
	fatal(...args: unknown[]): any;
}
