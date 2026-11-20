/**
 * The storefront's domain model (ADR 0001, GLOSSARY.md): one folder per
 * bounded context plus the shared kernel. Pure TypeScript, no Nuxt, Vue or
 * backend imports, so app, server and tests can use it.
 */
export * from "./customer";
export * from "./discoverability";
export * from "./kernel";
export * from "./menu";
export * from "./ordering";
export * from "./restaurant";
