import { Pane } from 'evergreen-ui';
import "./styles/App.css";
import { Conversation } from './components/Conversation';
import { OpenAIProvider } from './OpenAIProvider';
import { SidePanel } from './components/SidePanel';
import { SettingsDialog } from './components/SettingsDialog';

const App = () => {
  return (
    <Pane display="flex" width="100%" height="100%">
      <SidePanel />
      <OpenAIProvider>
        <Conversation />
      </OpenAIProvider>
      <SettingsDialog />
    </Pane>
  );
};

export default App;
