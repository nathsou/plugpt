import { Badge, Button, Card, GlobeIcon, Text, majorScale } from "evergreen-ui";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";
import dedent from "ts-dedent";
import { globalContext } from "../OpenAIProvider";
import { GPTPlugin } from "./plugin";

export const fetchPlugin: GPTPlugin = {
    id: 'nathsou.fetch',
    name: 'Fetch',
    command: 'Fetch',
    humanDescription: 'Fetch the contents of a URL',
    aiDescription: dedent`
        @Fetch(<url>): fetches the contents of a URL and returns the result.
        This command should be used whenever data from a specific URL is needed.
    `,
    examples: [
        {
            question: 'What is the most popular song right now?',
            answer: '@Fetch(https://www.billboard.com/charts/hot-100/)',
        },
        {
            question: 'Summarize the Wikipedia page on the French Revolution',
            answer: '@Fetch(https://en.wikipedia.org/wiki/French_Revolution)',
        },
    ],
    initialState: {},
    run: async ({ query: url, question }) => {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const contents = (await response.json()).contents.slice(0, 5_000);
        const { openai, model } = globalContext;
        const completion = await openai.createChatCompletion({
            model,
            max_tokens: 2000,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: dedent`
                        You are a helpful assistant answering in markdown.
                        You are given the HTML contents of a URL and you should use the contents to answer the question.
                    `,
                },
                {
                    role: 'user',
                    content: dedent`
                        Question: ${question}
                        URL: ${url}
                        Contents:
                        ${contents}
                    `,
                },
            ],
        });

        return completion.data.choices[0]?.message?.content ?? '';
    },
    renderResult: ({ key, subst }) => {
        if (!subst.result) {
            return (
                <Button key={key} iconBefore={GlobeIcon} isLoading={true}>
                    <Text fontSize="1rem">{subst.query}</Text>
                </Button>
            );
        }

        return (
            <Card key={key} color="black">
                <Badge
                    whiteSpace="pre-wrap"
                    textTransform="none"
                    marginBottom={majorScale(1)}
                >
                    {subst.query}
                </Badge>
                <br />
                <ReactMarkdown>{subst.result as string}</ReactMarkdown>
            </Card>
        );
    },
};
