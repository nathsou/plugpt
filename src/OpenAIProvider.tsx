import { Configuration, OpenAIApi } from 'openai';
import { FC, PropsWithChildren, createContext, useContext, useMemo } from 'react';
import { useStore } from './store';

export const globalContext = {
    openai: new OpenAIApi(),
    model: 'gpt-3.5-turbo',
};

const OpenAIContext = createContext<OpenAIApi>(globalContext.openai);

export const useOpenAI = () => {
    return useContext(OpenAIContext);
};

export const OpenAIProvider: FC<PropsWithChildren> = ({ children }) => {
    const apiKey = useStore(state => state.OPENAI_API_KEY);
    const openai = useMemo(() => {
        const instance = new OpenAIApi(new Configuration({ apiKey }));
        globalContext.openai = instance;
        return instance;
    }, [apiKey]);

    return (
        <OpenAIContext.Provider value={openai}>
            {children}
        </OpenAIContext.Provider>
    );
};
