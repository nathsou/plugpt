import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { plugins } from './plugins/plugin';
import { jsPlugin } from './plugins/jsPlugin';
import { googlePlugin } from './plugins/googlePlugin';
import { fetchPlugin } from './plugins/fetchPlugin';

type QuestionMessage = {
    type: 'question',
    content: string,
};

type AnswerMessage = {
    type: 'answer',
    content: string,
    substitutions: PluginSubstitution[],
};

export type PluginSubstitution = {
    pluginId: string,
    start: number,
    end: number,
    query: string,
    result?: unknown,
};

export type ConversationMessage = {
    uuid: string,
    timestamp: number,
} & (QuestionMessage | AnswerMessage);

export type Conversation = {
    uuid: string,
    title: string,
    messages: ConversationMessage[],
};

export type Store = {
    OPENAI_API_KEY: string,
    plugins: Record<string, Record<string, any>>,
    conversationUuid: string,
    nextConversationIndex: number,
    conversations: Conversation[],
    isParametersDialogOpen: boolean,
    setOpenAIKey: (key: string) => void,
    setIsParametersDialogOpen: (isOpen: boolean) => void,
    setPluginState: (pluginId: string, state: Record<string, any>) => void,
    addQuestion: (question: string) => void,
    addAnswer: (answer: string, substitutions: PluginSubstitution[]) => void,
    removeMessage: (conversationUuid: string, messageUuid: string) => void,
    addConversation: () => void,
    removeConversation: (uuid: string) => void,
    setConversationUuid: (uuid: string) => void,
    updateSubstitutions: (conversationUuid: string, messageUuid: string, substitutions: PluginSubstitution[]) => void,
};

plugins.register(jsPlugin);
plugins.register(googlePlugin);
plugins.register(fetchPlugin);

export const useStore = create<Store>()(devtools(persist(set => {
    const firstConversationUuid = uuidv4();

    return {
        OPENAI_API_KEY: '',
        plugins: Object.fromEntries(
            plugins.getPlugins().map(plugin => [plugin.id, plugin.initialState])
        ),
        conversationUuid: firstConversationUuid,
        nextConversationIndex: 2,
        conversations: [{
            uuid: firstConversationUuid,
            title: 'Conversation 1',
            messages: [] as ConversationMessage[],
        }],
        isParametersDialogOpen: false,
        setOpenAIKey: key => set({ OPENAI_API_KEY: key }),
        setPluginState: (pluginId, state) => set(({ plugins }) => ({
            plugins: {
                ...plugins,
                [pluginId]: state,
            },
        })),
        setIsParametersDialogOpen: isOpen => set({ isParametersDialogOpen: isOpen }),
        addQuestion: message => set(({ conversations, conversationUuid }) => {
            const copy = structuredClone(conversations);
            const conversationIndex = copy.findIndex(c => c.uuid === conversationUuid);
            copy[conversationIndex].messages.push({
                uuid: uuidv4(),
                timestamp: Date.now(),
                type: 'question',
                content: message,
            });

            return { conversations: copy };
        }),
        addAnswer: (answer, substitutions) => set(({ conversations, conversationUuid }) => {
            const copy = structuredClone(conversations);
            const conversationIndex = copy.findIndex(c => c.uuid === conversationUuid);
            copy[conversationIndex].messages.push({
                uuid: uuidv4(),
                timestamp: Date.now(),
                type: 'answer',
                content: answer,
                substitutions,
            });

            return { conversations: copy };
        }),
        removeMessage: (conversationUuid, messageUuid) => set(({ conversations }) => {
            const copy = structuredClone(conversations);
            const conversationIndex = copy.findIndex(c => c.uuid === conversationUuid);
            const messageIndex = copy[conversationIndex].messages.findIndex(m => m.uuid === messageUuid);

            if (conversationIndex >= 0 && messageIndex >= 0) {
                const count =
                    copy[conversationIndex].messages[messageIndex].type === 'question' &&
                        copy[conversationIndex].messages[messageIndex + 1]?.type === 'answer' ? 2 : 1;

                copy[conversationIndex].messages.splice(messageIndex, count);
            }

            return { conversations: copy };
        }),
        addConversation: () => set(({ conversations, nextConversationIndex }) => {
            const uuid = uuidv4();

            return {
                conversations: [
                    ...conversations,
                    {
                        uuid,
                        title: `Conversation ${nextConversationIndex}`,
                        messages: [],
                    },
                ],
                conversationUuid: uuid,
                nextConversationIndex: nextConversationIndex + 1,
            };
        }),
        removeConversation: uuid => set(({ conversations }) => {
            const copy = structuredClone(conversations);
            const index = copy.findIndex(c => c.uuid === uuid);
            copy.splice(index, 1);

            if (copy.length === 0) {
                copy.push({
                    uuid: uuidv4(),
                    title: 'Conversation 1',
                    messages: [],
                });
            }

            const previousConversationUuid = copy[index - 1]?.uuid ?? copy[0].uuid;

            return {
                conversations: copy,
                conversationUuid: previousConversationUuid,
            };
        }),
        setConversationUuid: uuid => set({ conversationUuid: uuid }),
        updateSubstitutions: (conversationUuid, messageUuid, substitutions) => set(({ conversations }) => {
            const copy = structuredClone(conversations);
            const conversationIndex = copy.findIndex(c => c.uuid === conversationUuid);
            const messageIndex = copy[conversationIndex].messages.findIndex(m => m.uuid === messageUuid);

            if (conversationIndex >= 0 && messageIndex >= 0) {
                const messages = copy[conversationIndex].messages;
                const message = messages[messageIndex];
                if (message.type === 'answer') {
                    message.substitutions = substitutions;
                }
            }

            return { conversations: copy };
        }),
    };
}, {
    name: 'pugpt',
    // only persist substitution results that are not too long
    partialize: (state) => ({
        ...state,
        conversations: state.conversations.map(c => ({
            ...c,
            messages: c.messages.map(m => {
                if (m.type === 'answer') {
                    return {
                        ...m,
                        substitutions: m.substitutions.map(s => ({
                            ...s,
                            result:
                                s.result !== undefined && JSON.stringify(s.result).length > 1000 ?
                                    undefined :
                                    s.result,
                        })),
                    };
                }

                return m;
            }),
        })),
    }),
})));

export const useConversation = (uuid?: string): Conversation => {
    const conversations = useStore(state => state.conversations);
    const activeUuid = useStore(state => state.conversationUuid);
    const requestedUuid = uuid ?? activeUuid;
    return conversations.find(c => c.uuid === requestedUuid)!;
};
