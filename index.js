
import { readFile } from 'node:fs/promises';
import keytar from "keytar";
import { Octokit } from 'octokit';
import axios from 'axios';
import ical2json from 'ical2json';

const SERVICE = 'com.berjon.diotima';
const ACCOUNT = 'w3c-bod-gitub';
const bodCal = 'https://www.w3.org/groups/other/board/calendar/export?include_canceled=0';

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

export async function generateAgenda ({ githubToken }) {
  const cal = await getBodCalendar();
  const gh = createGitHubClient(githubToken);
}

function createGitHubClient (auth) {
  if (!auth) throw new Error('GitHub client needs a token');
  return new Octokit({ auth });
}

async function getBodCalendar () {
  const res = await axios.get(bodCal);
  if (res.status >= 400) throw new Error(`Could not get W3C BoD Calendar`, res.statusText);
  const data = await res.data;
  const json = ical2json.convert(data);
  const events = json.VCALENDAR[0].VEVENT.filter(ev => /^Board\s+of\s+Directors/i.test(ev.SUMMARY));
  console.warn(JSON.stringify(events, null, 2));
  // XXX
  // - convert to a sane data structure (eg. "DTSTART;TZID=America/Los_Angeles")
  // - when events are on consecutive days, these are taken to be the same event and a multi day agenda
  // - the event we care about is the next one in the future
  return data;
}
