#!/usr/bin/env node

import process from "node:process";
import { program  } from "commander";
import { makeRel, loadJSON, getToken, setToken, generateAgenda } from "./index.js";

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
  .command('agenda')
  .description('Generate the agenda for the next Board meeting')
  .action(async () => {
    try {
      const githubToken = await getToken();
      if (!githubToken) throw new Error(`No token found, you need to run 'diotima token <token>' first.`);
      const agenda = await generateAgenda({ githubToken });
      console.log(agenda);
      console.warn(`Agenda generated successfully.`);
    }
    catch (err) {
      console.warn(`Failed to generate agenda:`, err.message);
    }
  })
;


program.parseAsync(process.argv);
