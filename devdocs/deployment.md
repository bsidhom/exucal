# Deployment

The site is deployed to Cloudflare Workers as static assets, with Cloudflare
Workers Builds running these commands from the repository root:

| Step   | Command                     |
| ------ | --------------------------- |
| Build  | `pnpm run build`            |
| Deploy | `pnpm exec wrangler deploy` |

`wrangler.jsonc` holds the Worker name, the assets directory (`dist`), the
compatibility date, and the switches that keep production off `workers.dev`
while leaving Previews on it. Keep the compatibility date as recent as the
pinned wrangler supports, and bump it whenever wrangler is updated.

The app is served from a custom domain, attached to the Worker in the
Cloudflare dashboard (the Worker's Domains & Routes settings) rather than
listed in `wrangler.jsonc`. That keeps the repository deployable by anyone to
their own account and domain without changing it: wrangler adds the routes and
domains its configuration lists, but never removes one added in the dashboard,
and a Worker's name is scoped to its account.

- `workers_dev` is `false`, so production has no `workers.dev` address. A PWA
  needs one origin, since its installs and its saved settings belong to the
  origin they were made on. To deploy without a custom domain, set it to
  `true`.
- `preview_urls` is `true`, so each Preview also has a `workers.dev` URL beside
  any on a custom domain set up for Previews, and stays reachable if that
  domain's routing breaks. It is set explicitly because, when it is absent,
  Preview URLs follow `workers_dev`.

Wrangler applies both settings on every `wrangler deploy`; building a Preview
does not change them. A change made only in the dashboard therefore lasts until
the next production deploy.

Wrangler sends usage telemetry to Cloudflare unless told otherwise, and its
[telemetry docs](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/telemetry.md)
describe the opt-outs. This project turns it off in two places so that it stays
off for every contributor and for Workers Builds, without anyone running
`wrangler telemetry disable` on their own machine:

- `send_metrics: false` in `wrangler.jsonc` is the documented project-level
  setting.
- `WRANGLER_SEND_METRICS=false` in `.env` is a belt-and-braces backstop. Wrangler
  (as of 4.130.0) sends its "autoconfig" events without reading the project
  config, so `send_metrics` alone does not silence them, but the environment
  variable does, and wrangler loads `.env` before those events are sent.

Either setting is overridden by `DO_NOT_TRACK=1` in the environment, which
also disables telemetry.

`wrangler` is a pinned `devDependency`, so the deploy uses the exact version
recorded in `pnpm-lock.yaml`, installed by the same `pnpm install` that the
build step already runs and covered by the same supply-chain settings as every
other dependency. Do not deploy with `pnpm dlx wrangler`: `dlx` installs the
newest wrangler into a temporary directory on every deploy, and that install
fails under `strictDepBuilds` because two of wrangler's dependencies, `esbuild`
and `workerd`, ship install scripts. Those scripts are explicitly denied under
`allowBuilds` in `pnpm-workspace.yaml` (see the comment there for why they are
not needed), which satisfies the strict policy without running any third-party
code at install time.
