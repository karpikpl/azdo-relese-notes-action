/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */
import * as core from '@actions/core'
import * as main from '../src/main'
import { mockInputs } from './mock.helper'
import * as azdo from '../src/azdo'
import { WorkItemsBatchResponse } from '../src/azdoTypes'
import fs from 'fs'
import path from 'path'
import * as github from '@actions/github'

jest.mock('@actions/github', () => ({
  getOctokit: jest.fn()
}))

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>
let getReleaseMock: jest.SpyInstance
let updateReleaseMock: jest.SpyInstance
let getOctokitMock: jest.SpyInstance
let getWorkItemsBatchMock: jest.SpiedFunction<typeof azdo.getWorkItemsBatch>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // githubApi = new GitHub()

    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
    getReleaseMock = jest.fn()
    updateReleaseMock = jest.fn()

    const mockOctokitInstance = {
      rest: {
        repos: {
          getRelease: getReleaseMock,
          updateRelease: updateReleaseMock
        }
      }
      // Add other mocked methods as needed
    }

    getOctokitMock = github.getOctokit as jest.MockedFunction<
      typeof github.getOctokit
    >
    getOctokitMock.mockReturnValue(mockOctokitInstance)

    getWorkItemsBatchMock = jest
      .spyOn(azdo, 'getWorkItemsBatch')
      .mockImplementation()
  })

  it('Gets release notes - no AB#', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock = mockInputs()
    getReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: 'This is a release note'
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(getOctokitMock).toHaveBeenCalledWith('token')
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'workItems', '')
    expect(errorMock).not.toHaveBeenCalled()
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('Fails when workitems could not be found in ADO', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock = mockInputs()
    getReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: '# Release notes title\n\n - This is a release note\n - AB#1234'
      }
    })
    getWorkItemsBatchMock.mockResolvedValueOnce(undefined)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenCalledWith(
      'Failed to get work item details'
    )
  })

  it('Updates release notes with work items from ADO', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock = mockInputs()
    getReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: '# Release notes title\n\n - This is a release note\n - AB#1234'
      }
    })
    updateReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: 'new body'
      }
    })
    const workItemsBatchResponse: WorkItemsBatchResponse = {
      count: 1,
      value: [
        {
          id: 1234,
          url: 'https://dev.azure.com/adoOrg/adoProject/_workitems/edit/1234',
          fields: {
            'System.Id': 1234,
            'System.Title': 'Work item title',
            'System.WorkItemType': 'Task',
            'System.State': 'Done'
          }
        }
      ]
    }
    getWorkItemsBatchMock.mockResolvedValueOnce(workItemsBatchResponse)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'workItems', '1234')
  })

  it('Updates release notes for many workitem references', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock = mockInputs()
    const notesBefore = fs.readFileSync(
      path.join(__dirname, 'test_cases/big', 'notes_before.md'),
      'utf8'
    )
    const notesAfter = fs.readFileSync(
      path.join(__dirname, 'test_cases/big', 'notes_after.md'),
      'utf8'
    )
    const adoResponse = fs.readFileSync(
      path.join(__dirname, 'test_cases/big', 'ado_response.json'),
      'utf8'
    )
    getReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: notesBefore
      }
    })
    updateReleaseMock.mockResolvedValueOnce({
      status: 200,
      data: {
        body: 'new body'
      }
    })
    const workItemsBatchResponse: WorkItemsBatchResponse =
      JSON.parse(adoResponse)
    getWorkItemsBatchMock.mockResolvedValueOnce(workItemsBatchResponse)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).not.toHaveBeenCalled()
    expect(setOutputMock).toHaveBeenNthCalledWith(
      1,
      'workItems',
      '11, 1, 111, 5, 14, 143, 112'
    )
    expect(updateReleaseMock).toHaveBeenCalledWith({
      owner: 'repoOwner',
      repo: 'repoName',
      release_id: 123,
      body: notesAfter
    })
  })

  it.each([
    ['', 'adoProject', 'adoOrg', 'token', 'repo_owner', 'repo_name'],
    ['adoPat', '', 'adoOrg', 'token', 'repo_owner', 'repo_name'],
    ['adoPat', 'adoProject', '', 'token', 'repo_owner', 'repo_name'],
    ['adoPat', 'adoProject', 'adoOrg', '', 'repo_owner', 'repo_name'],
    ['adoPat', 'adoProject', 'adoOrg', 'token', '', 'repo_name'],
    ['adoPat', 'adoProject', 'adoOrg', 'token', 'repo_owner', '']
  ])(
    'missing inputs: adoPat:"%s" adoProject:"%s" adoOrg:"%s" token:"%s" repoOwner:"%s" repoName:"%s"',
    async (adoPat, adoProject, adoOrg, token, repo_owner, repo_name) => {
      // Set the action's inputs as return values from core.getInput()
      getInputMock = mockInputs(
        123,
        adoPat,
        adoProject,
        adoOrg,
        token,
        repo_owner,
        repo_name
      )

      await main.run()
      expect(runMock).toHaveReturned()

      // Verify that all of the core library functions were called correctly
      expect(setFailedMock).toHaveBeenNthCalledWith(
        1,
        'Missing required inputs'
      )
      expect(errorMock).not.toHaveBeenCalled()
    }
  )

  it('sets a failed status', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'release-id':
          return 'this is not a number'
        default:
          return 'foo'
      }
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'No release id provided')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('sets a failed status when theres an exception', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock = mockInputs()
    getOctokitMock.mockImplementation(() => {
      throw Error('Could not get octokit')
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'Could not get octokit')
  })
})
