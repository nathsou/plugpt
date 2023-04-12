import { Heading, IconButton, MenuClosedIcon, MenuIcon, Pane, majorScale } from "evergreen-ui";
import { FC } from "react";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { useConversation, useStore } from "../store";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";

export const Conversation: FC = () => {
    const { messages, title } = useConversation();
    const isSmallScreen = useIsSmallScreen();
    const [isMenuOpen, setIsMenuOpen] = useStore(state => [state.isSidePanelOpen, state.setIsSidePanelOpen]);

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
                <Heading textAlign="center">{title}</Heading>
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
