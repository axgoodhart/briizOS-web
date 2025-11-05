// Lightweight Markdown Renderer for Chat Widget
// Supports: bold, italic, code blocks, inline code, links, lists, headings

class MarkdownRenderer {
  constructor() {
    this.rules = [
      // Code blocks (must come before inline code)
      { pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: (match, lang, code) => `<pre><code class="language-${lang || 'text'}">${this.escapeHtml(code.trim())}</code></pre>` },

      // Inline code
      { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },

      // Bold
      { pattern: /\*\*([^*]+)\*\*/g, replacement: '<strong>$1</strong>' },
      { pattern: /__([^_]+)__/g, replacement: '<strong>$1</strong>' },

      // Italic
      { pattern: /\*([^*]+)\*/g, replacement: '<em>$1</em>' },
      { pattern: /_([^_]+)_/g, replacement: '<em>$1</em>' },

      // Links
      { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener">$1</a>' },

      // Headings
      { pattern: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
      { pattern: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
      { pattern: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },

      // Unordered lists
      { pattern: /^- (.+)$/gm, replacement: '<li>$1</li>' },
      { pattern: /^• (.+)$/gm, replacement: '<li>$1</li>' },
      { pattern: /^\* (.+)$/gm, replacement: '<li>$1</li>' },

      // Ordered lists
      { pattern: /^\d+\. (.+)$/gm, replacement: '<li>$1</li>' },

      // Line breaks (double newline = paragraph)
      { pattern: /\n\n/g, replacement: '</p><p>' },
    ];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Apply all transformation rules
    this.rules.forEach(rule => {
      html = html.replace(rule.pattern, rule.replacement);
    });

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*?<\/li>\s*)+/g, match => {
      // Check if already wrapped
      if (match.trim().startsWith('<ul>')) return match;
      return '<ul>' + match + '</ul>';
    });

    // Wrap in paragraph tags if not already structured
    if (!html.includes('<p>') && !html.includes('<h') && !html.includes('<pre>') && !html.includes('<ul>')) {
      html = '<p>' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Convert single newlines to <br> within paragraphs (but not in lists or code)
    html = html.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
      return '<p>' + content.replace(/\n(?!<)/g, '<br>') + '</p>';
    });

    return html;
  }

  renderSafe(markdown) {
    // First escape the entire markdown
    const escaped = this.escapeHtml(markdown);
    // Then apply markdown rules
    return this.render(escaped);
  }
}

// Export for use in chat widget
window.MarkdownRenderer = MarkdownRenderer;
