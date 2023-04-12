import { Button, Code, Image, Pane, Popover, Text, majorScale, minorScale } from "evergreen-ui";
import { useMemo } from "react";
import dedent from "ts-dedent";
import { GPTPlugin, GPTPluginRenderResultProps } from "./plugin";

export const jsPlugin: GPTPlugin = {
    id: 'nathsou.js',
    name: 'JavaScript Evaluator',
    command: 'JS',
    humanDescription: 'Evaluate JavaScript code',
    aiDescription: dedent`@JS(<input>): executes a JavaScript program in a web worker,
    the program should return a function which efficiently returns the expected result.
    Graphics are returned as { kind: 'image', dims: [<width>, <height>], pixels: <array of hex pixels> }`,
    examples: [
        {
            question: 'What is the terminal velocity of a 10kg object falling from a height of 100m, ignoring air resistance?',
            answer: '@JS(() => Math.sqrt(2 * 9.81 * 100)) m/s'
        },
        {
            question: 'What is the date?',
            answer: `Today is the @JS(() => new Date().toLocaleDateString())`
        },
        {
            question: 'Show an empty pink rectangle',
            answer: dedent`@JS(
                () => {
                    const width = 400;
                    const height = 300;
                    const offscreenCanvas = new OffscreenCanvas(width, height);
                    const ctx = offscreenCanvas.getContext('2d');
                    ctx.fillStyle = 'pink';
                    ctx.fillRect(0, 0, width, height);
                    const pixels = Array.from(ctx.getImageData(0, 0, width, height).data);
                    
                    return {
                      kind: 'image',
                      dims: [width, height],
                      pixels,
                    };
                }
            )`
        },
    ],
    initialState: { enabled: true },
    run: ({ query }) => evaluateCode(query),
    renderResult,
};

function evaluateCode(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const workerSource = dedent`
            self.onmessage = (e) => {
                const f = ${code};
                const value = typeof f === 'function' ? f() : f;
                postMessage(JSON.stringify({ type: 'result', value }));
            };
      `;

        const workerBlob = new Blob([workerSource], { type: "text/javascript" });
        const workerBlobURL = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerBlobURL);

        const timeOutTimer = setTimeout(() => {
            worker.terminate();
            URL.revokeObjectURL(workerBlobURL);
            console.error("JS worker timed out");
            reject("Timed out");
        }, 10 * 1000);

        worker.postMessage('run');
        worker.onmessage = (e) => {
            clearTimeout(timeOutTimer);
            const result = JSON.parse(e.data);
            if (result.type === "result") {
                resolve(result.value);
            } else {
                reject(result.error);
            }
            worker.terminate();
            URL.revokeObjectURL(workerBlobURL);
        };
        worker.onerror = (e) => {
            reject(e.message);
            worker.terminate();
            URL.revokeObjectURL(workerBlobURL);
        };
    });
}

function isImage(result: any): result is { kind: 'image', dims: [number, number], pixels: number[] } {
    return typeof result === 'object' &&
        result !== null &&
        'kind' in result &&
        result.kind === 'image' &&
        'dims' in result &&
        'pixels' in result &&
        Array.isArray(result.pixels);
}

function renderResult({ key, subst: { query, result } }: GPTPluginRenderResultProps<{}>) {
    const body = useMemo(() => {
        if (isImage(result)) {
            const canvas = document.createElement('canvas');
            const [width, height] = result.dims;
            const ctx = canvas.getContext('2d')!;
            canvas.width = width;
            canvas.height = height;

            // Create a new ImageData object based on the img pixels
            const imageData = new ImageData(
                new Uint8ClampedArray(result.pixels),
                width,
                height
            );

            ctx.putImageData(imageData, 0, 0);

            return <Image
                cursor="pointer"
                src={canvas.toDataURL()}
                marginY={majorScale(1)}
                maxWidth={width}
                width="100%"
                height="auto"
                border="1px solid #E6E8F0"
            />;
        }

        if (result === undefined) {
            return <Button isLoading={true}>Evaluating</Button>
        }

        let text = '';

        if (typeof result === 'string') {
            text = result;
        } else if (typeof result === 'object' && Array.isArray(result)) {
            text = '[' + result.map(elem => JSON.stringify(elem)).join(', ') + ']';
        } else {
            text = JSON.stringify(result);
        }

        return <Text
            fontSize="1rem"
            whiteSpace="pre-line"
            backgroundColor="#FAFBFF"
            border="1px solid #E6E8F0"
            color="gray900"
            cursor="pointer"
            padding={minorScale(1)}
            borderRadius={minorScale(1)}
        >
            {text}
        </Text>;
    }, [result]);

    return (
        <Popover
            key={key}
            content={
                <Pane maxWidth="32rem" maxHeight="20rem" overflow="auto">
                    <Code whiteSpace="pre-wrap">{query.trim()}</Code>
                </Pane>
            }
        >
            {body}
        </Popover>
    );
}
