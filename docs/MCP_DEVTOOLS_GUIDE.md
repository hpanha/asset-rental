# MCP Server Setup Guide: Next.js DevTools & Chrome Profiling

This workspace (`asset-rental`) is fully configured with Model Context Protocol (MCP) servers to inspect **Next.js DevTools** and capture **Chrome DevTools performance profiles**.

---

## 1. Overview & Installed Tools

1. **`next-devtools-mcp` (Next.js DevTools)**:
   - Connects to your live Next.js development server (Next.js 16+).
   - Allows the AI assistant to read runtime stack traces, build/compilation errors, server actions, route structures, and framework metadata.
   - Installed locally in project `devDependencies`.

2. **`chrome-devtools-mcp` (Official Chrome DevTools & Profiling)**:
   - Google's official MCP server for Chrome DevTools and Puppeteer.
   - Enables recording performance traces (`performance_start_trace`), analyzing Core Web Vitals (LCP, CLS, long tasks), diagnosing JavaScript bottlenecks, and inspecting DOM/CSS.
   - Installed locally in project `devDependencies`.

---

## 2. Workspace File Structure

```text
c:\Project\asset-rental\
├── .agents/
│   └── plugins/
│       └── devtools/
│           ├── plugin.json         # Workspace plugin manifest
│           └── mcp_config.json    # MCP server configuration (local npx commands)
├── .mcp.json                       # Interoperability config for editor MCP clients
├── package.json                    # devDependencies updated with chrome-devtools-mcp & next-devtools-mcp
└── docs/
    └── MCP_DEVTOOLS_GUIDE.md      # This guide
```

---

## 3. Configuration Details

### A. Manifest: [`.agents/plugins/devtools/plugin.json`](file:///c:/Project/asset-rental/.agents/plugins/devtools/plugin.json)
```json
{
  "name": "asset-rental-devtools",
  "description": "Next.js devtools inspection and Chrome performance profiling MCP servers for this workspace"
}
```

### B. MCP Configuration: [`.agents/plugins/devtools/mcp_config.json`](file:///c:/Project/asset-rental/.agents/plugins/devtools/mcp_config.json)
```json
{
  "mcpServers": {
    "nextjs-devtools": {
      "command": "npx",
      "args": ["next-devtools-mcp"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"]
    }
  }
}
```

Because both packages are installed in `devDependencies`, `npx` resolves them instantly from `node_modules/.bin` without making network requests to npm registry on each launch.

---

## 4. How to Run & Verify

### Step 1: Start the Next.js Dev Server
In a terminal, start your local Next.js server:

```powershell
npm run dev
# or
bun dev
```

Next.js will start on `http://localhost:3000`. The `next-devtools-mcp` process will automatically discover and hook into `http://localhost:3000/_next/mcp`.

---

### Step 2: Chrome DevTools Profiling Options

You have two execution modes:

#### Mode A: Automated Isolated Browser (Default)
With the default configuration, `chrome-devtools-mcp` automatically spawns an isolated Chrome instance via Puppeteer when a profiling or inspection request is initiated.

#### Mode B: Connect to Existing Chrome with Remote Debugging (Recommended for Logged-In Sessions)
To profile an active browser tab or behind authentication:

1. Launch Google Chrome from PowerShell with remote debugging:
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$HOME\.chrome-mcp-profile"
   ```
2. In [`.agents/plugins/devtools/mcp_config.json`](file:///c:/Project/asset-rental/.agents/plugins/devtools/mcp_config.json), add the `--autoConnect` flag:
   ```json
   {
     "mcpServers": {
       "chrome-devtools": {
         "command": "npx",
         "args": ["chrome-devtools-mcp", "--autoConnect"]
       }
     }
   }
   ```

---

### Step 3: Check Active MCP Servers in Antigravity

1. In Antigravity, click **Additional Options (...)** > **MCP Servers** (or open the **Skills & Customizations** panel from the left sidebar).
2. Confirm `asset-rental-devtools` is listed with:
   - `nextjs-devtools`
   - `chrome-devtools`
3. Tools from these servers will show up in autocomplete when you type `@` in the chat canvas.

---

## 5. Example Workflows & Prompts

### Next.js DevTools Inspection
Ask the agent in chat:
- *"Check Next.js dev server status and report any active build or hydration errors on the `/browse` route."*
- *"Look up the server action for rental reservation submission using Next.js devtools and check if any errors occurred during invocation."*

### Chrome Profiling & Web Vitals
Ask the agent in chat:
- *"Navigate to `http://localhost:3000/browse`, record a 5-second performance trace, and identify what is causing layout shifts (CLS) or long tasks."*
- *"Analyze Core Web Vitals for the asset details page and provide concrete React component optimization recommendations."*
