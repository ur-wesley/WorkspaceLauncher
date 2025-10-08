# Tauri Source Directory

This directory contains the Rust backend code for the WorkspaceLauncher application.

## Known Issues

### Derby Log File

If you're launching Eclipse from this application, Eclipse may create a `derby.log` file in this directory. This file is created by Eclipse's Derby database and will cause Tauri's dev watcher to constantly rebuild the application.

**Solution:**

- The `derby.log` file is ignored in `.gitignore`
- If you experience constant rebuilds, manually delete the file: `rm derby.log`
- Consider configuring Eclipse to write its derby.log elsewhere by setting the `derby.system.home` system property in your Eclipse workspace

**Why this happens:**
Eclipse's working directory defaults to where it's launched from. When launched via this app during development, that's the `src-tauri` directory. Tauri watches this directory for changes, so any file created/modified here triggers a rebuild.
