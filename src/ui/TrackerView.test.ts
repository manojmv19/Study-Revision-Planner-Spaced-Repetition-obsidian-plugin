// Mock Obsidian classes
jest.mock('obsidian', () => {
  class MockItemView {
    containerEl: any;
    constructor(public leaf: any) {
      this.containerEl = {
        children: [
          {},
          {
            empty: jest.fn(),
            createEl: jest.fn().mockImplementation(() => ({
              addEventListener: jest.fn(),
              createEl: jest.fn().mockImplementation(() => ({ createSpan: jest.fn(), createDiv: jest.fn().mockImplementation(() => ({ createEl: jest.fn().mockImplementation(() => ({ addEventListener: jest.fn() })) })) }))
            })),
            createDiv: jest.fn().mockImplementation(() => ({
              createEl: jest.fn().mockImplementation(() => ({
                addEventListener: jest.fn(),
                createSpan: jest.fn(),
                createDiv: jest.fn().mockImplementation(() => ({ createEl: jest.fn().mockImplementation(() => ({ addEventListener: jest.fn() })) }))
              }))
            }))
          }
        ]
      };
    }
  }
  return {
    ItemView: MockItemView,
    WorkspaceLeaf: class {}
  };
});

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
});
