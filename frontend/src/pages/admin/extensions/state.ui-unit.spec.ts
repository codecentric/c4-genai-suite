import { beforeEach, describe, expect, it } from 'vitest';
import { ConfigurationDto } from 'src/api';
import { useConfigurationStore } from './state';

function makeConfiguration(id: number, name: string): ConfigurationDto {
  return { id, name, description: '', enabled: true };
}

describe('useConfigurationStore.setConfiguration', () => {
  beforeEach(() => {
    useConfigurationStore.getState().setConfigurations([]);
  });

  it('inserts an added configuration into its alphabetical position instead of appending it', () => {
    const { setConfigurations, setConfiguration } = useConfigurationStore.getState();

    setConfigurations([makeConfiguration(1, 'Assistant A'), makeConfiguration(2, 'Assistant C')]);
    // Duplicating "Assistant A" yields a new configuration named "Assistant B".
    setConfiguration(makeConfiguration(3, 'Assistant B'));

    const names = useConfigurationStore.getState().configurations.map((c) => c.name);
    expect(names).toEqual(['Assistant A', 'Assistant B', 'Assistant C']);
    // Guards against the previous behaviour where the new item was pushed to the end.
    expect(names[names.length - 1]).not.toBe('Assistant B');
  });

  it('replaces an existing configuration in place and keeps the list sorted', () => {
    const { setConfigurations, setConfiguration } = useConfigurationStore.getState();

    setConfigurations([makeConfiguration(1, 'Alpha'), makeConfiguration(2, 'Bravo'), makeConfiguration(3, 'Charlie')]);
    // Rename "Charlie" (id 3) to "Amber": it must move to its new position, not be appended.
    setConfiguration(makeConfiguration(3, 'Amber'));

    const configurations = useConfigurationStore.getState().configurations;
    expect(configurations).toHaveLength(3);
    expect(configurations.map((c) => c.name)).toEqual(['Alpha', 'Amber', 'Bravo']);
    expect(configurations.find((c) => c.id === 3)?.name).toEqual('Amber');
  });
});
