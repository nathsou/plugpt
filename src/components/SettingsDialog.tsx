import { Alert, Button, Card, ChevronDownIcon, Dialog, Link, Pane, Pill, SelectMenu, Switch, Tab, Tablist, Text, TextInputField, majorScale, minorScale } from "evergreen-ui";
import { FC, useMemo, useState } from "react";
import { plugins } from "../plugins/plugin";
import { useStore } from "../store";

const GlobalSettings = () => {
    const apiKey = useStore(state => state.OPENAI_API_KEY);
    const temperature = useStore(state => state.temperature);
    const setOpenAIKey = useStore(state => state.setOpenAIKey);
    const setTemperature = useStore(state => state.setTemperature);

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
            <Text>You can find or create your OpenAI API key</Text>
            <Link marginLeft={minorScale(1)} href="https://platform.openai.com/account/api-keys" target="_blank">here</Link>

            <Card display="flex" flexDirection="column" marginY={majorScale(2)}>
                <Text fontWeight={600}>Temperature</Text>
                <Text>Adjusts output randomness</Text>
                <Pane display="flex" width="100%">
                    <input
                        value={temperature}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        onChange={e => setTemperature(Number(e.target.value))}
                    />
                    <Pill display="inline-flex" margin={8}>
                        {temperature}
                    </Pill>
                </Pane>
            </Card>
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
            <Pane display="flex" alignItems="center">
                <SelectMenu
                    title="Select Plugin"
                    options={options}
                    selected={pluginId}
                    onSelect={(item) => setPluginId(item.value as string)}
                    closeOnSelect={true}
                >
                    <Button iconAfter={ChevronDownIcon}>{plugin?.name ?? 'Select Plugin'}</Button>
                </SelectMenu>
                {
                    pluginId != null ? <>
                        <Text marginLeft={majorScale(2)} marginRight={minorScale(1)}>Enabled</Text>
                        <Switch
                            checked={pluginsState[pluginId]?.enabled ?? false}
                            onChange={() => {
                                setPluginState(pluginId, { enabled: !pluginsState[pluginId]?.enabled });
                            }}
                        >
                            Enabled
                        </Switch>
                    </> : null
                }
            </Pane>
            <Pane marginTop={majorScale(2)}>
                {plugin != null ? (
                    <Card
                        display="flex"
                        flexDirection="row"
                        width="100%"
                        border="1px solid #c1c4d6"
                        padding={majorScale(1)}
                        marginBottom={majorScale(2)}
                        background="tint1"
                        justifyContent="space-evenly"
                    >
                        <Card display="flex" flexDirection="column">
                            <Text fontWeight={600}>Identifier</Text>
                            <Text marginY={majorScale(1)}>{plugin.id}</Text>
                        </Card>

                        <Card display="flex" flexDirection="column">
                            <Text fontWeight={600}>Description</Text>
                            <Text marginY={majorScale(1)}>{plugin.humanDescription ?? plugin.aiDescription}</Text>
                        </Card>

                        <Card display="flex" flexDirection="column">
                            <Text fontWeight={600}>Command</Text>
                            <Text marginY={majorScale(1)}>@{plugin.command}</Text>
                        </Card>
                    </Card>
                ) : null}

                {plugin?.renderSettings != null ? plugin.renderSettings({
                    state: pluginsState[plugin.id],
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
    const canClose = apiKey !== '';

    return (
        <Dialog
            isShown={isShown}
            title="Settings"
            confirmLabel="Ok"
            isConfirmDisabled={!canClose}
            hasClose={canClose}
            hasCancel={false}
            hasFooter={true}
            onConfirm={() => setIsParametersDialogOpen(false)}
            onCloseComplete={() => setIsParametersDialogOpen(false)}
            shouldCloseOnOverlayClick={canClose}
            shouldCloseOnEscapePress={canClose}
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
                <Pane
                    padding={majorScale(2)}
                    background="tint2"
                    flex="1"
                    borderRadius={majorScale(1)}
                >
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
