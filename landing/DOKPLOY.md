# Deploying to Dokploy

## Using Nixpacks (Recommended)

Dokploy has been configured to use Nixpacks for automatic builds:

1. **Connect your repository** to Dokploy
2. **Select Build Type**: `Nixpacks`
3. **Set Publish Directory**: `dist`
4. **Root Directory**: `landing` (if deploying from monorepo)
5. **Environment Variables**: No additional variables needed

The `nixpacks.toml` configuration will:
- Install Bun runtime
- Run `bun install --frozen-lockfile`
- Build the site with `bun run build`
- Serve static files from the `dist` directory

## Alternative: Static Build Type

If you've pre-built the site, you can use the Static build type:

1. Build the site locally: `bun run build`
2. **Select Build Type**: `Static`
3. **Root Directory**: `landing/dist`
4. Ensure port is set to `80` when creating domain

## Domain Configuration

When creating a domain in Dokploy:
- Set the port to `80` for static serving
- Dokploy will automatically use nginx to serve the built static files

## Notes

- The landing page fetches version and release info from GitHub at runtime
- All images are optimized through Astro's image pipeline
- MDX documentation pages are pre-rendered at build time
