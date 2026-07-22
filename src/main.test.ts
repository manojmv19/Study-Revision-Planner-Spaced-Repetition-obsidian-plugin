import ScientificRevisionPlugin from './main';
import { DEFAULT_DATA } from './data';
import { App, PluginManifest } from 'obsidian';
import { TrackerView } from './ui/TrackerView';

// Mock Obsidian Plugin architecture
jest.mock('obsidian', () => {
  class MockPlugin {
    app: any;
    manifest: any;
    
    constructor(app: any, manifest: any) {
      this.app = app;
      this.manifest = manifest;
    }
    
    addRibbonIcon(icon: string, title: string, cb: Function) {
      (this as any).ribbonCb = cb;
    }
    
    registerView(type: string, cb: Function) {
      (this as any).viewCb = cb;
    }
    
    registerEvent(eventRef: any) {
      (this as any).eventRefs = (this as any).eventRefs || [];
      (this as any).eventRefs.push(eventRef);
    }
    
    async loadData() {
      return { topics: [{ id: '1', name: 'Test', state: 'planned', targetDate: '2023-01-01', interval: 0, easeFactor: 2.5 }] };
    }
    
    async saveData(data: any) {
      // Mock successful save
    }
    
    addSettingTab(tab: any) {
      // Mock addSettingTab
    }
  }

  class MockPluginSettingTab {
    app: any;
    plugin: any;
    containerEl = { empty: jest.fn(), createEl: jest.fn() };
    constructor(app: any, plugin: any) {
      this.app = app;
      this.plugin = plugin;
    }
    display() {}
  }

  return {
    Plugin: MockPlugin,
    ItemView: class {},
    WorkspaceLeaf: class {},
    Notice: class {},
    Setting: class {
      setName() { return this; }
      setDesc() { return this; }
      addDropdown() { return this; }
      addText() { return this; }
    },
    PluginSettingTab: MockPluginSettingTab,
    Platform: { isMobile: false }
  };
}, { virtual: true });

