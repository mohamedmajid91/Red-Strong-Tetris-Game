active' : ''}" 
                                    data-shape="${shape.id}"
                                    title="${shape.name}">
                                <span class="shape-icon">${shape.icon}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Themes by Category -->
                ${categories.map(cat => `
                    <div class="themes-section">
                        <h4>${cat.icon} ${cat.name}</h4>
                        <div class="themes-row">
                            ${this.getByCategory(cat.id).map(theme => `
                                <button class="theme-btn ${theme.id === this.currentTheme ? 'active' : ''} ${theme.unlocked ? '' : 'locked'}"
                                        data-theme="${theme.id}">
                                    <div class="theme-preview" style="background: ${theme.background}">
                                        <div class="theme-colors">
                                            ${Object.values(theme.colors).slice(0, 4).map(c => 
                                                `<span style="background:${c}"></span>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <div class="theme-label">
                                        <span class="theme-icon">${theme.icon}</span>
                                        <span class="theme-name">${theme.name}</span>
                                        ${!theme.unlocked ? `<span class="theme-price">🔒${theme.price}</span>` : ''}
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
                
                <div class="themes-points">
                    💰 نقاطك: <strong>${playerPoints}</strong>
                </div>
            </div>
        `;
        
        // Add event listeners
        container.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shapeId = btn.dataset.shape;
                this.setBlockShape(shapeId);
                container.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (onSelect) onSelect('shape', shapeId);
            });
        });
        
        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeId = btn.dataset.theme;
                const theme = this.themes[themeId];
                
                if (theme.unlocked) {
                    this.setTheme(themeId);
                    container.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (onSelect) onSelect('theme', themeId);
                } else {
                    // Try to unlock
                    if (playerPoints >= theme.price) {
                        if (confirm(`فتح ${theme.name} بـ ${theme.price} نقطة؟`)) {
                            const result = this.unlockTheme(themeId, playerPoints);
                            if (result.success) {
                                btn.classList.remove('locked');
                                this.setTheme(themeId);
                                if (onSelect) onSelect('unlock', themeId, result.spent);
                            }
                        }
                    } else {
                        alert(`تحتاج ${theme.price - playerPoints} نقطة إضافية`);
                    }
                }
            });
        });
    }
}

// Global instance
window.themesManager = new ThemesManager();

// Apply on load
document.addEventListener('DOMContentLoaded', () => {
    window.themesManager.apply();
});
