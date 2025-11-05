// Markdown Modal - Display formatted markdown content in a modal

class MarkdownModal {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    // Create modal structure
    this.modal = document.createElement('div');
    this.modal.id = 'markdown-modal';
    this.modal.className = 'markdown-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    this.modal.innerHTML = `
      <div class="markdown-modal-content" style="
        background: linear-gradient(135deg, rgba(0, 20, 20, 0.98) 0%, rgba(0, 10, 10, 0.98) 100%);
        border: 2px solid teal;
        border-radius: 16px;
        max-width: 800px;
        max-height: 80vh;
        width: 90%;
        box-shadow: 0 24px 64px rgba(0, 255, 155, 0.3), inset 0 0 32px rgba(0, 255, 155, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <div class="markdown-modal-header" style="
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 255, 155, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="
            margin: 0;
            color: #9fffd6;
            font-family: 'Jost', sans-serif;
            font-size: 24px;
            font-weight: 600;
          ">Task List</h2>
          <button class="markdown-modal-close" style="
            background: rgba(255, 80, 80, 0.2);
            border: 1px solid #ff5050;
            color: #ff5050;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          ">✕</button>
        </div>
        <div class="markdown-modal-body" style="
          padding: 24px;
          overflow-y: auto;
          flex: 1;
          color: #eafdf6;
          font-family: 'Jost', sans-serif;
          line-height: 1.6;
        "></div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.id = 'markdown-modal-styles';
    style.textContent = `
      .markdown-modal-content {
        animation: modalSlideIn 0.3s ease-out;
      }

      @keyframes modalSlideIn {
        from {
          transform: translateY(-20px) scale(0.95);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      .markdown-modal-close:hover {
        background: rgba(255, 80, 80, 0.4) !important;
        box-shadow: 0 0 12px rgba(255, 80, 80, 0.5);
      }

      /* Markdown styling */
      .markdown-modal-body h1 {
        color: #9fffd6;
        font-size: 28px;
        margin: 0 0 20px 0;
        padding-bottom: 12px;
        border-bottom: 2px solid rgba(0, 255, 155, 0.3);
      }

      .markdown-modal-body h2 {
        color: #72f5c1;
        font-size: 22px;
        margin: 24px 0 16px 0;
      }

      .markdown-modal-body h3 {
        color: #5fe3ab;
        font-size: 18px;
        margin: 20px 0 12px 0;
      }

      .markdown-modal-body p {
        margin: 12px 0;
      }

      .markdown-modal-body ul, .markdown-modal-body ol {
        margin: 12px 0;
        padding-left: 24px;
      }

      .markdown-modal-body li {
        margin: 8px 0;
      }

      .markdown-modal-body strong, .markdown-modal-body b {
        color: #9fffd6;
        font-weight: 600;
      }

      .markdown-modal-body em, .markdown-modal-body i {
        color: #b0ffe5;
        font-style: italic;
      }

      .markdown-modal-body code {
        background: rgba(0, 255, 155, 0.1);
        border: 1px solid rgba(0, 255, 155, 0.2);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        color: #72f5c1;
      }

      .markdown-modal-body pre {
        background: rgba(0, 255, 155, 0.05);
        border: 1px solid rgba(0, 255, 155, 0.2);
        border-radius: 8px;
        padding: 16px;
        overflow-x: auto;
        margin: 16px 0;
      }

      .markdown-modal-body pre code {
        background: none;
        border: none;
        padding: 0;
      }

      .markdown-modal-body a {
        color: #00ff9b;
        text-decoration: none;
        border-bottom: 1px solid rgba(0, 255, 155, 0.3);
        transition: border-color 0.2s;
      }

      .markdown-modal-body a:hover {
        border-bottom-color: #00ff9b;
      }

      .markdown-modal-body blockquote {
        border-left: 4px solid rgba(0, 255, 155, 0.5);
        padding-left: 16px;
        margin: 16px 0;
        font-style: italic;
        opacity: 0.9;
      }

      .markdown-modal-body hr {
        border: none;
        border-top: 1px solid rgba(0, 255, 155, 0.2);
        margin: 24px 0;
      }

      /* Scrollbar styling */
      .markdown-modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .markdown-modal-body::-webkit-scrollbar-track {
        background: rgba(0, 255, 155, 0.05);
        border-radius: 4px;
      }

      .markdown-modal-body::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 155, 0.3);
        border-radius: 4px;
      }

      .markdown-modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 155, 0.5);
      }
    `;
    if (!document.getElementById('markdown-modal-styles')) {
      document.head.appendChild(style);
    }

    // Add to body
    document.body.appendChild(this.modal);

    // Attach event listeners
    const closeBtn = this.modal.querySelector('.markdown-modal-close');
    closeBtn.addEventListener('click', () => this.hide());

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.hide();
      }
    });
  }

  // Show modal with markdown content
  show(markdown, title = 'Task List') {
    const body = this.modal.querySelector('.markdown-modal-body');
    const header = this.modal.querySelector('.markdown-modal-header h2');

    // Set title
    header.textContent = title;

    // Convert markdown to HTML (simple implementation)
    const html = this.markdownToHtml(markdown);
    body.innerHTML = html;

    // Show modal
    this.modal.style.display = 'flex';
    // Trigger animation
    setTimeout(() => {
      this.modal.style.opacity = '1';
    }, 10);
  }

  // Hide modal
  hide() {
    this.modal.style.opacity = '0';
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  // Simple markdown to HTML converter
  markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Lists (simple implementation)
    html = html.replace(/^\* (.*)$/gim, '<li>$1</li>');
    html = html.replace(/^\d+\. (.*)$/gim, '<li>$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return '<ul>' + match + '</ul>';
    });

    // Horizontal rules
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');

    // Paragraphs (split by double newlines)
    const paragraphs = html.split('\n\n');
    html = paragraphs.map(p => {
      // Don't wrap if it's already a tag
      if (p.trim().match(/^<[a-z]/i)) {
        return p;
      }
      return '<p>' + p + '</p>';
    }).join('\n');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}

// Export to global scope
window.MarkdownModal = MarkdownModal;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.markdownModal) {
      window.markdownModal = new MarkdownModal();
    }
  });
} else {
  // DOM is already ready
  if (!window.markdownModal) {
    window.markdownModal = new MarkdownModal();
  }
}
