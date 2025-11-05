// Confirmation UI - Manages user confirmation for AI tool actions
// Displays top-left notification with confirm/cancel options

class ConfirmationUI {
  constructor() {
    this.pendingActions = [];
    this.currentNotification = null;
    this.container = null;
    this.init();
  }

  init() {
    // Create container for notifications
    this.container = document.createElement('div');
    this.container.id = 'confirmation-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  // Queue an action for confirmation
  queueAction(toolName, params, onConfirm, onCancel) {
    const action = {
      id: Date.now() + Math.random(),
      toolName,
      params,
      onConfirm,
      onCancel,
      timestamp: Date.now()
    };

    this.pendingActions.push(action);

    // If no notification is currently showing, show this one
    if (!this.currentNotification) {
      this.showNext();
    }

    return action.id;
  }

  // Show the next pending action
  showNext() {
    if (this.pendingActions.length === 0) {
      this.currentNotification = null;
      return;
    }

    const action = this.pendingActions[0];
    this.currentNotification = action;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'confirmation-notification';
    notification.style.cssText = `
      background: linear-gradient(135deg, rgba(0, 128, 128, 0.95) 0%, rgba(0, 80, 80, 0.95) 100%);
      border: 2px solid teal;
      border-radius: 12px;
      padding: 12px 16px;
      color: #9fffd6;
      font-family: 'Jost', sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(0, 255, 155, 0.3), inset 0 0 16px rgba(0, 255, 155, 0.1);
      pointer-events: auto;
      animation: slideInFromLeft 0.3s ease-out;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 500px;
    `;

    // Format action text
    const actionText = this.formatActionText(action.toolName, action.params);

    notification.innerHTML = `
      <div style="flex: 1;">
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 4px;">Action queued:</div>
        <div style="font-weight: 500;">${actionText}</div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="confirm-btn" style="
          background: rgba(0, 255, 155, 0.2);
          border: 1px solid #00ff9b;
          color: #00ff9b;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " title="Confirm">✓</button>
        <button class="cancel-btn" style="
          background: rgba(255, 80, 80, 0.2);
          border: 1px solid #ff5050;
          color: #ff5050;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        " title="Cancel">✕</button>
      </div>
    `;

    // Add hover effects
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFromLeft {
        from {
          transform: translateX(-100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutToLeft {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(-100%);
          opacity: 0;
        }
      }
      .confirmation-notification .confirm-btn:hover {
        background: rgba(0, 255, 155, 0.4) !important;
        box-shadow: 0 0 12px rgba(0, 255, 155, 0.5);
      }
      .confirmation-notification .cancel-btn:hover {
        background: rgba(255, 80, 80, 0.4) !important;
        box-shadow: 0 0 12px rgba(255, 80, 80, 0.5);
      }
    `;
    if (!document.getElementById('confirmation-ui-styles')) {
      style.id = 'confirmation-ui-styles';
      document.head.appendChild(style);
    }

    // Attach event listeners
    const confirmBtn = notification.querySelector('.confirm-btn');
    const cancelBtn = notification.querySelector('.cancel-btn');

    confirmBtn.addEventListener('click', () => {
      this.handleConfirm(action, notification);
    });

    cancelBtn.addEventListener('click', () => {
      this.handleCancel(action, notification);
    });

    // Add to container
    this.container.appendChild(notification);
  }

  // Handle confirmation
  async handleConfirm(action, notification) {
    // Animate out
    notification.style.animation = 'slideOutToLeft 0.3s ease-in';

    setTimeout(async () => {
      notification.remove();

      // Remove from queue
      this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);

      // Execute the callback
      if (action.onConfirm) {
        try {
          await action.onConfirm(action.params);
        } catch (error) {
          console.error('Error executing confirmed action:', error);
          this.showError(`Failed to execute ${action.toolName}: ${error.message}`);
        }
      }

      // Show next action if any
      this.showNext();
    }, 300);
  }

  // Handle cancellation
  handleCancel(action, notification) {
    // Animate out
    notification.style.animation = 'slideOutToLeft 0.3s ease-in';

    setTimeout(() => {
      notification.remove();

      // Remove from queue
      this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);

      // Execute cancel callback
      if (action.onCancel) {
        action.onCancel();
      }

      // Show next action if any
      this.showNext();
    }, 300);
  }

  // Format action text based on tool and params
  formatActionText(toolName, params) {
    switch (toolName) {
      case 'createPanel':
        return `Create ${params.type} panel "${params.title}"`;
      case 'openPanel':
        return `Open panel "${params.panel_title}"`;
      case 'startTimer':
        return `Start ${params.duration_minutes}min timer${params.title ? ` "${params.title}"` : ''}`;
      case 'tilePanels':
        return `Tile all panels`;
      case 'createSingleCalendarEvent':
        return `Create event "${params.title}" on ${params.date}${params.time ? ` at ${params.time}` : ''}`;
      case 'updateCalendarEvent':
        return `Move "${params.event_title}" to ${params.new_date}`;
      case 'createRecurringCalendarEvent':
        return `Create recurring event "${params.title}"`;
      case 'createPrioritizedTaskList':
        return `Create task list (${params.criteria})`;
      default:
        return `Execute ${toolName}`;
    }
  }

  // Show error message
  showError(message) {
    const error = document.createElement('div');
    error.style.cssText = `
      background: linear-gradient(135deg, rgba(255, 80, 80, 0.95) 0%, rgba(200, 40, 40, 0.95) 100%);
      border: 2px solid #ff5050;
      border-radius: 12px;
      padding: 12px 16px;
      color: #ffcccc;
      font-family: 'Jost', sans-serif;
      font-size: 14px;
      box-shadow: 0 8px 32px rgba(255, 80, 80, 0.3);
      pointer-events: auto;
      animation: slideInFromLeft 0.3s ease-out;
      margin-bottom: 12px;
    `;
    error.textContent = message;

    this.container.appendChild(error);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      error.style.animation = 'slideOutToLeft 0.3s ease-in';
      setTimeout(() => error.remove(), 300);
    }, 5000);
  }

  // Show success message
  showSuccess(message) {
    const success = document.createElement('div');
    success.style.cssText = `
      background: linear-gradient(135deg, rgba(0, 255, 155, 0.95) 0%, rgba(0, 200, 120, 0.95) 100%);
      border: 2px solid #00ff9b;
      border-radius: 12px;
      padding: 12px 16px;
      color: #003322;
      font-family: 'Jost', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 255, 155, 0.3);
      pointer-events: auto;
      animation: slideInFromLeft 0.3s ease-out;
      margin-bottom: 12px;
    `;
    success.textContent = message;

    this.container.appendChild(success);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      success.style.animation = 'slideOutToLeft 0.3s ease-in';
      setTimeout(() => success.remove(), 300);
    }, 3000);
  }

  // Clear all pending actions
  clearAll() {
    this.pendingActions = [];
    this.currentNotification = null;
    this.container.innerHTML = '';
  }
}

// Export to global scope
window.ConfirmationUI = ConfirmationUI;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.confirmationUI) {
      window.confirmationUI = new ConfirmationUI();
    }
  });
} else {
  // DOM is already ready
  if (!window.confirmationUI) {
    window.confirmationUI = new ConfirmationUI();
  }
}
