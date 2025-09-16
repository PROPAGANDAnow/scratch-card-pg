# Set up Neynar with Cursor and MCP server

> Start developing on Farcaster with Neynar and AI enabled Cursor

## Prerequisites

### llms.txt
- **Full file**: [LLM Documentation - Complete Version](https://docs.neynar.com/llms-full.txt). FYI this file can be too large for LLMs on free plan, you might need to upgrade.
- **Abridged version**: [LLM Documentation - Compact Version](https://docs.neynar.com/llms.txt).

### MCP server
Install by running `npx @mintlify/mcp@latest add neynar` in your terminal. You will then need to [add the MCP server to Cursor](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers).

## Step-by-Step Setup

### Step 1: Create Project Directory
Create an empty folder on your computer e.g. `rish/Code/farcaster`. *This tutorial assumes you're starting from scratch. If you already have a build environment, your steps might vary.*

### Step 2: Download Cursor
Download Cursor from [cursor.com](https://www.cursor.com/). This tutorial uses `Version: 0.43.5`, it's possible that future versions behave slightly differently.

### Step 3: Open Project in Cursor
Open the `farcaster` folder you created in Cursor and then open the right chat pane. That's the icon next to the gear icon. *This tutorial assumes you're using `claude-3.5-sonnet` as your AI model. With a different model, your results might differ.*

### Step 4: Initialize Project with AI
Give it the following prompt:

```
I want to build a Farcaster app with Neynar.

Neynar's openapi spec is here: @https://github.com/neynarxyz/OAS/

Neynar's nodejs sdk is here: @https://github.com/neynarxyz/nodejs-sdk

can you help set up the repo for me? we will use the latest version of neynar's sdk. No need to build a frontend for now, we will focus on backend only to start.
```

Cursor should run a bunch of commands based on the above prompt and set up the directory for you already. The right pane will show the setup progress.

### Step 5: Project Structure
At this point, your left pane should have the following directory structure (Cursor does something slightly different on each run, so don't worry if this isn't exactly the same):

```
project/
├── package.json
├── .env
├── server.js (or similar)
├── node_modules/
└── other config files
```

### Step 6: Accept Changes
To incorporate these changes into your repository, you can start by tapping "accept all" in the chat pane. You might need to troubleshoot this a bit, but accepting is a reasonable way to start.

### Step 7: Add API Key
Insert your Neynar API key (subscribe at [neynar.com](https://neynar.com/#pricing) to get your key) in the `.env` file. Replace the placeholder with your API key directly, no quotes needed.

### Step 8: Run the Server
You will need to run the backend server on your local machine. Ask Cursor:

```
how do I run this?
```

Cursor should give you a set of commands you can run from the chat pane directly. Tap "run" on each command and wait for it to finish running before moving to the next one.

Common commands include:
- `npm install` or `yarn install`
- `npm start` or `yarn start`

### Step 9: Test the Setup
After running the npm commands above, if you run the curl commands, it should start printing results to your console!

From here on, you can prompt Cursor as you need and continue to build on this foundation! If you have any questions, post them on the [/neynar](https://www.supercast.xyz/channel/neynar) channel on Farcaster.

## Troubleshooting

After the above steps, you likely still have a few issues. Below, we describe the easiest way to debug with Cursor.

### Debug Terminal Errors
- If you're getting errors in the terminal, you can simply click "Debug with AI" to have Cursor generate the prompt and output a solution
- Alternatively, click "add to chat" and put in a better prompt yourself

### Ensure Correct Context
- Ensure that it has the correct files as context
- `neynar-api-client.d.ts` needs to be added to context to suggest suitable solutions (or else it will just make things up!)
- You can search for the filename to add it easily
- For long files, it will remove them from context at each step and require you to re-add them

### Apply Changes Systematically
- When it outputs a solution, each code block has an "Apply" or "Run" action
- You will need to apply/run each block separately
- Each apply/run action might create file changes
- If two actions occur on the same file, "accept" the first change and save the file before taking the next action

### Iterative Development
- You will likely need to go back and forth with Cursor as you work through your code
- While AI agents are helpful at getting the project started, they are still bad at navigating through repositories and picking the proper functions

## Tips

### Terminal Management
Each time you run a command from the chat pane, Cursor opens a new terminal. You can close extra terminal windows that are *not* running your server without any adverse effects on your project.

### File Management
- Accept each change and save before trying again when dealing with multiple file changes
- Keep your project structure clean and organized
- Regularly commit your changes to version control

### Effective Prompting
- Be specific about what you want to achieve
- Reference specific files when needed using @ syntax
- Break down complex requests into smaller, manageable tasks
- Use the "Debug with AI" feature when errors occur

## Common Project Structure

A typical Neynar + Cursor setup might look like:

```
farcaster-app/
├── package.json
├── .env
├── server.js
├── routes/
│   ├── users.js
│   ├── casts.js
│   └── channels.js
├── utils/
│   └── neynar-client.js
├── node_modules/
└── README.md
```

## Next Steps

1. Set up your API endpoints
2. Implement user authentication
3. Add cast creation and retrieval
4. Set up webhooks for real-time events
5. Build your frontend (if needed)
6. Deploy to production

## Resources

- [Neynar Documentation](https://docs.neynar.com)
- [Cursor Documentation](https://docs.cursor.com)
- [Neynar API Reference](https://docs.neynar.com/reference)
- [Farcaster Protocol](https://www.farcaster.xyz)
- [Neynar Discord](https://discord.gg/neynar)
- [/neynar channel on Farcaster](https://www.supercast.xyz/channel/neynar)