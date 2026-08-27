// Wait for DOM content to load before executing
document.addEventListener('DOMContentLoaded', () => {

    // Select key elements
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Handle Page Switching and Navigation State
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetPage = item.getAttribute('data-page');

            if (!targetPage) return;

            // Remove active class from all links and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            pageSections.forEach(section => section.classList.remove('active'));

            // Add active class to clicked menu item
            item.classList.add('active');

            // Show target page section
            const targetSection = document.getElementById(targetPage);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Close mobile sidebar on menu click
            closeMobileSidebar();
        });
    });

    // Mobile Sidebar Toggle Functionality
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    });

    // Close mobile sidebar when clicking on overlay background
    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    function closeMobileSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }
});




// 1. globaldatabade for all sidebar links
const siteData = [
  { id: 1, title: 'HTML & CSS Fundamentals', category: 'My Courses', type: 'Course', link: '#course-html' },
  { id: 2, title: 'JavaScript Basics Quiz', category: 'Quizzes', type: 'Quiz', link: '#quiz-js' },
  { id: 3, title: 'React JS Crash Course', category: 'My Courses', type: 'Course', link: '#course-react' },
  { id: 4, title: 'Python Loop Concepts', category: 'Notes', type: 'Note', link: '#note-python' },
  { id: 5, title: 'Web Development Certificate', category: 'Certificates', type: 'Certificate', link: '#cert-web' }
];

// 2. search filterin function
function handleGlobalSearch() {
  const query = document.getElementById('globalSearchInput').value.toLowerCase().trim();
  const mainContent = document.getElementById('mainContentArea');

  // when user is clear the search box, then default page is view
  if (query === '') {
    renderDefaultDashboard();
    return;
  }

  // searching for all pages..
  const filteredResults = siteData.filter(item => 
    item.title.toLowerCase().includes(query) || 
    item.category.toLowerCase().includes(query)
  );

  // view for searching result in main content area
  displaySearchResults(filteredResults, query);
}

// 3. result screen renduring function
function displaySearchResults(results, query) {
  const mainContent = document.getElementById('dashboard');
  
  if (results.length === 0) {
    mainContent.innerHTML = `<div class="no-results">"${query}" দিয়ে কোনো কোর্স, কুইজ বা নোট পাওয়া যায়নি।</div>`;
    return;
  }

  let htmlContent = `<h2>Search Results for "${query}"</h2><div class="card-grid">`;
  
  results.forEach(item => {
    htmlContent += `
      <div class="card">
        <span class="badge">${item.category}</span>
        <h3>${item.title}</h3>
        <p>Type: ${item.type}</p>
        <a href="${item.link}">View Item</a>
      </div>
    `;
  });

  htmlContent += `</div>`;
  mainContent.innerHTML = htmlContent;
}

// 4. default dashboard content loading function
function renderDefaultDashboard() {
  const mainContent = document.getElementById('dashboard');
  // my original dashboard conternt is here
  mainContent.innerHTML = `<h2>Dashboard Overview</h2>`;   /* Default Content Here(this is for return a another page) */
}