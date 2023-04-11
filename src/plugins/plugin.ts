import { ChatCompletionRequestMessage } from "openai";
import dedent from "ts-dedent";
import { PluginSubstitution } from "../store";

export type GPTPluginRenderResultProps<State> = {
    key: string,
    subst: PluginSubstitution,
    state: State,
};

export type GPTPluginRenderSettingsProps<State> = {
    state: State,
    setState: (state: State) => void,
};

export type GPTPlugin<State extends Record<string, any> = Record<string, any>> = {
    id: string,
    name: string,
    command: string,
    humanDescription?: string,
    aiDescription: string,
    examples: {
        question: string,
        answer: string,
    }[],
    initialState: State,
    run: (context: { query: string, question: string }, state: State) => Promise<string>,
    renderResult?: (props: GPTPluginRenderResultProps<State>) => JSX.Element,
    renderSettings?: (props: GPTPluginRenderSettingsProps<State>) => JSX.Element,
};

export const plugins = new class {
    private plugins: GPTPlugin[] = [];

    public register(plugin: GPTPlugin<any>) {
        this.plugins.push(plugin);
    }

    public unregister(plugin: GPTPlugin<any>) {
        const index = this.plugins.indexOf(plugin);
        if (index !== -1) {
            this.plugins.splice(index, 1);
        }
    }

    public getPlugins(): ReadonlyArray<GPTPlugin> {
        return this.plugins;
    }

    public getPluginById(id: string): GPTPlugin | undefined {
        return this.plugins.find(plugin => plugin.id === id);
    }

    public getPluginByCommand(command: string): GPTPlugin | undefined {
        return this.plugins.find(plugin => plugin.command === command);
    }

    public getPrompts(): ChatCompletionRequestMessage[] {
        const commands = this.plugins.map(({ command, aiDescription }) => dedent`
            @${command}(<input>): ${aiDescription}
        `).join('\n');

        const examples: ChatCompletionRequestMessage[] = this.plugins.flatMap(plugin => {
            return plugin.examples.flatMap(example => [
                { role: 'user', content: example.question },
                { role: 'assistant', content: example.answer },
            ]);
        });

        return [
            {
                role: 'system',
                content: dedent`
                    You are a helpful assistant, you answer questions in markdown.
                    If needed, the following commands are available to answer questions:
                    ${commands}
                `,
            },
            ...examples,
        ];
    }

    public async runCommand(
        { command, query }: Command,
        question: string,
        state: Record<string, any>,
    ): Promise<{ pluginId: string, result: string }> {
        const plugin = this.getPluginByCommand(command);

        if (plugin) {
            return { pluginId: plugin.id, result: await plugin.run({ query, question }, state) };
        } else {
            return Promise.reject(`Unknown command: ${command}`);
        }
    }
};

export type Command = {
    command: string;
    query: string;
    startIndex: number;
    endIndex: number;
};

export function parse(commandString: string): Command[] {
    let command = '';
    let query = '';
    let startIndex = -1;
    let isParsingCommand = false;
    let isParsingQuery = false;
    let openParenthesesCount = 0;
    const commands: Command[] = [];

    for (let i = 0; i < commandString.length; i++) {
        const char = commandString[i];

        if (char === '@' && !isParsingCommand && !isParsingQuery) {
            startIndex = i;
            isParsingCommand = true;
        } else if (isParsingCommand && char === '(') {
            isParsingCommand = false;
            isParsingQuery = true;
            openParenthesesCount++;
        } else if (isParsingQuery && char === '(') {
            openParenthesesCount++;
            query += char;
        } else if (isParsingQuery && char === ')') {
            openParenthesesCount--;

            if (openParenthesesCount === 0) {
                isParsingQuery = false;
                commands.push({
                    command,
                    query,
                    startIndex,
                    endIndex: i,
                });
                command = '';
                query = '';
                startIndex = -1;
            } else {
                query += char;
            }
        } else if (isParsingCommand) {
            command += char;
        } else if (isParsingQuery) {
            query += char;
        }
    }

    return commands;
}

export type Substitution = {
    start: number,
    end: number,
    replacement: string,
};

export function substitute(input: string, substitutions: Substitution[]): string {
    // Apply each substitution to the input string
    let result = input;
    for (const { start, end, replacement } of substitutions) {
        // Make sure the start index and end index are within bounds
        if (start < 0 || end >= result.length || start >= end) {
            throw new Error('Invalid start and end indices');
        }

        // Replace the substring with the replacement string
        result = result.slice(0, start) + replacement + result.slice(end + 1);
    }

    return result;
}
