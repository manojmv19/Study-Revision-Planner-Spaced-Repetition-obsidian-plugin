import { Plugin, WorkspaceLeaf } from 'obsidian';
import { PluginData, DEFAULT_DATA, getToday, addDays } from './data';
import { calculateNextInterval } from './algorithm';
import { TrackerView, VIEW_TYPE_TRACKER } from './ui/TrackerView';

export default class ScientificRevisionPlugin extends Plugin {
  pluginData: PluginData;

  async onload() {
    console.log('Loading Scientific Revision Plugin');
    await this.loadPluginData();

    this.registerView(
      VIEW_TYPE_TRACKER,
      (leaf) => new TrackerView(leaf, this)
    );

    this.addRibbonIcon('calendar-check', 'Study Tracker', () => {
      this.activateView();
    });
  }

  async onunload() {
    console.log('Unloading Scientific Revision Plugin');
  }

  async activateView() {
    const { workspace } = this.app;
    
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRACKER);
    
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE_TRACKER, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  async loadPluginData() {
    try {
      const loadedData = await this.loadData();
      this.pluginData = Object.assign({}, DEFAULT_DATA, loadedData);
    } catch (error) {
      console.error("Failed to load plugin data", error);
      this.pluginData = Object.assign({}, DEFAULT_DATA);
    }
  }

  async savePluginData() {
    try {
      await this.saveData(this.pluginData);
    } catch (error) {
      console.error("Failed to save plugin data", error);
    }
  }

  async handleStudyComplete(topicId: string) {
    const topic = this.pluginData.topics.find(t => t.id === topicId);
    if (topic) {
      topic.state = 'studied';
      topic.interval = 1;
      topic.easeFactor = 2.5;
      topic.lastReviewDate = getToday();
      topic.targetDate = addDays(getToday(), 1); // Scheduled for tomorrow
      await this.savePluginData();
    }
  }

  async handleRevisionGrade(topicId: string, quality: number) {
    const topic = this.pluginData.topics.find(t => t.id === topicId);
    if (topic) {
      const result = calculateNextInterval(quality, topic.interval, topic.easeFactor);
      topic.interval = result.interval;
      topic.easeFactor = result.easeFactor;
      topic.lastReviewDate = getToday();
      topic.targetDate = addDays(getToday(), topic.interval);
      await this.savePluginData();
    }
  }
}
