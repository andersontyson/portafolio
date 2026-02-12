class GitHubAPI {
    constructor(username) {
        this.username = username;
        this.baseUrl = 'https://api.github.com';
        this.projectsContainer = document.getElementById('github-projects');
    }

    async init() {
        if (!this.projectsContainer) return;

        try {
            this.showLoading();
            const repos = await this.fetchRepos();
            
            // Filter starred or most relevant repos (for now just take first 6)
            const starredRepos = repos
                .filter(repo => !repo.fork)
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 6);

            this.projectsContainer.innerHTML = ''; // Clear loading state

            // Parallel fetching of commit data
            const repoPromises = starredRepos.map(async (repo) => {
                const lastCommitDate = await this.fetchLastCommitDate(repo.name);
                return { repo, lastCommitDate };
            });

            const reposData = await Promise.all(repoPromises);
            reposData.forEach(({ repo, lastCommitDate }) => {
                this.renderRepo(repo, lastCommitDate);
            });

        } catch (error) {
            console.error('Error fetching GitHub data:', error);
            this.showError();
        }
    }

    async fetchRepos() {
        const response = await fetch(`${this.baseUrl}/users/${this.username}/repos?sort=updated&per_page=100`);
        if (!response.ok) throw new Error('Failed to fetch repos');
        return await response.json();
    }

    async fetchLastCommitDate(repoName) {
        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.username}/${repoName}/commits?per_page=1`);
            if (!response.ok) return null;
            const commits = await response.json();
            return commits.length > 0 ? new Date(commits[0].commit.author.date).toLocaleDateString() : null;
        } catch (e) {
            return null;
        }
    }

    showLoading() {
        this.projectsContainer.innerHTML = `
            <div class="loading">
                <p>Cargando proyectos desde GitHub...</p>
            </div>
        `;
    }

    showError() {
        this.projectsContainer.innerHTML = `
            <div class="error">
                <p>No se pudieron cargar los proyectos. <a href="https://github.com/${this.username}" target="_blank">Ver en GitHub</a></p>
            </div>
        `;
    }

    renderRepo(repo, lastCommitDate) {
        const card = document.createElement('div');
        card.className = 'project-card section-reveal';
        
        const tags = repo.language ? `<span class="tag">${repo.language}</span>` : '';
        const stars = repo.stargazers_count > 0 ? `<span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>` : '';
        const commitInfo = lastCommitDate ? `<span><i class="fas fa-history"></i> ${lastCommitDate}</span>` : '';

        card.innerHTML = `
            <h3>${repo.name}</h3>
            <p>${repo.description || 'Sin descripción disponible.'}</p>
            <div class="project-tags">
                ${tags}
            </div>
            <div class="project-links">
                <a href="${repo.html_url}" target="_blank">Ver Código <i class="fas fa-external-link-alt"></i></a>
                <div class="project-stats">
                    ${stars}
                    ${commitInfo}
                </div>
            </div>
        `;

        this.projectsContainer.appendChild(card);
        
        // Trigger reveal if it was already past the scroll point
        setTimeout(() => {
            if (card.getBoundingClientRect().top < window.innerHeight) {
                card.classList.add('active');
            }
        }, 100);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const github = new GitHubAPI('andersontyson');
    github.init();
});
