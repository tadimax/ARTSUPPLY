// assets/js/footer.js
export function initFooter() {
  const footerHTML = `
    <footer class="site-footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="about.html">About Us</a>
          <a href="music.html">Music</a>
          <a href="artist-directory.html">Artists</a>
          <a href="merch.html">Store</a>
          <a href="contact.html">Contact</a>
        </div>
        <div class="footer-copy">
          &copy; 2025 Aural & Visual Collective. All Rights Reserved.
        </div>
      </div>
    </footer>
  `;

  document.body.insertAdjacentHTML('beforeend', footerHTML);
}

//Auto-run if imported as a module
initFooter();