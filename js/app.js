// Data storage
        let repositories = JSON.parse(localStorage.getItem('github-repos') || '[]');
        let repoData = JSON.parse(localStorage.getItem('github-repo-data') || '{}');
        let selectedRepo = localStorage.getItem('selected-repo') || null;
        let lastUpdate = localStorage.getItem('last-update') || null;

        // Settings
        let settings = JSON.parse(localStorage.getItem('github-settings') || JSON.stringify({
            compactView: false,
            showDescriptions: true,
            defaultSort: 'stars',
            defaultRepo: '',
            theme: 'light'
        }));

        // Cache duration - 15 minutes
        let CACHE_DURATION = 15 * 60 * 1000;

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            initializeTheme();
            loadRepositories();
            loadSettings();
            updateDefaultRepoOptions();
            
            if (repositories.length > 0) {
                if (!selectedRepo) {
                    selectedRepo = settings.defaultRepo && repositories.includes(settings.defaultRepo) 
                        ? settings.defaultRepo 
                        : repositories[0];
                    localStorage.setItem('selected-repo', selectedRepo);
                }
                loadRepoData();
            }
            updateSettingsList();
            updateStatus('Ready');
        });

        // Load settings from localStorage
        function loadSettings() {
            const compactViewToggle = document.getElementById('compact-view-toggle');
            const showDescriptionsToggle = document.getElementById('show-descriptions-toggle');
            const defaultSortSelect = document.getElementById('default-sort');
            const defaultRepoSelect = document.getElementById('default-repo');
            
            compactViewToggle.classList.toggle('active', settings.compactView);
            compactViewToggle.setAttribute('aria-checked', settings.compactView.toString());
            
            showDescriptionsToggle.classList.toggle('active', settings.showDescriptions);
            showDescriptionsToggle.setAttribute('aria-checked', settings.showDescriptions.toString());
            
            defaultSortSelect.value = settings.defaultSort;
            defaultRepoSelect.value = settings.defaultRepo || '';
        }

        // Initialize theme
        function initializeTheme() {
            const savedTheme = settings.theme || 'light';
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
            
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }

        // Toggle theme
        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            settings.theme = newTheme;
            saveSettings();
            updateThemeIcon(newTheme);
            showNotification(`Switched to ${newTheme} theme`, 'success');
        }

        // Update theme icon
        function updateThemeIcon(theme) {
            const themeIcon = document.getElementById('theme-icon');
            const sunPath = "M12 17q-2.075 0-3.537-1.463Q7 14.075 7 12t1.463-3.538Q9.925 7 12 7t3.538 1.462Q17 9.925 17 12q0 2.075-1.462 3.537Q14.075 17 12 17ZM2 13q-.425 0-.712-.288Q1 12.425 1 12t.288-.713Q1.575 11 2 11h2q.425 0 .713.287Q5 11.575 5 12t-.287.712Q4.425 13 4 13Zm18 0q-.425 0-.712-.288Q19 12.425 19 12t.288-.713Q19.575 11 20 11h2q.425 0 .712.287Q23 11.575 23 12t-.288.712Q22.425 13 22 13Zm-8-8q-.425 0-.712-.288Q11 4.425 11 4V2q0-.425.288-.713Q11.575 1 12 1t.713.287Q13 1.575 13 2v2q0 .425-.287.712Q12.425 5 12 5Zm0 18q-.425 0-.712-.288Q11 21.425 11 21v-2q0-.425.288-.712Q11.575 18 12 18t.713.288Q13 18.575 13 19v2q0 .425-.287.712Q12.425 23 12 23ZM5.65 7.05 4.575 6q-.3-.275-.3-.7 0-.425.3-.725.275-.3.7-.3.425 0 .725.3L7.05 5.65q.275.3.275.7 0 .4-.275.7-.3.275-.7.275-.4 0-.7-.275Zm12.7 12.7L17.3 18.7q-.275-.3-.275-.7 0-.4.275-.7.3-.275.7-.275.4 0 .7.275l1.075 1.05q.3.3.3.725 0 .425-.3.7-.275.3-.7.3-.425 0-.725-.3ZM18.35 7.05q-.3-.275-.3-.7 0-.425.3-.725L19.425 4.6q.3-.3.725-.3.425 0 .7.3.3.275.3.7 0 .425-.3.725L19.775 7.05q-.3.275-.7.275-.4 0-.725-.275ZM5.65 19.75q-.3-.275-.3-.7 0-.425.3-.725L6.7 17.3q.275-.3.7-.3.425 0 .7.3.3.275.3.7 0 .425-.3.725l-1.05 1.075q-.3.3-.725.3-.425 0-.7-.3Z";
            const moonPath = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z";
            
            themeIcon.innerHTML = `<path d="${theme === 'dark' ? sunPath : moonPath}"/>`;
        }

        // Save settings to localStorage
        function saveSettings() {
            localStorage.setItem('github-settings', JSON.stringify(settings));
        }

        // Update status indicator
        function updateStatus(status, type = 'ready') {
            const statusText = document.getElementById('status-text');
            const statusDot = document.querySelector('.status-dot');
            const updateBtn = document.getElementById('update-btn');

            statusText.textContent = status;
            statusDot.className = 'status-dot';
            updateBtn.disabled = false;

            if (type === 'updating') {
                statusDot.classList.add('updating');
                updateBtn.disabled = true;
            } else if (type === 'error') {
                statusDot.classList.add('error');
            }
        }

        // Tab switching
        function switchTab(tabName) {
            // Update nav items - handle both button and div elements for backwards compatibility
            document.querySelectorAll('.nav-item').forEach((item, index) => {
                item.classList.remove('active');
                if (item.setAttribute) {
                    item.setAttribute('aria-selected', 'false');
                    item.setAttribute('tabindex', '-1');
                }
            });
            
            const activeNav = event?.currentTarget || document.querySelector(`.nav-item[onclick*="${tabName}"]`);
            if (activeNav) {
                activeNav.classList.add('active');
                if (activeNav.setAttribute) {
                    activeNav.setAttribute('aria-selected', 'true');
                    activeNav.setAttribute('tabindex', '0');
                }
            }

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + '-tab').classList.add('active');

            // Load data based on tab
            if (tabName === 'repos' && repositories.length > 0) {
                loadAllReposData();
            }
            
            // Announce tab change for screen readers
            announceToScreenReader(`Switched to ${tabName} tab`);
        }

        // Announce to screen readers
        function announceToScreenReader(message) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            setTimeout(() => document.body.removeChild(announcement), 1000);
        }

        // GitHub API functions
        async function fetchRepoData(repoUrl) {
            const repoPath = extractRepoPath(repoUrl);
            if (!repoPath) return null;

            try {
                const response = await fetch(`https://api.github.com/repos/${repoPath}`);
                if (!response.ok) throw new Error('Repository not found');
                
                const data = await response.json();
                return {
                    name: data.name,
                    full_name: data.full_name,
                    stars: data.stargazers_count,
                    forks: data.forks_count,
                    issues: data.open_issues_count,
                    language: data.language,
                    description: data.description,
                    updated_at: data.updated_at,
                    created_at: data.created_at,
                    url: data.html_url
                };
            } catch (error) {
                console.error('Error fetching repo data:', error);
                return null;
            }
        }

        function extractRepoPath(url) {
            // Handle both full GitHub URLs and owner/repo format
            if (url.includes('github.com')) {
                const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
                return match ? match[1] : null;
            } else if (url.includes('/')) {
                return url;
            }
            return null;
        }

        // Cache management
        function isCacheValid() {
            if (!lastUpdate) return false;
            return (Date.now() - parseInt(lastUpdate)) < CACHE_DURATION;
        }

        function updateCache(data) {
            repoData = { ...repoData, ...data };
            localStorage.setItem('github-repo-data', JSON.stringify(repoData));
            localStorage.setItem('last-update', Date.now().toString());
            lastUpdate = Date.now().toString();
            updateStatusTime();
        }

        // UI update functions
        function updateHomeTab(data) {
            const homeDiv = document.getElementById('main-repo');
            
            if (!data) {
                homeDiv.innerHTML = `
                    <div class="loading">
                        <div class="spinner"></div>
                        Select a repository to track
                    </div>
                `;
                return;
            }

            homeDiv.innerHTML = `
                <div class="repo-header">
                    <div>
                        <div class="repo-name">${data.full_name}</div>
                        <div class="repo-description">${data.description || 'No description available'}</div>
                    </div>
                    <a href="${data.url}" target="_blank" class="repo-link">View on GitHub →</a>
                </div>
                <div class="star-count">
                    <svg class="star-icon" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <div class="star-number">
                        <div class="star-main">${data.stars.toLocaleString()}</div>
                        <div class="star-label">GitHub Stars</div>
                    </div>
                </div>
                <div class="repo-stats">
                    <div class="stat-item">
                        <div class="stat-value">${data.forks.toLocaleString()}</div>
                        <div class="stat-label">Forks</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.issues.toLocaleString()}</div>
                        <div class="stat-label">Open Issues</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${data.language || 'N/A'}</div>
                        <div class="stat-label">Language</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${new Date(data.updated_at).toLocaleDateString()}</div>
                        <div class="stat-label">Last Updated</div>
                    </div>
                </div>
            `;
        }

        function updateReposTab(allData) {
            const reposGrid = document.getElementById('repos-grid');
            
            if (Object.keys(allData).length === 0) {
                reposGrid.innerHTML = `
                    <div class="loading">
                        No repositories added yet. Go to Settings to add some!
                    </div>
                `;
                return;
            }

            // Sort repositories based on settings
            const sortedRepos = sortRepositories(repositories, allData);

            const repoCards = sortedRepos.map(repo => {
                const data = allData[repo];
                if (!data) return '';
                
                const description = settings.showDescriptions && data.description 
                    ? `<div class="repo-card-description">${data.description}</div>` 
                    : '';
                
                return `
                    <div class="repo-card" onclick="selectRepo('${repo}')" tabindex="0" role="button" aria-label="Select ${data.full_name} repository" onkeydown="handleRepoCardKeydown(event, '${repo}')">
                        <h3>${data.full_name}</h3>
                        ${description}
                        <div class="repo-stars">
                            <div class="star-info">
                                <svg class="small-star-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                ${data.stars.toLocaleString()}
                            </div>
                            ${data.language ? `<div class="repo-language">${data.language}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            reposGrid.innerHTML = repoCards;
        }

        function sortRepositories(repos, data) {
            return repos.sort((a, b) => {
                const dataA = data[a];
                const dataB = data[b];
                
                if (!dataA || !dataB) return 0;
                
                switch (settings.defaultSort) {
                    case 'stars':
                        return dataB.stars - dataA.stars;
                    case 'name':
                        return dataA.full_name.localeCompare(dataB.full_name);
                    case 'updated':
                        return new Date(dataB.updated_at) - new Date(dataA.updated_at);
                    case 'created':
                        return new Date(dataB.created_at) - new Date(dataA.created_at);
                    default:
                        return 0;
                }
            });
        }

        function updateSettingsList() {
            const listElement = document.getElementById('repo-list');
            
            if (repositories.length === 0) {
                listElement.innerHTML = '<li style="text-align: center; color: #64748b; padding: 20px;">No repositories added yet</li>';
                return;
            }

            const listItems = repositories.map(repo => {
                const data = repoData[repo];
                const addedDate = localStorage.getItem(`repo-added-${repo}`) || 'Unknown';
                
                return `
                    <li class="repo-item">
                        <div class="repo-info">
                            <div class="repo-url">${repo}</div>
                            <div class="repo-added">Added ${addedDate}</div>
                        </div>
                        <button onclick="removeRepository('${repo}')" class="btn btn-danger">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            Remove
                        </button>
                    </li>
                `;
            }).join('');

            listElement.innerHTML = listItems;
        }

        // Repository management
        function addRepository() {
            const input = document.getElementById('repo-input');
            const repoUrl = input.value.trim();
            
            if (!repoUrl) {
                showNotification('Please enter a repository URL', 'error');
                return;
            }

            const repoPath = extractRepoPath(repoUrl);
            if (!repoPath) {
                showNotification('Invalid repository URL format', 'error');
                return;
            }

            if (repositories.includes(repoPath)) {
                showNotification('Repository already added', 'warning');
                return;
            }

            // Add to list and save
            repositories.push(repoPath);
            localStorage.setItem('github-repos', JSON.stringify(repositories));
            localStorage.setItem(`repo-added-${repoPath}`, new Date().toLocaleDateString());
            
            // Set as selected if it's the first one or if no default is set
            if (repositories.length === 1 || (!settings.defaultRepo && repositories.length > 0)) {
                selectedRepo = repoPath;
                localStorage.setItem('selected-repo', selectedRepo);
            }

            // Clear input and update UI
            input.value = '';
            updateSettingsList();
            updateDefaultRepoOptions();
            showNotification('Repository added successfully!', 'success');

            // Load data for the new repository
            loadRepoData();
        }

        function removeRepository(repo) {
            repositories = repositories.filter(r => r !== repo);
            localStorage.setItem('github-repos', JSON.stringify(repositories));
            
            // Remove from cache
            delete repoData[repo];
            localStorage.setItem('github-repo-data', JSON.stringify(repoData));
            
            // Update selected repo if needed
            if (selectedRepo === repo) {
                selectedRepo = repositories.length > 0 ? repositories[0] : null;
                localStorage.setItem('selected-repo', selectedRepo || '');
            }

            updateSettingsList();
            updateDefaultRepoOptions();
            showNotification('Repository removed');

            // Reload data
            loadRepoData();
        }

        function selectRepo(repo) {
            selectedRepo = repo;
            localStorage.setItem('selected-repo', selectedRepo);
            switchTab('home');
            document.querySelectorAll('.nav-item')[0].click();
            loadRepoData();
        }

        // Data loading functions
        async function loadRepoData() {
            if (!selectedRepo) {
                updateHomeTab(null);
                return;
            }

            updateStatus('Loading...', 'updating');

            // Check cache first
            if (isCacheValid() && repoData[selectedRepo]) {
                updateHomeTab(repoData[selectedRepo]);
                updateStatus('Ready');
                return;
            }

            // Fetch fresh data
            const data = await fetchRepoData(selectedRepo);
            if (data) {
                updateCache({ [selectedRepo]: data });
                updateHomeTab(data);
                updateStatus('Updated');
            } else {
                showNotification('Failed to load repository data', 'error');
                updateStatus('Error', 'error');
            }
        }

        async function loadAllReposData() {
            const reposGrid = document.getElementById('repos-grid');
            reposGrid.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    Loading repositories...
                </div>
            `;

            updateStatus('Loading repositories...', 'updating');

            // Check cache first
            if (isCacheValid() && repositories.every(repo => repoData[repo])) {
                updateReposTab(repoData);
                updateStatus('Ready');
                return;
            }

            // Fetch data for repos not in cache or if cache is invalid
            const promises = repositories.map(async repo => {
                if (isCacheValid() && repoData[repo]) {
                    return { [repo]: repoData[repo] };
                }
                
                const data = await fetchRepoData(repo);
                return data ? { [repo]: data } : {};
            });

            try {
                const results = await Promise.all(promises);
                const newData = Object.assign({}, ...results);
                updateCache(newData);
                updateReposTab(repoData);
                updateStatus('Updated');
            } catch (error) {
                showNotification('Failed to load some repositories', 'error');
                updateReposTab(repoData);
                updateStatus('Error', 'error');
            }
        }

        // Force refresh
        async function forceRefresh() {
            // Clear cache
            localStorage.removeItem('last-update');
            lastUpdate = null;

            updateStatus('Refreshing...', 'updating');

            // Reload current data
            const activeTab = document.querySelector('.nav-item.active .nav-label').textContent.toLowerCase();
            
            if (activeTab === 'home') {
                await loadRepoData();
            } else if (activeTab === 'repositories') {
                await loadAllReposData();
            }

            showNotification('Data refreshed successfully!', 'success');
        }

        // Settings functions

        function toggleCompactView() {
            const toggle = document.getElementById('compact-view-toggle');
            settings.compactView = !settings.compactView;
            toggle.classList.toggle('active', settings.compactView);
            toggle.setAttribute('aria-checked', settings.compactView.toString());
            saveSettings();
            showNotification(`Compact view ${settings.compactView ? 'enabled' : 'disabled'}`, 'success');
            
            // Refresh current view if on repositories tab
            const activeTab = document.querySelector('.nav-item.active .nav-label').textContent.toLowerCase();
            if (activeTab === 'repositories') {
                updateReposTab(repoData);
            }
        }

        function toggleShowDescriptions() {
            const toggle = document.getElementById('show-descriptions-toggle');
            settings.showDescriptions = !settings.showDescriptions;
            toggle.classList.toggle('active', settings.showDescriptions);
            toggle.setAttribute('aria-checked', settings.showDescriptions.toString());
            saveSettings();
            showNotification(`Descriptions ${settings.showDescriptions ? 'shown' : 'hidden'}`, 'success');
            
            // Refresh repositories view
            const activeTab = document.querySelector('.nav-item.active .nav-label').textContent.toLowerCase();
            if (activeTab === 'repositories') {
                updateReposTab(repoData);
            }
        }

        function updateDefaultSort() {
            const select = document.getElementById('default-sort');
            settings.defaultSort = select.value;
            saveSettings();
            showNotification('Default sort updated', 'success');
            
            // Refresh repositories view
            const activeTab = document.querySelector('.nav-item.active .nav-label').textContent.toLowerCase();
            if (activeTab === 'repositories') {
                updateReposTab(repoData);
            }
        }

        function updateDefaultRepo() {
            const select = document.getElementById('default-repo');
            settings.defaultRepo = select.value;
            saveSettings();
            
            if (select.value) {
                selectedRepo = select.value;
                localStorage.setItem('selected-repo', selectedRepo);
                loadRepoData();
                showNotification(`Default repository set to ${select.value}`, 'success');
            } else {
                showNotification('Default repository cleared - will use first repository', 'success');
            }
        }

        function updateDefaultRepoOptions() {
            const select = document.getElementById('default-repo');
            const currentValue = select.value;
            
            // Clear existing options except the first one
            select.innerHTML = '<option value="">Auto (First Repository)</option>';
            
            // Add repository options
            repositories.forEach(repo => {
                const option = document.createElement('option');
                option.value = repo;
                option.textContent = repo;
                if (repo === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }

        // Handle keyboard navigation for repo cards
        function handleRepoCardKeydown(event, repo) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectRepo(repo);
            }
        }

        function clearCache() {
            if (confirm('Are you sure you want to clear all cached data? This will force a refresh of all repositories.')) {
                localStorage.removeItem('github-repo-data');
                localStorage.removeItem('last-update');
                repoData = {};
                lastUpdate = null;
                showNotification('Cache cleared successfully', 'success');
                updateStatusTime();
            }
        }

        // Utility functions
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        function loadRepositories() {
            const saved = localStorage.getItem('github-repos');
            if (saved) {
                repositories = JSON.parse(saved);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Skip if user is typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        document.querySelector('.nav-item[onclick*="home"]').click();
                        break;
                    case '2':
                        e.preventDefault();
                        document.querySelector('.nav-item[onclick*="repos"]').click();
                        break;
                    case '3':
                        e.preventDefault();
                        document.querySelector('.nav-item[onclick*="settings"]').click();
                        break;
                    case 'r':
                        e.preventDefault();
                        forceRefresh();
                        break;
                    case 'd':
                        e.preventDefault();
                        toggleTheme();
                        break;
                }
            }
            
            // Arrow key navigation for tab switching
            const activeNav = document.querySelector('.nav-item.active');
            const navItems = Array.from(document.querySelectorAll('.nav-item'));
            const currentIndex = navItems.indexOf(activeNav);
            
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                navItems[currentIndex - 1].click();
                navItems[currentIndex - 1].focus();
            } else if (e.key === 'ArrowRight' && currentIndex < navItems.length - 1) {
                e.preventDefault();
                navItems[currentIndex + 1].click();
                navItems[currentIndex + 1].focus();
            }
        });

        // Handle Enter key in repository input
        document.getElementById('repo-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                addRepository();
            }
        });

        // Update status time display
        function updateStatusTime() {
            const lastUpdated = document.getElementById('last-updated');
            if (lastUpdate) {
                lastUpdated.textContent = `Last updated: ${getTimeAgo(parseInt(lastUpdate))}`;
            } else {
                lastUpdated.textContent = '';
            }
        }

        // Get time ago in readable format
        function getTimeAgo(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            
            const minutes = Math.floor(diff / (1000 * 60));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (minutes < 1) {
                return 'just now';
            } else if (minutes < 60) {
                return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            } else if (hours < 24) {
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else {
                return `${days} day${days !== 1 ? 's' : ''} ago`;
            }
        }

        // Update time display every minute
        setInterval(updateStatusTime, 60000);
        
        // Initial time display
        updateStatusTime();

        // Handle online/offline status
        window.addEventListener('online', function() {
            showNotification('Connection restored - data will be updated');
        });

        window.addEventListener('offline', function() {
            showNotification('You are offline - showing cached data', 'error');
        });

        // Service Worker for better caching (optional enhancement)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('data:text/javascript,').catch(() => {
                // Service worker registration failed, but app still works
            });
        }