import { getUncachableGitHubClient } from '../server/githubClient';

async function createRepo() {
  const octokit = await getUncachableGitHubClient();
  
  const repoName = 'architect-studio';
  const description = 'AI-powered web application that transforms 2D floorplan images/PDFs into 3D models using Gemini AI and Meshy API';
  
  console.log(`Creating repository: ${repoName}...`);
  
  try {
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: false,
      auto_init: false,
    });
    
    console.log(`\nRepository created successfully!`);
    console.log(`URL: ${repo.html_url}`);
    console.log(`Clone URL: ${repo.clone_url}`);
    console.log(`\nTo push your code, run:`);
    console.log(`  git remote add github ${repo.clone_url}`);
    console.log(`  git push github main`);
    
    return repo;
  } catch (error: any) {
    if (error.status === 422 && error.message?.includes('already exists')) {
      console.log('Repository already exists. Fetching info...');
      const { data: user } = await octokit.users.getAuthenticated();
      const { data: repo } = await octokit.repos.get({
        owner: user.login,
        repo: repoName,
      });
      console.log(`\nExisting repository found!`);
      console.log(`URL: ${repo.html_url}`);
      console.log(`Clone URL: ${repo.clone_url}`);
      return repo;
    }
    throw error;
  }
}

createRepo().catch(console.error);
