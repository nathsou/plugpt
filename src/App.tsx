import { Pane, SideSheet } from 'evergreen-ui';
import "./styles/App.css";
import { Conversation } from './components/Conversation';
import { OpenAIProvider } from './OpenAIProvider';
import { SidePanel } from './components/SidePanel';
import { SettingsDialog } from './components/SettingsDialog';
import { useIsSmallScreen } from './hooks/useIsSmallScreen';
import { useStore } from './store';

const App = () => {
  const isSmallScreen = useIsSmallScreen();
  const isMenuOpen = useStore(state => state.isSidePanelOpen);
  const setIsMenuOpen = useStore(state => state.setIsSidePanelOpen);

  return (
    <Pane display="flex" width="100%" height="100%">
      <OpenAIProvider>
        {!isSmallScreen ? <SidePanel /> : null}
        <Conversation />
      </OpenAIProvider>
      <SettingsDialog />
      <SideSheet
        isShown={isMenuOpen}
        onCloseComplete={() => setIsMenuOpen(false)}
        position="left"
        width="18rem"
      >
        <SidePanel />
      </SideSheet>
    </Pane>
  );
};

export default App;
