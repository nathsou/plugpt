import { Button, Card, IconButton, Pane, PlusIcon, Text, TrashIcon, majorScale, minorScale } from "evergreen-ui";
import { FC, useState } from "react";
import { Conversation, useStore } from "../store";

const ConversationItem: FC<{ conversation: Conversation }> = ({ conversation }) => {
    const setConversationUuid = useStore(state => state.setConversationUuid);
    const activeConversationUuid = useStore(state => state.conversationUuid);
    const removeConversation = useStore(state => state.removeConversation);
    const isActive = activeConversationUuid === conversation.uuid;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Card
            background={isActive ? "blue200" : "blue100"}
            display="flex"
            justifyContent="center"
            alignItems="center"
            position="relative"
            height="3rem"
            marginY={majorScale(1)}
            cursor="pointer"
            onClick={() => setConversationUuid(conversation.uuid)}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => setIsHovered(false)}
        >
            <Text
                fontSize="1rem"
                flex={1}
                textAlign="center"
                textOverflow="ellipsis"
                overflow="hidden"
                whiteSpace="nowrap"
                margin={majorScale(1)}
            >
                {conversation.summary ?? conversation.title}
            </Text>
            {isHovered && <IconButton
                icon={TrashIcon}
                position="absolute"
                right={minorScale(1)}
                size="small"
                onClick={(e: any) => {
                    e.stopPropagation();
                    removeConversation(conversation.uuid);
                }}
            />}
        </Card>
    );
};

export const SidePanel = () => {
    const conversations = useStore(state => [...state.conversations].reverse());
    const addConversation = useStore(state => state.addConversation);

    return (
        <Pane
            flexBasis="18rem"
            height="100%"
            background="gray75"
            padding={majorScale(2)}
            overflowY="auto"
        >
            <Button
                width="100%"
                height="3rem"
                iconAfter={PlusIcon}
                fontSize="1rem"
                onClick={addConversation}
            >
                New chat
            </Button>
            {conversations.map(conversation => (
                <ConversationItem key={conversation.uuid} conversation={conversation} />
            ))}
        </Pane>
    );
};