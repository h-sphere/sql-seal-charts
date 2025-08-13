import { App, PluginSettingTab, Setting } from "obsidian";
import SQLSealCharts from "./main";
import { GlobalChartConfig } from "./settings";
import * as JSON5 from "json5";

export class SQLSealChartsSettingTab extends PluginSettingTab {
    plugin: SQLSealCharts;
    private currentView: 'list' | 'edit' = 'list';
    private editingIndex: number = -1;

    constructor(app: App, plugin: SQLSealCharts) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'SQLSeal Charts Settings' });

        if (this.currentView === 'list') {
            this.displayConfigList();
        } else if (this.currentView === 'edit') {
            this.displayConfigEditor();
        }
    }

    private displayConfigList(): void {
        const { containerEl } = this;

        containerEl.createEl('h3', { text: 'Global Chart Configurations' });
        
        const descriptionContainer = containerEl.createDiv('sqlseal-description-container');
        descriptionContainer.createEl('p', {
            text: 'Define reusable JSON5 configurations that can be accessed as variables in your charts.',
            cls: 'setting-item-description'
        });
        
        const exampleContainer = descriptionContainer.createDiv('sqlseal-example-container');
        exampleContainer.createEl('strong', { text: 'Example Usage:' });
        exampleContainer.createEl('br');
        exampleContainer.createEl('code', { 
            text: '1. Create config named "theme" with: {backgroundColor: "#1a1a1a"}',
            cls: 'sqlseal-example-code'
        });
        exampleContainer.createEl('br');
        exampleContainer.createEl('code', { 
            text: '2. Use in charts: {...theme, title: {text: "My Chart"}}',
            cls: 'sqlseal-example-code'
        });
        
        const featuresContainer = descriptionContainer.createDiv('sqlseal-features-container');
        featuresContainer.createEl('br');
        featuresContainer.createEl('small', {
            text: '✨ Supports JSON5: unquoted keys, single quotes, trailing commas, and comments',
            cls: 'sqlseal-feature-text'
        });


        // Add new configuration button
        new Setting(containerEl)
            .setName('Add New Configuration')
            .setDesc('Create a new global configuration')
            .addButton(button => {
                button
                    .setButtonText('Add Configuration')
                    .setCta()
                    .onClick(() => {
                        this.editingIndex = -1; // -1 means new config
                        this.currentView = 'edit';
                        this.display();
                    });
            });

        // Create table
        const tableContainer = containerEl.createDiv('sqlseal-config-table-container');
        const table = tableContainer.createEl('table', { cls: 'sqlseal-config-table' });
        
        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Name' });
        headerRow.createEl('th', { text: 'Preview' });
        headerRow.createEl('th', { text: 'Actions' });

        // Table body
        const tbody = table.createEl('tbody');
        
        if (this.plugin.settings.globalConfigs.length === 0) {
            const emptyRow = tbody.createEl('tr');
            const emptyCell = emptyRow.createEl('td', { 
                attr: { colspan: '3' },
                cls: 'sqlseal-empty-state',
                text: 'No configurations found. Click "Add Configuration" to create one.'
            });
        } else {
            this.plugin.settings.globalConfigs.forEach((config, index) => {
                this.createConfigRow(tbody, config, index);
            });
        }
    }

    private createConfigRow(tbody: HTMLTableSectionElement, config: GlobalChartConfig, index: number): void {
        const row = tbody.createEl('tr');
        
        // Name column
        const nameCell = row.createEl('td');
        nameCell.createEl('span', { 
            text: config.name,
            cls: 'sqlseal-config-name'
        });

        // Preview column
        const previewCell = row.createEl('td');
        const previewText = this.getConfigPreview(config.config);
        previewCell.createEl('code', {
            text: previewText,
            cls: 'sqlseal-config-preview'
        });

        // Actions column
        const actionsCell = row.createEl('td', { cls: 'sqlseal-config-actions' });
        
        const editButton = actionsCell.createEl('button', {
            text: 'Edit',
            cls: 'mod-cta sqlseal-action-button'
        });
        editButton.addEventListener('click', () => {
            this.editingIndex = index;
            this.currentView = 'edit';
            this.display();
        });

        const deleteButton = actionsCell.createEl('button', {
            text: 'Delete',
            cls: 'mod-warning sqlseal-action-button'
        });
        deleteButton.addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete the configuration "${config.name}"?`)) {
                this.plugin.settings.globalConfigs.splice(index, 1);
                await this.plugin.saveSettings();
                this.display();
            }
        });
    }

    private displayConfigEditor(): void {
        const { containerEl } = this;
        
        const isNewConfig = this.editingIndex === -1;
        const originalConfig = isNewConfig 
            ? { name: `config${this.plugin.settings.globalConfigs.length + 1}`, config: '{\n  \n}' }
            : this.plugin.settings.globalConfigs[this.editingIndex];
            
        // Create a working copy to avoid modifying the original until save
        const config = {
            name: originalConfig.name,
            config: originalConfig.config
        };
            
        console.log('Editor debug - isNewConfig:', isNewConfig);
        console.log('Editor debug - editingIndex:', this.editingIndex);
        console.log('Editor debug - originalConfig:', originalConfig);
        console.log('Editor debug - working config:', config);
        console.log('Editor debug - all configs:', this.plugin.settings.globalConfigs);

        // Header with back button
        const headerContainer = containerEl.createDiv('sqlseal-editor-header');
        const backButton = headerContainer.createEl('button', {
            text: '← Back to List',
            cls: 'sqlseal-back-button'
        });
        backButton.addEventListener('click', () => {
            this.currentView = 'list';
            this.display();
        });

        headerContainer.createEl('h3', { 
            text: isNewConfig ? 'Add New Configuration' : `Edit Configuration: ${config.name}`
        });

        // Name input
        new Setting(containerEl)
            .setName('Configuration Name')
            .setDesc('A unique name to identify this configuration')
            .addText(text => {
                text.setValue(config.name);
                text.onChange(async (value) => {
                    config.name = value;
                    // Don't auto-save for existing configs since we're using a working copy
                });
                // Save on blur
                text.inputEl.addEventListener('blur', async () => {
                    const newValue = text.getValue();
                    config.name = newValue;
                    // Don't auto-save for existing configs since we're using a working copy
                });
            });

        // JSON editor
        const jsonContainer = containerEl.createDiv('sqlseal-json-editor-container');
        const labelContainer = jsonContainer.createDiv('sqlseal-json-label-container');
        labelContainer.createEl('label', { 
            text: 'JSON5 Configuration:',
            cls: 'sqlseal-json-label'
        });
        labelContainer.createEl('small', {
            text: 'Supports unquoted keys, single quotes, trailing commas, and // comments',
            cls: 'sqlseal-json-help'
        });
        
        const jsonTextarea = jsonContainer.createEl('textarea', {
            placeholder: `{
  type: 'pie',
  radius: '70%',
  emphasis: {
    itemStyle: {
      shadowBlur: 10
    }
  }
}`,
            cls: 'sqlseal-json-textarea'
        });
        
        // Set the value separately to ensure it loads properly
        console.log('Setting textarea value to:', config.config);
        jsonTextarea.value = config.config || '';
        
        // Also set it after a short delay to ensure DOM is ready
        requestAnimationFrame(() => {
            jsonTextarea.value = config.config || '';
            console.log('Textarea value after setting:', jsonTextarea.value);
        });

        // Auto-save on blur and input with debounce
        let saveTimeout: NodeJS.Timeout;
        const saveConfig = async () => {
            try {
                // Use JSON5 for more flexible parsing
                JSON5.parse(jsonTextarea.value);
                jsonTextarea.classList.remove('error');
                jsonTextarea.title = '';
                config.config = jsonTextarea.value;
                // Don't auto-save since we're using a working copy
            } catch (e) {
                jsonTextarea.classList.add('error');
                jsonTextarea.title = `Invalid JSON5: ${(e as Error).message}`;
            }
        };

        jsonTextarea.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveConfig, 500); // Debounce for 500ms
        });

        jsonTextarea.addEventListener('blur', saveConfig);

        // Helper buttons
        const helperContainer = containerEl.createDiv('sqlseal-helper-buttons');
        
        const formatButton = helperContainer.createEl('button', {
            text: 'Format JSON',
            cls: 'mod-cta'
        });
        
        formatButton.addEventListener('click', () => {
            try {
                // Parse with JSON5 (allows unquoted keys, trailing commas, etc.)
                const parsed = JSON5.parse(jsonTextarea.value);
                // Format as standard JSON for consistency
                const formatted = JSON.stringify(parsed, null, 2);
                jsonTextarea.value = formatted;
                config.config = formatted;
                jsonTextarea.classList.remove('error');
                jsonTextarea.title = '';
                
                // Show success feedback
                formatButton.textContent = '✓ Formatted';
                formatButton.style.backgroundColor = '#4caf50';
                setTimeout(() => {
                    formatButton.textContent = 'Format JSON';
                    formatButton.style.backgroundColor = '';
                }, 1500);
            } catch (e) {
                formatButton.textContent = '✗ Invalid JSON5';
                formatButton.style.backgroundColor = '#ff6b6b';
                setTimeout(() => {
                    formatButton.textContent = 'Format JSON';
                    formatButton.style.backgroundColor = '';
                }, 2000);
            }
        });

        // Action buttons
        const buttonContainer = containerEl.createDiv('sqlseal-editor-buttons');
        
        const saveButton = buttonContainer.createEl('button', {
            text: isNewConfig ? 'Create Configuration' : 'Save Changes',
            cls: 'mod-cta'
        });
        
        saveButton.addEventListener('click', async () => {
            try {
                JSON5.parse(config.config);
                
                if (isNewConfig) {
                    this.plugin.settings.globalConfigs.push(config);
                } else {
                    // Update the original config with our working copy
                    this.plugin.settings.globalConfigs[this.editingIndex].name = config.name;
                    this.plugin.settings.globalConfigs[this.editingIndex].config = config.config;
                }
                
                await this.plugin.saveSettings();
                this.currentView = 'list';
                this.display();
            } catch (e) {
                alert(`Invalid JSON5: ${(e as Error).message}`);
            }
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: 'mod-warning'
        });
        
        cancelButton.addEventListener('click', () => {
            this.currentView = 'list';
            this.display();
        });
    }

    private getConfigPreview(configString: string): string {
        try {
            const parsed = JSON5.parse(configString);
            const preview = JSON.stringify(parsed);
            return preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
        } catch (e) {
            return 'Invalid JSON5';
        }
    }
}