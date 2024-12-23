/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
declare module "*.astro";

declare module "astro:content" {
  interface CollectionEntry<T> {
    data: T;
    id: string;
    collection: string;
  }
}
