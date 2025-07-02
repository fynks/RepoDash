// --- STATE MANAGEMENT ---

let repositories = [];
let repoData = {};
let settings = {};

// Default settings structure
const DEFAULT_SETTINGS = {
    showDescriptions: true,
    defaultRepo: "",
    theme: "auto", // auto, light, dark
};

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    initializeTheme();
    loadSettings();
    renderRepoList(); // Initial render of the managed repo list
    // Other initial loading functions can go here
});

/**
 * Loads repositories, cached data, and settings from localStorage.
 * Handles potential parsing errors with corrupted data.
 */
function loadDataFromStorage() {
    try {
        const storedRepos = localStorage.getItem("github-repos");
        repositories = storedRepos ? JSON.parse(storedRepos) : [];
    } catch (error) {
        console.error("Error parsing repositories from localStorage:", error);
        repositories = [];
        localStorage.removeItem("github-repos"); // Clear corrupted data
    }

    try {
        const storedRepoData = localStorage.getItem("github-repo-data");
        repoData = storedRepoData ? JSON.parse(storedRepoData) : {};
    } catch (error) {
        console.error("Error parsing repo data from localStorage:", error);
        repoData = {};
        localStorage.removeItem("github-repo-data");
    }

    try {
        const storedSettings = localStorage.getItem("github-settings");
        settings = storedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) } : { ...DEFAULT_SETTINGS };
        
        // Clean up legacy settings keys
        delete settings.compactView;
        delete settings.defaultSort;

    } catch (error) {
        console.error("Error parsing settings from localStorage:", error);
        settings = { ...DEFAULT_SETTINGS };
        localStorage.removeItem("github-settings");
    }
}

// --- THEME MANAGEMENT ---

/**
 * Sets the initial theme based on user settings or system preference.
 */
function initializeTheme() {
    const userTheme = settings.theme || 'auto';
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = userTheme === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : userTheme;
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);
}

/**
 * Toggles between light and dark themes and saves the preference.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    settings.theme = newTheme; // Persist the explicit choice
    saveSettings();
    updateThemeIcon(newTheme);
    showNotification(`Switched to ${newTheme} theme`, 'success');
}

/**
 * Updates the theme toggle button's icon.
 * @param {string} theme - The current theme ('light' or 'dark').
 */
function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    const sunIconPath = "M12 17q-2.075 0-3.537-1.463Q7 14.075 7 12t1.463-3.538Q9.925 7 12 7t3.538 1.462Q17 9.925 17 12q0 2.075-1.462 3.537Q14.075 17 12 17ZM2 13q-.425 0-.712-.288Q1 12.425 1 12t.288-.713Q1.575 11 2 11h2q.425 0 .713.287Q5 11.575 5 12t-.287.712Q4.425 13 4 13Zm18 0q-.425 0-.712-.288Q19 12.425 19 12t.288-.713Q19.575 11 20 11h2q.425 0 .712.287Q23 11.575 23 12t-.288.712Q22.425 13 22 13Zm-8-8q-.425 0-.712-.288Q11 4.425 11 4V2q0-.425.288-.713Q11.575 1 12 1t.713.287Q13 1.575 13 2v2q0 .425-.287.712Q12.425 5 12 5Zm0 18q-.425 0-.712-.288Q11 21.425 11 21v-2q0-.425.288-.712Q11.575 18 12 18t.713.288Q13 18.575 13 19v2q0 .425-.287.712Q12.425 23 12 23ZM5.65 7.05 4.575 6q-.3-.275-.3-.7 0-.425.3-.725.275-.3.7-.3.425 0 .725.3L7.05 5.65q.275.3.275.7 0 .4-.275.7-.3.275-.7.275-.4 0-.7-.275Zm12.7 12.7L17.3 18.7q-.275-.3-.275-.7 0-.4.275-.7.3-.275.7-.275.4 0 .7.275l1.075 1.05q.3.3.3.725 0 .425-.3.7-.275.3-.7.3-.425 0-.725-.3ZM18.35 7.05q-.3-.275-.3-.7 0-.425.3-.725L19.425 4.6q.3-.3.725-.3.425 0 .7.3.3.275.3.7 0 .425-.3.725L19.775 7.05q-.3.275-.7.275-.4 0-.725-.275ZM5.65 19.75q-.3-.275-.3-.7 0-.425.3-.725L6.7 17.3q.275-.3.7-.3.425 0 .7.3.3.275.3.7 0 .425-.3.725l-1.05 1.075q-.3.3-.725.3-.425 0-.7-.3Z";
    const moonIconPath = "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z";
    icon.innerHTML = `<path d="${theme === 'dark' ? sunIconPath : moonIconPath}"/>`;
}


// --- REPOSITORY MANAGEMENT ---

/**
 * Parses user input, adds a new repository if valid and not a duplicate.
 */
