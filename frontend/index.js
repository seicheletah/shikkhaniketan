document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile & Touch Screen Dropdown Toggle
  const exploreBtn = document.querySelector('.explore-btn');
  const dropdownMenu = document.querySelector('.dropdown-menu');

  if (exploreBtn && dropdownMenu) {
    exploreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdownMenu.style.display === 'grid';
      dropdownMenu.style.display = isVisible ? 'none' : 'grid';
    });

    // Outer click-e dropdown close kora
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && !exploreBtn.contains(e.target)) {
        dropdownMenu.style.display = '';
      }
    });
  }

  // 2. Search Input Live Filter
  const searchInput = document.querySelector('.search-box input');
  const menuItems = document.querySelectorAll('.menu-column ul li');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();

      if (query.length > 0 && dropdownMenu) {
        dropdownMenu.style.display = 'grid'; // Search korar somoy dropdown khule rakha
      }

      menuItems.forEach((item) => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
});