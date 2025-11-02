import * as github from '@actions/github';
import { Issue } from '../models/issue';
export class GithubAdapter {
    constructor(
        private readonly issueType?: string
    ) { }

    action() {
        return github.context.payload.action || ''
    }

    getIssue() {
        if (!github.context.payload.issue) return new Issue({});
        return new Issue(github.context.payload.issue);
    }

    async fetchAllIssues(token: string) {
        try {
            const owner = github.context.repo.owner;
            const repo = github.context.repo.repo;
            console.log(`Fetching issues from: ${owner}/${repo}`);

            const octokit = github.getOctokit(token);
            console.log(`Created octokit client, making API call...`);

            const issues: Array<Issue> = await octokit.paginate('GET /repos/{owner}/{repo}/issues', {
                owner: owner,
                repo: repo,
                per_page: 100,
                state: this.prepareIssueType()
            }, response => response.data.map(issue => new Issue(issue)));

            console.log(`Successfully fetched ${issues.length} issues to sync`);
            return issues;
        } catch (error) {
            console.error(`Failed to fetch issues from GitHub: ${error}`);
            console.error(`Error details:`, error);
            throw error;
        }
    }

    private prepareIssueType() {
        if (this.issueType === 'all') {
            return 'all'
        }

        if (this.issueType === 'close') {
            return 'closed'
        }

        return 'open'
    }
}