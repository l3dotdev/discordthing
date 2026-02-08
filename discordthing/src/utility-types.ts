export type MaybePromise<T> = T | Promise<T>;

/**
 * Hack! This type causes TypeScript to simplify how it renders object types.
 *
 * It is functionally the identity for object types, but in practice it can
 * simplify expressions like `A & B`.
 */
export type Expand<ObjectType extends Record<any, any>> =
	ObjectType extends Record<any, any>
		? {
				[Key in keyof ObjectType]: ObjectType[Key];
			}
		: never;

/**
 * Convert a union type like `A | B | C` into an intersection type like
 * `A & B & C`.
 */
export type UnionToIntersection<UnionType> = (
	UnionType extends any ? (k: UnionType) => void : never
) extends (k: infer I) => void
	? I
	: never;
