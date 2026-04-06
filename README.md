# chriso.org — web projects

Interactive web experiments and instruments by Christopher Overstreet.

## Structure

```
glitchpage/          — mouse-velocity glitch art experiment
instruments/
  fx-processor/      — web-based audio FX processor (in progress)
```

## Deployment

Each project has its own `.vscode/sftp.json` (gitignored — contains credentials).
VS Code + SFTP extension (Natizyskunk) auto-deploys on save to chriso.org via Dreamhost SFTP.

Server: iad1-shared-b8-46.dreamhost.com
Remote root: /home/dh_srf7dw/chriso.org/

## Live

- https://chriso.org/glitchpage/
- https://chriso.org/instruments/fx-processor/
