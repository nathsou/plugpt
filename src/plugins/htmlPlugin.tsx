import { DocumentOpenIcon, IconButton, Link, Pane } from "evergreen-ui";
import dedent from "ts-dedent";
import { GPTPlugin } from "./plugin";

export const htmlPlugin: GPTPlugin = {
  id: 'nathsou.html',
  name: 'HTML Renderer',
  humanDescription: 'Render HTML pages',
  aiDescription: dedent`
    @HTML(<input>): Renders an HTML page, all extenal dependencies must be imported using esm.sh
    If JSX is needed, import and use htm
  `,
  command: 'HTML',
  initialState: { enabled: true },
  renderResult: ({ key, subst }) => {
    const url = subst.result as string;

    return (
      <Pane
        key={key}
        position="relative"
        width="min(60vh, 800px)"
        height="min(60vh, 800px)"
      >
        <Link
          allowUnsafeHref={true}
          href={url}
          target="_blank"
          position="absolute"
          top={0}
          right={0}
        >
          <IconButton icon={DocumentOpenIcon} />
        </Link>
        <iframe
          src={url}
          width="100%"
          height="100%"
          style={{
            border: '1px solid #ccc',
            overflow: 'auto',
            borderRadius: '4px',
          }}
        />
      </Pane>
    );
  },
  run: async ({ query: htmlContent }) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return { result: URL.createObjectURL(blob), shouldPersist: false };
  },
  examples: [
    {
      question: 'Plot a graph of sin(x) from 0 to 2π using React',
      answer: dedent`@HTML(
                <html>
                <head>
                  <title>Plot sin(x) from 0 to 2π using Chart.js</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                <body>
                  <canvas id="sinChart" width="100%" height="100%"></canvas>
                  <script type="module">
                    import Chart from 'https://esm.sh/chart.js/auto';
              
                    const canvas = document.getElementById('sinChart');
                    const ctx = canvas.getContext('2d');
                    const x = [];
                    const y = [];
              
                    for (let i = 0; i <= 100; i++) {
                      const xValue = (2 * Math.PI * i) / 100;
                      x.push(xValue);
                      y.push(Math.sin(xValue));
                    }
              
                    const chart = new Chart(ctx, {
                      type: 'line',
                      data: {
                        labels: x,
                        datasets: [
                          {
                            label: 'sin(x)',
                            data: y,
                            borderColor: 'rgb(0, 0, 255)',
                            borderWidth: 2,
                            fill: false,
                          },
                        ],
                      },
                    });
                  </script>
                </body>
              </html>
            )`,
    },
    {
      question: 'Render a button using React',
      answer: dedent`@HTML(
                <html>
                <head>
                  <title>Render a button using React</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                </head>
                <body>
                  <div id="root"></div>
                  <script type="module">
                    import React from 'https://esm.sh/react';
                    import ReactDOM from 'https://esm.sh/react-dom';
                    import htm from 'https://esm.sh/htm';
                    const html = htm.bind(React.createElement);

                    const App = () => html\`<button>Click me</button>\`;
                    ReactDOM.render(html\`<\${App} />\`, document.getElementById('root'));
                  </script>
                </body>
              </html>
            )`,
    }
  ],
};
