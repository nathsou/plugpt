import { IconButton, Pane, SendMessageIcon, Spinner, Textarea, WrenchIcon, majorScale, minorScale } from 'evergreen-ui';
import { ChatCompletionRequestMessage } from 'openai';
import { useRef, useState } from 'react';
import { globalContext, useOpenAI } from '../OpenAIProvider';
import { parse, plugins } from '../plugins/plugin';
import { PluginSubstitution, useConversation, useStore } from '../store';

export const MessageInput = () => {
    const openai = useOpenAI();
    const [isLoading, setIsLoading] = useState(false);
    const addQuestion = useStore(state => state.addQuestion);
    const addAnswer = useStore(state => state.addAnswer);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const conversation = useConversation();
    const setIsParametersDialogOpen = useStore(state => state.setIsParametersDialogOpen);

    const onSendMessage = async () => {
        setIsLoading(true);
        const question = inputRef.current!.value ?? '';
        inputRef.current!.value = '';
        addQuestion(question);

        const prompts = plugins.getPrompts();
        const completion = await openai.createChatCompletion({
            model: globalContext.model,
            temperature: 0.1,
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
                ref={inputRef}
                flex={1}
                fontSize="1rem"
                resize="none"
                border="none"
                placeholder="Send a message..."
            />
            <Pane display="flex" flexDirection="column" justifyContent="space-around" margin={minorScale(1)}>
                <IconButton icon={WrenchIcon} onClick={() => setIsParametersDialogOpen(true)} />
                {isLoading ? <Spinner size={majorScale(2)} /> : <IconButton icon={SendMessageIcon} onClick={onSendMessage} />}
            </Pane>
        </>
    );
};
