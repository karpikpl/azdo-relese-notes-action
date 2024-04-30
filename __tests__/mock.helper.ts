import * as core from '@actions/core'

/**
 * Mocks the core.getInput function with predefined values for testing purposes.
 * @param releaseId - The release ID.
 * @param adoPat - The ADO PAT (Personal Access Token).
 * @param adoProject - The ADO project name.
 * @param adoOrg - The ADO organization name.
 * @param token - The repository token.
 * @param repo_owner - The repository owner.
 * @param repo_name - The repository name.
 * @returns A jest.SpiedFunction representing the mocked core.getInput function.
 */
export function mockInputs(
  releaseId = 123,
  adoPat = 'pat',
  adoProject = 'adoProject',
  adoOrg = 'adoOrg',
  token = 'token',
  repo_owner = 'repoOwner',
  repo_name = 'repoName'
): jest.SpiedFunction<typeof core.getInput> {
  const getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  getInputMock.mockImplementation(name => {
    switch (name) {
      case 'ado-pat':
        return adoPat
      case 'ado-project':
        return adoProject
      case 'ado-org':
        return adoOrg
      case 'repo-token':
        return token
      case 'repo-owner':
        return repo_owner
      case 'repo-name':
        return repo_name
      case 'release-id':
        return releaseId.toString()
      default:
        throw new Error(`Unexpected input: ${name}`)
    }
  })
  return getInputMock
}
