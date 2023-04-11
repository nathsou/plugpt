import { Pane, majorScale } from "evergreen-ui";
import { FC } from "react";
import { Message } from "./Message";
import { MessageInput } from "./MessageInput";
import { useConversation, useStore } from "../store";

export const Conversation: FC = () => {
    const uuid = useStore(state => state.conversationUuid);
    const { messages } = useConversation(uuid);

    return (
        <Pane display="flex" flexDirection="column" flex={1} height="100%" background="gray100">
            <Pane flex={1} overflowY="auto" marginTop={majorScale(3)}>
                {messages.map(message => (
                    <Message key={message.timestamp} message={message} />
                ))}
            </Pane>
            <Pane display="flex" flexBasis="4rem" flexShrink={1} background="white" margin={majorScale(2)}>
                <MessageInput />
            </Pane>
        </Pane>
    );
};
