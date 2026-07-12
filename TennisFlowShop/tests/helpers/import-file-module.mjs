import { pathToFileURL } from "node:url";

export function importFileModule(filePath) {
  return import(pathToFileURL(filePath).href);
}
