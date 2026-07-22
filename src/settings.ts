import { App, PluginSettingTab, Setting } from 'obsidian';
import ScientificRevisionPlugin from './main';

export class TrackerSettingTab extends PluginSettingTab {
  plugin: ScientificRevisionPlugin;

  constructor(app: App, plugin: ScientificRevisionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Spaced Repetition Settings' });

    new Setting(containerEl)
      .setName('Algorithm Type')
      .setDesc('Choose between the dynamic SM-2 algorithm (Anki-style) or a fixed static schedule.')
      .addDropdown(dropdown => dropdown
        .addOption('SM-2', 'Algorithmic (SM-2)')
        .addOption('STATIC', 'Fixed Schedule (Static)')
        .setValue(this.plugin.pluginData.settings.algorithmType)
        .onChange(async (value: 'SM-2' | 'STATIC') => {
          this.plugin.pluginData.settings.algorithmType = value;
          await this.plugin.savePluginData();
          this.display(); // re-render to hide/show static intervals setting
        }));

    if (this.plugin.pluginData.settings.algorithmType === 'STATIC') {
      new Setting(containerEl)
        .setName('Static Intervals (in days)')
        .setDesc('Comma-separated list of days for your revision schedule (e.g., 1, 7, 15, 30).')
        .addText(text => text
          .setPlaceholder('1, 7, 15, 30')
          .setValue(this.plugin.pluginData.settings.staticIntervals.join(', '))
          .onChange(async (value) => {
            const parsed = value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
            if (parsed.length > 0) {
              this.plugin.pluginData.settings.staticIntervals = parsed;
              await this.plugin.savePluginData();
            }
          }));
    }
  }
}
