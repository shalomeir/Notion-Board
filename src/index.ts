import * as core from '@actions/core';
import { GithubAdapter } from './adapters/github_adapter';
import { NotionAdapter } from './adapters/notion_adapter';
import { App } from './app';

const Token = core.getInput('token') || process.env.GH_PAT || process.env.GITHUB_TOKEN;
const EventName = process.env.GITHUB_EVENT_NAME;
const NotionApiKey = process.env.NOTION_API_KEY || core.getInput('NOTION_API_KEY');
const NotionDatabaseId = process.env.NOTION_DATABASE || core.getInput('NOTION_DATABASE');

console.log('=== Configuration Check ===');
console.log(`GitHub Token: ${Token ? 'Set (length: ' + Token.length + ')' : 'Not set'}`);
console.log(`Notion API Key: ${NotionApiKey ? 'Set (length: ' + NotionApiKey.length + ')' : 'Not set'}`);
console.log(`Notion Database ID: ${NotionDatabaseId || 'Not set'}`);
console.log(`Event Name: ${EventName}`);
console.log('===========================');

export const run = async () => {
    if (!Token) throw new Error("Missing GitHub token");
    if (!NotionApiKey) throw new Error('Missing Notion Api Key');
    if (!NotionDatabaseId) throw new Error('Missing Notion Database ID');
    const app = new App(
        new NotionAdapter(
            NotionApiKey,
            NotionDatabaseId
        ),
        new GithubAdapter(core.getInput('issueType')),
        EventName as string,
        Token
    );

    if (EventName === 'workflow_dispatch') {
        await app.workflowDispatchHandler(core.getBooleanInput('setup'), core.getBooleanInput('syncIssues'))
    }
    app.run();
}

run()
    .then(() => { })
    .catch(err => {
        // Log error message only, avoiding potential sensitive information
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log("ERROR:", errorMessage);
        core.setFailed(errorMessage);
    })