describe('ScientificRevisionPlugin Data Adapter', () => {
  let plugin: ScientificRevisionPlugin;
  let mockApp: App;
  let mockManifest: PluginManifest;

  beforeEach(() => {
    mockApp = {
      workspace: {
        getLeavesOfType: jest.fn(),
        getLeaf: jest.fn(),
        revealLeaf: jest.fn()
      },
      vault: {
        on: jest.fn((event, cb) => {
          return { event, cb };
        })
      }
    } as unknown as App;
    
    mockManifest = {
      id: 'study-revision-planner-spaced-repetition',
      dir: 'study-revision-planner-spaced-repetition',
      name: 'Study & Revision Planner (Spaced Repetition)',
      version: '1.0.0',
      minAppVersion: '0.15.0'
    } as PluginManifest;

    plugin = new ScientificRevisionPlugin(mockApp, mockManifest);
  });

  it('should load data via Obsidian adapter successfully', async () => {
    await plugin.loadPluginData();
    expect(plugin.pluginData.topics.length).toBe(1);
    expect(plugin.pluginData.topics[0].id).toBe('1');
  });

  it('should save data via Obsidian adapter successfully', async () => {
    await plugin.loadPluginData();
    
    const spy = jest.spyOn(plugin, 'saveData');
    plugin.pluginData.topics.push({ id: '2', name: 'New Topic', state: 'planned', targetDate: '2023-01-02', interval: 0, easeFactor: 2.5 });
    
    await plugin.savePluginData();
    expect(spy).toHaveBeenCalledWith(plugin.pluginData);
  });

  it('should fallback to DEFAULT_DATA if loadData is empty', async () => {
    jest.spyOn(plugin, 'loadData').mockResolvedValueOnce(null);
    await plugin.loadPluginData();
    expect(plugin.pluginData).toEqual(DEFAULT_DATA);
  });

  it('should fallback to DEFAULT_DATA if loadData throws an error', async () => {
    jest.spyOn(plugin, 'loadData').mockRejectedValueOnce(new Error('Load error'));
    await plugin.loadPluginData();
    expect(plugin.pluginData).toEqual(DEFAULT_DATA);
  });

  it('should handle savePluginData error gracefully', async () => {
    jest.spyOn(plugin, 'saveData').mockRejectedValueOnce(new Error('Save error'));
    await expect(plugin.savePluginData()).resolves.not.toThrow();
  });

  it('should handle handleStudyComplete', async () => {
    await plugin.loadPluginData();
    plugin.pluginData.topics = [{ id: 'test1', name: 'Topic', state: 'planned', targetDate: '2023-01-01', interval: 0, easeFactor: 2.5 }];
    const spy = jest.spyOn(plugin, 'savePluginData');
    
    await plugin.handleStudyComplete('test1');
    expect(spy).toHaveBeenCalled();
    const topic = plugin.pluginData.topics[0];
    expect(topic.state).toBe('studied');
    expect(topic.interval).toBe(1);
    expect(topic.easeFactor).toBe(2.5);
  });

  it('should handle handleRevisionGrade', async () => {
    await plugin.loadPluginData();
    plugin.pluginData.topics = [{ id: 'test2', name: 'Topic', state: 'studied', targetDate: '2023-01-01', interval: 1, easeFactor: 2.5 }];
    const spy = jest.spyOn(plugin, 'savePluginData');
    
    await plugin.handleRevisionGrade('test2', 4); // Good
    expect(spy).toHaveBeenCalled();
    const topic = plugin.pluginData.topics[0];
    expect(topic.interval).toBeGreaterThan(1);
  });

  it('should load and unload without errors', async () => {
    await expect(plugin.onload()).resolves.not.toThrow();
    await expect(plugin.onunload()).resolves.not.toThrow();
  });

  it('should execute ribbon icon and view registration callbacks', async () => {
    await plugin.onload();
    
    // Ribbon callback
    const activateSpy = jest.spyOn(plugin, 'activateView').mockImplementation();
    if ((plugin as any).ribbonCb) {
      (plugin as any).ribbonCb();
    }
    expect(activateSpy).toHaveBeenCalled();
    
    // View callback
    if ((plugin as any).viewCb) {
      const view = (plugin as any).viewCb({});
      expect(view).toBeDefined();
    }
  });

  it('should activateView and reveal existing leaf', async () => {
    const mockLeaf = { setViewState: jest.fn() };
    (mockApp.workspace.getLeavesOfType as jest.Mock).mockReturnValue([mockLeaf]);
    
    await plugin.activateView();
    expect(mockApp.workspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
  });

  it('should activateView and create new leaf if not exists', async () => {
    const mockLeaf = { setViewState: jest.fn() };
    (mockApp.workspace.getLeavesOfType as jest.Mock).mockReturnValue([]);
    (mockApp.workspace.getLeaf as jest.Mock).mockReturnValue(mockLeaf);
    
    await plugin.activateView();
    expect(mockLeaf.setViewState).toHaveBeenCalledWith({ type: 'scientific-revision-tracker', active: true });
    expect(mockApp.workspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
  });

  it('should reload data on live-sync modify event', async () => {
    const mockView = Object.create(TrackerView.prototype);
    mockView.render = jest.fn();
    const mockLeaf = { view: mockView, setViewState: jest.fn() };
    (mockApp.workspace.getLeavesOfType as jest.Mock).mockReturnValue([mockLeaf]);

    await plugin.onload();
    
    const modifyEventRef = (plugin as any).eventRefs.find((r: any) => r.event === 'modify');
    expect(modifyEventRef).toBeDefined();

    const spy = jest.spyOn(plugin, 'loadPluginData');
    await modifyEventRef.cb({ path: 'study-revision-planner-spaced-repetition/data.json' });
    
    expect(spy).toHaveBeenCalled();
    expect(mockView.render).toHaveBeenCalled();
  });

  it('should ignore live-sync modify event if isSaving is true or wrong file', async () => {
    const mockView = Object.create(TrackerView.prototype);
    mockView.render = jest.fn();
    const mockLeaf = { view: mockView, setViewState: jest.fn() };
    (mockApp.workspace.getLeavesOfType as jest.Mock).mockReturnValue([mockLeaf]);

    await plugin.onload();
    const modifyEventRef = (plugin as any).eventRefs.find((r: any) => r.event === 'modify');
    const spy = jest.spyOn(plugin, 'loadPluginData');
    
    // Wrong file
    await modifyEventRef.cb({ path: 'wrong-file.json' });
    expect(spy).not.toHaveBeenCalled();

    // While saving
    (plugin as any).isSaving = true;
    await modifyEventRef.cb({ path: 'study-revision-planner-spaced-repetition/data.json' });
    expect(spy).not.toHaveBeenCalled();
    expect(mockView.render).not.toHaveBeenCalled();
  });
});
