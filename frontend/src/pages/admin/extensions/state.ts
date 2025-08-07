import { create } from 'zustand';
import { ConfigurationDto, ExtensionDto, ExtensionSpecDto } from 'src/api';

interface ExtensionsState {
  // All available extensions.
  specs: ExtensionSpecDto[];

  // The extensions.
  extensions: ExtensionDto[];
}

type ExtensionsActions = {
  // Adds or sets an extension.
  setExtension: (extension: ExtensionDto) => void;

  // Sets all extensions.
  setExtensions: (source: ExtensionDto[], specs: ExtensionSpecDto[]) => void;

  // Remove an extension.
  removeExtension: (id: number) => void;
};

type ConfigurationState = {
  // The configurations.
  configurations: ConfigurationDto[];
};

type ConfigurationActions = {
  // Adds or sets a configuration.
  setConfiguration: (configuration: ConfigurationDto) => void;

  // Sets all configurations.
  setConfigurations: (configuration: ConfigurationDto[]) => void;

  // Remove a configuration.
  removeConfiguration: (id: number) => void;
};

const useExtensionsStore_ = create<ExtensionsState & ExtensionsActions>()((set) => ({
  specs: [],
  extensions: [],
  setExtension: (extension: ExtensionDto) => {
    return set((state) => {
      const spec = state.specs.find((x) => x.name === extension.name);

      if (!spec) {
        return {};
      }

      const extensions = [...state.extensions];

      const indexOfExisting = extensions.findIndex((x) => x.id === extension.id);
      if (indexOfExisting >= 0) {
        extensions[indexOfExisting] = extension;
      } else {
        extensions.push(extension);
      }

      return { extensions };
    });
  },
  setExtensions: (source: ExtensionDto[], specs: ExtensionSpecDto[]) => {
    const extensions: ExtensionDto[] = [];

    for (const extension of source) {
      const spec = specs.find((x) => x.name === extension.name);

      if (spec) {
        extensions.push(extension);
      }
    }

    return set({ extensions, specs });
  },
  removeExtension: (id: number) => {
    return set((state) => ({ extensions: state.extensions.filter((x) => x.id !== id) }));
  },
}));

/**
 * @deprecated Using Zustand hooks directly in ui-components is deprecated. Use
 * other hooks to wrap the Zustand hook instead. We want hooks to have
 * interfaces that fit our domains terminology. E.g. useAIConversation exports
 * a function called sendMessage, which will talk to the LLM and update the
 * messages internally. No separate call to a Zustand hook has to be made in
 * order to update messages after using sendMessage. An ideal version of the
 * useAIConversation hook exports only actions like sendMessage and states like
 * messages, but no setters.
 **/
export const useExtensionsStore = useExtensionsStore_;

const useConfigurationStore_ = create<ConfigurationState & ConfigurationActions>()((set) => ({
  configurations: [],
  setConfiguration: (configuration: ConfigurationDto) => {
    return set((state) => {
      const configurations = [...state.configurations];

      const indexOfExisting = state.configurations.findIndex((x) => x.id === configuration.id);
      if (indexOfExisting >= 0) {
        configurations[indexOfExisting] = configuration;
      } else {
        configurations.push(configuration);
      }

      return { configurations: configurations };
    });
  },
  setConfigurations: (configurations: ConfigurationDto[]) => {
    return set({ configurations });
  },
  removeConfiguration: (id: number) => {
    return set((state) => ({ configurations: state.configurations.filter((x) => x.id !== id) }));
  },
}));

/**
 * @deprecated Using Zustand hooks directly in ui-components is deprecated. Use
 * other hooks to wrap the Zustand hook instead. We want hooks to have
 * interfaces that fit our domains terminology. E.g. useAIConversation exports
 * a function called sendMessage, which will talk to the LLM and update the
 * messages internally. No separate call to a Zustand hook has to be made in
 * order to update messages after using sendMessage. An ideal version of the
 * useAIConversation hook exports only actions like sendMessage and states like
 * messages, but no setters.
 **/
export const useConfigurationStore = useConfigurationStore_;
