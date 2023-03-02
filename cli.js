#!/usr/bin/env node

import process from "node:process";
import { program  } from "commander";
import { makeRel, loadJSON, getToken, setToken, getCalendar, setCalendar, generateAgenda } from "./index.js";

const rel = makeRel(import.meta.url);
const { version } = await loadJSON(rel('./package.json'));

program.version(version);

program
  .command('token <token>')
  .description('Set your GitHub token from https://github.com/settings/tokens/new to authenticate')
  .action(async (token) => {
    try {
      await setToken(token);
      console.warn(`Token set successfully.`);
    }
    catch (err) {
      console.warn(`Failed to set token:`, err.message);
    }
  })
;

program
  .command('calendar <url>')
  .description('Set your calendar URL (exclusing cancelled events) from your W3C account')
  .action(async (url) => {
    try {
      await setCalendar(url);
      console.warn(`Calendar set successfully.`);
    }
    catch (err) {
      console.warn(`Failed to set calendar:`, err.message);
    }
  })
;

program
  .command('agenda')
  .description('Generate the agenda for the next Board meeting')
  .action(async () => {
    try {
      const githubToken = await getToken();
      if (!githubToken) throw new Error(`No token found, you need to run 'diotima token <token>' first.`);
      const w3cCalendar = await getCalendar();
      if (!w3cCalendar) throw new Error(`No calendar found, you need to run 'diotima calendar <url>' first.`);
      await generateAgenda({ githubToken, w3cCalendar });
      console.warn(`Agenda generated successfully.`);
    }
    catch (err) {
      console.warn(`Failed to generate agenda:`, err.message);
    }
  })
;


program.parseAsync(process.argv);
