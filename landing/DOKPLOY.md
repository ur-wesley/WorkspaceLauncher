# Deploying to Dokploy

This landing page can be deployed to Dokploy using either Nixpacks (recommended) or Static build type.

## Option 1: Nixpacks (Recommended)

Nixpacks will automatically detect Astro and build your application.

### Setup in Dokploy:

1. **Build Type**: Select `Nixpacks`
2. **Publish Directory**: Set to `dist`
3. **Environment Variables** (optional):
   - `NIXPACKS_BUILD_CMD`: `bun run build`
   - `NIXPACKS_INSTALL_CMD`: `bun install --frozen-lockfile`

### Configuration:

The `nixpacks.toml` file is already configured with:
- Node.js 20 and Bun
- Install and build commands
- Static publish directory set to `dist`

This is the recommended approach as it builds your app during deployment.

## Option 2: Static Build Type

If you want to use the Static build type, you need to pre-build your application first.

### Setup in Dokploy:

1. **Build Type**: Select `Static`
2. **Root Directory**: Set to `dist` (the built output directory)

### Pre-build requirements:

Before deploying, you must build the application locally:

```bash
# Install dependencies
bun install --frozen-lockfile

# Build the application
bun run build
```

Then commit the `dist` folder to your repository before deploying with Dokploy Static type.

⚠️ **Note**: This approach requires committing build artifacts to your repo, which is generally not recommended.

## Recommendation

Use **Option 1 (Nixpacks)** for automatic builds and better CI/CD integration. The `nixpacks.toml` configuration file handles everything automatically.

## Domain Configuration

When creating a domain in Dokploy:
- **Port**: Use port `80` (this is the standard port for static builds)
- **Path**: Leave empty for root domain deployment

## Environment Variables

No special environment variables are required for basic deployment.

