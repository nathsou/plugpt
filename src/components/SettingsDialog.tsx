import { Alert, Button, ChevronDownIcon, Dialog, Pane, SelectMenu, Tab, Tablist, TextInputField, majorScale } from "evergreen-ui";
import { FC, useMemo, useState } from "react";
import { plugins } from "../plugins/plugin";
import { useStore } from "../store";

const GlobalSettings = () => {
    const apiKey = useStore(state => state.OPENAI_API_KEY);
    const setOpenAIKey = useStore(state => state.setOpenAIKey);

    return (
        <Pane>
            <Alert
                intent="none"
                title="API keys are only stored in your browser's local storage."
                marginBottom={majorScale(1)}
            />
            <TextInputField
                placeholder="OpenAI API Key"
                defaultValue={apiKey}
                onChange={(e: any) => setOpenAIKey(e.target.value)}
                type="password"
                label="OpenAI API Key"
            />
        </Pane>
    );
};

const PluginSettings = () => {
    const [pluginId, setPluginId] = useState<string | undefined>();
    const pluginsState = useStore(state => state.plugins);
    const setPluginState = useStore(state => state.setPluginState);
    const plugin = useMemo(() => pluginId != null ? plugins.getPluginById(pluginId) : null, [pluginId]);
    const options = useMemo(() => {
        return plugins.
            getPlugins()
            .map(plugin => ({ label: plugin.name, value: plugin.id }))
    }, []);

    return (
        <>
            <SelectMenu
                title="Select Plugin"
                options={options}
                selected={pluginId}
                onSelect={(item) => setPluginId(item.value as string)}
            >
                <Button iconAfter={ChevronDownIcon}>{plugin?.name ?? 'Select Plugin'}</Button>
            </SelectMenu>
            <Pane marginTop={majorScale(2)}>
                {plugin?.renderSettings != null ? plugin.renderSettings({
                    state: pluginsState[plugin.id] ?? {},
                    setState: (state) => setPluginState(plugin.id, state),
                }) : null}
            </Pane>
        </>
    )
};

const tabNames = ['Global', 'Plugins'];
const tabMapping = [GlobalSettings, PluginSettings];

export const SettingsDialog: FC = () => {
    const apiKey = useStore(state => state.OPENAI_API_KEY);
    const isShown = useStore(state => state.isParametersDialogOpen || state.OPENAI_API_KEY === '');
    const setIsParametersDialogOpen = useStore(state => state.setIsParametersDialogOpen);
    const [selectedIndex, setSelectedIndex] = useState(0);

    return (
        <Dialog
            isShown={isShown}
            title="Parameters"
            confirmLabel="Ok"
            isConfirmDisabled={apiKey === ''}
            hasClose={false}
            hasCancel={false}
            hasFooter={true}
            onConfirm={() => setIsParametersDialogOpen(false)}
            shouldCloseOnOverlayClick={false}
            shouldCloseOnEscapePress={false}
        >
            <Pane>
                <Tablist marginBottom={majorScale(2)} flexBasis={240}>
                    {tabNames.map((tab, index) => (
                        <Tab
                            aria-controls={`panel-${tab}`}
                            isSelected={index === selectedIndex}
                            key={tab}
                            onSelect={() => setSelectedIndex(index)}
                        >
                            {tab}
                        </Tab>
                    ))}
                </Tablist>
                <Pane padding={majorScale(2)} background="tint2" flex="1" borderRadius={majorScale(1)}>
                    {tabNames.map((tab, index) => (
                        <Pane
                            aria-labelledby={tab}
                            aria-hidden={index !== selectedIndex}
                            display={index === selectedIndex ? 'block' : 'none'}
                            key={tab}
                            role="tabpanel"
                        >
                            {tabMapping[index]()}
                        </Pane>
                    ))}
                </Pane>
            </Pane>
        </Dialog>
    );
};
