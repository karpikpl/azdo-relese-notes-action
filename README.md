# Azure DevOps GitHub release notes integration

[![GitHub Super-Linter](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/karpikpl/azdo-release-notes-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Enhanced AB#xxx links in GitHub release notes for Azure DevOps work items. Every
`AB#x` reference in the release notes is replaced with a link.

Before:

```md
- AB#11 Feature/adding ci by @karpikpl in
  https://github.com/repoOwner/repoName/pull/1
```

After:

```md
- [AB#11 [User Story] Best Feature so far (Completed)](https://dev.azure.com/adoOrg/adoProject/_workitems/edit/11)
  Feature/adding ci by @karpikpl in https://github.com/repoOwner/repoName/pull/1
```

## Usage

### Basic

You need to add permissions for this tool.

```yaml
permissions:
  contents: write
```

Here's an example pipeline that updates release notes after publishing.

```yaml
name: Update Release Notes

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      releaseId:
        description:
          'The Id of the release to update - database Id (integer), not visible
          in the UI'
        required: true
        type: number

permissions:
  contents: write

jobs:
  update-release-notes:
    runs-on: ubuntu-latest

    steps:
      - name: Install dependencies
        run: npm install node-fetch

      - name: Update release notes
        uses: karpikpl/azdo-release-notes-action@v1.0.2
        with:
          ado-pat: ${{ secrets.ADO_PAT }}
          ado-org: my-org
          ado-project: my-project
```

## Inputs

### `ado-pat`

**Required** Azure DevOps personal access token with permissions to read work
items.

### `ado-org`

**Required** Name of the Azure DevOps organization.

### `ado-project`

**Required** Name of the Azure DevOps project.

### `repo-owner`

**Optional** Another repository owner, If not set, the current repository owner
is used by default. Note that when you trying changing a repository, be aware
that `GITHUB_TOKEN` should also have permission for that repository.

### `repo-name`

**Optional** Another repository name. Of limited use on GitHub enterprise. If
not set, the current repository is used by default. Note that when you trying
changing a repository, be aware that `GITHUB_TOKEN` should also have permission
for that repository.

### `repo-token`

**Optional**, You can set
[PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token)
here. If not set, this will use `${{ github.token }}`.

## Outputs

### `workItems`

Coma separated list of work items that were processed.
