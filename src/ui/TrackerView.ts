import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { Topic, getToday, isOverdue, addDays } from '../data';
import ScientificRevisionPlugin from '../main';

export const VIEW_TYPE_TRACKER = "scientific-revision-tracker";

export class TrackerView extends ItemView {
  plugin: ScientificRevisionPlugin;
  activeTab: 'dashboard' | 'calendar' = 'dashboard';
  currentMonthOffset: number = 0;

  constructor(leaf: WorkspaceLeaf, plugin: ScientificRevisionPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_TRACKER; }
  getDisplayText() { return "Study Tracker"; }
  async onOpen() { this.render(); }
  async onClose() {}

  public render() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const tabsContainer = container.createDiv({ cls: "tracker-tabs" });
    const dashTab = tabsContainer.createDiv({ cls: `tracker-tab ${this.activeTab === 'dashboard' ? 'active' : ''}`, text: "Dashboard" });
    const calTab = tabsContainer.createDiv({ cls: `tracker-tab ${this.activeTab === 'calendar' ? 'active' : ''}`, text: "Calendar" });

    dashTab.addEventListener("click", () => { this.activeTab = 'dashboard'; this.render(); });
    calTab.addEventListener("click", () => { this.activeTab = 'calendar'; this.render(); });

    const contentContainer = container.createDiv({ cls: "tracker-content" });

