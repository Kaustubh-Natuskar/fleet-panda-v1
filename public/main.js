document.addEventListener('DOMContentLoaded', () => {
    const contentDiv = document.getElementById('content');
    const navLinks = document.querySelectorAll('nav a');

    // Define the markdown loading function
    async function loadMarkdown(file) {
        try {
            contentDiv.innerHTML = 'Loading...';
            const response = await fetch(file);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const markdown = await response.text();
            contentDiv.innerHTML = marked.parse(markdown);
        } catch (error) {
            contentDiv.innerHTML = `<p>Error loading file: ${file}. Make sure the server is configured to serve it.</p><p><pre>${error}</pre></p>`;
            console.error('Error fetching markdown:', error);
        }
    }

    // Attach event listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            const file = link.dataset.file;
            // If the link has a 'data-file' attribute, it's a markdown link.
            // Handle it with JavaScript.
            if (file) {
                event.preventDefault(); // Prevent the browser from following the href
                loadMarkdown(file);
            }
            // Otherwise, do nothing and let the browser handle the click normally (e.g., for the Swagger link).
        });
    });

    // Load the default README.md file on initial page load
    loadMarkdown('/README.md');
});
