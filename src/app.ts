import { GithubAdapter } from "./adapters/github_adapter";
import { NotionAdapter } from "./adapters/notion_adapter";
import { logger } from "./logger";
import { Issue } from "./models/issue";

export class App {

    constructor(
        private readonly notionAdapter: NotionAdapter,
        private readonly githubAdapter: GithubAdapter,
        private readonly EventName: string,
        private readonly GitHubToken: string
    ) { }

    async run() {
        if (this.EventName === 'issues') {
            await this.IssueEventHandler(this.githubAdapter.action(), this.githubAdapter.getIssue());
        }
    }

    async workflowDispatchHandler(setup?: boolean, syncIssues?: boolean) {
        if (setup) {
            await this.setupNotionDatabase();
        }

        if (syncIssues) {
            await this.syncIssues();
        }
    }

    private async IssueEventHandler(action: string, issue: Issue) {
        if (action === 'opened') {
            this.notionAdapter.createPage(issue)
        } else {
            this.notionAdapter.updatePage(issue.id(), issue);
        }
    }

    private async setupNotionDatabase() {
        logger.info('Setting up Notion Database');
        await this.notionAdapter.setup();
    }

    private async syncIssues() {
        logger.info('Fetching all Issuess');
        const issues = await this.githubAdapter.fetchAllIssues(this.GitHubToken);

        console.log(`Starting to process ${issues.length} issues...`);

        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            console.log(`Processing issue ${i + 1}/${issues.length}: #${issue.id()} - ${issue.title()}`);

            let pageId;
            try {
                pageId = await this.notionAdapter.findPage(issue.id());
                console.log(`Found existing page for issue #${issue.id()}: ${pageId}`);
            } catch (error) {
                console.log(`Error finding page for issue #${issue.id()}: ${error}`);
                pageId = null;
            }

            try {
                if (pageId) {
                    console.log(`Updating existing page for issue #${issue.id()}`);
                    await this.notionAdapter.updatePage(issue.id(), issue);
                } else {
                    console.log(`Creating new page for issue #${issue.id()}`);
                    await this.notionAdapter.createPage(issue);
                }
                console.log(`Successfully processed issue #${issue.id()}`);
            } catch (error) {
                console.error(`Failed to process issue #${issue.id()}: ${error}`);
                // Continue with next issue instead of stopping
            }
        }

        console.log(`Finished processing ${issues.length} issues`);
    }

}