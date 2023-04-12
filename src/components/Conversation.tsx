import { Heading, IconButton, MenuClosedIcon, MenuIcon, Pane, majorScale } from "evergreen-ui";
import { FC, useEffect } from "react";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { useConversation, useStore } from "../store";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useOpenAI } from "../OpenAIProvider";
import dedent from "ts-dedent";

export const Conversation: FC = () => {
    const { messages, title, summary } = useConversation();
    const conversationUuid = useStore(state => state.conversationUuid);
    const setSummary = useStore(state => state.setConversationSummary);
    const isSmallScreen = useIsSmallScreen();
    const openai = useOpenAI();
    const [isMenuOpen, setIsMenuOpen] = useStore(state => [state.isSidePanelOpen, state.setIsSidePanelOpen]);

    useEffect(() => {
        const firstQuestion = messages.find(message => message.type === 'question');
        if (summary == null && firstQuestion != null) {
            openai.createCompletion({
                model: 'text-curie-001',
                temperature: 0.2,
                prompt: dedent`
                    You are a conversation title generator.
                    You are given the first message of a new conversation and you must generate a very short title for it,
                    always stay in character.

                    Message: Is it possible to fetch the contents of a URL on a different domain in the client side without using an external server?
                    Title: Fetching Cross-Domain Content

                    Message: Draw a simple 400x300px representation of the solar system with coloured disks on a dark blue background, include all 8 planets.
                    Title: Solar System Drawing

                    Message: How do I get the current date and time in a specific timezone using JavaScript?
                    Title: JS Timezone Date-Time

                    Message: ${firstQuestion.content}
                    Title: 
                `,
            }).then(response => {
                setSummary(
                    conversationUuid,
                    response.data.choices[0].text ?? title
                );
            });
        }
    }, [openai, title, conversationUuid, messages, summary, setSummary]);

    return (
        <Pane display="flex" flexDirection="column" flex={1} height="100%" background="gray100">
            <Pane display="flex" justifyContent="center" alignItems="center" height={majorScale(isSmallScreen ? 5 : 3)}>
                {isSmallScreen && !isMenuOpen ?
                    <IconButton
                        size="large"
                        icon={isMenuOpen ? MenuClosedIcon : MenuIcon}
                        position="absolute"
                        top={0}
                        left={0}
                        zIndex={100}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    /> : null
                }
                <Heading textAlign="center">{summary ?? title}</Heading>
            </Pane>
            <Pane flex={1} overflowY="auto">
                {messages.map(message => (
                    <Message key={message.uuid} message={message} />
                ))}
            </Pane>
            <Pane display="flex" flexBasis="4rem" flexShrink={1} margin={majorScale(2)} justifyContent="center">
                <Pane display="flex" flexBasis="60rem" flexGrow={0} background="white" justifyContent="center">
                    <MessageInput />
                </Pane>
            </Pane>
        </Pane>
    );
};
