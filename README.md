![Image](https://github.com/user-attachments/assets/3e3c763f-24c8-47b7-966d-8421eee19b2b)

# ⚡️ Realtime Chat app 

## Getting Started

### Installation

Install the dependencies:

```bash
pnpm install
```

### Development

Generate types:

```bash
pnpm typegen
```

To run Server:

```bash
pnpm build
pnpm start
```

Your application will be available at `http://localhost:8787`.

To run Frontend separately:

```sh
pnpm dev
```

Your frontend will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
pnpm run build
```

## Deployment

Deployment is done using the Wrangler CLI.

To deploy directly to production:

```sh
npx wrangler deploy
```

To deploy a preview URL:

```sh
npx wrangler versions upload
```

You can then promote a version to production after verification or roll it out progressively.

```sh
npx wrangler versions deploy
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
