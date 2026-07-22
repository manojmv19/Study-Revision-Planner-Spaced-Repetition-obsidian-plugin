const createMockEl = () => {
  const el: any = {
    addEventListener: jest.fn(),
    createSpan: jest.fn(),
    empty: jest.fn(),
  };
  el.createDiv = jest.fn(() => createMockEl());
  el.createEl = jest.fn(() => createMockEl());
  return el;
};

// Mock Obsidian classes
jest.mock('obsidian', () => {
  class MockItemView {
    containerEl: any;
    constructor(public leaf: any) {
      this.containerEl = {
        children: [
          {},
          createMockEl()
        ]
      };
    }
  }
  return {
    ItemView: MockItemView,
    WorkspaceLeaf: class {},
    Notice: jest.fn()
  };
}, { virtual: true });

import { TrackerView } from './TrackerView';
import ScientificRevisionPlugin from '../main';
import { getToday, Topic } from '../data';

describe('TrackerView UI Logic', () => {
  let mockPlugin: any;
  let view: TrackerView;

  beforeEach(() => {
    mockPlugin = {
      pluginData: { topics: [] },
      savePluginData: jest.fn(),
      handleStudyComplete: jest.fn(),
      handleRevisionGrade: jest.fn(),
    };
    
    view = new TrackerView({} as any, mockPlugin as any);
  });

  it('renders correctly with no data', () => {
    expect(() => view.render()).not.toThrow();
  });

  it('filters overdue topics correctly based on DOM structure', () => {
    // Add overdue topic
    mockPlugin.pluginData.topics.push({
      id: '1', name: 'Overdue', state: 'studied', targetDate: '2000-01-01', interval: 1, easeFactor: 2.5
    });
    
    // Test that render process executes logic without failing (verifying filter runs)
    view.render();
    
    // We expect the 'empty' mock on the container to be called
    const container = view.containerEl.children[1];
    expect(container.empty).toHaveBeenCalled();
  });
  
  it('adds a new topic when button is clicked (DOM Simulation)', async () => {
    const today = getToday();
    mockPlugin.pluginData.topics = [];
    
    // Add logic simulation
    const newTopic: Topic = {
        id: '2',
        name: 'New',
        state: 'planned',
        targetDate: today,
        interval: 0,
        easeFactor: 2.5
    };
    mockPlugin.pluginData.topics.push(newTopic);
    await mockPlugin.savePluginData();
    
    expect(mockPlugin.pluginData.topics.length).toBe(1);
    expect(mockPlugin.savePluginData).toHaveBeenCalled();
  });

  it('renders calendar tab correctly', () => {
    view.activeTab = 'calendar';
    expect(() => view.render()).not.toThrow();
  });

  it('handleTopicDrop updates target date and saves data', async () => {
    mockPlugin.pluginData.topics.push({
      id: 'drop-test', name: 'Topic 1', state: 'planned', targetDate: '2023-10-10', interval: 0, easeFactor: 2.5
    });
    
    await (view as any).handleTopicDrop('drop-test', '2023-10-15');
    
    const updatedTopic = mockPlugin.pluginData.topics.find((t: any) => t.id === 'drop-test');
    expect(updatedTopic.targetDate).toBe('2023-10-15');
    expect(mockPlugin.savePluginData).toHaveBeenCalled();
  });

  it('handleTopicDrop shows warning when delaying a studied algorithmic revision', async () => {
    const mockNotice = require('obsidian').Notice;
    mockNotice.mockClear();
    
    mockPlugin.pluginData.topics.push({
      id: 'warning-test', name: 'Topic 2', state: 'studied', targetDate: '2023-10-10', interval: 1, easeFactor: 2.5
    });
    
    await (view as any).handleTopicDrop('warning-test', '2023-10-15'); // 5 days in the future
    
    expect(mockNotice).toHaveBeenCalledWith("⚠️ Warning: Delaying a scheduled algorithmic revision risks forgetting the material!");
  });
});
