import ScientificRevisionPlugin from './main';
import { DEFAULT_DATA } from './data';
import { App, PluginManifest } from 'obsidian';

// Mock Obsidian Plugin architecture
jest.mock('obsidian', () => {
  return {
    Plugin: class {
      app: any;
      manifest: any;
      
      constructor(app: any, manifest: any) {
        this.app = app;
        this.manifest = manifest;
      }
      
      async loadData() {
        return { topics: [{ id: '1', name: 'Test', state: 'planned', targetDate: '2023-01-01', interval: 0, easeFactor: 2.5 }] };
      }
      
      async saveData(data: any) {
        // Mock successful save
      }
    }
  };
});

describe('ScientificRevisionPlugin Data Adapter', () => {
  let plugin: ScientificRevisionPlugin;
  let mockApp: App;
  let mockManifest: PluginManifest;

  beforeEach(() => {
    mockApp = {} as App;
    mockManifest = {
      id: 'obsidian-scientific-revision',
      name: 'Test Plugin',
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
});
