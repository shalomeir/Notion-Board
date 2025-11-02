import { Client } from '@notionhq/client';
import { logger } from '../logger';
import { Issue } from '../models/issue';

class NotionClient {
    protected _client: Client;
    constructor(api_key: string) {
        this._client = new Client({ auth: api_key });
    }
}

export class NotionAdapter extends NotionClient {
    constructor(
        private readonly api_key: string,
        private readonly database_id: string
    ) {
        super(api_key);
        console.log(`NotionAdapter initialized with database_id: ${this.database_id}`);
    }

    async createPage(issue: Issue) {
        logger.info(`Creating page for issue #${issue.id()} in database ${this.database_id}`)
        try {
            // First check if we can access the database
            console.log(`Checking database access for ID: ${this.database_id}`)
            await this._client.databases.retrieve({ database_id: this.database_id })
            console.log(`Database access confirmed for ID: ${this.database_id}`)

            const result = await this._client.pages.create({
                parent: {
                    database_id: this.database_id
                },
                properties: this.prepareNotionProperty(issue)
            })
            logger.info(`Successfully created page for issue #${issue.id()}: ${result.id}`)
        } catch (error) {
            logger.error(`Failed to create page for issue #${issue.id()}: ${error}`)
            console.error(`Full error details:`, error)
            throw error
        }
        await this.sleep();
    }

    async updatePage(id: number, issue: Issue) {
        logger.info(`Finding page with id: ${id}`);
        const pageId = await this.findPage(id);
        await this.sleep();

        if (!pageId) {
            return logger.warn(`could not find page with id: ${id}`)
        }
        logger.info('Found page, contacting notion to update the page');

        // Updating the Notion Page according to the new Issue details. 
        await this._client.pages.update({
            page_id: pageId,
            properties: this.prepareNotionProperty(issue)
        });
        logger.info(`Notion Page with ID: ${pageId} updated successfully`);
        await this.sleep();
    }

    async findPage(id: number) {
        try {
            console.log(`Searching for existing page with issue ID: ${id} in database ${this.database_id}`);
            const pages = await this._client.databases.query({
                database_id: this.database_id,
                filter: {
                    property: 'ID',
                    number: {
                        equals: id
                    }
                }
            });
            const page = pages.results[0];
            console.log(`Query result: found ${pages.results.length} pages for issue ID ${id}`);
            return page ? page.id : false;
        } catch (error) {
            console.error(`Failed to query database for issue ID ${id}: ${error}`);
            throw error;
        }
    }

    sleep(ms: number = 1000) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    private prepareNotionProperty(issue: Issue) {
        return {
            Name: {
                title: [
                    { text: { content: issue.title() }, type: 'text' }
                ]
            },
            URL: {
                url: issue.html_url()
            },
            State: {
                select: { name: issue.state() }
            },
            ID: {
                number: issue.id()
            },
            Label: {
                multi_select: issue.getLabelList()
            }
        } as any
    }

    async setup(){
        console.log(`Setting up database ${this.database_id} with properties...`);
        try {
            await this._client.databases.update({
                database_id: this.database_id,
                properties: {
                    ID: {
                        number : {}
                    },
                    State: {
                        select: {
                            options: [
                                {name: 'open', color: 'green'},
                                {name: 'close', color: 'red'}
                            ]
                        }
                    },
                    URL: {
                        url: {}
                    },
                    Label: {
                        multi_select: {}
                    }
                }
            });
            console.log(`Successfully set up database ${this.database_id}`);
        } catch (error) {
            console.error(`Failed to setup database ${this.database_id}: ${error}`);
            throw error;
        }
    }
}