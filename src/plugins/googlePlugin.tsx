import { Badge, Button, Card, Link, SearchIcon, Text, TextInputField, majorScale } from "evergreen-ui";
import ReactMarkdown from 'react-markdown';
import dedent from "ts-dedent";
import { globalContext } from "../OpenAIProvider";
import { GPTPlugin } from "./plugin";

export type GooglePluginState = {
    key: string,
    cx: string,
    enabled: boolean,
};

export const googlePlugin: GPTPlugin<GooglePluginState> = {
    id: 'nathsou.google',
    name: "Google Search",
    command: "Google",
    humanDescription: "Search Google",
    aiDescription: dedent`
        @Google(<input>): searches Google and returns the top results,
        this command should be used whenever real-time or precise information is needed.
        If you have the tiniest doubt about an answer, use this command.
    `,
    examples: [
        {
            question: 'What is the most popular song right now?',
            answer: '@Google(Most popular song right now)',
        },
        {
            question: 'How many people live in France?',
            answer: '@Google(Population of France)',
        },
        {
            question: 'When will the next SpaceX launch be?',
            answer: '@Google(Next SpaceX launch)',
        },
    ],
    initialState: { enabled: false, key: '', cx: '' },
    run: async ({ query, question }, { key, cx }) => {
        const numResults = 10;
        const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${query}&num=${numResults}`;
        const response = await fetch(url);
        const results = await response.json();
        const { openai, model } = globalContext;
        const completion = await openai.createChatCompletion({
            model,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: dedent`
                        You are a helpful search engine assistant answering in markdown.
                        trying to answer user questions using the results of a Google search.
                        If the answer can accurately be found in the top 5 results,
                        you should answer the question and cite the source(s).
                        If the answer cannot be found in the snippet for the top results,
                        you should visit one page from the top results using the @Visit(<link>) command.
                    `,
                },
                {
                    role: 'user',
                    content: dedent`
                        Question: When will the next SpaceX launch be?
                        Query: Next SpaceX launch
                        Results:
                        #1 [Launches - SpaceX](https://www.spacex.com/launches/): Launches ; April 7, 2023. Intelsat IS-40e Mission ; April 2, 2023. Space Development Agency's Tranche 0 Mission ; March 29, 2023. Starlink mission ; March 24, 2023.
                        #2 [Rocket Launch Schedule | Kennedy Space Center](https://www.kennedyspacecenter.com/launches-and-events): Launches & Events · View Rocket Launches & Be Inspired · NET APRIL 18, 2023 | SpaceX Falcon Heavy ViaSat-3 Americas · Gateway: The Deep Space Launch Complex.
                        #3 [Upcoming Rocket Launch List](https://spacecoastlaunches.com/launch-list/): Upcoming Rocket Launch List · Date: April 18, 2023 · Vehicle: SpaceX Falcon Heavy · Mission: Falcon Heavy ViaSat-3 Americas - The ViaSat-3 is a series of three Ka- ...
                        #4 [NASA Launch Schedule | Rocket Launches](https://www.nasa.gov/launchschedule): Upcoming launches and landings of crew members to and from the International Space Station, and launches of rockets delivering spacecraft that observe the ...
                        #5 [Launch Schedule - Spaceflight Now](https://spaceflightnow.com/launch-schedule/): A SpaceX Falcon 9 rocket will launch the Transporter 7 mission, a rideshare flight to a sun-synchronous orbit with numerous small microsatellites and ...
                    `,
                },
                {
                    role: 'assistant',
                    content: dedent`
                        The next SpaceX launch will be on **April 18, 2023**.
                        The source is [SpaceX Falcon Heavy ViaSat-3 Americas](https://www.kennedyspacecenter.com/launches-and-events).
                    `,
                },
                {
                    role: 'user',
                    content: dedent`
                        Question: ${question}
                        Query: ${query}
                        Results:
                        ${results.items.map((item: any, index: number) => `#${index + 1} [${[item.title]}](${item.link}): ${item.snippet}`).join('\n')}
                    `,
                },
            ],
        });

        return completion.data.choices[0]?.message?.content ?? '';
    },
    renderResult: ({ key, subst }) => {
        if (!subst.result) {
            return (
                <Button key={key} iconBefore={SearchIcon}>
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
    renderSettings: ({ state, setState }) => {
        return (
            <>
                <TextInputField
                    value={state.key}
                    onChange={(e: any) => setState({ ...state, key: e.target.value })}
                    type="password"
                    label={
                        <>
                            <Text>Google Search API Key</Text>
                            <Link
                                marginLeft={majorScale(1)}
                                target="_blank"
                                href="https://developers.google.com/custom-search/v1/overview"
                            >
                                <Text color="blue">more info</Text>
                            </Link>
                        </>
                    }
                />
                <TextInputField
                    value={state.cx}
                    onChange={(e: any) => setState({ ...state, cx: e.target.value })}
                    type="password"
                    label={
                        <>
                            <Text>Google Search Engine ID</Text>
                            <Link
                                marginLeft={majorScale(1)}
                                target="_blank"
                                href="https://programmablesearchengine.google.com/controlpanel/all"
                            >
                                <Text color="blue">more info</Text>
                            </Link>
                        </>
                    }
                />
            </>
        );
    },
};