    if (this.activeTab === 'dashboard') {
      this.renderDashboard(contentContainer);
    } else {
      this.renderCalendar(contentContainer);
    }
  }

  private renderDashboard(container: HTMLElement) {
    const today = getToday();
    const topics = this.plugin.pluginData.topics;

    // Algorithmic revisions that were missed (Disrupts the math!)
    const overdueTopics = topics.filter(t => t.state === 'studied' && isOverdue(t.targetDate, today));
    
    // Planned tasks stay in the inbox until you study them, even if created in the past
    const toStudyToday = topics.filter(t => t.state === 'planned' && t.targetDate <= today);
    
    // Algorithmic revisions scheduled exactly for today
    const toReviseToday = topics.filter(t => t.state === 'studied' && t.targetDate === today);

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
        this.render();
      }
    });

    if (overdueTopics.length > 0) {
      const overdueDetails = container.createEl("details", { cls: "tracker-section overdue-section" });
      overdueDetails.setAttribute("open", "");
      overdueDetails.createEl("summary", { text: `⚠️ Overdue Revisions [${overdueTopics.length}]` });
      this.renderTopicList(overdueDetails, overdueTopics);
    }

    const reviseDetails = container.createEl("details", { cls: "tracker-section" });
    reviseDetails.setAttribute("open", "");
    reviseDetails.createEl("summary", { text: `🔄 To Revise Today [${toReviseToday.length}]` });
    if (toReviseToday.length === 0) {
      reviseDetails.createEl("p", { text: "No revisions scheduled for today." });
    } else {
      this.renderTopicList(reviseDetails, toReviseToday);
    }

    const studyDetails = container.createEl("details", { cls: "tracker-section" });
    // Collapsed by default as discussed
    studyDetails.createEl("summary", { text: `📚 To Study Today [${toStudyToday.length}]` });
    if (toStudyToday.length === 0) {
      studyDetails.createEl("p", { text: "No new topics planned for today." });
    } else {
      this.renderTopicList(studyDetails, toStudyToday);
    }
    
    // Upcoming Revisions (Next 7 days)
    const next7Days = addDays(today, 7);
    const upcomingTopics = topics.filter(t => t.state === 'studied' && t.targetDate > today && t.targetDate <= next7Days);
    upcomingTopics.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
    
    if (upcomingTopics.length > 0) {
      const upcomingDetails = container.createEl("details", { cls: "tracker-section" });
      upcomingDetails.createEl("summary", { text: `🗓️ Upcoming Revisions (Next 7 Days) [${upcomingTopics.length}]` });
      this.renderTopicList(upcomingDetails, upcomingTopics, true);
    }
  }

  private renderTopicName(container: HTMLElement, topicName: string, cls: string = "topic-name") {
    const linkMatch = topicName.match(/^\[\[(.*?)\]\]$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkEl = container.createEl("a", { cls: `internal-link ${cls}`, text: linkText, href: "#" });
      linkEl.addEventListener("click", (e) => {
        e.preventDefault();
        this.plugin.app.workspace.openLinkText(linkText, '', true);
      });
    } else {
      container.createSpan({ text: topicName, cls });
    }
  }

  private renderTopicList(container: HTMLElement, topics: Topic[], isReadOnly: boolean = false) {
    const list = container.createEl("ul");
    for (const topic of topics) {
      const li = list.createEl("li", { cls: "topic-item" });
      
      const nameContainer = li.createDiv({ cls: "topic-name-container" });
      this.renderTopicName(nameContainer, topic.name);

      if (isReadOnly) {
        li.createSpan({ text: `Due: ${topic.targetDate}`, cls: "topic-due-date" });
        continue;
      }

      const actions = li.createDiv({ cls: "topic-actions" });

      const editBtn = actions.createEl("button", { text: "✏️", cls: "btn-edit", title: "Edit Topic" });
      editBtn.addEventListener("click", () => {
        nameContainer.empty();
        const input = nameContainer.createEl("input", { type: "text", value: topic.name, cls: "topic-edit-input" });
        input.focus();
        
        const saveEdit = async () => {
          const newVal = input.value.trim();
          if (newVal && newVal !== topic.name) {
            topic.name = newVal;
            await this.plugin.savePluginData();
          }
          this.render();
        };
        
        input.addEventListener("blur", saveEdit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            input.blur();
          } else if (e.key === "Escape") {
            this.render();
          }
        });
      });

      if (topic.state === 'planned') {
        const btn = actions.createEl("button", { text: "Done" });
        btn.addEventListener("click", async () => {
          await this.plugin.handleStudyComplete(topic.id);
          this.render();
        });
      } else {
        const hardBtn = actions.createEl("button", { text: "Hard (1)", cls: "btn-hard" });
        const goodBtn = actions.createEl("button", { text: "Good (4)", cls: "btn-good" });
        const easyBtn = actions.createEl("button", { text: "Easy (5)", cls: "btn-easy" });

        hardBtn.addEventListener("click", () => this.handleGrade(topic.id, 1));
        goodBtn.addEventListener("click", () => this.handleGrade(topic.id, 4));
        easyBtn.addEventListener("click", () => this.handleGrade(topic.id, 5));
      }
    }
  }

  private renderCalendar(container: HTMLElement) {
    const today = new Date();
    const displayDate = new Date(today.getFullYear(), today.getMonth() + this.currentMonthOffset, 1);
    
    const header = container.createDiv({ cls: "calendar-header" });
    const prevBtn = header.createEl("button", { text: "◀" });
    const title = header.createEl("strong", { text: displayDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) });
    const nextBtn = header.createEl("button", { text: "▶" });

    prevBtn.addEventListener("click", () => { this.currentMonthOffset--; this.render(); });
    nextBtn.addEventListener("click", () => { this.currentMonthOffset++; this.render(); });

    const grid = container.createDiv({ cls: "calendar-grid" });
    
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      grid.createDiv({ cls: "calendar-day-header", text: day });
    });

    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = displayDate.getDay();

    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.createDiv({ cls: "calendar-cell empty" });
    }

    const todayStr = getToday();

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
      const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
      
      const cell = grid.createDiv({ cls: `calendar-cell ${dateStr === todayStr ? 'today' : ''}` });
      cell.createDiv({ cls: "calendar-date-number", text: String(day) });

      cell.addEventListener("dragover", (e) => {
        e.preventDefault();
        cell.addClass("drag-over");
      });
      cell.addEventListener("dragleave", () => {
        cell.removeClass("drag-over");
      });
      cell.addEventListener("drop", async (e) => {
        e.preventDefault();
        cell.removeClass("drag-over");
        const topicId = e.dataTransfer?.getData("text/plain");
        if (topicId) {
          await this.handleTopicDrop(topicId, dateStr);
        }
      });

      const dayTopics = this.plugin.pluginData.topics.filter(t => t.targetDate === dateStr);
      for (const topic of dayTopics) {
        const topicEl = cell.createDiv({ cls: `calendar-topic-item ${topic.state}` });
        this.renderTopicName(topicEl, topic.name, "");
        
        topicEl.setAttr("draggable", "true");
        topicEl.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("text/plain", topic.id);
          topicEl.addClass("dragging");
        });
        topicEl.addEventListener("dragend", () => {
          topicEl.removeClass("dragging");
        });
      }
    }
  }

  private async handleTopicDrop(topicId: string, newDate: string) {
    const topic = this.plugin.pluginData.topics.find(t => t.id === topicId);
    if (!topic || topic.targetDate === newDate) return;

    if (topic.state === 'studied' && newDate > topic.targetDate) {
      new Notice("⚠️ Warning: Delaying a scheduled algorithmic revision risks forgetting the material!");
    }

    topic.targetDate = newDate;
    await this.plugin.savePluginData();
    this.render();
  }

  private async handleGrade(topicId: string, quality: number) {
    await this.plugin.handleRevisionGrade(topicId, quality);
    this.render();
  }
}
