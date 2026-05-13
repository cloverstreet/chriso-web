# How to Extract the Code from Claude.ai

The working application code is currently in a Claude.ai artifact. Here's how to get it:

## Option 1: Copy from Artifact (Recommended)

1. Go back to our conversation in Claude.ai
2. Scroll to find the "Cedar Siding Design Calculator" artifact box
3. Click the **"Copy"** button in the top-right of the artifact
4. Paste into a new file called `cedar-siding-calculator-standalone.html`
5. Open the HTML file in a browser to verify it works

## Option 2: Ask Claude to Provide It

If you can't find the artifact, ask Claude in our conversation:

```
"Can you provide the complete Cedar Siding Calculator code as a standalone HTML file?"
```

Claude will generate the full HTML file for you.

## What You'll Get

A single HTML file containing:
- All React component code
- Embedded styling (Tailwind via CDN)
- Complete functionality
- No build process needed

## Dependencies (Loaded via CDN)

The HTML file loads these from CDNs:
- React 18
- ReactDOM 18
- Babel (for JSX transformation)
- Tailwind CSS
- Lucide Icons

**Note:** This means it needs internet to run. Claude Code should convert this to a proper npm-based project.

## After Getting the Code

Save it in this folder as:
```
/Users/christophero/Documents/cedar-siding-calculator/cedar-siding-calculator-standalone.html
```

Then you can:
1. Open it locally to test
2. Give it to Claude Code for proper project setup
3. Reference it while building the production version

## Folder Icon

Unfortunately, I cannot programmatically set a folder icon on macOS. To add one manually:

1. Find a wood/siding related icon image
2. Right-click the cedar-siding-calculator folder
3. Click "Get Info"
4. Drag the icon image onto the folder icon in the top-left of the Info window

Suggested search terms for an icon:
- "cedar wood icon"
- "siding icon"  
- "construction icon"
- "wood texture icon"

---

Once you have the HTML file, you're ready to migrate to Claude Code!
