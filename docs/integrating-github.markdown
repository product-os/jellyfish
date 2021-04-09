# Integrating with GitHub

Jellyfish integrate with GitHub using the [GitHub sync integration](https://github.com/product-os/jellyfish-plugin-default/blob/master/lib/integrations/github.js), however additional configuration is required to receive webhooks from GitHub and to be able to send data to the GitHub API. We use a GitHub app to communicate with the GitHub API as it gives us much higher usage limits than API keys.

To start syncing a new GitHub org, follow the steps below:

1. Got to the organisation settings page on GitHub
2. Go to the "Webhooks" pane
3. Create a new webhhok with the following contents:
  - URL: https://api.ly.fish/api/v2/hooks/github/
  - Content Type: application/json
  - Secret: INTEGRATION_GITHUB_SIGNATURE_KEY (this should be the secret we provision JF)
  - Enable SSL verification
4. Enable the following types of events:
  - Issues
  - Issue comments
  - Labels
  - Pull requests
  - Pull request reviews
  - Pull request review comments
  - Pushes
  - Repositories
  - Statuses
5. Install the "Jellyfish GitHub" app in the org so that Jellyfish can use the app API key to send data: https://github.com/organizations/product-os/settings/apps/jellyfish-github/installations