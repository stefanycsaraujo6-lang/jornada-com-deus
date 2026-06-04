/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authActions from "../authActions.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as kiwify from "../kiwify.js";
import type * as kiwifyHttp from "../kiwifyHttp.js";
import type * as lib_kiwify from "../lib/kiwify.js";
import type * as lib_validation from "../lib/validation.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authActions: typeof authActions;
  health: typeof health;
  http: typeof http;
  kiwify: typeof kiwify;
  kiwifyHttp: typeof kiwifyHttp;
  "lib/kiwify": typeof lib_kiwify;
  "lib/validation": typeof lib_validation;
  profiles: typeof profiles;
  progress: typeof progress;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
