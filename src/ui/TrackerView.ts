import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Topic, getToday, isOverdue } from '../data';
import ScientificRevisionPlugin from '../main';

export const VIEW_TYPE_TRACKER = "scientific-revision-tracker";

export class TrackerView extends ItemView {
  plugin: ScientificRevisionPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ScientificRevisionPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return VIEW_TYPE_TRACKER;
  }

  getDisplayText() {
    return "Study Tracker";
  }

  async onOpen() {
    this.render();
  }

  async onClose() {
    // Cleanup if necessary
  }

  public render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const today = getToday();
    const topics = this.plugin.pluginData.topics;

    // Filter data in-memory based on PRD scalability rules
    const overdueTopics = topics.filter(t => t.state === 'studied' && isOverdue(t.targetDate, today));
    const toStudyToday = topics.filter(t => t.state === 'planned' && t.targetDate === today);
    const toReviseToday = topics.filter(t => t.state === 'studied' && t.targetDate === today);

    // Create UI Structure
    const header = container.createEl("h2", { text: "Study & Revision Planner" });
    
    // 1. Input Field
    const inputContainer = container.createDiv({ cls: "tracker-input-container" });
    const input = inputContainer.createEl("input", { type: "text", placeholder: "Log a new topic (e.g. [[Physics]])" });
    const addButton = inputContainer.createEl("button", { text: "Add for Today" });

    addButton.addEventListener("click", async () => {
      if (input.value.trim()) {
        const newTopic: Topic = {
          id: Date.now().toString(),
          name: input.value.trim(),
          state: 'planned',
          targetDate: today,
          interval: 0,
          easeFactor: 2.5
        };
        this.plugin.pluginData.topics.push(newTopic);
        await this.plugin.savePluginData();
        input.value = '';
        this.render(); // Re-render efficiently
      }
    });

    // 2. Overdue Section (Red highlight handled by CSS cls)
    if (overdueTopics.length > 0) {
      const overdueContainer = container.createDiv({ cls: "tracker-section overdue-section" });
      overdueContainer.createEl("h3", { text: "⚠️ Overdue Revisions" });
      this.renderTopicList(overdueContainer, overdueTopics);
    }

    // 3. To Revise Today
    const reviseContainer = container.createDiv({ cls: "tracker-section" });
    reviseContainer.createEl("h3", { text: "🔄 To Revise Today" });
    if (toReviseToday.length === 0) {
      reviseContainer.createEl("p", { text: "No revisions scheduled for today." });
    } else {
      this.renderTopicList(reviseContainer, toReviseToday);
    }

    // 4. To Study Today (Planned tasks)
    const studyContainer = container.createDiv({ cls: "tracker-section" });
    studyContainer.createEl("h3", { text: "📚 To Study Today" });
    if (toStudyToday.length === 0) {
      studyContainer.createEl("p", { text: "No new topics planned for today." });
    } else {
      this.renderTopicList(studyContainer, toStudyToday);
    }
  }

  private renderTopicList(container: HTMLElement, topics: Topic[]) {
    const list = container.createEl("ul");
    for (const topic of topics) {
      const li = list.createEl("li", { cls: "topic-item" });
      li.createSpan({ text: topic.name, cls: "topic-name" });

      const actions = li.createDiv({ cls: "topic-actions" });

      if (topic.state === 'planned') {
        // Study complete button
        const btn = actions.createEl("button", { text: "Done" });
        btn.addEventListener("click", async () => {
          await this.plugin.handleStudyComplete(topic.id);
          this.render();
        });
      } else {
        // Grade buttons for studied topics (1: Hard, 4: Good, 5: Easy)
        const hardBtn = actions.createEl("button", { text: "Hard (1)", cls: "btn-hard" });
        const goodBtn = actions.createEl("button", { text: "Good (4)", cls: "btn-good" });
        const easyBtn = actions.createEl("button", { text: "Easy (5)", cls: "btn-easy" });

        hardBtn.addEventListener("click", () => this.handleGrade(topic.id, 1));
        goodBtn.addEventListener("click", () => this.handleGrade(topic.id, 4));
        easyBtn.addEventListener("click", () => this.handleGrade(topic.id, 5));
      }
    }
  }

  private async handleGrade(topicId: string, quality: number) {
    await this.plugin.handleRevisionGrade(topicId, quality);
    this.render();
  }
}