function addRepository() {
    const repoInput = document.getElementById('repo-input');
    let repoPath = repoInput.value.trim();

    if (!repoPath) {
        showNotification("Repository input cannot be empty.", "error");
        return;
    }
    
    // Standardize input: extract "user/repo" from full URLs
    try {
        if (repoPath.startsWith("http")) {
            const url = new URL(repoPath);
            if (url.hostname === "github.com") {
                repoPath = url.pathname.substring(1); // Remove leading slash
            } else {
                throw new Error();
            }
        }
    } catch (e) {
        showNotification("Invalid GitHub URL.", "error");
        return;
    }
    
    // Validate format: must be "user/repo"
    if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}\/[a-zA-Z0-9-_\.]+$/.test(repoPath)) {
        showNotification("Invalid repository format. Use 'user/repo'.", "error");
        return;
    }

    if (repositories.includes(repoPath)) {
        showNotification("This repository is already in your list.", "warning");
        return;
    }

    repositories.push(repoPath);
    localStorage.setItem("github-repos", JSON.stringify(repositories));
    showNotification(`Added ${repoPath}`, "success");
    repoInput.value = ''; // Clear input field
    
    renderRepoList(); // Update the settings UI
    forceRefresh(); // Fetch data for the new repo
}

/**
 * Deletes a repository from the list and updates storage.
 * @param {string} repoName - The "user/repo" name to delete.
 */
function deleteRepository(repoName) {
    if (confirm(`Are you sure you want to remove ${repoName}?`)) {
        repositories = repositories.filter(repo => repo !== repoName);
        delete repoData[repoName]; // Remove its cached data

        localStorage.setItem("github-repos", JSON.stringify(repositories));
        localStorage.setItem("github-repo-data", JSON.stringify(repoData));

        showNotification(`Removed ${repoName}`, 'success');
        renderRepoList(); // Update the settings UI
        // Potentially update home/repos view if the deleted repo was visible
    }
}


// --- UI RENDERING & SETTINGS ---

/**
 * Populates the "Managed Repositories" list in the settings tab.
 */
function renderRepoList() {
    const listElement = document.getElementById('repo-list');
    listElement.innerHTML = ''; // Clear current list

    if (repositories.length === 0) {
        listElement.innerHTML = '<li class="loading">No repositories added yet.</li>';
        return;
    }

    repositories.forEach(repo => {
        const listItem = document.createElement('li');
        listItem.className = 'repo-item';
        listItem.setAttribute('role', 'listitem');

        listItem.innerHTML = `
            <div class="repo-info">
                <div class="repo-url">${repo}</div>
            </div>
            <button class="btn-delete" onclick="deleteRepository('${repo}')" aria-label="Delete ${repo}">
                <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
                </svg>
            </button>
        `;
        listElement.appendChild(listItem);
    });
}

/**
 * Saves the current settings object to localStorage.
 */
function saveSettings() {
    localStorage.setItem("github-settings", JSON.stringify(settings));
}

/**
 * Applies saved settings to the UI controls on load.
 */
function loadSettings() {
    const showDescriptionsToggle = document.getElementById('show-descriptions-toggle');
    const defaultRepoSelect = document.getElementById('default-repo');

    showDescriptionsToggle.classList.toggle('active', settings.showDescriptions);
    showDescriptionsToggle.setAttribute('aria-checked', settings.showDescriptions.toString());

    defaultRepoSelect.value = settings.defaultRepo || "";
}

// --- NAVIGATION & STATUS ---

/**
 * Switches between the main application tabs.
 * @param {string} tabName - The name of the tab to switch to (e.g., 'home').
 * @param {HTMLElement} element - The clicked button element.
 */
function switchTab(tabName, element) {
    // Update navigation button states
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('tabindex', '-1');
    });
    element.classList.add('active');
    element.setAttribute('aria-selected', 'true');
    element.setAttribute('tabindex', '0');

    // Show the correct content panel
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');

    if (tabName === 'settings') {
        renderRepoList(); // Ensure the repo list is up-to-date when switching to settings
    }
}

/**
 * Displays a temporary notification to the user.
 * @param {string} message - The text to display.
 * @param {string} type - 'success', 'error', or 'warning'.
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Updates the global status indicator.
 * @param {string} text - The message to show.
 * @param {string} state - 'ready', 'updating', or 'error'.
 */
function updateStatus(text, state = 'ready') {
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    const updateBtn = document.getElementById('update-btn');

    statusText.textContent = text;
    statusDot.className = 'status-dot'; // Reset classes
    updateBtn.disabled = false;

    if (state === 'updating') {
        statusDot.classList.add('updating');
        updateBtn.disabled = true;
    } else if (state === 'error') {
        statusDot.classList.add('error');
    }
}

// TODO: Implement the following data-fetching functions
// These are placeholders to illustrate where they fit in the new structure.

function forceRefresh() {
    showNotification("Refreshing data...", "warning");
    updateStatus("Updating...", "updating");
    // Add logic here to fetch data for all repositories from the GitHub API
    // On success: updateStatus("Ready");
    // On error: updateStatus("Update failed", "error");
}

function loadAllReposData() {
    // Add logic to populate the #repos-grid
}

function toggleShowDescriptions() {
    // Add logic to toggle descriptions and save setting
}

function updateDefaultRepo() {
    // Add logic to update the default repo and save setting
}