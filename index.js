
import { readFile } from 'node:fs/promises';
import keytar from "keytar";

const SERVICE = 'com.berjon.diotima';
const ACCOUNT = 'w3c-bod-gitub';

// call with makeRel(import.meta.url), returns a function that resolves relative paths
export function makeRel (importURL) {
  return (pth) => new URL(pth, importURL).toString().replace(/^file:\/\//, '');
}

export async function loadJSON (url) {
  const data = await readFile(url);
  return new Promise((resolve, reject) => {
    try {
      resolve(JSON.parse(data));
    }
    catch (err) {
      reject(err);
    }
  });
}

export async function getToken () {
  return keytar.getPassword(SERVICE, ACCOUNT);
}

export async function setToken (tok) {
  return keytar.setPassword(SERVICE, ACCOUNT, tok);
}
