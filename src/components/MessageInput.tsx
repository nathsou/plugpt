import { IconButton, Pane, SendMessageIcon, Spinner, Textarea, WrenchIcon, majorScale, minorScale } from 'evergreen-ui';
import { ChatCompletionRequestMessage } from 'openai';
import { ChangeEvent, KeyboardEvent, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { parse, plugins } from '../plugins/plugin';
import { SSE } from '../sse';
import { PluginSubstitution, useConversation, useStore } from '../store';

export const MessageInput = () => {
    const OPENAI_API_KEY = useStore(state => state.OPENAI_API_KEY);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const addQuestion = useStore(state => state.addQuestion);
    const addAnswer = useStore(state => state.addAnswer);
    const updateMessage = useStore(state => state.updateMessage);
    const conversation = useConversation();
    const setIsParametersDialogOpen = useStore(state => state.setIsParametersDialogOpen);
    const temperature = useStore(state => state.temperature);
    const model = useStore(state => state.model);
    const pluginsState = useStore(state => state.plugins);
    const updateSubstitutions = useStore(state => state.updateSubstitutions);

    const onKeyUp = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSendMessage();
        }
    }, [message]);

    const onSendMessage = async () => {
        setIsLoading(true);
        const question = message;
        addQuestion(message);
        setMessage('');
        const answerUuid = uuidv4();
        addAnswer(conversation.uuid, answerUuid, '', []);

        const enabledPlugins = new Set(
            Object
                .entries(pluginsState)
                .filter(([_, state]) => state.enabled)
                .map(([id]) => id)
        );

        const prompts = plugins.getPrompts(enabledPlugins);
        const answer = await new Promise<string>((resolve, _reject) => {
            const completion = new SSE("https://api.openai.com/v1/chat/completions", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                method: "POST",
                payload: JSON.stringify({
                    model,
                    temperature,
                    stream: true,
                    messages: [
                        ...prompts,
                        ...conversation.messages.map<ChatCompletionRequestMessage>(message => ({
                            role: message.type === 'question' ? 'user' : 'assistant',
                            content: message.content
                        })),
                        { role: 'user', content: question },
                    ],
                }),
            });

            let message = '';

            const onMessage = (event: any) => {
                if (event.data === "[DONE]") {
                    completion.close();
                    completion.removeEventListener('message', onMessage);
                    resolve(message);
                } else {
                    const payload = JSON.parse(event.data);
                    const delta = payload.choices[0].delta;

                    if ("content" in delta) {
                        message += delta.content;
                    }

                    updateMessage(conversation.uuid, answerUuid, message);
                }
            };

            completion.addEventListener('message', onMessage);
            completion.stream();
        });

        const commands = parse(answer);
        const substitutions: PluginSubstitution[] = commands.map(command => {
            const plugin = plugins.getPluginByCommand(command.command)!;

            return {
                pluginId: plugin.id,
                start: command.startIndex,
                end: command.endIndex,
                query: command.query,
            };
        });

        updateSubstitutions(conversation.uuid, answerUuid, substitutions);
        setIsLoading(false);
    };

    return (
        <>
            <Textarea
                flex={1}
                fontSize="1rem"
                resize="none"
                border="none"
                onKeyUp={onKeyUp}
                placeholder="Send a message..."
                value={message}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)}
            />
            <Pane display="flex" flexDirection="column" justifyContent="space-between" margin={minorScale(1)}>
                <IconButton icon={WrenchIcon} onClick={() => setIsParametersDialogOpen(true)} />
                {
                    isLoading ?
                        <Spinner size={majorScale(4)} /> :
                        <IconButton icon={SendMessageIcon} onClick={onSendMessage} disabled={message.length === 0} />
                }
            </Pane>
        </>
    );
};
