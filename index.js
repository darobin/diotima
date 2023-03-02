
import { readFile } from 'node:fs/promises';
import keytar from "keytar";
import { Octokit } from 'octokit';
import axios from 'axios';
import ical2json from 'ical2json';
import { find } from 'linkifyjs';

const SERVICE = 'com.berjon.diotima';
const GH_ACCOUNT = 'w3c-bod-gitub';
const CAL_ACCOUNT = 'w3c-bod-calendar';
const ONE_AND_A_HALF_DAYS = 36 * 60 * 60 * 1000; // in case DST or start time shifts
const DATE_FMT = { weekday: 'long', year: 'numeric', month: 'long', day: '2-digit' };
const TIME_FMT = { hour: "2-digit", minute: "2-digit", hour12: false };
const REPOS = ['finance', 'personnel', 'governance', 'board'];
const REPO_LABELS = {
  finance: 'Finance Committee',
  personnel: 'Personnel Committee',
  governance: 'Governance Committee',
  board: 'Board',
};


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
  return keytar.getPassword(SERVICE, GH_ACCOUNT);
}
export async function setToken (tok) {
  return keytar.setPassword(SERVICE, GH_ACCOUNT, tok);
}
export async function getCalendar () {
  return keytar.getPassword(SERVICE, CAL_ACCOUNT);
}
export async function setCalendar (tok) {
  return keytar.setPassword(SERVICE, CAL_ACCOUNT, tok);
}

export async function generateAgenda ({ githubToken, w3cCalendar }) {
  const ev = await getNextMeeting(w3cCalendar);
  const issues = await getGitHubIssues(githubToken);
  let date;
  if (ev.multiDay) {
    date = 'Days:\n';
    ev.startDate.forEach((sd, i) => {
      date += `* ${toDate(sd, ev.endDate[i])}`
    });
  }
  else {
    date = `${toDate(ev.startDate, ev.endDate)} UTC`;
  }
  console.log(`
# Meeting Agenda — W3C, Inc. Board of Directors

${date}

Regrets: @@@

## Agenda Review

Changes to the agenda, if necessary.

## Minutes Approval

@@@ link to previous minutes
`);
  REPOS.forEach(repo => {
    if (!issues[repo]?.length) {
      console.log(`## No ${REPO_LABELS[repo]} Issues\n\nNothing discussed at this meeting.\n`);
    }
    else {
      console.log(`## ${REPO_LABELS[repo]}\n\n`);
      issues[repo].forEach(iss => console.log(formatIssue(iss, 3)));
    }
  });
}

async function getGitHubIssues (auth) {
  if (!auth) throw new Error('GitHub client needs a token');
  const gh = new Octokit({ auth });
  const issues = {};
  for (const repo of REPOS) {
    if (!issues[repo]) issues[repo] = [];
    const res = await gh.rest.issues.listForRepo({
      repo,
      owner: 'w3c-bod',
      labels: 'board agenda',
    });
    if (res.status !== 200) throw new Error('Failed to load issues');
    issues[repo] = res.data;
  }
  // console.log(JSON.stringify(issues, null, 2));
  return issues;
}

async function getNextMeeting (w3cCalendar) {
  const res = await axios.get(w3cCalendar);
  if (res.status >= 400) throw new Error(`Could not get W3C BoD Calendar`, res.statusText);
  const data = await res.data;
  const json = ical2json.convert(data);
  const today = new Date().toISOString().replace(/-/g, '');
  const events = json
    .VCALENDAR[0]
    .VEVENT
    .filter(ev => /^Board\s+of\s+Directors/i.test(ev.SUMMARY))
    .map(ev => {
      const name = ev.SUMMARY;
      const description = ev.DESCRIPTION;
      let startDate, endDate;
      Object.keys(ev).forEach(k => {
        if (/^DTSTART/.test(k)) startDate = ev[k];
        if (/^DTEND/.test(k)) endDate = ev[k];
      });
      const links = find(description || '') || [];
      const joinInfo = links.filter(lnk => /\.zoom\.us/i.test(lnk.href))?.href;
      return { name, description, startDate, endDate, joinInfo };
    })
    .filter(({ startDate }) => startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  ;
  const nextMeeting = events.shift();
  if (!nextMeeting) return;
  let lastStartDate = toms(nextMeeting);
  while (events[0] && (toms(events[0]) - lastStartDate) <= ONE_AND_A_HALF_DAYS) {
    const ev = events.shift();
    nextMeeting.multiDay = true;
    if (!Array.isArray(nextMeeting.startDate)) {
      nextMeeting.startDate = [nextMeeting.startDate];
      nextMeeting.endDate = [nextMeeting.endDate];
    }
    nextMeeting.startDate.push(ev.startDate);
    nextMeeting.endDate.push(ev.endDate);
    lastStartDate = toms(ev);
  }
  return nextMeeting;
}

function toms (ev) {
  return Date.parse(ev.startDate.replace(/T.*/, ''));
}

function toDate (startDate, endDate) {
  const sd = parseVDate(startDate);
  const ed = parseVDate(endDate);
  return `${sd.toLocaleDateString('en-US', DATE_FMT)} ${sd.toLocaleTimeString([], TIME_FMT)} -  ${ed.toLocaleTimeString([], TIME_FMT)}`;
}

// 20230306T220000Z
function parseVDate (str) {
  const [, year, month, day, hours, minutes] = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  return new Date(year, parseInt(month, 10) - 1, day, hours, minutes);
}

function formatIssue ({ title, number, body, html_url, labels, assignees }, depth = 2) {
  let kind = 'UNKNOWN: for discussion or needs resolution';
  if (labels.find(({ name }) => name === 'for discussion')) kind = 'For discussion.';
  else if (labels.find(({ name }) => name === 'needs resolution')) kind = 'Needs resolution.';
  const leaders = assignees.map(({ login, html_url, avatar_url }) => `![${login}](${smol(avatar_url)}) [@${login}](${html_url})`).join(', ');
  return `${'#'.repeat(depth)} ${title} ([#${number}](${html_url}))
**${kind}**

${body || 'No description.'}${leaders ? `\n\nDiscussion led by: ${leaders}`: ''}
`;
}

function smol (avatar_url) {
  return `${avatar_url}${/\?/.test(avatar_url) ? '&' : '?'}size=32`;
}
