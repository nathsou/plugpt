import { IconButton, Pane, SendMessageIcon, Spinner, Textarea, WrenchIcon, majorScale, minorScale } from 'evergreen-ui';
import { ChatCompletionRequestMessage } from 'openai';
import { ChangeEvent, KeyboardEvent, useCallback, useState } from 'react';
import { globalContext, useOpenAI } from '../OpenAIProvider';
import { parse, plugins } from '../plugins/plugin';
import { PluginSubstitution, useConversation, useStore } from '../store';

export const MessageInput = () => {
    const openai = useOpenAI();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const addQuestion = useStore(state => state.addQuestion);
    const addAnswer = useStore(state => state.addAnswer);
    const conversation = useConversation();
    const setIsParametersDialogOpen = useStore(state => state.setIsParametersDialogOpen);
    const temperature = useStore(state => state.temperature);

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

        const prompts = plugins.getPrompts();
        const completion = await openai.createChatCompletion({
            model: globalContext.model,
            temperature,
            messages: [
                ...prompts,
                ...conversation.messages.map<ChatCompletionRequestMessage>(message => ({
                    role: message.type === 'question' ? 'user' : 'assistant',
                    content: message.content
                })),
                { role: 'user', content: question },
            ],
        });

        const answer = completion.data.choices[0].message?.content ?? '';
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

        addAnswer(answer, substitutions);
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
