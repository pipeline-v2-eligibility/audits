const axios = require('axios');
const { Octokit } = require("@octokit/rest");
const { expect } = require('@playwright/test');
const properties = require('../../../properties.json');

let repo;
let owner;
let octokit;
let cases = {};
let maybe = test.skip;

// 3 mins
jest.setTimeout(300000);

const delay = ({ until: timeout }) => new Promise((resolve) => {
    setTimeout(() => {
        resolve();
    }, timeout);
});

if (properties && properties.deployedAppURL && properties.deployedAppURL !== '' && properties.githubUsername && properties.githubUsername !== '') {
    maybe = test;

    repo = properties.deployedAppURL;
    owner = properties.githubUsername;
    octokit = new Octokit({
        auth: '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'
    });
}

const getRandomTestData = async () => {
    if (maybe === test.skip) return;

    const URL = 'https://randomapi.com/api/t6jiajps?key=LEIX-GF3O-AG7I-6J84';
    const { data: { results } } = await axios.get(URL);
    const [data] = results;
    cases = data;
};

beforeAll(() => {
    return getRandomTestData();
});

const listIssues = async () => {
    return await octokit.rest.issues.listForRepo({
        repo,
        owner,
        state: 'open'
    });
};

const testTheScanner = async (data) => {
    try {
        await octokit.request('POST /repos/{owner}/{repo}/issues', {
            repo,
            owner,
            title: `${(new Date()).toUTCString()}`,
            body: `${JSON.stringify(data)}`
        });
    
        // wait 45 seconds
        console.log('Created an issue. Lets wait and see how you handle listed container images ..');
        await delay({until: 45000});
        let { data: issuesData } = await listIssues();
        let [lastestIssue] = issuesData;
        if (!lastestIssue.comments || lastestIssue.comments <= 0) {
            // wait another 30 seconds
            console.log('Looks like your scan is taking long to get completed. Lets wait some more ...');
            await delay({until: 30000});
            const { data } = await listIssues();
            issuesData = data;
            lastestIssue = issuesData[0];

            expect(lastestIssue.comments && lastestIssue.comments >= 1).toBe(true);
        }

        const { data: commentData } = await octokit.rest.issues.listComments({
            repo,
            owner,
            issue_number: lastestIssue.number
        });
        const [scanResultComment] = commentData; 

        return scanResultComment;
    } catch (e) {
        console.error('Test failed to run');
        console.error(e);
    }
};

maybe('GitHub Workflow - Scan identifies safe images', async () => {
    const data = cases.safe;
    console.log('data', data);
    const scanResultComment = await testTheScanner(data);
    expect(scanResultComment).toBeDefined();
    expect(scanResultComment.body).toBeDefined();

    const actual = JSON.parse(scanResultComment.body);
    const expected = data.map(image => ({image, 'status': 'SAFE'}));
    expected.forEach(given => {
        for (const [key, value] of Object.entries(given)) {
            if (key === 'image') {
                const found = actual.find(a => a.image === value);
                expect( found).toBeDefined();
                expect( found.status ).toEqual('SAFE');
            }
        }
    });
    
});

// maybe('GitHub Workflow - Scan identifies unsafe images', async () => {
    
//     await octokit.request(`POST /repos/{${owner}}/{${repo}}/issues`, {
//         owner: owner,
//         repo: repo,
//         title: `Scan @ ${(new Date()).toUTCString()}`,
//         body: JSON.stringify(cases.unsafe)
//     });

//     // wait 45 seconds
//     await delay({until: 45000});

//     // scanned.json
//     const filePath = '../scanned.json';
//     const outputExists = await fileExists(filePath);
//     expect(outputExists).toBe(true);

//     const output = require(filePath);
//     const expected = cases.unsafe.map(c => ({'image': c, 'status': 'SAFE'}));
//     expect(output).toStrictEqual(expected);
// });

// maybe('GitHub Workflow - Scan identifies safe and unsafe images', async () => {
    
//     await octokit.request(`POST /repos/{${owner}}/{${repo}}/issues`, {
//         owner: owner,
//         repo: repo,
//         title: `Scan @ ${(new Date()).toUTCString()}`,
//         body: [...cases.safe, ...cases.unsafe]
//     });

//     // wait 45 seconds
//     await delay({until: 45000});

//     // scanned.json
//     const filePath = '../scanned.json';
//     const outputExists = await fileExists(filePath);
//     expect(outputExists).toBe(true);

//     const output = require(filePath);
//     const expected = cases.unsafe.map(c => ({'image': c, 'status': 'SAFE'}));
//     expect(output).toStrictEqual(expected);
// });