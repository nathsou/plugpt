import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer'
import { fetchPlugin } from './plugins/fetchPlugin';
import { googlePlugin } from './plugins/googlePlugin';
import { jsPlugin } from './plugins/jsPlugin';
import { plugins } from './plugins/plugin';

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

type State = {
    OPENAI_API_KEY: string,
    plugins: Record<string, Record<string, any>>,
    conversationUuid: string,
    nextConversationIndex: number,
    conversations: Conversation[],
    isParametersDialogOpen: boolean,
};

type Actions = {
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

export type Store = State & Actions;

plugins.register(jsPlugin);
plugins.register(googlePlugin);
plugins.register(fetchPlugin);

export const useStore = create<Store>()(immer(persist(set => {
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
        setOpenAIKey: key => set(state => {
            state.OPENAI_API_KEY = key;
        }),
        setPluginState: (pluginId, state) => set(({ plugins }) => {
            plugins[pluginId] = state;
        }),
        setIsParametersDialogOpen: isOpen => set(state => {
            state.isParametersDialogOpen = isOpen;
        }),
        addQuestion: message => set(({ conversations, conversationUuid }) => {
            const conversationIndex = conversations.findIndex(c => c.uuid === conversationUuid);
            conversations[conversationIndex].messages.push({
                uuid: uuidv4(),
                timestamp: Date.now(),
                type: 'question',
                content: message,
            });
        }),
        addAnswer: (answer, substitutions) => set(({ conversations, conversationUuid }) => {
            const conversationIndex = conversations.findIndex(c => c.uuid === conversationUuid);
            conversations[conversationIndex].messages.push({
                uuid: uuidv4(),
                timestamp: Date.now(),
                type: 'answer',
                content: answer,
                substitutions,
            });
        }),
        removeMessage: (conversationUuid, messageUuid) => set(({ conversations }) => {
            const conversationIndex = conversations.findIndex(c => c.uuid === conversationUuid);
            const messageIndex = conversations[conversationIndex].messages.findIndex(m => m.uuid === messageUuid);

            if (conversationIndex >= 0 && messageIndex >= 0) {
                const messages = conversations[conversationIndex].messages;
                const count =
                    messages[messageIndex].type === 'question' &&
                        messages[messageIndex + 1]?.type === 'answer' ? 2 : 1;

                conversations[conversationIndex].messages.splice(messageIndex, count);
            }

        }),
        addConversation: () => set(state => {
            const uuid = uuidv4();
            state.conversations.push({
                uuid,
                title: `Conversation ${state.nextConversationIndex}`,
                messages: [],
            });

            state.nextConversationIndex += 1;
            state.conversationUuid = uuid;
        }),
        removeConversation: uuid => set(state => {
            const index = state.conversations.findIndex(c => c.uuid === uuid);
            state.conversations.splice(index, 1);

            if (state.conversations.length === 0) {
                state.conversations.push({
                    uuid: uuidv4(),
                    title: 'Conversation 1',
                    messages: [],
                });
            }

            const previousConversationUuid = state.conversations[index - 1]?.uuid ?? state.conversations[0].uuid;

            state.conversationUuid = previousConversationUuid;
        }),
        setConversationUuid: uuid => set({ conversationUuid: uuid }),
        updateSubstitutions: (conversationUuid, messageUuid, substitutions) => set(({ conversations }) => {
            const conversationIndex = conversations.findIndex(c => c.uuid === conversationUuid);
            const messageIndex = conversations[conversationIndex].messages.findIndex(m => m.uuid === messageUuid);

            if (conversationIndex >= 0 && messageIndex >= 0) {
                const messages = conversations[conversationIndex].messages;
                const message = messages[messageIndex];
                if (message.type === 'answer') {
                    message.substitutions = substitutions;
                }
            }
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
