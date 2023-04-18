import { Avatar, Button, Card, Code, IconButton, Pane, Popover, TrashIcon, majorScale } from "evergreen-ui";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import { parse, plugins } from "../plugins/plugin";
import { useConversation, useStore, type ConversationMessage } from "../store";

type Props = {
    message: ConversationMessage,
};

const RUN_COMMANDS = true;

export const Message: FC<Props> = ({ message }) => {
    const conversationUuid = useStore(state => state.conversationUuid);
    const removeMessage = useStore(state => state.removeMessage);
    const updateSubstitutions = useStore(state => state.updateSubstitutions);
    const [isHovered, setIsHovered] = useState(false);
    const conversation = useConversation();
    const pluginsState = useStore(state => state.plugins);

    useEffect(() => {
        if (
            RUN_COMMANDS &&
            message.type === 'answer' &&
            message.substitutions.length > 0 &&
            message.substitutions.every(sub => sub.result == null)
        ) {
            const commands = parse(message.content);
            const questionIndex = conversation.messages.findIndex(m => m.uuid === message.uuid) - 1;
            const question = conversation.messages[questionIndex];

            try {
                Promise.all(commands.map(async command => {
                    const plugin = plugins.getPluginByCommand(command.command);
                    if (plugin == null) {
                        throw new Error(`No plugin found for command ${command.command}`);
                    }

                    const pluginState = pluginsState[plugin.id] ?? {};
                    const { result } = await plugins.runCommand(
                        command,
                        question.content,
                        pluginState
                    );

                    return {
                        pluginId: plugin.id,
                        result,
                        start: command.startIndex,
                        end: command.endIndex,
                        query: command.query,
                    };
                })).then(substitutions => {
                    updateSubstitutions(conversationUuid, message.uuid, substitutions);
                });
            } catch (e) {
                console.error(e);
            }
        }
    }, [message, pluginsState, plugins]);

    const { type, content } = message;
    const body = useMemo(() => {
        switch (type) {
            case 'question':
                return <ReactMarkdown>{content}</ReactMarkdown>;
            case 'answer':
                return <SubstitutedString
                    input={content}
                    substitutions={message.substitutions.map(subst => {
                        const plugin = plugins.getPluginById(subst.pluginId);
                        const render =
                            plugin?.renderResult != null ?
                                (key: string) => plugin.renderResult!({ key, subst, state: pluginsState[plugin.id] }) :
                                ((key: string) => (
                                    <Popover key={key}
                                        content={
                                            <Pane width="20rem" maxWidth="20rem" overflowY="auto">
                                                <Code>{subst.query}</Code>
                                            </Pane>
                                        }
                                    >
                                        <Button isLoading={subst.result === undefined}>{JSON.stringify(subst.result)}</Button>
                                    </Popover>
                                ));

                        return {
                            start: subst.start,
                            end: subst.end,
                            replacement: render,
                        };
                    })}
                />;
        }
    }, [message, pluginsState]);

    return (
        <Card
            background={type === 'question' ? 'gray200' : 'white'}
            borderColor="blue"
            color={type === 'question' ? 'black' : 'white'}
            borderTopWidth={1}
            borderBottomWidth={1}
            borderRadius={0}
            paddingY={majorScale(1)}
            paddingX={majorScale(4)}
            display="flex"
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
            justifyContent="center"
            position="relative"
        >
            <Pane display="flex" flexBasis="60rem" flexGrow={0}>
                <Avatar
                    name={type === 'question' ? 'Mel Enderson' : 'Alan Isaac'}
                    color={type === 'question' ? 'orange' : 'blue'}
                    marginRight={majorScale(1)}
                />
                <Pane flex={1} color="#101840" whiteSpace="pre-wrap" >
                    {body}
                </Pane>
                {isHovered && type === 'question' ?
                    <IconButton
                        icon={TrashIcon}
                        size="small"
                        position="absolute"
                        right={majorScale(2)}
                        onClick={() => removeMessage(conversationUuid, message.uuid)}
                    /> :
                    null
                }
            </Pane>
        </Card>
    );
};

type Replacement = {
    start: number;
    end: number;
    replacement: (key: string) => ReactNode;
};

type SubstitutedStringProps = {
    input: string;
    substitutions: Replacement[];
};

const SubstitutedString: FC<SubstitutedStringProps> = ({ input, substitutions }) => {
    const sortedSubstitutions = substitutions.sort((a, b) => a.start - b.start);

    let lastIndex = 0;
    const result: ReactNode[] = [];
    let index = 0;

    for (const substitution of sortedSubstitutions) {
        const { start, end, replacement } = substitution;

        // Add the text before the substitution
        if (start > lastIndex) {
            result.push(<ReactMarkdown key={index}>{input.slice(lastIndex, start)}</ReactMarkdown>);
            index += 1;
        }

        result.push(replacement(String(index)));

        lastIndex = end + 1;
        index += 1;
    }

    // Add the remaining text
    if (lastIndex < input.length) {
        result.push(<ReactMarkdown key={index}>{input.slice(lastIndex)}</ReactMarkdown>);
    }

    return <Pane color="gray900" display="flex" flexWrap="wrap" flex="1" maxWidth="100%">{result}</Pane>;
};
